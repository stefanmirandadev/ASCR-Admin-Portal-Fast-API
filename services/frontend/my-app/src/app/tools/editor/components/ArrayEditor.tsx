'use client';

import { useState } from 'react';
import { FieldSchema } from '../types/editor';

interface ArrayEditorProps {
  value: any[];
  fieldSchema?: FieldSchema;
  onSave: (newValue: any[]) => void;
  onCancel: () => void;
}

export default function ArrayEditor({
  value,
  fieldSchema,
  onSave,
  onCancel
}: ArrayEditorProps) {
  const [items, setItems] = useState(value || []);

  const addItem = () => {
    setItems([...items, '']);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, newValue: any) => {
    const updated = [...items];
    updated[index] = newValue;
    setItems(updated);
  };

  const handleSave = () => {
    onSave(items);
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Array Editor</h4>
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 w-8">[{index}]</span>
            <input
              type="text"
              value={item?.toString() || ''}
              onChange={(e) => updateItem(index, e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <button
              onClick={() => removeItem(index)}
              className="text-red-600 hover:text-red-800 text-xs px-1"
              title="Remove item"
            >
              ➖
            </button>
          </div>
        ))}
        
        <button
          onClick={addItem}
          className="flex items-center text-blue-600 hover:text-blue-800 text-sm mt-2"
        >
          ➕ Add Item
        </button>
      </div>
    </div>
  );
} 