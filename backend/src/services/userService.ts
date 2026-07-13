/**
 * User storage service - SQLite-based implementation with atomic transactions
 */

import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { User, UserWithoutPassword } from '../types/auth';
import { Tier, UserRole, Usage } from '../../../shared/types';
import { getDb } from '../db/sqlite';
import { logger } from '../lib/logger';

const BCRYPT_SALT_ROUNDS = 12;

let initialized = false;

function ensureInitialized(): void {
  if (!initialized) {
    getDb();
    initialized = true;
  }
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    name: row.name as string,
    accountType: (row.account_type as string) as 'student' | 'parent',
    emailVerified: (row.email_verified as number) === 1,
    emailVerificationCode: row.email_verification_code as string | undefined,
    emailVerificationExpires: row.email_verification_expires as number | undefined,
    parentCode: (row.parent_code as string) || null,
    parentCodeExpires: (row.parent_code_expires as number) || null,
    dateOfBirth: row.date_of_birth as string | undefined,
    requiresParentalConsent: (row.requires_parental_consent as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    settings: typeof row.settings === 'string' ? JSON.parse(row.settings as string) : (row.settings || {}),
    tier: (row.tier as Tier) || undefined,
    subscriptionStartedAt: row.subscription_started_at as string | undefined,
    subscriptionExpiresAt: row.subscription_expires_at as string | undefined,
    role: (row.role as UserRole) || undefined,
    usage: typeof row.usage === 'string' ? JSON.parse(row.usage as string) as Usage : undefined,
  };
}

export async function getAllUsers(): Promise<User[]> {
  ensureInitialized();
  const db = getDb();
  const rows = db.prepare('SELECT * FROM users').all() as Record<string, unknown>[];
  return rows.map(rowToUser);
}

export async function getUserById(id: string): Promise<User | null> {
  ensureInitialized();
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToUser(row) : null;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  ensureInitialized();
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as Record<string, unknown> | undefined;
  return row ? rowToUser(row) : undefined;
}

function getCurrentMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function createUser(
  data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
): Promise<User> {
  ensureInitialized();
  const db = getDb();

  const existing = await getUserByEmail(data.email);
  if (existing) {
    throw new Error('Email already registered');
  }

  const now = new Date().toISOString();
  const user: User = {
    ...data,
    id: uuidv4(),
    tier: data.tier || 'free',
    role: data.role || 'user',
    usage: data.usage || {
      periodStart: getCurrentMonthStart(),
      uploads: 0,
      quizGenerated: 0,
      chatMessages: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  const stmt = db.prepare(`
    INSERT INTO users
      (id, email, password_hash, name, account_type, email_verified,
       email_verification_code, email_verification_expires,
       parent_code, parent_code_expires,
       date_of_birth, requires_parental_consent,
       created_at, updated_at, settings, tier,
       subscription_started_at, subscription_expires_at, role, usage)
    VALUES
      (@id, @email, @password_hash, @name, @account_type, @email_verified,
       @email_verification_code, @email_verification_expires,
       @parent_code, @parent_code_expires,
       @date_of_birth, @requires_parental_consent,
       @created_at, @updated_at, @settings, @tier,
       @subscription_started_at, @subscription_expires_at, @role, @usage)
  `);

  stmt.run({
    id: user.id,
    email: user.email.toLowerCase(),
    password_hash: user.passwordHash,
    name: user.name,
    account_type: user.accountType,
    email_verified: user.emailVerified ? 1 : 0,
    email_verification_code: user.emailVerificationCode ?? null,
    email_verification_expires: user.emailVerificationExpires ?? null,
    parent_code: user.parentCode ?? null,
    parent_code_expires: user.parentCodeExpires ?? null,
    date_of_birth: user.dateOfBirth ?? null,
    requires_parental_consent: user.requiresParentalConsent ? 1 : 0,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    settings: JSON.stringify(user.settings),
    tier: user.tier ?? null,
    subscription_started_at: (user as { subscriptionStartedAt?: string }).subscriptionStartedAt ?? null,
    subscription_expires_at: user.subscriptionExpiresAt ?? null,
    role: user.role ?? 'user',
    usage: user.usage ? JSON.stringify(user.usage) : null,
  });

  return user;
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<User | null> {
  ensureInitialized();
  const db = getDb();
  const existing = await getUserById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const merged: User = { ...existing, ...updates, id: existing.id, createdAt: existing.createdAt, updatedAt: now };

  const stmt = db.prepare(`
    UPDATE users SET
      email = @email,
      password_hash = @password_hash,
      name = @name,
      account_type = @account_type,
      email_verified = @email_verified,
      email_verification_code = @email_verification_code,
      email_verification_expires = @email_verification_expires,
      parent_code = @parent_code,
      parent_code_expires = @parent_code_expires,
      date_of_birth = @date_of_birth,
      requires_parental_consent = @requires_parental_consent,
      updated_at = @updated_at,
      settings = @settings,
      tier = @tier,
      subscription_started_at = @subscription_started_at,
      subscription_expires_at = @subscription_expires_at,
      role = @role,
      usage = @usage
    WHERE id = @id
  `);

  stmt.run({
    id: merged.id,
    email: merged.email.toLowerCase(),
    password_hash: merged.passwordHash,
    name: merged.name,
    account_type: merged.accountType,
    email_verified: merged.emailVerified ? 1 : 0,
    email_verification_code: merged.emailVerificationCode ?? null,
    email_verification_expires: merged.emailVerificationExpires ?? null,
    parent_code: merged.parentCode ?? null,
    parent_code_expires: merged.parentCodeExpires ?? null,
    date_of_birth: merged.dateOfBirth ?? null,
    requires_parental_consent: merged.requiresParentalConsent ? 1 : 0,
    updated_at: merged.updatedAt,
    settings: JSON.stringify(merged.settings),
    tier: merged.tier ?? null,
    subscription_started_at: (merged as { subscriptionStartedAt?: string }).subscriptionStartedAt ?? null,
    subscription_expires_at: merged.subscriptionExpiresAt ?? null,
    role: merged.role ?? 'user',
    usage: merged.usage ? JSON.stringify(merged.usage) : null,
  });

  return merged;
}

export async function saveUser(user: User): Promise<void> {
  ensureInitialized();
  const db = getDb();
  const updatedUser: User = {
    ...user,
    updatedAt: new Date().toISOString(),
  };

  const stmt = db.prepare(`
    INSERT INTO users
      (id, email, password_hash, name, account_type, email_verified,
       email_verification_code, email_verification_expires,
       parent_code, parent_code_expires,
       date_of_birth, requires_parental_consent,
       created_at, updated_at, settings, tier,
       subscription_started_at, subscription_expires_at, role, usage)
    VALUES
      (@id, @email, @password_hash, @name, @account_type, @email_verified,
       @email_verification_code, @email_verification_expires,
       @parent_code, @parent_code_expires,
       @date_of_birth, @requires_parental_consent,
       @created_at, @updated_at, @settings, @tier,
       @subscription_started_at, @subscription_expires_at, @role, @usage)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      password_hash = excluded.password_hash,
      name = excluded.name,
      account_type = excluded.account_type,
      email_verified = excluded.email_verified,
      email_verification_code = excluded.email_verification_code,
      email_verification_expires = excluded.email_verification_expires,
      parent_code = excluded.parent_code,
      parent_code_expires = excluded.parent_code_expires,
      date_of_birth = excluded.date_of_birth,
      requires_parental_consent = excluded.requires_parental_consent,
      updated_at = excluded.updated_at,
      settings = excluded.settings,
      tier = excluded.tier,
      subscription_started_at = excluded.subscription_started_at,
      subscription_expires_at = excluded.subscription_expires_at,
      role = excluded.role,
      usage = excluded.usage
  `);

  stmt.run({
    id: updatedUser.id,
    email: updatedUser.email.toLowerCase(),
    password_hash: updatedUser.passwordHash,
    name: updatedUser.name,
    account_type: updatedUser.accountType,
    email_verified: updatedUser.emailVerified ? 1 : 0,
    email_verification_code: updatedUser.emailVerificationCode ?? null,
    email_verification_expires: updatedUser.emailVerificationExpires ?? null,
    parent_code: updatedUser.parentCode ?? null,
    parent_code_expires: updatedUser.parentCodeExpires ?? null,
    date_of_birth: updatedUser.dateOfBirth ?? null,
    requires_parental_consent: updatedUser.requiresParentalConsent ? 1 : 0,
    created_at: updatedUser.createdAt,
    updated_at: updatedUser.updatedAt,
    settings: JSON.stringify(updatedUser.settings),
    tier: updatedUser.tier ?? null,
    subscription_started_at: (updatedUser as { subscriptionStartedAt?: string }).subscriptionStartedAt ?? null,
    subscription_expires_at: updatedUser.subscriptionExpiresAt ?? null,
    role: updatedUser.role ?? 'user',
    usage: updatedUser.usage ? JSON.stringify(updatedUser.usage) : null,
  });
}

export async function setUserTier(
  userId: string,
  tier: Tier,
  durationDays?: number
): Promise<User | null> {
  ensureInitialized();
  const user = await getUserById(userId);
  if (!user) return null;

  const updates: Partial<Omit<User, 'id' | 'createdAt'>> = { tier };

  if (tier !== 'free') {
    const now = new Date().toISOString();
    updates.subscriptionStartedAt = now;
    updates.usage = {
      ...(user.usage ?? { uploads: 0, quizGenerated: 0, chatMessages: 0 }),
      periodStart: now,
    };
  }

  if (durationDays && durationDays > 0) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    updates.subscriptionExpiresAt = expiresAt.toISOString();
  }

  return updateUser(userId, updates);
}

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw || !raw.trim()) return [];
  return raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);
}

export async function bootstrapAdmin(): Promise<void> {
  ensureInitialized();
  const db = getDb();
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return;

  let promotedCount = 0;
  const stmt = db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE email = ? AND role != ?');
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    for (const email of adminEmails) {
      const result = stmt.run('admin', now, email, 'admin');
      promotedCount += result.changes;
    }
  });

  tx();

  if (promotedCount > 0) {
    logger.info({ promotedCount }, 'Promoted users to admin role');
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  ensureInitialized();
  const db = getDb();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return result.changes > 0;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function toUserWithoutPassword(user: User): UserWithoutPassword {
  const { passwordHash, ...rest } = user;
  return {
    ...rest,
    accountType: user.accountType || 'student',
  };
}

export const userService = {
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  saveUser,
  setUserTier,
  deleteUser,
  hashPassword,
  verifyPassword,
  toUserWithoutPassword,
  bootstrapAdmin,
  getAdminEmails,
};

export default userService;
