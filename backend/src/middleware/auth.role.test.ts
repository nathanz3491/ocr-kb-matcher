/**
 * Tests for JWT role claim flowing through to req.user and requireAdmin.
 *
 * Covers Sprint 1 commit c02c31e: JWT payload.role is passed through
 * authenticate → req.user.role, and requireAdmin checks it.
 */

import { Request, Response, NextFunction } from 'express';

const mockVerifyAccessToken = jest.fn();
const mockIsAccessTokenRevoked = jest.fn().mockReturnValue(false);

jest.mock('../services/jwtService', () => ({
  verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
}));

jest.mock('../services/tokenRevocation', () => ({
  isAccessTokenRevoked: (...args: unknown[]) => mockIsAccessTokenRevoked(...args),
}));

import { authenticate, requireAdmin } from './auth';

function mockReq(
  headers: Record<string, string> = {},
  user?: Record<string, unknown>,
): Partial<Request> {
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

describe('authenticate — role propagation', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAccessTokenRevoked.mockReturnValue(false);
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should set req.user.role to admin when token payload has role: admin', () => {
    mockVerifyAccessToken.mockReturnValue({
      userId: 'admin-1',
      email: 'admin@test.com',
      accountType: 'student',
      role: 'admin',
    });

    const req = mockReq({ authorization: 'Bearer admin-token' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.role).toBe('admin');
    expect(req.user!.userId).toBe('admin-1');
    expect(req.user!.email).toBe('admin@test.com');
  });

  it('should set req.user.role to user when token payload has role: user', () => {
    mockVerifyAccessToken.mockReturnValue({
      userId: 'user-1',
      email: 'user@test.com',
      accountType: 'student',
      role: 'user',
    });

    const req = mockReq({ authorization: 'Bearer user-token' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.role).toBe('user');
  });

  it('should default req.user.role to user when token payload has no role field', () => {
    mockVerifyAccessToken.mockReturnValue({
      userId: 'no-role-1',
      email: 'norole@test.com',
      accountType: 'student',
    });

    const req = mockReq({ authorization: 'Bearer no-role-token' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.role).toBe('user');
  });

  it('should default req.user.role to user when token payload role is null', () => {
    mockVerifyAccessToken.mockReturnValue({
      userId: 'null-role-1',
      email: 'nullrole@test.com',
      accountType: 'student',
      role: null,
    });

    const req = mockReq({ authorization: 'Bearer null-role-token' }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.role).toBe('user');
  });
});

describe('requireAdmin — role-based access', () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    delete process.env.ADMIN_EMAILS;
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalAdminEmails !== undefined) {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    }
  });

  it('should pass when req.user.role is admin', () => {
    const req = mockReq({}, {
      userId: 'admin-1',
      email: 'admin@test.com',
      accountType: 'student',
      role: 'admin',
    }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should return 403 when req.user.role is user (non-admin)', () => {
    const req = mockReq({}, {
      userId: 'user-1',
      email: 'user@test.com',
      accountType: 'student',
      role: 'user',
    }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'FORBIDDEN' }),
    );
  });

  it('should return 403 when req.user has no role field and is not in ADMIN_EMAILS', () => {
    const req = mockReq({}, {
      userId: 'norole-1',
      email: 'norole@test.com',
      accountType: 'student',
    }) as Request;
    const res = mockRes() as Response;
    const next = jest.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 401 when no user is present', () => {
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
