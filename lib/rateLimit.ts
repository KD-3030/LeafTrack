import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  private getClientIdentifier(request: NextRequest): string {
    // Try to get IP from various headers (works behind proxies)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    
    return ip;
  }

  check(
    request: NextRequest,
    limit: number = 100,
    windowMs: number = 15 * 60 * 1000 // 15 minutes default
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const identifier = this.getClientIdentifier(request);
    const now = Date.now();
    const resetTime = now + windowMs;
    
    const entry = this.store.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      // New entry or expired entry
      this.store.set(identifier, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime,
      };
    }
    
    if (entry.count >= limit) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }
    
    // Increment count
    entry.count++;
    this.store.set(identifier, entry);
    
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Global rate limiter instance
const rateLimiter = new InMemoryRateLimiter();

/**
 * Rate limiting middleware for API routes
 * @param request - Next.js request object
 * @param limit - Maximum requests allowed per window (default: 100)
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns NextResponse if rate limited, null if allowed
 */
export function rateLimit(
  request: NextRequest,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000
): NextResponse | null {
  const result = rateLimiter.check(request, limit, windowMs);
  
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }
  
  return null; // Request allowed
}

/**
 * Strict rate limiting for sensitive endpoints (login, registration)
 */
export function strictRateLimit(request: NextRequest): NextResponse | null {
  return rateLimit(request, 5, 15 * 60 * 1000); // 5 requests per 15 minutes
}

/**
 * API rate limiting for general API endpoints
 */
export function apiRateLimit(request: NextRequest): NextResponse | null {
  return rateLimit(request, 100, 15 * 60 * 1000); // 100 requests per 15 minutes
}

export { rateLimiter };