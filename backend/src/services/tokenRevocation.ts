/**
 * In-memory token revocation store.
 *
 * PRODUCTION NOTE: This is in-memory only and will be lost on server restart.
 * For production, use Redis or a database for persistence across restarts.
 */

// Refresh token revocation: Map<tokenId, { userId, expiresAt }>
// Tokens are auto-cleaned after expiry.
const revokedRefreshTokens = new Map<string, { userId: string; expiresAt: number }>();

// Access token revocation: Map<tokenId, expiresAt>
// Access tokens are short-lived (15min), so we track expiry for auto-cleanup.
const revokedAccessTokens = new Map<string, number>();

export function revokeRefreshToken(tokenId: string, userId: string, expiresAt: number): void {
  revokedRefreshTokens.set(tokenId, { userId, expiresAt });
}

export function isRefreshTokenRevoked(tokenId: string): boolean {
  return revokedRefreshTokens.has(tokenId);
}

export function revokeAccessToken(tokenId: string, expiresAt: number): void {
  revokedAccessTokens.set(tokenId, expiresAt);
}

export function isAccessTokenRevoked(tokenId: string): boolean {
  return revokedAccessTokens.has(tokenId);
}

function cleanupExpiredTokens(): void {
  const now = Date.now();

  for (const [tokenId, entry] of revokedRefreshTokens) {
    if (now > entry.expiresAt) {
      revokedRefreshTokens.delete(tokenId);
    }
  }

  for (const [tokenId, expiresAt] of revokedAccessTokens) {
    if (now > expiresAt) {
      revokedAccessTokens.delete(tokenId);
    }
  }
}

// Auto-cleanup expired tokens every hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL_MS);
