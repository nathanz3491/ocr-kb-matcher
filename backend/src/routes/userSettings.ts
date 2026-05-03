import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  getUserById,
  updateUser,
  hashPassword,
  verifyPassword,
  toUserWithoutPassword,
} from '../services/userService';
import { sendVerificationEmail } from '../services/emailService';
import { UserSettings } from '../types/auth';

const router = Router();

const updateSettingsSchema = z.object({
  settings: z.object({
    darkMode: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    dailyReminder: z.boolean().optional(),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)').optional(),
  }),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

router.get(
  '/settings',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: { settings: user.settings } });
  })
);

router.put(
  '/settings',
  authenticate,
  validateBody(updateSettingsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { settings } = req.body;
    const user = await getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const updatedSettings: UserSettings = {
      ...user.settings,
      ...settings,
    };

    await updateUser(req.user.userId, { settings: updatedSettings });

    res.json({ success: true, data: { settings: updatedSettings } });
  })
);

router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const userWithoutPassword = toUserWithoutPassword(user);
    res.json({ success: true, data: { user: userWithoutPassword } });
  })
);

router.put(
  '/profile',
  authenticate,
  validateBody(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, email } = req.body;
    const user = await getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const updates: { name?: string; email?: string; emailVerified?: boolean; emailVerificationCode?: string; emailVerificationExpires?: number } = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (email !== undefined && email !== user.email) {
      updates.email = email;
      updates.emailVerified = false;
      updates.emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      updates.emailVerificationExpires = Date.now() + 15 * 60 * 1000;

      await sendVerificationEmail(email, updates.emailVerificationCode, name || user.name);
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: 'No updates provided' });
      return;
    }

    const updatedUser = await updateUser(req.user.userId, updates);
    if (!updatedUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const userWithoutPassword = toUserWithoutPassword(updatedUser);
    res.json({ success: true, data: { user: userWithoutPassword } });
  })
);

router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    const user = await getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      res.status(400).json({ success: false, error: 'Current password is incorrect' });
      return;
    }

    const newPasswordHash = await hashPassword(newPassword);
    await updateUser(req.user.userId, { passwordHash: newPasswordHash });

    res.json({ success: true });
  })
);

export default router;