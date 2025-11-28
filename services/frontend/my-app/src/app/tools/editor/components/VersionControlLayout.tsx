'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VersionSelector } from './VersionSelector';
import { useCellLineData } from '../hooks/useCellLineData';
import { DiffEngine } from './DiffEngine';
import { DiffResult } from '../types/diff';
import { generateStructuredDiff } from '../utils/diffAlgorithm';
import { VirtualizedDiffViewer } from './VirtualizedDiffViewer';

import { usePerformanceOptimization, useOptimizedDiff } from '../hooks/usePerformanceOptimization';
import { useDebouncedOperations } from '../hooks/useDebouncedOperations';
import { PerformanceDashboard } from './PerformanceDashboard';
import { performanceMonitor } from '../utils/performanceMonitor';

interface VersionControlState {
  leftCellLine: string | null;
  leftVersion: string | null;
  rightCellLine: string | null;
  rightVersion: string | null;
  isScrollLocked: boolean;
  showDifferencesOnly: boolean;
  isLoading: {
    leftPanel: boolean;
    rightPanel: boolean;
  };
}

interface VersionControlLayoutProps {
  onComparisonReady?: (leftData: unknown, rightData: unknown) => void;
  onDiffReady?: (diff: DiffResult[]) => void;
  className?: string;
}

interface VersionInfo {
  version_number: number;
  created_by: string;
  created_on: string;
  change_summary?: string;
}

interface CellLineOption {
  id: string;
  label: string;
}

interface VersionOption {
  id: string;
  label: string;
  subtitle: string;
}

export function VersionControlLayout({ onComparisonReady, onDiffReady, className = '' }: VersionControlLayoutProps) {
  const { cellLines } = useCellLineData();
  
  // Performance optimization hooks
  const [perfState, perfActions] = usePerformanceOptimization();
  const { computeOptimizedDiff } = useOptimizedDiff();
  
  // Use refs to stabilize callback functions and prevent constant re-runs
  const onComparisonReadyRef = useRef(onComparisonReady);
  const onDiffReadyRef = useRef(onDiffReady);
  const computeOptimizedDiffRef = useRef(computeOptimizedDiff);
  
  // Update refs when callbacks change
  useEffect(() => {
    onComparisonReadyRef.current = onComparisonReady;
  }, [onComparisonReady]);
  
  useEffect(() => {
    onDiffReadyRef.current = onDiffReady;
  }, [onDiffReady]);
  
  useEffect(() => {
    computeOptimizedDiffRef.current = computeOptimizedDiff;
  }, [computeOptimizedDiff]);
  
  const [showPerfDashboard, setShowPerfDashboard] = useState(false);
  
  const [state, setState] = useState<VersionControlState>({
    leftCellLine: null,
    leftVersion: null,
    rightCellLine: null,
    rightVersion: null,
    isScrollLocked: false, // Not needed for single panel
    showDifferencesOnly: false,
    isLoading: {
      leftPanel: false,
      rightPanel: false,
    },
  });

  const [leftVersions, setLeftVersions] = useState<VersionInfo[]>([]);
  const [rightVersions, setRightVersions] = useState<VersionInfo[]>([]);
  const [leftVersionData, setLeftVersionData] = useState<unknown>(null);
  const [rightVersionData, setRightVersionData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [diffResults, setDiffResults] = useState<DiffResult[] | null>(null);

  // Format cell lines for dropdown options
  const cellLineOptions: CellLineOption[] = cellLines.map(cellLine => ({
    id: cellLine.CellLine_hpscreg_id,
    label: cellLine.CellLine_hpscreg_id,
  }));

  // Format versions for dropdown options
  const formatVersionOptions = (versions: VersionInfo[]): VersionOption[] => {
    return versions.map(version => ({
      id: version.version_number.toString(),
      label: `Version ${version.version_number}`,
      subtitle: new Date(version.created_on).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
    }));
  };

  // Debounced operations for better performance
  const [debouncedState, debouncedActions] = useDebouncedOperations(
    // Version selection handler
    (cellLineId: string, versionId: string, panel: 'left' | 'right') => {
      actuallyFetchVersionData(cellLineId, versionId, panel);
    },
    // Filter handler
    (showDifferencesOnly: boolean) => {
      setState(prev => ({ ...prev, showDifferencesOnly }));
    }
  );

  // Fetch versions for a specific cell line with performance tracking
  const fetchVersions = useCallback(async (cellLineId: string, panel: 'left' | 'right') => {
    if (!cellLineId) return;

    const startTiming = performanceMonitor.startTiming('fetchVersions', {
      cellLineId,
      panel
    });

    setState(prev => ({
      ...prev,
      isLoading: { ...prev.isLoading, [`${panel}Panel`]: true }
    }));
    setError(null);

    try {
      const response = await fetch(`http://localhost:8002/cell-lines/${cellLineId}/versions`);
      if (!response.ok) {
        throw new Error(`Failed to fetch versions: ${response.statusText}`);
      }

      const data = await response.json();
      const versions = data.versions || [];

      if (panel === 'left') {
        setLeftVersions(versions);
      } else {
        setRightVersions(versions);
      }

      const duration = startTiming();
      console.log(`📋 Fetched ${versions.length} versions in ${duration.toFixed(2)}ms`);
    } catch (err) {
      startTiming();
      setError(err instanceof Error ? err.message : 'Failed to fetch versions');
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: { ...prev.isLoading, [`${panel}Panel`]: false }
      }));
    }
  }, []);

  // Fetch specific version data with caching
  const actuallyFetchVersionData = useCallback(async (cellLineId: string, versionNumber: string, panel: 'left' | 'right') => {
    if (!cellLineId || !versionNumber) return;

    setState(prev => ({
      ...prev,
      isLoading: { ...prev.isLoading, [`${panel}Panel`]: true }
    }));
    setError(null);

    try {
      // Use cached version data
      const versionData = await perfActions.getCachedVersion(cellLineId, versionNumber);

      if (panel === 'left') {
        setLeftVersionData(versionData);
      } else {
        setRightVersionData(versionData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch version data');
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: { ...prev.isLoading, [`${panel}Panel`]: false }
      }));
    }
  }, [perfActions]);

  // Original fetch function for non-debounced calls
  const fetchVersionData = useCallback(async (cellLineId: string, versionNumber: string, panel: 'left' | 'right') => {
    return actuallyFetchVersionData(cellLineId, versionNumber, panel);
  }, [actuallyFetchVersionData]);

  // Handle cell line selection
  const handleCellLineSelect = useCallback((panel: 'left' | 'right', cellLineId: string) => {
    setState(prev => ({
      ...prev,
      [`${panel}CellLine`]: cellLineId,
      [`${panel}Version`]: null, // Reset version when cell line changes
    }));

    // Clear version data for this panel
    if (panel === 'left') {
      setLeftVersionData(null);
      setLeftVersions([]);
    } else {
      setRightVersionData(null);
      setRightVersions([]);
    }

    // Fetch versions for the selected cell line
    fetchVersions(cellLineId, panel);
  }, [fetchVersions]);

  // Handle version selection with debouncing
  const handleVersionSelect = useCallback((panel: 'left' | 'right', versionId: string) => {
    setState(prev => ({
      ...prev,
      [`${panel}Version`]: versionId,
    }));

    const cellLineId = panel === 'left' ? state.leftCellLine : state.rightCellLine;
    if (cellLineId) {
      // Use debounced version selection for better performance
      debouncedActions.debouncedVersionSelect(cellLineId, versionId, panel);
    }
  }, [state.leftCellLine, state.rightCellLine, debouncedActions]);

  // Toggle scroll lock
  const handleToggleScrollLock = useCallback(() => {
    setState(prev => ({
      ...prev,
      isScrollLocked: !prev.isScrollLocked,
    }));
  }, []);

  // Toggle show differences only with debouncing
  const handleToggleShowDifferences = useCallback(() => {
    const newValue = !state.showDifferencesOnly;
    // Use debounced filter for better performance
    debouncedActions.debouncedFilter(newValue);
  }, [state.showDifferencesOnly, debouncedActions]);

  // Handle diff results from DiffEngine
  const handleDiffReady = useCallback((diff: DiffResult[]) => {
    setDiffResults(diff);
    if (onDiffReady) {
      onDiffReady(diff);
    }
  }, [onDiffReady]);

  const handleDiffError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setDiffResults(null);
  }, []);

  // Notify parent when comparison is ready
  useEffect(() => {
    if (leftVersionData && rightVersionData && onComparisonReady) {
      onComparisonReady(leftVersionData, rightVersionData);
    }
  }, [leftVersionData, rightVersionData, onComparisonReady]);



  // Compute diff when both versions are available with caching
  useEffect(() => {
    if (leftVersionData && rightVersionData && state.leftVersion && state.rightVersion) {
      setDiffResults(null); // Clear previous results

      // Use optimized diff computation with caching
      const computeDiff = async () => {
        try {
          const diff = await computeOptimizedDiffRef.current(
            leftVersionData as any,
            rightVersionData as any,
            `${state.leftCellLine}:${state.leftVersion}`,
            `${state.rightCellLine}:${state.rightVersion}`,
            generateStructuredDiff
          );

          setDiffResults(diff);

          // Notify parent components using stable refs
          if (onComparisonReadyRef.current) {
            onComparisonReadyRef.current(leftVersionData, rightVersionData);
          }
          if (onDiffReadyRef.current) {
            onDiffReadyRef.current(diff);
          }
        } catch (error) {
          console.error('Diff computation failed:', error);
          setError('Failed to compute differences');
        }
      };

      computeDiff();
    } else {
      setDiffResults(null);
    }
  }, [
    leftVersionData, 
    rightVersionData, 
    state.leftVersion, 
    state.rightVersion,
    state.leftCellLine,
    state.rightCellLine
    // Removed function dependencies that cause constant re-runs
  ]);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm h-full w-full flex flex-col ${className}`}>
      {/* Control Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-end">
          {/* Control Elements */}
          <div className="flex items-center space-x-3">
            {/* Show Differences Radio Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => debouncedActions.debouncedFilter(false)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 hover:ring-2 hover:ring-blue-500 hover:ring-opacity-50 hover:ring-offset-1 ${
                  !state.showDifferencesOnly
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Show All
              </button>
              <button
                onClick={() => debouncedActions.debouncedFilter(true)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 hover:ring-2 hover:ring-blue-500 hover:ring-opacity-50 hover:ring-offset-1 ${
                  state.showDifferencesOnly
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Show Differences
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md flex-shrink-0">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Selection Controls */}
      <div className="border-b border-gray-200 p-6 flex-shrink-0">
        <div className="grid grid-cols-4 gap-6">
          {/* Column 1: Left Panel Cell Line */}
          <div className="space-y-4">
            <VersionSelector
              label="Select cell line:"
              placeholder="Choose cell line..."
              options={cellLineOptions}
              value={state.leftCellLine}
              onChange={(value) => handleCellLineSelect('left', value)}
              searchable
            />
          </div>

          {/* Column 2: Left Panel Version */}
          <div className="space-y-4">
            <VersionSelector
              label="Select version:"
              placeholder="Select version..."
              options={formatVersionOptions(leftVersions)}
              value={state.leftVersion}
              onChange={(value) => handleVersionSelect('left', value)}
              disabled={!state.leftCellLine}
              isLoading={state.isLoading.leftPanel}
            />
          </div>

          {/* Column 3: Right Panel Cell Line */}
          <div className="space-y-4">
            <VersionSelector
              label="Select cell line:"
              placeholder="Choose cell line..."
              options={cellLineOptions}
              value={state.rightCellLine}
              onChange={(value) => handleCellLineSelect('right', value)}
              searchable
            />
          </div>

          {/* Column 4: Right Panel Version */}
          <div className="space-y-4">
            <VersionSelector
              label="Select version:"
              placeholder="Select version..."
              options={formatVersionOptions(rightVersions)}
              value={state.rightVersion}
              onChange={(value) => handleVersionSelect('right', value)}
              disabled={!state.rightCellLine}
              isLoading={state.isLoading.rightPanel}
            />
          </div>
        </div>
      </div>

      {/* Main Content Panel - Unified Diff Viewer */}
      <div className="diff-container flex-1 flex flex-col min-h-0 w-full px-0 pb-0">
        {state.isLoading.leftPanel || state.isLoading.rightPanel ? (
          <div className="flex items-center justify-center flex-1">
            <div className="flex items-center text-gray-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              Loading version data...
            </div>
          </div>
        ) : !leftVersionData || !rightVersionData || !diffResults ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Select cell lines and versions to compare</p>
              <p className="text-xs text-gray-400 mt-1">Choose from the dropdowns above</p>
            </div>
          </div>
        ) : (
          <div className="diff-viewer-container flex-1 flex flex-col bg-white border border-gray-200 rounded-lg min-h-0 w-full mx-6 mb-6">
            {/* Column Headers */}
            <div className="diff-header grid grid-cols-4 gap-6 p-4 pr-6 bg-gray-50 border-b border-gray-200 rounded-t-lg flex-shrink-0">
              <div className="text-sm font-medium text-gray-700">Field Name</div>
              <div className="text-sm font-medium text-gray-700">&nbsp;</div>
              <div className="text-sm font-medium text-gray-700 text-center">
                {state.leftCellLine} (v{state.leftVersion})
              </div>
              <div className="text-sm font-medium text-gray-700 text-center">
                {state.rightCellLine} (v{state.rightVersion})
              </div>
            </div>
            
            {/* Diff Content - Full height remaining space */}
            <div className="flex-1 min-h-0" style={{ height: '700px' }}>
              <VirtualizedDiffViewer
                diffResults={diffResults}
                showDifferencesOnly={state.showDifferencesOnly}
                leftCellLine={state.leftCellLine}
                leftVersion={state.leftVersion}
                rightCellLine={state.rightCellLine}
                rightVersion={state.rightVersion}
              />
            </div>
          </div>
        )}
      </div>

      {/* Performance Dashboard */}
      <PerformanceDashboard 
        isVisible={showPerfDashboard}
        onToggleVisibility={() => setShowPerfDashboard(!showPerfDashboard)}
      />
    </div>
  );
} 