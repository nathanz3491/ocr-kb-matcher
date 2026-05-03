import { Router } from 'express';
import {
  scheduleWrongQuestionReviews,
  getDueReviews,
  submitReview,
  getReviewById,
  getReviewStats,
  WrongQuestionResult,
} from '../services/wrongQuestionReviewService';
import { generatePracticeQuestions } from '../services/wrongQuestionService';
import { userProgressService } from '../services/userProgressService';

const router = Router();

router.post('/schedule', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { wrongResults, jobId } = req.body as {
      wrongResults: WrongQuestionResult[];
      jobId: string;
    };

    if (!wrongResults || !Array.isArray(wrongResults) || !jobId) {
      res.status(400).json({ success: false, error: 'Invalid request body' });
      return;
    }

    const scheduled = await scheduleWrongQuestionReviews(wrongResults, jobId, userId);

    res.json({ success: true, data: scheduled });
  } catch (error) {
    console.error('[WrongQuestionReview] Failed to schedule reviews:', error);
    res.status(500).json({ success: false, error: 'Failed to schedule reviews' });
  }
});

router.get('/due', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const dueReviews = await getDueReviews(userId);
    res.json({ success: true, data: dueReviews });
  } catch (error) {
    console.error('[WrongQuestionReview] Failed to get due reviews:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve due reviews' });
  }
});

router.post('/:reviewId/submit', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { reviewId } = req.params;
    const { quality } = req.body as { quality: number };

    if (quality === undefined || quality < 0 || quality > 5) {
      res.status(400).json({ success: false, error: 'Quality must be between 0 and 5' });
      return;
    }

    const review = await getReviewById(reviewId, userId);
    if (!review) {
      res.status(404).json({ success: false, error: 'Review not found' });
      return;
    }

    const updated = await submitReview(reviewId, quality, userId);
    if (!updated) {
      res.status(500).json({ success: false, error: 'Failed to update review' });
      return;
    }

    const practiceQuestions = await generatePracticeQuestions(updated.questionText, 5);

    for (const nodeId of updated.matchedNodeIds) {
      await userProgressService.updateNodeMastery(nodeId, 5, userId);
    }

    res.json({
      success: true,
      data: {
        review: updated,
        practiceQuestions,
      },
    });
  } catch (error) {
    console.error('[WrongQuestionReview] Failed to submit review:', error);
    res.status(500).json({ success: false, error: 'Failed to submit review' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const stats = await getReviewStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[WrongQuestionReview] Failed to get stats:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve stats' });
  }
});

export default router;