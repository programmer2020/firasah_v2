/**
 * Authentication Middleware
 * Protects routes that require authentication
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';
import { getOne } from '../helpers/database.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Verify JWT token middleware
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Fetch role from DB
    const dbUser = await getOne('SELECT role FROM users WHERE user_id = $1', [payload.user_id]);

    req.user = {
      id: payload.user_id,
      email: payload.email,
      role: dbUser?.role || 'user',
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

/**
 * Require super_admin role
 */
export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required',
    });
  }
  next();
};

/**
 * Require file ownership or super_admin role
 */
export const requireFileOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const fileId = req.params.id || req.params.fileId;
    if (!fileId) return next();

    if (req.user?.role === 'super_admin') return next();

    const file = await getOne('SELECT "createdBy" FROM sound_files WHERE file_id = $1', [fileId]);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const userEmail = req.user?.email || '';
    const userId = String(req.user?.id || '');
    if (file.createdBy !== userEmail && file.createdBy !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Authorization check failed' });
  }
};

/**
 * Tenant filter helper.
 * Returns { userId: number | null, isSuperAdmin: boolean }
 * - super_admin => userId is null (no filter needed)
 * - normal user => userId = req.user.id
 */
export const getTenantFilter = (req: AuthRequest): { userId: number | null; isSuperAdmin: boolean } => {
  const isSuperAdmin = req.user?.role === 'super_admin';
  return {
    userId: isSuperAdmin ? null : (req.user?.id ?? null),
    isSuperAdmin,
  };
};

export default { authenticate, errorHandler, requireSuperAdmin, requireFileOwnership, getTenantFilter };
