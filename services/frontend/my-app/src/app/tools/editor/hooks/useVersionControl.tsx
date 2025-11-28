'use client';

import { useState, useCallback } from 'react';
import { VersionInfo, CellLineData } from '../types/editor';
import { DiffResult } from '../types/diff';

export function useVersionControl(cellLineId?: string) {
  const [versionHistory, setVersionHistory] = useState<VersionInfo[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [selectedVersionForComparison, setSelectedVersionForComparison] = useState<number | undefined>();
  const [comparisonCellLine, setComparisonCellLine] = useState<CellLineData | undefined>();
  const [versionError, setVersionError] = useState<string | undefined>();
  
  // NEW: Diff state management
  const [diffResults, setDiffResults] = useState<DiffResult[] | null>(null);
  const [isDiffReady, setIsDiffReady] = useState(false);
  const [diffComputationTime, setDiffComputationTime] = useState<number | null>(null);

  // Fetch version history for a cell line
  const fetchVersionHistory = useCallback(async (id: string) => {
    if (!id) return;
    
    setIsLoadingVersions(true);
    setVersionError(undefined);
    
    try {
      const response = await fetch(`http://localhost:8000/api/editor/celllines/${id}/versions/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch version history: ${response.statusText}`);
      }
      
      const data = await response.json();
      const versions = data.versions || data;
      
      setVersionHistory(Array.isArray(versions) ? versions : []);
    } catch (error) {
      console.error('Error fetching version history:', error);
      setVersionError(error instanceof Error ? error.message : 'Failed to fetch version history');
      setVersionHistory([]);
    } finally {
      setIsLoadingVersions(false);
    }
  }, []);

  // Fetch specific version data for comparison
  const fetchVersionData = useCallback(async (id: string, versionNumber: number) => {
    if (!id || !versionNumber) return null;
    
    try {
      const response = await fetch(`http://localhost:8000/api/editor/celllines/${id}/versions/${versionNumber}/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch version ${versionNumber}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error(`Error fetching version ${versionNumber}:`, error);
      setVersionError(error instanceof Error ? error.message : `Failed to fetch version ${versionNumber}`);
      return null;
    }
  }, []);

  // Select a version for comparison
  const selectVersionForComparison = useCallback(async (versionNumber: number) => {
    if (!cellLineId) {
      setVersionError('No cell line selected');
      return;
    }

    setVersionError(undefined);
    
    try {
      const versionData = await fetchVersionData(cellLineId, versionNumber);
      if (versionData) {
        setSelectedVersionForComparison(versionNumber);
        setComparisonCellLine(versionData);
      }
    } catch (error) {
      console.error('Error selecting version for comparison:', error);
      setVersionError('Failed to load version for comparison');
    }
  }, [cellLineId, fetchVersionData]);

  // NEW: Handle diff results
  const handleDiffResults = useCallback((diff: DiffResult[]) => {
    setDiffResults(diff);
    setIsDiffReady(true);
    
    // Calculate and log performance metrics
    const changedFields = diff.filter(d => 
      d.changeType !== 'UNCHANGED' && d.changeType !== 'NOT_SET'
    ).length;
    
    console.log(`Diff ready: ${changedFields} changed fields out of ${diff.length} total fields`);
  }, []);

  // NEW: Handle diff errors
  const handleDiffError = useCallback((error: string) => {
    setVersionError(error);
    setDiffResults(null);
    setIsDiffReady(false);
  }, []);

  // Clear comparison
  const clearComparison = useCallback(() => {
    setSelectedVersionForComparison(undefined);
    setComparisonCellLine(undefined);
    setVersionError(undefined);
    // NEW: Clear diff state
    setDiffResults(null);
    setIsDiffReady(false);
    setDiffComputationTime(null);
  }, []);

  // Get current version number from version history
  const getCurrentVersion = useCallback(() => {
    if (versionHistory.length === 0) return undefined;
    return Math.max(...versionHistory.map(v => v.version_number));
  }, [versionHistory]);

  return {
    // State
    versionHistory,
    isLoadingVersions,
    selectedVersionForComparison,
    comparisonCellLine,
    versionError,
    
    // NEW: Diff state
    diffResults,
    isDiffReady,
    diffComputationTime,
    
    // Actions
    fetchVersionHistory,
    fetchVersionData,
    selectVersionForComparison,
    clearComparison,
    getCurrentVersion,
    
    // NEW: Diff actions
    handleDiffResults,
    handleDiffError,
    
    // Computed
    hasVersionHistory: versionHistory.length > 0,
    isComparing: !!selectedVersionForComparison && !!comparisonCellLine,
    
    // NEW: Diff computed properties
    changeCount: diffResults ? diffResults.filter(d => 
      d.changeType !== 'UNCHANGED' && d.changeType !== 'NOT_SET'
    ).length : 0,
    totalFields: diffResults ? diffResults.length : 0,
  };
} 