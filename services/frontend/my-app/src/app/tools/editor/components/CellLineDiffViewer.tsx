'use client';

import React, { useMemo } from 'react';
import * as Diff from 'diff';
import { ChangeStatistics } from '../types/editor';

interface CellLineDiffViewerProps {
  originalValue: string;
  modifiedValue: string;
  originalTitle?: string;
  modifiedTitle?: string;
  showStats?: boolean;
}

interface DiffLine {
  type: 'add' | 'remove' | 'normal' | 'context';
  content: string;
  lineNumber?: number;
}

export function CellLineDiffViewer({
  originalValue,
  modifiedValue,
  originalTitle = 'Previous Version',
  modifiedTitle = 'Current Version',
  showStats = true
}: CellLineDiffViewerProps) {
  
  const { diffLines, statistics } = useMemo(() => {
    try {
      // Format JSON for consistent comparison
      const formatCellLineJSON = (jsonString: string): string => {
        try {
          const parsed = JSON.parse(jsonString);
          // Sort keys alphabetically for consistent ordering
          const sortedData = sortKeysDeep(parsed);
          return JSON.stringify(sortedData, null, 2);
        } catch {
          return jsonString; // Return as-is if not valid JSON
        }
      };

      const sortKeysDeep = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(sortKeysDeep);
        } else if (obj !== null && typeof obj === 'object') {
          return Object.keys(obj)
            .sort()
            .reduce((result: any, key: string) => {
              result[key] = sortKeysDeep(obj[key]);
              return result;
            }, {});
        }
        return obj;
      };

      const formattedOriginal = formatCellLineJSON(originalValue);
      const formattedModified = formatCellLineJSON(modifiedValue);

      // Generate line-by-line diff
      const diffResult = Diff.diffLines(formattedOriginal, formattedModified);
      
      const diffLines: DiffLine[] = [];
      let oldLineNumber = 1;
      let newLineNumber = 1;

      diffResult.forEach((part) => {
        const lines = part.value.split('\n');
        // Remove empty last line if present
        if (lines[lines.length - 1] === '') {
          lines.pop();
        }

        lines.forEach((line, index) => {
          if (part.added) {
            diffLines.push({
              type: 'add',
              content: line,
              lineNumber: newLineNumber++
            });
          } else if (part.removed) {
            diffLines.push({
              type: 'remove',
              content: line,
              lineNumber: oldLineNumber++
            });
          } else {
            diffLines.push({
              type: 'normal',
              content: line,
              lineNumber: newLineNumber++
            });
            oldLineNumber++;
          }
        });
      });

      // Calculate statistics
      const additions = diffLines.filter(line => line.type === 'add').length;
      const deletions = diffLines.filter(line => line.type === 'remove').length;
      const totalLines = formattedModified.split('\n').length;

      const statistics: ChangeStatistics = {
        additions,
        deletions,
        modifications: Math.min(additions, deletions),
        totalLines,
        percentageChanged: totalLines > 0 ? Math.round(((additions + deletions) / totalLines) * 100) : 0
      };

      return { diffLines, statistics };
    } catch (error) {
      console.error('Error generating diff:', error);
      return { 
        diffLines: [] as DiffLine[], 
        statistics: { additions: 0, deletions: 0, modifications: 0, totalLines: 0, percentageChanged: 0 } as ChangeStatistics
      };
    }
  }, [originalValue, modifiedValue]);

  if (diffLines.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No differences found</h3>
          <p className="text-sm text-gray-500">
            The selected versions are identical or could not be compared.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-sm font-medium text-gray-900">
              Comparing Changes
            </h3>
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <span className="text-red-600">-{originalTitle}</span>
              <span>→</span>
              <span className="text-green-600">+{modifiedTitle}</span>
            </div>
          </div>
          
          {showStats && (
            <div className="flex items-center space-x-4 text-xs">
              {statistics.additions > 0 && (
                <span className="text-green-600 font-medium">
                  +{statistics.additions} additions
                </span>
              )}
              {statistics.deletions > 0 && (
                <span className="text-red-600 font-medium">
                  -{statistics.deletions} deletions
                </span>
              )}
              {statistics.percentageChanged > 0 && (
                <span className="text-gray-600">
                  {statistics.percentageChanged}% changed
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Diff Content */}
      <div className="overflow-auto max-h-[70vh] bg-white">
        <div className="grid grid-cols-2 divide-x divide-gray-200">
          {/* Original (Left) */}
          <div className="bg-red-50">
            <div className="bg-red-100 px-4 py-2 text-sm font-medium text-red-800 border-b border-red-200">
              {originalTitle}
            </div>
            <div className="font-mono text-sm">
              {diffLines
                .filter(line => line.type === 'remove' || line.type === 'normal')
                .map((line, index) => (
                <div
                  key={`orig-${index}`}
                  className={`px-4 py-1 border-b border-gray-100 ${
                    line.type === 'remove' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-white text-gray-700'
                  }`}
                >
                  <span className="text-gray-400 mr-4 select-none">
                    {line.lineNumber || '-'}
                  </span>
                  <span className="whitespace-pre-wrap">{line.content}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Modified (Right) */}
          <div className="bg-green-50">
            <div className="bg-green-100 px-4 py-2 text-sm font-medium text-green-800 border-b border-green-200">
              {modifiedTitle}
            </div>
            <div className="font-mono text-sm">
              {diffLines
                .filter(line => line.type === 'add' || line.type === 'normal')
                .map((line, index) => (
                <div
                  key={`mod-${index}`}
                  className={`px-4 py-1 border-b border-gray-100 ${
                    line.type === 'add' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-white text-gray-700'
                  }`}
                >
                  <span className="text-gray-400 mr-4 select-none">
                    {line.lineNumber || '-'}
                  </span>
                  <span className="whitespace-pre-wrap">{line.content}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 