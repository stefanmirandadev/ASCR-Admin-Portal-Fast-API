'use client';

import React, { useState, useEffect } from 'react';

interface TranscribedArticle {
  id: number;
  filename: string;
  created_on: string;
  modified_on: string;
  pubmed_id: number | null;
  is_curated: boolean;
  transcription_status: string;
  transcription_content: string;
  curation_status: string;
  transcription_error?: string;
  curation_error?: string;
  curation_started_at?: string;
  approximate_tokens?: number;
}

interface TranscriptionEditorProps {
  selectedRecord: TranscribedArticle | null;
  onClose: () => void;
  onSave: (recordId: number, content: string) => Promise<void>;
}

const TranscriptionEditor: React.FC<TranscriptionEditorProps> = ({
  selectedRecord,
  onClose,
  onSave,
}) => {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  // Update content when selected record changes
  useEffect(() => {
    if (selectedRecord) {
      setContent(selectedRecord.transcription_content || '');
      setOriginalContent(selectedRecord.transcription_content || '');
      setError(null);
      setSuccess(null);
    }
  }, [selectedRecord]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedRecord) {
        const hasChanges = content !== originalContent;
        if (hasChanges) {
          setShowExitPrompt(true);
        } else {
          onClose();
        }
      }
    };

    if (selectedRecord) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [selectedRecord, onClose, content, originalContent]);

  const handleSave = async () => {
    if (!selectedRecord) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await onSave(selectedRecord.id, content);
      setSuccess('Transcription saved successfully!');
      setOriginalContent(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transcription');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = content !== originalContent;

  const handleRevert = () => {
    setContent(originalContent);
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowExitPrompt(true);
    } else {
      onClose();
    }
  };

  const handleSaveAndExit = async () => {
    setShowExitPrompt(false);
    onClose();
    
    // Save in background
    try {
      await onSave(selectedRecord!.id, content);
      setOriginalContent(content);
    } catch (err) {
      console.error('Failed to save transcription:', err);
      // Could show a toast notification here if needed
    }
  };

  const handleExitWithoutSaving = () => {
    setShowExitPrompt(false);
    onClose();
  };

  if (!selectedRecord) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Filename: {selectedRecord.filename}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Messages */}
        {(error || success) && (
          <div className="px-6 py-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {success}
              </div>
            )}
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 p-6">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Content
              </label>
              <span className="text-sm text-gray-600">
                Token count: {Math.ceil(content.length / 4)} tokens
              </span>
            </div>
            
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              placeholder="Enter or edit transcription content..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Last modified: {new Date(selectedRecord.modified_on).toLocaleString()}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRevert}
              disabled={!hasChanges || isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Revert Changes
            </button>
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Exit Prompt Modal */}
      {showExitPrompt && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-60 p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Do you want to save your changes?
            </h3>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleExitWithoutSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                No
              </button>
              <button
                onClick={handleSaveAndExit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionEditor; 