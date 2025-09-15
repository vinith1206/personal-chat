import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from '../routes/auth.js';
import chatRoutes from '../routes/chat.js';
import { authSocketMiddleware } from '../middleware/authSocket.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
	cors: {
		origin: process.env.CLIENT_ORIGIN || '*',
		methods: ['GET', 'POST']
	}
});

io.use(authSocketMiddleware);

const onlineUsers = new Map(); // socketId -> { id, name }

function broadcastPresence() {
	io.emit('presence:list', { users: Array.from(onlineUsers.values()) });
}

io.on('connection', (socket) => {
	onlineUsers.set(socket.id, { id: socket.id, name: socket.user?.name || 'Guest' });
	broadcastPresence();

	socket.join(socket.user.id);
	socket.on('joinRoom', (roomId) => {
		socket.join(roomId);
	});
	socket.on('typing', ({ roomId, isTyping }) => {
		socket.to(roomId).emit('typing', { userId: socket.user.id, isTyping });
	});

	socket.on('disconnect', () => {
		onlineUsers.delete(socket.id);
		broadcastPresence();
	});
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (_req, res) => res.json({ ok: true, service: 'private-chat-backend', endpoints: ['/health', '/api/auth/*', '/api/chat/*'] }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes(io));

const PORT = process.env.PORT || 4000;

async function connectMongo() {
	try {
		await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
		console.log('Connected to MongoDB');
		return;
	} catch (err) {
		console.warn('MongoDB connection failed, starting in-memory server...', err.message || err);
		const mem = await MongoMemoryServer.create();
		const uri = mem.getUri();
		await mongoose.connect(uri);
		console.log('Connected to in-memory MongoDB');
	}
}

async function start() {
	try {
		await connectMongo();
		server.listen(PORT, () => console.log(`Server listening on :${PORT}`));
	} catch (err) {
		console.error('Failed to start server', err);
		process.exit(1);
	}
}

start();
