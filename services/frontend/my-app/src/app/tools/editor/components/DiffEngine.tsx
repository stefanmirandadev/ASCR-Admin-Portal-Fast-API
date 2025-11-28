'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { DiffEngineProps, DiffResult } from '../types/diff';
import { generateStructuredDiff } from '../utils/diffAlgorithm';
import { diffCache } from '../utils/diffCache';

/**
 * DiffEngine: Core component that orchestrates version comparison
 * Features:
 * - Non-blocking computation using requestIdleCallback
 * - Intelligent caching with 90% hit rate target
 * - Error handling and performance monitoring
 * - Integration with existing VersionControlLayout
 */
export function DiffEngine({ 
  leftVersionId, 
  rightVersionId, 
  leftCellLineId, 
  rightCellLineId, 
  onDiffReady, 
  onError 
}: DiffEngineProps) {
  
  const computationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const performanceStartRef = useRef<number | undefined>(undefined);

  /**
   * Fetch version data from API
   */
  const fetchVersionData = useCallback(async (cellLineId: string, versionId: string) => {
    const response = await fetch(`http://localhost:8000/api/editor/celllines/${cellLineId}/versions/${versionId}/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch version ${versionId}: ${response.statusText}`);
    }
    return response.json();
  }, []);

  /**
   * Perform diff computation with performance monitoring
   */
  const computeDiff = useCallback(async (
    leftCellLineId: string,
    leftVersionId: string,
    rightCellLineId: string,
    rightVersionId: string
  ) => {
    performanceStartRef.current = performance.now();
    
    try {
      // Check cache first
      const cacheKey = `${leftCellLineId}:${leftVersionId}:${rightCellLineId}:${rightVersionId}`;
      const cachedDiff = diffCache.getDiff(cacheKey, cacheKey);
      
      if (cachedDiff) {
        console.log('Diff cache hit - using cached result');
        onDiffReady(cachedDiff);
        return;
      }

      // Fetch both versions in parallel
      const [leftVersionData, rightVersionData] = await Promise.all([
        fetchVersionData(leftCellLineId, leftVersionId),
        fetchVersionData(rightCellLineId, rightVersionId)
      ]);

      // Use requestIdleCallback for non-blocking computation
      const computeWithIdleCallback = () => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback((deadline) => {
            try {
              const diff = generateStructuredDiff(leftVersionData, rightVersionData);
              
              // Cache the result
              diffCache.setDiff(cacheKey, cacheKey, diff);
              
              // Performance logging
              const computationTime = performance.now() - (performanceStartRef.current || 0);
              console.log(`Diff computation completed in ${computationTime.toFixed(2)}ms`);
              
              if (computationTime > 200) {
                console.warn(`Diff computation exceeded target time: ${computationTime.toFixed(2)}ms`);
              }
              
              onDiffReady(diff);
            } catch (error) {
              console.error('Diff computation failed:', error);
              onError('Failed to compute differences. Please try again.');
            }
          });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => {
            try {
              const diff = generateStructuredDiff(leftVersionData, rightVersionData);
              diffCache.setDiff(cacheKey, cacheKey, diff);
              
              const computationTime = performance.now() - (performanceStartRef.current || 0);
              console.log(`Diff computation completed in ${computationTime.toFixed(2)}ms`);
              
              onDiffReady(diff);
            } catch (error) {
              console.error('Diff computation failed:', error);
              onError('Failed to compute differences. Please try again.');
            }
          }, 0);
        }
      };

      computeWithIdleCallback();

    } catch (error) {
      console.error('Failed to fetch version data:', error);
      onError(error instanceof Error ? error.message : 'Failed to fetch version data');
    }
  }, [fetchVersionData, onDiffReady, onError]);

  /**
   * Main effect that triggers diff computation when version selections change
   */
  useEffect(() => {
    // Clear any pending computation
    if (computationTimeoutRef.current) {
      clearTimeout(computationTimeoutRef.current);
    }

    // Validate inputs
    if (!leftVersionId || !rightVersionId || !leftCellLineId || !rightCellLineId) {
      return; // Wait for complete selection
    }

    // Debounce rapid version changes
    computationTimeoutRef.current = setTimeout(() => {
      computeDiff(leftCellLineId, leftVersionId, rightCellLineId, rightVersionId);
    }, 100);

    return () => {
      if (computationTimeoutRef.current) {
        clearTimeout(computationTimeoutRef.current);
      }
    };
  }, [leftVersionId, rightVersionId, leftCellLineId, rightCellLineId, computeDiff]);

  // This component only handles logic - no UI rendering
  return null;
}

/**
 * Hook for accessing diff cache statistics
 */
export function useDiffCacheStats() {
  return diffCache.getStats();
}

/**
 * Utility function to clear diff cache (useful for testing)
 */
export function clearDiffCache() {
  diffCache.clear();
} 