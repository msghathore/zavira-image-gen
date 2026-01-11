'use client';

import Dexie, { Table } from 'dexie';

// ==================== TYPES ====================

interface CachedImage {
  id?: number;
  url: string;
  blobUrl: string;
  timestamp: number;
  size: number;
  blurhash?: string;
}

// ==================== DATABASE ====================

class ImageCacheDB extends Dexie {
  images!: Table<CachedImage>;

  constructor() {
    super('ZaviraImageCache');
    this.version(1).stores({
      images: '++id, url, timestamp'
    });
  }
}

// Initialize DB only on client
let db: ImageCacheDB | null = null;
if (typeof window !== 'undefined') {
  db = new ImageCacheDB();
}

// ==================== MEMORY CACHE (Layer 1 - Instant) ====================

const memoryCache = new Map<string, string>();
const MAX_MEMORY_CACHE = 100;

function addToMemoryCache(url: string, blobUrl: string) {
  if (memoryCache.size >= MAX_MEMORY_CACHE) {
    // Remove oldest entry (first in map)
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) {
      const oldBlobUrl = memoryCache.get(firstKey);
      if (oldBlobUrl && oldBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldBlobUrl);
      }
      memoryCache.delete(firstKey);
    }
  }
  memoryCache.set(url, blobUrl);
}

export function getFromMemoryCache(url: string): string | null {
  return memoryCache.get(url) || null;
}

export function isInMemoryCache(url: string): boolean {
  return memoryCache.has(url);
}

// ==================== INDEXEDDB CACHE (Layer 2 - Persistent) ====================

const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getFromIndexedDB(url: string): Promise<CachedImage | null> {
  if (!db) return null;

  try {
    const cached = await db.images.where('url').equals(url).first();
    if (cached && Date.now() - cached.timestamp < MAX_CACHE_AGE) {
      return cached;
    }
    // Clean up expired entry
    if (cached) {
      await db.images.where('url').equals(url).delete();
    }
    return null;
  } catch (e) {
    console.warn('IndexedDB read error:', e);
    return null;
  }
}

async function saveToIndexedDB(url: string, blobUrl: string, size: number, blurhash?: string): Promise<void> {
  if (!db) return;

  try {
    await db.images.put({
      url,
      blobUrl,
      timestamp: Date.now(),
      size,
      blurhash,
    });
  } catch (e) {
    console.warn('IndexedDB write error:', e);
  }
}

// ==================== MULTI-LAYER CACHE FETCH ====================

export async function getCachedImageUrl(url: string): Promise<string> {
  // Skip caching for base64 data URLs (they're already local)
  if (url.startsWith('data:')) {
    return url;
  }

  // Layer 1: Check memory cache (instant)
  const memoryCached = getFromMemoryCache(url);
  if (memoryCached) {
    return memoryCached;
  }

  // Layer 2: Check IndexedDB (fast, persistent)
  const indexedDBCached = await getFromIndexedDB(url);
  if (indexedDBCached) {
    // Promote to memory cache
    addToMemoryCache(url, indexedDBCached.blobUrl);
    return indexedDBCached.blobUrl;
  }

  // Layer 3: Fetch from network
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Save to both caches
    addToMemoryCache(url, blobUrl);
    await saveToIndexedDB(url, blobUrl, blob.size);

    return blobUrl;
  } catch (e) {
    console.warn('Failed to fetch and cache image:', e);
    // Fall back to original URL
    return url;
  }
}

// ==================== PRELOADING ====================

const preloadingUrls = new Set<string>();
const preloadedUrls = new Set<string>();

export function preloadImage(url: string): void {
  if (preloadedUrls.has(url) || preloadingUrls.has(url) || url.startsWith('data:')) {
    return;
  }

  // Check if already in memory cache
  if (isInMemoryCache(url)) {
    preloadedUrls.add(url);
    return;
  }

  preloadingUrls.add(url);

  // Use requestIdleCallback for non-blocking preload
  const preload = () => {
    getCachedImageUrl(url)
      .then(() => {
        preloadedUrls.add(url);
      })
      .catch(() => {
        // Ignore errors during preload
      })
      .finally(() => {
        preloadingUrls.delete(url);
      });
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(preload, { timeout: 2000 });
  } else {
    setTimeout(preload, 100);
  }
}

export function preloadImages(urls: string[]): void {
  urls.forEach(preloadImage);
}

export function isPreloaded(url: string): boolean {
  return preloadedUrls.has(url) || isInMemoryCache(url);
}

// ==================== CACHE MANAGEMENT ====================

export async function clearImageCache(): Promise<void> {
  // Clear memory cache
  memoryCache.forEach((blobUrl) => {
    if (blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
  });
  memoryCache.clear();
  preloadedUrls.clear();

  // Clear IndexedDB
  if (db) {
    await db.images.clear();
  }
}

export async function getCacheStats(): Promise<{ memoryCount: number; indexedDBCount: number; totalSize: number }> {
  let indexedDBCount = 0;
  let totalSize = 0;

  if (db) {
    const images = await db.images.toArray();
    indexedDBCount = images.length;
    totalSize = images.reduce((sum, img) => sum + img.size, 0);
  }

  return {
    memoryCount: memoryCache.size,
    indexedDBCount,
    totalSize,
  };
}

// ==================== CLEANUP EXPIRED ====================

export async function cleanupExpiredCache(): Promise<number> {
  if (!db) return 0;

  const cutoff = Date.now() - MAX_CACHE_AGE;
  const deleted = await db.images.where('timestamp').below(cutoff).delete();
  return deleted;
}

// Run cleanup on load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    cleanupExpiredCache().catch(() => {});
  }, 5000);
}
