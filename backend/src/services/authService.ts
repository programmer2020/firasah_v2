/**
 * Authentication Module
 * Handles user registration, login, and JWT token management
 */

import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { getOne, insert, update, executeQuery } from '../helpers/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

interface UserCredentials {
  email: string;
  password: string;
  name?: string;
  role?: string;
}

interface JWTPayload {
  user_id: number;
  email: string;
  iat?: number;
  exp?: number;
}

const syncUsersIdSequence = async () => {
  await executeQuery(`
    SELECT setval(
      pg_get_serial_sequence('users', 'user_id'),
      COALESCE((SELECT MAX(user_id) FROM users), 0) + 1,
      false
    );
  `);
};

/**
 * Hash password
 * @param password Plain text password
 * @returns Promise with hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
};

/**
 * Compare password with hash
 * @param password Plain text password
 * @param hash Hashed password
 * @returns Promise with boolean
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcryptjs.compare(password, hash);
};

/**
 * Generate JWT token
 * @param payload Token payload
 * @returns JWT token string
 */
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload as any, JWT_SECRET as any, {
    expiresIn: JWT_EXPIRE,
  } as any);
};

/**
 * Verify JWT token
 * @param token JWT token string
 * @returns Decoded payload or null
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token Verification Error:', error);
    return null;
  }
};

/**
 * Register new user
 * @param credentials User credentials (email, password, name)
 * @returns Promise with created user
 */
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const registerUser = async (credentials: UserCredentials) => {
  try {
    const emailNorm = normalizeEmail(credentials.email);
    // Check if user exists
    const existingUser = await getOne(
      'SELECT user_id FROM users WHERE LOWER(TRIM(email)) = $1',
      [emailNorm]
    );

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await hashPassword(credentials.password);

    // Ensure sequence is aligned with current max(user_id) after migrations/imports
    await syncUsersIdSequence();

    // Validate role
    const validRoles = ['user', 'super_admin'];
    const role = validRoles.includes(credentials.role || '') ? credentials.role : 'user';

    // Create user
    const createUser = () => insert('users', {
      email: credentials.email,
      password: hashedPassword,
      name: credentials.name || 'Unknown User',
      role,
      created_at: new Date(),
      updated_at: new Date(),
    });

    let user;
    try {
      user = await createUser();
    } catch (err: any) {
      // Retry once after reseeding sequence if primary key sequence drift exists
      if (String(err?.message || '').includes('users_pkey')) {
        await syncUsersIdSequence();
        user = await createUser();
      } else {
        throw err;
      }
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('User Registration Error:', error);
    throw error;
  }
};

/**
 * Login user
 * @param email User email
 * @param password User password
 * @returns Promise with user and token
 */
export const loginUser = async (email: string, password: string) => {
  try {
    const emailNorm = normalizeEmail(email);
    // Find user (case-insensitive + trim so pasted emails still match)
    const user = await getOne('SELECT * FROM users WHERE LOWER(TRIM(email)) = $1', [
      emailNorm,
    ]);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      user_id: user.user_id,
      email: user.email,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: { ...userWithoutPassword, role: user.role || 'user' },
      token,
    };
  } catch (error) {
    console.error('User Login Error:', error);
    throw error;
  }
};

/**
 * Record login event for user
 * @param userId User ID (optional)
 * @param email User email
 * @param ipAddress IP address of login request
 * @param userAgent User agent string
 */
export const recordLoginEvent = async (
  userId: number | null,
  email: string,
  ipAddress?: string,
  userAgent?: string
) => {
  try {
    // Ensure login_events table exists
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS login_events (
        login_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        email VARCHAR(255),
        login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(50),
        user_agent TEXT
      );
    `);

    // Insert login event
    await executeQuery(
      `INSERT INTO login_events (user_id, email, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [userId, email, ipAddress || 'unknown', userAgent || 'unknown']
    );

    console.log(`✅ Login event recorded for user ${userId || email}`);
  } catch (error) {
    console.error('Error recording login event:', error);
    // Don't throw - logging failure shouldn't block login
  }
};

/**
 * Get user by ID
 * @param userId User ID
 * @returns Promise with user
 */
export const getUserById = async (userId: number) => {
  try {
    const user = await getOne('SELECT * FROM users WHERE user_id = $1', [userId]);

    if (!user) {
      throw new Error('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, role: user.role || 'user' };
  } catch (error) {
    console.error('Get User By ID Error:', error);
    throw error;
  }
};

/**
 * Update user
 * @param userId User ID
 * @param updates User data to update
 * @returns Promise with updated user
 */
export const updateUser = async (
  userId: number,
  updates: Record<string, any>
) => {
  try {
    const { password, ...updateData } = updates;

    const updatedUser = await update(
      'users',
      {
        ...updateData,
        updated_at: new Date(),
      },
      'user_id = $1',
      [userId]
    );

    if (!updatedUser) {
      throw new Error('User not found');
    }

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  } catch (error) {
    console.error('Update User Error:', error);
    throw error;
  }
};

/**
 * Change password
 * @param userId User ID
 * @param oldPassword Current password
 * @param newPassword New password
 * @returns Promise with success message
 */
export const changePassword = async (
  userId: number,
  oldPassword: string,
  newPassword: string
) => {
  try {
    const user = await getOne('SELECT * FROM users WHERE user_id = $1', [userId]);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isPasswordValid = await comparePassword(oldPassword, user.password);

    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await update(
      'users',
      {
        password: hashedPassword,
        updated_at: new Date(),
      },
      'user_id = $1',
      [userId]
    );

    return { message: 'Password changed successfully' };
  } catch (error) {
    console.error('Change Password Error:', error);
    throw error;
  }
};

export default {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  registerUser,
  loginUser,
  getUserById,
  updateUser,
  changePassword,
};
