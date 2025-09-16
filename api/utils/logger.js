// Comprehensive logging system for Vercel functions
import { NextResponse } from 'next/server';

// Log levels
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Current log level (can be set via environment variable)
const currentLogLevel = process.env.LOG_LEVEL ? 
  LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO : 
  LOG_LEVELS.INFO;

// Log formatter
function formatLog(level, message, data = {}, request = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    data,
    ...(request && {
      request: {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.ip,
        requestId: request.headers.get('x-request-id') || crypto.randomUUID(),
      }
    })
  };

  return JSON.stringify(logEntry);
}

// Core logging functions
export function logError(message, error, request = null, additionalData = {}) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    const errorData = {
      error: {
        message: error.message,
        stack: error.stack,
        type: error.type,
        statusCode: error.statusCode,
        ...additionalData
      }
    };
    
    console.error(formatLog('ERROR', message, errorData, request));
  }
}

export function logWarn(message, data = {}, request = null) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    console.warn(formatLog('WARN', message, data, request));
  }
}

export function logInfo(message, data = {}, request = null) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    console.info(formatLog('INFO', message, data, request));
  }
}

export function logDebug(message, data = {}, request = null) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    console.debug(formatLog('DEBUG', message, data, request));
  }
}

// Performance logging
export function logPerformance(operation, startTime, endTime, request = null, additionalData = {}) {
  const duration = endTime - startTime;
  const performanceData = {
    operation,
    duration: `${duration}ms`,
    ...additionalData
  };

  if (duration > 5000) { // Log slow operations as warnings
    logWarn(`Slow operation: ${operation}`, performanceData, request);
  } else {
    logInfo(`Operation completed: ${operation}`, performanceData, request);
  }
}

// Function execution logging
export function logFunctionStart(functionName, request, params = {}) {
  logInfo(`Function started: ${functionName}`, {
    function: functionName,
    params,
    memoryUsage: getMemoryUsage()
  }, request);
}

export function logFunctionEnd(functionName, startTime, request, result = {}) {
  const duration = Date.now() - startTime;
  logInfo(`Function completed: ${functionName}`, {
    function: functionName,
    duration: `${duration}ms`,
    memoryUsage: getMemoryUsage(),
    result: typeof result === 'object' ? Object.keys(result) : typeof result
  }, request);
}

// Memory usage logging
export function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    };
  }
  return null;
}

// API call logging
export function logApiCall(url, method, statusCode, duration, request = null) {
  const level = statusCode >= 400 ? 'ERROR' : 'INFO';
  const message = `API call: ${method} ${url}`;
  const data = {
    url,
    method,
    statusCode,
    duration: `${duration}ms`,
    success: statusCode < 400
  };

  if (level === 'ERROR') {
    logError(message, new Error(`HTTP ${statusCode}`), request, data);
  } else {
    logInfo(message, data, request);
  }
}

// Database operation logging
export function logDatabaseOperation(operation, collection, duration, success, error = null, request = null) {
  const message = `Database ${operation}: ${collection}`;
  const data = {
    operation,
    collection,
    duration: `${duration}ms`,
    success
  };

  if (!success && error) {
    logError(message, error, request, data);
  } else {
    logInfo(message, data, request);
  }
}

// Security event logging
export function logSecurityEvent(event, details, request = null) {
  logWarn(`Security event: ${event}`, {
    event,
    ...details,
    severity: details.severity || 'medium'
  }, request);
}

// Rate limiting logging
export function logRateLimit(ip, endpoint, requestCount, request = null) {
  logWarn('Rate limit exceeded', {
    ip,
    endpoint,
    requestCount,
    limit: 100 // per minute
  }, request);
}

// Error boundary logging for client-side errors
export function logClientError(error, errorInfo, request = null) {
  logError('Client-side error', error, request, {
    componentStack: errorInfo.componentStack,
    errorBoundary: errorInfo.errorBoundary,
    userAgent: request?.headers.get('user-agent'),
  });
}

// Structured logging for Vercel analytics
export function logAnalytics(event, properties = {}, request = null) {
  const analyticsData = {
    event,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      ...(request && {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
      })
    }
  };

  logInfo(`Analytics: ${event}`, analyticsData, request);
}

// Log rotation and cleanup (for long-running functions)
export function cleanupOldLogs() {
  // This would be implemented based on your logging strategy
  // For Vercel, logs are automatically managed
  logDebug('Log cleanup completed');
}

// Export all logging functions
export default {
  logError,
  logWarn,
  logInfo,
  logDebug,
  logPerformance,
  logFunctionStart,
  logFunctionEnd,
  logApiCall,
  logDatabaseOperation,
  logSecurityEvent,
  logRateLimit,
  logClientError,
  logAnalytics,
  getMemoryUsage,
  cleanupOldLogs,
};
