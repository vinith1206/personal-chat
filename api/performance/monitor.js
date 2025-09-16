// Comprehensive Performance Monitoring API
// Tracks and analyzes performance metrics for all Vercel functions

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
  logPerformance,
  getPerformanceMetrics,
  getLogs
} from '../utils/logger.js';

// Performance monitoring with comprehensive tracking
const monitorPerformance = withErrorHandling(withTimeout(async (req, res) => {
  const startTime = Date.now();
  const functionName = 'GET /api/performance/monitor';
  
  try {
    logFunctionStart(functionName, req);

    const { timeframe = '1h', function: functionName, metric } = req.query;
    
    // Get performance data
    const performanceData = await getPerformanceData(timeframe, functionName, metric);
    
    // Analyze performance patterns
    const analysis = analyzePerformancePatterns(performanceData);
    
    // Generate performance insights
    const insights = generatePerformanceInsights(analysis);
    
    // Get recommendations
    const recommendations = generatePerformanceRecommendations(analysis);
    
    const response = {
      timestamp: new Date().toISOString(),
      timeframe,
      summary: {
        totalFunctions: performanceData.functions.length,
        averageResponseTime: analysis.averageResponseTime,
        slowestFunction: analysis.slowestFunction,
        fastestFunction: analysis.fastestFunction,
        memoryUsage: analysis.memoryUsage,
        errorRate: analysis.errorRate
      },
      performance: performanceData,
      analysis,
      insights,
      recommendations,
      health: {
        status: analysis.averageResponseTime > 5000 ? 'degraded' : 'healthy',
        score: calculatePerformanceScore(analysis)
      }
    };
    
    logFunctionEnd(functionName, startTime, req, { 
      averageResponseTime: analysis.averageResponseTime,
      performanceScore: response.health.score
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Performance-Score': response.health.score.toString(),
        'X-Average-Response-Time': analysis.averageResponseTime.toString()
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    logFunctionError(functionName, error, req);
    throw error;
  }
}, CONFIG.TIMEOUT_DURATION));

// Get performance data
async function getPerformanceData(timeframe, functionName, metric) {
  const logs = getLogs();
  const now = Date.now();
  const timeframeMs = getTimeframeMs(timeframe);
  
  // Filter logs by timeframe
  const filteredLogs = logs.filter(log => {
    const logTime = new Date(log.timestamp).getTime();
    return logTime > (now - timeframeMs);
  });
  
  // Filter by function name if specified
  const functionLogs = functionName 
    ? filteredLogs.filter(log => log.functionName === functionName)
    : filteredLogs;
  
  // Extract performance data
  const performanceData = {
    functions: [],
    metrics: {
      responseTime: [],
      memoryUsage: [],
      errorRate: [],
      throughput: []
    },
    timeSeries: []
  };
  
  // Group by function
  const functionGroups = {};
  functionLogs.forEach(log => {
    const funcName = log.functionName || 'unknown';
    if (!functionGroups[funcName]) {
      functionGroups[funcName] = [];
    }
    functionGroups[funcName].push(log);
  });
  
  // Process each function
  Object.entries(functionGroups).forEach(([funcName, logs]) => {
    const functionData = analyzeFunctionPerformance(funcName, logs);
    performanceData.functions.push(functionData);
    
    // Add to metrics
    if (functionData.averageResponseTime) {
      performanceData.metrics.responseTime.push(functionData.averageResponseTime);
    }
    if (functionData.averageMemoryUsage) {
      performanceData.metrics.memoryUsage.push(functionData.averageMemoryUsage);
    }
    if (functionData.errorRate) {
      performanceData.metrics.errorRate.push(functionData.errorRate);
    }
  });
  
  // Generate time series data
  performanceData.timeSeries = generateTimeSeriesData(functionLogs, timeframeMs);
  
  return performanceData;
}

// Analyze function performance
function analyzeFunctionPerformance(functionName, logs) {
  const functionData = {
    name: functionName,
    totalCalls: logs.length,
    successfulCalls: 0,
    failedCalls: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    averageMemoryUsage: 0,
    errorRate: 0,
    calls: []
  };
  
  let totalResponseTime = 0;
  let totalMemoryUsage = 0;
  let memoryCount = 0;
  
  logs.forEach(log => {
    // Count successful vs failed calls
    if (log.level === LOG_LEVELS.ERROR) {
      functionData.failedCalls++;
    } else {
      functionData.successfulCalls++;
    }
    
    // Response time analysis
    if (log.data?.duration) {
      const responseTime = parseInt(log.data.duration);
      functionData.calls.push({
        timestamp: log.timestamp,
        responseTime,
        success: log.level !== LOG_LEVELS.ERROR
      });
      
      totalResponseTime += responseTime;
      functionData.minResponseTime = Math.min(functionData.minResponseTime, responseTime);
      functionData.maxResponseTime = Math.max(functionData.maxResponseTime, responseTime);
    }
    
    // Memory usage analysis
    if (log.memoryUsage?.heapUsed) {
      totalMemoryUsage += log.memoryUsage.heapUsed;
      memoryCount++;
    }
  });
  
  // Calculate averages
  if (functionData.totalCalls > 0) {
    functionData.averageResponseTime = totalResponseTime / functionData.totalCalls;
    functionData.errorRate = (functionData.failedCalls / functionData.totalCalls) * 100;
  }
  
  if (memoryCount > 0) {
    functionData.averageMemoryUsage = totalMemoryUsage / memoryCount;
  }
  
  // Set min response time to 0 if no calls
  if (functionData.minResponseTime === Infinity) {
    functionData.minResponseTime = 0;
  }
  
  return functionData;
}

// Generate time series data
function generateTimeSeriesData(logs, timeframeMs) {
  const timeSeries = [];
  const interval = Math.max(timeframeMs / 60, 60000); // 1 minute intervals minimum
  const now = Date.now();
  
  for (let i = 0; i < 60; i++) {
    const startTime = now - (i + 1) * interval;
    const endTime = now - i * interval;
    
    const intervalLogs = logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= startTime && logTime < endTime;
    });
    
    const intervalData = {
      timestamp: new Date(startTime).toISOString(),
      calls: intervalLogs.length,
      averageResponseTime: 0,
      errorRate: 0
    };
    
    if (intervalLogs.length > 0) {
      const responseTimes = intervalLogs
        .filter(log => log.data?.duration)
        .map(log => parseInt(log.data.duration));
      
      if (responseTimes.length > 0) {
        intervalData.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }
      
      const errors = intervalLogs.filter(log => log.level === LOG_LEVELS.ERROR).length;
      intervalData.errorRate = (errors / intervalLogs.length) * 100;
    }
    
    timeSeries.push(intervalData);
  }
  
  return timeSeries.reverse();
}

// Analyze performance patterns
function analyzePerformancePatterns(performanceData) {
  const analysis = {
    averageResponseTime: 0,
    slowestFunction: null,
    fastestFunction: null,
    memoryUsage: {
      average: 0,
      peak: 0
    },
    errorRate: 0,
    trends: {
      responseTime: 'stable',
      memoryUsage: 'stable',
      errorRate: 'stable'
    }
  };
  
  if (performanceData.functions.length === 0) {
    return analysis;
  }
  
  // Calculate averages
  const responseTimes = performanceData.metrics.responseTime;
  const memoryUsages = performanceData.metrics.memoryUsage;
  const errorRates = performanceData.metrics.errorRate;
  
  if (responseTimes.length > 0) {
    analysis.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  }
  
  if (memoryUsages.length > 0) {
    analysis.memoryUsage.average = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    analysis.memoryUsage.peak = Math.max(...memoryUsages);
  }
  
  if (errorRates.length > 0) {
    analysis.errorRate = errorRates.reduce((a, b) => a + b, 0) / errorRates.length;
  }
  
  // Find slowest and fastest functions
  const sortedFunctions = performanceData.functions
    .filter(f => f.averageResponseTime > 0)
    .sort((a, b) => b.averageResponseTime - a.averageResponseTime);
  
  if (sortedFunctions.length > 0) {
    analysis.slowestFunction = sortedFunctions[0];
    analysis.fastestFunction = sortedFunctions[sortedFunctions.length - 1];
  }
  
  // Analyze trends
  analysis.trends = analyzeTrends(performanceData.timeSeries);
  
  return analysis;
}

// Analyze trends
function analyzeTrends(timeSeries) {
  const trends = {
    responseTime: 'stable',
    memoryUsage: 'stable',
    errorRate: 'stable'
  };
  
  if (timeSeries.length < 2) {
    return trends;
  }
  
  // Analyze response time trend
  const responseTimes = timeSeries.map(d => d.averageResponseTime).filter(t => t > 0);
  if (responseTimes.length >= 2) {
    const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
    const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.1) {
      trends.responseTime = 'increasing';
    } else if (secondAvg < firstAvg * 0.9) {
      trends.responseTime = 'decreasing';
    }
  }
  
  // Analyze error rate trend
  const errorRates = timeSeries.map(d => d.errorRate);
  if (errorRates.length >= 2) {
    const firstHalf = errorRates.slice(0, Math.floor(errorRates.length / 2));
    const secondHalf = errorRates.slice(Math.floor(errorRates.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.1) {
      trends.errorRate = 'increasing';
    } else if (secondAvg < firstAvg * 0.9) {
      trends.errorRate = 'decreasing';
    }
  }
  
  return trends;
}

// Generate performance insights
function generatePerformanceInsights(analysis) {
  const insights = [];
  
  // Response time insights
  if (analysis.averageResponseTime > 5000) {
    insights.push({
      type: 'warning',
      category: 'response_time',
      message: 'Average response time is high',
      value: `${analysis.averageResponseTime}ms`,
      recommendation: 'Consider optimizing function performance'
    });
  }
  
  // Memory usage insights
  if (analysis.memoryUsage.average > 500) {
    insights.push({
      type: 'warning',
      category: 'memory',
      message: 'High memory usage detected',
      value: `${analysis.memoryUsage.average}MB`,
      recommendation: 'Review memory usage and implement optimizations'
    });
  }
  
  // Error rate insights
  if (analysis.errorRate > 5) {
    insights.push({
      type: 'error',
      category: 'error_rate',
      message: 'High error rate detected',
      value: `${analysis.errorRate.toFixed(2)}%`,
      recommendation: 'Investigate and fix errors immediately'
    });
  }
  
  // Trend insights
  if (analysis.trends.responseTime === 'increasing') {
    insights.push({
      type: 'warning',
      category: 'trend',
      message: 'Response time is increasing',
      recommendation: 'Monitor performance and consider optimizations'
    });
  }
  
  if (analysis.trends.errorRate === 'increasing') {
    insights.push({
      type: 'error',
      category: 'trend',
      message: 'Error rate is increasing',
      recommendation: 'Investigate recent changes and fix issues'
    });
  }
  
  return insights;
}

// Generate performance recommendations
function generatePerformanceRecommendations(analysis) {
  const recommendations = [];
  
  // Response time recommendations
  if (analysis.averageResponseTime > 3000) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      message: 'Optimize function performance',
      actions: [
        'Review function code for inefficiencies',
        'Implement caching where appropriate',
        'Consider increasing timeout limits',
        'Use connection pooling for database operations'
      ]
    });
  }
  
  // Memory usage recommendations
  if (analysis.memoryUsage.average > 400) {
    recommendations.push({
      type: 'memory',
      priority: 'medium',
      message: 'Optimize memory usage',
      actions: [
        'Review memory leaks in function code',
        'Implement proper cleanup of resources',
        'Consider reducing data processing size',
        'Use streaming for large data operations'
      ]
    });
  }
  
  // Error rate recommendations
  if (analysis.errorRate > 3) {
    recommendations.push({
      type: 'reliability',
      priority: 'high',
      message: 'Improve error handling',
      actions: [
        'Implement comprehensive error handling',
        'Add retry logic for transient failures',
        'Use circuit breakers for external services',
        'Implement proper logging and monitoring'
      ]
    });
  }
  
  // General recommendations
  recommendations.push({
    type: 'general',
    priority: 'low',
    message: 'General performance improvements',
    actions: [
      'Implement performance monitoring',
      'Set up alerts for performance degradation',
      'Regular performance testing',
      'Code review for performance issues'
    ]
  });
  
  return recommendations;
}

// Calculate performance score
function calculatePerformanceScore(analysis) {
  let score = 100;
  
  // Deduct points for high response time
  if (analysis.averageResponseTime > 5000) {
    score -= 30;
  } else if (analysis.averageResponseTime > 3000) {
    score -= 15;
  }
  
  // Deduct points for high memory usage
  if (analysis.memoryUsage.average > 800) {
    score -= 25;
  } else if (analysis.memoryUsage.average > 500) {
    score -= 10;
  }
  
  // Deduct points for high error rate
  if (analysis.errorRate > 10) {
    score -= 40;
  } else if (analysis.errorRate > 5) {
    score -= 20;
  }
  
  // Deduct points for negative trends
  if (analysis.trends.responseTime === 'increasing') {
    score -= 10;
  }
  
  if (analysis.trends.errorRate === 'increasing') {
    score -= 15;
  }
  
  return Math.max(0, Math.min(100, score));
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
    const result = await monitorPerformance(req, res);
    return res.status(result.statusCode).json(JSON.parse(result.body));
    
  } catch (error) {
    logError('Performance monitoring handler failed', error, req);
    
    const errorResponse = {
      error: error.vercelErrorType || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Performance monitoring failed',
      timestamp: new Date().toISOString()
    };

    return res.status(error.statusCode || 500).json(errorResponse);
  }
}
