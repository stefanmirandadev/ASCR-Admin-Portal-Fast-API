'use client';

import React, { useState, useEffect } from 'react';
import { usePerformanceOptimization } from '../hooks/usePerformanceOptimization';
import { performanceMonitor } from '../utils/performanceMonitor';

interface PerformanceDashboardProps {
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

export function PerformanceDashboard({ 
  isVisible = false, 
  onToggleVisibility 
}: PerformanceDashboardProps) {
  const [perfState] = usePerformanceOptimization();
  const [benchmarks, setBenchmarks] = useState(performanceMonitor.getBenchmarks());
  const [summary, setSummary] = useState(performanceMonitor.getSummary(60000)); // Last minute
  
  // Update performance data every 2 seconds
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setBenchmarks(performanceMonitor.getBenchmarks());
      setSummary(performanceMonitor.getSummary(60000));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isVisible]);

  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggleVisibility}
        className={`fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-200 ${
          isVisible 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
        title={isVisible ? 'Hide Performance Dashboard' : 'Show Performance Dashboard'}
      >
        {isVisible ? '📊❌' : '📊'}
      </button>

      {/* Dashboard Panel */}
      {isVisible && (
        <div className="fixed bottom-20 right-4 z-40 w-80 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              ⚡ Performance Monitor
              <span className={`w-2 h-2 rounded-full ${
                perfState.isOptimized ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
            </h3>
          </div>

          <div className="p-4 space-y-4">
            {/* Cache Statistics */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Cache Performance</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Version Cache:</span>
                  <span className={`font-mono ${
                    perfState.cacheStats.versionCache.hitRate > 0.8 ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {(perfState.cacheStats.versionCache.hitRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Diff Cache:</span>
                  <span className={`font-mono ${
                    perfState.cacheStats.diffCache.hitRate > 0.9 ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {(perfState.cacheStats.diffCache.hitRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Memory Usage:</span>
                  <span className="font-mono text-blue-600">
                    {(perfState.cacheStats.totalMemoryUsage / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Response Times</h4>
              <div className="space-y-1 text-sm">
                {benchmarks.map(benchmark => (
                  <div key={benchmark.name} className="flex justify-between items-center">
                    <span className="capitalize">
                      {benchmark.name.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {benchmark.current.toFixed(0)}ms
                      </span>
                      <span className={`w-2 h-2 rounded-full ${
                        benchmark.status === 'pass' ? 'bg-green-500' :
                        benchmark.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Memory Trend */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Memory Trend</h4>
              <div className="h-16 bg-gray-50 rounded p-2 relative">
                <MemoryTrendChart data={summary.memoryTrend} />
              </div>
            </div>

            {/* Performance Summary */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Activity Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Operations:</span>
                  <span className="font-mono">{summary.totalOperations}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Response:</span>
                  <span className="font-mono">{summary.averageResponseTime.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Efficiency:</span>
                  <span className="font-mono">{(summary.cacheEfficiency * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Worst Performers */}
            {summary.worstPerformers.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Slow Operations</h4>
                <div className="space-y-1 text-xs">
                  {summary.worstPerformers.slice(0, 3).map((perf, index) => (
                    <div key={index} className="flex justify-between text-red-600">
                      <span>{perf.operation}:</span>
                      <span className="font-mono">{perf.avgTime.toFixed(1)}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {perfState.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Recommendations</h4>
                <div className="space-y-1 text-xs text-yellow-700">
                  {perfState.recommendations.slice(0, 2).map((rec, index) => (
                    <div key={index} className="p-2 bg-yellow-50 rounded">
                      💡 {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-gray-200 flex gap-2">
            <button
              onClick={() => {
                performanceMonitor.clear();
                setBenchmarks(performanceMonitor.getBenchmarks());
                setSummary(performanceMonitor.getSummary());
              }}
              className="flex-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Clear Data
            </button>
            <button
              onClick={() => {
                const data = {
                  timestamp: new Date().toISOString(),
                  perfState,
                  benchmarks,
                  summary
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `performance-report-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="flex-1 px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
            >
              Export Report
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Simple memory trend visualization
 */
function MemoryTrendChart({ data }: { data: number[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400">
        No memory data
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div className="flex items-end justify-between h-full">
      {data.map((value, index) => {
        const height = ((value - min) / range) * 100;
        return (
          <div
            key={index}
            className={`w-1 rounded-t ${
              value > max * 0.8 ? 'bg-red-400' :
              value > max * 0.6 ? 'bg-yellow-400' : 'bg-green-400'
            }`}
            style={{ height: `${Math.max(height, 10)}%` }}
            title={`${value.toFixed(1)}MB`}
          />
        );
      })}
    </div>
  );
} 