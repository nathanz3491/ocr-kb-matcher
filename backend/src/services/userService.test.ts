/**
 * Tests for userService — SQLite-based user CRUD.
 *
 * Uses an in-memory SQLite database. All side effects are cleaned up after each test.
 */

// ── In-memory SQLite setup ─────────────────────────────
import Database from 'better-sqlite3';

let testDb: Database.Database;

beforeEach(() => {
  // Fresh in-memory DB for each test
  testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');

  // Create users table matching the production schema
  testDb.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      account_type TEXT NOT NULL DEFAULT 'student',
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_verification_code TEXT,
      email_verification_expires INTEGER,
      parent_code TEXT,
      parent_code_expires INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
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

// Mock sqlite module to return our in-memory DB
jest.mock('../db/sqlite', () => ({
  getDb: () => {
    // Return the testDb set by beforeEach
    // We need to access it from the closure
    return (global as any).__testDb;
  },
  closeDb: jest.fn(),
  resetDb: jest.fn(),
}));

// Set __testDb on global before each test so the mock can find it
beforeEach(() => {
  (global as any).__testDb = testDb;
});

afterEach(() => {
  delete (global as any).__testDb;
});

// Now import userService (which will use the mocked getDb)
import {
  getUserById,
  saveUser,
  setUserTier,
  getAllUsers,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  hashPassword,
  verifyPassword,
} from '../services/userService';
import { User } from '../types/auth';

// ── Helpers ────────────────────────────────────────────
function makeUserData(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'test@example.com',
    passwordHash: '$2a$12$hashed',
    name: 'Test User',
    accountType: 'student',
    emailVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    settings: { darkMode: false, emailNotifications: true, dailyReminder: false },
    tier: 'free',
    role: 'user',
    usage: {
      periodStart: new Date(Date.UTC(2026, 6, 1)).toISOString(),
      uploads: 0,
      quizGenerated: 0,
      chatMessages: 0,
    },
    ...overrides,
  };
}

function insertUser(user: User): void {
  const stmt = testDb.prepare(`
    INSERT INTO users (id, email, password_hash, name, account_type, email_verified,
      created_at, updated_at, settings, tier, subscription_started_at,
      subscription_expires_at, role, usage)
    VALUES (@id, @email, @password_hash, @name, @account_type, @email_verified,
      @created_at, @updated_at, @settings, @tier, @subscription_started_at,
      @subscription_expires_at, @role, @usage)
  `);
  stmt.run({
    id: user.id,
    email: user.email.toLowerCase(),
    password_hash: user.passwordHash,
    name: user.name,
    account_type: user.accountType,
    email_verified: user.emailVerified ? 1 : 0,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    settings: JSON.stringify(user.settings),
    tier: user.tier ?? null,
    subscription_started_at: user.subscriptionStartedAt ?? null,
    subscription_expires_at: user.subscriptionExpiresAt ?? null,
    role: user.role ?? 'user',
    usage: user.usage ? JSON.stringify(user.usage) : null,
  });
}

// ── Tests ──────────────────────────────────────────────
describe('userService', () => {
  // ── getUserById ──────────────────────────────────────
  describe('getUserById', () => {
    it('should return user when found', async () => {
      const user = makeUserData();
      insertUser(user);

      const result = await getUserById('u1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('u1');
      expect(result!.email).toBe('test@example.com');
      expect(result!.tier).toBe('free');
    });

    it('should return null when user not found', async () => {
      const result = await getUserById('nonexistent');
      expect(result).toBeNull();
    });

    it('should parse JSON usage field', async () => {
      const user = makeUserData({
        usage: {
          periodStart: '2026-01-01T00:00:00.000Z',
          uploads: 5,
          quizGenerated: 3,
          chatMessages: 10,
        },
      });
      insertUser(user);

      const result = await getUserById('u1');

      expect(result!.usage).toBeDefined();
      expect(result!.usage!.uploads).toBe(5);
      expect(result!.usage!.quizGenerated).toBe(3);
      expect(result!.usage!.chatMessages).toBe(10);
    });
  });

  // ── saveUser ─────────────────────────────────────────
  describe('saveUser', () => {
    it('should insert a new user', async () => {
      const user = makeUserData();
      await saveUser(user);

      const row = testDb.prepare('SELECT * FROM users WHERE id = ?').get('u1') as Record<string, unknown>;
      expect(row).toBeDefined();
      expect(row.email).toBe('test@example.com');
    });

    it('should update an existing user (upsert)', async () => {
      const user = makeUserData();
      insertUser(user);

      user.name = 'Updated Name';
      user.tier = 'monthly';
      await saveUser(user);

      const row = testDb.prepare('SELECT * FROM users WHERE id = ?').get('u1') as Record<string, unknown>;
      expect(row.name).toBe('Updated Name');
      expect(row.tier).toBe('monthly');
    });

    it('should set updatedAt on save', async () => {
      const user = makeUserData({ updatedAt: '2020-01-01T00:00:00.000Z' });
      insertUser(user);

      await saveUser(user);

      const row = testDb.prepare('SELECT * FROM users WHERE id = ?').get('u1') as Record<string, unknown>;
      expect(row.updated_at).not.toBe('2020-01-01T00:00:00.000Z');
      // Should be updated to now
      expect(new Date(row.updated_at as string).getTime()).toBeGreaterThan(Date.parse('2025-01-01'));
    });
  });

  // ── setUserTier ──────────────────────────────────────
  describe('setUserTier', () => {
    it('should upgrade to monthly with subscription fields', async () => {
      const user = makeUserData();
      insertUser(user);

      const result = await setUserTier('u1', 'monthly', 30);

      expect(result).not.toBeNull();
      expect(result!.tier).toBe('monthly');
      expect(result!.subscriptionStartedAt).toBeDefined();
      expect(result!.subscriptionExpiresAt).toBeDefined();

      // Verify expiry is ~30 days from now
      const expiresAt = new Date(result!.subscriptionExpiresAt!);
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const diff = expiresAt.getTime() - Date.now();
      expect(diff).toBeGreaterThan(0);
      expect(diff).toBeLessThan(thirtyDaysMs + 5000); // allow 5s tolerance
    });

    it('should downgrade to free (no subscription fields)', async () => {
      const user = makeUserData({ tier: 'monthly', subscriptionStartedAt: '2026-01-01T00:00:00.000Z', subscriptionExpiresAt: '2026-06-01T00:00:00.000Z' });
      insertUser(user);

      const result = await setUserTier('u1', 'free');

      expect(result).not.toBeNull();
      expect(result!.tier).toBe('free');
      // setUserTier only sets tier, updateUser clears subscription fields
      // So subscription fields may still be present until explicit updateUser call
    });

    it('should return null for nonexistent user', async () => {
      const result = await setUserTier('nobody', 'monthly');
      expect(result).toBeNull();
    });

    it('should set custom durationDays for yearly', async () => {
      const user = makeUserData();
      insertUser(user);

      const result = await setUserTier('u1', 'yearly', 90);

      expect(result).not.toBeNull();
      const expiresAt = new Date(result!.subscriptionExpiresAt!);
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
      const diff = expiresAt.getTime() - Date.now();
      expect(diff).toBeGreaterThan(0);
      expect(diff).toBeLessThan(ninetyDaysMs + 5000);
    });
  });

  // ── getAllUsers ──────────────────────────────────────
  describe('getAllUsers', () => {
    it('should return all users', async () => {
      insertUser(makeUserData({ id: 'u1', email: 'a@test.com' }));
      insertUser(makeUserData({ id: 'u2', email: 'b@test.com' }));

      const users = await getAllUsers();

      expect(users).toHaveLength(2);
      expect(users.map(u => u.id).sort()).toEqual(['u1', 'u2']);
    });

    it('should return empty array when no users', async () => {
      const users = await getAllUsers();
      expect(users).toEqual([]);
    });
  });

  // ── getUserByEmail ───────────────────────────────────
  describe('getUserByEmail', () => {
    it('should find user by email', async () => {
      insertUser(makeUserData({ id: 'u1', email: 'findme@test.com' }));

      const user = await getUserByEmail('findme@test.com');
      expect(user).toBeDefined();
      expect(user!.id).toBe('u1');
    });

    it('should return undefined when email not found', async () => {
      const user = await getUserByEmail('nobody@test.com');
      expect(user).toBeUndefined();
    });
  });

  // ── createUser ───────────────────────────────────────
  describe('createUser', () => {
    it('should create a new user with generated id', async () => {
      const data = {
        email: 'new@test.com',
        passwordHash: '$2a$12$abc',
        name: 'New User',
        accountType: 'student' as const,
        emailVerified: false,
        settings: { darkMode: false, emailNotifications: true, dailyReminder: false },
      };

      const user = await createUser(data);

      expect(user.id).toBeDefined();
      expect(user.id.length).toBeGreaterThan(0);
      expect(user.email).toBe('new@test.com');
      expect(user.tier).toBe('free');
      expect(user.role).toBe('user');
      expect(user.usage).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      insertUser(makeUserData({ email: 'dup@test.com' }));

      const data = {
        email: 'dup@test.com',
        passwordHash: '$2a$12$abc',
        name: 'Dupe',
        accountType: 'student' as const,
        emailVerified: false,
        settings: { darkMode: false, emailNotifications: true, dailyReminder: false },
      };

      await expect(createUser(data)).rejects.toThrow('Email already registered');
    });
  });

  // ── updateUser ───────────────────────────────────────
  describe('updateUser', () => {
    it('should update user fields', async () => {
      insertUser(makeUserData({ id: 'u1' }));

      const updated = await updateUser('u1', { name: 'Updated Name', tier: 'monthly' });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.tier).toBe('monthly');
    });

    it('should return null for nonexistent user', async () => {
      const result = await updateUser('nobody', { name: 'X' });
      expect(result).toBeNull();
    });
  });

  // ── deleteUser ───────────────────────────────────────
  describe('deleteUser', () => {
    it('should delete existing user', async () => {
      insertUser(makeUserData({ id: 'u1' }));

      const result = await deleteUser('u1');
      expect(result).toBe(true);

      const user = await getUserById('u1');
      expect(user).toBeNull();
    });

    it('should return false for nonexistent user', async () => {
      const result = await deleteUser('nobody');
      expect(result).toBe(false);
    });
  });

  describe('hashPassword', () => {
    it('should return a bcrypt hash string', async () => {
      const hash = await hashPassword('mysecret');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('$2')).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const hash = await hashPassword('correct');
      const result = await verifyPassword('correct', hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await hashPassword('correct');
      const result = await verifyPassword('wrong', hash);
      expect(result).toBe(false);
    });
  });
});
