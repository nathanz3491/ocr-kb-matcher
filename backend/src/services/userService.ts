/**
 * User storage service - JSON-based implementation with atomic writes
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { User, UserWithoutPassword } from '../types/auth';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

const BCRYPT_SALT_ROUNDS = 12;

let usersCache: User[] = [];
let cacheInitialized = false;

async function initialize(): Promise<void> {
  if (cacheInitialized) return;

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
      await fs.access(DATA_FILE);
      const data = await fs.readFile(DATA_FILE, 'utf-8');
      usersCache = JSON.parse(data);
      if (!Array.isArray(usersCache)) {
        usersCache = [];
      }
    } catch {
      usersCache = [];
      await saveUsers(usersCache);
    }

    cacheInitialized = true;
    console.log('[UserService] Initialized successfully');
  } catch (error) {
    console.error('[UserService] Failed to initialize:', error);
    throw error;
  }
}

async function saveUsers(users: User[]): Promise<void> {
  const tempPath = DATA_FILE + '.tmp.' + Date.now();
  await fs.writeFile(tempPath, JSON.stringify(users, null, 2), 'utf-8');
  await fs.rename(tempPath, DATA_FILE);
}

async function ensureInitialized(): Promise<void> {
  if (!cacheInitialized) {
    await initialize();
  }
}

export async function getAllUsers(): Promise<User[]> {
  await ensureInitialized();
  return [...usersCache];
}

export async function getUserById(id: string): Promise<User | undefined> {
  await ensureInitialized();
  return usersCache.find(u => u.id === id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  await ensureInitialized();
  return usersCache.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export async function createUser(
  data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
): Promise<User> {
  await ensureInitialized();

  const existing = await getUserByEmail(data.email);
  if (existing) {
    throw new Error('Email already registered');
  }

  const now = new Date().toISOString();
  const user: User = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  usersCache.push(user);
  await saveUsers(usersCache);

  return user;
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<User | undefined> {
  await ensureInitialized();

  const index = usersCache.findIndex(u => u.id === id);
  if (index === -1) {
    return undefined;
  }

  const updatedUser: User = {
    ...usersCache[index],
    ...updates,
    id: usersCache[index].id,
    createdAt: usersCache[index].createdAt,
    updatedAt: new Date().toISOString(),
  };

  usersCache[index] = updatedUser;
  await saveUsers(usersCache);

  return updatedUser;
}

export async function deleteUser(id: string): Promise<boolean> {
  await ensureInitialized();

  const index = usersCache.findIndex(u => u.id === id);
  if (index === -1) {
    return false;
  }

  usersCache.splice(index, 1);
  await saveUsers(usersCache);

  return true;
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
  initialize,
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  hashPassword,
  verifyPassword,
  toUserWithoutPassword,
};

export default userService;
