/**
 * Quiz API Routes
 * Provides quiz generation and submission endpoints
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { generateQuiz, generateTopicQuiz, submitQuiz, getQuizSession, getQuizStats, generateAdaptiveQuiz } from '../services/quizService';
import { userProgressService } from '../services/userProgressService';
import { getKnowledgeGraph, InternalGraphNode } from '../services/knowledgeGraphStorage';

const router = Router();

/**
 * Calculate mastery increase based on quiz score
 * 5/5 = 10%, 4/5 = 8%, 3/5 = 6%, 2/5 = 4%, 1/5 = 2%, 0/5 = 0%
 */
function calculateMasteryIncrease(score: number, totalQuestions: number): number {
  const percentage = (score / totalQuestions) * 100;
  // 5/5 = 100% = 10%, 4/5 = 80% = 8%, etc.
  return Math.round((percentage / 100) * 10 * 10) / 10; // Round to 1 decimal
}

/**
 * POST /api/quiz/generate/:jobId
 * Generate a new quiz from job content
 */
router.post('/generate/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const session = await generateQuiz(jobId);
    
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        questions: session.questions.map(q => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          items: q.items,
          matches: q.matches,
          correctMatches: q.correctMatches
        }))
      }
    });
  } catch (error) {
    console.error('[Quiz] Failed to generate quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate quiz'
    });
  }
});

/**
 * POST /api/quiz/topic/:topicId
 * Generate a quiz from a knowledge topic
 */
router.post('/topic/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;
    const session = await generateTopicQuiz(topicId);
    
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        topicId: topicId,
        questions: session.questions.map(q => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          items: q.items,
          matches: q.matches,
          correctMatches: q.correctMatches
        }))
      }
    });
  } catch (error) {
    console.error('[Quiz] Failed to generate topic quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate quiz'
    });
  }
});

router.get('/adaptive', authenticate, asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.userId;
    const count = parseInt(req.query.count as string, 10) || 5;

    const progress = await userProgressService.loadProgress(userId ?? '');
    const nodeMastery = progress.nodeMastery || {};

    const graph = await getKnowledgeGraph(userId);
    const allNodeIds = graph.nodes.map((n: InternalGraphNode) => n.id);

    const weakNodes = (allNodeIds as string[])
      .filter((id: string) => {
        const mastery = nodeMastery[id];
        return mastery === undefined || mastery < 50;
      })
      .sort((a: string, b: string) => (nodeMastery[a] || 0) - (nodeMastery[b] || 0))
      .slice(0, Math.max(count, 10));

    const weakNodeIds = weakNodes.length > 0 ? weakNodes : allNodeIds.slice(0, count);

    const session = await generateAdaptiveQuiz(weakNodeIds, count);

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        targetedNodes: session.targetedNodes || [],
        questions: session.questions.map(q => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options,
          explanation: q.explanation,
          items: q.items,
          matches: q.matches,
          correctMatches: q.correctMatches
        }))
      }
    });
  } catch (error) {
    console.error('[Quiz] Failed to generate adaptive quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate adaptive quiz'
    });
  }
}));

/**
 * GET /api/quiz/session/:sessionId
 * Get quiz session (without answers)
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await getQuizSession(sessionId);
    
    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Quiz session not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        jobId: session.jobId,
        questions: session.questions.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options
        }))
      }
    });
  } catch (error) {
    console.error('[Quiz] Failed to get session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve quiz session'
    });
  }
});

/**
 * POST /api/quiz/submit
 * Submit quiz answers
 */
router.post('/submit', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { sessionId, answers, topicId } = req.body;
    
    if (!sessionId || !answers || !Array.isArray(answers)) {
      res.status(400).json({
        success: false,
        error: 'sessionId and answers array are required'
      });
      return;
    }
    
    const result = await submitQuiz(sessionId, answers);
    
    // Get full question details with explanations
    const session = await getQuizSession(sessionId);
    const questionsWithExplanations = session?.questions.map(q => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      items: q.items,
      matches: q.matches,
      correctMatches: q.correctMatches
    })) || [];
    
    // Update mastery based on quiz score
    let masteryIncrease = 0;
    if (topicId) {
      masteryIncrease = calculateMasteryIncrease(result.score, result.totalQuestions);
      await userProgressService.updateNodeMastery(topicId, masteryIncrease, userId ?? '');
      console.log(`[Quiz] Updated mastery for ${topicId}: +${masteryIncrease}%`);
    }
    
    if (session?.targetedNodes && session.targetedNodes.length > 0) {
      masteryIncrease = calculateMasteryIncrease(result.score, result.totalQuestions);
      for (const nodeId of session.targetedNodes) {
        await userProgressService.updateNodeMastery(nodeId, masteryIncrease, userId ?? '');
        console.log(`[Quiz] Updated mastery for targeted node ${nodeId}: +${masteryIncrease}%`);
      }
    }
    
    res.json({
      success: true,
      data: {
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: Math.round((result.score / result.totalQuestions) * 100),
        masteryIncrease: masteryIncrease,
        answers: result.answers,
        questions: questionsWithExplanations
      }
    });
  } catch (error) {
    console.error('[Quiz] Failed to submit quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit quiz'
    });
  }
});

/**
 * GET /api/quiz/stats
 * Get quiz statistics
 */
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getQuizStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Quiz] Failed to get stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve quiz statistics'
    });
  }
});

export default router;
