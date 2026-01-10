/**
 * Image Processing Utility for AI Image Generator
 *
 * Handles:
 * - Converting images to base64 for the Gemini API
 * - HEIC format conversion (common on iPhones)
 * - Image compression to stay under API limits (~4MB)
 * - Maintaining aspect ratio during compression
 */

// Maximum file size for API (4MB in bytes)
const MAX_FILE_SIZE = 4 * 1024 * 1024;

// Target compression quality steps
const QUALITY_STEPS = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];

// Maximum dimensions for images
const MAX_DIMENSION = 4096;

export interface ProcessedImage {
  base64: string;           // Full data URL: data:image/jpeg;base64,...
  mimeType: string;         // e.g., "image/jpeg"
  data: string;             // Raw base64 data without prefix
  originalSize: number;     // Original file size in bytes
  processedSize: number;    // Final size in bytes
  width: number;
  height: number;
}

export interface ProcessImageOptions {
  maxSize?: number;         // Max file size in bytes (default: 4MB)
  maxDimension?: number;    // Max width/height (default: 4096)
  quality?: number;         // Initial quality 0-1 (default: 0.9)
  outputFormat?: 'jpeg' | 'png' | 'webp';  // Output format (default: jpeg)
}

/**
 * Check if a file is HEIC format
 */
export function isHeicFormat(file: File): boolean {
  const heicMimeTypes = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
  const heicExtensions = ['.heic', '.heif'];

  // Check MIME type
  if (heicMimeTypes.includes(file.type.toLowerCase())) {
    return true;
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  return heicExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * Convert HEIC to JPEG using canvas
 * Note: This requires the browser to support HEIC decoding
 * For broader support, you may need heic2any library
 */
async function convertHeicToJpeg(file: File): Promise<Blob> {
  // Try native browser decoding first
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to convert HEIC to JPEG'));
              }
            },
            'image/jpeg',
            0.9
          );
        };
        img.onerror = () => {
          reject(new Error('Browser does not support HEIC format. Please convert to JPEG first.'));
        };
        img.src = e.target?.result as string;
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Load an image from a File or Blob
 */
function loadImage(source: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(source);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const aspectRatio = width / height;

  if (width > height) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / aspectRatio),
    };
  } else {
    return {
      width: Math.round(maxDimension * aspectRatio),
      height: maxDimension,
    };
  }
}

/**
 * Compress image to target size
 */
async function compressImage(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  format: 'jpeg' | 'png' | 'webp',
  quality: number
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Use high-quality image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw image
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const mimeType = `image/${format}`;
  const dataUrl = canvas.toDataURL(mimeType, quality);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({ blob, dataUrl });
        } else {
          reject(new Error('Failed to compress image'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Process an image file for the Gemini API
 *
 * @param file - The image file to process
 * @param options - Processing options
 * @returns Processed image data ready for API
 */
export async function processImageForApi(
  file: File,
  options: ProcessImageOptions = {}
): Promise<ProcessedImage> {
  const {
    maxSize = MAX_FILE_SIZE,
    maxDimension = MAX_DIMENSION,
    quality: initialQuality = 0.9,
    outputFormat = 'jpeg',
  } = options;

  const originalSize = file.size;
  let imageBlob: Blob = file;

  // Handle HEIC format
  if (isHeicFormat(file)) {
    try {
      imageBlob = await convertHeicToJpeg(file);
    } catch (error) {
      throw new Error(
        'HEIC format not supported by your browser. Please convert the image to JPEG before uploading.'
      );
    }
  }

  // Load the image
  const img = await loadImage(imageBlob);

  // Calculate target dimensions
  const { width: targetWidth, height: targetHeight } = calculateDimensions(
    img.width,
    img.height,
    maxDimension
  );

  // Try to compress to target size
  let result: { blob: Blob; dataUrl: string };
  let currentQuality = initialQuality;
  let currentWidth = targetWidth;
  let currentHeight = targetHeight;

  // First attempt with initial quality
  result = await compressImage(img, currentWidth, currentHeight, outputFormat, currentQuality);

  // If still too large, reduce quality
  if (result.blob.size > maxSize) {
    for (const quality of QUALITY_STEPS) {
      if (quality >= currentQuality) continue;

      result = await compressImage(img, currentWidth, currentHeight, outputFormat, quality);
      currentQuality = quality;

      if (result.blob.size <= maxSize) {
        break;
      }
    }
  }

  // If still too large, reduce dimensions
  while (result.blob.size > maxSize && currentWidth > 512) {
    currentWidth = Math.round(currentWidth * 0.75);
    currentHeight = Math.round(currentHeight * 0.75);

    result = await compressImage(img, currentWidth, currentHeight, outputFormat, 0.7);

    if (result.blob.size <= maxSize) {
      break;
    }
  }

  // Extract base64 data
  const mimeType = `image/${outputFormat}`;
  const base64Data = result.dataUrl.replace(/^data:image\/\w+;base64,/, '');

  return {
    base64: result.dataUrl,
    mimeType,
    data: base64Data,
    originalSize,
    processedSize: result.blob.size,
    width: currentWidth,
    height: currentHeight,
  };
}

/**
 * Convert a File to base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions from a base64 data URL
 */
export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Validate if a file is a supported image format
 */
export function isValidImageFormat(file: File): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ];

  // Check MIME type
  if (supportedTypes.includes(file.type.toLowerCase())) {
    return true;
  }

  // Check extension for files without MIME type
  const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];
  const fileName = file.name.toLowerCase();
  return supportedExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Prepare image for Gemini API inlineData format
 */
export function prepareForGeminiApi(processedImage: ProcessedImage): {
  inlineData: {
    mimeType: string;
    data: string;
  };
} {
  return {
    inlineData: {
      mimeType: processedImage.mimeType,
      data: processedImage.data,
    },
  };
}

/**
 * Quick process for small images that don't need compression
 */
export async function quickProcessImage(file: File): Promise<ProcessedImage | null> {
  // Skip processing for small images
  if (file.size <= MAX_FILE_SIZE && !isHeicFormat(file)) {
    const dataUrl = await fileToBase64(file);
    const dimensions = await getImageDimensions(dataUrl);

    if (dimensions.width <= MAX_DIMENSION && dimensions.height <= MAX_DIMENSION) {
      const mimeType = file.type || 'image/jpeg';
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');

      return {
        base64: dataUrl,
        mimeType,
        data: base64Data,
        originalSize: file.size,
        processedSize: file.size,
        width: dimensions.width,
        height: dimensions.height,
      };
    }
  }

  // Needs full processing
  return null;
}

/**
 * Main entry point for processing uploaded images
 * Uses quick path for small images, full processing for large ones
 */
export async function processUploadedImage(
  file: File,
  options?: ProcessImageOptions
): Promise<ProcessedImage> {
  // Validate file format
  if (!isValidImageFormat(file)) {
    throw new Error(
      'Unsupported image format. Please use JPEG, PNG, WebP, or HEIC.'
    );
  }

  // Try quick processing first
  const quickResult = await quickProcessImage(file);
  if (quickResult) {
    return quickResult;
  }

  // Full processing for large images or HEIC
  return processImageForApi(file, options);
}
