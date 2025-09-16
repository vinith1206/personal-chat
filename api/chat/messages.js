// Chat messages API route for Vercel serverless functions
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
    if (req.method === 'GET') {
      return await getMessages(req, res);
    } else if (req.method === 'POST') {
      return await createMessage(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Messages API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
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
