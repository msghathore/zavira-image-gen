// Server-side image processing utilities
// This file runs on the server (API routes) only

import sharp from 'sharp';
import { encode } from 'blurhash';

export interface ProcessedImageResult {
  buffer: Buffer;
  format: 'webp' | 'jpeg';
  width: number;
  height: number;
  blurhash: string;
  size: number;
}

/**
 * Process an image: convert to WebP, compress, and generate blurhash
 * Target: <100KB for chat images while maintaining quality
 */
export async function processAndOptimizeImage(
  input: Buffer | string, // Buffer or base64 data URL
  options: {
    maxWidth?: number;
    quality?: number;
  } = {}
): Promise<ProcessedImageResult> {
  const { maxWidth = 1200, quality = 80 } = options;

  // Convert base64 data URL to buffer if needed
  let buffer: Buffer;
  if (typeof input === 'string') {
    const match = input.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (match) {
      buffer = Buffer.from(match[1], 'base64');
    } else {
      throw new Error('Invalid image data');
    }
  } else {
    buffer = input;
  }

  // Get image metadata
  const metadata = await sharp(buffer).metadata();
  const originalWidth = metadata.width || 1200;
  const originalHeight = metadata.height || 800;

  // Calculate resize dimensions
  const aspectRatio = originalHeight / originalWidth;
  const targetWidth = Math.min(originalWidth, maxWidth);
  const targetHeight = Math.round(targetWidth * aspectRatio);

  // Process image with sharp - convert to WebP for better compression
  const outputBuffer = await sharp(buffer)
    .resize(targetWidth, targetHeight, {
      withoutEnlargement: true,
      fit: 'inside',
    })
    .webp({
      quality,
      effort: 5,
    })
    .toBuffer();

  // Generate blurhash from resized image
  const blurhashSize = 32;
  const blurhashHeight = Math.round(blurhashSize * aspectRatio);

  const blurhashBuffer = await sharp(buffer)
    .resize(blurhashSize, blurhashHeight, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const blurhash = encode(
    new Uint8ClampedArray(blurhashBuffer.data),
    blurhashBuffer.info.width,
    blurhashBuffer.info.height,
    4,
    3
  );

  return {
    buffer: outputBuffer,
    format: 'webp',
    width: targetWidth,
    height: targetHeight,
    blurhash,
    size: outputBuffer.length,
  };
}

/**
 * Generate blurhash from a base64 image without full processing
 * Faster when we don't need to re-encode the image
 */
export async function generateBlurhashFromBase64(input: string): Promise<string> {
  const match = input.match(/^data:image\/[^;]+;base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid base64 data URL');
  }

  const buffer = Buffer.from(match[1], 'base64');

  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 100;
  const height = metadata.height || 100;
  const aspectRatio = height / width;

  const blurhashSize = 32;
  const blurhashHeight = Math.round(blurhashSize * aspectRatio);

  const { data, info } = await sharp(buffer)
    .resize(blurhashSize, blurhashHeight, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,
    3
  );
}

/**
 * Convert base64 to optimized WebP and return as base64 data URL with blurhash
 */
export async function optimizeBase64ToWebP(
  base64DataUrl: string,
  options: {
    maxWidth?: number;
    quality?: number;
  } = {}
): Promise<{ dataUrl: string; blurhash: string; size: number }> {
  const { maxWidth = 1200, quality = 80 } = options;

  const match = base64DataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid base64 data URL');
  }

  const buffer = Buffer.from(match[1], 'base64');

  // Get original dimensions
  const metadata = await sharp(buffer).metadata();
  const originalWidth = metadata.width || 1200;
  const originalHeight = metadata.height || 800;
  const aspectRatio = originalHeight / originalWidth;

  // Resize and convert to WebP
  const targetWidth = Math.min(originalWidth, maxWidth);
  const targetHeight = Math.round(targetWidth * aspectRatio);

  const outputBuffer = await sharp(buffer)
    .resize(targetWidth, targetHeight, {
      withoutEnlargement: true,
      fit: 'inside',
    })
    .webp({ quality, effort: 5 })
    .toBuffer();

  // Generate blurhash
  const blurhashSize = 32;
  const blurhashHeight = Math.round(blurhashSize * aspectRatio);

  const blurhashBuffer = await sharp(buffer)
    .resize(blurhashSize, blurhashHeight, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const blurhash = encode(
    new Uint8ClampedArray(blurhashBuffer.data),
    blurhashBuffer.info.width,
    blurhashBuffer.info.height,
    4,
    3
  );

  return {
    dataUrl: `data:image/webp;base64,${outputBuffer.toString('base64')}`,
    blurhash,
    size: outputBuffer.length,
  };
}
