/**
 * JWT service for generating and verifying tokens
 */

import * as jwt from 'jsonwebtoken';
import { User, JWTPayload } from '../types/auth';

// Get secrets from environment (lazy to allow dotenv.config() to run first)
function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET environment variable is required');
  return s;
}
function getJwtRefreshSecret(): string {
  const s = process.env.JWT_REFRESH_SECRET;
  if (!s) throw new Error('JWT_REFRESH_SECRET environment variable is required');
  return s;
}

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Validate that required env vars are set
 */
function validateSecrets(): void {
  getJwtSecret();
  getJwtRefreshSecret();
}

/**
 * Generate access token (15 minutes), includes jti for revocation
 */
export function generateAccessToken(user: User): string {
  validateSecrets();

  const payload: Partial<JWTPayload> = {
    userId: user.id,
    email: user.email,
    accountType: user.accountType || 'student',
    jti: crypto.randomUUID(),
  };

  return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate refresh token (7 days), includes jti for revocation
 */
export function generateRefreshToken(user: User): string {
  validateSecrets();

  const payload = {
    userId: user.id,
    jti: crypto.randomUUID(),
  };

  return jwt.sign(payload, getJwtRefreshSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Verify access token and return payload
 */
export function verifyAccessToken(token: string): JWTPayload {
  validateSecrets();

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JWTPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Verify refresh token and return userId + jti
 */
export function verifyRefreshToken(token: string): { userId: string; jti: string } {
  validateSecrets();

  try {
    const payload = jwt.verify(token, getJwtRefreshSecret()) as { userId: string; jti: string };
    if (!payload.jti) {
      throw new Error('Refresh token missing jti claim');
    }
    return { userId: payload.userId, jti: payload.jti };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Parse (decode) access token WITHOUT verifying signature.
 * Used by logout endpoint to extract jti for revocation.
 * Returns null if token is malformed.
 */
export function parseAccessToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.decode(token) as JWTPayload | null;
    return payload;
  } catch {
    return null;
  }
}

export const jwtService = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  parseAccessToken,
};

export default jwtService;
