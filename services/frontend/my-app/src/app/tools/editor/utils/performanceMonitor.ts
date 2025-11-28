export interface PerformanceMetrics {
  versionLoadTime: number;
  diffComputeTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  scrollPerformance: number;
  filterTime: number;
  componentMountTime: number;
}

export interface PerformanceEntry {
  timestamp: number;
  operation: string;
  duration: number;
  metadata?: Record<string, any>;
}

export interface PerformanceBenchmark {
  name: string;
  target: number; // Target time in ms
  current: number; // Current average time
  status: 'pass' | 'warning' | 'fail';
}

/**
 * Real-time performance monitoring system for the CellLine Editor
 * Tracks response times, memory usage, and cache performance
 */
export class PerformanceMonitor {
  private entries: PerformanceEntry[] = [];
  private readonly maxEntries = 1000;
  private timingStack = new Map<string, number>();
  private operationCounts = new Map<string, number>();
  private isEnabled: boolean;

  // Performance targets from task requirements
  private readonly benchmarks: Record<string, number> = {
    versionLoadTime: 500,     // < 500ms per version fetch
    diffComputeTime: 200,     // < 200ms client-side processing
    renderTime: 300,          // < 300ms for complete field display
    versionSwitching: 200,    // < 200ms transition between cached versions
    scrollPerformance: 16,    // 60fps = 16ms per frame
    filterTime: 100,          // < 100ms for show differences toggle
  };

  constructor(enabled: boolean = process.env.NODE_ENV === 'development') {
    this.isEnabled = enabled;
    
    if (this.isEnabled && typeof window !== 'undefined') {
      // Setup performance observer for paint timing
      this.setupPerformanceObserver();
      
      // Periodic memory monitoring
      setInterval(() => this.recordMemoryUsage(), 5000);
    }
  }

  /**
   * Start timing an operation
   */
  startTiming(operation: string, metadata?: Record<string, any>): () => number {
    if (!this.isEnabled) {
      return () => 0;
    }

    const startTime = performance.now();
    const stackKey = `${operation}_${Date.now()}_${Math.random()}`;
    this.timingStack.set(stackKey, startTime);

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.timingStack.delete(stackKey);
      this.recordTiming(operation, duration, metadata);
      
      return duration;
    };
  }

  /**
   * Record a timing measurement
   */
  recordTiming(operation: string, duration: number, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.entries.push({
      timestamp: Date.now(),
      operation,
      duration,
      metadata
    });

    // Increment operation count
    this.operationCounts.set(operation, (this.operationCounts.get(operation) || 0) + 1);

    // Maintain max entries limit
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Log performance warnings
    this.checkPerformanceWarnings(operation, duration);

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ Performance: ${operation} = ${duration.toFixed(2)}ms`, metadata);
    }
  }

  /**
   * Get average timing for an operation
   */
  getAverageTiming(operation: string, timeWindow?: number): number {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0;
    const relevantEntries = this.entries.filter(
      entry => entry.operation === operation && entry.timestamp > cutoff
    );

    if (relevantEntries.length === 0) return 0;

    const total = relevantEntries.reduce((sum, entry) => sum + entry.duration, 0);
    return total / relevantEntries.length;
  }

  /**
   * Get performance percentiles for an operation
   */
  getPercentiles(operation: string, percentiles: number[] = [50, 90, 95, 99]): Record<number, number> {
    const durations = this.entries
      .filter(entry => entry.operation === operation)
      .map(entry => entry.duration)
      .sort((a, b) => a - b);

    const result: Record<number, number> = {};
    
    percentiles.forEach(p => {
      const index = Math.ceil((p / 100) * durations.length) - 1;
      result[p] = durations[index] || 0;
    });

    return result;
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    const now = Date.now();
    const recentWindow = 60000; // Last minute
    
    return {
      versionLoadTime: this.getAverageTiming('versionLoad', recentWindow),
      diffComputeTime: this.getAverageTiming('diffCompute', recentWindow),
      renderTime: this.getAverageTiming('render', recentWindow),
      memoryUsage: this.getCurrentMemoryUsage(),
      cacheHitRate: this.getCacheHitRate(),
      scrollPerformance: this.getAverageTiming('scroll', recentWindow),
      filterTime: this.getAverageTiming('filter', recentWindow),
      componentMountTime: this.getAverageTiming('componentMount', recentWindow)
    };
  }

  /**
   * Get performance benchmarks with status
   */
  getBenchmarks(): PerformanceBenchmark[] {
    const metrics = this.getCurrentMetrics();
    
    return Object.entries(this.benchmarks).map(([name, target]) => {
      const current = metrics[name as keyof PerformanceMetrics] || 0;
      let status: 'pass' | 'warning' | 'fail' = 'pass';
      
      if (current > target * 1.5) {
        status = 'fail';
      } else if (current > target) {
        status = 'warning';
      }

      return {
        name,
        target,
        current,
        status
      };
    });
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(): void {
    if (!this.isEnabled || typeof window === 'undefined') return;

    const memory = (performance as any).memory;
    if (memory) {
      this.recordTiming('memoryUsage', memory.usedJSHeapSize / 1024 / 1024, {
        totalHeapSize: memory.totalJSHeapSize / 1024 / 1024,
        heapSizeLimit: memory.jsHeapSizeLimit / 1024 / 1024
      });
    }
  }

  /**
   * Get current memory usage in MB
   */
  getCurrentMemoryUsage(): number {
    if (typeof window === 'undefined') return 0;
    
    const memory = (performance as any).memory;
    return memory ? memory.usedJSHeapSize / 1024 / 1024 : 0;
  }

  /**
   * Mark performance milestones
   */
  mark(name: string): void {
    if (!this.isEnabled) return;
    
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }

  /**
   * Measure between two marks
   */
  measure(name: string, startMark: string, endMark?: string): number {
    if (!this.isEnabled) return 0;

    try {
      if (typeof performance !== 'undefined' && performance.measure) {
        performance.measure(name, startMark, endMark);
        
        const entries = performance.getEntriesByName(name, 'measure');
        const latestEntry = entries[entries.length - 1];
        
        if (latestEntry) {
          this.recordTiming(name, latestEntry.duration);
          return latestEntry.duration;
        }
      }
    } catch (error) {
      console.warn('Performance measurement failed:', error);
    }

    return 0;
  }

  /**
   * Get performance summary for reporting
   */
  getSummary(timeWindow?: number): {
    totalOperations: number;
    averageResponseTime: number;
    worstPerformers: { operation: string; avgTime: number }[];
    memoryTrend: number[];
    cacheEfficiency: number;
  } {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0;
    const relevantEntries = this.entries.filter(entry => entry.timestamp > cutoff);
    
    // Calculate averages by operation
    const operationStats = new Map<string, { total: number; count: number }>();
    
    relevantEntries.forEach(entry => {
      const stats = operationStats.get(entry.operation) || { total: 0, count: 0 };
      stats.total += entry.duration;
      stats.count += 1;
      operationStats.set(entry.operation, stats);
    });

    // Find worst performers
    const worstPerformers = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        avgTime: stats.total / stats.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    // Memory trend (last 10 measurements)
    const memoryEntries = relevantEntries
      .filter(entry => entry.operation === 'memoryUsage')
      .slice(-10)
      .map(entry => entry.duration);

    return {
      totalOperations: relevantEntries.length,
      averageResponseTime: relevantEntries.reduce((sum, e) => sum + e.duration, 0) / relevantEntries.length || 0,
      worstPerformers,
      memoryTrend: memoryEntries,
      cacheEfficiency: this.getCacheHitRate()
    };
  }

  /**
   * Clear all performance data
   */
  clear(): void {
    this.entries = [];
    this.operationCounts.clear();
    this.timingStack.clear();
  }

  /**
   * Export performance data for analysis
   */
  exportData(): PerformanceEntry[] {
    return [...this.entries];
  }

  /**
   * Check for performance warnings and log them
   */
  private checkPerformanceWarnings(operation: string, duration: number): void {
    const target = this.benchmarks[operation];
    if (target && duration > target * 1.5) {
      console.warn(`🚨 Performance Warning: ${operation} took ${duration.toFixed(2)}ms (target: ${target}ms)`);
    }
  }

  /**
   * Get cache hit rate from cache manager
   */
  private getCacheHitRate(): number {
    try {
      // This will be injected by the component using the cache manager
      return (globalThis as any).__CACHE_HIT_RATE__ || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Setup performance observer for paint timing
   */
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            this.recordTiming(`paint_${entry.name}`, entry.startTime);
          }
        }
      });

      observer.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('Performance observer setup failed:', error);
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor(); 