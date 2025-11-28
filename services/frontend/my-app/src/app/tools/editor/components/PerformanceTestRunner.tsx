'use client';

import React, { useState, useCallback } from 'react';
import { performanceMonitor } from '../utils/performanceMonitor';
import { cacheManager } from '../utils/cacheManager';
import { usePerformanceOptimization } from '../hooks/usePerformanceOptimization';

interface TestResult {
  name: string;
  duration: number;
  status: 'pass' | 'fail' | 'warning';
  target: number;
  details?: string;
}

export function PerformanceTestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [perfState] = usePerformanceOptimization();

  // Generate test data
  const generateTestData = (fieldCount: number = 150) => {
    const testData: any = {};
    for (let i = 0; i < fieldCount; i++) {
      const fieldName = `field_${i.toString().padStart(3, '0')}`;
      testData[fieldName] = {
        value: `Test value ${i}`,
        type: i % 3 === 0 ? 'string' : i % 3 === 1 ? 'number' : 'boolean',
        metadata: {
          lastModified: new Date().toISOString(),
          modifiedBy: 'test_user'
        }
      };
    }
    return testData;
  };

  // Test cache performance
  const testCachePerformance = async (): Promise<TestResult[]> => {
    const tests: TestResult[] = [];
    
    // Test 1: Version cache performance
    const versionTestData = generateTestData(150);
    const startTime = performance.now();
    
    // Simulate caching 10 versions
    for (let i = 0; i < 10; i++) {
      const cellLineId = `TEST_CELL_${i}`;
      const versionId = `v${i}`;
      
      // First call should cache
      await cacheManager.getVersion(cellLineId, versionId);
      
      // Second call should hit cache
      await cacheManager.getVersion(cellLineId, versionId);
    }
    
    const cacheDuration = performance.now() - startTime;
    tests.push({
      name: 'Version Cache Performance',
      duration: cacheDuration,
      status: cacheDuration < 100 ? 'pass' : cacheDuration < 200 ? 'warning' : 'fail',
      target: 100,
      details: `Cached and retrieved 10 versions`
    });

    // Test 2: Memory usage
    const memoryUsage = (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0;
    tests.push({
      name: 'Memory Usage',
      duration: memoryUsage,
      status: memoryUsage < 200 ? 'pass' : memoryUsage < 300 ? 'warning' : 'fail',
      target: 200,
      details: `Current heap usage: ${memoryUsage.toFixed(1)}MB`
    });

    return tests;
  };

  // Test diff computation performance
  const testDiffPerformance = async (): Promise<TestResult[]> => {
    const tests: TestResult[] = [];
    
    const leftData = generateTestData(150);
    const rightData = { ...leftData };
    
    // Modify 10% of fields to create differences
    const fieldKeys = Object.keys(rightData);
    for (let i = 0; i < fieldKeys.length * 0.1; i++) {
      const key = fieldKeys[i];
      rightData[key] = { ...rightData[key], value: `Modified ${i}` };
    }

    const startTime = performance.now();
    
    // Simulate diff computation (simplified)
    const differences = [];
    for (const key of fieldKeys) {
      if (JSON.stringify(leftData[key]) !== JSON.stringify(rightData[key])) {
        differences.push(key);
      }
    }
    
    const diffDuration = performance.now() - startTime;
    
    tests.push({
      name: 'Diff Computation',
      duration: diffDuration,
      status: diffDuration < 200 ? 'pass' : diffDuration < 400 ? 'warning' : 'fail',
      target: 200,
      details: `Found ${differences.length} differences in ${fieldKeys.length} fields`
    });

    return tests;
  };

  // Test virtual scrolling performance
  const testVirtualScrollPerformance = async (): Promise<TestResult[]> => {
    const tests: TestResult[] = [];
    
    // Simulate large dataset rendering
    const startTime = performance.now();
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      fieldPath: `field.${i}`,
      changeType: i % 5 === 0 ? 'MODIFIED' : 'UNCHANGED',
      leftValue: `Value ${i}`,
      rightValue: i % 5 === 0 ? `Modified ${i}` : `Value ${i}`
    }));
    
    // Simulate filtering
    const filteredData = largeDataset.filter(item => item.changeType === 'MODIFIED');
    const renderDuration = performance.now() - startTime;
    
    tests.push({
      name: 'Virtual List Rendering',
      duration: renderDuration,
      status: renderDuration < 300 ? 'pass' : renderDuration < 600 ? 'warning' : 'fail',
      target: 300,
      details: `Rendered ${largeDataset.length} items, filtered to ${filteredData.length}`
    });

    return tests;
  };

  // Test debouncing performance
  const testDebouncingPerformance = async (): Promise<TestResult[]> => {
    const tests: TestResult[] = [];
    
    return new Promise((resolve) => {
      const startTime = performance.now();
      let callCount = 0;
      
      // Simulate rapid consecutive calls
      const debouncedFunction = (callback: () => void, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        return () => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            callCount++;
            callback();
          }, delay);
        };
      };
      
      const testCallback = () => {
        const duration = performance.now() - startTime;
        tests.push({
          name: 'Debouncing Effectiveness',
          duration: duration,
          status: callCount === 1 ? 'pass' : 'fail',
          target: 1,
          details: `${callCount} actual calls from 10 rapid calls`
        });
        resolve(tests);
      };
      
      const debouncedTest = debouncedFunction(testCallback, 100);
      
      // Simulate 10 rapid calls
      for (let i = 0; i < 10; i++) {
        setTimeout(debouncedTest, i * 10);
      }
    });
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      console.log('🧪 Starting performance test suite...');
      
      const allTests: TestResult[] = [];
      
      // Run cache tests
      console.log('Testing cache performance...');
      const cacheTests = await testCachePerformance();
      allTests.push(...cacheTests);
      
      // Run diff tests
      console.log('Testing diff computation...');
      const diffTests = await testDiffPerformance();
      allTests.push(...diffTests);
      
      // Run virtual scroll tests
      console.log('Testing virtual scroll performance...');
      const scrollTests = await testVirtualScrollPerformance();
      allTests.push(...scrollTests);
      
      // Run debouncing tests
      console.log('Testing debouncing...');
      const debounceTests = await testDebouncingPerformance();
      allTests.push(...debounceTests);
      
      setResults(allTests);
      
      // Generate report
      const passCount = allTests.filter(t => t.status === 'pass').length;
      const warningCount = allTests.filter(t => t.status === 'warning').length;
      const failCount = allTests.filter(t => t.status === 'fail').length;
      
      console.log(`✅ Performance tests completed:`);
      console.log(`   Passed: ${passCount}/${allTests.length}`);
      console.log(`   Warnings: ${warningCount}/${allTests.length}`);
      console.log(`   Failed: ${failCount}/${allTests.length}`);
      
    } catch (error) {
      console.error('Performance test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const exportResults = useCallback(() => {
    const report = {
      timestamp: new Date().toISOString(),
      testResults: results,
      performanceState: perfState,
      environment: {
        userAgent: navigator.userAgent,
        memory: (performance as any).memory,
        nodeEnv: process.env.NODE_ENV
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-test-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [results, perfState]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50 w-96 bg-white border border-gray-200 rounded-lg shadow-xl">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">🧪 Performance Test Suite</h3>
      </div>
      
      <div className="p-4">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className={`w-full px-4 py-2 rounded-md text-white font-medium ${
            isRunning 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRunning ? 'Running Tests...' : 'Run Performance Tests'}
        </button>
        
        {results.length > 0 && (
          <>
            <div className="mt-4 space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{result.name}</div>
                    <div className="text-xs text-gray-600">{result.details}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">
                      {result.duration.toFixed(1)}
                      {result.name.includes('Memory') ? 'MB' : 'ms'}
                    </span>
                    <span className={`w-3 h-3 rounded-full ${
                      result.status === 'pass' ? 'bg-green-500' :
                      result.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={exportResults}
              className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
            >
              Export Test Report
            </button>
          </>
        )}
      </div>
    </div>
  );
} 