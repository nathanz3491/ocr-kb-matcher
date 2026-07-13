/**
 * Authentication types for JWT-based user auth system
 */

import { Tier, UserRole, Usage } from '../../../shared/types';

export type AccountType = 'student' | 'parent';

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
  dateOfBirth?: string;
  requiresParentalConsent?: boolean;
  createdAt: string;
  updatedAt: string;
  settings: UserSettings;
  tier?: Tier;
  subscriptionStartedAt?: string;
  subscriptionExpiresAt?: string;
  role?: UserRole;
  usage?: Usage;
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
  jti?: string;
  role?: UserRole;
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
  dateOfBirth?: string;
  requiresParentalConsent?: boolean;
  createdAt: string;
  updatedAt: string;
  settings: UserSettings;
  tier?: Tier;
  subscriptionStartedAt?: string;
  subscriptionExpiresAt?: string;
  role?: UserRole;
  usage?: Usage;
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
