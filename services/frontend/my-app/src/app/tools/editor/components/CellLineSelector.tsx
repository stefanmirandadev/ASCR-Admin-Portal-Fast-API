'use client';

import React, { useState } from 'react';
import { useCellLineData } from '../hooks/useCellLineData';
import { useEditor } from './EditorContext';

export function CellLineSelector() {
  const { cellLines, isLoading } = useCellLineData();
  const { state, actions } = useEditor();
  const [searchTerm, setSearchTerm] = useState('');
  const [curationSourceFilter, setCurationSourceFilter] = useState('');

  const filteredCellLines = cellLines.filter(cellLine => {
    const matchesSearch = cellLine.CellLine_hpscreg_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cellLine.CellLine_alt_names?.some((name: string) => 
        name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesCurationSource = !curationSourceFilter || cellLine.curation_source === curationSourceFilter;
    
    return matchesSearch && matchesCurationSource;
  });

  const handleSelect = async (cellLineId: string) => {
    await actions.selectCellLine(cellLineId);
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Select Cell Line</h3>
      
      {/* Search Input */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Search cell lines..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg 
          className="absolute right-3 top-2.5 h-4 w-4 text-gray-400"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Cell Line List */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {filteredCellLines.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No cell lines found</p>
        ) : (
          filteredCellLines.slice(0, 20).map((cellLine) => (
            <button
              key={cellLine.CellLine_hpscreg_id}
              onClick={() => handleSelect(cellLine.CellLine_hpscreg_id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                state.cellLineData?.id === cellLine.CellLine_hpscreg_id
                  ? 'bg-blue-50 border border-blue-200 text-blue-900'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{cellLine.CellLine_hpscreg_id}</div>
                  {cellLine.CellLine_alt_names && cellLine.CellLine_alt_names.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {cellLine.CellLine_alt_names.slice(0, 2).join(', ')}
                    </div>
                  )}
                </div>
                {state.cellLineData?.id === cellLine.CellLine_hpscreg_id && (
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {filteredCellLines.length > 20 && (
        <p className="text-xs text-gray-500 mt-2">
          Showing first 20 results. Use search to find specific cell lines.
        </p>
      )}

      {/* Current Selection Info */}
      {state.cellLineData && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Selected:</span>
            <span className="font-medium text-gray-900">{state.cellLineData.id}</span>
          </div>
          {state.versionHistory.length > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>Versions available:</span>
              <span>{state.versionHistory.length}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 