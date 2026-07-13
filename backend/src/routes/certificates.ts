/**
 * Certificate Routes
 * Generate and manage learning certificates
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { authenticate } from '../middleware/auth';
import { getKnowledgeGraphStorage } from '../services/knowledgeGraphStorage';

const DATA_DIR = path.join(process.cwd(), 'data');

const router = Router();
router.use(authenticate);

interface Certificate {
  id: string;
  topicId: string;
  topicName: string;
  earnedDate: string;
  score: number;
  totalQuestions: number;
  completed: boolean;
}

interface UserCertificates {
  completedTopics: string[];
}

/**
 * Get the certificates file path for a specific user
 */
function getCertFilePath(userId: string): string {
  return path.join(DATA_DIR, `certificates-${userId}.json`);
}

/**
 * Load completed topics for a user from their certificate file
 */
async function loadUserCerts(userId: string): Promise<UserCertificates> {
  const filePath = getCertFilePath(userId);
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as UserCertificates;
  } catch {
    return { completedTopics: [] };
  }
}

/**
 * Save completed topics for a user to their certificate file
 */
async function saveUserCerts(userId: string, data: UserCertificates): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const filePath = getCertFilePath(userId);
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    console.error('[Certificates] Failed to save:', error);
  }
}

/**
 * GET /api/certificates
 * Get all earned certificates
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const storage = getKnowledgeGraphStorage(userId);
    await storage.initialize();
    const graph = await storage.getGlobalGraph();

    const userCerts = await loadUserCerts(userId);
    const completedTopics = new Set(userCerts.completedTopics);

    // Generate certificates for completed topics
    const certificates: Certificate[] = Array.from(completedTopics)
      .filter(topicId => graph.nodes.some(n => n.id === topicId))
      .map(topicId => {
        const node = graph.nodes.find(n => n.id === topicId)!;
        return {
          id: `cert-${topicId}-${Date.now()}`,
          topicId,
          topicName: node.data.label || node.id,
          earnedDate: new Date().toISOString(),
          score: 5,
          totalQuestions: 5,
          completed: true
        };
      });

    res.json({
      success: true,
      data: certificates
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch certificates' });
  }
});

/**
 * POST /api/certificates
 * Award a certificate for completing a topic
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const { topicId, topicName, score } = req.body;

    if (!topicId) {
      res.status(400).json({ success: false, error: 'topicId is required' });
      return;
    }

    const userCerts = await loadUserCerts(userId);
    const completedTopics = new Set(userCerts.completedTopics);

    // Mark topic as completed
    completedTopics.add(topicId);
    await saveUserCerts(userId, { completedTopics: [...completedTopics] });

    const certificate: Certificate = {
      id: `cert-${topicId}-${Date.now()}`,
      topicId,
      topicName: topicName || topicId,
      earnedDate: new Date().toISOString(),
      score: score || 5,
      totalQuestions: 5,
      completed: true
    };

    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    console.error('Error awarding certificate:', error);
    res.status(500).json({ success: false, error: 'Failed to award certificate' });
  }
});

/**
 * GET /api/certificates/:topicId
 * Get certificate for a specific topic
 */
router.get('/:topicId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const { topicId } = req.params;
    const storage = getKnowledgeGraphStorage(userId);
    await storage.initialize();

    const userCerts = await loadUserCerts(userId);
    const completedTopics = new Set(userCerts.completedTopics);

    if (!completedTopics.has(topicId)) {
      res.status(404).json({
        success: false,
        error: 'Certificate not found - topic not yet completed'
      });
      return;
    }

    const graph = await storage.getGlobalGraph();
    const node = graph.nodes.find(n => n.id === topicId);

    const certificate: Certificate = {
      id: `cert-${topicId}-${Date.now()}`,
      topicId: node?.id || topicId,
      topicName: node?.data.label || topicId,
      earnedDate: new Date().toISOString(),
      score: 5,
      totalQuestions: 5,
      completed: true
    };

    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch certificate' });
  }
});

/**
 * GET /api/certificates/stats/summary
 * Get certificate statistics
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const storage = getKnowledgeGraphStorage(userId);
    await storage.initialize();
    const graph = await storage.getGlobalGraph();

    const userCerts = await loadUserCerts(userId);
    const completedTopics = new Set(userCerts.completedTopics);

    const totalTopics = graph.nodes.length;
    const completedCount = completedTopics.size;
    const completionPercentage = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalCertificates: completedCount,
        totalTopics,
        completionPercentage,
        recentCertificates: completedCount
      }
    });
  } catch (error) {
    console.error('Error fetching certificate stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch certificate stats' });
  }
});

export default router;