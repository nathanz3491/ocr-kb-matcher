import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { parentAlertService } from '../services/parentAlertService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

router.use(asyncHandler(async (req: Request, _res: Response, next: Function) => {
  if ((req as any).user?.accountType !== 'parent') {
    throw new AppError('Parent access required', 403);
  }
  await Promise.resolve();
  next();
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const parentId = (req as any).user?.id as string;
  const { studentId, unread, resolved } = req.query as Record<string, string>;

  let alerts = await parentAlertService.getAlerts(parentId, studentId as string | undefined);

  if (unread === 'true') {
    alerts = alerts.filter(a => !a.readAt);
  }
  if (resolved === 'false') {
    alerts = alerts.filter(a => !a.resolvedAt);
  }

  const unreadCount = alerts.filter(a => !a.readAt).length;

  res.json({ success: true, data: { alerts, unreadCount } });
}));

router.get('/:alertId', asyncHandler(async (req: Request, res: Response) => {
  const parentId = (req as any).user?.id as string;
  const { alertId } = req.params;

  const alerts = await parentAlertService.getAlerts(parentId);
  const alert = alerts.find(a => a.id === alertId);

  if (!alert) {
    throw new AppError('Alert not found', 404);
  }

  res.json({ success: true, data: { alert } });
}));

router.patch('/:alertId/read', asyncHandler(async (req: Request, res: Response) => {
  const parentId = (req as any).user?.id as string;
  const { alertId } = req.params;

  await parentAlertService.markAlertRead(alertId, parentId);
  res.json({ success: true });
}));

router.patch('/:alertId/dismiss', asyncHandler(async (req: Request, res: Response) => {
  const parentId = (req as any).user?.id as string;
  const { alertId } = req.params;

  await parentAlertService.dismissAlert(alertId, parentId);
  res.json({ success: true });
}));

router.post('/digest', asyncHandler(async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    throw new AppError('Not available in production', 403);
  }

  const parentId = (req as any).user?.id as string;

  let sendDigest: (parentId: string) => Promise<void>;
  try {
    // @ts-ignore - module will exist when digest feature is implemented
    const mod = await import('../services/parentNotificationService');
    sendDigest = mod.sendDailyDigestForParent;
  } catch {
    throw new AppError('Digest service not available', 501);
  }

  await sendDigest(parentId);
  res.json({ success: true, message: 'Digest triggered for parent' });
}));

export default router;
