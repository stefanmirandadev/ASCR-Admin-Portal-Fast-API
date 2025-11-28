'use client';

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ArrayComparisonModalProps {
  isOpen: boolean;
  fieldName: string;
  fieldPath: string;
  leftArray: any[];
  rightArray: any[];
  leftVersion: string;
  rightVersion: string;
  leftCellLine: string;
  rightCellLine: string;
  onClose: () => void;
}

interface ArrayDiffAnalysis {
  added: { index: number; item: any }[];
  removed: { index: number; item: any }[];
  modified: { leftIndex: number; rightIndex: number; leftItem: any; rightItem: any }[];
  unchanged: { leftIndex: number; rightIndex: number; item: any }[];
  summary: {
    totalChanges: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
  };
}

export function ArrayComparisonModal({
  isOpen,
  fieldName,
  fieldPath,
  leftArray,
  rightArray,
  leftVersion,
  rightVersion,
  leftCellLine,
  rightCellLine,
  onClose
}: ArrayComparisonModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Analyze array differences
  const diffAnalysis = useCallback((): ArrayDiffAnalysis => {
    return analyzeArrayDifferences(leftArray || [], rightArray || []);
  }, [leftArray, rightArray]);

  const analysis = diffAnalysis();

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed z-[9999] inset-0"
      role="dialog" 
      tabIndex={-1} 
      aria-labelledby="array-comparison-modal-title"
      onClick={handleBackdropClick}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: '280px', // Account for sidebar width
        right: 0, 
        bottom: 0 
      }}
    >
      {/* Modal Content - positioned absolutely to allow clicks around it */}
      <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-2xl rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'white' }}
      >
        {/* Simplified Modal Header - just field name */}
        <div className="py-4 px-6 border-b border-gray-200">
          <h3 id="array-comparison-modal-title" className="text-lg text-gray-800">
            {fieldName}
          </h3>
        </div>
        
        {/* Modal Body - just the array comparison */}
        <div className="flex-1 p-6 overflow-hidden">
          <ArrayDiffViewer 
            leftArray={leftArray || []}
            rightArray={rightArray || []}
            leftCellLine={leftCellLine}
            leftVersion={leftVersion}
            rightCellLine={rightCellLine}
            rightVersion={rightVersion}
            analysis={analysis}
          />
        </div>
      </div>
    </div>
  );

  // Use Portal to render the modal directly to document.body
  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

/**
 * Array Diff Viewer Component - Side-by-side comparison
 */
interface ArrayDiffViewerProps {
  leftArray: any[];
  rightArray: any[];
  leftCellLine: string;
  leftVersion: string;
  rightCellLine: string;
  rightVersion: string;
  analysis: ArrayDiffAnalysis;
}

function ArrayDiffViewer({ leftArray, rightArray, leftCellLine, leftVersion, rightCellLine, rightVersion, analysis }: ArrayDiffViewerProps) {
  const maxLength = Math.max(leftArray.length, rightArray.length);

  return (
    <div className="array-diff-viewer h-full flex flex-col">
      {/* Simplified Array Comparison Grid - no summary */}
      <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
        {/* Left Panel */}
        <div className="flex flex-col border border-gray-200 rounded-lg">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
            <h4 className="text-sm font-semibold text-gray-700">
              {leftCellLine} (v{leftVersion})
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ArrayItemList 
              items={leftArray}
              analysis={analysis}
              side="left"
              maxLength={maxLength}
            />
          </div>
        </div>
        
        {/* Right Panel */}
        <div className="flex flex-col border border-gray-200 rounded-lg">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
            <h4 className="text-sm font-semibold text-gray-700">
              {rightCellLine} (v{rightVersion})
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ArrayItemList 
              items={rightArray}
              analysis={analysis}
              side="right"
              maxLength={maxLength}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Array Item List Component
 */
interface ArrayItemListProps {
  items: any[];
  analysis: ArrayDiffAnalysis;
  side: 'left' | 'right';
  maxLength: number;
}

function ArrayItemList({ items, analysis, side, maxLength }: ArrayItemListProps) {
  const getDifferenceType = (index: number): string => {
    // Check if item was added
    const isAdded = analysis.added.some(a => a.index === index);
    if (isAdded && side === 'right') return 'added';
    
    // Check if item was removed
    const isRemoved = analysis.removed.some(r => r.index === index);
    if (isRemoved && side === 'left') return 'removed';
    
    // Check if item was modified
    const isModified = side === 'left' 
      ? analysis.modified.some(m => m.leftIndex === index)
      : analysis.modified.some(m => m.rightIndex === index);
    if (isModified) return 'modified';
    
    // Check if item is unchanged
    const isUnchanged = side === 'left'
      ? analysis.unchanged.some(u => u.leftIndex === index)
      : analysis.unchanged.some(u => u.rightIndex === index);
    if (isUnchanged) return 'unchanged';
    
    return 'unchanged';
  };

  return (
    <div className="array-item-list p-2">
      {Array.from({ length: maxLength }, (_, index) => {
        const item = items[index];
        const diffType = getDifferenceType(index);
        const isEmpty = item === undefined;
        
        return (
          <div 
            key={index} 
            className={`array-item flex items-start gap-3 p-3 mb-2 rounded-md border ${getItemStyling(diffType, isEmpty)}`}
          >
            <span className="item-index text-xs font-mono text-gray-500 flex-shrink-0 min-w-[40px]">
              [{index}]:
            </span>
            <div className="item-content flex-1 text-sm">
              {isEmpty ? (
                <span className="text-gray-400 italic">[Not present]</span>
              ) : (
                <ItemRenderer item={item} />
              )}
            </div>
            {diffType !== 'unchanged' && !isEmpty && (
              <DifferenceLabel type={diffType} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Item Renderer Component
 */
interface ItemRendererProps {
  item: any;
}

function ItemRenderer({ item }: ItemRendererProps) {
  const renderValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '[NOT SET]';
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  };

  return (
    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
      {renderValue(item)}
    </pre>
  );
}

/**
 * Difference Label Component
 */
interface DifferenceLabelProps {
  type: string;
}

function DifferenceLabel({ type }: DifferenceLabelProps) {
  const labels = {
    added: { text: 'Added', class: 'bg-green-100 text-green-800' },
    removed: { text: 'Removed', class: 'bg-red-100 text-red-800' },
    modified: { text: 'Modified', class: 'bg-orange-100 text-orange-800' },
    unchanged: { text: 'Unchanged', class: 'bg-gray-100 text-gray-600' }
  };

  const label = labels[type as keyof typeof labels] || labels.unchanged;

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${label.class}`}>
      {label.text}
    </span>
  );
}

/**
 * Helper Functions
 */

function analyzeArrayDifferences(leftArray: any[], rightArray: any[]): ArrayDiffAnalysis {
  const analysis: ArrayDiffAnalysis = {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
    summary: { totalChanges: 0, addedCount: 0, removedCount: 0, modifiedCount: 0 }
  };

  const maxLength = Math.max(leftArray.length, rightArray.length);

  for (let i = 0; i < maxLength; i++) {
    const leftItem = leftArray[i];
    const rightItem = rightArray[i];
    
    const leftExists = i < leftArray.length;
    const rightExists = i < rightArray.length;

    if (!leftExists && rightExists) {
      // Item added in right
      analysis.added.push({ index: i, item: rightItem });
      analysis.summary.addedCount++;
    } else if (leftExists && !rightExists) {
      // Item removed from left
      analysis.removed.push({ index: i, item: leftItem });
      analysis.summary.removedCount++;
    } else if (leftExists && rightExists) {
      // Both exist, check if modified
      if (!deepEqual(leftItem, rightItem)) {
        analysis.modified.push({ 
          leftIndex: i, 
          rightIndex: i, 
          leftItem, 
          rightItem 
        });
        analysis.summary.modifiedCount++;
      } else {
        analysis.unchanged.push({ 
          leftIndex: i, 
          rightIndex: i, 
          item: leftItem 
        });
      }
    }
  }

  analysis.summary.totalChanges = 
    analysis.summary.addedCount + 
    analysis.summary.removedCount + 
    analysis.summary.modifiedCount;

  return analysis;
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => deepEqual(item, b[index]));
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => deepEqual(a[key], b[key]));
  }
  
  return false;
}

function getItemStyling(diffType: string, isEmpty: boolean): string {
  if (isEmpty) {
    return 'border-gray-200 bg-gray-50';
  }
  
  switch (diffType) {
    case 'added':
      return 'border-green-200 bg-green-50';
    case 'removed':
      return 'border-red-200 bg-red-50';
    case 'modified':
      return 'border-orange-200 bg-orange-50';
    default:
      return 'border-gray-200 bg-white';
  }
} 