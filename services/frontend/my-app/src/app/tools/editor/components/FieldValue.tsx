'use client';

import React from 'react';
import { ChangeType } from '../types/diff';

interface FieldValueProps {
  value: any;
  changeType: ChangeType;
  side: 'left' | 'right';
  fieldPath: string;
}

export function FieldValue({ value, changeType, side, fieldPath }: FieldValueProps) {
  // Format the value for display
  const formattedValue = formatValue(value);
  const isEmpty = isEmptyValue(value);
  
  // Get appropriate styling based on change type and side
  const valueClass = getValueClass(changeType, side, isEmpty);
  
  return (
    <span className={`field-value text-sm ${valueClass}`} title={fieldPath}>
      {isEmpty ? '[NOT SET]' : formattedValue}
    </span>
  );
}

/**
 * Format a value for display
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '[NOT SET]';
  }
  
  if (typeof value === 'string') {
    return value;
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
    return `[${value.length} items]`;
  }
  
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return '{}';
    }
    return `{${keys.length} fields}`;
  }
  
  return String(value);
}

/**
 * Check if a value is considered empty
 */
function isEmptyValue(value: any): boolean {
  return value === null || 
         value === undefined || 
         value === '' || 
         (Array.isArray(value) && value.length === 0) ||
         (typeof value === 'object' && value !== null && Object.keys(value).length === 0);
}

/**
 * Get CSS class for value styling
 */
function getValueClass(changeType: ChangeType, side: 'left' | 'right', isEmpty: boolean): string {
  let classes = '';
  
  // Base styling for empty values
  if (isEmpty) {
    classes += 'italic text-gray-500 ';
  }
  
  // Change type specific styling
  switch (changeType) {
    case 'MODIFIED':
      classes += 'font-medium ';
      break;
    case 'ADDED':
      if (side === 'right') {
        classes += 'font-medium ';
      }
      break;
    case 'REMOVED':
      if (side === 'left') {
        classes += 'font-medium ';
      }
      break;
    default:
      classes += 'text-gray-700 ';
  }
  
  return classes.trim();
} 