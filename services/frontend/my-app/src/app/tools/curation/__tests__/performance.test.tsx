// Performance test utilities for the CurationApp
// These can be run manually or integrated with existing test frameworks

export function measureRenderTime(renderFunction: () => void): number {
  const startTime = performance.now();
  renderFunction();
  const endTime = performance.now();
  return endTime - startTime;
}

export function measureApiCallTime(apiCall: () => Promise<any>): Promise<number> {
  return new Promise(async (resolve) => {
    const startTime = performance.now();
    await apiCall();
    const endTime = performance.now();
    resolve(endTime - startTime);
  });
}

export function testLargeDatasetPerformance(articleCount: number): {
  expectedRenderTime: number;
  maxMemoryUsage: number;
  recommendations: string[];
} {
  return {
    expectedRenderTime: articleCount * 2, // 2ms per article
    maxMemoryUsage: articleCount * 1024, // 1KB per article
    recommendations: [
      'Use virtual scrolling for datasets > 100 items',
      'Implement pagination for large datasets',
      'Consider lazy loading for non-critical data'
    ]
  };
}

export function testPollingPerformance(pollInterval: number, maxRetries: number): {
  expectedBandwidthUsage: number;
  maxConcurrentRequests: number;
  recommendations: string[];
} {
  return {
    expectedBandwidthUsage: (1000 / pollInterval) * 1024, // 1KB per request
    maxConcurrentRequests: maxRetries + 1,
    recommendations: [
      'Use exponential backoff for retries',
      'Implement request deduplication',
      'Consider WebSocket for real-time updates'
    ]
  };
}

// Manual performance test runner
export async function runPerformanceTests() {
  console.log('Running CurationApp Performance Tests...');
  
  // Test 1: Large dataset rendering
  const largeDatasetTest = testLargeDatasetPerformance(1000);
  console.log('Large Dataset Test:', largeDatasetTest);
  
  // Test 2: Polling performance
  const pollingTest = testPollingPerformance(3000, 5);
  console.log('Polling Performance Test:', pollingTest);
  
  // Test 3: API call timing
  const apiCallTime = await measureApiCallTime(async () => {
    await fetch('/api/curation/articles/');
  });
  console.log('API Call Time:', apiCallTime, 'ms');
  
  return {
    largeDatasetTest,
    pollingTest,
    apiCallTime
  };
} 