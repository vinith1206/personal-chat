import { Router } from 'express';
import {
	listRooms,
	createRoom,
	listMessages,
	sendMessage,
	editMessage,
	deleteMessage,
	reactToMessage,
	createInvite,
	resolveInvite
} from '../controllers/chatController.js';
import { upload } from '../utils/upload.js';
import { handleUpload } from '../controllers/uploadController.js';

export default function chatRoutes(io) {
	const router = Router();
	// Open access: no auth middleware

	router.get('/rooms', listRooms);
	router.post('/rooms', createRoom);
	router.post('/rooms/invite', createInvite);
	router.get('/rooms/invite/:code', resolveInvite);

	router.get('/rooms/:roomId/messages', listMessages);
	router.post('/rooms/:roomId/messages', (req, res) => sendMessage(req, res, io));
	router.patch('/messages/:id', editMessage);
	router.delete('/messages/:id', deleteMessage);
	router.post('/messages/:id/reactions', reactToMessage);

	// uploads
	router.post('/upload', upload.single('file'), handleUpload);

	return router;
}
