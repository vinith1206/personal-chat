// Comprehensive Vercel Error Handling System
// Handles all Vercel error types with proper prevention and recovery

// Error Types Mapping
export const VERCEL_ERROR_TYPES = {
  // Function Errors
  BODY_NOT_A_STRING_FROM_FUNCTION: { code: 502, type: 'Function' },
  FUNCTION_INVOCATION_FAILED: { code: 500, type: 'Function' },
  FUNCTION_INVOCATION_TIMEOUT: { code: 504, type: 'Function' },
  FUNCTION_PAYLOAD_TOO_LARGE: { code: 413, type: 'Function' },
  FUNCTION_RESPONSE_PAYLOAD_TOO_LARGE: { code: 500, type: 'Function' },
  FUNCTION_THROTTLED: { code: 503, type: 'Function' },
  EDGE_FUNCTION_INVOCATION_FAILED: { code: 500, type: 'Function' },
  EDGE_FUNCTION_INVOCATION_TIMEOUT: { code: 504, type: 'Function' },
  NO_RESPONSE_FROM_FUNCTION: { code: 502, type: 'Function' },
  
  // Deployment Errors
  DEPLOYMENT_BLOCKED: { code: 403, type: 'Deployment' },
  DEPLOYMENT_DELETED: { code: 410, type: 'Deployment' },
  DEPLOYMENT_DISABLED: { code: 402, type: 'Deployment' },
  DEPLOYMENT_NOT_FOUND: { code: 404, type: 'Deployment' },
  DEPLOYMENT_NOT_READY_REDIRECTING: { code: 303, type: 'Deployment' },
  DEPLOYMENT_PAUSED: { code: 503, type: 'Deployment' },
  NOT_FOUND: { code: 404, type: 'Deployment' },
  
  // DNS Errors
  DNS_HOSTNAME_EMPTY: { code: 502, type: 'DNS' },
  DNS_HOSTNAME_NOT_FOUND: { code: 502, type: 'DNS' },
  DNS_HOSTNAME_RESOLVE_FAILED: { code: 502, type: 'DNS' },
  DNS_HOSTNAME_RESOLVED_PRIVATE: { code: 404, type: 'DNS' },
  DNS_HOSTNAME_SERVER_ERROR: { code: 502, type: 'DNS' },
  
  // Request/Response Errors
  INVALID_REQUEST_METHOD: { code: 405, type: 'Request' },
  MALFORMED_REQUEST_HEADER: { code: 400, type: 'Request' },
  REQUEST_HEADER_TOO_LARGE: { code: 431, type: 'Request' },
  URL_TOO_LONG: { code: 414, type: 'Request' },
  RANGE_END_NOT_VALID: { code: 416, type: 'Request' },
  RANGE_GROUP_NOT_VALID: { code: 416, type: 'Request' },
  RANGE_MISSING_UNIT: { code: 416, type: 'Request' },
  RANGE_START_NOT_VALID: { code: 416, type: 'Request' },
  RANGE_UNIT_NOT_SUPPORTED: { code: 416, type: 'Request' },
  TOO_MANY_RANGES: { code: 416, type: 'Request' },
  RESOURCE_NOT_FOUND: { code: 404, type: 'Request' },
  
  // Image Optimization Errors
  INVALID_IMAGE_OPTIMIZE_REQUEST: { code: 400, type: 'Image' },
  OPTIMIZED_EXTERNAL_IMAGE_REQUEST_FAILED: { code: 502, type: 'Image' },
  OPTIMIZED_EXTERNAL_IMAGE_REQUEST_INVALID: { code: 502, type: 'Image' },
  OPTIMIZED_EXTERNAL_IMAGE_REQUEST_UNAUTHORIZED: { code: 502, type: 'Image' },
  OPTIMIZED_EXTERNAL_IMAGE_TOO_MANY_REDIRECTS: { code: 502, type: 'Image' },
  
  // Middleware Errors
  MIDDLEWARE_INVOCATION_FAILED: { code: 500, type: 'Middleware' },
  MIDDLEWARE_INVOCATION_TIMEOUT: { code: 504, type: 'Middleware' },
  MIDDLEWARE_RUNTIME_DEPRECATED: { code: 503, type: 'Middleware' },
  MICROFRONTENDS_MIDDLEWARE_ERROR: { code: 500, type: 'Middleware' },
  
  // Routing Errors
  ROUTER_CANNOT_MATCH: { code: 502, type: 'Routing' },
  ROUTER_EXTERNAL_TARGET_CONNECTION_ERROR: { code: 502, type: 'Routing' },
  ROUTER_EXTERNAL_TARGET_ERROR: { code: 502, type: 'Routing' },
  ROUTER_EXTERNAL_TARGET_HANDSHAKE_ERROR: { code: 502, type: 'Routing' },
  ROUTER_TOO_MANY_HAS_SELECTIONS: { code: 502, type: 'Routing' },
  TOO_MANY_FILESYSTEM_CHECKS: { code: 502, type: 'Routing' },
  TOO_MANY_FORKS: { code: 502, type: 'Routing' },
  
  // Cache Errors
  FALLBACK_BODY_TOO_LARGE: { code: 502, type: 'Cache' },
  
  // Runtime Errors
  INFINITE_LOOP_DETECTED: { code: 508, type: 'Runtime' },
  
  // Sandbox Errors
  SANDBOX_NOT_FOUND: { code: 404, type: 'Sandbox' },
  SANDBOX_NOT_LISTENING: { code: 502, type: 'Sandbox' },
  SANDBOX_STOPPED: { code: 410, type: 'Sandbox' }
};

// Configuration Constants
export const CONFIG = {
  MAX_PAYLOAD_SIZE: 4.5 * 1024 * 1024, // 4.5MB (Vercel limit)
  MAX_RESPONSE_SIZE: 6 * 1024 * 1024, // 6MB (Vercel limit)
  MAX_HEADER_SIZE: 8 * 1024, // 8KB
  MAX_URL_LENGTH: 2048,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  TIMEOUT_DURATION: 10000, // 10 seconds
  THROTTLE_LIMIT: 100, // requests per minute
  MEMORY_LIMIT: 1024 * 1024 * 1024, // 1GB
  MAX_LOOP_ITERATIONS: 1000
};

// Circuit Breaker Implementation
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Throttling Implementation
class Throttler {
  constructor(limit = CONFIG.THROTTLE_LIMIT, window = 60000) {
    this.limit = limit;
    this.window = window;
    this.requests = new Map();
  }

  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.window;
    
    // Clean old requests
    if (this.requests.has(identifier)) {
      const requests = this.requests.get(identifier).filter(time => time > windowStart);
      this.requests.set(identifier, requests);
    } else {
      this.requests.set(identifier, []);
    }

    const currentRequests = this.requests.get(identifier);
    
    if (currentRequests.length >= this.limit) {
      return false;
    }

    currentRequests.push(now);
    return true;
  }
}

// Global instances
const circuitBreaker = new CircuitBreaker();
const throttler = new Throttler();

// Utility Functions
export function validatePayloadSize(payload) {
  const size = JSON.stringify(payload).length;
  if (size > CONFIG.MAX_PAYLOAD_SIZE) {
    throw createVercelError('FUNCTION_PAYLOAD_TOO_LARGE', `Payload size ${size} exceeds limit ${CONFIG.MAX_PAYLOAD_SIZE}`);
  }
  return true;
}

export function validateResponseSize(response) {
  const size = JSON.stringify(response).length;
  if (size > CONFIG.MAX_RESPONSE_SIZE) {
    throw createVercelError('FUNCTION_RESPONSE_PAYLOAD_TOO_LARGE', `Response size ${size} exceeds limit ${CONFIG.MAX_RESPONSE_SIZE}`);
  }
  return true;
}

export function validateHeaders(headers) {
  for (const [key, value] of Object.entries(headers)) {
    if (key.length + value.length > CONFIG.MAX_HEADER_SIZE) {
      throw createVercelError('REQUEST_HEADER_TOO_LARGE', `Header ${key} exceeds size limit`);
    }
  }
  return true;
}

export function validateUrl(url) {
  if (url.length > CONFIG.MAX_URL_LENGTH) {
    throw createVercelError('URL_TOO_LONG', `URL length ${url.length} exceeds limit ${CONFIG.MAX_URL_LENGTH}`);
  }
  return true;
}

export function validateRequestMethod(method, allowedMethods) {
  if (!allowedMethods.includes(method)) {
    throw createVercelError('INVALID_REQUEST_METHOD', `Method ${method} not allowed. Allowed: ${allowedMethods.join(', ')}`);
  }
  return true;
}

export function validateRangeHeader(range) {
  if (!range) return true;
  
  const rangeRegex = /^bytes=(\d+)-(\d*)$/;
  const match = range.match(rangeRegex);
  
  if (!match) {
    throw createVercelError('RANGE_MISSING_UNIT', 'Invalid range header format');
  }
  
  const start = parseInt(match[1]);
  const end = match[2] ? parseInt(match[2]) : null;
  
  if (isNaN(start) || start < 0) {
    throw createVercelError('RANGE_START_NOT_VALID', 'Invalid range start');
  }
  
  if (end !== null && (isNaN(end) || end < start)) {
    throw createVercelError('RANGE_END_NOT_VALID', 'Invalid range end');
  }
  
  return true;
}

export function detectInfiniteLoop(request, maxIterations = CONFIG.MAX_LOOP_ITERATIONS) {
  const loopKey = `loop_${request.url}`;
  const count = request.loopCount || 0;
  
  if (count > maxIterations) {
    throw createVercelError('INFINITE_LOOP_DETECTED', `Infinite loop detected after ${count} iterations`);
  }
  
  request.loopCount = count + 1;
  return true;
}

export function checkMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    
    if (heapUsed > CONFIG.MEMORY_LIMIT * 0.9) {
      throw createVercelError('FUNCTION_INVOCATION_FAILED', `Memory usage ${heapUsed} exceeds 90% of limit ${CONFIG.MEMORY_LIMIT}`);
    }
  }
  return true;
}

export function createVercelError(errorType, message, details = {}) {
  const errorInfo = VERCEL_ERROR_TYPES[errorType];
  const error = new Error(message);
  
  error.vercelErrorType = errorType;
  error.statusCode = errorInfo?.code || 500;
  error.errorCategory = errorInfo?.type || 'Unknown';
  error.details = details;
  error.timestamp = new Date().toISOString();
  
  return error;
}

export function withTimeout(fn, timeout = CONFIG.TIMEOUT_DURATION) {
  return async (req, res) => {
    const timeoutId = setTimeout(() => {
      throw createVercelError('FUNCTION_INVOCATION_TIMEOUT', `Function timed out after ${timeout}ms`);
    }, timeout);

    try {
      const result = await fn(req, res);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
}

export function withRetry(fn, maxRetries = CONFIG.MAX_RETRIES) {
  return async (...args) => {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        if (i === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (i + 1)));
      }
    }
    
    throw lastError;
  };
}

export function withThrottling(fn) {
  return async (req, res) => {
    const identifier = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    
    if (!throttler.isAllowed(identifier)) {
      throw createVercelError('FUNCTION_THROTTLED', 'Rate limit exceeded');
    }
    
    return await fn(req, res);
  };
}

export function withCircuitBreaker(fn) {
  return async (...args) => {
    return await circuitBreaker.execute(() => fn(...args));
  };
}

export function withErrorHandling(fn) {
  return async (req, res) => {
    try {
      // Validate request
      validateUrl(req.url);
      validateHeaders(req.headers);
      validateRequestMethod(req.method, ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
      
      if (req.headers.range) {
        validateRangeHeader(req.headers.range);
      }
      
      // Check for infinite loops
      detectInfiniteLoop(req);
      
      // Check memory usage
      checkMemoryUsage();
      
      // Execute function with timeout
      const result = await withTimeout(fn, CONFIG.TIMEOUT_DURATION)(req, res);
      
      // Validate response
      if (result && typeof result === 'object') {
        validateResponseSize(result);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error in function:', error);
      
      // Handle specific Vercel errors
      if (error.vercelErrorType) {
        return {
          statusCode: error.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'X-Error-Type': error.vercelErrorType,
            'X-Error-Category': error.errorCategory
          },
          body: JSON.stringify({
            error: error.vercelErrorType,
            message: error.message,
            category: error.errorCategory,
            timestamp: error.timestamp,
            details: error.details
          })
        };
      }
      
      // Generic error response
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString()
        })
      };
    }
  };
}

export function createFallbackResponse(errorType, fallbackData = {}) {
  const errorInfo = VERCEL_ERROR_TYPES[errorType];
  
  return {
    statusCode: errorInfo?.code || 500,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Type': errorType,
      'X-Fallback': 'true'
    },
    body: JSON.stringify({
      error: errorType,
      message: 'Service temporarily unavailable, using fallback data',
      fallback: true,
      data: fallbackData,
      timestamp: new Date().toISOString()
    })
  };
}

export function createImageFallback(errorType, originalUrl) {
  const fallbackImages = {
    'OPTIMIZED_EXTERNAL_IMAGE_REQUEST_FAILED': 'https://via.placeholder.com/300x200?text=Image+Error',
    'OPTIMIZED_EXTERNAL_IMAGE_REQUEST_INVALID': 'https://via.placeholder.com/300x200?text=Invalid+Image',
    'OPTIMIZED_EXTERNAL_IMAGE_REQUEST_UNAUTHORIZED': 'https://via.placeholder.com/300x200?text=Unauthorized',
    'OPTIMIZED_EXTERNAL_IMAGE_TOO_MANY_REDIRECTS': 'https://via.placeholder.com/300x200?text=Redirect+Error'
  };
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/png',
      'X-Error-Type': errorType,
      'X-Fallback': 'true',
      'X-Original-URL': originalUrl
    },
    body: fallbackImages[errorType] || 'https://via.placeholder.com/300x200?text=Error'
  };
}

// Export all utilities
export default {
  VERCEL_ERROR_TYPES,
  CONFIG,
  CircuitBreaker,
  Throttler,
  validatePayloadSize,
  validateResponseSize,
  validateHeaders,
  validateUrl,
  validateRequestMethod,
  validateRangeHeader,
  detectInfiniteLoop,
  checkMemoryUsage,
  createVercelError,
  withTimeout,
  withRetry,
  withThrottling,
  withCircuitBreaker,
  withErrorHandling,
  createFallbackResponse,
  createImageFallback
};
