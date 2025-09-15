export function handleUpload(req, res) {
	if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
	const { filename, mimetype, size } = req.file;
	const url = `/uploads/${filename}`;
	res.status(201).json({ attachment: { url, mimeType: mimetype, fileName: filename, size } });
}
