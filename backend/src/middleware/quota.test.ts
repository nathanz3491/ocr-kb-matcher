import { Request, Response, NextFunction } from 'express';
import { Tier } from '../../../shared/types';

const mockGetUserById = jest.fn();
const mockSaveUser = jest.fn();

jest.mock('../services/userService', () => ({
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
  saveUser: (...args: unknown[]) => mockSaveUser(...args),
}));

jest.mock('./auth', () => ({
  requireAuth: jest.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));

import { enforceQuota } from './quota';
import { TIER_LIMITS } from '../config/tiers';

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function mockReq(userId: string): Partial<Request> {
  return {
    user: { userId, email: 'test@example.com', accountType: 'student' },
  } as Partial<Request>;
}

function mockRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeUser(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'user-1',
    email: 'test@example.com',
    tier: 'free' as Tier,
    usage: {
      periodStart: new Date(Date.UTC(2026, 6, 1)).toISOString(),
      uploads: 0,
      quizGenerated: 0,
      chatMessages: 0,
    },
    subscriptionExpiresAt: undefined,
    ...overrides,
  };
}

describe('enforceQuota', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes and increments counter for free tier within limit', async () => {
    const user = makeUser();
    mockGetUserById.mockResolvedValue(user);

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-1') as Request;
    const res = mockRes() as Response;
    const next = jest.fn();

    middleware(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(mockSaveUser).toHaveBeenCalledTimes(1);
    expect(mockSaveUser.mock.calls[0][0].usage.uploads).toBe(1);
  });

  it('returns 429 when free tier exceeds upload limit', async () => {
    const limit = TIER_LIMITS.free.uploads;
    const user = makeUser({
      usage: {
        periodStart: new Date(Date.UTC(2026, 6, 1)).toISOString(),
        uploads: limit,
        quizGenerated: 0,
        chatMessages: 0,
      },
    });
    mockGetUserById.mockResolvedValue(user);

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-1') as Request;
    const res = mockRes() as Response;
    const next = jest.fn();

    middleware(req, res, next);
    await flushPromises();

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'QUOTA_EXCEEDED',
        resource: 'uploads',
        quota: expect.objectContaining({ used: limit, limit, tier: 'free' }),
      }),
    );
    expect(mockSaveUser).not.toHaveBeenCalled();
  });

  it('lazy-downgrades to free when subscription has expired', async () => {
    const expiredDate = new Date(Date.UTC(2020, 0, 1)).toISOString();
    const user = makeUser({
      tier: 'monthly',
      subscriptionExpiresAt: expiredDate,
      usage: {
        periodStart: new Date(Date.UTC(2026, 6, 1)).toISOString(),
        uploads: 10,
        quizGenerated: 5,
        chatMessages: 50,
      },
    });
    mockGetUserById.mockResolvedValue(user);

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-1') as Request;
    const res = mockRes() as Response;
    const next = jest.fn();

    middleware(req, res, next);
    await flushPromises();

    // Two saves: downgrade then increment. Usage is a shared mutable
    // object so both call snapshots show final state (uploads=1).
    expect(mockSaveUser.mock.calls.length).toBeGreaterThanOrEqual(2);
    const downgradedUser = mockSaveUser.mock.calls[0][0];
    expect(downgradedUser.tier).toBe('free');
    expect(downgradedUser.subscriptionExpiresAt).toBeUndefined();
    // Final state after increment (shared Usage object):
    expect(downgradedUser.usage.uploads).toBe(1);
    expect(next).toHaveBeenCalled();
  });

  it('resets counters on period rollover', async () => {
    const oldPeriod = new Date(Date.UTC(2026, 5, 1)).toISOString();
    const user = makeUser({
      usage: {
        periodStart: oldPeriod,
        uploads: 2,
        quizGenerated: 3,
        chatMessages: 20,
      },
    });
    mockGetUserById.mockResolvedValue(user);

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-1') as Request;
    const res = mockRes() as Response;
    const next = jest.fn();

    middleware(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(mockSaveUser).toHaveBeenCalled();
  });

  it('returns 500 when user is not found', async () => {
    mockGetUserById.mockResolvedValue(null);

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-1') as Request;
    const res = mockRes() as Response;
    const next = jest.fn();

    middleware(req, res, next);
    await flushPromises();

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it('creates fresh usage when usage is undefined', async () => {
    const user = makeUser();
    delete user.usage;
    mockGetUserById.mockResolvedValue(user);

    const middleware = enforceQuota('quizGenerated');
    const req = mockReq('user-1') as Request;
    const res = mockRes() as Response;
    const next = jest.fn();

    middleware(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalled();
    expect(mockSaveUser).toHaveBeenCalled();
    expect(mockSaveUser.mock.calls[0][0].usage).toBeDefined();
    expect(mockSaveUser.mock.calls[0][0].usage.quizGenerated).toBe(1);
  });

  it('allows paid tier users within their higher limits', async () => {
    const user = makeUser({
      tier: 'monthly' as Tier,
      usage: {
        periodStart: new Date(Date.UTC(2026, 6, 1)).toISOString(),
        uploads: 5,
        quizGenerated: 0,
        chatMessages: 0,
      },
    });
    mockGetUserById.mockResolvedValue(user);

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-1') as Request;
    const res = mockRes() as Response;
    const next = jest.fn();

    middleware(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('attaches quotaInfo to request on success', async () => {
    const user = makeUser();
    mockGetUserById.mockResolvedValue(user);

    const middleware = enforceQuota('chatMessages');
    const req = mockReq('user-1') as Request;
    const res = mockRes() as Response;
    const next = jest.fn();

    middleware(req, res, next);
    await flushPromises();

    expect(req.quotaInfo).toBeDefined();
    expect(req.quotaInfo!.tier).toBe('free');
    expect(req.quotaInfo!.resource).toBe('chatMessages');
    expect(req.quotaInfo!.used).toBe(1);
    expect(req.quotaInfo!.limit).toBe(TIER_LIMITS.free.chatMessages);
  });
});
