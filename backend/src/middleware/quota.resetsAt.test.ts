/**
 * Tests for resetsAt field in 429 quota-exceeded responses.
 *
 * Covers Sprint 1 Fix 1.4: the 429 response body must include a resetsAt
 * ISO date so the frontend can display a countdown. Free users reset on
 * the 1st of next month; paid users reset on their next subscription
 * anniversary.
 */

import { Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';

let testDb: Database.Database;

beforeEach(() => {
  testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  testDb.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      account_type TEXT NOT NULL DEFAULT 'student',
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      settings TEXT NOT NULL DEFAULT '{}',
      tier TEXT,
      subscription_started_at TEXT,
      subscription_expires_at TEXT,
      role TEXT DEFAULT 'user',
      usage TEXT
    );
  `);
});

afterEach(() => {
  testDb.close();
});

jest.mock('../db/sqlite', () => ({
  getDb: () => {
    const db = (global as Record<string, unknown>).__testDb;
    if (!db) throw new Error('testDb not initialised');
    return db as Database.Database;
  },
  closeDb: jest.fn(),
  resetDb: jest.fn(),
}));

jest.mock('./auth', () => ({
  requireAuth: jest.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));

beforeEach(() => {
  (global as Record<string, unknown>).__testDb = testDb;
});

afterEach(() => {
  delete (global as Record<string, unknown>).__testDb;
});

import { enforceQuota } from './quota';
import { getCurrentMonthStart } from '../config/tiers';

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function mockReq(userId: string): Partial<Request> {
  return {
    user: { userId, email: `${userId}@test.com`, accountType: 'student' },
  } as Partial<Request>;
}

interface ResMock extends Partial<Response> {
  status: jest.Mock;
  json: jest.Mock;
}

function mockRes(): ResMock {
  const res = {} as ResMock;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function insertUser(userId: string, overrides: Record<string, unknown> = {}): void {
  const usage = JSON.stringify(
    overrides.usage ?? {
      periodStart: new Date(Date.UTC(2026, 6, 1)).toISOString(),
      uploads: 0,
      quizGenerated: 0,
      chatMessages: 0,
    },
  );
  testDb.prepare(`
    INSERT INTO users (id, email, password_hash, name, account_type, created_at, updated_at, tier, subscription_started_at, subscription_expires_at, role, usage)
    VALUES (?, ?, '', '', 'student', '2026-01-01', '2026-01-01', ?, ?, ?, 'user', ?)
  `).run(
    userId,
    `${userId}@test.com`,
    overrides.tier ?? 'free',
    overrides.subscription_started_at ?? null,
    overrides.subscription_expires_at ?? null,
    usage,
  );
}

describe('enforceQuota — resetsAt in 429 response', () => {
  jest.setTimeout(10000);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 1st of next month for free user who hits quota', async () => {
    const currentMonthStart = getCurrentMonthStart();

    insertUser('user-1', {
      usage: {
        periodStart: currentMonthStart,
        uploads: 2,
        quizGenerated: 0,
        chatMessages: 0,
      },
    });

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-1') as Request;
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res as Response, next);
    await flushPromises();

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);

    const body = res.json.mock.calls[0][0] as Record<string, unknown>;
    const quota = body.quota as Record<string, unknown>;

    const resetsAt = new Date(quota.resetsAt as string);
    expect(resetsAt.getTime()).toBeGreaterThan(Date.now());
    expect(resetsAt.getUTCDate()).toBe(1);
  });

  it('should return next monthly anniversary for paid user who hits quota', async () => {
    insertUser('user-2', {
      tier: 'monthly',
      subscription_started_at: '2026-03-15T00:00:00.000Z',
      usage: {
        periodStart: '2026-06-15T00:00:00.000Z',
        uploads: 15,
        quizGenerated: 0,
        chatMessages: 0,
      },
    });

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-2') as Request;
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res as Response, next);
    await flushPromises();

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);

    const body = res.json.mock.calls[0][0] as Record<string, unknown>;
    const quota = body.quota as Record<string, unknown>;

    const resetsAt = new Date(quota.resetsAt as string);
    expect(resetsAt.getTime()).toBeGreaterThan(Date.now());
    expect(resetsAt.getUTCDate()).toBe(15);
  });

  it('should return next yearly anniversary for yearly user who hits quota', async () => {
    insertUser('user-3', {
      tier: 'yearly',
      subscription_started_at: '2025-12-01T00:00:00.000Z',
      usage: {
        periodStart: '2025-12-01T00:00:00.000Z',
        uploads: 15,
        quizGenerated: 0,
        chatMessages: 0,
      },
    });

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-3') as Request;
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res as Response, next);
    await flushPromises();

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);

    const body = res.json.mock.calls[0][0] as Record<string, unknown>;
    const quota = body.quota as Record<string, unknown>;

    const resetsAt = new Date(quota.resetsAt as string);
    expect(resetsAt.getTime()).toBeGreaterThan(Date.now());
    expect(resetsAt.getUTCDate()).toBe(1);
    expect(resetsAt.getUTCMonth()).toBe(11);
  });

  it('should include tier and limit in the 429 quota object', async () => {
    const currentMonthStart = getCurrentMonthStart();

    insertUser('user-4', {
      usage: {
        periodStart: currentMonthStart,
        uploads: 2,
        quizGenerated: 0,
        chatMessages: 0,
      },
    });

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-4') as Request;
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res as Response, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(429);

    const body = res.json.mock.calls[0][0] as Record<string, unknown>;
    const quota = body.quota as Record<string, unknown>;
    expect(quota.tier).toBe('free');
    expect(quota.used).toBe(2);
    expect(quota.limit).toBe(2);
    expect(typeof quota.resetsAt).toBe('string');
  });
});
