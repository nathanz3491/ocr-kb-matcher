import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwtService';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  accountType: 'student' | 'parent';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ success: false, error: 'No authorization header provided' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ success: false, error: 'Invalid authorization header format' });
    return;
  }

  const token = parts[1]; console.log('[DEBUG optionalAuth] authHeader:', authHeader, 'token:', token);

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, email: payload.email, accountType: payload.accountType || 'student' };
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid token';
    res.status(401).json({ success: false, error: message });
  }
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    next();
    return;
  }

  const token = parts[1]; console.log('[DEBUG optionalAuth] authHeader:', authHeader, 'token:', token);

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, email: payload.email, accountType: payload.accountType || 'student' };
  } catch {
    // Token invalid but optional - continue without user
  }

  next();
}

export const authMiddleware = {
  authenticate,
  optionalAuth,
};

export default authMiddleware;
