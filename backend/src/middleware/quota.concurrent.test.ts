/**
 * Tests for concurrent quota enforcement — atomic SQL guard.
 *
 * Verifies that when multiple requests arrive simultaneously, the
 * atomic UPDATE ... WHERE json_extract(usage, '$.uploads') < ? guard
 * prevents the counter from exceeding the tier limit.
 *
 * Covers Sprint 1 Fix 1.1 (atomic counter increment).
 */

import { Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';

// ── In-memory SQLite setup ─────────────────────────────
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

// ── Mocks ──────────────────────────────────────────────
jest.mock('../db/sqlite', () => ({
  getDb: () => {
    const db = (global as Record<string, unknown>).__testDb;
    if (!db) throw new Error('testDb not initialised — did beforeEach run?');
    return db as Database.Database;
  },
  closeDb: jest.fn(),
  resetDb: jest.fn(),
}));

jest.mock('./auth', () => ({
  requireAuth: jest.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));

// Set __testDb on global before each test so the mock can find it
beforeEach(() => {
  (global as Record<string, unknown>).__testDb = testDb;
});

afterEach(() => {
  delete (global as Record<string, unknown>).__testDb;
});

import { enforceQuota } from './quota';
import { TIER_LIMITS } from '../config/tiers';

// ── Helpers ────────────────────────────────────────────
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function mockReq(userId: string): Partial<Request> {
  return {
    user: { userId, email: 'test@example.com', accountType: 'student' },
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
    INSERT INTO users (id, email, password_hash, name, account_type, created_at, updated_at, tier, subscription_started_at, role, usage)
    VALUES (?, ?, '', '', 'student', '2026-01-01', '2026-01-01', ?, ?, 'user', ?)
  `).run(userId, `${userId}@test.com`, overrides.tier ?? 'free', overrides.subscription_started_at ?? null, usage);
}

// ── Tests ──────────────────────────────────────────────
describe('enforceQuota — concurrent', () => {
  jest.setTimeout(10000);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow exactly limit calls and reject the rest under concurrency', async () => {
    const limit = TIER_LIMITS.free.uploads;
    insertUser('user-1');

    const middleware = enforceQuota('uploads');
    const totalCalls = limit + 3; // send more than limit

    interface CallResult {
      passed: boolean;
      status?: number;
      body?: Record<string, unknown>;
    }

    const results: CallResult[] = [];

    const calls = Array.from({ length: totalCalls }, async () => {
      const req = mockReq('user-1') as Request;
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res as Response, next);
      await flushPromises();

      if (next.mock.calls.length > 0) {
        results.push({ passed: true });
      } else {
        results.push({
          passed: false,
          status: res.status.mock.calls[0]?.[0] as number | undefined,
          body: res.json.mock.calls[0]?.[0] as Record<string, unknown> | undefined,
        });
      }
    });

    await Promise.all(calls);

    const passed = results.filter((r) => r.passed);
    const rejected = results.filter((r) => !r.passed);

    // Exactly `limit` requests should pass through the quota gate
    expect(passed.length).toBe(limit);
    // The remaining should be rejected with 429
    expect(rejected.length).toBe(totalCalls - limit);

    // Every rejection must be a 429 with QUOTA_EXCEEDED
    for (const r of rejected) {
      expect(r.status).toBe(429);
      expect(r.body).toEqual(
        expect.objectContaining({
          success: false,
          error: 'QUOTA_EXCEEDED',
          resource: 'uploads',
        }),
      );
    }
  });

  it('should not exceed limit even with burst of 10 concurrent requests', async () => {
    const limit = TIER_LIMITS.free.uploads;
    insertUser('user-2');

    const middleware = enforceQuota('uploads');

    interface CallResult {
      passed: boolean;
      status?: number;
    }

    const results: CallResult[] = [];

    const calls = Array.from({ length: 10 }, async () => {
      const req = mockReq('user-2') as Request;
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res as Response, next);
      await flushPromises();

      if (next.mock.calls.length > 0) {
        results.push({ passed: true });
      } else {
        results.push({
          passed: false,
          status: res.status.mock.calls[0]?.[0] as number | undefined,
        });
      }
    });

    await Promise.all(calls);

    const passed = results.filter((r) => r.passed);
    const rejected = results.filter((r) => !r.passed);

    expect(passed.length).toBe(limit);
    expect(rejected.length).toBe(10 - limit);
    for (const r of rejected) {
      expect(r.status).toBe(429);
    }
  });

  it('should handle concurrent requests across different resources independently', async () => {
    insertUser('user-3');

    const uploadMiddleware = enforceQuota('uploads');
    const quizMiddleware = enforceQuota('quizGenerated');

    const uploadResults: boolean[] = [];
    const quizResults: boolean[] = [];

    // Fire 3 upload requests + 4 quiz requests concurrently
    const tasks: Promise<void>[] = [];

    for (let i = 0; i < 3; i++) {
      tasks.push(
        (async () => {
          const req = mockReq('user-3') as Request;
          const res = mockRes();
          const next = jest.fn();
          uploadMiddleware(req, res as Response, next);
          await flushPromises();
          uploadResults.push(next.mock.calls.length > 0);
        })(),
      );
    }

    for (let i = 0; i < 4; i++) {
      tasks.push(
        (async () => {
          const req = mockReq('user-3') as Request;
          const res = mockRes();
          const next = jest.fn();
          quizMiddleware(req, res as Response, next);
          await flushPromises();
          quizResults.push(next.mock.calls.length > 0);
        })(),
      );
    }

    await Promise.all(tasks);

    // Upload limit is 2, so 2 pass, 1 fails
    const uploadPassed = uploadResults.filter(Boolean).length;
    expect(uploadPassed).toBe(TIER_LIMITS.free.uploads);

    // Quiz limit is 3, so 3 pass, 1 fails
    const quizPassed = quizResults.filter(Boolean).length;
    expect(quizPassed).toBe(TIER_LIMITS.free.quizGenerated);
  });
});
