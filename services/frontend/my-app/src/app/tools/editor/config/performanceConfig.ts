export interface PerformanceConfig {
  cacheSettings: {
    versionCacheSize: number;
    diffCacheSize: number;
    cacheTTL: number;
    maxMemoryUsage: number;
  };
  virtualScrolling: {
    enabled: boolean;
    itemHeight: number;
    overscan: number;
    bufferSize: number;
  };
  debouncing: {
    versionSelectionDelay: number;
    filterDelay: number;
    searchDelay: number;
    scrollDelay: number;
  };
  performance: {
    enableMonitoring: boolean;
    enablePerfWarnings: boolean;
    maxPerformanceEntries: number;
    memoryCheckInterval: number;
  };
  targets: {
    versionLoadTime: number;
    diffComputeTime: number;
    renderTime: number;
    versionSwitching: number;
    scrollPerformance: number;
    filterTime: number;
    memoryUsage: number;
  };
}

export const defaultPerformanceConfig: PerformanceConfig = {
  cacheSettings: {
    versionCacheSize: 50,           // Number of versions to cache
    diffCacheSize: 30,              // Number of diff results to cache
    cacheTTL: 600000,               // 10 minutes TTL
    maxMemoryUsage: 150 * 1024 * 1024 // 150MB total cache limit
  },
  virtualScrolling: {
    enabled: true,
    itemHeight: 60,                 // Default row height for virtual list
    overscan: 5,                    // Extra items to render outside viewport
    bufferSize: 10                  // Buffer size for dynamic height
  },
  debouncing: {
    versionSelectionDelay: 300,     // Delay version API calls
    filterDelay: 150,               // Delay filter operations
    searchDelay: 200,               // Delay search operations
    scrollDelay: 16                 // Throttle scroll events for 60fps
  },
  performance: {
    enableMonitoring: process.env.NODE_ENV === 'development',
    enablePerfWarnings: true,
    maxPerformanceEntries: 1000,
    memoryCheckInterval: 5000       // Check memory every 5 seconds
  },
  targets: {
    versionLoadTime: 500,           // < 500ms per version fetch from API
    diffComputeTime: 200,           // < 200ms client-side processing
    renderTime: 300,                // < 300ms for complete field display
    versionSwitching: 200,          // < 200ms transition between cached versions
    scrollPerformance: 16,          // 60fps = 16ms per frame
    filterTime: 100,                // < 100ms for show differences toggle
    memoryUsage: 200                // < 200MB total browser memory usage
  }
};

/**
 * Production-optimized configuration with stricter limits
 */
export const productionPerformanceConfig: PerformanceConfig = {
  ...defaultPerformanceConfig,
  cacheSettings: {
    ...defaultPerformanceConfig.cacheSettings,
    versionCacheSize: 30,           // Smaller cache in production
    diffCacheSize: 20,
    maxMemoryUsage: 100 * 1024 * 1024 // 100MB limit
  },
  performance: {
    ...defaultPerformanceConfig.performance,
    enableMonitoring: false,        // Disable detailed monitoring in production
    enablePerfWarnings: false,
    maxPerformanceEntries: 500
  },
  virtualScrolling: {
    ...defaultPerformanceConfig.virtualScrolling,
    overscan: 3,                    // Smaller overscan in production
    bufferSize: 5
  }
};

/**
 * Development configuration with enhanced debugging
 */
export const developmentPerformanceConfig: PerformanceConfig = {
  ...defaultPerformanceConfig,
  cacheSettings: {
    ...defaultPerformanceConfig.cacheSettings,
    versionCacheSize: 100,          // Larger cache for development
    diffCacheSize: 50
  },
  performance: {
    ...defaultPerformanceConfig.performance,
    enableMonitoring: true,
    enablePerfWarnings: true,
    maxPerformanceEntries: 2000     // More detailed tracking
  },
  targets: {
    ...defaultPerformanceConfig.targets,
    versionLoadTime: 1000,          // More lenient targets for dev
    diffComputeTime: 500,
    renderTime: 500
  }
};

/**
 * Get configuration based on environment
 */
export function getPerformanceConfig(): PerformanceConfig {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'production':
      return productionPerformanceConfig;
    case 'development':
      return developmentPerformanceConfig;
    default:
      return defaultPerformanceConfig;
  }
}

/**
 * Custom configuration builder
 */
export class PerformanceConfigBuilder {
  private config: PerformanceConfig;

  constructor(baseConfig: PerformanceConfig = defaultPerformanceConfig) {
    this.config = { ...baseConfig };
  }

  setCacheSize(versionCacheSize: number, diffCacheSize: number): this {
    this.config.cacheSettings.versionCacheSize = versionCacheSize;
    this.config.cacheSettings.diffCacheSize = diffCacheSize;
    return this;
  }

  setCacheTTL(ttl: number): this {
    this.config.cacheSettings.cacheTTL = ttl;
    return this;
  }

  setVirtualScrolling(enabled: boolean, itemHeight?: number, overscan?: number): this {
    this.config.virtualScrolling.enabled = enabled;
    if (itemHeight !== undefined) this.config.virtualScrolling.itemHeight = itemHeight;
    if (overscan !== undefined) this.config.virtualScrolling.overscan = overscan;
    return this;
  }

  setDebounceDelays(
    versionDelay?: number,
    filterDelay?: number,
    searchDelay?: number
  ): this {
    if (versionDelay !== undefined) this.config.debouncing.versionSelectionDelay = versionDelay;
    if (filterDelay !== undefined) this.config.debouncing.filterDelay = filterDelay;
    if (searchDelay !== undefined) this.config.debouncing.searchDelay = searchDelay;
    return this;
  }

  setPerformanceTargets(targets: Partial<PerformanceConfig['targets']>): this {
    this.config.targets = { ...this.config.targets, ...targets };
    return this;
  }

  enableMonitoring(enabled: boolean): this {
    this.config.performance.enableMonitoring = enabled;
    return this;
  }

  build(): PerformanceConfig {
    return { ...this.config };
  }
}

/**
 * Runtime performance configuration adjustments
 */
export class RuntimePerformanceAdjuster {
  private config: PerformanceConfig;
  private memoryPressureDetected = false;

  constructor(config: PerformanceConfig) {
    this.config = { ...config };
    this.setupMemoryPressureDetection();
  }

  adjustForMemoryPressure(): PerformanceConfig {
    if (!this.memoryPressureDetected) {
      return this.config;
    }

    // Reduce cache sizes under memory pressure
    return {
      ...this.config,
      cacheSettings: {
        ...this.config.cacheSettings,
        versionCacheSize: Math.floor(this.config.cacheSettings.versionCacheSize * 0.7),
        diffCacheSize: Math.floor(this.config.cacheSettings.diffCacheSize * 0.7),
        maxMemoryUsage: Math.floor(this.config.cacheSettings.maxMemoryUsage * 0.8)
      },
      virtualScrolling: {
        ...this.config.virtualScrolling,
        overscan: Math.max(1, this.config.virtualScrolling.overscan - 2)
      }
    };
  }

  adjustForPerformance(averageRenderTime: number): PerformanceConfig {
    // If rendering is slow, reduce visual complexity
    if (averageRenderTime > this.config.targets.renderTime * 1.5) {
      return {
        ...this.config,
        virtualScrolling: {
          ...this.config.virtualScrolling,
          overscan: Math.max(1, this.config.virtualScrolling.overscan - 1),
          bufferSize: Math.max(3, this.config.virtualScrolling.bufferSize - 2)
        },
        debouncing: {
          ...this.config.debouncing,
          filterDelay: this.config.debouncing.filterDelay + 50,
          searchDelay: this.config.debouncing.searchDelay + 50
        }
      };
    }

    return this.config;
  }

  private setupMemoryPressureDetection(): void {
    if (typeof window === 'undefined') return;

    // Monitor memory usage
    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
        
        // Detect memory pressure at 80% of limit
        this.memoryPressureDetected = usedMB > limitMB * 0.8;
      }
    }, 10000); // Check every 10 seconds
  }
} 