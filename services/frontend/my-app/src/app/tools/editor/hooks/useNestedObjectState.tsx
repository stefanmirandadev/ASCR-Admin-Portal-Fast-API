'use client';

import { useState, useCallback } from 'react';

interface NestedObjectState {
  expandedFields: Set<string>;
  toggleExpansion: (fieldPath: string) => void;
  isExpanded: (fieldPath: string) => boolean;
  expandAll: () => void;
  collapseAll: () => void;
  setExpanded: (fieldPath: string, expanded: boolean) => void;
}

export const useNestedObjectState = (defaultExpanded?: string[]): NestedObjectState => {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(
    new Set(defaultExpanded || [])
  );
  
  const toggleExpansion = useCallback((fieldPath: string) => {
    setExpandedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldPath)) {
        newSet.delete(fieldPath);
      } else {
        newSet.add(fieldPath);
      }
      return newSet;
    });
  }, []);
  
  const isExpanded = useCallback((fieldPath: string) => {
    return expandedFields.has(fieldPath);
  }, [expandedFields]);
  
  const expandAll = useCallback(() => {
    // This would need to be called with all available field paths
    // For now, we'll implement a simple version
    setExpandedFields(new Set());
  }, []);
  
  const collapseAll = useCallback(() => {
    setExpandedFields(new Set());
  }, []);
  
  const setExpanded = useCallback((fieldPath: string, expanded: boolean) => {
    setExpandedFields(prev => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(fieldPath);
      } else {
        newSet.delete(fieldPath);
      }
      return newSet;
    });
  }, []);
  
  return { 
    expandedFields, 
    toggleExpansion, 
    isExpanded, 
    expandAll, 
    collapseAll, 
    setExpanded 
  };
}; 