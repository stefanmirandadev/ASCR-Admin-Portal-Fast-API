interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  polling: {
    interval: number;
    maxRetries: number;
    retryDelay: number;
  };
  features: {
    maxConcurrentCuration: number;
    enableRealTimeUpdates: boolean;
    enableErrorReporting: boolean;
  };
}

export const config: AppConfig = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
    retries: parseInt(process.env.NEXT_PUBLIC_API_RETRIES || '3')
  },
  polling: {
    interval: parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL || '3000'),
    maxRetries: parseInt(process.env.NEXT_PUBLIC_POLLING_MAX_RETRIES || '5'),
    retryDelay: parseInt(process.env.NEXT_PUBLIC_POLLING_RETRY_DELAY || '1000')
  },
  features: {
    maxConcurrentCuration: parseInt(process.env.NEXT_PUBLIC_MAX_CURATION || '20'),
    enableRealTimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REALTIME !== 'false',
    enableErrorReporting: process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING !== 'false'
  }
};

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

// Performance monitoring
export const performanceConfig = {
  enableMetrics: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_METRICS === 'true',
  sampleRate: parseFloat(process.env.NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE || '0.1'),
  maxMetricsPerSession: parseInt(process.env.NEXT_PUBLIC_MAX_METRICS_PER_SESSION || '100')
};

// Feature flags
export const featureFlags = {
  enableAdvancedFiltering: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_FILTERING !== 'false',
  enableBulkOperations: process.env.NEXT_PUBLIC_ENABLE_BULK_OPERATIONS !== 'false',
  enableRealTimeCollaboration: process.env.NEXT_PUBLIC_ENABLE_REALTIME_COLLABORATION === 'true',
  enableOfflineMode: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true'
};

// Accessibility settings
export const accessibilityConfig = {
  enableHighContrast: process.env.NEXT_PUBLIC_ENABLE_HIGH_CONTRAST === 'true',
  enableReducedMotion: process.env.NEXT_PUBLIC_ENABLE_REDUCED_MOTION === 'true',
  enableScreenReaderOptimizations: process.env.NEXT_PUBLIC_ENABLE_SCREEN_READER_OPTIMIZATIONS !== 'false'
}; 