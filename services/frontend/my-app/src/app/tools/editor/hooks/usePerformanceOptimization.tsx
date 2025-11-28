'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { cacheManager, CacheStats } from '../utils/cacheManager';
import { performanceMonitor, PerformanceMetrics } from '../utils/performanceMonitor';
import { getPerformanceConfig, PerformanceConfig } from '../config/performanceConfig';
import { DiffResult } from '../types/diff';
import { CellLineData } from '../types/editor';

export interface PerformanceOptimizationState {
  isOptimized: boolean;
  cacheStats: CacheStats;
  performanceMetrics: PerformanceMetrics;
  memoryUsage: number;
  recommendations: string[];
}

export interface PerformanceOptimizationActions {
  clearCache: () => void;
  invalidateVersion: (cellLineId?: string, versionId?: string) => void;
  optimizeMemory: () => void;
  getCachedVersion: (cellLineId: string, versionId: string) => Promise<CellLineData>;
  getCachedDiff: (leftVersionId: string, rightVersionId: string) => DiffResult[] | null;
  setCachedDiff: (leftVersionId: string, rightVersionId: string, diff: DiffResult[]) => void;
}

/**
 * Main performance optimization hook that coordinates caching, monitoring, and memory management
 */
export function usePerformanceOptimization(): [
  PerformanceOptimizationState,
  PerformanceOptimizationActions
] {
  const [cacheStats, setCacheStats] = useState<CacheStats>(() => cacheManager.getStats());
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>(() => 
    performanceMonitor.getCurrentMetrics()
  );
  const [recommendations, setRecommendations] = useState<string[]>([]);
  
  const config = useRef<PerformanceConfig>(getPerformanceConfig());
  const statsUpdateInterval = useRef<NodeJS.Timeout>();
  const memoryPressureThreshold = config.current.targets.memoryUsage;

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      const newCacheStats = cacheManager.getStats();
      const newPerfMetrics = performanceMonitor.getCurrentMetrics();
      
      setCacheStats(newCacheStats);
      setPerformanceMetrics(newPerfMetrics);
      
      // Update global cache hit rate for performance monitor
      const avgHitRate = (newCacheStats.versionCache.hitRate + newCacheStats.diffCache.hitRate) / 2;
      (globalThis as any).__CACHE_HIT_RATE__ = avgHitRate;
      
      // Generate performance recommendations
      setRecommendations(generateRecommendations(newCacheStats, newPerfMetrics));
    };

    // Initial update
    updateStats();
    
    // Regular updates - reduced frequency to prevent constant reloading
    statsUpdateInterval.current = setInterval(updateStats, 30000); // Changed from 5s to 30s
    
    return () => {
      if (statsUpdateInterval.current) {
        clearInterval(statsUpdateInterval.current);
      }
    };
  }, []);

  // Memory optimization
  const optimizeMemory = useCallback(() => {
    const currentMemory = performanceMetrics.memoryUsage;
    
    if (currentMemory > memoryPressureThreshold) {
      // Clear oldest cache entries
      cacheManager.clearAll();
      
      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }
      
      console.log(`🧹 Memory optimization: Cleared caches (was ${currentMemory.toFixed(1)}MB)`);
    }
  }, [performanceMetrics.memoryUsage, memoryPressureThreshold]);

  // Cache management actions
  const actions: PerformanceOptimizationActions = useMemo(() => ({
    clearCache: () => {
      cacheManager.clearAll();
      setCacheStats(cacheManager.getStats());
    },
    
    invalidateVersion: (cellLineId?: string, versionId?: string) => {
      cacheManager.invalidateVersion(cellLineId, versionId);
      setCacheStats(cacheManager.getStats());
    },
    
    optimizeMemory,
    
    getCachedVersion: async (cellLineId: string, versionId: string) => {
      const startTiming = performanceMonitor.startTiming('versionLoad', {
        cellLineId,
        versionId,
        source: 'cache'
      });
      
      try {
        const result = await cacheManager.getVersion(cellLineId, versionId);
        startTiming();
        return result;
      } catch (error) {
        startTiming();
        throw error;
      }
    },
    
    getCachedDiff: (leftVersionId: string, rightVersionId: string) => {
      const startTiming = performanceMonitor.startTiming('diffLoad', {
        leftVersionId,
        rightVersionId,
        source: 'cache'
      });
      
      const result = cacheManager.getDiff(leftVersionId, rightVersionId);
      startTiming();
      return result;
    },
    
    setCachedDiff: (leftVersionId: string, rightVersionId: string, diff: DiffResult[]) => {
      cacheManager.setDiff(leftVersionId, rightVersionId, diff);
      setCacheStats(cacheManager.getStats());
    }
  }), [optimizeMemory]);

  // Calculate optimization status
  const isOptimized = useMemo(() => {
    const versionHitRate = cacheStats.versionCache.hitRate;
    const diffHitRate = cacheStats.diffCache.hitRate;
    const memoryWithinLimits = performanceMetrics.memoryUsage < memoryPressureThreshold;
    const performanceWithinTargets = 
      performanceMetrics.versionLoadTime < config.current.targets.versionLoadTime &&
      performanceMetrics.diffComputeTime < config.current.targets.diffComputeTime &&
      performanceMetrics.renderTime < config.current.targets.renderTime;

    return versionHitRate > 0.8 && diffHitRate > 0.9 && memoryWithinLimits && performanceWithinTargets;
  }, [cacheStats, performanceMetrics, memoryPressureThreshold]);

  const state: PerformanceOptimizationState = {
    isOptimized,
    cacheStats,
    performanceMetrics,
    memoryUsage: performanceMetrics.memoryUsage,
    recommendations
  };

  return [state, actions];
}

/**
 * Generate performance recommendations based on current metrics
 */
function generateRecommendations(
  cacheStats: CacheStats,
  performanceMetrics: PerformanceMetrics
): string[] {
  const recommendations: string[] = [];
  const config = getPerformanceConfig();

  // Cache efficiency recommendations
  if (cacheStats.versionCache.hitRate < 0.8) {
    recommendations.push('Version cache hit rate is low. Consider pre-loading frequently accessed versions.');
  }
  
  if (cacheStats.diffCache.hitRate < 0.9) {
    recommendations.push('Diff cache hit rate is low. Users may be comparing many unique version pairs.');
  }

  // Performance recommendations
  if (performanceMetrics.versionLoadTime > config.targets.versionLoadTime) {
    recommendations.push('Version loading is slow. Check network conditions or API performance.');
  }
  
  if (performanceMetrics.diffComputeTime > config.targets.diffComputeTime) {
    recommendations.push('Diff computation is slow. Consider optimizing diff algorithm or reducing field count.');
  }
  
  if (performanceMetrics.renderTime > config.targets.renderTime) {
    recommendations.push('Rendering is slow. Consider enabling virtualization or reducing DOM complexity.');
  }

  // Memory recommendations
  if (performanceMetrics.memoryUsage > config.targets.memoryUsage) {
    recommendations.push('Memory usage is high. Consider clearing caches or reducing cache sizes.');
  }

  // Cache size recommendations
  if (cacheStats.totalMemoryUsage > 100 * 1024 * 1024) { // 100MB
    recommendations.push('Cache memory usage is high. Consider reducing cache sizes or TTL.');
  }

  return recommendations;
}

/**
 * Performance optimization for diff operations
 */
export function useOptimizedDiff() {
  const [, { getCachedDiff, setCachedDiff }] = usePerformanceOptimization();

  const computeOptimizedDiff = useCallback(async (
    leftVersion: CellLineData,
    rightVersion: CellLineData,
    leftVersionId: string,
    rightVersionId: string,
    diffFunction: (left: CellLineData, right: CellLineData) => DiffResult[]
  ): Promise<DiffResult[]> => {
    // Try cache first
    const cached = getCachedDiff(leftVersionId, rightVersionId);
    if (cached) {
      return cached;
    }

    // Compute diff with performance monitoring
    const startTiming = performanceMonitor.startTiming('diffCompute', {
      leftVersionId,
      rightVersionId,
      fieldCount: Object.keys(leftVersion).length
    });

    try {
      const diff = diffFunction(leftVersion, rightVersion);
      
      // Cache the result
      setCachedDiff(leftVersionId, rightVersionId, diff);
      
      const duration = startTiming();
      console.log(`📊 Diff computed in ${duration.toFixed(2)}ms for ${Object.keys(leftVersion).length} fields`);
      
      return diff;
    } catch (error) {
      startTiming();
      throw error;
    }
  }, [getCachedDiff, setCachedDiff]);

  return { computeOptimizedDiff };
}

/**
 * Hook for tracking component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(0);

     useEffect(() => {
     const startTime = performance.now();
     
     return () => {
       const endTime = performance.now();
       const renderTime = endTime - startTime;
       
       renderCount.current++;
       lastRenderTime.current = renderTime;
       
       performanceMonitor.recordTiming(`render_${componentName}`, renderTime, {
         renderCount: renderCount.current
       });
     };
   }, [componentName]);

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current
  };
} 