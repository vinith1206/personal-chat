// Chat messages API route with comprehensive error handling
import { 
  withErrorHandling, 
  withTimeout, 
  withRetry, 
  withThrottling,
  withCircuitBreaker,
  validatePayloadSize,
  validateResponseSize,
  createVercelError,
  VERCEL_ERROR_TYPES,
  CONFIG
} from '../utils/errorHandler.js';
import { 
  logFunctionStart, 
  logFunctionEnd, 
  logFunctionError,
  logInfo,
  logError,
  logRequestEvent,
  logResponseEvent
} from '../utils/logger.js';

// Chat messages with comprehensive error handling
const getMessages = withErrorHandling(withTimeout(async (req, res) => {
  const startTime = Date.now();
  const functionName = 'GET /api/chat/messages';
  
  try {
    logFunctionStart(functionName, req);
    logRequestEvent('get-messages', { url: req.url, query: req.query });

    const { roomId } = req.query;
    
    if (!roomId) {
      throw createVercelError('RESOURCE_NOT_FOUND', 'Room ID is required');
    }

    // Validate room exists
    if (!rooms.has(roomId)) {
      throw createVercelError('RESOURCE_NOT_FOUND', 'Room not found');
    }

    // Get messages for the room
    const roomMessages = messages.get(roomId) || [];
    
    // Validate response size
    const response = {
      messages: roomMessages,
      roomId,
      count: roomMessages.length,
      timestamp: new Date().toISOString()
    };
    
    validateResponseSize(response);
    
    logResponseEvent('get-messages-success', { 
      roomId, 
      messageCount: roomMessages.length,
      duration: Date.now() - startTime
    });
    
    logFunctionEnd(functionName, startTime, req, { messageCount: roomMessages.length });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Message-Count': roomMessages.length.toString(),
        'X-Room-ID': roomId
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    logFunctionError(functionName, error, req);
    throw error;
  }
}, CONFIG.TIMEOUT_DURATION));

const createMessage = withErrorHandling(withTimeout(async (req, res) => {
  const startTime = Date.now();
  const functionName = 'POST /api/chat/messages';
  
  try {
    logFunctionStart(functionName, req);
    logRequestEvent('create-message', { url: req.url, body: req.body });

    const { roomId, text, senderName, attachments = [] } = req.body;
    
    if (!roomId || !text || !senderName) {
      throw createVercelError('RESOURCE_NOT_FOUND', 'Room ID, text, and sender name are required');
    }

    // Validate payload size
    validatePayloadSize(req.body);

    // Validate room exists
    if (!rooms.has(roomId)) {
      throw createVercelError('RESOURCE_NOT_FOUND', 'Room not found');
    }

    // Validate message content
    if (text.length > 10000) { // 10KB limit
      throw createVercelError('FUNCTION_PAYLOAD_TOO_LARGE', 'Message text too long');
    }

    // Create new message
    const message = {
      _id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      text,
      senderName,
      attachments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store message
    const roomMessages = messages.get(roomId) || [];
    roomMessages.push(message);
    messages.set(roomId, roomMessages);

    const response = {
      message,
      success: true,
      timestamp: new Date().toISOString()
    };
    
    validateResponseSize(response);
    
    logResponseEvent('create-message-success', { 
      roomId, 
      messageId: message._id,
      duration: Date.now() - startTime
    });
    
    logFunctionEnd(functionName, startTime, req, { messageId: message._id });

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'X-Message-ID': message._id,
        'X-Room-ID': roomId
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    logFunctionError(functionName, error, req);
    throw error;
  }
}, CONFIG.TIMEOUT_DURATION));

// Main handler with comprehensive error handling
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate method
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ 
      error: 'INVALID_REQUEST_METHOD', 
      message: 'Only GET and POST methods allowed' 
    });
  }

  try {
    let result;
    
    if (req.method === 'GET') {
      result = await getMessages(req, res);
    } else if (req.method === 'POST') {
      result = await createMessage(req, res);
    }

    return res.status(result.statusCode).json(JSON.parse(result.body));
    
  } catch (error) {
    logError('Messages API handler failed', error, req);
    
    const errorResponse = {
      error: error.vercelErrorType || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    };

    return res.status(error.statusCode || 500).json(errorResponse);
  }
}

// Mock database (replace with your actual database)
const messages = new Map();
const rooms = new Map();

// Initialize default rooms
if (rooms.size === 0) {
  rooms.set('general', { id: 'general', name: 'General', isPrivate: false });
  rooms.set('memes', { id: 'memes', name: 'Memes', isPrivate: false });
  rooms.set('random', { id: 'random', name: 'Random', isPrivate: false });
}

async function getMessages(req, res) {
  const { roomId } = req.query;
  
  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  // Validate room exists
  if (!rooms.has(roomId)) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Get messages for the room
  const roomMessages = messages.get(roomId) || [];
  
  return res.status(200).json({
    messages: roomMessages,
    roomId,
    count: roomMessages.length
  });
}

async function createMessage(req, res) {
  const { roomId, text, senderName, attachments = [] } = req.body;
  
  if (!roomId || !text || !senderName) {
    return res.status(400).json({ 
      error: 'Room ID, text, and sender name are required' 
    });
  }

  // Validate room exists
  if (!rooms.has(roomId)) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Create new message
  const message = {
    _id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    roomId,
    text,
    senderName,
    attachments,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Store message
  const roomMessages = messages.get(roomId) || [];
  roomMessages.push(message);
  messages.set(roomId, roomMessages);

  return res.status(201).json({
    message,
    success: true
  });
}
