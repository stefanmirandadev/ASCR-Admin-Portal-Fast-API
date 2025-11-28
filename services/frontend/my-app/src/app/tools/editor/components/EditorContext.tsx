'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { EditorState, EditorAction, CellLineData, VersionInfo } from '../types/editor';
import { useCellLineData } from '../hooks/useCellLineData';
import { useVersionControl } from '../hooks/useVersionControl';
import { useSchemaData } from '../hooks/useSchemaData';

interface EditorContextType {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  actions: {
    selectCellLine: (id: string) => Promise<void>;
    selectVersionForComparison: (versionNumber: number) => Promise<void>;
    clearComparison: () => void;
    toggleMode: () => void;
    saveCellLine: (data: CellLineData) => Promise<void>;
  };
  computed: {
    currentVersion?: number;
    hasVersionHistory: boolean;
    isComparing: boolean;
  };
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

const initialState: EditorState = {
  cellLineData: null,
  schema: null,
  displayLines: [],
  editingLine: null,
  validationErrors: [],
  isLoading: false,
  isSaving: false,
  mode: 'edit',
  versionHistory: [],
  isLoadingVersions: false,
  selectedVersionForComparison: undefined,
  comparisonCellLine: undefined,
  versionError: undefined,
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_CELL_LINE_DATA':
      return { ...state, cellLineData: action.payload };
    case 'SET_SCHEMA':
      return { ...state, schema: action.payload };
    case 'SET_DISPLAY_LINES':
      return { ...state, displayLines: action.payload };
    case 'SET_EDITING_LINE':
      return { ...state, editingLine: action.payload };
    case 'SET_VALIDATION_ERRORS':
      return { ...state, validationErrors: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'LOAD_VERSION_HISTORY':
      return { ...state, versionHistory: action.payload, isLoadingVersions: false };
    case 'SET_LOADING_VERSIONS':
      return { ...state, isLoadingVersions: action.payload };
    case 'SELECT_VERSION_FOR_COMPARISON':
      return { ...state, selectedVersionForComparison: action.payload };
    case 'LOAD_COMPARISON_DATA':
      return { ...state, comparisonCellLine: action.payload };
    case 'CLEAR_COMPARISON':
      return { 
        ...state, 
        selectedVersionForComparison: undefined, 
        comparisonCellLine: undefined,
        mode: 'edit',
        versionError: undefined
      };
    case 'SET_VERSION_ERROR':
      return { ...state, versionError: action.payload };
    case 'UPDATE_FIELD_VALUE':
      // Handle field updates within the display lines
      return {
        ...state,
        displayLines: state.displayLines.map(line =>
          line.lineNumber === action.payload.lineNumber
            ? { ...line, value: action.payload.value }
            : line
        )
      };
    default:
      return state;
  }
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  
  const { selectedCellLine, fetchCellLine, saveCellLine: saveCellLineAPI } = useCellLineData();
  const { schema } = useSchemaData();
  
  const versionControl = useVersionControl(state.cellLineData?.id);

  // Sync external data with internal state
  useEffect(() => {
    if (selectedCellLine !== state.cellLineData) {
      dispatch({ type: 'SET_CELL_LINE_DATA', payload: selectedCellLine });
    }
  }, [selectedCellLine, state.cellLineData]);

  useEffect(() => {
    if (schema !== state.schema) {
      dispatch({ type: 'SET_SCHEMA', payload: schema });
    }
  }, [schema, state.schema]);

  // Sync version control data
  useEffect(() => {
    dispatch({ type: 'LOAD_VERSION_HISTORY', payload: versionControl.versionHistory });
  }, [versionControl.versionHistory]);

  useEffect(() => {
    dispatch({ type: 'SET_LOADING_VERSIONS', payload: versionControl.isLoadingVersions });
  }, [versionControl.isLoadingVersions]);

  useEffect(() => {
    if (versionControl.comparisonCellLine) {
      dispatch({ type: 'LOAD_COMPARISON_DATA', payload: versionControl.comparisonCellLine });
    }
  }, [versionControl.comparisonCellLine]);

  useEffect(() => {
    if (versionControl.selectedVersionForComparison && versionControl.selectedVersionForComparison !== state.selectedVersionForComparison) {
      dispatch({ type: 'SELECT_VERSION_FOR_COMPARISON', payload: versionControl.selectedVersionForComparison });
    }
  }, [versionControl.selectedVersionForComparison, state.selectedVersionForComparison]);

  useEffect(() => {
    if (versionControl.versionError) {
      dispatch({ type: 'SET_VERSION_ERROR', payload: versionControl.versionError });
    }
  }, [versionControl.versionError]);

  const actions = {
    selectCellLine: async (id: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        await fetchCellLine(id);
        await versionControl.fetchVersionHistory(id);
        dispatch({ type: 'CLEAR_COMPARISON' });
      } catch (error) {
        console.error('Error selecting cell line:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    selectVersionForComparison: async (versionNumber: number) => {
      if (state.cellLineData?.id) {
        await versionControl.selectVersionForComparison(versionNumber);
        dispatch({ type: 'SET_MODE', payload: 'compare' });
      }
    },

    clearComparison: () => {
      versionControl.clearComparison();
      dispatch({ type: 'CLEAR_COMPARISON' });
    },

    toggleMode: () => {
      if (state.mode === 'compare') {
        dispatch({ type: 'SET_MODE', payload: 'edit' });
        versionControl.clearComparison();
      } else if (state.cellLineData) {
        dispatch({ type: 'SET_MODE', payload: 'compare' });
      }
    },

    saveCellLine: async (data: CellLineData) => {
      if (!data.id) return;
      
      dispatch({ type: 'SET_SAVING', payload: true });
      try {
        await saveCellLineAPI(data.id, data);
        // Refresh version history after save
        await versionControl.fetchVersionHistory(data.id);
      } catch (error) {
        console.error('Error saving cell line:', error);
        throw error;
      } finally {
        dispatch({ type: 'SET_SAVING', payload: false });
      }
    }
  };

  const computed = {
    currentVersion: versionControl.getCurrentVersion(),
    hasVersionHistory: versionControl.hasVersionHistory,
    isComparing: versionControl.isComparing
  };

  return (
    <EditorContext.Provider value={{ state, dispatch, actions, computed }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
} 