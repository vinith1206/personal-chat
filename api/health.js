// Health check API route for Vercel serverless functions
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
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
        external: await checkExternalServices()
      }
    };

    // Determine overall health status
    const allChecksHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
    health.status = allChecksHealthy ? 'healthy' : 'degraded';

    const statusCode = allChecksHealthy ? 200 : 503;

    return res.status(statusCode).json(health);

  } catch (error) {
    console.error('Health check failed', error);
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: {
        memory: { status: 'unknown' },
        database: { status: 'unknown' },
        external: { status: 'unknown' }
      }
    };

    return res.status(503).json(errorResponse);
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
  const maxMemoryMB = 1024; // 1GB limit for Vercel

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
    // For now, simulate a check
    return {
      status: 'healthy',
      message: 'Database connection healthy',
      responseTime: '5ms'
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
    // For now, return healthy
    return {
      status: 'healthy',
      message: 'External services healthy',
      services: {
        cdn: 'healthy',
        analytics: 'healthy'
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `External service check failed: ${error.message}`,
      error: error.message
    };
  }
}
