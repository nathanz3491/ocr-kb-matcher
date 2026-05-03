import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import {
  getLinksByParent,
  revokeLink,
  isParentLinkedToStudent,
  getStudentDashboardData,
} from '../services/parentLinkService';
import { getUserById } from '../services/userService';

const router = Router();

// ─── Auth guard for ALL routes ───────────────────────────────────────────
router.use(authenticate);

// Middleware: ensure user is a parent
router.use(asyncHandler(async (req: Request, res: Response, next) => {
  if (req.user?.accountType !== 'parent') {
    res.status(403).json({ success: false, error: 'Only parents can access monitoring routes' });
    return;
  }
  next();
}));

// ─── GET /api/parent-monitor/students ────────────────────────────────────
// List all students linked to this parent
router.get(
  '/students',
  asyncHandler(async (req: Request, res: Response) => {
    const parentId = req.user!.userId;
    const links = await getLinksByParent(parentId);
    const students = links.map(link => ({
      linkId: link.id,
      studentId: link.studentId,
      studentName: link.studentName,
      studentEmail: link.studentEmail,
      linkedAt: link.createdAt,
    }));
    res.json({ success: true, data: students });
  })
);

// ─── DELETE /api/parent-monitor/link/:linkId ─────────────────────────────
router.delete(
  '/link/:linkId',
  asyncHandler(async (req: Request, res: Response) => {
    const parentId = req.user!.userId;
    const result = await revokeLink(req.params.linkId, parentId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  })
);

// ─── Helper: verify parent is linked to student ─────────────────────────
async function requireLink(parentId: string, studentId: string): Promise<boolean> {
  return isParentLinkedToStudent(parentId, studentId);
}

// ─── GET /api/parent-monitor/student/:id/overview ────────────────────────
router.get(
  '/student/:id/overview',
  asyncHandler(async (req: Request, res: Response) => {
    const parentId = req.user!.userId;
    const studentId = req.params.id;

    const linked = await requireLink(parentId, studentId);
    if (!linked) {
      res.status(403).json({ success: false, error: 'Not linked to this student' });
      return;
    }

    const student = await getUserById(studentId);
    if (!student) {
      res.status(404).json({ success: false, error: 'Student not found' });
      return;
    }

    const data = await getStudentDashboardData(studentId);

    const overview = {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
      knowledgeGraph: data.knowledgeGraph || { nodes: [], edges: [] },
      userProgress: data.userProgress || {},
      reviews: data.reviews || { dueCount: 0, total: 0 },
      quizResults: data.quizResults || { sessions: [], averageScore: 0 },
      certificates: data.certificates || { total: 0, recent: [] },
    };

    res.json({ success: true, data: overview });
  })
);

// ─── GET /api/parent-monitor/student/:id/knowledge-graph ─────────────────
router.get(
  '/student/:id/knowledge-graph',
  asyncHandler(async (req: Request, res: Response) => {
    const parentId = req.user!.userId;
    const studentId = req.params.id;

    const linked = await requireLink(parentId, studentId);
    if (!linked) {
      res.status(403).json({ success: false, error: 'Not linked to this student' });
      return;
    }

    const data = await getStudentDashboardData(studentId);
    res.json({ success: true, data: data.knowledgeGraph || { nodes: [], edges: [] } });
  })
);

// ─── GET /api/parent-monitor/student/:id/reviews ─────────────────────────
router.get(
  '/student/:id/reviews',
  asyncHandler(async (req: Request, res: Response) => {
    const parentId = req.user!.userId;
    const studentId = req.params.id;

    const linked = await requireLink(parentId, studentId);
    if (!linked) {
      res.status(403).json({ success: false, error: 'Not linked to this student' });
      return;
    }

    const data = await getStudentDashboardData(studentId);
    res.json({ success: true, data: data.reviews || {} });
  })
);

// ─── GET /api/parent-monitor/student/:id/quiz ─────────────────────────────
router.get(
  '/student/:id/quiz',
  asyncHandler(async (req: Request, res: Response) => {
    const parentId = req.user!.userId;
    const studentId = req.params.id;

    const linked = await requireLink(parentId, studentId);
    if (!linked) {
      res.status(403).json({ success: false, error: 'Not linked to this student' });
      return;
    }

    const data = await getStudentDashboardData(studentId);
    res.json({ success: true, data: data.quizResults || {} });
  })
);

export default router;
