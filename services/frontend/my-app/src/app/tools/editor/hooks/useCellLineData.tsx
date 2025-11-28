'use client';

import { useState, useEffect, useCallback } from 'react';
import { CellLineData, CellLineTemplate } from '../types/editor';
import { API_ENDPOINTS } from '../../../../lib/api';

export function useCellLineData() {
  const [cellLines, setCellLines] = useState<CellLineTemplate[]>([]);
  const [selectedCellLine, setSelectedCellLine] = useState<CellLineData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch list of available cell lines from new archive service
  const fetchCellLines = useCallback(async (curationSource?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use the new search endpoint to get all cell lines
      const response = await fetch('http://localhost:8002/search/cell-lines?limit=200');
      if (!response.ok) {
        throw new Error(`Failed to fetch cell lines: ${response.statusText}`);
      }
      
      const searchResults = await response.json();
      
      // Transform search results to match the expected format
      const transformedCellLines = searchResults.map((result: any) => ({
        CellLine_hpscreg_id: result.cell_line_id,
        id: result.cell_line_id,
        curation_source: result.status, // working, live, historical
        work_status: result.status,
        saved_on: result.saved_on,
        modified_on: result.modified_on,
        file_name: result.file_name,
        ...result.basic_info // Include any basic info we have
      }));
      
      setCellLines(transformedCellLines);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cell lines');
      console.error('Error fetching cell lines:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch specific cell line by ID from new archive service
  const fetchCellLine = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to get from working storage first (most common case)
      const response = await fetch(`http://localhost:8002/curated-cell-lines/${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch cell line: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      // Extract the curated data from the response
      const cellLineData = responseData.curated_data || responseData;
      
      // Ensure the id field is set for the frontend to use
      if (cellLineData && !cellLineData.id) {
        cellLineData.id = id;
      }
      
      setSelectedCellLine(cellLineData);
      return cellLineData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cell line');
      console.error('Error fetching cell line:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save cell line changes to archive service
  const saveCellLine = useCallback(async (id: string, data: Partial<CellLineData>) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`http://localhost:8002/curated-cell-lines/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save cell line: ${response.statusText} - ${errorText}`);
      }
      
      const responseData = await response.json();
      
      // Update selected cell line with saved data
      setSelectedCellLine(data as CellLineData);
      
      return responseData;
    } catch (err) {
      console.error('Error saving cell line:', err);
      throw err; // Re-throw so component can catch and handle
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new empty template (simplified)
  const getNewTemplate = useCallback(async () => {
    const emptyTemplate = {
      id: 'new',
      basic_data: [{ hpscreg_name: '', cell_type: '', frozen: 'False' }],
      contact: [{ first_name: '', last_name: '', e_mail: '' }],
      publications: [{ title: '', journal: '', year: '' }],
      donor: [{ age: '', sex: '', disease_name: '' }],
      // ... other empty sections
    };
    setSelectedCellLine(emptyTemplate);
    return emptyTemplate;
  }, []);

  useEffect(() => {
    fetchCellLines();
  }, [fetchCellLines]);

  return {
    cellLines,
    selectedCellLine,
    isLoading,
    error,
    fetchCellLine,
    saveCellLine,
    getNewTemplate,
    refetch: fetchCellLines,
    setSelectedCellLine, // Export the setter for local updates
  };
} 