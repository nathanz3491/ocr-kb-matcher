/**
 * Test script for batch matching service
 * 
 * Usage: npx ts-node src/tests/batchMatching.test.ts
 */

import OpenAI from 'openai';
import { ParsedQuestion, QuestionMatchResult, MatchResult } from '../../../shared/types';

// Mock knowledge graph
const mockGraph = {
  nodes: [
    { id: 'G04', name: '勾股定理', domain: 'Geometry' },
    { id: 'A03', name: '一元一次方程', domain: 'Algebra' },
    { id: 'C01', name: '平面直角坐标系', domain: 'Analytic Geometry' }
  ],
  edges: []
};

// Mock OpenAI client
let callCount = 0;

const mockClient = {
  chat: {
    completions: {
      create: async () => {
        callCount++;
        return {
          choices: [{
            message: {
              content: JSON.stringify({
                results: [
                  {
                    questionId: 'q1',
                    questionText: 'What is the Pythagorean theorem?',
                    matchedNodes: [
                      { nodeId: 'G04', confidence: 0.95, reasoning: 'Direct mention of theorem' }
                    ]
                  },
                  {
                    questionId: 'q2',
                    questionText: 'Solve x + 3 = 7',
                    matchedNodes: [
                      { nodeId: 'A03', confidence: 0.88, reasoning: 'Linear equation solving' }
                    ]
                  },
                  {
                    questionId: 'q3',
                    questionText: 'Invalid ID question',
                    matchedNodes: [
                      { nodeId: 'INVALID-NODE', confidence: 0.5, reasoning: 'Should be filtered' }
                    ]
                  }
                ]
              })
            }
          }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        };
      }
    }
  }
} as unknown as OpenAI;

// Patch modules before requiring batchMatching
const kgModule = require('../services/knowledgeGraphStorage');
const originalGetKG = kgModule.getKnowledgeGraph;
kgModule.getKnowledgeGraph = async () => mockGraph;

const aiModule = require('../services/ai');
const originalGetConfig = aiModule.getMoonshotConfig;
aiModule.getMoonshotConfig = () => ({
  apiKey: 'test-key',
  baseURL: 'https://api.test.com',
  model: 'test-model',
  timeout: 180000,
  maxRetries: 0
});

// Re-require to apply patches
delete require.cache[require.resolve('../services/batchMatching')];
const { batchMatchQuestions } = require('../services/batchMatching');

async function runTest() {
  console.log('Testing Batch Matching Service...\n');

  const questions: ParsedQuestion[] = [
    { id: 'q1', text: 'What is the Pythagorean theorem?', index: 0 },
    { id: 'q2', text: 'Solve x + 3 = 7', index: 1 },
    { id: 'q3', text: 'Invalid ID question', index: 2 }
  ];

  const knowledgeContext = '[Mock Knowledge Tree Context]';

  let passed = 0;
  let failed = 0;

  // Test 1: ONE AI call for all questions
  callCount = 0;
  const results = await batchMatchQuestions(questions, knowledgeContext, mockClient);
  
  if (callCount === 1) {
    console.log('✅ Test 1 PASSED: ONE AI call made for', questions.length, 'questions');
    passed++;
  } else {
    console.error('❌ Test 1 FAILED: Expected 1 AI call, got', callCount);
    failed++;
  }

  // Test 2: Correct number of results
  if (results.length === questions.length) {
    console.log('✅ Test 2 PASSED: Got', results.length, 'results for', questions.length, 'questions');
    passed++;
  } else {
    console.error('❌ Test 2 FAILED: Expected', questions.length, 'results, got', results.length);
    failed++;
  }

  // Test 3: Result structure
  const validStructure = results.every((r: QuestionMatchResult) =>
    'questionId' in r &&
    'questionText' in r &&
    'matchedNodes' in r &&
    'status' in r
  );
  if (validStructure) {
    console.log('✅ Test 3 PASSED: All results have correct structure');
    passed++;
  } else {
    console.error('❌ Test 3 FAILED: Some results missing required fields');
    failed++;
  }

  // Test 4: NodeIds are valid (INVALID-NODE should be filtered)
  const allNodeIds = results.flatMap((r: QuestionMatchResult) => r.matchedNodes.map((n: MatchResult) => n.kbEntryId));
  const invalidIds = allNodeIds.filter((id: string) => !mockGraph.nodes.find((nd: { id: string }) => nd.id === id));
  if (invalidIds.length === 0) {
    console.log('✅ Test 4 PASSED: All nodeIds are valid');
    passed++;
  } else {
    console.error('❌ Test 4 FAILED: Invalid nodeIds found:', invalidIds);
    failed++;
  }

  // Test 5: Question q3 should have failed status (only invalid node)
  const q3 = results.find((r: QuestionMatchResult) => r.questionId === 'q3');
  if (q3 && q3.status === 'failed' && q3.matchedNodes.length === 0) {
    console.log('✅ Test 5 PASSED: Question with only invalid nodes has status "failed"');
    passed++;
  } else {
    console.error('❌ Test 5 FAILED: Expected q3 to have status "failed", got:', q3?.status);
    failed++;
  }

  // Test 6: Question q1 and q2 should have matched status
  const q1 = results.find((r: QuestionMatchResult) => r.questionId === 'q1');
  const q2 = results.find((r: QuestionMatchResult) => r.questionId === 'q2');
  if (q1?.status === 'matched' && q2?.status === 'matched') {
    console.log('✅ Test 6 PASSED: Valid questions have status "matched"');
    passed++;
  } else {
    console.error('❌ Test 6 FAILED: Expected q1 and q2 to have status "matched"');
    failed++;
  }

  // Test 7: Empty questions array
  const emptyResults = await batchMatchQuestions([], knowledgeContext, mockClient);
  if (emptyResults.length === 0) {
    console.log('✅ Test 7 PASSED: Empty questions returns empty results');
    passed++;
  } else {
    console.error('❌ Test 7 FAILED: Expected empty array, got', emptyResults.length);
    failed++;
  }

  // Test 8: MatchResult has correct fields
  const q1Result = results.find((r: QuestionMatchResult) => r.questionId === 'q1');
  if (q1Result && q1Result.matchedNodes.length > 0) {
    const node = q1Result.matchedNodes[0];
    if (
      'kbEntryId' in node &&
      'confidence' in node &&
      'ocrTextSpan' in node &&
      'reasoning' in node
    ) {
      console.log('✅ Test 8 PASSED: MatchResult has correct fields');
      passed++;
    } else {
      console.error('❌ Test 8 FAILED: MatchResult missing required fields');
      failed++;
    }
  }

  // Restore modules
  kgModule.getKnowledgeGraph = originalGetKG;
  aiModule.getMoonshotConfig = originalGetConfig;

  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
  }
}

runTest().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
