import mongoose from 'mongoose';
import Message from '../models/Message.js';
import { nanoid } from 'nanoid';

// Rooms with invite codes
const rooms = new Map(); // roomId -> { id, name, code, createdBy, createdAt }
const codeToRoomId = new Map();

export async function listRooms(req, res) {
	const baseRooms = Array.from(rooms.values()).map(r => ({ id: r.id, name: r.name, code: r.code }));
	res.json({ rooms: baseRooms });
}

export async function createRoom(req, res) {
	const { name } = req.body;
	const id = nanoid(8);
	const code = nanoid(6);
	const room = { id, code, name: name || 'Room', createdBy: (req.headers['x-user-name'] || 'Guest').toString(), createdAt: new Date() };
	rooms.set(id, room);
	codeToRoomId.set(code, id);
	res.status(201).json({ room });
}

export async function createInvite(req, res) {
	const { name } = req.body;
	const id = nanoid(8);
	const code = nanoid(6);
	const room = { id, code, name: name || 'Room', createdBy: (req.headers['x-user-name'] || 'Guest').toString(), createdAt: new Date() };
	rooms.set(id, room);
	codeToRoomId.set(code, id);
	res.status(201).json({ room, invite: { code, url: `${req.protocol}://${req.get('host')}/?join=${code}` } });
}

export async function resolveInvite(req, res) {
	const { code } = req.params;
	const roomId = codeToRoomId.get(code);
	if (!roomId) return res.status(404).json({ error: 'Invalid code' });
	const room = rooms.get(roomId);
	res.json({ room });
}

export async function listMessages(req, res) {
	const { roomId } = req.params;
	const msgs = await Message.find({ roomId }).sort({ createdAt: 1 });
	res.json({ messages: msgs });
}

export async function sendMessage(req, res, io) {
	const { roomId } = req.params;
	const { text, attachments } = req.body;
	const senderName = (req.headers['x-user-name'] || 'Guest').toString();
	if (!text && (!attachments || attachments.length === 0)) {
		return res.status(400).json({ error: 'Message content is empty' });
	}
	const message = await Message.create({ roomId, senderName, text, attachments });
	io.to(roomId).emit('message:new', message);
	res.status(201).json({ message });
}

export async function editMessage(req, res) {
	const { id } = req.params;
	const { text } = req.body;
	const name = (req.headers['x-user-name'] || 'Guest').toString();
	const message = await Message.findById(id);
	if (!message) return res.status(404).json({ error: 'Not found' });
	if (message.senderName !== name) return res.status(403).json({ error: 'Forbidden' });
	message.text = text;
	message.editedAt = new Date();
	await message.save();
	res.json({ message });
}

export async function deleteMessage(req, res) {
	const { id } = req.params;
	const name = (req.headers['x-user-name'] || 'Guest').toString();
	const message = await Message.findById(id);
	if (!message) return res.status(404).json({ error: 'Not found' });
	if (message.senderName !== name) return res.status(403).json({ error: 'Forbidden' });
	message.deletedAt = new Date();
	await message.save();
	res.status(204).end();
}

export async function reactToMessage(req, res) {
	const { id } = req.params;
	const { emoji } = req.body;
	const message = await Message.findById(id);
	if (!message) return res.status(404).json({ error: 'Not found' });
	const name = (req.headers['x-user-name'] || 'Guest').toString();
	const existingIdx = message.reactions.findIndex(r => r.emoji === emoji && r.userName === name);
	if (existingIdx >= 0) message.reactions.splice(existingIdx, 1);
	else message.reactions.push({ emoji, userName: name });
	await message.save();
	res.json({ message });
}
