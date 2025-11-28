'use client';

import React, { useMemo } from 'react';
import { DiffResult } from '../types/diff';
import { DiffField } from './DiffField';
import { useNestedObjectState } from '../hooks/useNestedObjectState';

interface DiffViewerProps {
  diffResults: DiffResult[];
  showDifferencesOnly: boolean;
  onFieldExpand?: (fieldPath: string) => void;
  onFieldCollapse?: (fieldPath: string) => void;
}

export function DiffViewer({ 
  diffResults, 
  showDifferencesOnly, 
  onFieldExpand, 
  onFieldCollapse 
}: DiffViewerProps) {
  const { expandedFields, toggleExpansion, isExpanded } = useNestedObjectState();

  // Filter diff results based on showDifferencesOnly toggle
  const filteredResults = useMemo(() => {
    return filterDiffResults(diffResults, showDifferencesOnly);
  }, [diffResults, showDifferencesOnly]);

  // Handle field expansion with optional callback
  const handleFieldToggle = (fieldPath: string) => {
    const wasExpanded = isExpanded(fieldPath);
    toggleExpansion(fieldPath);
    
    if (wasExpanded && onFieldCollapse) {
      onFieldCollapse(fieldPath);
    } else if (!wasExpanded && onFieldExpand) {
      onFieldExpand(fieldPath);
    }
  };

  if (filteredResults.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium">
            {showDifferencesOnly ? 'No differences found' : 'No data to display'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {showDifferencesOnly ? 'All fields are identical' : 'Select versions to compare'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="diff-viewer h-full overflow-y-auto bg-white">
      <div className="space-y-1 p-2">
        {filteredResults.map((diffResult) => (
          <DiffField
            key={diffResult.fieldPath}
            diffResult={diffResult}
            isExpanded={isExpanded(diffResult.fieldPath)}
            onToggleExpansion={() => handleFieldToggle(diffResult.fieldPath)}
            showDifferencesOnly={showDifferencesOnly}
            indentLevel={0}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Filter diff results based on showDifferencesOnly toggle
 */
function filterDiffResults(
  diffResults: DiffResult[], 
  showDifferencesOnly: boolean
): DiffResult[] {
  if (!showDifferencesOnly) return diffResults;
  
  return diffResults.filter(result => {
    if (result.changeType === 'UNCHANGED' || result.changeType === 'NOT_SET') {
      return false;
    }
    
    // For nested objects, check if any children have changes
    if (result.children) {
      const hasChangedChildren = hasNestedChanges(result);
      return hasChangedChildren;
    }
    
    return true;
  });
}

/**
 * Recursively check if a diff result has any changed children
 */
function hasNestedChanges(diffResult: DiffResult): boolean {
  if (diffResult.changeType !== 'UNCHANGED' && diffResult.changeType !== 'NOT_SET') {
    return true;
  }
  
  if (diffResult.children) {
    return diffResult.children.some(child => hasNestedChanges(child));
  }
  
  return false;
} 