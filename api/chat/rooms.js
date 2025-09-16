// Chat rooms API route for Vercel serverless functions
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
      return await getRooms(req, res);
    } else if (req.method === 'POST') {
      return await createRoom(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Rooms API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// Mock database (replace with your actual database)
const rooms = new Map();

// Initialize default rooms
if (rooms.size === 0) {
  rooms.set('general', { 
    id: 'general', 
    name: 'General', 
    isPrivate: false,
    createdAt: new Date().toISOString()
  });
  rooms.set('memes', { 
    id: 'memes', 
    name: 'Memes', 
    isPrivate: false,
    createdAt: new Date().toISOString()
  });
  rooms.set('random', { 
    id: 'random', 
    name: 'Random', 
    isPrivate: false,
    createdAt: new Date().toISOString()
  });
}

async function getRooms(req, res) {
  const roomList = Array.from(rooms.values());
  
  return res.status(200).json({
    rooms: roomList,
    count: roomList.length
  });
}

async function createRoom(req, res) {
  const { name, createdBy, isPrivate = false } = req.body;
  
  if (!name || !createdBy) {
    return res.status(400).json({ 
      error: 'Room name and creator are required' 
    });
  }

  // Generate room ID and invite code
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();

  // Create new room
  const room = {
    id: roomId,
    name,
    createdBy,
    isPrivate,
    inviteCode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Store room
  rooms.set(roomId, room);

  return res.status(201).json({
    room,
    success: true
  });
}
