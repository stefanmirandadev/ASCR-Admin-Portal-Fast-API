'use client';

import React from 'react';
import { VersionInfo } from '../types/editor';

interface VersionPanelProps {
  versionHistory: VersionInfo[];
  currentVersion?: number;
  selectedVersionForComparison?: number;
  isLoading: boolean;
  onVersionSelect: (versionNumber: number) => void;
  onClearComparison: () => void;
}

export function VersionPanel({
  versionHistory,
  currentVersion,
  selectedVersionForComparison,
  isLoading,
  onVersionSelect,
  onClearComparison
}: VersionPanelProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVersionStatus = (versionNumber: number) => {
    if (versionNumber === currentVersion) return 'current';
    if (versionNumber === selectedVersionForComparison) return 'selected';
    return 'default';
  };

  const getVersionStyle = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-blue-50 border-blue-200 text-blue-900 ring-2 ring-blue-500';
      case 'selected':
        return 'bg-green-50 border-green-200 text-green-900 ring-2 ring-green-500';
      default:
        return 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Version History</h3>
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Version History</h3>
        {selectedVersionForComparison && (
          <button
            onClick={onClearComparison}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear comparison
          </button>
        )}
      </div>
      
      {versionHistory.length === 0 ? (
        <p className="text-sm text-gray-500">No version history available</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {versionHistory.slice(0, 10).map((version) => {
            const status = getVersionStatus(version.version_number);
            const isClickable = status !== 'current';
            
            return (
              <div
                key={version.version_number}
                className={`p-3 border rounded-lg transition-all duration-200 ${getVersionStyle(status)} ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
                onClick={() => isClickable && onVersionSelect(version.version_number)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        v{version.version_number}
                      </span>
                      {status === 'current' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Current
                        </span>
                      )}
                      {status === 'selected' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Comparing
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      by {version.created_by}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(version.created_on)}
                    </p>
                    {version.change_summary && (
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {version.change_summary}
                      </p>
                    )}
                  </div>
                  {isClickable && (
                    <div className="flex-shrink-0 ml-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Click a version to compare with current
        </p>
      </div>
    </div>
  );
} 