'use client';

import { useState } from 'react';

interface DuplicateHandlingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onReplace: () => void;
  onCancel: () => void;
  duplicateId: string;
  currentId: string;
  message?: string;
}

export default function DuplicateHandlingDialog({
  isOpen,
  onClose,
  onReplace,
  onCancel,
  duplicateId,
  currentId,
  message
}: DuplicateHandlingDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReplace = async () => {
    setIsProcessing(true);
    try {
      await onReplace();
      onClose();
    } catch (error) {
      console.error('Replace failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg 
                  className="w-6 h-6 text-yellow-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Duplicate Cell Line Detected
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              {message || `A cell line with ID "${duplicateId}" already exists in the database.`}
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="text-sm">
                <span className="font-medium text-gray-700">Current ID:</span>
                <span className="ml-2 text-gray-900">{currentId}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-700">Conflicting ID:</span>
                <span className="ml-2 text-red-600">{duplicateId}</span>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              What would you like to do?
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleReplace}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Replacing...' : 'Replace Existing'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DuplicateHandlingModal({
  isOpen,
  onClose,
  duplicateError,
  onReplace
}: {
  isOpen: boolean;
  onClose: () => void;
  duplicateError: {
    existing_id: string;
    current_id: string;
    message: string;
  } | null;
  onReplace: () => Promise<void>;
}) {
  if (!duplicateError) return null;

  return (
    <DuplicateHandlingDialog
      isOpen={isOpen}
      onClose={onClose}
      onReplace={onReplace}
      onCancel={onClose}
      duplicateId={duplicateError.existing_id}
      currentId={duplicateError.current_id}
      message={duplicateError.message}
    />
  );
}