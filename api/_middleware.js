// Comprehensive Vercel Middleware for Error Prevention and Handling
// Handles all middleware-related errors and provides graceful degradation

import { 
  withErrorHandling, 
  withTimeout, 
  withThrottling, 
  withCircuitBreaker,
  createVercelError,
  VERCEL_ERROR_TYPES,
  CONFIG
} from './utils/errorHandler.js';
import { 
  logMiddlewareEvent, 
  logSecurityEvent, 
  logPerformance,
  middlewareLogger
} from './utils/logger.js';

// Middleware configuration
const MIDDLEWARE_CONFIG = {
  TIMEOUT: 5000, // 5 seconds
  MAX_RETRIES: 2,
  ENABLE_CORS: true,
  ENABLE_SECURITY_HEADERS: true,
  ENABLE_RATE_LIMITING: true,
  ENABLE_CIRCUIT_BREAKER: true,
  ENABLE_PERFORMANCE_MONITORING: true
};

// CORS configuration
const CORS_CONFIG = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
};

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map();

// Circuit breaker for middleware
const middlewareCircuitBreaker = {
  failureCount: 0,
  lastFailureTime: null,
  state: 'CLOSED',
  threshold: 5,
  timeout: 60000
};

// Main middleware function
export default withErrorHandling(async (request, response) => {
  const startTime = Date.now();
  const performanceTracker = logPerformance('middleware-execution');
  
  try {
    logMiddlewareEvent('middleware-started', {
      url: request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: request.headers['x-forwarded-for'] || request.connection?.remoteAddress
    });

    // Check circuit breaker
    if (MIDDLEWARE_CONFIG.ENABLE_CIRCUIT_BREAKER) {
      await checkCircuitBreaker();
    }

    // Handle CORS
    if (MIDDLEWARE_CONFIG.ENABLE_CORS) {
      await handleCORS(request, response);
    }

    // Add security headers
    if (MIDDLEWARE_CONFIG.ENABLE_SECURITY_HEADERS) {
      addSecurityHeaders(response);
    }

    // Rate limiting
    if (MIDDLEWARE_CONFIG.ENABLE_RATE_LIMITING) {
      await checkRateLimit(request);
    }

    // Validate request
    await validateRequest(request);

    // Performance monitoring
    if (MIDDLEWARE_CONFIG.ENABLE_PERFORMANCE_MONITORING) {
      monitorPerformance(request);
    }

    // Log successful middleware execution
    logMiddlewareEvent('middleware-completed', {
      url: request.url,
      method: request.method,
      duration: Date.now() - startTime
    });

    performanceTracker();

    return response;

  } catch (error) {
    logMiddlewareEvent('middleware-error', {
      error: error.message,
      url: request.url,
      method: request.method,
      vercelErrorType: error.vercelErrorType
    });

    // Handle specific middleware errors
    if (error.vercelErrorType === 'MIDDLEWARE_INVOCATION_FAILED') {
      return handleMiddlewareFailure(request, response, error);
    }

    if (error.vercelErrorType === 'MIDDLEWARE_INVOCATION_TIMEOUT') {
      return handleMiddlewareTimeout(request, response, error);
    }

    if (error.vercelErrorType === 'MIDDLEWARE_RUNTIME_DEPRECATED') {
      return handleDeprecatedRuntime(request, response, error);
    }

    // Generic error handling
    return handleGenericError(request, response, error);
  }
});

// Circuit breaker check
async function checkCircuitBreaker() {
  const now = Date.now();
  
  if (middlewareCircuitBreaker.state === 'OPEN') {
    if (now - middlewareCircuitBreaker.lastFailureTime > middlewareCircuitBreaker.timeout) {
      middlewareCircuitBreaker.state = 'HALF_OPEN';
    } else {
      throw createVercelError('MIDDLEWARE_INVOCATION_FAILED', 'Circuit breaker is OPEN');
    }
  }
}

// CORS handling
async function handleCORS(request, response) {
  const origin = request.headers.origin;
  const method = request.method;

  // Handle preflight requests
  if (method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', origin || '*');
    response.setHeader('Access-Control-Allow-Methods', CORS_CONFIG.methods.join(', '));
    response.setHeader('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders.join(', '));
    response.setHeader('Access-Control-Max-Age', CORS_CONFIG.maxAge);
    response.setHeader('Access-Control-Allow-Credentials', CORS_CONFIG.credentials);
    
    return {
      statusCode: 200,
      headers: response.getHeaders(),
      body: ''
    };
  }

  // Check origin
  if (CORS_CONFIG.origin.includes('*') || CORS_CONFIG.origin.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin || '*');
    response.setHeader('Access-Control-Allow-Credentials', CORS_CONFIG.credentials);
  } else {
    throw createVercelError('MIDDLEWARE_INVOCATION_FAILED', 'CORS origin not allowed');
  }
}

// Add security headers
function addSecurityHeaders(response) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
}

// Rate limiting
async function checkRateLimit(request) {
  const ip = request.headers['x-forwarded-for'] || request.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100;

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return;
  }

  const limit = rateLimitStore.get(ip);
  
  if (now > limit.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return;
  }

  if (limit.count >= maxRequests) {
    logSecurityEvent('rate-limit-exceeded', { ip, count: limit.count });
    throw createVercelError('FUNCTION_THROTTLED', 'Rate limit exceeded');
  }

  limit.count++;
}

// Request validation
async function validateRequest(request) {
  // Validate URL length
  if (request.url.length > CONFIG.MAX_URL_LENGTH) {
    throw createVercelError('URL_TOO_LONG', 'URL too long');
  }

  // Validate headers
  Object.entries(request.headers).forEach(([key, value]) => {
    if (key.length + value.length > CONFIG.MAX_HEADER_SIZE) {
      throw createVercelError('REQUEST_HEADER_TOO_LARGE', 'Header too large');
    }
  });

  // Validate method
  if (!CORS_CONFIG.methods.includes(request.method)) {
    throw createVercelError('INVALID_REQUEST_METHOD', 'Method not allowed');
  }

  // Check for malicious patterns
  const maliciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script/i, // XSS
    /javascript:/i, // XSS
    /on\w+\s*=/i, // Event handlers
    /eval\s*\(/i, // Code injection
    /expression\s*\(/i // CSS injection
  ];

  const url = request.url.toLowerCase();
  const userAgent = (request.headers['user-agent'] || '').toLowerCase();
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      logSecurityEvent('malicious-request-detected', {
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.headers['x-forwarded-for'] || request.connection?.remoteAddress
      });
      throw createVercelError('MALFORMED_REQUEST_HEADER', 'Malicious request detected');
    }
  }
}

// Performance monitoring
function monitorPerformance(request) {
  const startTime = Date.now();
  
  // Monitor response time
  const originalEnd = response.end;
  response.end = function(...args) {
    const duration = Date.now() - startTime;
    
    if (duration > 5000) { // Log slow responses
      logMiddlewareEvent('slow-response', {
        url: request.url,
        method: request.method,
        duration: `${duration}ms`
      });
    }
    
    return originalEnd.apply(this, args);
  };
}

// Error handlers
function handleMiddlewareFailure(request, response, error) {
  middlewareCircuitBreaker.failureCount++;
  middlewareCircuitBreaker.lastFailureTime = Date.now();
  
  if (middlewareCircuitBreaker.failureCount >= middlewareCircuitBreaker.threshold) {
    middlewareCircuitBreaker.state = 'OPEN';
  }

  return {
    statusCode: 500,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Type': 'MIDDLEWARE_INVOCATION_FAILED'
    },
    body: JSON.stringify({
      error: 'MIDDLEWARE_INVOCATION_FAILED',
      message: 'Middleware execution failed',
      timestamp: new Date().toISOString()
    })
  };
}

function handleMiddlewareTimeout(request, response, error) {
  return {
    statusCode: 504,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Type': 'MIDDLEWARE_INVOCATION_TIMEOUT'
    },
    body: JSON.stringify({
      error: 'MIDDLEWARE_INVOCATION_TIMEOUT',
      message: 'Middleware execution timed out',
      timestamp: new Date().toISOString()
    })
  };
}

function handleDeprecatedRuntime(request, response, error) {
  return {
    statusCode: 503,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Type': 'MIDDLEWARE_RUNTIME_DEPRECATED'
    },
    body: JSON.stringify({
      error: 'MIDDLEWARE_RUNTIME_DEPRECATED',
      message: 'Middleware runtime is deprecated',
      timestamp: new Date().toISOString()
    })
  };
}

function handleGenericError(request, response, error) {
  return {
    statusCode: 500,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Type': 'MIDDLEWARE_ERROR'
    },
    body: JSON.stringify({
      error: 'MIDDLEWARE_ERROR',
      message: 'An error occurred in middleware',
      timestamp: new Date().toISOString()
    })
  };
}

// Export middleware utilities
export {
  handleCORS,
  addSecurityHeaders,
  checkRateLimit,
  validateRequest,
  monitorPerformance
};