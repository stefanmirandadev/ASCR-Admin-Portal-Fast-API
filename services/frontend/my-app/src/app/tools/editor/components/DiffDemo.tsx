'use client';

import React, { useState, useCallback } from 'react';
import { generateStructuredDiff } from '../utils/diffAlgorithm';
import { DiffResult } from '../types/diff';

/**
 * Demo component to test and validate the diff algorithm implementation
 * This will be used to verify the algorithm works correctly with real data
 */
export function DiffDemo() {
  const [leftVersionId, setLeftVersionId] = useState('15');
  const [rightVersionId, setRightVersionId] = useState('14');
  const [cellLineId] = useState('AIBNi001-A');
  const [diffResults, setDiffResults] = useState<DiffResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [performanceStats, setPerformanceStats] = useState<{
    computationTime: number;
    totalFields: number;
    changedFields: number;
    cacheHit: boolean;
  } | null>(null);

  const fetchVersionData = useCallback(async (versionId: string) => {
    const response = await fetch(`http://localhost:8000/api/editor/celllines/${cellLineId}/versions/${versionId}/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch version ${versionId}: ${response.statusText}`);
    }
    return response.json();
  }, [cellLineId]);

  const runDiffTest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setDiffResults(null);
    setPerformanceStats(null);

    try {
      const startTime = performance.now();
      
      // Fetch both versions
      const [leftVersion, rightVersion] = await Promise.all([
        fetchVersionData(leftVersionId),
        fetchVersionData(rightVersionId)
      ]);

      // Run the diff algorithm
      const diff = generateStructuredDiff(leftVersion, rightVersion);
      
      const endTime = performance.now();
      const computationTime = endTime - startTime;

      // Calculate statistics
      const changedFields = diff.filter(d => 
        d.changeType !== 'UNCHANGED' && d.changeType !== 'NOT_SET'
      ).length;

      setDiffResults(diff);
      setPerformanceStats({
        computationTime,
        totalFields: diff.length,
        changedFields,
        cacheHit: false // For first run
      });

      console.log('Diff Algorithm Test Results:', {
        computationTime: `${computationTime.toFixed(2)}ms`,
        totalFields: diff.length,
        changedFields,
        performanceTarget: computationTime < 200 ? '✅ PASSED' : '❌ FAILED'
      });

    } catch (err) {
      console.error('Diff test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [leftVersionId, rightVersionId, fetchVersionData]);

  const renderDiffSummary = () => {
    if (!diffResults) return null;

    const changeTypes = {
      UNCHANGED: diffResults.filter(d => d.changeType === 'UNCHANGED').length,
      MODIFIED: diffResults.filter(d => d.changeType === 'MODIFIED').length,
      ADDED: diffResults.filter(d => d.changeType === 'ADDED').length,
      REMOVED: diffResults.filter(d => d.changeType === 'REMOVED').length,
      NOT_SET: diffResults.filter(d => d.changeType === 'NOT_SET').length,
    };

    return (
      <div className="grid grid-cols-5 gap-4 text-center">
        <div className="bg-gray-100 p-3 rounded">
          <div className="text-2xl font-bold text-gray-600">{changeTypes.UNCHANGED}</div>
          <div className="text-sm text-gray-500">Unchanged</div>
        </div>
        <div className="bg-yellow-100 p-3 rounded">
          <div className="text-2xl font-bold text-yellow-600">{changeTypes.MODIFIED}</div>
          <div className="text-sm text-yellow-600">Modified</div>
        </div>
        <div className="bg-green-100 p-3 rounded">
          <div className="text-2xl font-bold text-green-600">{changeTypes.ADDED}</div>
          <div className="text-sm text-green-600">Added</div>
        </div>
        <div className="bg-red-100 p-3 rounded">
          <div className="text-2xl font-bold text-red-600">{changeTypes.REMOVED}</div>
          <div className="text-sm text-red-600">Removed</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-2xl font-bold text-gray-400">{changeTypes.NOT_SET}</div>
          <div className="text-sm text-gray-400">Not Set</div>
        </div>
      </div>
    );
  };

  const renderSampleChanges = () => {
    if (!diffResults) return null;

    const changedFields = diffResults.filter(d => 
      d.changeType !== 'UNCHANGED' && d.changeType !== 'NOT_SET'
    ).slice(0, 10); // Show first 10 changes

    return (
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Sample Changes (First 10):</h4>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {changedFields.map((field, index) => (
            <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
              <span className="font-mono text-gray-700">{field.fieldPath}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                field.changeType === 'MODIFIED' ? 'bg-yellow-100 text-yellow-800' :
                field.changeType === 'ADDED' ? 'bg-green-100 text-green-800' :
                field.changeType === 'REMOVED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {field.changeType}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Diff Algorithm Test & Demo
        </h2>
        <p className="text-gray-600 mb-6">
          This demo tests the structured template diff algorithm with real cell line version data.
          It validates performance targets ({"<200ms"}) and comprehensive field comparison.
        </p>

        {/* Test Controls */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cell Line ID
            </label>
            <input
              type="text"
              value={cellLineId}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Left Version
            </label>
            <input
              type="text"
              value={leftVersionId}
              onChange={(e) => setLeftVersionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Right Version
            </label>
            <input
              type="text"
              value={rightVersionId}
              onChange={(e) => setRightVersionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Run Test Button */}
        <button
          onClick={runDiffTest}
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            isLoading
              ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Running Diff Test...' : 'Run Diff Algorithm Test'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800 font-medium">Error:</div>
            <div className="text-red-600 text-sm mt-1">{error}</div>
          </div>
        )}

        {/* Performance Stats */}
        {performanceStats && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-medium text-blue-900 mb-3">Performance Results</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-blue-700">Computation Time</div>
                <div className={`text-lg font-bold ${
                  performanceStats.computationTime < 200 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {performanceStats.computationTime.toFixed(2)}ms
                  {performanceStats.computationTime < 200 ? ' ✅' : ' ❌'}
                </div>
                <div className="text-xs text-blue-600">Target: {"<200ms"}</div>
              </div>
              <div>
                <div className="text-sm text-blue-700">Fields Processed</div>
                <div className="text-lg font-bold text-blue-900">
                  {performanceStats.totalFields}
                </div>
                <div className="text-xs text-blue-600">
                  {performanceStats.changedFields} changed
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Diff Results Summary */}
        {diffResults && (
          <div className="mt-6 space-y-4">
            <h3 className="font-medium text-gray-900">Diff Analysis Results</h3>
            {renderDiffSummary()}
            {renderSampleChanges()}
          </div>
        )}
      </div>
    </div>
  );
} 