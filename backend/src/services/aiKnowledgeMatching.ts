import OpenAI from 'openai';
import { getMoonshotConfig } from './ai';
import { getKnowledgeGraph } from './knowledgeGraphStorage';

export interface AIMatchResult {
  nodeId: string;
  confidence: number;
  reasoning: string;
  estimatedMastery?: number; // Estimated mastery percentage based on question difficulty
}

export interface AIMatchingResponse {
  matchedNodes: AIMatchResult[];
  relatedConcepts: string[];
}

const DIFFICULTY_ANALYSIS_PROMPT = `你是一个资深的数学教研专家。请分析以下【测试题目】的难度，并给出一个估计的掌握程度百分比。

【测试题目】
{{ocrText}}

请返回一个JSON格式的难度评估：
{
  "difficulty": "简单/中等/困难",
  "masteryEstimate": 15,
  "reasoning": "简短的分析理由"
}

注意：
1. masteryEstimate 是一个 0-100 的数字，表示如果用户答对这道题，应该增加多少百分比的掌握度
2. 一般来说：
   - 简单题目（基础概念题）：5-15%
   - 中等题目（综合应用题）：15-25%
   - 困难题目（创新/竞赛题）：25-40%
3. 只返回JSON，不要其他文字`;

const VALIDATION_PROMPT = `你是一个资深的数学教研专家。请检查以下AI输出是否使用了有效的知识点ID。

【数学知识图谱中的有效ID列表】
{{validNodeIds}}

【AI之前的输出】
{{previousResponse}}

请分析并返回修正后的JSON：
{
  "matchedNodes": [
    {
      "nodeId": "有效的ID",
      "confidence": 0.92,
      "reasoning": "修正后的理由"
    }
  ],
  "relatedConcepts": ["有效的ID"]
}

注意：
1. 只返回JSON，不要其他文字
2. 必须使用上面列表中的有效ID，不能使用P01、P02等不存在的ID
3. 如果某个ID不在列表中，请用列表中相关的ID替换
4. confidence 是 0-1 之间的置信度
5. reasoning 解释为什么匹配这个知识点`;

const KNOWLEDGE_MATCHING_PROMPT = `你是一个资深的数学教研专家。请阅读以下【数学知识图谱体系】，并判断用户输入的【测试题目】主要考察了哪些知识点。

【数学知识图谱体系】
{{knowledgeTree}}

【测试题目】
{{ocrText}}

请分析这道题目涉及的知识点，并返回JSON格式：
{
  "matchedNodes": [
    {
      "nodeId": "C03",
      "confidence": 0.92,
      "reasoning": "题目提到了坐标系中的两点，要求计算距离"
    }
  ],
  "relatedConcepts": ["C01", "G04"]
}

注意：
1. 只返回JSON，不要其他文字
2. nodeId 必须是知识图谱中存在的ID
3. confidence 是 0-1 之间的置信度
4. reasoning 解释为什么匹配这个知识点`;

/**
 * Get all valid node IDs from knowledge graph
 */
async function getValidNodeIds(userId?: string): Promise<Set<string>> {
  try {
    const graph = await getKnowledgeGraph(userId);
    return new Set(graph.nodes.map(n => n.id));
  } catch (error) {
    console.error('[AI Matching] Failed to load knowledge graph:', error);
    return new Set();
  }
}

/**
 * Validate and fix AI response - ensure all nodeIds exist in knowledge graph
 */
async function validateAndFixResponse(
  responseContent: string,
  validNodeIds: Set<string>
): Promise<AIMatchingResponse> {
  try {
    const result: AIMatchingResponse = JSON.parse(responseContent);
    
    // Check if all nodeIds are valid
    const invalidNodes = result.matchedNodes.filter(
      node => !validNodeIds.has(node.nodeId)
    );
    
    if (invalidNodes.length === 0) {
      result.matchedNodes = result.matchedNodes.filter(node => node.confidence >= 0.55);
      return result;
    }
    
    console.warn(`[AI Matching] Invalid node IDs found: ${invalidNodes.map(n => n.nodeId).join(', ')}`);
    console.log(`[AI Matching] Retrying with valid node ID list...`);
    
    // Query AI again with valid IDs and previous response
    const config = getMoonshotConfig();
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: 120000
    });
    
    const validIdsList = Array.from(validNodeIds).join(', ');
    const retryPrompt = VALIDATION_PROMPT
      .replace('{{validNodeIds}}', validIdsList)
      .replace('{{previousResponse}}', responseContent);
    
    const completion = await client.chat.completions.create({
      model: config.model,
      max_tokens: 4096,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a mathematics education expert. Fix the invalid node IDs.' },
        { role: 'user', content: retryPrompt }
      ]
    });
    
    const retryContent = completion.choices[0]?.message?.content || '';
    
    if (retryContent) {
      const retryResult: AIMatchingResponse = JSON.parse(retryContent);
      
      // Final validation
      const stillInvalid = retryResult.matchedNodes.filter(
        node => !validNodeIds.has(node.nodeId)
      );
      
      if (stillInvalid.length > 0) {
        console.error(`[AI Matching] Still invalid after retry: ${stillInvalid.map(n => n.nodeId).join(', ')}`);
        // Return what we have, filtering out invalid ones
        retryResult.matchedNodes = retryResult.matchedNodes.filter(
          node => validNodeIds.has(node.nodeId)
        );
      }
      retryResult.matchedNodes = retryResult.matchedNodes.filter(node => node.confidence >= 0.55);
      return retryResult;
    }
    result.matchedNodes = result.matchedNodes.filter(node => node.confidence >= 0.55);
    return result;
  } catch (error) {
    console.error('[AI Matching] Failed to validate/fix response:', error);
    return { matchedNodes: [], relatedConcepts: [] };
  }
}

/**
 * Analyze the difficulty of the OCR text and estimate mastery percentage
 */
async function analyzeDifficulty(ocrText: string): Promise<number> {
  try {
    const config = getMoonshotConfig();
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: 60000
    });

    const prompt = DIFFICULTY_ANALYSIS_PROMPT.replace('{{ocrText}}', ocrText.substring(0, 2000));

    const completion = await client.chat.completions.create({
      model: config.model,
      max_tokens: 1024,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a mathematics education expert. Analyze question difficulty.' },
        { role: 'user', content: prompt }
      ]
    });

  const responseContent = completion.choices[0]?.message?.content || '';
    
    if (responseContent) {
      const result = JSON.parse(responseContent);
      const masteryEstimate = result.masteryEstimate || 15;
      console.log(`[AI Matching] Difficulty analysis: ${result.difficulty}, mastery estimate: ${masteryEstimate}%`);
      return Math.max(0, Math.min(100, masteryEstimate));
    }
  } catch (error) {
    console.error('[AI Matching] Failed to analyze difficulty:', error);
  }
  
  // Default mastery if analysis fails
  return 15;
}

/**
 * Match OCR text to knowledge nodes using REAL AI (Moonshot)
 * 
 * This replaces the mock_llm_api() keyword matching from Python with actual AI.
 * Includes validation to ensure AI returns valid node IDs.
 */
export async function matchOCRToKnowledgeTree(
  ocrText: string,
  knowledgeTreeContext: string,
  userId?: string
): Promise<AIMatchingResponse> {
  // Get valid node IDs first
  const validNodeIds = await getValidNodeIds(userId);
  
  if (validNodeIds.size === 0) {
    console.error('[AI Matching] No valid node IDs - cannot match');
    return { matchedNodes: [], relatedConcepts: [] };
  }
  
  // Analyze difficulty and get mastery estimate
  const masteryEstimate = await analyzeDifficulty(ocrText);
  
  const prompt = KNOWLEDGE_MATCHING_PROMPT
    .replace('{{knowledgeTree}}', knowledgeTreeContext)
    .replace('{{ocrText}}', ocrText);

  // Use REAL AI (Moonshot)
  const config = getMoonshotConfig();
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: 120000
  });

  const completion = await client.chat.completions.create({
    model: config.model,
    max_tokens: 4096,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a mathematics education expert.' },
      { role: 'user', content: prompt }
    ]
  });

  const responseContent = completion.choices[0]?.message?.content || '';

  if (!responseContent) {
    console.error('Empty response from AI');
    return { matchedNodes: [], relatedConcepts: [] };
  }

  // Validate and fix the response, then add mastery estimate to each match
  const result = await validateAndFixResponse(responseContent, validNodeIds);
  
  // Add mastery estimate to all matched nodes
  result.matchedNodes = result.matchedNodes.map(node => ({
    ...node,
    estimatedMastery: masteryEstimate
  }));
  
  return result;
}
