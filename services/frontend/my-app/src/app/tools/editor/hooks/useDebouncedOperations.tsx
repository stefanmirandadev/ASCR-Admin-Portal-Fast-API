'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
// @ts-ignore - lodash types may not be fully compatible
import { debounce, throttle } from 'lodash';
import { getPerformanceConfig } from '../config/performanceConfig';
import { performanceMonitor } from '../utils/performanceMonitor';

export interface DebouncedOperationsState {
  isVersionSelectionPending: boolean;
  isFilterPending: boolean;
  isSearchPending: boolean;
  pendingOperations: number;
}

export interface DebouncedOperationsActions {
  debouncedVersionSelect: (cellLineId: string, versionId: string, panel: 'left' | 'right') => void;
  debouncedFilter: (showDifferencesOnly: boolean) => void;
  debouncedSearch: (searchTerm: string) => void;
  throttledScroll: (scrollHandler: () => void) => () => void;
  cancelPendingOperations: () => void;
}

/**
 * Hook for managing debounced operations to improve performance and UX
 */
export function useDebouncedOperations(
  onVersionSelect?: (cellLineId: string, versionId: string, panel: 'left' | 'right') => void,
  onFilter?: (showDifferencesOnly: boolean) => void,
  onSearch?: (searchTerm: string) => void
): [DebouncedOperationsState, DebouncedOperationsActions] {
  
  const [isVersionSelectionPending, setIsVersionSelectionPending] = useState(false);
  const [isFilterPending, setIsFilterPending] = useState(false);
  const [isSearchPending, setIsSearchPending] = useState(false);
  
  const config = getPerformanceConfig();
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      abortControllers.current.forEach(controller => controller.abort());
      abortControllers.current.clear();
    };
  }, []);

  // Version selection with deduplication and performance tracking
  const debouncedVersionSelect = useMemo(
    () => debounce(
      (cellLineId: string, versionId: string, panel: 'left' | 'right') => {
        if (!onVersionSelect) return;

        const startTiming = performanceMonitor.startTiming('versionSwitching', {
          cellLineId,
          versionId,
          panel
        });

        // Cancel any existing request for this panel
        const requestKey = `version_${panel}`;
        const existingController = abortControllers.current.get(requestKey);
        if (existingController) {
          existingController.abort();
        }

        // Create new abort controller
        const controller = new AbortController();
        abortControllers.current.set(requestKey, controller);

        try {
          setIsVersionSelectionPending(false);
          onVersionSelect(cellLineId, versionId, panel);
          
          const duration = startTiming();
          console.log(`⚡ Version switch completed in ${duration.toFixed(2)}ms`);
          
          // Clean up controller
          abortControllers.current.delete(requestKey);
        } catch (error) {
          startTiming();
          console.error('Version selection failed:', error);
          abortControllers.current.delete(requestKey);
        }
      },
      config.debouncing.versionSelectionDelay
    ),
    [onVersionSelect, config.debouncing.versionSelectionDelay]
  );

  // Filter operations with performance tracking
  const debouncedFilter = useMemo(
    () => debounce(
      (showDifferencesOnly: boolean) => {
        if (!onFilter) return;

        const startTiming = performanceMonitor.startTiming('filter', {
          showDifferencesOnly
        });

        try {
          setIsFilterPending(false);
          onFilter(showDifferencesOnly);
          
          const duration = startTiming();
          console.log(`🔍 Filter applied in ${duration.toFixed(2)}ms`);
        } catch (error) {
          startTiming();
          console.error('Filter operation failed:', error);
        }
      },
      config.debouncing.filterDelay
    ),
    [onFilter, config.debouncing.filterDelay]
  );

  // Search operations with abort capability
  const debouncedSearch = useMemo(
    () => debounce(
      (searchTerm: string) => {
        if (!onSearch) return;

        const startTiming = performanceMonitor.startTiming('search', {
          searchLength: searchTerm.length,
          hasQuery: searchTerm.length > 0
        });

        // Cancel previous search
        const existingController = abortControllers.current.get('search');
        if (existingController) {
          existingController.abort();
        }

        if (searchTerm.length === 0) {
          setIsSearchPending(false);
          onSearch(searchTerm);
          startTiming();
          return;
        }

        // Create new search controller
        const controller = new AbortController();
        abortControllers.current.set('search', controller);

        try {
          setIsSearchPending(false);
          onSearch(searchTerm);
          
          const duration = startTiming();
          console.log(`🔎 Search completed in ${duration.toFixed(2)}ms`);
          
          abortControllers.current.delete('search');
        } catch (error) {
          startTiming();
          console.error('Search operation failed:', error);
          abortControllers.current.delete('search');
        }
      },
      config.debouncing.searchDelay
    ),
    [onSearch, config.debouncing.searchDelay]
  );

  // Throttled scroll handler for 60fps performance
  const throttledScroll = useCallback(
    (scrollHandler: () => void) => {
      return throttle(() => {
        const startTiming = performanceMonitor.startTiming('scroll');
        
        try {
          scrollHandler();
          const duration = startTiming();
          
          // Only log if scroll performance is poor
          if (duration > config.targets.scrollPerformance) {
            console.warn(`📜 Slow scroll: ${duration.toFixed(2)}ms (target: ${config.targets.scrollPerformance}ms)`);
          }
        } catch (error) {
          startTiming();
          console.error('Scroll handler failed:', error);
        }
      }, config.debouncing.scrollDelay);
    },
    [config.debouncing.scrollDelay, config.targets.scrollPerformance]
  );

  // Wrapper functions that set pending state
  const wrappedVersionSelect = useCallback(
    (cellLineId: string, versionId: string, panel: 'left' | 'right') => {
      setIsVersionSelectionPending(true);
      debouncedVersionSelect(cellLineId, versionId, panel);
    },
    [debouncedVersionSelect]
  );

  const wrappedFilter = useCallback(
    (showDifferencesOnly: boolean) => {
      setIsFilterPending(true);
      debouncedFilter(showDifferencesOnly);
    },
    [debouncedFilter]
  );

  const wrappedSearch = useCallback(
    (searchTerm: string) => {
      setIsSearchPending(true);
      debouncedSearch(searchTerm);
    },
    [debouncedSearch]
  );

  // Cancel all pending operations
  const cancelPendingOperations = useCallback(() => {
    // Cancel debounced functions
    debouncedVersionSelect.cancel();
    debouncedFilter.cancel();
    debouncedSearch.cancel();

    // Abort any in-flight requests
    abortControllers.current.forEach(controller => controller.abort());
    abortControllers.current.clear();

    // Reset pending states
    setIsVersionSelectionPending(false);
    setIsFilterPending(false);
    setIsSearchPending(false);
  }, [debouncedVersionSelect, debouncedFilter, debouncedSearch]);

  // Calculate total pending operations
  const pendingOperations = [
    isVersionSelectionPending,
    isFilterPending,
    isSearchPending
  ].filter(Boolean).length;

  const state: DebouncedOperationsState = {
    isVersionSelectionPending,
    isFilterPending,
    isSearchPending,
    pendingOperations
  };

  const actions: DebouncedOperationsActions = {
    debouncedVersionSelect: wrappedVersionSelect,
    debouncedFilter: wrappedFilter,
    debouncedSearch: wrappedSearch,
    throttledScroll,
    cancelPendingOperations
  };

  return [state, actions];
}

/**
 * Hook for debounced input handling with immediate visual feedback
 */
export function useDebouncedInput<T>(
  initialValue: T,
  onDebouncedChange: (value: T) => void,
  delay: number = 300
) {
  const [displayValue, setDisplayValue] = useState<T>(initialValue);
  const [isPending, setIsPending] = useState(false);

  const debouncedCallback = useMemo(
    () => debounce((value: T) => {
      onDebouncedChange(value);
      setIsPending(false);
    }, delay),
    [onDebouncedChange, delay]
  );

  const setValue = useCallback((value: T) => {
    setDisplayValue(value);
    setIsPending(true);
    debouncedCallback(value);
  }, [debouncedCallback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);

  return {
    value: displayValue,
    setValue,
    isPending
  };
}

/**
 * Hook for batch operations with automatic debouncing
 */
export function useBatchedOperations<T>(
  onBatchProcess: (items: T[]) => void,
  batchSize: number = 10,
  delay: number = 100
) {
  const batch = useRef<T[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const processBatch = useMemo(
    () => debounce(() => {
      if (batch.current.length === 0) return;

      const startTiming = performanceMonitor.startTiming('batchOperation', {
        batchSize: batch.current.length
      });

      try {
        onBatchProcess([...batch.current]);
        batch.current = [];
        setPendingCount(0);
        
        const duration = startTiming();
        console.log(`📦 Batch processed in ${duration.toFixed(2)}ms`);
      } catch (error) {
        startTiming();
        console.error('Batch processing failed:', error);
      }
    }, delay),
    [onBatchProcess, delay]
  );

  const addToBatch = useCallback((item: T) => {
    batch.current.push(item);
    setPendingCount(batch.current.length);

    // Process immediately if batch is full
    if (batch.current.length >= batchSize) {
      processBatch.flush();
    } else {
      processBatch();
    }
  }, [batchSize, processBatch]);

  const flushBatch = useCallback(() => {
    processBatch.flush();
  }, [processBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processBatch.cancel();
    };
  }, [processBatch]);

  return {
    addToBatch,
    flushBatch,
    pendingCount
  };
} 