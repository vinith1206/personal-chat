// Client-side logging utility for Vercel deployment
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLogLevel = process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

// Log formatter
function formatLog(level, message, data = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    data,
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    userId: typeof localStorage !== 'undefined' ? localStorage.getItem('userId') || 'anonymous' : 'unknown'
  };

  return JSON.stringify(logEntry);
}

// Core logging functions
export function logError(message, error, additionalData = {}) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    const errorData = {
      error: {
        message: error?.message || error,
        stack: error?.stack,
        name: error?.name,
        ...additionalData
      }
    };
    
    console.error(formatLog('ERROR', message, errorData));
    
    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      sendToLoggingService('ERROR', message, errorData);
    }
  }
}

export function logWarn(message, data = {}) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    console.warn(formatLog('WARN', message, data));
    
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      sendToLoggingService('WARN', message, data);
    }
  }
}

export function logInfo(message, data = {}) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    console.info(formatLog('INFO', message, data));
  }
}

export function logDebug(message, data = {}) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    console.debug(formatLog('DEBUG', message, data));
  }
}

// Performance logging
export function logPerformance(operation, startTime, endTime, additionalData = {}) {
  const duration = endTime - startTime;
  const performanceData = {
    operation,
    duration: `${duration}ms`,
    ...additionalData
  };

  if (duration > 1000) { // Log slow operations as warnings
    logWarn(`Slow operation: ${operation}`, performanceData);
  } else {
    logInfo(`Operation completed: ${operation}`, performanceData);
  }
}

// API call logging
export function logApiCall(url, method, statusCode, duration, error = null) {
  const level = statusCode >= 400 ? 'ERROR' : 'INFO';
  const message = `API call: ${method} ${url}`;
  const data = {
    url,
    method,
    statusCode,
    duration: `${duration}ms`,
    success: statusCode < 400,
    ...(error && { error: error.message })
  };

  if (level === 'ERROR') {
    logError(message, error || new Error(`HTTP ${statusCode}`), data);
  } else {
    logInfo(message, data);
  }
}

// User interaction logging
export function logUserInteraction(action, details = {}) {
  logInfo(`User interaction: ${action}`, {
    action,
    ...details,
    timestamp: new Date().toISOString()
  });
}

// Error boundary logging
export function logClientError(error, errorInfo) {
  logError('Client-side error', error, {
    componentStack: errorInfo?.componentStack,
    errorBoundary: errorInfo?.errorBoundary,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown'
  });
}

// Network error logging
export function logNetworkError(url, method, error) {
  logError(`Network error: ${method} ${url}`, error, {
    url,
    method,
    errorType: error.name,
    errorMessage: error.message
  });
}

// Send logs to external service
async function sendToLoggingService(level, message, data) {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level,
        message,
        data,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    // Silently fail to avoid infinite logging loops
    console.error('Failed to send log to external service:', error);
  }
}

// Export all logging functions
export default {
  logError,
  logWarn,
  logInfo,
  logDebug,
  logPerformance,
  logApiCall,
  logUserInteraction,
  logClientError,
  logNetworkError,
};
