// Chat messages API route with comprehensive error handling
import { NextRequest, NextResponse } from 'next/server';
import { 
  withTimeout, 
  validatePayloadSize, 
  validateResponseSize,
  handleApiError,
  createError,
  ERROR_TYPES,
  checkMemoryUsage,
  detectInfiniteLoop
} from '../../utils/errorHandler.js';
import { 
  logFunctionStart, 
  logFunctionEnd, 
  logError, 
  logInfo,
  logPerformance 
} from '../../utils/logger.js';

// Mock database connection (replace with your actual database)
const messages = new Map();
const rooms = new Map();

// GET /api/chat/messages?roomId=xxx
export async function GET(request) {
  const startTime = Date.now();
  const functionName = 'GET /api/chat/messages';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();
    
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    
    if (!roomId) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Room ID is required',
        400
      );
    }

    // Validate room exists
    if (!rooms.has(roomId)) {
      throw createError(
        ERROR_TYPES.NOT_FOUND,
        'Room not found',
        404,
        { roomId }
      );
    }

    // Get messages for room
    const roomMessages = messages.get(roomId) || [];
    
    // Sort by timestamp (newest first)
    const sortedMessages = roomMessages.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    const response = NextResponse.json({
      success: true,
      messages: sortedMessages,
      count: sortedMessages.length,
      roomId
    });

    validateResponseSize(response);
    
    logPerformance(functionName, startTime, Date.now(), request, {
      messageCount: sortedMessages.length,
      roomId
    });
    
    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to get messages', error, request);
    return handleApiError(error, request);
  }
}

// POST /api/chat/messages
export const POST = withTimeout(async (request) => {
  const startTime = Date.now();
  const functionName = 'POST /api/chat/messages';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();
    validatePayloadSize(request);

    const body = await request.json();
    const { roomId, text, attachments, senderName } = body;

    // Validation
    if (!roomId || !senderName) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Room ID and sender name are required',
        400
      );
    }

    if (!text && (!attachments || attachments.length === 0)) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Message content is required',
        400
      );
    }

    // Validate text length
    if (text && text.length > 4000) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Message text too long (max 4000 characters)',
        400
      );
    }

    // Validate attachments
    if (attachments && attachments.length > 10) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Too many attachments (max 10)',
        400
      );
    }

    // Create message
    const message = {
      id: crypto.randomUUID(),
      roomId,
      text: text || '',
      attachments: attachments || [],
      senderName,
      timestamp: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      reactions: []
    };

    // Store message
    if (!messages.has(roomId)) {
      messages.set(roomId, []);
    }
    messages.get(roomId).push(message);

    // Ensure room exists
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        name: `Room ${roomId}`,
        createdAt: new Date().toISOString()
      });
    }

    const response = NextResponse.json({
      success: true,
      message,
      roomId
    });

    validateResponseSize(response);
    
    logPerformance(functionName, startTime, Date.now(), request, {
      messageId: message.id,
      roomId,
      hasAttachments: attachments && attachments.length > 0
    });
    
    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to create message', error, request);
    return handleApiError(error, request);
  }
}, 10000); // 10 second timeout

// PUT /api/chat/messages/[id]
export async function PUT(request, { params }) {
  const startTime = Date.now();
  const functionName = 'PUT /api/chat/messages';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();
    validatePayloadSize(request);

    const { id } = params;
    const body = await request.json();
    const { text, senderName } = body;

    if (!id) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Message ID is required',
        400
      );
    }

    if (!text) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Message text is required',
        400
      );
    }

    // Find message
    let message = null;
    let roomId = null;
    
    for (const [room, roomMessages] of messages.entries()) {
      const foundMessage = roomMessages.find(m => m.id === id);
      if (foundMessage) {
        message = foundMessage;
        roomId = room;
        break;
      }
    }

    if (!message) {
      throw createError(
        ERROR_TYPES.NOT_FOUND,
        'Message not found',
        404,
        { messageId: id }
      );
    }

    // Check if user can edit (basic authorization)
    if (message.senderName !== senderName) {
      throw createError(
        ERROR_TYPES.AUTHORIZATION_ERROR,
        'Not authorized to edit this message',
        403,
        { messageId: id, senderName }
      );
    }

    // Update message
    message.text = text;
    message.editedAt = new Date().toISOString();

    const response = NextResponse.json({
      success: true,
      message
    });

    validateResponseSize(response);
    
    logPerformance(functionName, startTime, Date.now(), request, {
      messageId: id,
      roomId
    });
    
    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to update message', error, request);
    return handleApiError(error, request);
  }
}

// DELETE /api/chat/messages/[id]
export async function DELETE(request, { params }) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/chat/messages';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const senderName = searchParams.get('senderName');

    if (!id) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Message ID is required',
        400
      );
    }

    if (!senderName) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Sender name is required',
        400
      );
    }

    // Find message
    let message = null;
    let roomId = null;
    
    for (const [room, roomMessages] of messages.entries()) {
      const foundMessage = roomMessages.find(m => m.id === id);
      if (foundMessage) {
        message = foundMessage;
        roomId = room;
        break;
      }
    }

    if (!message) {
      throw createError(
        ERROR_TYPES.NOT_FOUND,
        'Message not found',
        404,
        { messageId: id }
      );
    }

    // Check if user can delete (basic authorization)
    if (message.senderName !== senderName) {
      throw createError(
        ERROR_TYPES.AUTHORIZATION_ERROR,
        'Not authorized to delete this message',
        403,
        { messageId: id, senderName }
      );
    }

    // Soft delete
    message.deletedAt = new Date().toISOString();
    message.text = '[Message deleted]';
    message.attachments = [];

    const response = NextResponse.json({
      success: true,
      message
    });

    validateResponseSize(response);
    
    logPerformance(functionName, startTime, Date.now(), request, {
      messageId: id,
      roomId
    });
    
    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to delete message', error, request);
    return handleApiError(error, request);
  }
}
