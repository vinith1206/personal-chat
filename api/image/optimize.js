// Image optimization API with comprehensive error handling and fallbacks
import { 
  withErrorHandling, 
  withTimeout, 
  withRetry, 
  withThrottling,
  createVercelError,
  createImageFallback,
  VERCEL_ERROR_TYPES,
  CONFIG
} from '../utils/errorHandler.js';
import { 
  logFunctionStart, 
  logFunctionEnd, 
  logFunctionError,
  logImageEvent,
  logError
} from '../utils/logger.js';

// Image optimization with comprehensive error handling
const optimizeImage = withErrorHandling(withTimeout(async (req, res) => {
  const startTime = Date.now();
  const functionName = 'GET /api/image/optimize';
  
  try {
    logFunctionStart(functionName, req);
    logImageEvent('optimize-request', { url: req.url, query: req.query });

    const { url, w, h, q, f } = req.query;
    
    // Validate required parameters
    if (!url) {
      throw createVercelError('INVALID_IMAGE_OPTIMIZE_REQUEST', 'Image URL is required');
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      throw createVercelError('INVALID_IMAGE_OPTIMIZE_REQUEST', 'Invalid image URL format');
    }

    // Validate dimensions
    const width = w ? parseInt(w) : null;
    const height = h ? parseInt(h) : null;
    const quality = q ? parseInt(q) : 80;
    const format = f || 'auto';

    if (width && (width < 1 || width > 4000)) {
      throw createVercelError('INVALID_IMAGE_OPTIMIZE_REQUEST', 'Width must be between 1 and 4000');
    }

    if (height && (height < 1 || height > 4000)) {
      throw createVercelError('INVALID_IMAGE_OPTIMIZE_REQUEST', 'Height must be between 1 and 4000');
    }

    if (quality < 1 || quality > 100) {
      throw createVercelError('INVALID_IMAGE_OPTIMIZE_REQUEST', 'Quality must be between 1 and 100');
    }

    // Check for external image optimization
    if (isExternalUrl(url)) {
      return await handleExternalImageOptimization(url, width, height, quality, format, req, res);
    }

    // Handle local image optimization
    return await handleLocalImageOptimization(url, width, height, quality, format, req, res);

  } catch (error) {
    logFunctionError(functionName, error, req);
    
    // Handle specific image optimization errors
    if (error.vercelErrorType === 'OPTIMIZED_EXTERNAL_IMAGE_REQUEST_FAILED') {
      return createImageFallback('OPTIMIZED_EXTERNAL_IMAGE_REQUEST_FAILED', req.query.url);
    }
    
    if (error.vercelErrorType === 'OPTIMIZED_EXTERNAL_IMAGE_REQUEST_INVALID') {
      return createImageFallback('OPTIMIZED_EXTERNAL_IMAGE_REQUEST_INVALID', req.query.url);
    }
    
    if (error.vercelErrorType === 'OPTIMIZED_EXTERNAL_IMAGE_REQUEST_UNAUTHORIZED') {
      return createImageFallback('OPTIMIZED_EXTERNAL_IMAGE_REQUEST_UNAUTHORIZED', req.query.url);
    }
    
    if (error.vercelErrorType === 'OPTIMIZED_EXTERNAL_IMAGE_TOO_MANY_REDIRECTS') {
      return createImageFallback('OPTIMIZED_EXTERNAL_IMAGE_TOO_MANY_REDIRECTS', req.query.url);
    }

    throw error;
  }
}, CONFIG.TIMEOUT_DURATION));

// Handle external image optimization
async function handleExternalImageOptimization(url, width, height, quality, format, req, res) {
  try {
    logImageEvent('external-image-optimization', { url, width, height, quality, format });

    // Simulate external image optimization
    // In production, you would use Vercel's image optimization or a service like Cloudinary
    
    // Check for redirects (simulate)
    const redirectCount = 0; // This would be actual redirect count
    if (redirectCount > 5) {
      throw createVercelError('OPTIMIZED_EXTERNAL_IMAGE_TOO_MANY_REDIRECTS', 'Too many redirects');
    }

    // Simulate image processing
    const optimizedImageUrl = await processExternalImage(url, width, height, quality, format);
    
    logImageEvent('external-image-optimization-success', { 
      originalUrl: url, 
      optimizedUrl: optimizedImageUrl,
      width, 
      height, 
      quality 
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Image-URL': url,
        'X-Optimized': 'true',
        'X-Width': width?.toString() || 'auto',
        'X-Height': height?.toString() || 'auto',
        'X-Quality': quality.toString()
      },
      body: optimizedImageUrl
    };

  } catch (error) {
    logImageEvent('external-image-optimization-error', { 
      url, 
      error: error.message,
      vercelErrorType: error.vercelErrorType
    });

    // Return fallback image
    return createImageFallback('OPTIMIZED_EXTERNAL_IMAGE_REQUEST_FAILED', url);
  }
}

// Handle local image optimization
async function handleLocalImageOptimization(url, width, height, quality, format, req, res) {
  try {
    logImageEvent('local-image-optimization', { url, width, height, quality, format });

    // Simulate local image processing
    const optimizedImageUrl = await processLocalImage(url, width, height, quality, format);
    
    logImageEvent('local-image-optimization-success', { 
      originalUrl: url, 
      optimizedUrl: optimizedImageUrl,
      width, 
      height, 
      quality 
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Image-URL': url,
        'X-Optimized': 'true',
        'X-Width': width?.toString() || 'auto',
        'X-Height': height?.toString() || 'auto',
        'X-Quality': quality.toString()
      },
      body: optimizedImageUrl
    };

  } catch (error) {
    logImageEvent('local-image-optimization-error', { 
      url, 
      error: error.message,
      vercelErrorType: error.vercelErrorType
    });

    // Return fallback image
    return createImageFallback('INVALID_IMAGE_OPTIMIZE_REQUEST', url);
  }
}

// Process external image (simulation)
async function processExternalImage(url, width, height, quality, format) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate different error scenarios
  if (url.includes('unauthorized')) {
    throw createVercelError('OPTIMIZED_EXTERNAL_IMAGE_REQUEST_UNAUTHORIZED', 'Unauthorized access to image');
  }
  
  if (url.includes('invalid')) {
    throw createVercelError('OPTIMIZED_EXTERNAL_IMAGE_REQUEST_INVALID', 'Invalid image format');
  }
  
  if (url.includes('redirect')) {
    throw createVercelError('OPTIMIZED_EXTERNAL_IMAGE_TOO_MANY_REDIRECTS', 'Too many redirects');
  }
  
  if (url.includes('failed')) {
    throw createVercelError('OPTIMIZED_EXTERNAL_IMAGE_REQUEST_FAILED', 'Failed to process image');
  }
  
  // Return optimized image URL
  const params = new URLSearchParams();
  if (width) params.append('w', width);
  if (height) params.append('h', height);
  params.append('q', quality);
  params.append('f', format);
  
  return `https://via.placeholder.com/${width || 300}x${height || 200}?${params.toString()}`;
}

// Process local image (simulation)
async function processLocalImage(url, width, height, quality, format) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Return optimized image URL
  const params = new URLSearchParams();
  if (width) params.append('w', width);
  if (height) params.append('h', height);
  params.append('q', quality);
  params.append('f', format);
  
  return `https://via.placeholder.com/${width || 300}x${height || 200}?${params.toString()}`;
}

// Check if URL is external
function isExternalUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname !== 'localhost' && !urlObj.hostname.startsWith('127.0.0.1');
  } catch {
    return false;
  }
}

// Main handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate method
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'INVALID_REQUEST_METHOD', 
      message: 'Only GET method allowed' 
    });
  }

  try {
    const result = await optimizeImage(req, res);
    
    // Handle different response types
    if (result.body.startsWith('http')) {
      // Redirect to optimized image
      return res.redirect(302, result.body);
    } else {
      // Return image data
      return res.status(result.statusCode).set(result.headers).send(result.body);
    }
    
  } catch (error) {
    logError('Image optimization handler failed', error, req);
    
    // Return fallback image
    const fallbackUrl = 'https://via.placeholder.com/300x200?text=Image+Error';
    return res.redirect(302, fallbackUrl);
  }
}
