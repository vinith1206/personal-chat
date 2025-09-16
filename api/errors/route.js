// Error logging API route
import { NextRequest, NextResponse } from 'next/server';
import { 
  withTimeout, 
  validatePayloadSize, 
  handleApiError,
  createError,
  ERROR_TYPES,
  checkMemoryUsage,
  detectInfiniteLoop
} from '../utils/errorHandler.js';
import { 
  logFunctionStart, 
  logFunctionEnd, 
  logError, 
  logInfo 
} from '../utils/logger.js';

// POST /api/errors - Log client-side errors
export const POST = withTimeout(async (request) => {
  const startTime = Date.now();
  const functionName = 'POST /api/errors';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();
    validatePayloadSize(request);

    const body = await request.json();
    const { error, errorInfo, userAgent, url, timestamp, userId } = body;

    // Validate required fields
    if (!error || !error.message) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Error message is required',
        400
      );
    }

    // Log the error
    logError('Client-side error received', new Error(error.message), {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo,
      userAgent,
      url,
      timestamp,
      userId,
      ip: request.headers.get('x-forwarded-for') || request.ip
    });

    // In production, you would store this in a database or send to external service
    // For now, we'll just log it

    const response = NextResponse.json({
      success: true,
      message: 'Error logged successfully'
    });

    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to log client error', error, request);
    return handleApiError(error, request);
  }
}, 5000); // 5 second timeout

// GET /api/errors - Get error statistics (admin only)
export async function GET(request) {
  const startTime = Date.now();
  const functionName = 'GET /api/errors';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();

    // In production, you would fetch from database
    // For now, return mock data
    const errorStats = {
      totalErrors: 0,
      errorsByType: {},
      recentErrors: [],
      lastUpdated: new Date().toISOString()
    };

    const response = NextResponse.json({
      success: true,
      stats: errorStats
    });

    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to get error stats', error, request);
    return handleApiError(error, request);
  }
}
