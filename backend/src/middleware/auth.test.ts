/**
 * Tests for authentication middleware.
 *
 * Covers: JWT validation, requireAdmin role check, missing token, optional auth.
 */

import { Request, Response, NextFunction } from 'express';

// ── Mocks ──────────────────────────────────────────────
const mockVerifyAccessToken = jest.fn();
const mockIsAccessTokenRevoked = jest.fn().mockReturnValue(false);

jest.mock('../services/jwtService', () => ({
  verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
}));

jest.mock('../services/tokenRevocation', () => ({
  isAccessTokenRevoked: (...args: unknown[]) => mockIsAccessTokenRevoked(...args),
}));

// Import after mocks
import { authenticate, requireAuth, requireAdmin, optionalAuth } from './auth';

// ── Helpers ────────────────────────────────────────────
function mockReq(headers: Record<string, string> = {}, user?: Record<string, unknown>): Partial<Request> {
  return {
    headers,
    user: user as Request['user'],
  } as Partial<Request>;
}

function mockRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ── Tests ──────────────────────────────────────────────
describe('authenticate', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAccessTokenRevoked.mockReturnValue(false);
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  // ── 1. Valid token → sets req.user ────────────────────
  it('should set req.user on valid Bearer token', () => {
    process.env.NODE_ENV = 'production';
    const payload = { userId: 'u1', email: 'a@b.com', accountType: 'student' as const };
    mockVerifyAccessToken.mockReturnValue(payload);

    const req = mockReq({ authorization: 'Bearer valid-token' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      userId: 'u1',
      email: 'a@b.com',
      accountType: 'student',
    });
  });

  // ── 2. Missing auth header in production → 401 ────────
  it('should return 401 when no auth header in production', () => {
    process.env.NODE_ENV = 'production';

    const req = mockReq() as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── 3. Invalid token in production → 401 ──────────────
  it('should return 401 for invalid token in production', () => {
    process.env.NODE_ENV = 'production';
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const req = mockReq({ authorization: 'Bearer bad-token' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── 4. Dev mode passes without token ──────────────────
  it('should pass through in dev mode without auth header', () => {
    process.env.NODE_ENV = 'development';

    const req = mockReq() as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  // ── 5. Invalid header format → 401 ────────────────────
  it('should return 401 for non-Bearer authorization format', () => {
    process.env.NODE_ENV = 'production';

    const req = mockReq({ authorization: 'Basic abc123' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireAuth', () => {
  // ── 6. Authenticated user → passes ────────────────────
  it('should call next when user is authenticated', () => {
    const req = mockReq({}, { userId: 'u1', email: 'a@b.com', accountType: 'student' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // ── 7. No user → 401 ──────────────────────────────────
  it('should return 401 when user is missing', () => {
    const req = mockReq() as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'AUTH_REQUIRED' }),
    );
  });

  // ── 8. User without userId → 401 ──────────────────────
  it('should return 401 when user has no userId', () => {
    const req = mockReq({}, { email: 'a@b.com' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireAdmin', () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  afterEach(() => {
    if (originalAdminEmails !== undefined) {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    } else {
      delete process.env.ADMIN_EMAILS;
    }
  });

  // ── 9. Admin role → passes ────────────────────────────
  it('should call next when user has admin role', () => {
    const req = mockReq({}, { userId: 'u1', email: 'admin@test.com', accountType: 'student', role: 'admin' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // ── 10. Non-admin user → 403 ───────────────────────────
  it('should return 403 when user is not admin (no role field)', () => {
    const req = mockReq({}, { userId: 'u1', email: 'user@test.com', accountType: 'student' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // ── 11. Admin via ADMIN_EMAILS env var → passes ────────
  it('should allow admin via ADMIN_EMAILS environment variable', () => {
    process.env.ADMIN_EMAILS = 'boss@company.com';
    const req = mockReq({}, { userId: 'u1', email: 'boss@company.com', accountType: 'student' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // ── 12. No user → 401 (not 403) ───────────────────────
  it('should return 401 when no user at all', () => {
    const req = mockReq() as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'AUTH_REQUIRED' }),
    );
  });
});

describe('optionalAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAccessTokenRevoked.mockReturnValue(false);
  });

  // ── 13. Valid token → sets req.user ───────────────────
  it('should set req.user with valid token', () => {
    const payload = { userId: 'u1', email: 'a@b.com', accountType: 'student' as const };
    mockVerifyAccessToken.mockReturnValue(payload);

    const req = mockReq({ authorization: 'Bearer valid' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      userId: 'u1',
      email: 'a@b.com',
      accountType: 'student',
    });
  });

  // ── 14. No auth header → passes without user ──────────
  it('should pass through without setting user when no auth header', () => {
    const req = mockReq() as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  // ── 15. Invalid token → passes without user ───────────
  it('should pass through silently with invalid token', () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error('bad');
    });

    const req = mockReq({ authorization: 'Bearer bad' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
  });
});
