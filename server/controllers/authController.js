export async function register(_req, res) {
	return res.status(404).json({ error: 'Auth disabled' });
}

export async function login(_req, res) {
	return res.status(404).json({ error: 'Auth disabled' });
}

export async function me(_req, res) {
	return res.status(404).json({ error: 'Auth disabled' });
}
