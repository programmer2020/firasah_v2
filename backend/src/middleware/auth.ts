/**
 * Authentication Middleware
 * Protects routes that require authentication
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

/**
 * Verify JWT token middleware
 */
export const authenticate = (
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

    req.user = {
      id: payload.user_id,
      email: payload.email,
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
 * Require Super Admin middleware
 * Checks if the authenticated user has super_admin role
 */
export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // TODO: Get user role from database or token
  // For now, we'll check if user has super_admin role
  if ((req.user as any).role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required',
    });
  }

  next();
};

/**
 * Require File Ownership middleware
 * Checks if the authenticated user owns the file or is super admin
 * File ID should be in req.params.fileId
 */
export const requireFileOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const fileId = parseInt(req.params.fileId as string);
    if (isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID',
      });
    }

    // Import database helper
    const { getOne } = await import('../helpers/database.js');

    // Get the file
    const file = await getOne(
      'SELECT * FROM sound_files WHERE file_id = $1',
      [fileId]
    );

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Check ownership or super admin status
    // Note: We'll need to fetch user role from database
    const user = await getOne(
      'SELECT * FROM users WHERE email = $1',
      [req.user.email]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Allow access if super admin or file owner
    if (user.role === 'super_admin' || file.createdBy === req.user.email) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this file',
      });
    }
  } catch (error) {
    console.error('Error in requireFileOwnership:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default { authenticate, errorHandler, requireSuperAdmin, requireFileOwnership };
