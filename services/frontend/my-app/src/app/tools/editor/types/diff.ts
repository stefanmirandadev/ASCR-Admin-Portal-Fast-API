export interface FieldSchema {
  key: string;
  path: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  label: string;
  children?: FieldSchema[];
  itemSchema?: FieldSchema[]; // For array items
}

export interface CellLineData {
  id: string;
  version_number: number;
  created_at: string;
  data: Record<string, any>;
}

export interface DiffResult {
  fieldPath: string;
  changeType: 'UNCHANGED' | 'MODIFIED' | 'ADDED' | 'REMOVED' | 'NOT_SET';
  leftValue: any;
  rightValue: any;
  hasNestedChanges?: boolean;
  children?: DiffResult[];
}

export type ChangeType = 'UNCHANGED' | 'MODIFIED' | 'ADDED' | 'REMOVED' | 'NOT_SET';

export interface DiffEngineProps {
  leftVersionId: string | null;
  rightVersionId: string | null;
  leftCellLineId: string | null;
  rightCellLineId: string | null;
  onDiffReady: (diff: DiffResult[]) => void;
  onError: (error: string) => void;
}

export interface DiffCacheEntry {
  diff: DiffResult[];
  timestamp: number;
} 