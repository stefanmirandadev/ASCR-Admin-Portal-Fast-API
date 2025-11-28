'use client';

import React from 'react';
import { DiffResult } from '../types/diff';
import { DiffField } from './DiffField';

interface ArrayFieldProps {
  arrayDiff: DiffResult;
  isExpanded: boolean;
  onToggleExpansion?: () => void;
  showDifferencesOnly: boolean;
  indentLevel?: number;
}

export function ArrayField({ 
  arrayDiff, 
  isExpanded, 
  onToggleExpansion, 
  showDifferencesOnly,
  indentLevel = 0
}: ArrayFieldProps) {
  const { fieldPath, changeType, leftValue, rightValue, children } = arrayDiff;
  
  // Get the field name (last part of the path)
  const fieldName = fieldPath.split('.').pop() || fieldPath;
  
  // Get array lengths
  const leftLength = Array.isArray(leftValue) ? leftValue.length : 0;
  const rightLength = Array.isArray(rightValue) ? rightValue.length : 0;
  
  // Get highlight class
  const highlightClass = getHighlightClass(changeType);
  
  return (
    <div className={`array-field ${highlightClass}`} style={{ marginLeft: `${indentLevel * 20}px` }}>
      {/* Array header */}
      <div className="array-header p-2 rounded-md">
        <div className="grid grid-cols-2 gap-4">
          {/* Left panel */}
          <div className="flex items-center">
            {children && children.length > 0 && (
              <button
                onClick={onToggleExpansion}
                className="expansion-indicator mr-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                aria-label={isExpanded ? `Collapse ${fieldName}` : `Expand ${fieldName}`}
              >
                <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </span>
              </button>
            )}
            <span className="field-label text-sm font-medium text-gray-700">{fieldName}:</span>
            <span className="array-summary text-sm text-gray-600 ml-2">
              [{leftLength} items]
            </span>
          </div>
          
          {/* Right panel */}
          <div className="flex items-center">
            <span className="field-label text-sm font-medium text-gray-700">{fieldName}:</span>
            <span className="array-summary text-sm text-gray-600 ml-2">
              [{rightLength} items]
            </span>
            {leftLength !== rightLength && (
              <span className="change-indicator text-xs text-blue-600 ml-2">
                ({leftLength} → {rightLength})
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Array items */}
      {isExpanded && children && children.length > 0 && (
        <div className="array-items mt-1 ml-4 border-l border-gray-200 pl-2">
          {children.map((itemDiff, index) => (
            <ArrayItem 
              key={`${fieldPath}[${index}]`}
              itemDiff={itemDiff}
              index={index}
              showDifferencesOnly={showDifferencesOnly}
              indentLevel={indentLevel + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ArrayItemProps {
  itemDiff: DiffResult;
  index: number;
  showDifferencesOnly: boolean;
  indentLevel: number;
}

function ArrayItem({ 
  itemDiff, 
  index, 
  showDifferencesOnly,
  indentLevel
}: ArrayItemProps) {
  const { changeType, children } = itemDiff;
  const highlightClass = getHighlightClass(changeType);
  
  return (
    <div className={`array-item ${highlightClass} mb-1`}>
      {/* Item header with index */}
      <div className="item-header p-2 rounded-md">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <span className="item-index text-sm font-mono text-gray-500 mr-2">{index}::</span>
            <span className="text-sm text-gray-600">
              {getArrayItemSummary(itemDiff.leftValue)}
            </span>
          </div>
          <div className="flex items-center">
            <span className="item-index text-sm font-mono text-gray-500 mr-2">{index}::</span>
            <span className="text-sm text-gray-600">
              {getArrayItemSummary(itemDiff.rightValue)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Item content (nested fields) */}
      {children && children.length > 0 && (
        <div className="item-content ml-4 mt-1">
          {children.map(fieldDiff => (
            <DiffField 
              key={fieldDiff.fieldPath}
              diffResult={fieldDiff}
              indentLevel={indentLevel + 1}
              showDifferencesOnly={showDifferencesOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Get a summary description for an array item
 */
function getArrayItemSummary(value: any): string {
  if (value === null || value === undefined) {
    return '[NOT SET]';
  }
  
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return 'empty object';
    }
    
    // Try to show a meaningful identifier
    const idFields = ['id', 'name', 'title', 'label', 'institute', 'approval_date'];
    const idField = idFields.find(field => value[field] !== undefined && value[field] !== null);
    
    if (idField) {
      return `${idField}: ${value[idField]}`;
    }
    
    return `{${keys.length} fields}`;
  }
  
  return String(value);
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