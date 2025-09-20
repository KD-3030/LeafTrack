import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { JwtPayload } from 'jsonwebtoken';

// Extended interface for decoded JWT tokens
export interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
  email?: string;
}

/**
 * Extract and verify JWT token from request headers
 * @param request - Next.js request object
 * @returns Decoded token payload or error response
 */
export function authenticateRequest(request: NextRequest): DecodedToken | NextResponse {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Authorization required' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = verifyToken(token) as DecodedToken;
    if (!decoded || !decoded.userId || !decoded.role) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    return decoded;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
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
 * Comprehensive middleware function to check authentication and authorization
 * @param request - Next.js request object
 * @param allowedRoles - Array of roles allowed to access the resource
 * @returns Decoded token or error response
 */
export function requireAuth(request: NextRequest, allowedRoles?: string[]): DecodedToken | NextResponse {
  const authResult = authenticateRequest(request);
  
  // If authentication failed, return the error response
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  // If roles are specified, check authorization
  if (allowedRoles && !hasPermission(authResult.role, allowedRoles)) {
    return NextResponse.json(
      { success: false, error: 'Access denied - Insufficient permissions' },
      { status: 403 }
    );
  }
  
  return authResult;
}

/**
 * Helper function for admin-only routes
 */
export function requireAdminAuth(request: NextRequest): DecodedToken | NextResponse {
  return requireAuth(request, ['Admin']);
}

/**
 * Helper function for salesman-only routes
 */
export function requireSalesmanAuth(request: NextRequest): DecodedToken | NextResponse {
  return requireAuth(request, ['Salesman']);
}

/**
 * Helper function for routes accessible to both Admin and Salesman
 */
export function requireUserAuth(request: NextRequest): DecodedToken | NextResponse {
  return requireAuth(request, ['Admin', 'Salesman']);
}

/**
 * Enhanced authentication with optional user ID filtering for salesmen
 * Admins can access all data, Salesmen can only access their own data
 */
export function requireAuthWithUserFilter(
  request: NextRequest, 
  allowedRoles?: string[]
): { decoded: DecodedToken; userFilter: object } | NextResponse {
  const authResult = requireAuth(request, allowedRoles);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  // Create user filter for data access
  const userFilter: Record<string, string> = {};
  
  // If user is a salesman, filter data to their own records
  if (authResult.role === 'Salesman') {
    userFilter.salesman_id = authResult.userId;
  }
  // Admins get no filter (can see all data)
  
  return {
    decoded: authResult,
    userFilter
  };
}