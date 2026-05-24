import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { getUserById } from '../services/userService';
import {
  generateTeacherCodeForStudent,
  getTeacherCodeStatus,
  verifyAndLinkTeacherCode,
  getLinkedStudentsForTeacher,
  getLinksByStudent,
  revokeTeacherLink,
} from '../services/teacherLinkService';

const router = Router();

router.use(authenticate);

const verifyCodeSchema = z.object({
  studentId: z.string(),
  code: z.string().length(6),
});

router.get(
  '/students',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    if (req.user.accountType !== 'teacher') {
      res.status(403).json({ success: false, error: 'Only teachers can access this endpoint' });
      return;
    }

    const links = await getLinkedStudentsForTeacher(req.user.userId);
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

router.post(
  '/students/generate-code',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await getUserById(req.user.userId);
    if (!user || user.accountType !== 'student') {
      res.status(403).json({ success: false, error: 'Only students can generate codes' });
      return;
    }

    const { code, codeExpires } = await generateTeacherCodeForStudent(user.id);
    res.json({ success: true, data: { code, expiresAt: codeExpires } });
  })
);

router.get(
  '/students/:id/code-status',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const studentId = req.params.id;
    if (req.user.userId !== studentId) {
      res.status(403).json({ success: false, error: 'You can only check your own code status' });
      return;
    }

    const status = await getTeacherCodeStatus(studentId);
    res.json({ success: true, data: status });
  })
);

router.post(
  '/verify-student-code',
  validateBody(verifyCodeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await getUserById(req.user.userId);
    if (!user || user.accountType !== 'teacher') {
      res.status(403).json({ success: false, error: 'Only teachers can verify codes' });
      return;
    }

    const { studentId, code } = req.body;

    try {
      const result = await verifyAndLinkTeacherCode(studentId, code, user.id);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: { link: result.link } });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  })
);

router.delete(
  '/link/:linkId',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    if (req.user.accountType !== 'teacher') {
      res.status(403).json({ success: false, error: 'Only teachers can remove links' });
      return;
    }

    const result = await revokeTeacherLink(req.params.linkId, req.user.userId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  })
);

router.get(
  '/my-teacher-links',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await getUserById(req.user.userId);
    if (!user || user.accountType !== 'student') {
      res.status(403).json({ success: false, error: 'Only students can view their teacher links' });
      return;
    }

    const links = await getLinksByStudent(user.id);
    res.json({ success: true, data: links });
  })
);

export default router;
