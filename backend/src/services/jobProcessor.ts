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
import { initializeReview } from './reviewService';
import { generateFlashcards } from './flashcardService';
import { generateCheatSheet, generateStudyNotes } from './studyMaterialService';
import { extractFromFile } from './textExtractor';
import { extractWrongQuestions, generateExplanation, generatePracticeQuestions, getKBContext } from './wrongQuestionService';
import { logger } from '../lib/logger';
import { moonshotBreaker } from '../lib/circuitBreaker';

export class JobProcessor extends EventEmitter implements IJobProcessor {
  private options: ProcessingOptions;

  constructor(options: Partial<ProcessingOptions> = {}) {
    super();
    this.options = { ...DEFAULT_PROCESSING_OPTIONS, ...options };
  }

  public async processJob(jobId: string): Promise<void> {
    const startTime = Date.now();
    let context: ProcessingContext | null = null;

    logger.info({ jobId }, 'Starting job processing');
    this.emit('processing:started', jobId);

    try {
      const job = await getJob(jobId);

      if (!job) {
        throw new ProcessingError(
          'Job not found',
          ProcessingStep.CLAIM,
          jobId,
          false
        );
      }

      context = {
        job,
        currentStep: ProcessingStep.CLAIM,
        startTime: new Date(),
        stepTimings: new Map(),
      };

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

      const pipelinePromise = this.executePipeline(context);

      await Promise.race([pipelinePromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      logger.info({ jobId, durationMs: duration }, 'Job completed successfully');

    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof ProcessingError) {
        logger.error({ jobId, step: error.step, err: error }, 'Job failed');
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
        logger.error({ jobId, err: processingError }, 'Job failed');
        await this.handleJobError(jobId, processingError, context?.currentStep || ProcessingStep.CLAIM);
        throw processingError;
      }
    }
  }

  private async executePipeline(context: ProcessingContext): Promise<void> {
    const { job } = context;

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

    context.currentStep = ProcessingStep.OCR;
    await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.OCR });
    const ocrResult = await this.performOCR(job);
    context.ocrResult = ocrResult;

    if (this.options.saveOCRCheckpoint) {
      context.currentStep = ProcessingStep.SAVE_OCR_CHECKPOINT;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.SAVE_OCR_CHECKPOINT });
      await this.updateJobWithOCRResult(job.id, ocrResult);
      this.emit('checkpoint:saved', job.id, ocrResult.text);
    }

    if (job.jobType === JobType.WRONG_SINGLE) {
      context.currentStep = ProcessingStep.EXTRACT_WRONG_QUESTIONS;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.EXTRACT_WRONG_QUESTIONS });
      const extracted = await extractWrongQuestions(ocrResult.text, []);
      logger.info({ jobId: job.id, count: extracted.length }, 'Extracted wrong questions');

      const kbContext = await getKBContext();
      const knowledgeTreeContext = await exportTreeForLLM();
      const wrongResults = [];
      for (const q of extracted) {
        context.currentStep = ProcessingStep.GENERATE_EXPLANATION;
        await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_EXPLANATION });
        const explanation = await generateExplanation(q.questionText, kbContext);
        logger.debug({ jobId: job.id, questionIndex: q.questionIndex }, 'Generated explanation');

        context.currentStep = ProcessingStep.GENERATE_PRACTICE;
        await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_PRACTICE });
        const practiceQuestions = await generatePracticeQuestions(q.questionText, 5);
        logger.debug({ jobId: job.id, questionIndex: q.questionIndex, count: practiceQuestions.length }, 'Generated practice questions');

        const matchResult = await matchOCRToKnowledgeTree(q.questionText, knowledgeTreeContext, context.job.userId ?? '');
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
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { wrongResults });

      context.currentStep = ProcessingStep.COMPLETE;
      await updateJobStatus(job.id, ProcessingStatus.COMPLETED);

      this.emit('processing:completed', job.id, []);
      return;
    } else if (job.jobType === JobType.WRONG_MULTIPLE) {
      const indicesStr = job.wrongQuestionIndices || '';
      const indices = indicesStr.split(',').map(s => s.trim()).filter(Boolean);
      logger.info({ jobId: job.id, indices }, 'Processing wrong question indices');

      context.currentStep = ProcessingStep.EXTRACT_WRONG_QUESTIONS;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.EXTRACT_WRONG_QUESTIONS });
      const extracted = await extractWrongQuestions(ocrResult.text, indices);
      logger.info({ jobId: job.id, count: extracted.length }, 'Extracted wrong questions');

      const kbContext = await getKBContext();
      const knowledgeTreeContext = await exportTreeForLLM();
      const wrongResults = [];
      for (const q of extracted) {
        context.currentStep = ProcessingStep.GENERATE_EXPLANATION;
        await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_EXPLANATION });
        const explanation = await generateExplanation(q.questionText, kbContext);
        logger.debug({ jobId: job.id, questionIndex: q.questionIndex }, 'Generated explanation');

        context.currentStep = ProcessingStep.GENERATE_PRACTICE;
        await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_PRACTICE });
        const practiceQuestions = await generatePracticeQuestions(q.questionText, 5);
        logger.debug({ jobId: job.id, questionIndex: q.questionIndex, count: practiceQuestions.length }, 'Generated practice questions');

        const matchResult = await matchOCRToKnowledgeTree(q.questionText, knowledgeTreeContext, context.job.userId ?? '');
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
      context.currentStep = ProcessingStep.PARSE_QUESTIONS;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.PARSE_QUESTIONS });
      const parsedQuestions = await parseQuestions(ocrResult.text);
      logger.info({ jobId: job.id, count: parsedQuestions.length }, 'Parsed questions');

      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { questions: parsedQuestions, currentStep: ProcessingStep.PARSE_QUESTIONS });

      context.currentStep = ProcessingStep.BATCH_MATCH;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.BATCH_MATCH });
      const knowledgeTreeContext = await exportTreeForLLM();
      const questionResults = await batchMatchQuestions(parsedQuestions, knowledgeTreeContext);
      logger.info({ jobId: job.id, count: questionResults.length }, 'Batch matched questions');

      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { questionResults, currentStep: ProcessingStep.BATCH_MATCH });

      const allMatchedNodeIds = [...new Set(
        questionResults
          .flatMap(r => r.matchedNodes)
          .map(n => n.kbEntryId)
      )];

      if (allMatchedNodeIds.length > 0) {
        const avgMastery = 15;
        await userProgressService.markNodesAsKnownWithMastery(allMatchedNodeIds, avgMastery, context.job.userId ?? '');
        logger.info({ jobId: job.id, count: allMatchedNodeIds.length }, 'Marked nodes as known');

        for (const nodeId of allMatchedNodeIds) {
          try {
            await initializeReview(nodeId, context.job.userId ?? '');
          } catch (err) {
            logger.warn({ jobId: job.id, nodeId, err }, 'Failed to initialize review');
          }
        }
      }
    } else {
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

      context.currentStep = ProcessingStep.MATCH;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.MATCH });
      const matchResults = await this.performMatching(job, ocrResult.text, kbNodes);
      context.matchResults = matchResults;

      context.currentStep = ProcessingStep.ANALYZE_KNOWLEDGE;
      await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.ANALYZE_KNOWLEDGE });

      const knowledgeTreeContext = await exportTreeForLLM();
      logger.info({ jobId: job.id, treeChars: knowledgeTreeContext.length }, 'Exported knowledge tree');

      const matchResult = await matchOCRToKnowledgeTree(ocrResult.text, knowledgeTreeContext, context.job.userId ?? '');
      logger.info({ jobId: job.id, matchedCount: matchResult.matchedNodes.length,
        nodes: matchResult.matchedNodes.map(m => `${m.nodeId}(${m.confidence})`) }, 'AI matched knowledge nodes');

      const matchedNodeIds = matchResult.matchedNodes.map(m => m.nodeId);
      if (matchedNodeIds.length > 0) {
        const avgMastery = matchResult.matchedNodes.length > 0
          ? matchResult.matchedNodes.reduce((sum, m) => sum + (m.estimatedMastery || 15), 0) / matchResult.matchedNodes.length
          : 15;
        await userProgressService.markNodesAsKnownWithMastery(matchedNodeIds, avgMastery, context.job.userId ?? '');
        logger.info({ jobId: job.id, count: matchedNodeIds.length, avgMastery }, 'Marked nodes as known with mastery');

        for (const nodeId of matchedNodeIds) {
          try {
            await initializeReview(nodeId, context.job.userId ?? '');
          } catch (err) {
            logger.warn({ jobId: job.id, nodeId, err }, 'Failed to initialize review');
          }
        }
      }

      await this.updateJobWithKnowledgeMatch(job.id, matchResult);
    }

    context.currentStep = ProcessingStep.GENERATE_GRAPH;
    await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_GRAPH });
    const graphData = await generateGraphFromText(ocrResult.text);
    const storage = getKnowledgeGraphStorage(context.job.userId ?? '');
    await storage.initialize();
    const mergeResult = await storage.mergeJobGraph(job.id, graphData);
    logger.info({ jobId: job.id, nodesAdded: mergeResult.nodesAdded, edgesAdded: mergeResult.edgesAdded }, 'Knowledge graph updated');

    context.currentStep = ProcessingStep.SAVE_RESULTS;
    await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.SAVE_RESULTS });

    let uniqueNodeIds: string[];
    if (job.jobType === JobType.MULTIPLE) {
      const updatedJob = await getJob(job.id);
      const questionResults = (updatedJob?.questionResults || []);
      uniqueNodeIds = [...new Set(
        questionResults
          .flatMap(r => r.matchedNodes)
          .map(n => n.kbEntryId)
      )];
    } else {
      uniqueNodeIds = [...new Set((context.matchResults || []).map(r => r.kbEntryId))];
    }

    context.currentStep = ProcessingStep.GENERATE_CARDS;
    await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_CARDS });
    for (const nodeId of uniqueNodeIds) {
      try {
        await generateFlashcards(nodeId, context.job.userId ?? '');
        logger.info({ jobId: job.id, nodeId }, 'Generated flashcards');
      } catch (err) {
        logger.warn({ jobId: job.id, nodeId, err }, 'Failed to generate flashcards');
      }
    }

    context.currentStep = ProcessingStep.GENERATE_CHEATSHEET;
    await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_CHEATSHEET });
    for (const nodeId of uniqueNodeIds) {
      try {
        await generateCheatSheet(nodeId, context.job.userId ?? '');
        logger.info({ jobId: job.id, nodeId }, 'Generated cheat sheet');
      } catch (err) {
        logger.warn({ jobId: job.id, nodeId, err }, 'Failed to generate cheat sheet');
      }
    }

    context.currentStep = ProcessingStep.GENERATE_REVIEW;
    await updateJobStatus(job.id, ProcessingStatus.PROCESSING, { currentStep: ProcessingStep.GENERATE_REVIEW });
    for (const nodeId of uniqueNodeIds) {
      try {
        await generateStudyNotes(nodeId, context.job.userId ?? '');
        logger.info({ jobId: job.id, nodeId }, 'Generated study notes');
      } catch (err) {
        logger.warn({ jobId: job.id, nodeId, err }, 'Failed to generate study notes');
      }
    }

    await this.updateJobWithResults(
      job.id,
      ocrResult.text,
      context.matchResults || [],
      graphData
    );

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
      logger.debug({ filePath, format: validation.format, dimensions: validation.dimensions }, 'Validated image');
    } else if (this.isDocumentFile(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      logger.debug({ filePath, ext }, 'Validated document');
    } else {
      throw new Error(`Unsupported file type: ${path.extname(filePath)}`);
    }
  }

  public async performOCR(job: Job): Promise<OCRResult> {
    const startTime = Date.now();

    if (this.isImageFile(job.filePath)) {
      logger.info({ jobId: job.id, fileName: job.fileName }, 'Running OCR');
      try {
        const ocrResult = await extractText(job.filePath, {
          timeout: this.options.ocrTimeoutMs,
          language: 'eng',
          preprocessing: true,
          includeBlocks: false,
        });

        logger.info({ jobId: job.id, textChars: ocrResult.text.length, confidence: ocrResult.confidence }, 'OCR complete');
        return ocrResult;
      } catch (error) {
        logger.error({ jobId: job.id, err: error }, 'OCR failed');
        throw new ProcessingError(
          `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ProcessingStep.OCR,
          job.id,
          true,
          error instanceof Error ? error : undefined
        );
      }
    }

    logger.info({ jobId: job.id, fileName: job.fileName }, 'Extracting text from document');
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

      logger.info({ jobId: job.id, textChars: text.length, durationMs: processingTime }, 'Text extraction complete');
      return {
        text,
        confidence: 1.0,
        processingTime,
        language: 'text',
      };
    } catch (error) {
      logger.error({ jobId: job.id, err: error }, 'Text extraction failed');
      throw new ProcessingError(
        `Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ProcessingStep.OCR,
        job.id,
        false,
        error instanceof Error ? error : undefined
      );
    }
  }

  private async queryKnowledgeBase(): Promise<KnowledgeBaseEntry[]> {
    logger.info('Querying knowledge base');

    try {
      const maxKB = Math.floor(Number(this.options.maxKBEntries)) || 50;
      logger.debug({ maxKB }, 'KB query params');
      const tree = await getFullKnowledgeTree();

      const entries: KnowledgeBaseEntry[] = tree.slice(0, maxKB).map(node => ({
        id: node.id,
        title: node.name,
        description: node.name,
        category: node.domain,
        metadata: { prerequisites: node.prerequisites, nextSteps: node.nextSteps },
      }));

      logger.info({ count: entries.length }, 'Retrieved knowledge base entries from JSON');
      return entries;
    } catch (error) {
      logger.warn({ err: error }, 'JSON knowledge base query failed, falling back to file');

      try {
        const fs = await import('fs/promises');
        const path = await import('path');
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

        logger.info({ count: entries.length }, 'Retrieved knowledge base entries from JSON file');
        return entries.slice(0, this.options.maxKBEntries);
      } catch (fallbackError) {
        logger.error({ err: fallbackError }, 'Failed to query knowledge base');
        return [];
      }
    }
  }

  public async performMatching(
    job: Job,
    ocrText: string,
    kbNodes: KnowledgeBaseEntry[]
  ): Promise<MatchResult[]> {
    logger.info({ jobId: job.id }, 'Running AI matching');

    if (kbNodes.length === 0) {
      logger.warn({ jobId: job.id }, 'No knowledge base entries to match against');
      return [];
    }

    if (!ocrText || ocrText.trim().length === 0) {
      logger.warn({ jobId: job.id }, 'No OCR text to match');
      return [];
    }

    try {
      await updateJobStatus(job.id, ProcessingStatus.MATCHING);

      const matches = await findMatches(ocrText, kbNodes);

      if (matches.length === 0 && moonshotBreaker.opened) {
        throw new ProcessingError(
          'Moonshot API unavailable (circuit open)',
          ProcessingStep.MATCH,
          job.id,
          false,
        );
      }

      logger.info({ jobId: job.id, matchCount: matches.length }, 'AI matching complete');

      matches.slice(0, 3).forEach((match, i) => {
        logger.debug({ jobId: job.id, rank: i + 1, kbEntryId: match.kbEntryId, confidence: match.confidence }, 'Top match');
      });

      return matches;
    } catch (error) {
      logger.error({ jobId: job.id, err: error }, 'AI matching failed');
      throw new ProcessingError(
        `AI matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ProcessingStep.MATCH,
        job.id,
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  public async updateJobWithOCRResult(jobId: string, ocrResult: OCRResult): Promise<void> {
    logger.debug({ jobId }, 'Saving OCR checkpoint');

    const updated = await updateJobStatus(jobId, ProcessingStatus.OCR_COMPLETE, {
      ocrText: ocrResult.text,
      ocrConfidence: ocrResult.confidence / 100,
    });

    if (!updated) {
      throw new Error('Failed to update job with OCR results');
    }

    logger.debug({ jobId }, 'OCR checkpoint saved');
  }

  public async updateJobWithResults(
    jobId: string,
    ocrText: string,
    results: MatchResult[],
    graphData?: GraphData
  ): Promise<void> {
    logger.debug({ jobId }, 'Saving final results');

    const updateData: { ocrText: string; results: MatchResult[]; graphData?: GraphData } = {
      ocrText,
      results,
    };

    if (graphData) {
      updateData.graphData = graphData;
      logger.debug({ jobId, nodeCount: graphData.nodes.length, edgeCount: graphData.edges.length }, 'Graph data attached');
    }

    const updated = await updateJobStatus(jobId, ProcessingStatus.MATCHING, updateData);

    if (!updated) {
      throw new Error('Failed to update job with matching results');
    }

    logger.debug({ jobId }, 'Final results saved');
  }

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

  public async handleJobError(
    jobId: string,
    error: Error,
    step: ProcessingStep
  ): Promise<void> {
    logger.error({ jobId, step, err: error }, 'Handling job error');

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
      logger.error({ jobId, err: updateError }, 'Failed to update job with error status');
    }
  }

  private async executeStep<T>(
    step: ProcessingStep,
    fn: () => Promise<T>
  ): Promise<StepResult<T>> {
    const startTime = Date.now();

    try {
      const data = await fn();
      const duration = Date.now() - startTime;

      logger.debug({ step, durationMs: duration }, 'Step completed');
      this.emit('step:completed', step, duration);

      return {
        success: true,
        data,
        durationMs: duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error({ step, durationMs: duration, err: error }, 'Step failed');
      this.emit('step:failed', step, error as Error);

      return {
        success: false,
        error: error as Error,
        durationMs: duration,
      };
    }
  }

  public updateOptions(options: Partial<ProcessingOptions>): void {
    this.options = { ...this.options, ...options };
    logger.info({ options: this.options }, 'Updated processing options');
  }

  public getOptions(): ProcessingOptions {
    return { ...this.options };
  }
}

let jobProcessor: JobProcessor | null = null;

export function getJobProcessor(options?: Partial<ProcessingOptions>): JobProcessor {
  if (!jobProcessor) {
    jobProcessor = new JobProcessor(options);
  }
  return jobProcessor;
}

export function resetJobProcessor(): void {
  jobProcessor = null;
}

export async function processJob(jobId: string): Promise<void> {
  const processor = getJobProcessor();
  return processor.processJob(jobId);
}
