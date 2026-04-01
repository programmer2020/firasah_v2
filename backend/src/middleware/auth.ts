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

export default { authenticate, errorHandler };
