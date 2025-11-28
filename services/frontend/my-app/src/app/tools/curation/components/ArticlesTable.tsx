'use client';

import { useState, useCallback, useEffect } from 'react';
import { CheckIcon, XMarkIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../../../lib/api';

interface Article {
  id: number;
  filename: string;
  pubmed_id: number | null;
  created_on: string;
  modified_on: string;
  curation_status: 'pending' | 'processing' | 'completed' | 'failed';
  curation_error: string | null;
  approximate_tokens: number;
}

interface ArticlesTableProps {
  articles: Article[];
  selectedArticles: number[];
  onSelectionChange: (selected: number[]) => void;
  loading: boolean;
  onStartCuration: () => void;
  onErrorClick?: (articleId: number) => void;
  onRetryClick?: (articleId: number) => void;
  isPolling?: boolean;
}

export function ArticlesTable({ 
  articles, 
  selectedArticles, 
  onSelectionChange, 
  loading,
  onStartCuration,
  onErrorClick,
  onRetryClick,
  isPolling = false
}: ArticlesTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Article;
    direction: 'asc' | 'desc';
  }>({
    key: 'modified_on',
    direction: 'desc'
  });

  const [retryingArticles, setRetryingArticles] = useState<Set<number>>(new Set());

  // Note: Auto-refresh is handled by the parent component's polling hook

  const handleSelectAll = useCallback(() => {
    if (selectedArticles.length === articles.length) {
      onSelectionChange([]);
    } else {
      const selectableArticles = articles
        .filter(article => article.curation_status !== 'processing')
        .slice(0, 20)
        .map(article => article.id);
      onSelectionChange(selectableArticles);
    }
  }, [articles, selectedArticles, onSelectionChange]);

  const handleArticleSelect = useCallback((articleId: number) => {
    const article = articles.find(a => a.id === articleId);
    if (article?.curation_status === 'processing') return;

    if (selectedArticles.includes(articleId)) {
      onSelectionChange(selectedArticles.filter(id => id !== articleId));
    } else if (selectedArticles.length < 20) {
      onSelectionChange([...selectedArticles, articleId]);
    }
  }, [articles, selectedArticles, onSelectionChange]);

  const handleRetry = useCallback(async (articleId: number) => {
    if (!onRetryClick) return;
    
    setRetryingArticles(prev => new Set(prev).add(articleId));
    
    try {
      await onRetryClick(articleId);
      // No need to refresh - polling will handle updates
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setRetryingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(articleId);
        return newSet;
      });
    }
  }, [onRetryClick]);

  const getStatusIndicator = (article: Article) => {
    // Show processing icon if article is being retried (optimistic update)
    if (retryingArticles.has(article.id)) {
      return (
        <ClockIcon className="h-4 w-4 text-blue-500 animate-pulse" />
      );
    }
    
    switch (article.curation_status) {
      case 'completed':
        return (
          <span className="inline-block w-4 h-4 rounded-full bg-green-200" />
        );
      case 'pending':
        return (
          <span className="inline-block w-4 h-4 rounded-full bg-blue-200" />
        );
      case 'failed':
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onErrorClick?.(article.id)}
              className="flex items-center hover:bg-red-50 p-1 rounded transition-colors"
              title="Click to view error details"
            >
              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            </button>
            {onRetryClick && (
              <button
                onClick={() => handleRetry(article.id)}
                disabled={retryingArticles.has(article.id)}
                className="flex items-center hover:bg-blue-50 p-1 rounded transition-colors disabled:opacity-50"
                title="Retry curation"
              >
                <span className="text-blue-600 text-xs font-medium">↻</span>
              </button>
            )}
          </div>
        );
      case 'processing':
        return (
          <ClockIcon className="h-4 w-4 text-blue-500 animate-pulse" />
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const sortedArticles = [...articles].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    // Handle null values
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
    if (bValue === null) return sortConfig.direction === 'asc' ? -1 : 1;
    
    if (sortConfig.direction === 'asc') {
      return aValue < bValue ? -1 : 1;
    } else {
      return aValue > bValue ? -1 : 1;
    }
  });

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium text-gray-900">Articles</h2>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {selectedArticles.length} of {articles.length} selected
              {selectedArticles.length > 0 && ` (max 20)`}
            </span>
            <button
              onClick={onStartCuration}
              disabled={selectedArticles.length === 0 || isPolling}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedArticles.length > 0 && !isPolling
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isPolling ? 'Processing...' : 'Start Curation'}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-2 text-left">
                <input
                  type="checkbox"
                  checked={selectedArticles.length === articles.length && articles.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Filename
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PubMed ID
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tokens
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Modified
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedArticles.map((article) => (
              <tr 
                key={article.id}
                className={`hover:bg-gray-50 transition-colors ${
                  selectedArticles.includes(article.id) ? 'bg-blue-50' : ''
                } ${
                  article.curation_status === 'processing' || retryingArticles.has(article.id) ? 'bg-blue-25' : ''
                }`}
              >
                <td className="px-6 py-2 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedArticles.includes(article.id)}
                    onChange={() => handleArticleSelect(article.id)}
                    disabled={article.curation_status === 'processing' || retryingArticles.has(article.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                  {article.filename}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                  {article.pubmed_id || '-'}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                  {article.approximate_tokens.toLocaleString()}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(article.created_on)}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(article.modified_on)}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm">
                  {getStatusIndicator(article)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {articles.length === 0 && (
        <div className="p-6 text-center text-gray-500">
          No articles available for curation.
        </div>
      )}
    </div>
  );
} 