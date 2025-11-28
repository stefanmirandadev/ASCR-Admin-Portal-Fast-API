'use client';

import React from 'react';

interface CellLineTemplate {
  CellLine_hpscreg_id: string;
  CellLine_alt_names?: string[];
  CellLine_source_cell_type: string;
  CellLine_source_tissue: string;
  curation_source: 'hpscreg' | 'LLM' | 'institution' | 'manual';
}

const getCurationSourceBadge = (source: string) => {
  const sourceConfig = {
    hpscreg: { label: 'HPSCREG', color: 'bg-blue-100 text-blue-800' },
    LLM: { label: 'LLM Generated', color: 'bg-green-100 text-green-800' },
    institution: { label: 'Institution', color: 'bg-purple-100 text-purple-800' },
    manual: { label: 'Manual Entry', color: 'bg-gray-100 text-gray-800' }
  };

  const config = sourceConfig[source as keyof typeof sourceConfig] || sourceConfig.manual;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

interface CellLineCardProps {
  cellLine: CellLineTemplate;
  isSelected?: boolean;
  onClick?: () => void;
}

export function CellLineCard({ cellLine, isSelected = false, onClick }: CellLineCardProps) {
  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer ${
        isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {cellLine.CellLine_hpscreg_id}
        </h3>
        {getCurationSourceBadge(cellLine.curation_source)}
      </div>
      
      {cellLine.CellLine_alt_names && cellLine.CellLine_alt_names.length > 0 && (
        <div className="mb-3">
          <p className="text-sm text-gray-600">
            Alt names: {cellLine.CellLine_alt_names.slice(0, 3).join(', ')}
            {cellLine.CellLine_alt_names.length > 3 && '...'}
          </p>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Source: {cellLine.CellLine_source_cell_type}</span>
          <span>Tissue: {cellLine.CellLine_source_tissue}</span>
        </div>
      </div>
    </div>
  );
} 