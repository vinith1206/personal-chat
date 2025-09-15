import jwt from 'jsonwebtoken';

export function authSocketMiddleware(socket, next) {
	const name = socket.handshake.auth?.name || socket.handshake.headers['x-user-name'] || 'Guest';
	socket.user = { id: socket.id, name };
	return next();
}
