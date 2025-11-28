import { useState, useEffect, useCallback, useRef } from 'react';
import { API_ENDPOINTS } from '../../../../lib/api';

interface Article {
  id: number;
  filename: string;
  pubmed_id: number | null;
  created_on: string;
  modified_on: string;
  curation_status: 'pending' | 'processing' | 'completed' | 'failed';
  curation_error: string | null;
  curation_started_at: string | null;
  transcription_status: string;
  is_curated: boolean;
  approximate_tokens: number;
}

interface StatusResponse {
  articles: Article[];
  total_count: number;
  processing_count: number;
  completed_count: number;
  failed_count: number;
}

export function useStatusPolling(
  initialArticles: Article[],
  isPolling: boolean = false,
  pollInterval: number = 3000
) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync internal articles state when initialArticles changes
  useEffect(() => {
    setArticles(initialArticles);
  }, [initialArticles]);

  const fetchStatus = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(API_ENDPOINTS.CURATION.STATUS, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: StatusResponse = await response.json();
      setArticles(data.articles);
      setStatus(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // Background fetch without loading state for seamless updates
  const fetchStatusSilent = useCallback(() => {
    fetchStatus(false);
  }, [fetchStatus]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    // Initial fetch with loading indicator
    fetchStatus();
    
    // Start silent polling for seamless updates
    pollingRef.current = setInterval(fetchStatusSilent, pollInterval);
  }, [fetchStatus, fetchStatusSilent, pollInterval]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPolling) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isPolling, startPolling, stopPolling]);

  // Manual refresh function with loading indicator
  const refresh = useCallback(() => {
    fetchStatus(true);
  }, [fetchStatus]);

  return {
    articles,
    status,
    loading,
    error,
    refresh,
    startPolling,
    stopPolling
  };
} 