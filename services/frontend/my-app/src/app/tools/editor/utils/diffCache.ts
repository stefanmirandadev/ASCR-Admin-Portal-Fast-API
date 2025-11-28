import { DiffResult, DiffCacheEntry } from '../types/diff';

/**
 * High-performance cache for diff results with automatic cleanup
 * Target: 90% cache hit rate for version re-selections
 */
export class DiffCache {
  private cache = new Map<string, DiffCacheEntry>();
  private readonly maxCacheSize = 100; // Limit memory usage
  private readonly cacheExpiryMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate unique cache key for version pair comparison
   */
  getCacheKey(leftVersionId: string, rightVersionId: string): string {
    // Ensure consistent ordering for bi-directional comparison
    const [a, b] = [leftVersionId, rightVersionId].sort();
    return `${a}:${b}`;
  }

  /**
   * Retrieve cached diff result if available and valid
   */
  getDiff(leftVersionId: string, rightVersionId: string): DiffResult[] | null {
    const key = this.getCacheKey(leftVersionId, rightVersionId);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > this.cacheExpiryMs) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.diff;
  }

  /**
   * Store diff result in cache with timestamp
   */
  setDiff(leftVersionId: string, rightVersionId: string, diff: DiffResult[]): void {
    const key = this.getCacheKey(leftVersionId, rightVersionId);
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      diff: diff,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheExpiryMs) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const diffCache = new DiffCache();

// Periodic cleanup
if (typeof window !== 'undefined') {
  setInterval(() => {
    diffCache.cleanup();
  }, 60000); // Cleanup every minute
} 