import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimit';
import { AppError } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validate';
import { authenticate, checkLoginLock, recordFailedAttempt, clearLoginAttempts, DUMMY_PASSWORD_HASH } from '../middleware/auth';
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
  parseAccessToken,
} from '../services/jwtService';
import {
  revokeRefreshToken,
  isRefreshTokenRevoked,
  revokeAccessToken,
} from '../services/tokenRevocation';
import { sendVerificationEmail } from '../services/emailService';
import { validateEmail } from '../services/emailValidation';
import {
  generateStudentCode,
  getCodeStatus,
  verifyAndLinkCode,
  getStudentLinks,
} from '../services/parentLinkService';
import { logAuthEvent } from '../middleware/auditLog';
import { logger } from '../lib/logger';
import {
  computeFingerprint,
  canStartTrial,
  recordTrialStart,
  logAbuseAttempt,
} from '../services/trialGuard';

const router = Router();

function isMinor(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age < 18;
}

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  accountType: z.enum(['student', 'parent']).optional().default('student'),
  dateOfBirth: z.string().optional(),
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
  authLimiter,
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
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name, accountType, dateOfBirth } = req.body;

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

    // Trial abuse prevention
    const fingerprint = computeFingerprint(
      req.headers['user-agent'],
      req.headers['accept-language'],
    );
    if (!canStartTrial(email, fingerprint)) {
      logAbuseAttempt(email, fingerprint, req.ip);
      res.status(403).json({
        success: false,
        error: '您已经使用过免费试用，无法再次体验。如需继续使用，请升级到付费套餐。',
      });
      return;
    }

    const passwordHash = await hashPassword(password);
    const verificationCode = generateVerificationCode();
    const verificationExpires = Date.now() + 15 * 60 * 1000;

    const requiresParentalConsent = dateOfBirth ? isMinor(dateOfBirth) : false;

    if (requiresParentalConsent) {
      logger.info({ email, dateOfBirth }, 'Minor user registered — parental consent flag set');
    }

    const user = await createUser({
      email,
      passwordHash,
      name,
      emailVerified: true, // Auto-verify for demo (no email server)
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
      accountType: accountType || 'student',
      dateOfBirth: dateOfBirth || undefined,
      requiresParentalConsent,
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

    // Record trial start for abuse prevention
    try {
      recordTrialStart(email, fingerprint, req.ip, 'free');
    } catch (err) {
      console.error('[Trial] Failed to record trial start:', err);
      // Non-fatal — user can still use the app
    }

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
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // ── Check account lock ──────────────────────────────────
    const lock = checkLoginLock(email);
    if (lock.locked) {
      logAuthEvent('login_locked', {
        email,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'] as string | undefined,
      });
      res.set('Retry-After', String(lock.retryAfter));
      res.status(429).json({ success: false, error: 'Account temporarily locked due to too many failed attempts' });
      return;
    }

    const user = await getUserByEmail(email);

    // ── Constant-time comparison ────────────────────────────
    // Always run bcrypt.compare (even without a matching user)
    // so that 'no user' and 'wrong password' take indistinguishable time.
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const isValidPassword = await verifyPassword(password, passwordHash);

    if (!user || !isValidPassword) {
      await recordFailedAttempt(email);
      logAuthEvent('login_failed', {
        email,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'] as string | undefined,
      });
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // ── Successful login ────────────────────────────────────
    clearLoginAttempts(email);

    if (!user.emailVerified) {
      res.status(403).json({ success: false, error: 'Please verify your email first' });
      return;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const userWithoutPassword = toUserWithoutPassword(user);

    logAuthEvent('login_success', {
      userId: user.id,
      email,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

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
  authLimiter,
  validateBody(refreshSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    const payload = verifyRefreshToken(refreshToken);

    // Check if refresh token has been revoked (one-time use)
    if (isRefreshTokenRevoked(payload.jti)) {
      res.status(401).json({ success: false, error: 'Refresh token has been revoked' });
      return;
    }

    const user = await getUserById(payload.userId);

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({ success: false, error: 'Please verify your email first' });
      return;
    }

    // Revoke the old refresh token (one-time use rotation)
    const decoded = parseAccessToken(refreshToken);
    const refreshExpiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
    revokeRefreshToken(payload.jti, payload.userId, refreshExpiresAt);

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
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    let userId: string | undefined;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const payload = parseAccessToken(token);

        if (payload?.jti) {
          userId = payload.userId as string | undefined;
          const expiresAt = payload.exp ? payload.exp * 1000 : Date.now() + 15 * 60 * 1000;
          revokeAccessToken(payload.jti, expiresAt);
        }
      }
    }

    logAuthEvent('logout', {
      userId,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

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