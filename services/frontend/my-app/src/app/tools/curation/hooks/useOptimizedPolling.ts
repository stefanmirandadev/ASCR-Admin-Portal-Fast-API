import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface UseOptimizedPollingOptions {
  pollInterval: number;
  maxRetries: number;
  retryDelay: number;
  enabled: boolean;
}

export function useOptimizedPolling<T>(
  fetchFunction: () => Promise<T>,
  options: UseOptimizedPollingOptions
) {
  const { pollInterval, maxRetries, retryDelay, enabled } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  const fetchData = useCallback(async (isRetry = false) => {
    if (loading) return; // Prevent concurrent requests
    
    try {
      setLoading(true);
      setError(null);
      
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      lastFetchTimeRef.current = Date.now();
      
      const result = await fetchFunction();
      setData(result);
      setRetryCount(0); // Reset retry count on success
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      // Implement retry logic
      if (isRetry && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchData(true), retryDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, loading, retryCount, maxRetries, retryDelay]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    fetchData();
    intervalRef.current = setInterval(fetchData, pollInterval);
  }, [fetchData, pollInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Memoized refresh function
  const refresh = useMemo(() => () => fetchData(), [fetchData]);

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [enabled, startPolling, stopPolling]);

  return {
    data,
    loading,
    error,
    retryCount,
    refresh,
    startPolling,
    stopPolling,
    lastFetchTime: lastFetchTimeRef.current
  };
} 