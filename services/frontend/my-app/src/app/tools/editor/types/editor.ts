export interface FieldSchema {
  [fieldName: string]: {
    type: 'CharField' | 'JSONField' | 'IntegerField' | 'BooleanField';
    required: boolean;
    max_length?: number;
    choices?: string[];
    json_schema?: any;
    help_text?: string;
  };
}

export interface DisplayLine {
  lineNumber: number;
  type: 'field' | 'object' | 'array_item' | 'array_control';
  fieldPath: string[];
  displayText: string;
  isCollapsible: boolean;
  isCollapsed: boolean;
  isEditable: boolean;
  value: any;
  validation?: ValidationError;
  indentLevel: number;
}

export interface ValidationError {
  message: string;
  type: 'error' | 'warning';
}

export interface CellLineData {
  id: string;
  [key: string]: any;
}

export interface CellLineTemplate {
  template_name: string;
  [key: string]: any;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// NEW: Version control interfaces
export interface VersionInfo {
  version_number: number;
  created_by: string;
  created_on: string;
  change_summary?: string;
}

export interface ChangeStatistics {
  additions: number;
  deletions: number;
  modifications: number;
  totalLines: number;
  percentageChanged: number;
}

// Enhanced editor state with version control
export interface EditorState {
  // Original editor state
  cellLineData: CellLineData | null;
  schema: FieldSchema | null;
  displayLines: DisplayLine[];
  editingLine: number | null;
  validationErrors: ValidationError[];
  isLoading: boolean;
  isSaving: boolean;
  
  // NEW: Version control state
  mode: 'edit' | 'compare';
  versionHistory: VersionInfo[];
  isLoadingVersions: boolean;
  selectedVersionForComparison?: number;
  comparisonCellLine?: CellLineData;
  versionError?: string;
}

export type EditorAction = 
  | { type: 'SET_CELL_LINE_DATA'; payload: CellLineData | null }
  | { type: 'SET_SCHEMA'; payload: FieldSchema | null }
  | { type: 'SET_DISPLAY_LINES'; payload: DisplayLine[] }
  | { type: 'SET_EDITING_LINE'; payload: number | null }
  | { type: 'SET_VALIDATION_ERRORS'; payload: ValidationError[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'UPDATE_FIELD_VALUE'; payload: { lineNumber: number; value: any } }
  // NEW: Version control actions
  | { type: 'SET_MODE'; payload: 'edit' | 'compare' }
  | { type: 'LOAD_VERSION_HISTORY'; payload: VersionInfo[] }
  | { type: 'SET_LOADING_VERSIONS'; payload: boolean }
  | { type: 'SELECT_VERSION_FOR_COMPARISON'; payload: number }
  | { type: 'LOAD_COMPARISON_DATA'; payload: CellLineData }
  | { type: 'CLEAR_COMPARISON' }
  | { type: 'SET_VERSION_ERROR'; payload: string | undefined }; 