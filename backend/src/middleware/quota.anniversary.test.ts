/**
 * Tests for anniversary-based period rollover.
 *
 * Covers Sprint 1 Fix 1.2: free users roll over on the 1st of the month,
 * paid users roll over on their subscription anniversary.
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

function getUsage(userId: string): { periodStart: string; uploads: number; quizGenerated: number; chatMessages: number } {
  const row = testDb.prepare('SELECT usage FROM users WHERE id = ?').get(userId) as {
    usage: string;
  };
  return JSON.parse(row.usage);
}

describe('enforceQuota — anniversary rollover', () => {
  jest.setTimeout(10000);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should roll over free user to 1st of current month when period is stale', async () => {
    const oldPeriod = new Date(Date.UTC(2026, 5, 1)).toISOString();
    insertUser('user-1', {
      usage: {
        periodStart: oldPeriod,
        uploads: 2,
        quizGenerated: 3,
        chatMessages: 10,
      },
    });

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-1') as Request;
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res as Response, next);
    await flushPromises();

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();

    const usage = getUsage('user-1');
    const newPeriod = new Date(usage.periodStart);
    expect(newPeriod.getUTCDate()).toBe(1);
    expect(newPeriod.getTime()).toBeGreaterThan(new Date(oldPeriod).getTime());
    expect(usage.uploads).toBe(1);
  });

  it('should roll over monthly user to next subscription anniversary', async () => {
    const subscriptionStartedAt = '2026-03-15T00:00:00.000Z';
    insertUser('user-2', {
      tier: 'monthly',
      subscription_started_at: subscriptionStartedAt,
      usage: {
        periodStart: '2026-05-15T00:00:00.000Z',
        uploads: 10,
        quizGenerated: 20,
        chatMessages: 50,
      },
    });

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-2') as Request;
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res as Response, next);
    await flushPromises();

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();

    const usage = getUsage('user-2');
    const newPeriod = new Date(usage.periodStart);
    expect(newPeriod.getUTCDate()).toBe(15);
    expect(newPeriod.getTime()).toBeGreaterThan(Date.parse('2026-05-15'));
    expect(usage.uploads).toBe(1);
  });

  it('should fall back to month-start when paid user has no subscription_started_at', async () => {
    insertUser('user-3', {
      tier: 'monthly',
      subscription_started_at: null,
      usage: {
        periodStart: '2026-05-01T00:00:00.000Z',
        uploads: 5,
        quizGenerated: 5,
        chatMessages: 5,
      },
    });

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-3') as Request;
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res as Response, next);
    await flushPromises();

    expect(next).toHaveBeenCalled();

    const usage = getUsage('user-3');
    const newPeriod = new Date(usage.periodStart);
    expect(newPeriod.getUTCDate()).toBe(1);
    expect(newPeriod.getTime()).toBeGreaterThan(Date.parse('2026-05-01'));
    expect(usage.uploads).toBe(1);
  });

  it('should not roll over when still in current period', async () => {
    const currentMonthStart = new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      1,
    )).toISOString();

    insertUser('user-4', {
      usage: {
        periodStart: currentMonthStart,
        uploads: 1,
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

    expect(next).toHaveBeenCalled();

    const usage = getUsage('user-4');
    expect(usage.periodStart).toBe(currentMonthStart);
    expect(usage.uploads).toBe(2);
  });

  it('should roll over yearly user to next year anniversary', async () => {
    const subscriptionStartedAt = '2025-12-01T00:00:00.000Z';
    insertUser('user-5', {
      tier: 'yearly',
      subscription_started_at: subscriptionStartedAt,
      usage: {
        periodStart: '2024-12-01T00:00:00.000Z',
        uploads: 14,
        quizGenerated: 30,
        chatMessages: 99,
      },
    });

    const middleware = enforceQuota('uploads');
    const req = mockReq('user-5') as Request;
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res as Response, next);
    await flushPromises();

    expect(next).toHaveBeenCalled();

    const usage = getUsage('user-5');
    const newPeriod = new Date(usage.periodStart);
    expect(newPeriod.getUTCDate()).toBe(1);
    expect(newPeriod.getUTCMonth()).toBe(11);
    expect(newPeriod.getUTCFullYear()).toBe(2025);
    expect(usage.uploads).toBe(1);
  });
});
