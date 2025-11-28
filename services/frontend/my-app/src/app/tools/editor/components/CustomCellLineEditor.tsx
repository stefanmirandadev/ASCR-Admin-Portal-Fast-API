'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCellLineData } from '../hooks/useCellLineData';
import { useSchemaData } from '../hooks/useSchemaData';
import { ErrorBoundary } from './ErrorBoundary';
import { DisplayLine, CellLineData, FieldSchema } from '../types/editor';
import EditorLine from './EditorLine';
// import EditorLine from './EditorLine';

// Parse JSON data to display lines
function parseDataToLines(data: any, schema: FieldSchema, path: string[] = [], indentLevel: number = 0, globalLineNumber: { current: number } = { current: 1 }): DisplayLine[] {
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
      isCollapsed: true,
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
      const indent = '  '.repeat(indentLevel);
      const fieldSchema = schema[key];

      if (Array.isArray(value)) {
        // Array field - always expand arrays to show contents (even if empty)
        const arrayLine = addLine('object', currentPath, `${key}`, value, true, false, indentLevel);
        arrayLine.isCollapsed = false; // Always expand arrays to show their contents
        value.forEach((item, index) => {
          const itemPath = [...currentPath, index.toString()];
          if (typeof item === 'object' && item !== null) {
            addLine('array_item', itemPath, `${index}:`, item, true, false, indentLevel + 1);
            lines.push(...parseDataToLines(item, schema, itemPath, indentLevel + 2, globalLineNumber));
          } else {
            addLine('array_item', itemPath, `${index}: ${item}`, item, false, true, indentLevel + 1);
          }
        });
        // Add control to add new items
        addLine('array_control', [...currentPath, 'add'], `➕ Add Item`, null, false, false, indentLevel + 1);
      } else if (typeof value === 'object' && value !== null) {
        // Nested object
        addLine('object', currentPath, `${key}`, value, true, false, indentLevel);
        lines.push(...parseDataToLines(value, schema, currentPath, indentLevel + 1, globalLineNumber));
      } else {
        // Simple field
        const displayValue = value === null || value === undefined ? '' : String(value);
        addLine('field', currentPath, `${key}: ${displayValue}`, value, false, true, indentLevel);
      }
    });
  }

  return lines;
}

// Helper function to get visible lines (handles collapsing)
function getVisibleLines(lines: DisplayLine[]): DisplayLine[] {
  const visible: DisplayLine[] = [];
  let skipUntilIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // If we're skipping and this line is still at a deeper indent level, skip it
    if (skipUntilIndent >= 0 && line.indentLevel > skipUntilIndent) {
      continue;
    }
    
    // Reset skip mode if we've returned to the parent level or higher
    if (skipUntilIndent >= 0 && line.indentLevel <= skipUntilIndent) {
      skipUntilIndent = -1;
    }
    
    // Always show the line itself
    visible.push(line);
    
    // If this line is collapsed, start skipping its children
    if (line.isCollapsed && line.isCollapsible) {
      skipUntilIndent = line.indentLevel;
    }
  }

  return visible;
}

interface CustomCellLineEditorProps {
  initialCellLineId?: string;
  hideSelector?: boolean;
  onSave?: (savedData: any) => void;
  onError?: (error: string) => void;
}

export default function CustomCellLineEditor({ initialCellLineId, hideSelector = false, onSave, onError }: CustomCellLineEditorProps = {}) {
  const { cellLines, selectedCellLine, isLoading: cellLineLoading, error: cellLineError, fetchCellLine, saveCellLine, setSelectedCellLine, refetch } = useCellLineData();
  const { schema, isLoading: schemaLoading, error: schemaError } = useSchemaData();
  
  const [selectedCellLineId, setSelectedCellLineId] = useState<string>(initialCellLineId || '');
  const [displayLines, setDisplayLines] = useState<DisplayLine[]>([]);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [changeHistory, setChangeHistory] = useState<any[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [originalCellLine, setOriginalCellLine] = useState<any>(null);
  const [curationSourceFilter, setCurationSourceFilter] = useState<string>('');



  // Generate display lines when data or schema changes
  const lines = useMemo(() => {
    if (!selectedCellLine || !schema) return [];
    return parseDataToLines(selectedCellLine, schema);
  }, [selectedCellLine, schema]);

  useEffect(() => {
    setDisplayLines(lines);
  }, [lines]);

  // Define handleCellLineSelect before it's used in useEffect
  const handleCellLineSelect = useCallback(async (cellLineId: string) => {
    
    if (cellLineId) {
      setSelectedCellLineId(cellLineId);
      setChangeHistory([]);
      setCanUndo(false);
      setOriginalCellLine(null); // Reset original state when switching cell lines
      setSaveError(null); // Clear any previous save errors
      
      // Find the cell line data from the list or fetch individual one
      const existingCellLine = cellLines.find(cl => cl.CellLine_hpscreg_id === cellLineId);
      
      if (existingCellLine && schema) {
        // Convert the flat structure to be compatible with selectedCellLine
        const cellLineData = {
          id: existingCellLine.CellLine_hpscreg_id,
          ...existingCellLine,
          template_name: existingCellLine.CellLine_hpscreg_id
        };
        
        setSelectedCellLine(cellLineData);
        setOriginalCellLine(JSON.parse(JSON.stringify(cellLineData))); // Deep copy for original state
        
        // Directly use the existing data
        const lines = parseDataToLines(cellLineData, schema);
        setDisplayLines(lines);
      } else {
        await fetchCellLine(cellLineId);
      }
    }
  }, [cellLines, schema, fetchCellLine, setSelectedCellLine]);

  // Refetch cell lines when curation source filter changes
  useEffect(() => {
    refetch(curationSourceFilter || undefined);
  }, [curationSourceFilter, refetch]);

  // Auto-select initial cell line when provided and data is ready
  useEffect(() => {
    if (initialCellLineId && schema) {
      // Always update when initialCellLineId changes, regardless of current selection
      if (!selectedCellLine || selectedCellLine.id !== initialCellLineId) {
        handleCellLineSelect(initialCellLineId);
      }
    }
  }, [initialCellLineId, schema, handleCellLineSelect]);

  // Set original cell line when selectedCellLine changes (but not when it's being updated by edits)
  useEffect(() => {
    if (selectedCellLine && !originalCellLine) {
      setOriginalCellLine(JSON.parse(JSON.stringify(selectedCellLine)));
    }
  }, [selectedCellLine, originalCellLine]);

  const handleSave = async () => {
    if (!selectedCellLine) return;
    
    setIsSaving(true);
    setSaveError(null); // Clear any previous save errors
    try {
      const result = await saveCellLine(selectedCellLine.id, selectedCellLine);
      console.log('✅ Save successful');
      
      // Call the onSave callback if provided (for curation workflow)
      if (onSave) {
        onSave(result.data || selectedCellLine);
      }
    } catch (error) {
      console.error('❌ Save failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save cell line';
      setSaveError(errorMessage);
      
      // Call the onError callback if provided
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const dismissSaveError = () => {
    setSaveError(null);
  };

  const toggleCollapse = (lineNumber: number) => {
    setDisplayLines(prev => prev.map(line => 
      line.lineNumber === lineNumber 
        ? { ...line, isCollapsed: !line.isCollapsed }
        : line
    ));
  };

  const startEditing = (lineNumber: number) => {
    setEditingLine(lineNumber);
  };

  const cancelEditing = () => {
    setEditingLine(null);
  };

  const handleUndo = () => {
    if (changeHistory.length === 0) return;
    
    // Get the last state from history
    const lastState = changeHistory[changeHistory.length - 1];
    
    // Remove the last state from history
    setChangeHistory(prev => prev.slice(0, -1));
    setCanUndo(changeHistory.length > 1);
    
    // Restore the state
    setSelectedCellLine(lastState);
    
    // Regenerate display lines
    if (schema) {
      const newLines = parseDataToLines(lastState, schema);
      setDisplayLines(newLines);
    }
    
    console.log('🔄 Undo performed, remaining history items:', changeHistory.length - 1);
  };

  const handleRevertAll = () => {
    if (!originalCellLine) return;
    
    // Restore the original state
    setSelectedCellLine(JSON.parse(JSON.stringify(originalCellLine)));
    
    // Clear change history
    setChangeHistory([]);
    setCanUndo(false);
    
    // Regenerate display lines
    if (schema) {
      const newLines = parseDataToLines(originalCellLine, schema);
      setDisplayLines(newLines);
    }
    
    console.log('🔄 All changes reverted to original state');
  };

  const updateValue = (fieldPath: string[], newValue: any) => {
    console.log('🟢 updateValue called with fieldPath:', fieldPath, 'newValue:', newValue);
    console.log('🟢 Current selectedCellLine:', selectedCellLine ? 'EXISTS' : 'NULL');
    console.log('🟢 selectedCellLine keys:', selectedCellLine ? Object.keys(selectedCellLine).slice(0, 5) : 'N/A');
    
    // Update the selectedCellLine data with proper deep cloning and state update
    if (selectedCellLine) {
      console.log('🟢 selectedCellLine exists, creating deep copy...');
      
      // Save current state to history before making changes
      setChangeHistory(prev => [...prev, JSON.parse(JSON.stringify(selectedCellLine))]);
      setCanUndo(true);
      
      // Create a deep copy of the selected cell line
      const updated = JSON.parse(JSON.stringify(selectedCellLine));
      let current = updated;
      
      console.log('🟢 Navigating to field path...');
      // Navigate to the parent object
      for (let i = 0; i < fieldPath.length - 1; i++) {
        if (!current[fieldPath[i]]) {
          current[fieldPath[i]] = {};
        }
        current = current[fieldPath[i]];
      }
      
      // Set the new value
      const fieldName = fieldPath[fieldPath.length - 1];
      console.log('🟢 Setting field', fieldName, 'from', current[fieldName], 'to', newValue);
      current[fieldName] = newValue;
      
      console.log('🟢 Updated object:', updated);
      
      // UPDATE: Actually update the selectedCellLine state - this was the missing piece!
      console.log('🟢 Calling setSelectedCellLine...');
      setSelectedCellLine(updated);
      
      // Regenerate display lines with updated data
      if (schema) {
        console.log('🟢 Regenerating display lines...');
        const newLines = parseDataToLines(updated, schema);
        setDisplayLines(newLines);
        console.log('🟢 Display lines updated, count:', newLines.length);
      }
    } else {
      console.log('❌ No selectedCellLine available');
    }
    
    console.log('🟢 Setting editing line to null');
    setEditingLine(null);
  };

  const createEmptyItemFromSchema = (fieldName: string): any => {
    const fieldSchema = schema?.[fieldName];
    
    if (!fieldSchema?.json_schema) {
      // Simple array - add empty string
      return "";
    }
    
    const jsonSchema = fieldSchema.json_schema;
    
    // For array items, look at the items schema
    if (jsonSchema.type === 'array' && jsonSchema.items) {
      const itemSchema = jsonSchema.items;
      
      if (itemSchema.type === 'object' && itemSchema.properties) {
        // Complex array - create object with all fields as empty strings
        const emptyObject: any = {};
        Object.keys(itemSchema.properties).forEach(prop => {
          emptyObject[prop] = "";
        });
        return emptyObject;
      } else {
        // Simple array item type
        return "";
      }
    }
    
    // Fallback to empty string
    return "";
  };

  const handleAddItem = (fieldPath: string[]) => {
    if (!selectedCellLine || !schema) return;
    
    console.log('🟢 handleAddItem called with fieldPath:', fieldPath);
    
    // Save current state to history before making changes
    setChangeHistory(prev => [...prev, JSON.parse(JSON.stringify(selectedCellLine))]);
    setCanUndo(true);
    
    // Remove 'add' from the path to get the actual array field path
    const arrayFieldPath = fieldPath.slice(0, -1);
    const fieldName = arrayFieldPath[0];
    
    console.log('🟢 Array field name:', fieldName);
    
    // Create a deep copy of the selected cell line
    const updated = JSON.parse(JSON.stringify(selectedCellLine));
    let current = updated;
    
    // Navigate to the array
    for (let i = 0; i < arrayFieldPath.length - 1; i++) {
      current = current[arrayFieldPath[i]];
    }
    
    const arrayField = arrayFieldPath[arrayFieldPath.length - 1];
    if (!Array.isArray(current[arrayField])) {
      current[arrayField] = [];
    }
    
    // Create new item based on schema
    const newItem = createEmptyItemFromSchema(fieldName);
    console.log('🟢 Adding new item:', newItem);
    
    // Add the new item
    current[arrayField].push(newItem);
    
    // Update state
    setSelectedCellLine(updated);
    
    // Regenerate display lines
    const newLines = parseDataToLines(updated, schema);
    setDisplayLines(newLines);
    
    console.log('🟢 Array item added successfully');
  };

  if (schemaLoading || cellLineLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  // Only show blocking errors for schema/loading issues, not save errors
  if (schemaError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Schema Error</h3>
        <p className="text-red-700 text-sm mt-1">
          {schemaError}
        </p>
      </div>
    );
  }

  // Only show blocking error for cellLineError if it's NOT a save error
  // (Save errors should be handled separately and not block the editor)
  if (cellLineError && !selectedCellLine) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Loading Error</h3>
        <p className="text-red-700 text-sm mt-1">
          {cellLineError}
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Save Error Banner - Non-blocking */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-red-800 font-medium text-sm">Save Failed</h3>
                  <p className="text-red-700 text-sm mt-1">
                    {saveError}
                  </p>
                  <p className="text-red-600 text-xs mt-2">
                    Please fix the issue and try saving again.
                  </p>
                </div>
              </div>
              <button
                onClick={dismissSaveError}
                className="ml-4 text-red-400 hover:text-red-600 transition-colors"
                title="Dismiss error"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Cell Line Selection */}
        {!hideSelector && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label htmlFor="curation-source-filter" className="text-sm font-medium text-gray-700">
              Curation Source:
            </label>
            <div className="relative">
              <select
                id="curation-source-filter"
                value={curationSourceFilter}
                onChange={(e) => setCurationSourceFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 min-w-[150px]"
              >
                <option value="">All Sources</option>
                <option value="hpscreg">HPSCREG</option>
                <option value="LLM">LLM Generated</option>
                <option value="institution">Institution</option>
                <option value="manual">Manual Entry</option>
              </select>
            </div>
            
            <label htmlFor="cellline-select" className="text-sm font-medium text-gray-700">
              Select Cell Line:
            </label>
            <div className="relative">
              <select
                id="cellline-select"
                value={selectedCellLineId}
                onChange={(e) => handleCellLineSelect(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 min-w-[200px]"
              >
                <option value="">Choose a cell line...</option>
                {cellLines.map((cellLine) => (
                  <option 
                    key={cellLine.CellLine_hpscreg_id || cellLine.template_name} 
                    value={cellLine.CellLine_hpscreg_id || cellLine.template_name}
                  >
                    {cellLine.CellLine_hpscreg_id || cellLine.template_name}
                    {cellLine.curation_source && ` (${cellLine.curation_source})`}
                  </option>
                ))}
              </select>
              {cellLines.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {cellLines.length} cell lines available
                </div>
              )}
            </div>
            
            {/* Add Cell Line Button */}
            <button
              onClick={() => {
                // TODO: Implement add cell line functionality
                console.log('Add cell line clicked');
              }}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-all shadow-sm hover:shadow flex items-center"
              title="Create a new cell line"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Cell Line
            </button>
          </div>

          {selectedCellLineId && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white text-sm font-medium py-2 px-4 rounded-md transition-all shadow-sm hover:shadow flex items-center"
                title={canUndo ? `Undo last change (${changeHistory.length} changes available)` : 'No changes to undo'}
              >
                Undo
              </button>
              <button
                onClick={handleRevertAll}
                disabled={changeHistory.length === 0}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white text-sm font-medium py-2 px-4 rounded-md transition-all shadow-sm hover:shadow flex items-center"
                title={changeHistory.length > 0 ? 'Revert all changes back to original state' : 'No changes to revert'}
              >
                Revert All
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-800 hover:bg-blue-900 disabled:bg-blue-300 text-white text-sm font-medium py-2 px-4 rounded-md transition-all shadow-sm hover:shadow flex items-center"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          )}
        </div>
        )}


        {/* Editor Interface */}
        {(selectedCellLineId && displayLines.length > 0 && schema) ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden relative">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">
                {selectedCellLineId}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                {displayLines.length} fields • Click values to edit
              </p>
            </div>
            
            <div className="custom-editor bg-white">
              {getVisibleLines(displayLines).map((line) => (
                <EditorLine
                  key={line.lineNumber}
                  line={line}
                  schema={schema}
                  isEditing={editingLine === line.lineNumber}
                  onToggleCollapse={() => toggleCollapse(line.lineNumber)}
                  onStartEdit={() => startEditing(line.lineNumber)}
                  onCancelEdit={cancelEditing}
                  onUpdateValue={updateValue}
                  onAddItem={() => handleAddItem(line.fieldPath)}
                />
              ))}
            </div>
            
            {/* Floating Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white p-3 rounded-full shadow-lg transition-all hover:shadow-xl flex items-center justify-center"
              title={isSaving ? 'Saving...' : 'Save Changes'}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3M19,19H5V5H15V9H19V19Z" />
                  <path d="M7,5V9H13V5H7M6,14A2,2 0 0,1 8,12A2,2 0 0,1 10,14A2,2 0 0,1 8,16A2,2 0 0,1 6,14Z" fill="white" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Select a cell line to begin editing</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-editor {
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
          font-size: 14px;
          line-height: 1.6;
          max-height: 600px;
          overflow-y: auto;
          overscroll-behavior-y: contain;
        }
      `}</style>
    </ErrorBoundary>
  );
} 