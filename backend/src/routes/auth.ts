import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  getUserByEmail,
  getUserById,
  getAllUsers,
  createUser,
  updateUser,
  hashPassword,
  verifyPassword,
  toUserWithoutPassword,
} from '../services/userService';
import { copyDefaultGraphToUser } from '../services/knowledgeGraphStorage';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../services/jwtService';
import { sendVerificationEmail } from '../services/emailService';
import { validateEmail } from '../services/emailValidation';
import {
  generateStudentCode,
  getCodeStatus,
  verifyAndLinkCode,
  getStudentLinks,
} from '../services/parentLinkService';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  accountType: z.enum(['student', 'parent']).optional().default('student'),
});

const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email format'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const resendCodeSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post(
  '/resend-code',
  validateBody(resendCodeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal whether the email exists
      res.json({ success: true, message: 'If that email exists, a new code has been sent.' });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ success: false, error: 'Email already verified. Please sign in.' });
      return;
    }

    const verificationCode = generateVerificationCode();
    const verificationExpires = Date.now() + 15 * 60 * 1000;

    await updateUser(user.id, {
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
    });

    await sendVerificationEmail(email, verificationCode, user.name);

    res.json({ success: true, message: 'Verification code resent.' });
  })
);

router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name, accountType } = req.body;

    const validation = await validateEmail(email);
    if (!validation.valid) {
      let errorMsg = 'Invalid email address';
      if (validation.reason === 'disposable') {
        errorMsg = 'Disposable email addresses are not allowed. Please use a real email provider.';
      } else if (validation.reason === 'no_mx_records') {
        errorMsg = 'This email domain cannot receive mail. Please check your email address.';
      } else if (validation.reason === 'mx_lookup_failed') {
        errorMsg = 'Could not verify this email address. Please try again.';
      }
      res.status(400).json({ success: false, error: errorMsg });
      return;
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ success: false, error: 'Email already registered' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const verificationCode = generateVerificationCode();
    const verificationExpires = Date.now() + 15 * 60 * 1000;

    const user = await createUser({
      email,
      passwordHash,
      name,
      emailVerified: true, // Auto-verify for demo (no email server)
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
      accountType: accountType || 'student',
      settings: {
        darkMode: false,
        emailNotifications: true,
        dailyReminder: false,
      },
    });

    // Copy default knowledge graph to new user's personal graph
    try {
      await copyDefaultGraphToUser(user.id);
    } catch (err) {
      console.error('[Auth] Failed to initialize user graph:', err);
      // Non-fatal — user can still use the app
    }

    // Send verification email — non-blocking, failures don't break registration
    sendVerificationEmail(email, verificationCode, name).catch((err) => {
      console.error('Failed to send verification email:', err.message);
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: toUserWithoutPassword(user),
      },
    });
  })
);

router.post(
  '/verify-email',
  validateBody(verifyEmailSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, code } = req.body;

    const user = await getUserByEmail(email);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ success: false, error: 'Email already verified' });
      return;
    }

    if (user.emailVerificationCode !== code) {
      res.status(400).json({ success: false, error: 'Invalid verification code' });
      return;
    }

    if (!user.emailVerificationExpires || Date.now() > user.emailVerificationExpires) {
      res.status(400).json({ success: false, error: 'Verification code expired' });
      return;
    }

    await updateUser(user.id, {
      emailVerified: true,
      emailVerificationCode: undefined,
      emailVerificationExpires: undefined,
    });

    res.json({ success: true });
  })
);

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await getUserByEmail(email);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({ success: false, error: 'Please verify your email first' });
      return;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const userWithoutPassword = toUserWithoutPassword(user);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: userWithoutPassword,
      },
    });
  })
);

router.post(
  '/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    const payload = verifyRefreshToken(refreshToken);
    const user = await getUserById(payload.userId);

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({ success: false, error: 'Please verify your email first' });
      return;
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  })
);

router.post(
  '/logout',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await getUserByEmail(req.user.email);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const userWithoutPassword = toUserWithoutPassword(user);
    res.json({ success: true, data: { user: userWithoutPassword } });
  })
);

router.get(
  '/students',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await getUserById(req.user.userId);
    if (!user || user.accountType !== 'parent') {
      res.status(403).json({ success: false, error: 'Only parents can access this endpoint' });
      return;
    }

    const allUsers = await getAllUsers();
    const students = allUsers
      .filter(u => u.accountType === 'student')
      .map(u => {
        const { passwordHash, ...rest } = u;
        return rest;
      });

    res.json({ success: true, data: students });
  })
);

router.post(
  '/students/generate-code',
  authenticate,
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

    const { code, codeExpires } = await generateStudentCode(user.id);
    res.json({ success: true, data: { code, expiresAt: codeExpires } });
  })
);

router.get(
  '/students/:id/code-status',
  authenticate,
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

    const status = await getCodeStatus(studentId);
    res.json({ success: true, data: status });
  })
);

router.post(
  '/verify-parent-code',
  authenticate,
  validateBody(z.object({
    studentId: z.string(),
    code: z.string().length(6),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await getUserById(req.user.userId);
    if (!user || user.accountType !== 'parent') {
      res.status(403).json({ success: false, error: 'Only parents can verify codes' });
      return;
    }

    const { studentId, code } = req.body;

    try {
      const link = await verifyAndLinkCode(studentId, code, user.id);
      res.json({ success: true, data: { link } });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  })
);

router.get(
  '/my-parent-links',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await getUserById(req.user.userId);
    if (!user || user.accountType !== 'student') {
      res.status(403).json({ success: false, error: 'Only students can view their parent links' });
      return;
    }

    const links = await getStudentLinks(user.id);
    res.json({ success: true, data: links });
  })
);

export default router;