'use client';

import { useState } from 'react';
import { DisplayLine, FieldSchema } from '../types/editor';
import ModalValueEditor from './ModalValueEditor';

interface EditorLineProps {
  line: DisplayLine;
  schema: FieldSchema;
  isEditing: boolean;
  onToggleCollapse: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdateValue: (fieldPath: string[], newValue: any) => void;
  onAddItem?: () => void;
}

export default function EditorLine({
  line,
  schema,
  isEditing,
  onToggleCollapse,
  onStartEdit,
  onCancelEdit,
  onUpdateValue,
  onAddItem
}: EditorLineProps) {
  const [hovering, setHovering] = useState(false);

  const getFieldSchema = () => {
    const fieldName = line.fieldPath[0];
    return schema?.[fieldName] || null;
  };

  const getSyntaxHighlighting = () => {
    const fieldSchema = getFieldSchema();
    const value = line.value;

    // Type-based highlighting
    if (fieldSchema?.type === 'BooleanField') {
      return 'text-purple-600 font-medium'; // Purple for booleans
    }
    
    if (fieldSchema?.type === 'IntegerField') {
      return 'text-orange-600 font-medium'; // Orange for numbers
    }
    
    if (Array.isArray(value)) {
      return 'text-green-600'; // Green for arrays
    }
    
    if (typeof value === 'object' && value !== null) {
      return 'text-indigo-600'; // Indigo for objects
    }
    
    // Default for strings and other types
    return 'text-gray-900';
  };

  const handleValueClick = () => {
    if (line.isEditable && !isEditing) {
      onStartEdit();
    }
  };

  const handleCollapseClick = () => {
    if (line.isCollapsible) {
      onToggleCollapse();
    }
  };

  const renderLineContent = () => {
    const parts = line.displayText.split(': ');
    const fieldPart = parts[0];
    const valuePart = parts.slice(1).join(': ');

    if (line.type === 'array_control') {
      return (
        <div 
          className="flex items-center text-green-600 cursor-pointer hover:text-green-800"
          title="Add new item to array"
          onClick={onAddItem}
        >
          <span>{line.displayText}</span>
        </div>
      );
    }

    if (line.isCollapsible) {
      return (
        <div className="flex items-center">
          <button
            onClick={handleCollapseClick}
            className="mr-2 text-gray-500 hover:text-gray-700 flex-shrink-0"
          >
            {line.isCollapsed ? '▶' : '▼'}
          </button>
          <span className="text-blue-800 font-medium">{fieldPart}:</span>
        </div>
      );
    }

    if (line.isEditable && valuePart !== undefined) {
      return (
        <div className="flex items-center">
          <span className="text-blue-800 font-medium mr-1">{fieldPart}:</span>
          <span
            onClick={handleValueClick}
            className={`cursor-pointer px-1 rounded border max-w-md truncate inline-block ${
              hovering
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'hover:bg-gray-50 border-transparent'
            } ${
              valuePart.trim() === ''
                ? 'text-gray-400 italic'
                : getSyntaxHighlighting()
            }`}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            title={valuePart.trim() === '' ? '(empty)' : valuePart}
          >
            {valuePart.trim() === '' ? '(empty)' : valuePart}
          </span>
          <ModalValueEditor
            isOpen={isEditing}
            fieldName={fieldPart}
            value={line.value}
            fieldSchema={getFieldSchema()}
            onSave={(newValue: any) => {
              console.log('🟡 EditorLine onSave called, fieldPath:', line.fieldPath, 'newValue:', newValue);
              onUpdateValue(line.fieldPath, newValue);
            }}
            onCancel={onCancelEdit}
          />
        </div>
      );
    }

    return <span className="text-gray-800">{line.displayText}</span>;
  };

  return (
    <div className="flex items-center">
      {/* Line Number */}
      <div className="w-12 text-right text-xs text-gray-500 bg-gray-50 border-r border-gray-200 py-1 px-2 select-none">
        {line.lineNumber}
      </div>

      {/* Line Content */}
      <div className="flex-1 py-1 px-3 min-h-[28px] flex items-center hover:bg-gray-50 border-l-2 border-transparent hover:border-blue-200 transition-colors">
        <div style={{ paddingLeft: `${line.indentLevel * 32}px` }}>
          {renderLineContent()}
        </div>
      </div>

      {/* Validation Indicator */}
      {line.validation && (
        <div className="px-2">
          <span
            className={`text-sm ${
              line.validation.type === 'error' ? 'text-red-500' : 'text-yellow-500'
            }`}
            title={line.validation.message}
          >
            {line.validation.type === 'error' ? '🔴' : '⚠️'}
          </span>
        </div>
      )}
    </div>
  );
} 