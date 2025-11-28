// @ts-ignore - LRU cache types may not be fully compatible
import LRUCache from 'lru-cache';
import { DiffResult } from '../types/diff';
import { CellLineData } from '../types/editor';

export interface VersionCacheEntry {
  data: CellLineData;
  timestamp: number;
}

export interface DiffCacheEntry {
  diff: DiffResult[];
  timestamp: number;
}

export interface SchemaEntry {
  schema: any[];
  timestamp: number;
}

export interface CacheStats {
  versionCache: {
    size: number;
    maxSize: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
  };
  diffCache: {
    size: number;
    maxSize: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
  };
  totalMemoryUsage: number;
}

/**
 * High-performance multi-level cache manager for version control data
 * Targets: Version cache hit rate >80%, Diff cache hit rate >90%
 */
export class CacheManager {
  private versionCache: LRUCache<string, VersionCacheEntry>;
  private diffCache: LRUCache<string, DiffCacheEntry>;
  private schemaCache: Map<string, SchemaEntry>;
  private fetchPromises: Map<string, Promise<CellLineData>>;
  
  // Performance tracking
  private versionHits = 0;
  private versionMisses = 0;
  private diffHits = 0;
  private diffMisses = 0;

  constructor(
    versionCacheSize: number = 50,
    diffCacheSize: number = 30,
    cacheTTL: number = 600000 // 10 minutes
  ) {
    this.versionCache = new LRUCache({
      max: versionCacheSize,
      ttl: cacheTTL,
      sizeCalculation: (entry: VersionCacheEntry) => {
        // Estimate memory usage
        return JSON.stringify(entry.data).length * 2; // UTF-16 factor
      },
      maxSize: 100 * 1024 * 1024, // 100MB max
    });

    this.diffCache = new LRUCache({
      max: diffCacheSize,
      ttl: cacheTTL,
      sizeCalculation: (entry: DiffCacheEntry) => {
        return JSON.stringify(entry.diff).length * 2;
      },
      maxSize: 50 * 1024 * 1024, // 50MB max
    });

    this.schemaCache = new Map();
    this.fetchPromises = new Map();

    // Cleanup interval
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 60000); // Every minute
    }
  }

  /**
   * Get version data with caching and deduplication
   */
  async getVersion(cellLineId: string, versionId: string): Promise<CellLineData> {
    const cacheKey = `${cellLineId}:${versionId}`;
    
    // Check cache first
    const cached = this.versionCache.get(cacheKey);
    if (cached) {
      this.versionHits++;
      return cached.data;
    }

    this.versionMisses++;

    // Check for in-flight request to prevent duplicate fetches
    const existingPromise = this.fetchPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    // Create fetch promise
    const fetchPromise = this.fetchVersionFromAPI(cellLineId, versionId)
      .then(data => {
        // Cache the result
        this.versionCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        // Remove from in-flight promises
        this.fetchPromises.delete(cacheKey);
        
        return data;
      })
      .catch(error => {
        // Remove from in-flight promises on error
        this.fetchPromises.delete(cacheKey);
        throw error;
      });

    this.fetchPromises.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Get diff result with bidirectional caching
   */
  getDiff(leftVersionId: string, rightVersionId: string): DiffResult[] | null {
    const cacheKey = this.getDiffCacheKey(leftVersionId, rightVersionId);
    const cached = this.diffCache.get(cacheKey);
    
    if (cached) {
      this.diffHits++;
      return cached.diff;
    }
    
    this.diffMisses++;
    return null;
  }

  /**
   * Store diff result in cache
   */
  setDiff(leftVersionId: string, rightVersionId: string, diff: DiffResult[]): void {
    const cacheKey = this.getDiffCacheKey(leftVersionId, rightVersionId);
    this.diffCache.set(cacheKey, {
      diff,
      timestamp: Date.now()
    });
  }

  /**
   * Get or set schema data
   */
  getSchema(schemaKey: string): any[] | null {
    const entry = this.schemaCache.get(schemaKey);
    if (entry && Date.now() - entry.timestamp < 3600000) { // 1 hour TTL
      return entry.schema;
    }
    return null;
  }

  setSchema(schemaKey: string, schema: any[]): void {
    this.schemaCache.set(schemaKey, {
      schema,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache entries
   */
  invalidateVersion(cellLineId?: string, versionId?: string): void {
    if (!cellLineId) {
      this.versionCache.clear();
      return;
    }

    if (versionId) {
      const key = `${cellLineId}:${versionId}`;
      this.versionCache.delete(key);
      this.fetchPromises.delete(key);
    } else {
      // Invalidate all versions for this cell line
      const keysToDelete: string[] = [];
      for (const key of this.versionCache.keys()) {
        if (key.startsWith(`${cellLineId}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => {
        this.versionCache.delete(key);
        this.fetchPromises.delete(key);
      });
    }

    // Also invalidate related diffs
    this.invalidateDiffByVersion(versionId || cellLineId);
  }

  /**
   * Invalidate diff cache entries involving a specific version
   */
  invalidateDiffByVersion(versionId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.diffCache.keys()) {
      if (key.includes(versionId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.diffCache.delete(key));
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const versionTotal = this.versionHits + this.versionMisses;
    const diffTotal = this.diffHits + this.diffMisses;

    return {
      versionCache: {
        size: this.versionCache.size,
        maxSize: this.versionCache.max,
        hitCount: this.versionHits,
        missCount: this.versionMisses,
        hitRate: versionTotal > 0 ? this.versionHits / versionTotal : 0
      },
      diffCache: {
        size: this.diffCache.size,
        maxSize: this.diffCache.max,
        hitCount: this.diffHits,
        missCount: this.diffMisses,
        hitRate: diffTotal > 0 ? this.diffHits / diffTotal : 0
      },
      totalMemoryUsage: this.versionCache.calculatedSize + this.diffCache.calculatedSize
    };
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.versionCache.clear();
    this.diffCache.clear();
    this.schemaCache.clear();
    this.fetchPromises.clear();
    
    // Reset statistics
    this.versionHits = 0;
    this.versionMisses = 0;
    this.diffHits = 0;
    this.diffMisses = 0;
  }

  /**
   * Generate normalized cache key for diff results
   */
  private getDiffCacheKey(leftVersionId: string, rightVersionId: string): string {
    // Normalize order for bidirectional lookups
    return [leftVersionId, rightVersionId].sort().join(':');
  }

  /**
   * Fetch version data from API
   */
  private async fetchVersionFromAPI(cellLineId: string, versionId: string): Promise<CellLineData> {
    const response = await fetch(
      `http://localhost:8000/api/editor/celllines/${cellLineId}/versions/${versionId}/`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch version: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.metadata || data;
  }

  /**
   * Cleanup expired entries and reset counters periodically
   */
  private cleanup(): void {
    // Clean expired schema entries
    const now = Date.now();
    for (const [key, entry] of this.schemaCache.entries()) {
      if (now - entry.timestamp > 3600000) { // 1 hour
        this.schemaCache.delete(key);
      }
    }

    // Reset hit/miss counters every 10 minutes to prevent overflow
    if (Math.random() < 0.1) { // 10% chance each cleanup
      this.versionHits = Math.floor(this.versionHits * 0.9);
      this.versionMisses = Math.floor(this.versionMisses * 0.9);
      this.diffHits = Math.floor(this.diffHits * 0.9);
      this.diffMisses = Math.floor(this.diffMisses * 0.9);
    }
  }
}

// Global cache manager instance
export const cacheManager = new CacheManager(); 