// Vercel Middleware for comprehensive error handling
import { NextResponse } from 'next/server';

// Vercel limits
const MAX_REQUEST_SIZE = 4.5 * 1024 * 1024; // 4.5MB
const MAX_HEADER_SIZE = 8 * 1024; // 8KB
const MAX_FUNCTION_TIMEOUT = 30000; // 30 seconds for Pro plans
const MAX_EDGE_TIMEOUT = 5000; // 5 seconds for Edge functions

// Request tracking for infinite loop detection
const requestTracker = new Map();
const MAX_REQUESTS_PER_IP = 100; // per minute
const REQUEST_WINDOW = 60000; // 1 minute

export function middleware(request) {
  const startTime = Date.now();
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const pathname = request.pathname;

  try {
    // 1. Request size validation
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Payload Too Large', 
          message: 'Request size exceeds maximum allowed limit',
          maxSize: '4.5MB'
        }),
        { 
          status: 413, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Header size validation
    const headerSize = JSON.stringify(Object.fromEntries(request.headers.entries())).length;
    if (headerSize > MAX_HEADER_SIZE) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Request Header Fields Too Large', 
          message: 'Request headers exceed maximum size limit'
        }),
        { 
          status: 431, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Infinite loop detection
    const now = Date.now();
    const key = `${ip}-${pathname}`;
    const requests = requestTracker.get(key) || [];
    
    // Clean old requests
    const recentRequests = requests.filter(time => now - time < REQUEST_WINDOW);
    
    if (recentRequests.length >= MAX_REQUESTS_PER_IP) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Too Many Requests', 
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '60'
          } 
        }
      );
    }

    // Track this request
    recentRequests.push(now);
    requestTracker.set(key, recentRequests);

    // 4. Range request validation
    const range = request.headers.get('range');
    if (range && !isValidRangeHeader(range)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Requested Range Not Satisfiable', 
          message: 'Invalid range header format'
        }),
        { 
          status: 416, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // 5. User agent validation (basic bot detection)
    if (isSuspiciousUserAgent(userAgent)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Forbidden', 
          message: 'Access denied'
        }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // 6. Add security headers
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // 7. Add performance headers
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    
    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        message: 'Middleware processing failed',
        requestId: crypto.randomUUID()
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

function isValidRangeHeader(range) {
  // Basic range header validation
  const rangeRegex = /^bytes=\d+-\d*$/;
  return rangeRegex.test(range);
}

function isSuspiciousUserAgent(userAgent) {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /^$/ // Empty user agent
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
