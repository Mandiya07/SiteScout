import { ImageMetadata } from "./types.js";

interface CacheEntry {
  images: ImageMetadata[];
  timestamp: number;
}

class ImageCacheManager {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

  private getCacheKey(query: string, section: string, orientation?: string): string {
    return `${query.toLowerCase().trim()}_${section}_${orientation || "all"}`;
  }

  get(query: string, section: string, orientation?: string): ImageMetadata[] | null {
    const key = this.getCacheKey(query, section, orientation);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    return entry.images;
  }

  set(query: string, section: string, orientation: string | undefined, images: ImageMetadata[]): void {
    const key = this.getCacheKey(query, section, orientation);
    this.cache.set(key, {
      images,
      timestamp: Date.now()
    });

    // Enforce max cache size
    if (this.cache.size > 500) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }
}

export const imageCache = new ImageCacheManager();
