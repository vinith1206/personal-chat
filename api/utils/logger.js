// Comprehensive Logging System for Vercel Error Handling
// Provides structured logging with performance monitoring and error tracking

// Log Levels
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Log Categories
export const LOG_CATEGORIES = {
  FUNCTION: 'function',
  DEPLOYMENT: 'deployment',
  DNS: 'dns',
  REQUEST: 'request',
  RESPONSE: 'response',
  IMAGE: 'image',
  MIDDLEWARE: 'middleware',
  ROUTING: 'routing',
  CACHE: 'cache',
  RUNTIME: 'runtime',
  SANDBOX: 'sandbox',
  PERFORMANCE: 'performance',
  SECURITY: 'security'
};

// Configuration
const CONFIG = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
  MAX_LOG_SIZE: 1000, // Maximum log entries to keep in memory
  ENABLE_PERFORMANCE_LOGGING: true,
  ENABLE_ERROR_TRACKING: true,
  ENABLE_SECURITY_LOGGING: true
};

// In-memory log storage (in production, use external logging service)
const logs = [];
const performanceMetrics = new Map();
const errorCounts = new Map();

// Logger Class
class Logger {
  constructor(category = 'general') {
    this.category = category;
    this.startTime = Date.now();
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      category: this.category,
      message: message,
      data: data,
      requestId: data.requestId || 'unknown',
      functionName: data.functionName || 'unknown',
      duration: data.duration || null,
      memoryUsage: this.getMemoryUsage(),
      userAgent: data.userAgent || 'unknown',
      ip: data.ip || 'unknown'
    };

    // Add to logs array
    logs.push(logEntry);
    
    // Keep only recent logs
    if (logs.length > CONFIG.MAX_LOG_SIZE) {
      logs.shift();
    }

    // Track error counts
    if (level === LOG_LEVELS.ERROR) {
      const errorKey = `${this.category}:${message}`;
      errorCounts.set(errorKey, (errorCounts.get(errorKey) || 0) + 1);
    }

    // Console output based on log level
    if (this.shouldLog(level)) {
      this.outputToConsole(logEntry);
    }
  }

  shouldLog(level) {
    const currentLevel = LOG_LEVELS[CONFIG.LOG_LEVEL] || LOG_LEVELS.INFO;
    return level <= currentLevel;
  }

  outputToConsole(logEntry) {
    const timestamp = logEntry.timestamp;
    const level = logEntry.level;
    const category = logEntry.category;
    const message = logEntry.message;
    const data = logEntry.data;

    const levelName = Object.keys(LOG_LEVELS)[level];
    const prefix = `[${timestamp}] ${levelName}:${category}`;
    
    if (level === LOG_LEVELS.ERROR) {
      console.error(`${prefix} - ${message}`, data);
    } else if (level === LOG_LEVELS.WARN) {
      console.warn(`${prefix} - ${message}`, data);
    } else if (level === LOG_LEVELS.INFO) {
      console.info(`${prefix} - ${message}`, data);
    } else {
      console.log(`${prefix} - ${message}`, data);
    }
  }

  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024) // MB
      };
    }
    return null;
  }

  error(message, data = {}) {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  warn(message, data = {}) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  info(message, data = {}) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  debug(message, data = {}) {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }

  // Performance logging
  startPerformance(name) {
    if (CONFIG.ENABLE_PERFORMANCE_LOGGING) {
      performanceMetrics.set(name, {
        startTime: Date.now(),
        category: this.category
      });
    }
  }

  endPerformance(name, additionalData = {}) {
    if (CONFIG.ENABLE_PERFORMANCE_LOGGING && performanceMetrics.has(name)) {
      const start = performanceMetrics.get(name);
      const duration = Date.now() - start.startTime;
      
      this.info(`Performance: ${name}`, {
        duration: `${duration}ms`,
        category: start.category,
        ...additionalData
      });
      
      performanceMetrics.delete(name);
    }
  }

  // Function lifecycle logging
  logFunctionStart(functionName, request) {
    this.info(`Function started: ${functionName}`, {
      functionName,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      requestId: request.headers['x-request-id'] || 'unknown'
    });
  }

  logFunctionEnd(functionName, startTime, request, additionalData = {}) {
    const duration = Date.now() - startTime;
    this.info(`Function completed: ${functionName}`, {
      functionName,
      duration: `${duration}ms`,
      method: request.method,
      url: request.url,
      statusCode: additionalData.statusCode || 200,
      ...additionalData
    });
  }

  logFunctionError(functionName, error, request) {
    this.error(`Function error: ${functionName}`, {
      functionName,
      error: error.message,
      stack: error.stack,
      vercelErrorType: error.vercelErrorType,
      statusCode: error.statusCode,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.headers['x-forwarded-for'] || request.connection?.remoteAddress
    });
  }

  // Security logging
  logSecurityEvent(event, data = {}) {
    if (CONFIG.ENABLE_SECURITY_LOGGING) {
      this.warn(`Security event: ${event}`, {
        category: LOG_CATEGORIES.SECURITY,
        event,
        ...data
      });
    }
  }

  // Error tracking
  logErrorCounts() {
    if (CONFIG.ENABLE_ERROR_TRACKING) {
      this.info('Error counts summary', {
        category: LOG_CATEGORIES.RUNTIME,
        errorCounts: Object.fromEntries(errorCounts)
      });
    }
  }
}

// Create logger instances for different categories
export const functionLogger = new Logger(LOG_CATEGORIES.FUNCTION);
export const deploymentLogger = new Logger(LOG_CATEGORIES.DEPLOYMENT);
export const dnsLogger = new Logger(LOG_CATEGORIES.DNS);
export const requestLogger = new Logger(LOG_CATEGORIES.REQUEST);
export const responseLogger = new Logger(LOG_CATEGORIES.RESPONSE);
export const imageLogger = new Logger(LOG_CATEGORIES.IMAGE);
export const middlewareLogger = new Logger(LOG_CATEGORIES.MIDDLEWARE);
export const routingLogger = new Logger(LOG_CATEGORIES.ROUTING);
export const cacheLogger = new Logger(LOG_CATEGORIES.CACHE);
export const runtimeLogger = new Logger(LOG_CATEGORIES.RUNTIME);
export const sandboxLogger = new Logger(LOG_CATEGORIES.SANDBOX);
export const performanceLogger = new Logger(LOG_CATEGORIES.PERFORMANCE);
export const securityLogger = new Logger(LOG_CATEGORIES.SECURITY);

// Utility functions
export function logFunctionStart(functionName, request) {
  functionLogger.logFunctionStart(functionName, request);
}

export function logFunctionEnd(functionName, startTime, request, additionalData = {}) {
  functionLogger.logFunctionEnd(functionName, startTime, request, additionalData);
}

export function logFunctionError(functionName, error, request) {
  functionLogger.logFunctionError(functionName, error, request);
}

export function logError(message, error, request = {}) {
  functionLogger.error(message, {
    error: error.message,
    stack: error.stack,
    vercelErrorType: error.vercelErrorType,
    statusCode: error.statusCode,
    method: request.method,
    url: request.url
  });
}

export function logInfo(message, data = {}) {
  functionLogger.info(message, data);
}

export function logWarn(message, data = {}) {
  functionLogger.warn(message, data);
}

export function logDebug(message, data = {}) {
  functionLogger.debug(message, data);
}

export function logPerformance(name, additionalData = {}) {
  performanceLogger.startPerformance(name);
  return () => performanceLogger.endPerformance(name, additionalData);
}

export function logSecurityEvent(event, data = {}) {
  securityLogger.logSecurityEvent(event, data);
}

export function logDeploymentEvent(event, data = {}) {
  deploymentLogger.info(`Deployment event: ${event}`, data);
}

export function logDNSEvent(event, data = {}) {
  dnsLogger.info(`DNS event: ${event}`, data);
}

export function logRequestEvent(event, data = {}) {
  requestLogger.info(`Request event: ${event}`, data);
}

export function logResponseEvent(event, data = {}) {
  responseLogger.info(`Response event: ${event}`, data);
}

export function logImageEvent(event, data = {}) {
  imageLogger.info(`Image event: ${event}`, data);
}

export function logMiddlewareEvent(event, data = {}) {
  middlewareLogger.info(`Middleware event: ${event}`, data);
}

export function logRoutingEvent(event, data = {}) {
  routingLogger.info(`Routing event: ${event}`, data);
}

export function logCacheEvent(event, data = {}) {
  cacheLogger.info(`Cache event: ${event}`, data);
}

export function logRuntimeEvent(event, data = {}) {
  runtimeLogger.info(`Runtime event: ${event}`, data);
}

export function logSandboxEvent(event, data = {}) {
  sandboxLogger.info(`Sandbox event: ${event}`, data);
}

// Get logs for debugging
export function getLogs(level = null, category = null, limit = 100) {
  let filteredLogs = logs;
  
  if (level !== null) {
    filteredLogs = filteredLogs.filter(log => log.level === level);
  }
  
  if (category !== null) {
    filteredLogs = filteredLogs.filter(log => log.category === category);
  }
  
  return filteredLogs.slice(-limit);
}

// Get performance metrics
export function getPerformanceMetrics() {
  return Object.fromEntries(performanceMetrics);
}

// Get error counts
export function getErrorCounts() {
  return Object.fromEntries(errorCounts);
}

// Clear logs (for testing)
export function clearLogs() {
  logs.length = 0;
  performanceMetrics.clear();
  errorCounts.clear();
}

// Export default logger
export default functionLogger;
