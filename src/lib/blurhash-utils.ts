import { encode, decode } from 'blurhash';

// ==================== CLIENT-SIDE DECODE ====================

/**
 * Decode a blurhash string to a canvas data URL
 * This is fast and runs entirely client-side
 */
export function decodeBlurhash(
  hash: string,
  width: number = 32,
  height: number = 32
): string | null {
  if (!hash || typeof window === 'undefined') return null;

  try {
    const pixels = decode(hash, width, height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL();
  } catch (e) {
    console.warn('Failed to decode blurhash:', e);
    return null;
  }
}

/**
 * Create a CSS background style from a blurhash
 * More efficient than creating a data URL for simple use cases
 */
export function blurhashToGradient(hash: string): string {
  if (!hash) return 'linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)';

  try {
    // Decode to a tiny 4x4 grid
    const pixels = decode(hash, 4, 4);

    // Get corner colors
    const getColor = (x: number, y: number) => {
      const i = (y * 4 + x) * 4;
      return `rgb(${pixels[i]}, ${pixels[i + 1]}, ${pixels[i + 2]})`;
    };

    const tl = getColor(0, 0);
    const tr = getColor(3, 0);
    const bl = getColor(0, 3);
    const br = getColor(3, 3);

    return `linear-gradient(135deg, ${tl} 0%, ${tr} 50%, ${br} 100%)`;
  } catch {
    return 'linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)';
  }
}

// ==================== SERVER-SIDE ENCODE ====================

/**
 * Encode image data to a blurhash string
 * This should only be called server-side during image generation
 */
export function encodeBlurhash(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  componentX: number = 4,
  componentY: number = 3
): string {
  return encode(pixels, width, height, componentX, componentY);
}

// ==================== BLURHASH COMPONENT ====================

export interface BlurhashPlaceholderProps {
  hash: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}
