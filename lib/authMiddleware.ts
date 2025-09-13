import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * Extract and verify JWT token from request headers
 * @param request - Next.js request object
 * @returns Decoded token payload or error response
 */
export function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  
  return decoded;
}

/**
 * Check if user has required role
 * @param userRole - Current user's role
 * @param requiredRoles - Array of allowed roles
 * @returns Boolean indicating if user has permission
 */
export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Middleware function to check authentication and authorization
 * @param request - Next.js request object
 * @param allowedRoles - Array of roles allowed to access the resource
 * @returns Decoded token or error response
 */
export function requireAuth(request: NextRequest, allowedRoles?: string[]) {
  const authResult = authenticateRequest(request);
  
  // If authentication failed, return the error response
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  // If roles are specified, check authorization
  if (allowedRoles && !hasPermission(authResult.role, allowedRoles)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  return authResult;
}