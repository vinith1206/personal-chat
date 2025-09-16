// Comprehensive Error Monitoring API
// Provides real-time error tracking and analysis for all Vercel error types

import { 
  withErrorHandling, 
  withTimeout, 
  createVercelError,
  VERCEL_ERROR_TYPES,
  CONFIG
} from '../utils/errorHandler.js';
import { 
  logFunctionStart, 
  logFunctionEnd, 
  logFunctionError,
  logError,
  getLogs,
  getErrorCounts,
  getPerformanceMetrics
} from '../utils/logger.js';

// Error monitoring with comprehensive tracking
const monitorErrors = withErrorHandling(withTimeout(async (req, res) => {
  const startTime = Date.now();
  const functionName = 'GET /api/errors/monitor';
  
  try {
    logFunctionStart(functionName, req);

    const { type, category, limit = 100, timeframe = '1h' } = req.query;
    
    // Get error data
    const errorData = await getErrorData(type, category, limit, timeframe);
    
    // Get performance metrics
    const performanceData = getPerformanceMetrics();
    
    // Get error counts
    const errorCounts = getErrorCounts();
    
    // Analyze error patterns
    const analysis = analyzeErrorPatterns(errorData);
    
    // Generate recommendations
    const recommendations = generateRecommendations(analysis, errorCounts);
    
    const response = {
      timestamp: new Date().toISOString(),
      timeframe,
      summary: {
        totalErrors: errorData.length,
        errorTypes: Object.keys(errorCounts).length,
        criticalErrors: analysis.criticalErrors,
        performanceIssues: analysis.performanceIssues
      },
      errors: errorData,
      errorCounts,
      performance: performanceData,
      analysis,
      recommendations,
      health: {
        status: analysis.criticalErrors > 0 ? 'degraded' : 'healthy',
        score: calculateHealthScore(analysis, errorCounts)
      }
    };
    
    logFunctionEnd(functionName, startTime, req, { 
      totalErrors: errorData.length,
      healthScore: response.health.score
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Count': errorData.length.toString(),
        'X-Health-Score': response.health.score.toString()
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    logFunctionError(functionName, error, req);
    throw error;
  }
}, CONFIG.TIMEOUT_DURATION));

// Get error data based on filters
async function getErrorData(type, category, limit, timeframe) {
  const logs = getLogs();
  const now = Date.now();
  const timeframeMs = getTimeframeMs(timeframe);
  
  let filteredLogs = logs.filter(log => {
    const logTime = new Date(log.timestamp).getTime();
    return logTime > (now - timeframeMs);
  });
  
  if (type) {
    filteredLogs = filteredLogs.filter(log => log.level === LOG_LEVELS[type]);
  }
  
  if (category) {
    filteredLogs = filteredLogs.filter(log => log.category === category);
  }
  
  return filteredLogs.slice(-limit);
}

// Get timeframe in milliseconds
function getTimeframeMs(timeframe) {
  const timeframes = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  };
  
  return timeframes[timeframe] || timeframes['1h'];
}

// Analyze error patterns
function analyzeErrorPatterns(errorData) {
  const analysis = {
    criticalErrors: 0,
    performanceIssues: 0,
    errorTrends: {},
    topErrors: [],
    errorDistribution: {},
    timeDistribution: {}
  };
  
  // Count critical errors
  analysis.criticalErrors = errorData.filter(log => 
    log.level === LOG_LEVELS.ERROR && 
    log.data?.vercelErrorType && 
    isCriticalError(log.data.vercelErrorType)
  ).length;
  
  // Count performance issues
  analysis.performanceIssues = errorData.filter(log => 
    log.data?.duration && parseInt(log.data.duration) > 5000
  ).length;
  
  // Analyze error trends
  errorData.forEach(log => {
    const errorType = log.data?.vercelErrorType || 'UNKNOWN';
    analysis.errorTrends[errorType] = (analysis.errorTrends[errorType] || 0) + 1;
  });
  
  // Get top errors
  analysis.topErrors = Object.entries(analysis.errorTrends)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([errorType, count]) => ({ errorType, count }));
  
  // Error distribution by category
  errorData.forEach(log => {
    analysis.errorDistribution[log.category] = (analysis.errorDistribution[log.category] || 0) + 1;
  });
  
  // Time distribution
  errorData.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    analysis.timeDistribution[hour] = (analysis.timeDistribution[hour] || 0) + 1;
  });
  
  return analysis;
}

// Check if error is critical
function isCriticalError(errorType) {
  const criticalErrors = [
    'FUNCTION_INVOCATION_FAILED',
    'FUNCTION_INVOCATION_TIMEOUT',
    'DEPLOYMENT_NOT_FOUND',
    'DNS_HOSTNAME_NOT_FOUND',
    'INFINITE_LOOP_DETECTED',
    'SANDBOX_NOT_LISTENING'
  ];
  
  return criticalErrors.includes(errorType);
}

// Generate recommendations
function generateRecommendations(analysis, errorCounts) {
  const recommendations = [];
  
  // High error rate
  if (analysis.criticalErrors > 10) {
    recommendations.push({
      type: 'critical',
      message: 'High critical error rate detected',
      action: 'Review error logs and implement fixes immediately'
    });
  }
  
  // Performance issues
  if (analysis.performanceIssues > 5) {
    recommendations.push({
      type: 'performance',
      message: 'Performance issues detected',
      action: 'Optimize slow functions and consider increasing timeout limits'
    });
  }
  
  // Specific error type recommendations
  Object.entries(errorCounts).forEach(([errorType, count]) => {
    if (count > 5) {
      const recommendation = getErrorRecommendation(errorType);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }
  });
  
  return recommendations;
}

// Get specific error recommendations
function getErrorRecommendation(errorType) {
  const recommendations = {
    'FUNCTION_INVOCATION_FAILED': {
      type: 'function',
      message: 'Function invocation failures detected',
      action: 'Check function code for errors and implement proper error handling'
    },
    'FUNCTION_INVOCATION_TIMEOUT': {
      type: 'function',
      message: 'Function timeouts detected',
      action: 'Optimize function performance or increase timeout limits'
    },
    'FUNCTION_PAYLOAD_TOO_LARGE': {
      type: 'function',
      message: 'Payload size exceeded',
      action: 'Implement payload validation and size limits'
    },
    'FUNCTION_THROTTLED': {
      type: 'function',
      message: 'Function throttling detected',
      action: 'Implement rate limiting and consider upgrading plan'
    },
    'DEPLOYMENT_NOT_FOUND': {
      type: 'deployment',
      message: 'Deployment not found errors',
      action: 'Check deployment status and ensure proper configuration'
    },
    'DNS_HOSTNAME_NOT_FOUND': {
      type: 'dns',
      message: 'DNS resolution failures',
      action: 'Check DNS configuration and domain settings'
    }
  };
  
  return recommendations[errorType];
}

// Calculate health score
function calculateHealthScore(analysis, errorCounts) {
  let score = 100;
  
  // Deduct points for critical errors
  score -= analysis.criticalErrors * 10;
  
  // Deduct points for performance issues
  score -= analysis.performanceIssues * 5;
  
  // Deduct points for high error counts
  Object.values(errorCounts).forEach(count => {
    if (count > 10) {
      score -= 5;
    }
  });
  
  return Math.max(0, Math.min(100, score));
}

// Main handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate method
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'INVALID_REQUEST_METHOD', 
      message: 'Only GET method allowed' 
    });
  }

  try {
    const result = await monitorErrors(req, res);
    return res.status(result.statusCode).json(JSON.parse(result.body));
    
  } catch (error) {
    logError('Error monitoring handler failed', error, req);
    
    const errorResponse = {
      error: error.vercelErrorType || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error monitoring failed',
      timestamp: new Date().toISOString()
    };

    return res.status(error.statusCode || 500).json(errorResponse);
  }
}
