/**
 * Security utilities and middleware for production deployment
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Security headers to be applied to all responses
 */
export const securityHeaders: HeadersInit = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Content Security Policy for production
 */
export const contentSecurityPolicy = {
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    connect-src 'self' https://api.mapbox.com https://*.tile.openstreetmap.org;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\n/g, ' ').trim()
};

/**
 * CORS configuration
 */
export const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
};

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', contentSecurityPolicy['Content-Security-Policy']);
  }
  
  return response;
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return generateSecureToken(32);
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  );
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string, secretKey: string): string {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string, secretKey: string): string {
  const algorithm = 'aes-256-gcm';
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove any script tags and dangerous HTML
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input !== null && typeof input === 'object') {
    const sanitized: any = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Check if IP is rate limited (to be used with Redis in production)
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000
): Promise<boolean> {
  // This is a placeholder - in production, use Redis or similar
  // to track request counts across multiple server instances
  
  // For now, return true (not limited)
  // TODO: Implement Redis-based rate limiting
  return true;
}

/**
 * Log security event
 */
export function logSecurityEvent(
  eventType: string,
  details: Record<string, any>,
  request?: NextRequest
): void {
  const event = {
    timestamp: new Date().toISOString(),
    type: eventType,
    details,
    ip: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || 'unknown',
    userAgent: request?.headers.get('user-agent') || 'unknown',
  };
  
  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to Sentry, DataDog, or similar service
    console.error('[SECURITY_EVENT]', JSON.stringify(event));
  } else {
    console.log('[SECURITY_EVENT]', event);
  }
}

/**
 * Validate request origin
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    'http://localhost:3000',
    'https://yourdomain.com', // Add your production domain
  ].filter(Boolean);
  
  if (!origin) {
    // Allow requests without origin (e.g., same-origin requests)
    return true;
  }
  
  return allowedOrigins.includes(origin);
}

/**
 * Create security middleware
 */
type SecuredRouteHandler = (request: NextRequest, ...args: unknown[]) => NextResponse | Promise<NextResponse>;

export function securityMiddleware(handler: SecuredRouteHandler) {
  return async (request: NextRequest, ...args: unknown[]) => {
    // Check origin
    if (!validateOrigin(request)) {
      logSecurityEvent('INVALID_ORIGIN', { origin: request.headers.get('origin') }, request);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Apply rate limiting
    const identifier = request.headers.get('x-forwarded-for') || 'unknown';
    const isAllowed = await checkRateLimit(identifier);
    if (!isAllowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { identifier }, request);
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }
    
    // Call the actual handler
    const response = await handler(request, ...args);
    
    // Apply security headers to response
    if (response instanceof NextResponse) {
      return applySecurityHeaders(response);
    }
    
    return response;
  };
}
