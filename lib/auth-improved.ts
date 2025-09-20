/**
 * Improved authentication system with refresh tokens and session management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// In production, use Redis or database to store these
const tokenBlacklist = new Set<string>();
const refreshTokenStore = new Map<string, { userId: string; role: string; expiresAt: Date }>();

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not defined');
}

/**
 * Enhanced password hashing with stronger salt rounds
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = process.env.NODE_ENV === 'production' ? 14 : 12;
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
};

/**
 * Compare password with timing-safe comparison
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    // Log the error but don't expose it
    console.error('Password comparison error:', error);
    return false;
  }
};

/**
 * Generate access token with shorter expiry
 */
export const generateAccessToken = (userId: string, role: string, email?: string): string => {
  return jwt.sign(
    { 
      userId, 
      role,
      email,
      type: 'access',
      jti: crypto.randomBytes(16).toString('hex'), // JWT ID for tracking
    },
    JWT_SECRET,
    { 
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'leaftrack',
      audience: 'leaftrack-api'
    }
  );
};

/**
 * Generate refresh token with longer expiry
 */
export const generateRefreshToken = (userId: string, role: string): string => {
  const jti = crypto.randomBytes(32).toString('hex');
  const token = jwt.sign(
    { 
      userId, 
      role,
      type: 'refresh',
      jti,
    },
    JWT_REFRESH_SECRET,
    { 
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'leaftrack',
      audience: 'leaftrack-api'
    }
  );
  
  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  refreshTokenStore.set(jti, { userId, role, expiresAt });
  
  return token;
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (userId: string, role: string, email?: string) => {
  return {
    accessToken: generateAccessToken(userId, role, email),
    refreshToken: generateRefreshToken(userId, role),
    expiresIn: 900, // 15 minutes in seconds
  };
};

/**
 * Verify access token with enhanced validation
 */
export const verifyAccessToken = (token: string): { userId: string; role: string; email?: string } | null => {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'leaftrack',
      audience: 'leaftrack-api',
    }) as any;
    
    if (decoded.type !== 'access') {
      return null;
    }
    
    return {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Invalid access token');
    }
    return null;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string; role: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'leaftrack',
      audience: 'leaftrack-api',
    }) as any;
    
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    // Check if refresh token is in store
    const storedToken = refreshTokenStore.get(decoded.jti);
    if (!storedToken || storedToken.expiresAt < new Date()) {
      return null;
    }
    
    return {
      userId: decoded.userId,
      role: decoded.role,
    };
  } catch (error) {
    console.log('Invalid refresh token');
    return null;
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = (refreshToken: string, email?: string): { accessToken: string; expiresIn: number } | null => {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return null;
  }
  
  return {
    accessToken: generateAccessToken(decoded.userId, decoded.role, email),
    expiresIn: 900, // 15 minutes in seconds
  };
};

/**
 * Revoke tokens (logout functionality)
 */
export const revokeTokens = (accessToken: string, refreshToken?: string) => {
  // Add access token to blacklist
  tokenBlacklist.add(accessToken);
  
  // Remove refresh token from store
  if (refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken) as any;
      if (decoded?.jti) {
        refreshTokenStore.delete(decoded.jti);
      }
    } catch {
      // Ignore decode errors
    }
  }
  
  // Clean up expired tokens periodically
  cleanupExpiredTokens();
};

/**
 * Clean up expired tokens from memory
 */
const cleanupExpiredTokens = () => {
  const now = new Date();
  
  // Clean refresh token store
  for (const [jti, data] of refreshTokenStore.entries()) {
    if (data.expiresAt < now) {
      refreshTokenStore.delete(jti);
    }
  }
  
  // In production, implement proper cleanup for blacklist
  // For now, clear it if it gets too large
  if (tokenBlacklist.size > 10000) {
    tokenBlacklist.clear();
  }
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common patterns
  const commonPatterns = ['123456', 'password', 'qwerty', 'admin', 'letmein'];
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    errors.push('Password contains common patterns');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Generate secure password reset token
 */
export const generatePasswordResetToken = (userId: string): string => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // In production, store this in database with expiry
  // For now, just return the token
  return token;
};

/**
 * Verify password reset token
 */
export const verifyPasswordResetToken = (token: string): boolean => {
  // In production, check against database
  // For now, just validate format
  return /^[a-f0-9]{64}$/.test(token);
};

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
}
