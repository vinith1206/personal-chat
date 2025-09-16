// File upload API route for Vercel serverless functions
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For now, return a mock response since file uploads require special handling
    // In a real implementation, you would use Vercel's blob storage or another service
    
    const mockAttachment = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: 'sample-file.txt',
      mimeType: 'text/plain',
      size: 1024,
      url: 'https://via.placeholder.com/300x200?text=File+Upload',
      uploadedAt: new Date().toISOString()
    };

    return res.status(200).json({
      attachment: mockAttachment,
      success: true,
      message: 'File upload simulated (replace with actual implementation)'
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
