// Logging API route
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

// POST /api/logs - Log client-side events
export const POST = withTimeout(async (request) => {
  const startTime = Date.now();
  const functionName = 'POST /api/logs';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();
    validatePayloadSize(request);

    const body = await request.json();
    const { level, message, data, timestamp } = body;

    // Validate required fields
    if (!level || !message) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Level and message are required',
        400
      );
    }

    // Validate log level
    const validLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    if (!validLevels.includes(level.toUpperCase())) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Invalid log level',
        400
      );
    }

    // Log the event
    const logData = {
      level: level.toUpperCase(),
      message,
      data,
      timestamp: timestamp || new Date().toISOString(),
      source: 'client',
      ip: request.headers.get('x-forwarded-for') || request.ip,
      userAgent: request.headers.get('user-agent')
    };

    // Log based on level
    switch (level.toUpperCase()) {
      case 'ERROR':
        logError(message, new Error(message), logData);
        break;
      case 'WARN':
        logInfo(`[WARN] ${message}`, logData);
        break;
      case 'INFO':
        logInfo(message, logData);
        break;
      case 'DEBUG':
        logInfo(`[DEBUG] ${message}`, logData);
        break;
    }

    const response = NextResponse.json({
      success: true,
      message: 'Log entry created successfully'
    });

    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to log client event', error, request);
    return handleApiError(error, request);
  }
}, 5000); // 5 second timeout
