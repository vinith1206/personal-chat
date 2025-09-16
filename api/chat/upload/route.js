// File upload API route with comprehensive error handling
import { NextRequest, NextResponse } from 'next/server';
import { 
  withTimeout, 
  validatePayloadSize, 
  validateResponseSize,
  handleApiError,
  createError,
  ERROR_TYPES,
  checkMemoryUsage,
  detectInfiniteLoop,
  handleImageOptimizationError
} from '../../utils/errorHandler.js';
import { 
  logFunctionStart, 
  logFunctionEnd, 
  logError, 
  logInfo,
  logPerformance 
} from '../../utils/logger.js';

// File upload limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'text/plain',
  'application/json'
];

const MAX_FILES_PER_REQUEST = 5;

// POST /api/chat/upload
export const POST = withTimeout(async (request) => {
  const startTime = Date.now();
  const functionName = 'POST /api/chat/upload';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();
    validatePayloadSize(request);

    const formData = await request.formData();
    const files = formData.getAll('file');

    if (!files || files.length === 0) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'No files provided',
        400
      );
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        `Too many files (max ${MAX_FILES_PER_REQUEST})`,
        400
      );
    }

    const uploadResults = [];
    const errors = [];

    for (const file of files) {
      try {
        // Validate file
        const validationResult = await validateFile(file);
        if (!validationResult.valid) {
          errors.push({
            fileName: file.name,
            error: validationResult.error
          });
          continue;
        }

        // Process file
        const uploadResult = await processFile(file);
        uploadResults.push(uploadResult);

        logInfo('File uploaded successfully', {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadId: uploadResult.id
        }, request);

      } catch (fileError) {
        logError(`Failed to upload file: ${file.name}`, fileError, request);
        errors.push({
          fileName: file.name,
          error: fileError.message
        });
      }
    }

    // Check if any files were uploaded successfully
    if (uploadResults.length === 0) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'No files were uploaded successfully',
        400,
        { errors }
      );
    }

    const response = NextResponse.json({
      success: true,
      uploads: uploadResults,
      count: uploadResults.length,
      ...(errors.length > 0 && { errors })
    });

    validateResponseSize(response);
    
    logPerformance(functionName, startTime, Date.now(), request, {
      filesProcessed: uploadResults.length,
      errorsCount: errors.length,
      totalSize: uploadResults.reduce((sum, file) => sum + file.size, 0)
    });
    
    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to upload files', error, request);
    return handleApiError(error, request);
  }
}, 30000); // 30 second timeout for file uploads

// File validation
async function validateFile(file) {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed: ${file.type}`
    };
  }

  // Check file name
  if (!file.name || file.name.length > 255) {
    return {
      valid: false,
      error: 'Invalid file name'
    };
  }

  // Additional security checks
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid file name characters'
    };
  }

  return { valid: true };
}

// File processing
async function processFile(file) {
  const fileId = crypto.randomUUID();
  const fileExtension = getFileExtension(file.name);
  const sanitizedFileName = sanitizeFileName(file.name);
  
  // Create file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Generate file path (in production, upload to cloud storage)
  const filePath = `/uploads/${fileId}${fileExtension}`;
  
  // In production, you would upload to S3, Cloudinary, etc.
  // For now, we'll simulate the upload
  const uploadResult = {
    id: fileId,
    fileName: sanitizedFileName,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    url: filePath,
    uploadedAt: new Date().toISOString(),
    ...(isImage(file.type) && await processImageMetadata(buffer, file.type))
  };

  return uploadResult;
}

// Image processing and optimization
async function processImageMetadata(buffer, mimeType) {
  try {
    // Basic image metadata extraction
    const metadata = {
      width: null,
      height: null,
      format: mimeType.split('/')[1],
      optimized: false
    };

    // In production, use sharp or similar library
    // For now, return basic metadata
    if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
      // Simulate image processing
      metadata.width = 800; // Placeholder
      metadata.height = 600; // Placeholder
      metadata.optimized = true;
    }

    return metadata;
  } catch (error) {
    logError('Failed to process image metadata', error);
    return {
      width: null,
      height: null,
      format: mimeType.split('/')[1],
      optimized: false,
      error: 'Failed to process image metadata'
    };
  }
}

// Helper functions
function getFileExtension(fileName) {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot !== -1 ? fileName.substring(lastDot) : '';
}

function sanitizeFileName(fileName) {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

function isImage(mimeType) {
  return mimeType.startsWith('image/');
}

// GET /api/chat/upload/[id] - Get file info
export async function GET(request, { params }) {
  const startTime = Date.now();
  const functionName = 'GET /api/chat/upload';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();

    const { id } = params;

    if (!id) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'File ID is required',
        400
      );
    }

    // In production, fetch from database
    // For now, return mock data
    const fileInfo = {
      id,
      fileName: 'example.jpg',
      mimeType: 'image/jpeg',
      size: 1024000,
      url: `/uploads/${id}.jpg`,
      uploadedAt: new Date().toISOString()
    };

    const response = NextResponse.json({
      success: true,
      file: fileInfo
    });

    validateResponseSize(response);
    
    logPerformance(functionName, startTime, Date.now(), request, {
      fileId: id
    });
    
    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to get file info', error, request);
    return handleApiError(error, request);
  }
}

// DELETE /api/chat/upload/[id] - Delete file
export async function DELETE(request, { params }) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/chat/upload';
  
  try {
    logFunctionStart(functionName, request);
    detectInfiniteLoop(request);
    checkMemoryUsage();

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const deletedBy = searchParams.get('deletedBy');

    if (!id) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'File ID is required',
        400
      );
    }

    if (!deletedBy) {
      throw createError(
        ERROR_TYPES.VALIDATION_ERROR,
        'Deleter name is required',
        400
      );
    }

    // In production, delete from cloud storage and database
    // For now, simulate deletion
    logInfo('File deleted', {
      fileId: id,
      deletedBy
    }, request);

    const response = NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      fileId: id
    });

    validateResponseSize(response);
    
    logPerformance(functionName, startTime, Date.now(), request, {
      fileId: id
    });
    
    logFunctionEnd(functionName, startTime, request);
    return response;

  } catch (error) {
    logError('Failed to delete file', error, request);
    return handleApiError(error, request);
  }
}
