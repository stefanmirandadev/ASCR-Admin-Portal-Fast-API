'use client';

import React, { useMemo } from 'react';
import { DiffResult } from '../types/diff';
import { ArrayComparisonModal } from './ArrayComparisonModal';
import { useArrayModal } from '../hooks/useArrayModal';

interface DiffFieldProps {
  diffResult: DiffResult;
  isExpanded?: boolean;
  onToggleExpansion?: () => void;
  indentLevel?: number;
  showDifferencesOnly?: boolean;
  isVirtualized?: boolean;
  leftCellLine?: string | null;
  leftVersion?: string | null;
  rightCellLine?: string | null;
  rightVersion?: string | null;
}

export function DiffField({ 
  diffResult, 
  isExpanded = false, 
  onToggleExpansion,
  indentLevel = 0, 
  showDifferencesOnly,
  isVirtualized = false,
  leftCellLine,
  leftVersion,
  rightCellLine,
  rightVersion
}: DiffFieldProps) {
  const { fieldPath, changeType, leftValue, rightValue, children } = diffResult;
  
  // Get the field name (last part of the path)
  const fieldName = fieldPath.split('.').pop() || fieldPath;
  
  // Check if this is an array field
  const isArray = Array.isArray(leftValue) || Array.isArray(rightValue);
  
  // Check if this is a nested object (has children)
  const isNested = children && children.length > 0;
  
  // Check if field is incomplete (both values are empty/null/undefined)
  const isFieldEmpty = (value: any) => value === null || value === undefined || value === '';
  const isIncomplete = isFieldEmpty(leftValue) && isFieldEmpty(rightValue);
  
  // Get highlight class based on change type, but override for incomplete fields
  const highlightClass = isIncomplete ? 'diff-incomplete' : getHighlightClass(changeType);
  
  // Create context data for array modal
  const contextData = useMemo(() => ({
    leftVersionId: leftVersion || undefined,
    rightVersionId: rightVersion || undefined,
    leftCellLineId: leftCellLine || undefined,
    rightCellLineId: rightCellLine || undefined,
  }), [leftVersion, rightVersion, leftCellLine, rightCellLine]);

  const { modalState, openModal, closeModal } = useArrayModal(contextData);

  // Handle array fields with modal-based comparison
  if (isArray) {
    const leftArray = Array.isArray(leftValue) ? leftValue : [];
    const rightArray = Array.isArray(rightValue) ? rightValue : [];
    const hasChanges = !arraysEqual(leftArray, rightArray);
    
    return (
      <>
        <div className={`diff-field ${highlightClass} ${isVirtualized ? 'virtualized-item' : ''}`} 
             style={{ marginLeft: `${indentLevel * 12}px` }}>
          <div className="field-row p-2">
            <div className="field-layout">
              <div className="field-content">
                <div className="field-name-row">
                  <span className="field-name">{fieldName} (Array)</span>
                </div>
                <div className="field-values-row">
                  {/* Empty left column */}
                  <div></div>
                  {/* Empty middle column */}
                  <div></div>
                  {/* Button in right column - fills entire container */}
                  <button 
                    onClick={() => openModal(fieldPath, leftArray, rightArray, fieldName)}
                    className="field-value-container right-value w-full h-full flex justify-end items-center text-sm font-medium text-gray-900 hover:text-black hover:bg-blue-100 transition-all duration-150 focus:outline-none cursor-pointer"
                  >
                    View comparison →
                    {hasChanges && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span className="text-xs text-orange-600 font-medium">Changes</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Array Comparison Modal */}
        <ArrayComparisonModal
          isOpen={modalState.isOpen}
          fieldName={modalState.fieldName}
          fieldPath={modalState.fieldPath}
          leftArray={modalState.leftArray}
          rightArray={modalState.rightArray}
          leftVersion={modalState.leftVersion}
          rightVersion={modalState.rightVersion}
          leftCellLine={modalState.leftCellLine}
          rightCellLine={modalState.rightCellLine}
          onClose={closeModal}
        />
      </>
    );
  }
  
  return (
    <div className={`diff-field ${highlightClass} ${isVirtualized ? 'virtualized-item' : ''} ${isIncomplete ? 'incomplete-field' : ''}`} 
         style={{ marginLeft: `${indentLevel * 12}px` }}>
      {/* Field row with improved layout */}
      <div className="field-row p-2">
        <div className="field-layout">
          {/* Expansion indicator for nested objects */}
          {isNested && (
            <div className="expansion-section">
              <button
                onClick={onToggleExpansion}
                className="expansion-indicator text-gray-600 hover:text-gray-800 focus:outline-none p-1"
                aria-label={isExpanded ? `Collapse ${fieldName}` : `Expand ${fieldName}`}
              >
                <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </span>
              </button>
            </div>
          )}
          
          {/* Field name and values side by side */}
          <div className="field-content">
            <div className="field-name-row">
              <span className={`field-name ${isIncomplete ? 'text-gray-400' : ''}`}>{fieldName}</span>
            </div>
            <div className="field-values-row">
              {/* Spacer column */}
              <div></div>
              
              {/* Left value */}
              <div className="field-value-container left-value">
                <span className="field-value field-text-content">
                  {formatFieldValue(leftValue)}
                </span>
              </div>
              
              {/* Right value */}
              <div className="field-value-container right-value">
                <span className="field-value field-text-content">
                  {formatFieldValue(rightValue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Nested children */}
      {isNested && isExpanded && !isVirtualized && (
        <div className="nested-children ml-6 border-l border-gray-200 pl-3">
          {children!.map((childDiff) => (
            <DiffField
              key={childDiff.fieldPath}
              diffResult={childDiff}
              indentLevel={indentLevel + 1}
              showDifferencesOnly={showDifferencesOnly}
              isVirtualized={isVirtualized}
              leftCellLine={leftCellLine}
              leftVersion={leftVersion}
              rightCellLine={rightCellLine}
              rightVersion={rightVersion}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Format a value for display - Enhanced for full content visibility
 */
function formatFieldValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return ''; // Empty cell instead of [NOT SET]
  }
  
  if (typeof value === 'string') {
    return value; // No truncation - show full string content
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    // Note: Array content will be handled by dedicated array display logic
    return `[${value.length} items]`;
  }
  
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return '{}';
    }
    // Show full object content for simple objects with few fields
    if (keys.length <= 3) {
      const summary = keys.map(key => {
        const fieldValue = value[key];
        const displayValue = typeof fieldValue === 'string' 
          ? fieldValue // No truncation for string values
          : String(fieldValue);
        return `${key}: ${displayValue}`;
      }).join(', ');
      return `{ ${summary} }`;
    }
    return `{${keys.length} fields}`;
  }
  
  return String(value); // No truncation - show full content
}

/**
 * Helper function to compare arrays for equality
 */
function arraysEqual(a: any[], b: any[]): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  
  return a.every((item, index) => deepEqual(item, b[index]));
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

/**
 * Get CSS class for highlighting based on change type
 */
function getHighlightClass(changeType: string): string {
  switch (changeType) {
    case 'MODIFIED':
      return 'diff-modified';
    case 'ADDED':
      return 'diff-added';
    case 'REMOVED':
      return 'diff-removed';
    case 'NOT_SET':
      return 'diff-not-set';
    case 'UNCHANGED':
    default:
      return 'diff-unchanged';
  }
} 