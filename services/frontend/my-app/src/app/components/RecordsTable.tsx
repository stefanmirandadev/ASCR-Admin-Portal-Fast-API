'use client';
import { useState, useMemo } from 'react';

type Record = {
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

interface RecordsTableProps {
  records: Record[];
  onRecordDeleted?: () => void; // Callback to refresh data after deletion
  onUploadClick?: () => void; // Callback for upload button click
  onEditRecord?: (record: Record) => void; // Callback for edit button click
}

type SortField = keyof Pick<Record, 'filename' | 'pubmed_id' | 'created_on' | 'transcription_status' | 'curation_status'>;
type SortDirection = 'asc' | 'desc' | null;

const RecordsTable = ({ records, onRecordDeleted, onUploadClick, onEditRecord }: RecordsTableProps) => {
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Handle individual checkbox toggle
  const toggleRecordSelection = (recordId: number) => {
    const newSelection = new Set(selectedRecords);
    if (newSelection.has(recordId)) {
      newSelection.delete(recordId);
    } else {
      newSelection.add(recordId);
    }
    setSelectedRecords(newSelection);
  };

  // Handle row click
  const handleRowClick = (recordId: number) => {
    toggleRecordSelection(recordId);
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectedRecords.size === filteredAndSortedRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredAndSortedRecords.map(record => record.id)));
    }
  };

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle delete record
  const handleDeleteRecord = async (recordId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/transcribed-articles/${recordId}/`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from selected records if it was selected
        const newSelection = new Set(selectedRecords);
        newSelection.delete(recordId);
        setSelectedRecords(newSelection);
        
        // Call callback to refresh data
        if (onRecordDeleted) {
          onRecordDeleted();
        }
      } else {
        console.error('Failed to delete record');
        alert('Failed to delete record. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record. Please try again.');
    }
  };

  // Filter and sort records
  const filteredAndSortedRecords = useMemo(() => {
    let filtered = records.filter(record => 
      record.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.pubmed_id?.toString().includes(searchTerm) ||
      record.transcription_status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.curation_status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Handle null values for pubmed_id
        if (sortField === 'pubmed_id') {
          if (aValue === null && bValue === null) return 0;
          if (aValue === null) return sortDirection === 'asc' ? 1 : -1;
          if (bValue === null) return sortDirection === 'asc' ? -1 : 1;
        }

        // Convert to string for comparison if needed
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
        }
        if (typeof bValue === 'string') {
          bValue = bValue.toLowerCase();
        }

        // Ensure we're not comparing null values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [records, searchTerm, sortField, sortDirection]);

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    return (
      <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="-m-1.5 overflow-x-auto">
        <div className="p-1.5 min-w-full inline-block align-middle">
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 dark:border-neutral-700 dark:divide-neutral-700">
            {/* Header with Title */}
            <div className="py-3 px-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Transcribed Articles</h2>
            </div>

            {/* Search Bar and Upload Button Row */}
            <div className="py-3 px-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div className="relative w-1/2">
                  <label htmlFor="hs-table-search" className="sr-only">Search</label>
                  <input 
                    type="text" 
                    name="hs-table-search" 
                    id="hs-table-search" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="py-1.5 sm:py-2 px-3 ps-9 block w-full border-gray-200 shadow-2xs rounded-full sm:text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500 hover:border-blue-500 hover:ring-2 hover:ring-blue-200 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600 dark:hover:border-blue-500 dark:hover:ring-2 dark:hover:ring-blue-800 dark:hover:shadow-md" 
                    placeholder="Search for items" 
                  />
                  <div className="absolute inset-y-0 start-0 flex items-center pointer-events-none ps-3">
                    <svg className="size-4 text-gray-400 dark:text-neutral-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.3-4.3"></path>
                    </svg>
                  </div>
                </div>
                {onUploadClick && (
                  <button 
                    type="button" 
                    onClick={onUploadClick}
                    className="py-1.5 sm:py-2 px-6 inline-flex items-center gap-x-2 text-sm font-medium rounded-full border border-transparent bg-gray-800 text-white hover:bg-gray-700 focus:outline-hidden focus:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none transition-colors duration-200" 
                    aria-haspopup="dialog" 
                    aria-expanded="false" 
                    aria-controls="hs-static-backdrop-modal" 
                    data-hs-overlay="#hs-static-backdrop-modal"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Upload
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                <thead className="bg-gray-50 dark:bg-neutral-700">
                  <tr>
                    <th scope="col" className="py-3 px-4 pe-0">
                      <div className="flex items-center h-5">
                        <input 
                          id="hs-table-search-checkbox-all" 
                          type="checkbox" 
                          checked={filteredAndSortedRecords.length > 0 && selectedRecords.size === filteredAndSortedRecords.length}
                          onChange={handleSelectAll}
                          className="border-gray-200 rounded-sm text-blue-600 focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-500 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800" 
                        />
                        <label htmlFor="hs-table-search-checkbox-all" className="sr-only">Checkbox</label>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500">
                      <button 
                        onClick={() => handleSort('filename')}
                        className="flex items-center hover:text-gray-700 dark:hover:text-neutral-300 hover:bg-gray-50 hover:shadow-[inset_0_0_0_2px_rgb(156_163_175)] dark:hover:bg-neutral-800 dark:hover:shadow-[inset_0_0_0_2px_rgb(115_115_115)] transition-all duration-200 rounded px-4 py-2"
                      >
                        File Name
                        {renderSortIcon('filename')}
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500">
                      <button 
                        onClick={() => handleSort('pubmed_id')}
                        className="flex items-center hover:text-gray-700 dark:hover:text-neutral-300 hover:bg-gray-50 hover:shadow-[inset_0_0_0_2px_rgb(156_163_175)] dark:hover:bg-neutral-800 dark:hover:shadow-[inset_0_0_0_2px_rgb(115_115_115)] transition-all duration-200 rounded px-4 py-2"
                      >
                        PubMed ID
                        {renderSortIcon('pubmed_id')}
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500">
                      <button 
                        onClick={() => handleSort('created_on')}
                        className="flex items-center hover:text-gray-700 dark:hover:text-neutral-300 hover:bg-gray-50 hover:shadow-[inset_0_0_0_2px_rgb(156_163_175)] dark:hover:bg-neutral-800 dark:hover:shadow-[inset_0_0_0_2px_rgb(115_115_115)] transition-all duration-200 rounded px-4 py-2"
                      >
                        Created At
                        {renderSortIcon('created_on')}
                      </button>
                    </th>
                    <th scope="col" className="px-3 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500 w-32">
                      <button 
                        onClick={() => handleSort('transcription_status')}
                        className="flex items-center hover:text-gray-700 dark:hover:text-neutral-300 hover:bg-gray-50 hover:shadow-[inset_0_0_0_2px_rgb(156_163_175)] dark:hover:bg-neutral-800 dark:hover:shadow-[inset_0_0_0_2px_rgb(115_115_115)] transition-all duration-200 rounded px-4 py-2"
                      >
                        Transcription
                        {renderSortIcon('transcription_status')}
                      </button>
                    </th>

                    <th scope="col" className="px-6 py-3 text-end text-xs font-medium text-gray-500 dark:text-neutral-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                  {filteredAndSortedRecords.map((record, index) => (
                                         <tr 
                       key={record.id}
                       onClick={() => handleRowClick(record.id)}
                       className="hover:bg-gray-50 hover:shadow-[inset_0_0_0_2px_rgb(156_163_175)] dark:hover:bg-neutral-800 dark:hover:shadow-[inset_0_0_0_2px_rgb(115_115_115)] transition-all duration-200 cursor-pointer"
                     >
                      <td className="py-3 ps-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center h-5">
                          <input 
                            id={`hs-table-search-checkbox-${record.id}`} 
                            type="checkbox" 
                            checked={selectedRecords.has(record.id)}
                            onChange={() => toggleRecordSelection(record.id)}
                            className="border-gray-200 rounded-sm text-blue-600 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800" 
                          />
                          <label htmlFor={`hs-table-search-checkbox-${record.id}`} className="sr-only">Checkbox</label>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-neutral-200">{record.filename}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">{record.pubmed_id || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">{new Date(record.created_on).toLocaleString()}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-neutral-200">
                        {record.transcription_status === 'completed' ? (
                          <div className="flex items-center justify-center">
                            <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                          </div>
                        ) : record.transcription_status === 'failed' ? (
                          <div className="flex items-center justify-center">
                            <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                          </div>
                        ) : record.transcription_status === 'processing' ? (
                          <div className="flex items-center justify-center">
                            <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-2">
                          {/* Edit button - only show for completed transcriptions */}
                          {record.transcription_status === 'completed' && record.transcription_content && (
                            <button 
                              type="button" 
                              onClick={() => onEditRecord && onEditRecord(record)}
                              className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent text-blue-600 hover:text-blue-800 focus:outline-hidden focus:text-blue-800 disabled:opacity-50 disabled:pointer-events-none dark:text-blue-500 dark:hover:text-blue-400 dark:focus:text-blue-400 transition-colors duration-200"
                              title="Edit transcription"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          
                          {/* Delete button */}
                          <button 
                            type="button" 
                            onClick={() => handleDeleteRecord(record.id)}
                            className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent text-red-600 hover:text-black focus:outline-hidden focus:text-black disabled:opacity-50 disabled:pointer-events-none dark:text-red-500 dark:hover:text-white dark:focus:text-white transition-colors duration-200"
                            title="Delete record"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordsTable;