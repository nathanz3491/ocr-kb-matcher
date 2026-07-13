/**
 * Tests for admin routes.
 *
 * Covers: tier PATCH validation, role updates, user listing, stats aggregation.
 * Uses supertest against a standalone Express app with mocked dependencies.
 */

import express from 'express';
import request from 'supertest';

// ── Mocks (must be before route import) ────────────────
jest.mock('../middleware/auth', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    // Simulate an admin user
    req.user = { userId: 'admin-1', email: 'admin@test.com', accountType: 'student', role: 'admin' };
    next();
  },
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const mockGetAllUsers = jest.fn();
const mockGetUserById = jest.fn();
const mockSaveUser = jest.fn();
const mockSetUserTier = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('../services/userService', () => ({
  getAllUsers: (...args: unknown[]) => mockGetAllUsers(...args),
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
  saveUser: (...args: unknown[]) => mockSaveUser(...args),
  setUserTier: (...args: unknown[]) => mockSetUserTier(...args),
  updateUser: (...args: unknown[]) => mockUpdateUser(...args),
}));

// Suppress logger output in tests
jest.mock('../lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Import after mocks
import adminRoutes from '../routes/admin';

// ── App setup ──────────────────────────────────────────
function createTestApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  return app;
}

// ── Helpers ────────────────────────────────────────────
function makeUser(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    email: `${id}@test.com`,
    name: 'Test User',
    tier: 'free',
    role: 'user',
    subscriptionStartedAt: null,
    subscriptionExpiresAt: null,
    usage: {
      periodStart: new Date(Date.UTC(2026, 6, 1)).toISOString(),
      uploads: 0,
      quizGenerated: 0,
      chatMessages: 0,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────
describe('Admin Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  // ── 1. GET /api/admin/users ──────────────────────────
  it('GET /api/admin/users should return sanitized user list', async () => {
    const users = [makeUser('u1'), makeUser('u2', { tier: 'monthly' })];
    mockGetAllUsers.mockResolvedValue(users);

    const res = await request(app).get('/api/admin/users');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    // Sanitized: no passwordHash
    expect(res.body.data[0].passwordHash).toBeUndefined();
    expect(res.body.data[0].email).toBe('u1@test.com');
  });

  // ── 2. GET /api/admin/users/:userId ──────────────────
  it('GET /api/admin/users/:userId should return single user', async () => {
    mockGetUserById.mockResolvedValue(makeUser('u-target'));

    const res = await request(app).get('/api/admin/users/u-target');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('u-target');
    expect(mockGetUserById).toHaveBeenCalledWith('u-target');
  });

  // ── 3. GET /api/admin/users/:userId not found → 404 ──
  it('GET /api/admin/users/:userId should return 404 for unknown user', async () => {
    mockGetUserById.mockResolvedValue(null);

    const res = await request(app).get('/api/admin/users/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBeUndefined(); // errorHandler uses { status, message }
  });

  // ── 4. PATCH tier with valid tier → 200 ──────────────
  it('PATCH /api/admin/users/:userId/tier should set paid tier', async () => {
    mockGetUserById
      .mockResolvedValueOnce(makeUser('u1')) // first call: existence check
      .mockResolvedValueOnce(makeUser('u1', { tier: 'monthly' })); // second: after update

    const res = await request(app)
      .patch('/api/admin/users/u1/tier')
      .send({ tier: 'monthly', durationDays: 30 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockSetUserTier).toHaveBeenCalledWith('u1', 'monthly', 30);
    expect(res.body.data.tier).toBe('monthly');
  });

  // ── 5. PATCH tier with invalid tier → 400 ────────────
  it('PATCH /api/admin/users/:userId/tier should reject invalid tier', async () => {
    const res = await request(app)
      .patch('/api/admin/users/u1/tier')
      .send({ tier: 'enterprise' });

    expect(res.status).toBe(400);
  });

  // ── 6. PATCH tier downgrade to free → 200 ────────────
  it('PATCH /api/admin/users/:userId/tier should downgrade to free', async () => {
    mockGetUserById
      .mockResolvedValueOnce(makeUser('u1', { tier: 'monthly' }))
      .mockResolvedValueOnce(makeUser('u1', { tier: 'free' }));

    const res = await request(app)
      .patch('/api/admin/users/u1/tier')
      .send({ tier: 'free' });

    expect(res.status).toBe(200);
    expect(mockSetUserTier).toHaveBeenCalledWith('u1', 'free');
    expect(mockUpdateUser).toHaveBeenCalledWith('u1', expect.objectContaining({
      subscriptionExpiresAt: undefined,
      subscriptionStartedAt: undefined,
    }));
  });

  // ── 7. PATCH tier with default duration ──────────────
  it('PATCH monthly tier without durationDays defaults to 30 days', async () => {
    mockGetUserById
      .mockResolvedValueOnce(makeUser('u1'))
      .mockResolvedValueOnce(makeUser('u1', { tier: 'monthly' }));

    const res = await request(app)
      .patch('/api/admin/users/u1/tier')
      .send({ tier: 'monthly' });

    expect(res.status).toBe(200);
    expect(mockSetUserTier).toHaveBeenCalledWith('u1', 'monthly', 30);
  });

  // ── 8. PATCH yearly tier defaults to 365 days ────────
  it('PATCH yearly tier without durationDays defaults to 365 days', async () => {
    mockGetUserById
      .mockResolvedValueOnce(makeUser('u1'))
      .mockResolvedValueOnce(makeUser('u1', { tier: 'yearly' }));

    const res = await request(app)
      .patch('/api/admin/users/u1/tier')
      .send({ tier: 'yearly' });

    expect(res.status).toBe(200);
    expect(mockSetUserTier).toHaveBeenCalledWith('u1', 'yearly', 365);
  });

  // ── 9. PATCH role with valid role → 200 ──────────────
  it('PATCH /api/admin/users/:userId/role should update role', async () => {
    mockGetUserById.mockResolvedValue(makeUser('u1'));

    const res = await request(app)
      .patch('/api/admin/users/u1/role')
      .send({ role: 'admin' });

    // saveUser is called with updated role
    expect(res.status).toBe(200);
    expect(mockSaveUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' }),
    );
  });

  // ── 10. PATCH role with invalid role → 400 ────────────
  it('PATCH /api/admin/users/:userId/role should reject invalid role', async () => {
    const res = await request(app)
      .patch('/api/admin/users/u1/role')
      .send({ role: 'superadmin' });

    expect(res.status).toBe(400);
  });

  // ── 11. GET /api/admin/stats → aggregate ──────────────
  it('GET /api/admin/stats should return aggregate statistics', async () => {
    const users = [
      makeUser('u1', { tier: 'free', usage: { periodStart: '', uploads: 3, quizGenerated: 0, chatMessages: 0 } }),
      makeUser('u2', { tier: 'monthly', usage: { periodStart: '', uploads: 1, quizGenerated: 0, chatMessages: 0 } }),
      makeUser('u3', { tier: 'yearly', usage: { periodStart: '', uploads: 2, quizGenerated: 0, chatMessages: 0 } }),
    ];
    mockGetAllUsers.mockResolvedValue(users);

    const res = await request(app).get('/api/admin/stats');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      totalUsers: 3,
      freeCount: 1,
      paidCount: 2,
      estimatedMRR: 217, // 1 * 19 + 1 * 198 = 217
      totalUploadsThisMonth: 6,
    });
  });
});
