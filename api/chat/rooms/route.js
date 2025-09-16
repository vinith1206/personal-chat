// Chat rooms API route with comprehensive error handling
import { NextRequest, NextResponse } from 'next/server';
import { 
  withTimeout, 
  validatePayloadSize, 
  validateResponseSize,
  handleApiError,
  createError,
  ERROR_TYPES,
  checkMemoryUsage,
  detectInfiniteLoop,
  callExternalAPI
} from '../../utils/errorHandler.js';
import { 
  logFunctionStart, 
  logFunctionEnd, 
  logError, 
  logInfo,
  logPerformance 
} from '../../utils/logger.js';

// Mock database (replace with your actual database)
const rooms = new Map();
const invites = new Map();

// GET /api/chat/rooms
export async function GET(request) {
  const startTime = Date.now();
  const functionName = 'GET /api/chat/rooms';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';

    const roomList = Array.from(rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      createdAt: room.createdAt,
      ...(includeStats && {
        messageCount: room.messageCount || 0,
        lastActivity: room.lastActivity || room.createdAt
      })
    }));

    const response = NextResponse.json({
      success: true,
      rooms: roomList,
      count: roomList.length
    });

    validateResponseSize(response);
    
    logPerformance(functionName, startTime, Date.now(), request, {
      roomCount: roomList.length,
      includeStats
    });
    
    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to get rooms', error, request);
    return handleApiError(error, request);
  }
}

// POST /api/chat/rooms
export const POST = withTimeout(async (request) => {
  const startTime = Date.now();
  const functionName = 'POST /api/chat/rooms';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();
    validatePayloadSize(request);

    const body = await request.json();
    const { name, createdBy, isPrivate = false } = body;

    // Validation
    if (!name || name.trim().length === 0) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Room name is required',
        400
      );
    }

    if (name.length > 100) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Room name too long (max 100 characters)',
        400
      );
    }

    if (!createdBy) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Creator name is required',
        400
      );
    }

    // Check for duplicate room names
    const existingRoom = Array.from(rooms.values()).find(room => 
      room.name.toLowerCase() === name.toLowerCase()
    );

    if (existingRoom) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Room name already exists',
        409,
        { roomName: name }
      );
    }

    // Create room
    const roomId = crypto.randomUUID();
    const room = {
      id: roomId,
      name: name.trim(),
      createdBy,
      isPrivate,
      createdAt: new Date().toISOString(),
      messageCount: 0,
      lastActivity: new Date().toISOString()
    };

    rooms.set(roomId, room);

    // Create invite code if private
    let inviteCode = null;
    if (isPrivate) {
      inviteCode = generateInviteCode();
      invites.set(inviteCode, {
        roomId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });
    }

    const response = NextResponse.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        createdBy: room.createdBy,
        isPrivate: room.isPrivate,
        createdAt: room.createdAt,
        ...(inviteCode && { inviteCode })
      }
    });

    validateResponseSize(response);
    
    logPerformance(functionName, startTime, Date.now(), request, {
      roomId,
      roomName: room.name,
      isPrivate,
      hasInviteCode: !!inviteCode
    });
    
    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to create room', error, request);
    return handleApiError(error, request);
  }
}, 15000); // 15 second timeout

// PUT /api/chat/rooms/[id]
export async function PUT(request, { params }) {
  const startTime = Date.now();
  const functionName = 'PUT /api/chat/rooms';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();
    validatePayloadSize(request);

    const { id } = params;
    const body = await request.json();
    const { name, updatedBy } = body;

    if (!id) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Room ID is required',
        400
      );
    }

    if (!name || name.trim().length === 0) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Room name is required',
        400
      );
    }

    if (name.length > 100) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Room name too long (max 100 characters)',
        400
      );
    }

    if (!updatedBy) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Updater name is required',
        400
      );
    }

    const room = rooms.get(id);
    if (!room) {
      throw createError(
        ERROR_TYPES.NOT_FOUND,
        'Room not found',
        404,
        { roomId: id }
      );
    }

    // Check authorization (basic check)
    if (room.createdBy !== updatedBy) {
      throw createError(
        ERROR_TYPES.AUTHORIZATION_ERROR,
        'Not authorized to update this room',
        403,
        { roomId: id, updatedBy }
      );
    }

    // Check for duplicate names
    const existingRoom = Array.from(rooms.values()).find(r => 
      r.id !== id && r.name.toLowerCase() === name.toLowerCase()
    );

    if (existingRoom) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Room name already exists',
        409,
        { roomName: name }
      );
    }

    // Update room
    room.name = name.trim();
    room.updatedAt = new Date().toISOString();
    room.updatedBy = updatedBy;

    const response = NextResponse.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        createdBy: room.createdBy,
        isPrivate: room.isPrivate,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        updatedBy: room.updatedBy
      }
    });

    validateResponseSize(response);
    
    logPerformance(functionName, startTime, Date.now(), request, {
      roomId: id,
      newName: room.name
    });
    
    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to update room', error, request);
    return handleApiError(error, request);
  }
}

// DELETE /api/chat/rooms/[id]
export async function DELETE(request, { params }) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/chat/rooms';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const deletedBy = searchParams.get('deletedBy');

    if (!id) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Room ID is required',
        400
      );
    }

    if (!deletedBy) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Deleter name is required',
        400
      );
    }

    const room = rooms.get(id);
    if (!room) {
      throw createError(
        ERROR_TYPES.NOT_FOUND,
        'Room not found',
        404,
        { roomId: id }
      );
    }

    // Check authorization
    if (room.createdBy !== deletedBy) {
      throw createError(
        ERROR_TYPES.AUTHORIZATION_ERROR,
        'Not authorized to delete this room',
        403,
        { roomId: id, deletedBy }
      );
    }

    // Soft delete
    room.deletedAt = new Date().toISOString();
    room.deletedBy = deletedBy;
    room.name = `[Deleted Room] ${room.name}`;

    // Remove from active rooms
    rooms.delete(id);

    const response = NextResponse.json({
      success: true,
      message: 'Room deleted successfully',
      roomId: id
    });

    validateResponseSize(response);
    
    logPerformance(functionName, startTime, Date.now(), request, {
      roomId: id,
      roomName: room.name
    });
    
    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to delete room', error, request);
    return handleApiError(error, request);
  }
}

// Helper function to generate invite codes
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
