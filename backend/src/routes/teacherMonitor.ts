import { Router, Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import {
  getLinkedStudentsForTeacher,
  revokeTeacherLink,
  isTeacherLinkedToStudent,
} from '../services/teacherLinkService';
import { getStudentDashboardData } from '../services/parentLinkService';
import { getUserById } from '../services/userService';

const router = Router();

const DATA_DIR = path.join(process.cwd(), 'data');

router.use(authenticate);

router.use(asyncHandler(async (req: Request, res: Response, next) => {
  if (req.user?.accountType !== 'teacher') {
    res.status(403).json({ success: false, error: 'Only teachers can access monitoring routes' });
    return;
  }
  next();
}));

router.get(
  '/students',
  asyncHandler(async (req: Request, res: Response) => {
    const teacherId = req.user!.userId;
    const links = await getLinkedStudentsForTeacher(teacherId);
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

router.delete(
  '/link/:linkId',
  asyncHandler(async (req: Request, res: Response) => {
    const teacherId = req.user!.userId;
    const result = await revokeTeacherLink(req.params.linkId, teacherId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  })
);

async function requireLink(teacherId: string, studentId: string): Promise<boolean> {
  return isTeacherLinkedToStudent(teacherId, studentId);
}

router.get(
  '/student/:id/overview',
  asyncHandler(async (req: Request, res: Response) => {
    const teacherId = req.user!.userId;
    const studentId = req.params.id;

    if (!await requireLink(teacherId, studentId)) {
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

router.get(
  '/student/:id/knowledge-graph',
  asyncHandler(async (req: Request, res: Response) => {
    const teacherId = req.user!.userId;
    const studentId = req.params.id;

    if (!await requireLink(teacherId, studentId)) {
      res.status(403).json({ success: false, error: 'Not linked to this student' });
      return;
    }

    const data = await getStudentDashboardData(studentId);
    res.json({ success: true, data: data.knowledgeGraph || { nodes: [], edges: [] } });
  })
);

router.get(
  '/student/:id/reviews',
  asyncHandler(async (req: Request, res: Response) => {
    const teacherId = req.user!.userId;
    const studentId = req.params.id;

    if (!await requireLink(teacherId, studentId)) {
      res.status(403).json({ success: false, error: 'Not linked to this student' });
      return;
    }

    const data = await getStudentDashboardData(studentId);
    res.json({ success: true, data: data.reviews || {} });
  })
);

router.get(
  '/student/:id/quiz',
  asyncHandler(async (req: Request, res: Response) => {
    const teacherId = req.user!.userId;
    const studentId = req.params.id;

    if (!await requireLink(teacherId, studentId)) {
      res.status(403).json({ success: false, error: 'Not linked to this student' });
      return;
    }

    const data = await getStudentDashboardData(studentId);
    res.json({ success: true, data: data.quizResults || {} });
  })
);

router.get(
  '/student/:id/mastery',
  asyncHandler(async (req: Request, res: Response) => {
    const teacherId = req.user!.userId;
    const studentId = req.params.id;

    if (!await requireLink(teacherId, studentId)) {
      res.status(403).json({ success: false, error: 'Not linked to this student' });
      return;
    }

    const data = await getStudentDashboardData(studentId);
    res.json({ success: true, data: data.userProgress || {} });
  })
);

router.get(
  '/student/:id/study-plan',
  asyncHandler(async (req: Request, res: Response) => {
    const teacherId = req.user!.userId;
    const studentId = req.params.id;

    if (!await requireLink(teacherId, studentId)) {
      res.status(403).json({ success: false, error: 'Not linked to this student' });
      return;
    }

    try {
      const filePath = path.join(DATA_DIR, `study-plan-${studentId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      res.json({ success: true, data: JSON.parse(content) });
    } catch {
      res.json({ success: true, data: null });
    }
  })
);

export default router;
