'use client';

import React, { useState, useEffect } from 'react';

import { VersionControlLayout } from './VersionControlLayout';
import CurationCellLineEditor from '../../curation/components/CurationCellLineEditor';

// Types for search results
interface CellLineSearchResult {
  cell_line_id: string;
  status: 'working' | 'live' | 'historical';
  saved_on?: string;
  modified_on?: string;
  file_name: string;
  basic_info?: any;
}

function EditorContent() {
  // Search functionality state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CellLineSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCellLine, setSelectedCellLine] = useState<CellLineSearchResult | null>(null);
  const [selectedCellLineData, setSelectedCellLineData] = useState<any>(null);
  const [loadingCellLine, setLoadingCellLine] = useState(false);

  // Search for cell lines
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`http://localhost:8002/search/cell-lines?q=${encodeURIComponent(searchTerm)}&limit=20`);
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching cell lines:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Load cell line data for editing
  const handleSelectCellLine = async (cellLine: CellLineSearchResult) => {
    setSelectedCellLine(cellLine);
    setLoadingCellLine(true);
    
    try {
      const endpoint = cellLine.status === 'working' 
        ? `http://localhost:8002/curated-cell-lines/${encodeURIComponent(cellLine.cell_line_id)}`
        : `http://localhost:8002/curated-cell-lines/${encodeURIComponent(cellLine.cell_line_id)}`; // Will need different endpoints for live/historical
      
      const response = await fetch(endpoint);
      const data = await response.json();
      setSelectedCellLineData(data.curated_data || data);
    } catch (error) {
      console.error('Error loading cell line data:', error);
      setSelectedCellLineData(null);
    } finally {
      setLoadingCellLine(false);
    }
  };

  // Search when term changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Content Area */}
          {/* Version Control Interface */}
          <div className="p-6 border-b border-gray-200">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Version Control Interface
              </h2>
              <p className="text-sm text-gray-600">
                Compare cell line versions side-by-side
              </p>
            </div>
            <VersionControlLayout />
          </div>

          {/* Main Content - Cell Line Editor */}
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Edit Cell Lines
              </h2>
              <p className="text-sm text-gray-600">
                Search and edit cell line metadata from working, live, and historical storage
              </p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for cell line by ID (e.g., AIBNi001, LEIi005-A)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {searching ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Search Results ({searchResults.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={`${result.status}-${result.cell_line_id}`}
                      onClick={() => handleSelectCellLine(result)}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedCellLine?.cell_line_id === result.cell_line_id && selectedCellLine?.status === result.status
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{result.cell_line_id}</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.status === 'working' ? 'bg-blue-100 text-blue-800' :
                            result.status === 'live' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.status === 'working' && '● Working'}
                            {result.status === 'live' && '● Live'}
                            {result.status === 'historical' && '● Historical'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {result.saved_on && new Date(result.saved_on).toLocaleDateString()}
                        </div>
                      </div>
                      {result.basic_info && (
                        <div className="mt-1 text-xs text-gray-600">
                          {result.basic_info.cell_type && `Type: ${result.basic_info.cell_type}`}
                          {result.basic_info.cell_line_alt_name && result.basic_info.cell_line_alt_name !== 'Missing' && 
                            ` • Alt: ${result.basic_info.cell_line_alt_name}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loadingCellLine && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading cell line data...</span>
                </div>
              </div>
            )}

            {/* Selected Cell Line Editor */}
            {selectedCellLine && selectedCellLineData && !loadingCellLine && (
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Editing: {selectedCellLine.cell_line_id}
                    </h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedCellLine.status === 'working' ? 'bg-blue-100 text-blue-800' :
                      selectedCellLine.status === 'live' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedCellLine.status === 'working' && '● Working'}
                      {selectedCellLine.status === 'live' && '● Live'}
                      {selectedCellLine.status === 'historical' && '● Historical'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <CurationCellLineEditor
                    cellLineId={selectedCellLine.cell_line_id}
                    cellLineData={selectedCellLineData}
                    onSave={(savedData) => {
                      console.log('Cell line saved:', selectedCellLine.cell_line_id, savedData);
                    }}
                    onError={(error) => {
                      console.error('Error saving cell line:', selectedCellLine.cell_line_id, error);
                    }}
                  />
                </div>
              </div>
            )}

            {/* No Cell Line Selected Message */}
            {!selectedCellLine && searchTerm === '' && (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-900 mb-2">Search for Cell Lines</p>
                <p className="text-gray-600">
                  Enter a cell line ID above to search across working, live, and historical storage
                </p>
              </div>
            )}

            {/* No Results Message */}
            {!selectedCellLine && searchTerm !== '' && searchResults.length === 0 && !searching && (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.347 0-4.518.901-6.166 2.378l-.833.833a2 2 0 01-3.536-1.414L2 12l.465-.465A7.963 7.963 0 0112 9c2.347 0 4.518.901 6.166 2.378l.833.833a2 2 0 013.536 1.414L22 12l-.465.465z" />
                </svg>
                <p className="text-lg font-medium text-gray-900 mb-2">No Cell Lines Found</p>
                <p className="text-gray-600">
                  No cell lines match "{searchTerm}". Try a different search term.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditorContainer({ initialCellLineId }: { initialCellLineId?: string }) {
  return <EditorContent />;
} 