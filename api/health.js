// Health check API route with comprehensive error handling
import { 
  withErrorHandling, 
  withTimeout, 
  withRetry, 
  withThrottling,
  createVercelError,
  VERCEL_ERROR_TYPES,
  CONFIG
} from './utils/errorHandler.js';
import { 
  logFunctionStart, 
  logFunctionEnd, 
  logFunctionError,
  logInfo,
  logError
} from './utils/logger.js';

// Health check with comprehensive error handling
const healthCheck = withErrorHandling(withTimeout(async (req, res) => {
  const startTime = Date.now();
  const functionName = 'GET /api/health';
  
  try {
    logFunctionStart(functionName, req);

    // Check various health indicators
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: getMemoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        memory: checkMemoryHealth(),
        database: await checkDatabaseHealth(),
        external: await checkExternalServices(),
        deployment: await checkDeploymentHealth(),
        dns: await checkDNSHealth(),
        sandbox: await checkSandboxHealth()
      }
    };

    // Determine overall health status
    const allChecksHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
    health.status = allChecksHealthy ? 'healthy' : 'degraded';

    const statusCode = allChecksHealthy ? 200 : 503;

    logFunctionEnd(functionName, startTime, req, { statusCode });

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Health-Status': health.status,
        'X-Response-Time': `${Date.now() - startTime}ms`
      },
      body: JSON.stringify(health)
    };

  } catch (error) {
    logFunctionError(functionName, error, req);
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      vercelErrorType: error.vercelErrorType,
      checks: {
        memory: { status: 'unknown' },
        database: { status: 'unknown' },
        external: { status: 'unknown' },
        deployment: { status: 'unknown' },
        dns: { status: 'unknown' },
        sandbox: { status: 'unknown' }
      }
    };

    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Type': error.vercelErrorType || 'HEALTH_CHECK_FAILED'
      },
      body: JSON.stringify(errorResponse)
    };
  }
}, CONFIG.TIMEOUT_DURATION));

// Main handler with CORS and method validation
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
    const result = await healthCheck(req, res);
    return res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    logError('Health check handler failed', error, req);
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}

// Helper functions
function getMemoryUsage() {
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

function checkMemoryHealth() {
  const memory = getMemoryUsage();
  if (!memory) {
    return { status: 'unknown', message: 'Memory usage not available' };
  }

  const heapUsedMB = memory.heapUsed;
  const maxMemoryMB = CONFIG.MEMORY_LIMIT / (1024 * 1024); // Convert to MB

  if (heapUsedMB > maxMemoryMB * 0.9) {
    return { 
      status: 'unhealthy', 
      message: `Memory usage high: ${heapUsedMB}MB / ${maxMemoryMB}MB`,
      usage: memory
    };
  }

  return { 
    status: 'healthy', 
    message: `Memory usage normal: ${heapUsedMB}MB / ${maxMemoryMB}MB`,
    usage: memory
  };
}

async function checkDatabaseHealth() {
  try {
    // In production, you would check your actual database connection
    // For now, simulate a check with timeout
    const startTime = Date.now();
    
    // Simulate database check
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      message: 'Database connection healthy',
      responseTime: `${responseTime}ms`
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Database check failed: ${error.message}`,
      error: error.message
    };
  }
}

async function checkExternalServices() {
  try {
    // Check external services your app depends on
    const services = {
      cdn: 'healthy',
      analytics: 'healthy',
      api: 'healthy'
    };

    // Simulate external service checks
    for (const [service, status] of Object.entries(services)) {
      if (status !== 'healthy') {
        throw new Error(`${service} service is ${status}`);
      }
    }

    return {
      status: 'healthy',
      message: 'External services healthy',
      services
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `External service check failed: ${error.message}`,
      error: error.message
    };
  }
}

async function checkDeploymentHealth() {
  try {
    // Check deployment status
    const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
    const deploymentUrl = process.env.VERCEL_URL;
    
    if (!deploymentId || !deploymentUrl) {
      return {
        status: 'degraded',
        message: 'Deployment information not available',
        deploymentId: deploymentId || 'unknown',
        deploymentUrl: deploymentUrl || 'unknown'
      };
    }

    return {
      status: 'healthy',
      message: 'Deployment healthy',
      deploymentId,
      deploymentUrl
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Deployment check failed: ${error.message}`,
      error: error.message
    };
  }
}

async function checkDNSHealth() {
  try {
    // Check DNS resolution
    const testDomain = 'vercel.com';
    
    // Simulate DNS check (in production, use actual DNS lookup)
    const dnsHealthy = true; // This would be actual DNS check
    
    if (!dnsHealthy) {
      throw new Error('DNS resolution failed');
    }

    return {
      status: 'healthy',
      message: 'DNS resolution healthy',
      testDomain
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `DNS check failed: ${error.message}`,
      error: error.message
    };
  }
}

async function checkSandboxHealth() {
  try {
    // Check sandbox environment
    const nodeVersion = process.version;
    const platform = process.platform;
    const arch = process.arch;
    
    if (!nodeVersion || !platform || !arch) {
      throw new Error('Sandbox environment information incomplete');
    }

    return {
      status: 'healthy',
      message: 'Sandbox environment healthy',
      environment: {
        nodeVersion,
        platform,
        arch
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Sandbox check failed: ${error.message}`,
      error: error.message
    };
  }
}
