'use client';

import { useState, useRef, useEffect } from 'react';

interface FieldSchema {
  type: 'CharField' | 'JSONField' | 'IntegerField' | 'BooleanField';
  required: boolean;
  max_length?: number;
  choices?: string[];
  json_schema?: any;
  help_text?: string;
}

interface InlineEditorProps {
  value: any;
  fieldSchema?: FieldSchema;
  onSave: (newValue: any) => void;
  onCancel: () => void;
}

export default function InlineEditor({
  value,
  fieldSchema,
  onSave,
  onCancel
}: InlineEditorProps) {
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, []);

  const validateValue = (val: string): string | null => {
    if (!fieldSchema) return null;

    if (fieldSchema.required && val.trim() === '') {
      return 'This field is required';
    }

    if (fieldSchema.max_length && val.length > fieldSchema.max_length) {
      return `Maximum length is ${fieldSchema.max_length} characters`;
    }

    if (fieldSchema.type === 'IntegerField') {
      const num = parseInt(val, 10);
      if (isNaN(num)) {
        return 'Must be a valid integer';
      }
    }

    return null;
  };

  const handleSave = () => {
    console.log('🔵 InlineEditor.handleSave called with editValue:', editValue);
    
    const validationError = validateValue(editValue);
    if (validationError) {
      console.log('❌ Validation error:', validationError);
      setError(validationError);
      return;
    }

    let processedValue: any = editValue;

    // Convert value based on field type
    if (fieldSchema) {
      console.log('🔵 Field schema type:', fieldSchema.type);
      switch (fieldSchema.type) {
        case 'IntegerField':
          processedValue = parseInt(editValue, 10);
          break;
        case 'BooleanField':
          processedValue = editValue === 'true' || editValue === '1';
          break;
        case 'JSONField':
          try {
            processedValue = JSON.parse(editValue);
          } catch {
            console.log('❌ JSON parse error');
            setError('Invalid JSON format');
            return;
          }
          break;
        default:
          processedValue = editValue;
      }
    }

    console.log('✅ InlineEditor calling onSave with processedValue:', processedValue);
    onSave(processedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const renderEditor = () => {
    if (fieldSchema?.choices && fieldSchema.choices.length > 0) {
      // Select dropdown for choice fields
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-32"
        >
          <option value="">Select...</option>
          {fieldSchema.choices.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
      );
    }

    if (fieldSchema?.type === 'BooleanField') {
      // Boolean toggle
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }

    if (fieldSchema?.type === 'JSONField' || (editValue && editValue.includes('\n'))) {
      // Textarea for multiline content
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-48 resize-none"
          rows={Math.min(editValue.split('\n').length + 1, 6)}
        />
      );
    }

    // Default text input
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={fieldSchema?.type === 'IntegerField' ? 'number' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className="border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-32"
        maxLength={fieldSchema?.max_length}
      />
    );
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        {renderEditor()}
        {error && (
          <div className="absolute top-full left-0 mt-1 bg-red-100 border border-red-300 rounded px-2 py-1 text-xs text-red-700 z-10 whitespace-nowrap">
            {error}
          </div>
        )}
      </div>
      
      <div className="flex space-x-1">
        <button
          onClick={handleSave}
          className="text-xs text-green-600 hover:text-green-800 px-1"
          title="Save (Enter)"
        >
          ✓
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-red-600 hover:text-red-800 px-1"
          title="Cancel (Esc)"
        >
          ✕
        </button>
      </div>
    </div>
  );
} 