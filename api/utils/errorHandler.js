// Comprehensive error handling utilities for Vercel
import { NextResponse } from 'next/server';

// Vercel function limits
export const VERCEL_LIMITS = {
  MAX_EXECUTION_TIME: 30000, // 30 seconds for Pro plans
  MAX_MEMORY: 1024, // 1GB
  MAX_PAYLOAD_SIZE: 4.5 * 1024 * 1024, // 4.5MB
  MAX_RESPONSE_SIZE: 6 * 1024 * 1024, // 6MB
  MAX_HEADERS: 50,
  MAX_HEADER_SIZE: 8 * 1024, // 8KB
};

// Error types for better handling
export const ERROR_TYPES = {
  TIMEOUT: 'TIMEOUT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  DNS_ERROR: 'DNS_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  FUNCTION_INVOCATION_FAILED: 'FUNCTION_INVOCATION_FAILED',
  INFINITE_LOOP: 'INFINITE_LOOP',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
};

// Timeout handler with proper cleanup
export function withTimeout(handler, timeoutMs = VERCEL_LIMITS.MAX_EXECUTION_TIME) {
  return async (request, context) => {
    const timeoutId = setTimeout(() => {
      throw new Error('Function timeout exceeded');
    }, timeoutMs);

    try {
      const result = await handler(request, context);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
}

// Retry logic for external API calls
export async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Check if error should not be retried
function isNonRetryableError(error) {
  const nonRetryableStatuses = [400, 401, 403, 404, 422];
  return nonRetryableStatuses.includes(error.status) || 
         error.code === 'ENOTFOUND' ||
         error.code === 'ECONNREFUSED';
}

// Payload size validation
export function validatePayloadSize(request) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > VERCEL_LIMITS.MAX_PAYLOAD_SIZE) {
    throw createError(ERROR_TYPES.PAYLOAD_TOO_LARGE, 'Request payload too large', 413);
  }
}

// Response size validation
export function validateResponseSize(response) {
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > VERCEL_LIMITS.MAX_RESPONSE_SIZE) {
    throw createError(ERROR_TYPES.PAYLOAD_TOO_LARGE, 'Response payload too large', 500);
  }
}

// Create standardized error responses
export function createError(type, message, statusCode = 500, details = {}) {
  const error = new Error(message);
  error.type = type;
  error.statusCode = statusCode;
  error.details = details;
  error.timestamp = new Date().toISOString();
  error.requestId = crypto.randomUUID();
  return error;
}

// Error response formatter
export function formatErrorResponse(error, includeStack = false) {
  const response = {
    error: error.type || 'INTERNAL_ERROR',
    message: error.message || 'An unexpected error occurred',
    timestamp: error.timestamp || new Date().toISOString(),
    requestId: error.requestId || crypto.randomUUID(),
  };

  if (error.details && Object.keys(error.details).length > 0) {
    response.details = error.details;
  }

  if (includeStack && process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return response;
}

// Main error handler for API routes
export function handleApiError(error, request) {
  console.error('API Error:', {
    type: error.type,
    message: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString(),
  });

  const statusCode = error.statusCode || 500;
  const errorResponse = formatErrorResponse(error);

  // Add retry information for certain errors
  if (error.type === ERROR_TYPES.EXTERNAL_API_ERROR) {
    errorResponse.retryAfter = 60;
  }

  return NextResponse.json(errorResponse, { 
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Type': error.type || 'UNKNOWN',
      ...(errorResponse.retryAfter && { 'Retry-After': errorResponse.retryAfter.toString() })
    }
  });
}

// Memory usage monitoring
export function checkMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const usedMB = usage.heapUsed / 1024 / 1024;
    
    if (usedMB > VERCEL_LIMITS.MAX_MEMORY * 0.9) {
      throw createError(
        ERROR_TYPES.MEMORY_LIMIT_EXCEEDED,
        'Memory usage approaching limit',
        500,
        { usedMB, limitMB: VERCEL_LIMITS.MAX_MEMORY }
      );
    }
  }
}

// DNS resolution with error handling
export async function resolveDNS(hostname) {
  try {
    const dns = await import('dns');
    const { promisify } = await import('util');
    const lookup = promisify(dns.lookup);
    
    return await withRetry(async () => {
      const result = await lookup(hostname);
      return result;
    }, 3, 1000);
  } catch (error) {
    throw createError(
      ERROR_TYPES.DNS_ERROR,
      `DNS resolution failed for ${hostname}`,
      502,
      { hostname, originalError: error.message }
    );
  }
}

// External API call with comprehensive error handling
export async function callExternalAPI(url, options = {}) {
  const defaultOptions = {
    timeout: 10000,
    retries: 3,
    ...options
  };

  try {
    return await withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), defaultOptions.timeout);

      try {
        const response = await fetch(url, {
          ...defaultOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw createError(
            ERROR_TYPES.EXTERNAL_API_ERROR,
            `External API returned ${response.status}`,
            response.status,
            { url, status: response.status, statusText: response.statusText }
          );
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }, defaultOptions.retries);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createError(
        ERROR_TYPES.TIMEOUT,
        'External API call timed out',
        504,
        { url, timeout: defaultOptions.timeout }
      );
    }
    throw error;
  }
}

// Image optimization error handler
export function handleImageOptimizationError(error, imageUrl) {
  console.error('Image optimization error:', {
    imageUrl,
    error: error.message,
    stack: error.stack,
  });

  return createError(
    ERROR_TYPES.EXTERNAL_API_ERROR,
    'Image optimization failed',
    502,
    { imageUrl, originalError: error.message }
  );
}

// Range request validation
export function validateRangeRequest(rangeHeader, contentLength) {
  if (!rangeHeader) return null;

  const rangeMatch = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);
  if (!rangeMatch) {
    throw createError(
      ERROR_TYPES.VALIDATION_ERROR,
      'Invalid range header format',
      416
    );
  }

  const start = parseInt(rangeMatch[1]);
  const end = rangeMatch[2] ? parseInt(rangeMatch[2]) : contentLength - 1;

  if (start >= contentLength || end >= contentLength || start > end) {
    throw createError(
      ERROR_TYPES.VALIDATION_ERROR,
      'Range not satisfiable',
      416,
      { start, end, contentLength }
    );
  }

  return { start, end };
}

// Infinite loop detection
const requestCounts = new Map();
const MAX_REQUESTS_PER_ENDPOINT = 10;
const TIME_WINDOW = 60000; // 1 minute

export function detectInfiniteLoop(request) {
  const key = `${request.url}-${request.headers.get('x-forwarded-for')}`;
  const now = Date.now();
  const requests = requestCounts.get(key) || [];

  // Clean old requests
  const recentRequests = requests.filter(time => now - time < TIME_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_ENDPOINT) {
    throw createError(
      ERROR_TYPES.INFINITE_LOOP,
      'Potential infinite loop detected',
      429,
      { endpoint: request.url, requestCount: recentRequests.length }
    );
  }

  recentRequests.push(now);
  requestCounts.set(key, recentRequests);
}
