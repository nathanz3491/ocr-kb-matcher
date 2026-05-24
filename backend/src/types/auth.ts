/**
 * Authentication types for JWT-based user auth system
 */

export type AccountType = 'student' | 'parent' | 'teacher';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  accountType: AccountType;
  emailVerified: boolean;
  emailVerificationCode?: string;
  emailVerificationExpires?: number;
  parentCode?: string | null;
  parentCodeExpires?: number | null;
  teacherCode?: string | null;
  teacherCodeExpires?: number | null;
  createdAt: string;
  updatedAt: string;
  settings: UserSettings;
}

export interface UserSettings {
  darkMode: boolean;
  emailNotifications: boolean;
  dailyReminder: boolean;
  reminderTime?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  accountType: AccountType;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string;
  accountType: AccountType;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  settings: UserSettings;
}

export interface TokenBlocklist {
  tokenId: string;
  expiresAt: number;
}

export interface ParentStudentLink {
  id: string;
  parentId: string;
  parentName: string;
  parentEmail: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  createdAt: string;
}

export interface PendingVerification {
  requestId: string;
  parentId: string;
  parentName: string;
  parentEmail: string;
  studentId: string;
  studentName: string;
  code: string;
  codeExpires: number;
  createdAt: string;
}
