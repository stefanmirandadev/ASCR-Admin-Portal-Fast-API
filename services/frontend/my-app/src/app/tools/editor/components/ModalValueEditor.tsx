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

interface ModalValueEditorProps {
  isOpen: boolean;
  fieldName: string;
  value: any;
  fieldSchema?: FieldSchema;
  onSave: (newValue: any) => void;
  onCancel: () => void;
}

export default function ModalValueEditor({
  isOpen,
  fieldName,
  value,
  fieldSchema,
  onSave,
  onCancel
}: ModalValueEditorProps) {
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  // Reset state when modal opens with new value
  useEffect(() => {
    if (isOpen) {
      setEditValue(value?.toString() || '');
      setError(null);
    }
  }, [isOpen, value]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Position cursor at the end instead of selecting all text
          if ('setSelectionRange' in inputRef.current) {
            const length = inputRef.current.value.length;
            inputRef.current.setSelectionRange(length, length);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onCancel]);

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
    const validationError = validateValue(editValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    let processedValue: any = editValue;

    // Determine if this is a primitive value or needs JSON parsing
    const isPrimitiveValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
    
    // Convert value based on field type
    if (fieldSchema) {
      switch (fieldSchema.type) {
        case 'IntegerField':
          processedValue = parseInt(editValue, 10);
          break;
        case 'BooleanField':
          processedValue = editValue === 'true' || editValue === '1';
          break;
        case 'JSONField':
          // Smart JSON parsing - only parse if it looks like JSON
          if (isPrimitiveValue || !editValue.trim().startsWith('{') && !editValue.trim().startsWith('[')) {
            // For primitive values or strings that don't look like JSON, keep as string
            processedValue = editValue;
          } else {
            // For strings that look like JSON objects/arrays, try to parse them
            try {
              processedValue = JSON.parse(editValue);
            } catch {
              setError('Invalid JSON format');
              return;
            }
          }
          break;
        default:
          processedValue = editValue;
      }
    }

    onSave(processedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    // Escape is handled by the document listener
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
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
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xs focus:outline-none"
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
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xs focus:outline-none"
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }

    // Check if this looks like actual JSON content that needs multiline editing
    const looksLikeJson = editValue && (editValue.trim().startsWith('{') || editValue.trim().startsWith('['));
    const hasNewlines = editValue && editValue.includes('\n');
    
    if ((fieldSchema?.type === 'JSONField' && looksLikeJson) || hasNewlines) {
      // Textarea for multiline JSON content
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xs focus:outline-none resize-none"
          rows={Math.min(Math.max(editValue.split('\n').length + 1, 5), 12)}
          placeholder="Enter value..."
        />
      );
    }

    // Default text input - use textarea for better visibility of long content
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-xs focus:outline-none resize-none"
        rows={3}
        maxLength={fieldSchema?.max_length}
        placeholder="Enter value..."
      />
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {fieldName}
          </h3>
          {fieldSchema?.help_text && (
            <p className="text-sm text-gray-600 mt-1">{fieldSchema.help_text}</p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Value
              </label>
              {renderEditor()}
              {error && (
                <div className="mt-2 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="text-xs text-gray-500 text-center">
            Press <kbd className="bg-gray-200 px-1 rounded">Enter</kbd> to save • <kbd className="bg-gray-200 px-1 rounded">Esc</kbd> to cancel
          </div>
        </div>
      </div>
    </div>
  );
} 