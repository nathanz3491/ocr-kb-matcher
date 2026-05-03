/**
 * Job Processor Service
 * Orchestrates the full processing pipeline: OCR → AI matching → save results
 * This ties together all the services we've built.
 * Note: Jobs must be claimed by queueProcessor before calling processJob()
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Job, JobType, ProcessingStatus, MatchResult, KnowledgeBaseEntry, GraphData } from '../../../shared/types';
import { OCRResult } from '../types/ocr';
import {
  ProcessingStep,
  IJobProcessor,
  ProcessingContext,
  ProcessingOptions,
  DEFAULT_PROCESSING_OPTIONS,
  ProcessingError,
  StepResult,
  JobProcessorEvents,
} from '../types/worker';
import {
  getJob,
  updateJobStatus,
} from './jobService';
import { extractText, validateImage } from './ocr';
import { findMatches } from './ai';
import { parseQuestions } from './questionParser';
import { batchMatchQuestions } from './batchMatching';
import { generateGraphFromText } from './graphGeneration';
import { KnowledgeGraphStorage, getKnowledgeGraphStorage } from './knowledgeGraphStorage';
import { exportTreeForLLM, getFullKnowledgeTree } from './knowledgeTreeService';
import { matchOCRToKnowledgeTree } from './aiKnowledgeMatching';
import { userProgressService } from './userProgressService';
import { generateFlashcards } from './flashcardService';
import { generateCheatSheet, generateStudyNotes } from './studyMaterialService';
import { extractFromFile } from './textExtractor';
import { extractWrongQuestions, generateExplanation, generatePracticeQuestions, getKBContext } from './wrongQuestionService';

/**
 * Job Processor class
 * Implements the full job processing pipeline with proper error handling,
 * status updates, and checkpoint saving.
 */
export class JobProcessor extends EventEmitter implements IJobProcessor {
  private options: ProcessingOptions;

  constructor(options: Partial<ProcessingOptions> = {}) {
    super();
    this.options = { ...DEFAULT_PROCESSING_OPTIONS, ...options };
  }

  /**
   * Process a single job through the entire pipeline
   * Pipeline: VALIDATE → OCR → OCR_COMPLETE → QUERY_KB → MATCHING → SAVE_RESULTS → COMPLETED
   * @param jobId - The job ID to process
   * @throws ProcessingError if processing fails
   */
  public async processJob(jobId: string): Promise<void> {
    const startTime = Date.now();
    let context: ProcessingContext | null = null;

    console.log(`🚀 Starting job processing for ${jobId}`);
    this.emit('processing:started', jobId);

    try {
      // Step 1: Get the job (already claimed by queueProcessor)
      const job = await getJob(jobId);

      if (!job) {
        throw new ProcessingError(
          'Job not found',
          ProcessingStep.CLAIM,
          jobId,
          false
        );
      }

      // Initialize processing context
      context = {
        job,
        currentStep: ProcessingStep.CLAIM,
        startTime: new Date(),
        stepTimings: new Map(),
      };

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new ProcessingError(
            `Job processing timeout after ${this.options.totalTimeoutMs}ms`,
            context?.currentStep || ProcessingStep.CLAIM,
            jobId,
            false
          ));
        }, this.options.totalTimeoutMs);
      });

      // Execute the pipeline with timeout
      const pipelinePromise = this.executePipeline(context);

      await Promise.race([pipelinePromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      console.log(`✅ Job ${jobId} completed successfully in ${duration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof ProcessingError) {
        console.error(`❌ Job ${jobId} failed at step ${error.step}: ${error.message}`);
        await this.handleJobError(jobId, error, error.step);
        throw error;
      } else {
        const processingError = new ProcessingError(
          error instanceof Error ? error.message : 'Unknown error',
          context?.currentStep || ProcessingStep.CLAIM,
          jobId,
          false,
          error instanceof Error ? error : undefined
        );
        console.error(`❌ Job ${jobId} failed: ${processingError.message}`);
        await this.handleJobError(jobId, processingError, context?.currentStep || ProcessingStep.CLAIM);
        throw processingError;
      }
    }
  }

  /**
   * Execute the processing pipeline
   */
  private async executePipeline(context: ProcessingContext): Promise<void> {
    const { job } = context;

    // Step 1: Validate file exists
    context.currentStep = ProcessingStep.VALIDATE;
    const validateResult = await this.executeStep(
      ProcessingStep.VALIDATE,
      async () => this.validateFileStep(job.filePath)
    );

    if (!validateResult.success) {
      throw new ProcessingError(
        `Image validation failed: ${validateResult.error?.message}`,
        ProcessingStep.VALIDATE,
        job.id,
        false
      );
    }

    // Step 2: Run OCR
    context.currentStep = ProcessingStep.OCR;
    await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.OCR });
    const ocrResult = await this.performOCR(job);
    context.ocrResult = ocrResult;

    // Step 3: Save OCR checkpoint
    if (this.options.saveOCRCheckpoint) {
      context.currentStep = ProcessingStep.SAVE_OCR_CHECKPOINT;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.SAVE_OCR_CHECKPOINT });
      await this.updateJobWithOCRResult(job.id, ocrResult);
      this.emit('checkpoint:saved', job.id, ocrResult.text);
    }

    // ============ BRANCH HERE ============
    if (job.jobType === JobType.WRONG_SINGLE) {
      // ======== WRONG_SINGLE PATH ========
      // Step 4a: Extract wrong questions (AI call 1)
      context.currentStep = ProcessingStep.EXTRACT_WRONG_QUESTIONS;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.EXTRACT_WRONG_QUESTIONS });
      const extracted = await extractWrongQuestions(ocrResult.text, []);
      console.log(`[JobProcessor] Extracted ${extracted.length} wrong question(s)`);

      const kbContext = await getKBContext();
      const knowledgeTreeContext = await exportTreeForLLM();
      const wrongResults = [];
      for (const q of extracted) {
        context.currentStep = ProcessingStep.GENERATE_EXPLANATION;
        await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_EXPLANATION });
        const explanation = await generateExplanation(q.questionText, kbContext);
        console.log(`[JobProcessor] Generated explanation for question ${q.questionIndex}`);

        context.currentStep = ProcessingStep.GENERATE_PRACTICE;
        await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_PRACTICE });
        const practiceQuestions = await generatePracticeQuestions(q.questionText, 5);
        console.log(`[JobProcessor] Generated ${practiceQuestions.length} practice questions`);

        const matchResult = await matchOCRToKnowledgeTree(q.questionText, knowledgeTreeContext);
        const matchedNodes = matchResult.matchedNodes.map(m => ({
          kbEntryId: m.nodeId,
          confidence: m.confidence,
          reasoning: m.reasoning,
          ocrTextSpan: { start: 0, end: 0, excerpt: q.questionText },
        }));

        wrongResults.push({
          questionId: `wrong-${q.questionIndex}-${Date.now()}`,
          questionIndex: q.questionIndex,
          questionText: q.questionText,
          explanation,
          practiceQuestions,
          status: 'explained' as const,
          matchedNodes,
        });
      }

      // Step 5: Save results (skip graph/material generation for wrong question jobs)
      context.currentStep = ProcessingStep.SAVE_RESULTS;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { wrongResults });

      // Step 6: Mark as completed
      context.currentStep = ProcessingStep.COMPLETE;
      await updateJobStatus(job.id, ProcessingStatus.COMPLETED);

      this.emit('processing:completed', job.id, []);
      return;
    } else if (job.jobType === JobType.WRONG_MULTIPLE) {
      const indicesStr = job.wrongQuestionIndices || '';
      const indices = indicesStr.split(',').map(s => s.trim()).filter(Boolean);
      console.log(`[JobProcessor] Processing ${indices.length} wrong question indices: ${indices.join(', ')}`);

      context.currentStep = ProcessingStep.EXTRACT_WRONG_QUESTIONS;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.EXTRACT_WRONG_QUESTIONS });
      const extracted = await extractWrongQuestions(ocrResult.text, indices);
      console.log(`[JobProcessor] Extracted ${extracted.length} wrong question(s)`);

      const kbContext = await getKBContext();
      const knowledgeTreeContext = await exportTreeForLLM();
      const wrongResults = [];
      for (const q of extracted) {
        context.currentStep = ProcessingStep.GENERATE_EXPLANATION;
        await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_EXPLANATION });
        const explanation = await generateExplanation(q.questionText, kbContext);
        console.log(`[JobProcessor] Generated explanation for question ${q.questionIndex}`);

        context.currentStep = ProcessingStep.GENERATE_PRACTICE;
        await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_PRACTICE });
        const practiceQuestions = await generatePracticeQuestions(q.questionText, 5);
        console.log(`[JobProcessor] Generated ${practiceQuestions.length} practice questions for Q${q.questionIndex}`);

        const matchResult = await matchOCRToKnowledgeTree(q.questionText, knowledgeTreeContext);
        const matchedNodes = matchResult.matchedNodes.map(m => ({
          kbEntryId: m.nodeId,
          confidence: m.confidence,
          reasoning: m.reasoning,
          ocrTextSpan: { start: 0, end: 0, excerpt: q.questionText },
        }));

        wrongResults.push({
          questionId: `wrong-${q.questionIndex}-${Date.now()}`,
          questionIndex: q.questionIndex,
          questionText: q.questionText,
          explanation,
          practiceQuestions,
          status: 'explained' as const,
          matchedNodes,
        });
      }

      context.currentStep = ProcessingStep.SAVE_RESULTS;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.SAVE_RESULTS, wrongResults });

      context.currentStep = ProcessingStep.COMPLETE;
      await updateJobStatus(job.id, ProcessingStatus.COMPLETED);

      this.emit('processing:completed', job.id, []);
      return;
    } else if (job.jobType === JobType.MULTIPLE) {
      // ======== MULTIPLE PATH ========
      // Step 4a: Parse questions (AI call 1)
      context.currentStep = ProcessingStep.PARSE_QUESTIONS;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.PARSE_QUESTIONS });
      const parsedQuestions = await parseQuestions(ocrResult.text);
      console.log(`[JobProcessor] Parsed ${parsedQuestions.length} questions`);

      // Save parsed questions to job
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { questions: parsedQuestions, currentStep: ProcessingStep.PARSE_QUESTIONS });

      // Step 4b: Batch match all questions (AI call 2)
      context.currentStep = ProcessingStep.BATCH_MATCH;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.BATCH_MATCH });
      const knowledgeTreeContext = await exportTreeForLLM();
      const questionResults = await batchMatchQuestions(parsedQuestions, knowledgeTreeContext);
      console.log(`[JobProcessor] Batch matched ${questionResults.length} questions`);

      // Save question results to job
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { questionResults, currentStep: ProcessingStep.BATCH_MATCH });

      // Collect ALL unique matched node IDs
      const allMatchedNodeIds = [...new Set(
        questionResults
          .flatMap(r => r.matchedNodes)
          .map(n => n.kbEntryId)
      )];

      // Step 5: Update user progress for all matched nodes
      if (allMatchedNodeIds.length > 0) {
        const avgMastery = 15; // default mastery
        await userProgressService.markNodesAsKnownWithMastery(allMatchedNodeIds, avgMastery, context.job.userId ?? '');
        console.log(`[JobProcessor] Marked ${allMatchedNodeIds.length} nodes as known`);
      }
    } else {
      // ======== SINGLE PATH (existing behavior, unchanged) ========
      // Step 4: Query knowledge base
      context.currentStep = ProcessingStep.QUERY_KB;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.QUERY_KB });
      const kbResult = await this.executeStep(
        ProcessingStep.QUERY_KB,
        async () => this.queryKnowledgeBase()
      );

      if (!kbResult.success || !kbResult.data) {
        throw new ProcessingError(
          'Failed to query knowledge base',
          ProcessingStep.QUERY_KB,
          job.id,
          true
        );
      }

      const kbNodes = kbResult.data as KnowledgeBaseEntry[];
      context.kbNodes = kbNodes;

      // Step 5: Run AI matching
      context.currentStep = ProcessingStep.MATCH;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.MATCH });
      const matchResults = await this.performMatching(job, ocrResult.text, kbNodes);
      context.matchResults = matchResults;

      // Step: ANALYZE_KNOWLEDGE - Match OCR to knowledge tree using REAL AI
      context.currentStep = ProcessingStep.ANALYZE_KNOWLEDGE;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.ANALYZE_KNOWLEDGE });

      // 1. Export knowledge tree from Neo4j
      const knowledgeTreeContext = await exportTreeForLLM();
      console.log(`[JobProcessor] Exported knowledge tree (${knowledgeTreeContext.length} chars)`);

      // 2. AI matches OCR to knowledge nodes (REAL AI, not mock)
      const matchResult = await matchOCRToKnowledgeTree(ocrResult.text, knowledgeTreeContext);
      console.log(`[JobProcessor] AI matched ${matchResult.matchedNodes.length} nodes:`,
        matchResult.matchedNodes.map(m => `${m.nodeId}(${m.confidence})`).join(', '));

      // 3. Update user progress - mark matched nodes with initial mastery based on question difficulty
      const matchedNodeIds = matchResult.matchedNodes.map(m => m.nodeId);
      if (matchedNodeIds.length > 0) {
        const avgMastery = matchResult.matchedNodes.length > 0
          ? matchResult.matchedNodes.reduce((sum, m) => sum + (m.estimatedMastery || 15), 0) / matchResult.matchedNodes.length
          : 15;
        await userProgressService.markNodesAsKnownWithMastery(matchedNodeIds, avgMastery, context.job.userId ?? '');
        console.log(`[JobProcessor] Marked as known with mastery ${avgMastery}%: ${matchedNodeIds.join(', ')}`);
      }

      // 4. Save match result to job for display
      await this.updateJobWithKnowledgeMatch(job.id, matchResult);
    }

    // Step 6: Generate graph (BOTH paths)
    context.currentStep = ProcessingStep.GENERATE_GRAPH;
    await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_GRAPH });
    const graphData = await generateGraphFromText(ocrResult.text);
    const storage = getKnowledgeGraphStorage();
    await storage.initialize();
    const mergeResult = await storage.mergeJobGraph(job.id, graphData);
    console.log(`[JobProcessor] Knowledge graph updated: +${mergeResult.nodesAdded} nodes, +${mergeResult.edgesAdded} edges`);

    // Step 7: Save final results
    context.currentStep = ProcessingStep.SAVE_RESULTS;
    await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.SAVE_RESULTS });

    // Determine which node IDs to use for material generation
    let uniqueNodeIds: string[];
    if (job.jobType === JobType.MULTIPLE) {
      // For MULTIPLE: collect from questionResults
      const updatedJob = await getJob(job.id);
      const questionResults = (updatedJob?.questionResults || []);
      uniqueNodeIds = [...new Set(
        questionResults
          .flatMap(r => r.matchedNodes)
          .map(n => n.kbEntryId)
      )];
    } else {
      // For SINGLE: use matchResults from context
      uniqueNodeIds = [...new Set((context.matchResults || []).map(r => r.kbEntryId))];
    }

    context.currentStep = ProcessingStep.GENERATE_CARDS;
    await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_CARDS });
    for (const nodeId of uniqueNodeIds) {
      try {
        await generateFlashcards(nodeId);
        console.log(`[JobProcessor] ✅ Generated flashcards for node: ${nodeId}`);
      } catch (err) {
        console.warn(`[JobProcessor] ⚠️ Failed flashcards for ${nodeId}:`, err);
      }
    }

    context.currentStep = ProcessingStep.GENERATE_CHEATSHEET;
    await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_CHEATSHEET });
    for (const nodeId of uniqueNodeIds) {
      try {
        await generateCheatSheet(nodeId);
        console.log(`[JobProcessor] ✅ Generated cheat sheet for node: ${nodeId}`);
      } catch (err) {
        console.warn(`[JobProcessor] ⚠️ Failed cheat sheet for ${nodeId}:`, err);
      }
    }

    context.currentStep = ProcessingStep.GENERATE_REVIEW;
    await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_REVIEW });
    for (const nodeId of uniqueNodeIds) {
      try {
        await generateStudyNotes(nodeId);
        console.log(`[JobProcessor] ✅ Generated study notes for node: ${nodeId}`);
      } catch (err) {
        console.warn(`[JobProcessor] ⚠️ Failed study notes for ${nodeId}:`, err);
      }
    }

    await this.updateJobWithResults(
      job.id,
      ocrResult.text,
      context.matchResults || [],
      graphData
    );

    // Step 8: Mark as completed
    context.currentStep = ProcessingStep.COMPLETE;
    await updateJobStatus(job.id, ProcessingStatus.COMPLETED);

    this.emit('processing:completed', job.id, context.matchResults || []);
  }

  private isImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'].includes(ext);
  }

  private isDocumentFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.pdf', '.docx', '.pptx', '.txt', '.md'].includes(ext);
  }

  private async validateFileStep(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }

    if (this.isImageFile(filePath)) {
      const validation = await validateImage(filePath);
      if (!validation.valid) {
        throw new Error(`Invalid image: ${validation.error}`);
      }
      console.log(`✓ Validated image: ${validation.format} ${validation.dimensions ? `(${validation.dimensions.width}x${validation.dimensions.height})` : ''}`);
    } else if (this.isDocumentFile(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      console.log(`✓ Validated document: ${ext}`);
    } else {
      throw new Error(`Unsupported file type: ${path.extname(filePath)}`);
    }
  }

  public async performOCR(job: Job): Promise<OCRResult> {
    const startTime = Date.now();

    if (this.isImageFile(job.filePath)) {
      console.log(`🔍 Running OCR for job ${job.id} (${job.fileName})`);
      try {
        const ocrResult = await extractText(job.filePath, {
          timeout: this.options.ocrTimeoutMs,
          language: 'eng',
          preprocessing: true,
          includeBlocks: false,
        });

        console.log(`✓ OCR complete: ${ocrResult.text.length} chars, confidence: ${ocrResult.confidence.toFixed(2)}`);
        return ocrResult;
      } catch (error) {
        console.error(`❌ OCR failed for job ${job.id}:`, error);
        throw new ProcessingError(
          `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ProcessingStep.OCR,
          job.id,
          true,
          error instanceof Error ? error : undefined
        );
      }
    }

    console.log(`📄 Extracting text from document for job ${job.id} (${job.fileName})`);
    try {
      const text = await extractFromFile(job.filePath, '');
      const processingTime = Date.now() - startTime;

      if (!text || text.trim().length === 0) {
        throw new ProcessingError(
          'No text extracted from document',
          ProcessingStep.OCR,
          job.id,
          false
        );
      }

      console.log(`✓ Text extraction complete: ${text.length} chars in ${processingTime}ms`);
      return {
        text,
        confidence: 1.0,
        processingTime,
        language: 'text',
      };
    } catch (error) {
      console.error(`❌ Text extraction failed for job ${job.id}:`, error);
      throw new ProcessingError(
        `Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ProcessingStep.OCR,
        job.id,
        false,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Query all knowledge base nodes
   * Falls back to JSON file if Neo4j is not available
   */
  private async queryKnowledgeBase(): Promise<KnowledgeBaseEntry[]> {
    console.log('📚 Querying knowledge base...');

    try {
      // Use knowledgeTreeService which queries KnowledgePoint nodes
      const maxKB = Math.floor(Number(this.options.maxKBEntries)) || 50;
      console.log(`[KB Query] maxKB=${maxKB}, type=integer`);
      const tree = await getFullKnowledgeTree();
      
      // Convert KnowledgePoint to KnowledgeBaseEntry format
      const entries: KnowledgeBaseEntry[] = tree.slice(0, maxKB).map(node => ({
        id: node.id,
        title: node.name,
        description: node.name, // Use name as description
        category: node.domain,
        metadata: { prerequisites: node.prerequisites, nextSteps: node.nextSteps },
      }));

      console.log(`✓ Retrieved ${entries.length} knowledge base entries from JSON`);
      return entries;
    } catch (error) {
      console.warn('⚠️ JSON knowledge base query failed:', error);
      
      // Fallback to JSON file
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        // __dirname is the directory of the current file (src/services/)
        // Go up to backend/, then up to ocr-kb-matcher/, then to data/
        const kbPath = path.join(__dirname, '..', '..', '..', 'data', 'knowledge-base.json');
        const data = await fs.readFile(kbPath, 'utf-8');
        const kb = JSON.parse(data);
        
        const entries: KnowledgeBaseEntry[] = kb.entries?.map((entry: unknown) => {
          const e = entry as { id?: string; title?: string; description?: string; category?: string; metadata?: Record<string, unknown> };
          return {
            id: e.id || '',
            title: e.title || '',
            description: e.description || '',
            category: e.category || '',
            metadata: e.metadata || {},
          };
        }) || [];
        
        console.log(`✓ Retrieved ${entries.length} knowledge base entries from JSON`);
        return entries.slice(0, this.options.maxKBEntries);
      } catch (fallbackError) {
        console.error('❌ Failed to query both Neo4j and JSON knowledge base:', fallbackError);
        // Return empty array as last resort
        return [];
      }
    }
  }

  /**
   * Perform AI matching between OCR text and knowledge base
   */
  public async performMatching(
    job: Job,
    ocrText: string,
    kbNodes: KnowledgeBaseEntry[]
  ): Promise<MatchResult[]> {
    console.log(`🤖 Running AI matching for job ${job.id}`);

    if (kbNodes.length === 0) {
      console.warn('⚠️ No knowledge base entries to match against');
      return [];
    }

    if (!ocrText || ocrText.trim().length === 0) {
      console.warn('⚠️ No OCR text to match');
      return [];
    }

    try {
      // Update status to MATCHING before calling AI
      await updateJobStatus(job.id, ProcessingStatus.MATCHING);

      const matches = await findMatches(ocrText, kbNodes);

      console.log(`✓ AI matching complete: ${matches.length} matches found`);
      
      // Log top matches
      matches.slice(0, 3).forEach((match, i) => {
        console.log(`  ${i + 1}. ${match.kbEntryId} (confidence: ${(match.confidence * 100).toFixed(1)}%)`);
      });

      return matches;
    } catch (error) {
      console.error(`❌ AI matching failed for job ${job.id}:`, error);
      throw new ProcessingError(
        `AI matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ProcessingStep.MATCH,
        job.id,
        true, // Matching errors may be retryable (e.g., rate limit)
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update job with OCR results (checkpoint after OCR)
   */
  public async updateJobWithOCRResult(jobId: string, ocrResult: OCRResult): Promise<void> {
    console.log(`💾 Saving OCR checkpoint for job ${jobId}`);

    const updated = await updateJobStatus(jobId, ProcessingStatus.OCR_COMPLETE, {
      ocrText: ocrResult.text,
      ocrConfidence: ocrResult.confidence / 100, // Convert percentage to 0-1
    });

    if (!updated) {
      throw new Error('Failed to update job with OCR results');
    }

    console.log(`✓ OCR checkpoint saved for job ${jobId}`);
  }

  /**
   * Update job with final matching results
   */
  public async updateJobWithResults(
    jobId: string,
    ocrText: string,
    results: MatchResult[],
    graphData?: GraphData
  ): Promise<void> {
    console.log(`💾 Saving final results for job ${jobId}`);

    // Note: We're already at MATCHING status, now we save results
    // The final COMPLETED status will be set in the pipeline
    const updateData: { ocrText: string; results: MatchResult[]; graphData?: GraphData } = {
      ocrText,
      results,
    };

    if (graphData) {
      updateData.graphData = graphData;
      console.log(`  📊 Graph data: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);
    }

    const updated = await updateJobStatus(jobId, ProcessingStatus.MATCHING, updateData);

    if (!updated) {
      throw new Error('Failed to update job with matching results');
    }

    console.log(`✓ Final results saved for job ${jobId}`);
  }

  /**
   * Update job with knowledge tree match results
   */
  private async updateJobWithKnowledgeMatch(
    jobId: string, 
    matchResult: { matchedNodes: any[], relatedConcepts: string[] }
  ): Promise<void> {
    const job = await getJob(jobId);
    if (job) {
      (job as any).knowledgeMatch = matchResult;
      await updateJobStatus(jobId, job.status, job);
    }
  }

  /**
   * Handle job processing error
   * Updates job status to FAILED and records error information
   */
  public async handleJobError(
    jobId: string,
    error: Error,
    step: ProcessingStep
  ): Promise<void> {
    console.error(`🚨 Handling error for job ${jobId} at step ${step}:`, error.message);

    const errorMessage = `[${step}] ${error.message}`;

    try {
      await updateJobStatus(jobId, ProcessingStatus.FAILED, {
        error: errorMessage,
      });

      const processingError = new ProcessingError(
        error.message,
        step,
        jobId,
        false,
        error
      );

      this.emit('processing:failed', jobId, processingError);
    } catch (updateError) {
      console.error(`❌ Failed to update job ${jobId} with error status:`, updateError);
      // If we can't even update the job status, just log it
    }
  }

  /**
   * Execute a processing step with timing and error handling
   */
  private async executeStep<T>(
    step: ProcessingStep,
    fn: () => Promise<T>
  ): Promise<StepResult<T>> {
    const startTime = Date.now();

    try {
      const data = await fn();
      const duration = Date.now() - startTime;

      console.log(`✓ Step ${step} completed in ${duration}ms`);
      this.emit('step:completed', step, duration);

      return {
        success: true,
        data,
        durationMs: duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error(`❌ Step ${step} failed after ${duration}ms:`, error);
      this.emit('step:failed', step, error as Error);

      return {
        success: false,
        error: error as Error,
        durationMs: duration,
      };
    }
  }

  /**
   * Update processing options
   */
  public updateOptions(options: Partial<ProcessingOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('📝 Updated processing options:', this.options);
  }

  /**
   * Get current processing options
   */
  public getOptions(): ProcessingOptions {
    return { ...this.options };
  }
}

// Singleton instance
let jobProcessor: JobProcessor | null = null;

/**
 * Get or create the job processor singleton
 */
export function getJobProcessor(options?: Partial<ProcessingOptions>): JobProcessor {
  if (!jobProcessor) {
    jobProcessor = new JobProcessor(options);
  }
  return jobProcessor;
}

/**
 * Reset the job processor singleton (useful for testing)
 */
export function resetJobProcessor(): void {
  jobProcessor = null;
}

/**
 * Process a job (convenience function)
 */
export async function processJob(jobId: string): Promise<void> {
  const processor = getJobProcessor();
  return processor.processJob(jobId);
}
