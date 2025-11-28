'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSchemaData } from '../../editor/hooks/useSchemaData';
import { ErrorBoundary } from '../../editor/components/ErrorBoundary';
import { DisplayLine, CellLineData, FieldSchema } from '../../editor/types/editor';
import EditorLine from '../../editor/components/EditorLine';

interface CurationCellLineEditorProps {
  cellLineId: string;
  cellLineData: any;
  onSave?: (savedData: any) => void;
  onError?: (error: string) => void;
}

// Parse JSON data to display lines - generates all lines regardless of collapse state
function parseDataToLines(
  data: any, 
  schema: FieldSchema, 
  path: string[] = [], 
  indentLevel: number = 0, 
  globalLineNumber: { current: number } = { current: 1 }
): DisplayLine[] {
  const lines: DisplayLine[] = [];

  function addLine(
    type: DisplayLine['type'],
    fieldPath: string[],
    displayText: string,
    value: any,
    isCollapsible: boolean = false,
    isEditable: boolean = false,
    customIndentLevel?: number
  ): DisplayLine {
    const line: DisplayLine = {
      lineNumber: globalLineNumber.current++,
      type,
      fieldPath,
      displayText,
      isCollapsible,
      isCollapsed: isCollapsible ? true : false, // Start collapsed for arrays/objects
      isEditable,
      value,
      indentLevel: customIndentLevel !== undefined ? customIndentLevel : indentLevel,
    };
    lines.push(line);
    return line;
  }

  if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      const currentPath = [...path, key];
      const fieldSchema = schema[key];

      if (Array.isArray(value)) {
        // Array field header
        addLine('object', currentPath, `${key} (${value.length} items)`, value, true, false, indentLevel);
        
        // Array items - always generate, visibility is handled by filter
        value.forEach((item, index) => {
          const itemPath = [...currentPath, index.toString()];
          if (typeof item === 'object' && item !== null) {
            // Object item in array
            addLine('array_item', itemPath, `[${index}]`, item, true, false, indentLevel + 1);
            lines.push(...parseDataToLines(item, fieldSchema || {}, itemPath, indentLevel + 2, globalLineNumber));
          } else {
            // Primitive item in array
            addLine('array_item', itemPath, `[${index}]: ${item}`, item, false, true, indentLevel + 1);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        // Nested object
        addLine('object', currentPath, `${key}`, value, true, false, indentLevel);
        lines.push(...parseDataToLines(value, fieldSchema || {}, currentPath, indentLevel + 1, globalLineNumber));
      } else {
        // Primitive value
        const isEditable = fieldSchema?.editable !== false;
        addLine('field', currentPath, `${key}: ${value}`, value, false, isEditable, indentLevel);
      }
    });
  }

  return lines;
}

export default function CurationCellLineEditor({ 
  cellLineId, 
  cellLineData, 
  onSave, 
  onError
}: CurationCellLineEditorProps) {
  const { schema, isLoading: schemaLoading, error: schemaError } = useSchemaData();
  
  const [displayLines, setDisplayLines] = useState<DisplayLine[]>([]);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [changeHistory, setChangeHistory] = useState<any[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [workingData, setWorkingData] = useState<CellLineData | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateError, setDuplicateError] = useState<{
    existing_id: string;
    current_id: string;
    message: string;
  } | null>(null);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<'working' | 'saving' | 'saved' | 'error'>('working');

  // Initialize working data when cellLineData changes
  useEffect(() => {
    if (cellLineData) {
      setWorkingData({ ...cellLineData });
    }
  }, [cellLineData]);

  // Store all parsed lines and collapse states
  const [allLines, setAllLines] = useState<DisplayLine[]>([]);
  const [collapsedStates, setCollapsedStates] = useState<Map<string, boolean>>(new Map());

  // Generate all display lines when data or schema changes
  useEffect(() => {
    if (!workingData || !schema) {
      setAllLines([]);
      return;
    }
    
    try {
      const lines = parseDataToLines(workingData, schema);
      setAllLines(lines);
    } catch (error) {
      console.error('Error parsing data to lines:', error);
      setAllLines([]);
    }
  }, [workingData, schema]);

  // Filter visible lines based on collapse states
  useEffect(() => {
    if (allLines.length === 0) {
      setDisplayLines([]);
      return;
    }

    const visibleLines: DisplayLine[] = [];
    
    allLines.forEach(line => {
      // Update line's collapsed state from our state map
      const lineKey = line.fieldPath.join('.');
      const isCollapsed = collapsedStates.get(lineKey) ?? line.isCollapsed;
      const updatedLine = { ...line, isCollapsed };
      
      // Check if any parent is collapsed
      let isHidden = false;
      for (let i = 1; i < line.fieldPath.length; i++) {
        const parentPath = line.fieldPath.slice(0, i).join('.');
        const parentCollapsed = collapsedStates.get(parentPath) ?? false;
        if (parentCollapsed) {
          isHidden = true;
          break;
        }
      }

      if (!isHidden) {
        visibleLines.push(updatedLine);
      }
    });

    setDisplayLines(visibleLines);
  }, [allLines, collapsedStates]);

  // Handle field value changes
  const handleUpdateValue = (fieldPath: string[], newValue: any) => {
    if (!workingData) return;

    // Save current state to history for undo
    setChangeHistory(prev => [...prev, { ...workingData }]);
    setCanUndo(true);

    // Update the working data
    const newData = { ...workingData };
    let current = newData;
    
    // Navigate to the field and update it
    for (let i = 0; i < fieldPath.length - 1; i++) {
      const key = fieldPath[i];
      if (current[key] === undefined) {
        current[key] = {};
      }
      current = current[key];
    }
    
    const finalKey = fieldPath[fieldPath.length - 1];
    current[finalKey] = newValue;
    
    setWorkingData(newData);
    setSaveError(null);
  };

  // Handle toggle collapse for array/object items
  const handleToggleCollapse = (lineNumber: number) => {
    const line = displayLines.find(l => l.lineNumber === lineNumber);
    if (!line || !line.isCollapsible) return;
    
    const lineKey = line.fieldPath.join('.');
    const currentState = collapsedStates.get(lineKey) ?? line.isCollapsed;
    
    setCollapsedStates(prev => {
      const newStates = new Map(prev);
      newStates.set(lineKey, !currentState);
      return newStates;
    });
  };

  // Handle save
  const handleSave = async (forceReplace: boolean = false) => {
    if (!workingData) return;

    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError(null);

    try {
      // Save to working storage via archive service
      const response = await fetch(`http://localhost:8002/curated-cell-lines/${encodeURIComponent(cellLineId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workingData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to save cell line');
      }

      // Clear change history on successful save
      setChangeHistory([]);
      setCanUndo(false);
      setSaveStatus('saved');
      
      // Call the original onSave callback if provided
      onSave?.(workingData);
      
      // Auto-reset status back to working after 3 seconds
      setTimeout(() => {
        setSaveStatus('working');
      }, 3000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save cell line';
      setSaveError(errorMessage);
      setSaveStatus('error');
      onError?.(errorMessage);
      
      // Reset status back to working after 5 seconds on error
      setTimeout(() => {
        setSaveStatus('working');
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle duplicate dialog close (kept for compatibility but not used in working storage)
  const handleDuplicateDialogClose = () => {
    setDuplicateDialogOpen(false);
    setDuplicateError(null);
    setPendingSaveData(null);
  };

  // Handle undo
  const handleUndo = () => {
    if (changeHistory.length === 0) return;
    
    const lastState = changeHistory[changeHistory.length - 1];
    setWorkingData(lastState);
    setChangeHistory(prev => prev.slice(0, -1));
    setCanUndo(changeHistory.length > 1);
  };

  // Handle revert to original
  const handleRevert = () => {
    if (cellLineData) {
      setWorkingData({ ...cellLineData });
      setChangeHistory([]);
      setCanUndo(false);
      setSaveError(null);
    }
  };

  // Always allow saving when we have data
  const canSave = !!workingData;
  
  // For revert and change indicator, still check for actual changes
  const hasChanges = workingData && cellLineData && 
    JSON.stringify(workingData) !== JSON.stringify(cellLineData);

  if (schemaLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading schema...</div>
      </div>
    );
  }

  if (schemaError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error loading schema: {schemaError}</p>
      </div>
    );
  }

  if (!workingData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading cell line data...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        {/* Status and Action buttons */}
        <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
          <div className="flex items-center space-x-4">
            {/* Status Indicator */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              saveStatus === 'working' ? 'bg-blue-100 text-blue-800' :
              saveStatus === 'saving' ? 'bg-yellow-100 text-yellow-800' :
              saveStatus === 'saved' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {saveStatus === 'working' && '● Working'}
              {saveStatus === 'saving' && '⏳ Saving...'}
              {saveStatus === 'saved' && '✓ Saved'}
              {saveStatus === 'error' && '✗ Error'}
            </div>
            <button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                canSave && !isSaving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            
            <button
              onClick={handleUndo}
              disabled={!canUndo || isSaving}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                canUndo && !isSaving
                  ? 'bg-gray-600 text-white hover:bg-gray-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Undo
            </button>
            
            <button
              onClick={handleRevert}
              disabled={!hasChanges || isSaving}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                hasChanges && !isSaving
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Revert All
            </button>
          </div>

          {hasChanges && (
            <div className="text-sm text-amber-600 font-medium">
              Unsaved changes
            </div>
          )}
        </div>

        {/* Error display */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{saveError}</p>
          </div>
        )}

        {/* Editor lines */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="max-h-[600px] overflow-y-auto p-4">
            {displayLines.map((line) => (
              <EditorLine
                key={line.lineNumber}
                line={line}
                schema={schema || {}}
                isEditing={editingLine === line.lineNumber}
                onToggleCollapse={() => handleToggleCollapse(line.lineNumber)}
                onStartEdit={() => setEditingLine(line.lineNumber)}
                onCancelEdit={() => setEditingLine(null)}
                onUpdateValue={handleUpdateValue}
                onAddItem={() => {
                  // TODO: Implement add item functionality for arrays
                  console.log('Add item to array:', line.fieldPath);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}