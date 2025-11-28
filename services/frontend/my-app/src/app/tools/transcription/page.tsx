'use client';

import React, { useState, useEffect } from 'react';
import RecordsTable from '@/app/components/RecordsTable';
import UploadModal from '@/app/components/UploadModal';
import TranscriptionEditor from './components/TranscriptionEditor';

type TranscribedArticle = {
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
};



const TranscriptionPage = () => {
  const [articles, setArticles] = useState<TranscribedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TranscribedArticle | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Function to fetch articles from API
  const fetchArticles = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/transcribed-articles/');
      if (response.ok) {
        const data = await response.json();
        setArticles(data);
      } else {
        console.error('Failed to fetch transcribed articles');
      }
    } catch (error) {
      console.error('Error fetching transcribed articles:', error);
    }
  };

  // Initial fetch and polling setup
  useEffect(() => {
    fetchArticles();
    
    // Set up polling every 3 seconds
    const interval = setInterval(fetchArticles, 3000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  const handleUploadComplete = () => {
    fetchArticles(); // Refresh the articles list
  };

  const handleModalClose = () => {
    setIsUploadModalOpen(false);
  };

  const handleEditTranscription = (record: TranscribedArticle) => {
    setSelectedRecord(record);
    setIsEditorOpen(true);
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setSelectedRecord(null);
  };

  const handleSaveTranscription = async (recordId: number, content: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/transcribed-articles/${recordId}/update_transcription/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription_content: content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save transcription');
      }

      // Refresh the articles list to get updated data
      await fetchArticles();
    } catch (error) {
      console.error('Error saving transcription:', error);
      throw error;
    }
  };

  return (
    <>  
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Transcription Management</h1>
          <p className="text-gray-600 mt-2">
            Upload and manage article transcriptions for curation processing.
          </p>
        </div>

        <div id='records-table-section' className="flex flex-col gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {/* Records Table */}
          <RecordsTable 
            records={articles} 
            onRecordDeleted={fetchArticles}
            onUploadClick={handleUploadClick}
            onEditRecord={handleEditTranscription}
          />
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={handleModalClose}
        onUploadComplete={handleUploadComplete}
      />

      {/* Transcription Editor */}
      {isEditorOpen && selectedRecord && (
        <TranscriptionEditor
          selectedRecord={selectedRecord}
          onClose={handleEditorClose}
          onSave={handleSaveTranscription}
        />
      )}
    </>
  );
};

export default TranscriptionPage;