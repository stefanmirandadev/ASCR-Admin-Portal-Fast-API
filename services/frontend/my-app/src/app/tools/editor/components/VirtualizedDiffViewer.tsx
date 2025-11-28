'use client';

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
// @ts-expect-error - react-window types may not be fully compatible
import { FixedSizeList as List, VariableSizeList } from 'react-window';
import { DiffResult } from '../types/diff';
import { DiffField } from './DiffField';
import { useNestedObjectState } from '../hooks/useNestedObjectState';
import { useRenderPerformance } from '../hooks/usePerformanceOptimization';
import { performanceMonitor } from '../utils/performanceMonitor';
import { getPerformanceConfig } from '../config/performanceConfig';

interface VirtualizedDiffViewerProps {
  diffResults: DiffResult[];
  showDifferencesOnly: boolean;
  height?: number;
  itemHeight?: number;
  onFieldExpand?: (fieldPath: string) => void;
  onFieldCollapse?: (fieldPath: string) => void;
  isScrollLocked?: boolean;
  onScroll?: (scrollTop: number) => void;
  scrollTop?: number;
  leftCellLine?: string | null;
  leftVersion?: string | null;
  rightCellLine?: string | null;
  rightVersion?: string | null;
}

export function VirtualizedDiffViewer({ 
  diffResults, 
  showDifferencesOnly, 
  itemHeight = 64,
  onFieldExpand, 
  onFieldCollapse,
  isScrollLocked = false,
  onScroll,
  scrollTop = 0,
  leftCellLine,
  leftVersion,
  rightCellLine,
  rightVersion
}: VirtualizedDiffViewerProps) {
  const { toggleExpansion, isExpanded } = useNestedObjectState();
  const { renderCount } = useRenderPerformance('VirtualizedDiffViewer');
  
  const listRef = useRef<VariableSizeList>(null);
  const config = getPerformanceConfig();

  // Filter diff results with memoization and performance tracking
  const filteredResults = useMemo(() => {
    const startTiming = performanceMonitor.startTiming('filter', {
      totalResults: diffResults.length,
      showDifferencesOnly
    });

    try {
      const filtered = filterDiffResults(diffResults, showDifferencesOnly);
      const duration = startTiming();
      
      if (duration > config.targets.filterTime) {
        console.warn(`🐌 Slow filter: ${duration.toFixed(2)}ms for ${diffResults.length} items`);
      }
      
      return filtered;
    } catch (error) {
      startTiming();
      throw error;
    }
  }, [diffResults, showDifferencesOnly, config.targets.filterTime]);



  // Maintain scroll position during updates and state changes
  const scrollTopRef = useRef(scrollTop);
  const lastScrollTop = useRef(0);
  
  useEffect(() => {
    scrollTopRef.current = scrollTop;
  }, [scrollTop]);
  


  // Handle field expansion with performance tracking
  const handleFieldToggle = useCallback((fieldPath: string) => {
    const startTiming = performanceMonitor.startTiming('fieldToggle', { fieldPath });
    
    try {
      const wasExpanded = isExpanded(fieldPath);
      toggleExpansion(fieldPath);
      
      if (wasExpanded && onFieldCollapse) {
        onFieldCollapse(fieldPath);
      } else if (!wasExpanded && onFieldExpand) {
        onFieldExpand(fieldPath);
      }
      
      startTiming();
    } catch (error) {
      startTiming();
      throw error;
    }
  }, [isExpanded, toggleExpansion, onFieldCollapse, onFieldExpand]);

  // Optimized scroll handler with scroll position preservation
  const handleScroll = useCallback(({ scrollTop: newScrollTop }: { scrollTop: number }) => {
    // Save current scroll position for restoration
    lastScrollTop.current = newScrollTop;
    
    // Only call scroll handler, avoid performance monitoring during scroll for stability
    if (onScroll && !isScrollLocked) {
      onScroll(newScrollTop);
    }
  }, [onScroll, isScrollLocked]);

  // Simplified Row renderer - no array expansion complexity
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const diffResult = filteredResults[index];
    if (!diffResult) return null;

    return (
      <div style={style} className="virtual-row-container">
        <MemoizedDiffField
          diffResult={diffResult}
          isExpanded={isExpanded(diffResult.fieldPath)}
          onToggleExpansion={() => handleFieldToggle(diffResult.fieldPath)}
          showDifferencesOnly={showDifferencesOnly}
          indentLevel={0}
          isVirtualized={true}
          leftCellLine={leftCellLine}
          leftVersion={leftVersion}
          rightCellLine={rightCellLine}
          rightVersion={rightVersion}
        />
      </div>
    );
  }, [filteredResults, isExpanded, handleFieldToggle, showDifferencesOnly, leftCellLine, leftVersion, rightCellLine, rightVersion]);

  // Helper function to check if field has significant text content
  const hasSignificantTextContent = useCallback((diffResult: DiffResult): boolean => {
    const leftText = String(diffResult.leftValue || '');
    const rightText = String(diffResult.rightValue || '');
    const maxLength = Math.max(leftText.length, rightText.length);
    
    // Consider text significant if it's longer than 50 characters
    return maxLength > 50;
  }, []);

  // Simplified content-aware height calculation - no array expansion complexity
  const getItemSize = useCallback((index: number) => {
    const diffResult = filteredResults[index];
    if (!diffResult) return 48; // Reduced default height for simple fields
    
    const isFieldExpanded = isExpanded(diffResult.fieldPath);
    
    // Start with base height - reduced for more compact layout
    let calculatedHeight = 48;
    
    // Check if this field contains arrays - now use fixed height since arrays use modal
    const hasArrays = Array.isArray(diffResult.leftValue) || Array.isArray(diffResult.rightValue);
    if (hasArrays) {
      // Fixed height for all array summaries - reduced for compact layout
      return 60; // Consistent height for array summary components
    }
    
    // Enhanced text content height calculation (for non-array fields)
    const leftText = String(diffResult.leftValue || '');
    const rightText = String(diffResult.rightValue || '');
    
    // Only calculate text height for significant text content
    if (hasSignificantTextContent(diffResult)) {
      const textHeight = calculateTextHeight(leftText, rightText);
      calculatedHeight = Math.max(calculatedHeight, textHeight);
    }
    
    // Check if this field contains complex object content (non-array)
    const hasComplexContent = (value: any) => {
      return value && typeof value === 'object' && !Array.isArray(value) && 
             Object.keys(value).length > 0;
    };
    
    const leftIsComplex = hasComplexContent(diffResult.leftValue);
    const rightIsComplex = hasComplexContent(diffResult.rightValue);
    
    // If field has complex object content that's not an array
    if (leftIsComplex || rightIsComplex) {
      // Base height for object content - reduced
      let objectHeight = 60;
      
      // Add height for expanded state
      if (isFieldExpanded) {
        const childrenCount = diffResult.children?.length || 0;
        const extraHeight = Math.min(childrenCount * 30, 160); // Reduced spacing
        objectHeight += extraHeight;
      }
      
      calculatedHeight = Math.max(calculatedHeight, objectHeight);
    }
    
    // Reduced professional padding
    return calculatedHeight + 8; // 4px top + 4px bottom padding
  }, [filteredResults, isExpanded, hasSignificantTextContent]);

  // Helper function for text height calculation
  const calculateTextHeight = (leftText: string, rightText: string): number => {
    // Estimate wrapped lines (assuming 60 chars per line in diff view)
    const leftLines = Math.ceil(leftText.length / 60);
    const rightLines = Math.ceil(rightText.length / 60);
    const maxLines = Math.max(leftLines, rightLines);
    
    // 24px per line + 8px line spacing, minimum 64px
    return Math.max(64, maxLines * 32);
  };

  // Very stable key for virtual list to preserve scroll position
  const listKey = useMemo(() => {
    // Use a consistent key since we always use VariableSizeList
    return 'diff-list-variable';
  }, []);

  // Empty state with performance info
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
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-blue-400 mt-2">
              Renders: {renderCount} | Items processed: {diffResults.length} | Filtered: {filteredResults.length}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Simplified virtualized list - no global expansion controls needed
  return (
    <div className="virtualized-diff-viewer bg-white relative pr-6" style={{ width: '100%', height: '700px' }}>
      {/* Virtual List Container - Full height since no controls needed */}
      <div style={{ height: '100%' }}>
        <VariableSizeList
          key={listKey}
          ref={listRef}
          height={700} // Increased height for better viewing
          width="100%"
          itemCount={filteredResults.length}
          itemSize={getItemSize}
          onScroll={handleScroll}
          className="diff-virtual-list"
          overscanCount={config.virtualScrolling.overscan}
        >
          {Row}
        </VariableSizeList>
      </div>
    </div>
  );
}



// Memoized DiffField component for better performance
const MemoizedDiffField = React.memo(DiffField, (prevProps, nextProps) => {
  // Quick shallow checks first
  if (
    prevProps.diffResult.fieldPath !== nextProps.diffResult.fieldPath ||
    prevProps.diffResult.changeType !== nextProps.diffResult.changeType ||
    prevProps.isExpanded !== nextProps.isExpanded ||
    prevProps.showDifferencesOnly !== nextProps.showDifferencesOnly
  ) {
    return false;
  }
  
  // More efficient value comparison - avoid JSON.stringify
  const prevLeft = prevProps.diffResult.leftValue;
  const nextLeft = nextProps.diffResult.leftValue;
  const prevRight = prevProps.diffResult.rightValue;
  const nextRight = nextProps.diffResult.rightValue;
  
  // Simple equality check for primitives, shallow check for objects
  if (prevLeft !== nextLeft || prevRight !== nextRight) {
    // For arrays and objects, do a shallow comparison
    if (Array.isArray(prevLeft) && Array.isArray(nextLeft)) {
      if (prevLeft.length !== nextLeft.length) return false;
    }
    if (Array.isArray(prevRight) && Array.isArray(nextRight)) {
      if (prevRight.length !== nextRight.length) return false;
    }
    // If values changed, let it re-render (better than expensive deep comparison)
    return false;
  }
  
  return true;
});

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