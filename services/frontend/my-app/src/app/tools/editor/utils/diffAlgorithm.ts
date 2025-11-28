import { DiffResult, FieldSchema, ChangeType } from '../types/diff';

/**
 * Core structured template diff algorithm
 * Handles nested objects, arrays, and maintains schema field ordering
 */

/**
 * Determine the type of change between two values
 */
export function determineChangeType(leftValue: any, rightValue: any): ChangeType {
  const leftEmpty = isEmptyValue(leftValue);
  const rightEmpty = isEmptyValue(rightValue);
  
  if (leftEmpty && rightEmpty) return 'NOT_SET';
  if (leftEmpty && !rightEmpty) return 'ADDED';
  if (!leftEmpty && rightEmpty) return 'REMOVED';
  if (deepEqual(leftValue, rightValue)) return 'UNCHANGED';
  return 'MODIFIED';
}

/**
 * Check if a value is considered empty
 */
export function isEmptyValue(value: any): boolean {
  return value === null || 
         value === undefined || 
         value === '' || 
         (Array.isArray(value) && value.length === 0) ||
         (typeof value === 'object' && value !== null && Object.keys(value).length === 0);
}

/**
 * Deep equality comparison for values
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((val, index) => deepEqual(val, b[index]));
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => keysB.includes(key) && deepEqual(a[key], b[key]));
  }
  
  return false;
}

/**
 * Generate field schema from cell line data structure
 * Uses the actual data to infer field types and create consistent ordering
 */
export function generateFieldSchema(sampleData: any): FieldSchema[] {
  const schema: FieldSchema[] = [];
  
  if (!sampleData || typeof sampleData !== 'object') {
    return schema;
  }
  
  // Extract all fields and sort them for consistent ordering
  const fieldNames = Object.keys(sampleData).sort();
  
  for (const fieldName of fieldNames) {
    // Skip metadata fields
    if (['success', 'version_number', 'performance', 'created_on', 'created_by', 'change_summary'].includes(fieldName)) {
      continue;
    }
    
    const value = sampleData[fieldName];
    const fieldSchema = createFieldSchema(fieldName, fieldName, value);
    schema.push(fieldSchema);
  }
  
  return schema;
}

/**
 * Create schema for a single field based on its value
 */
function createFieldSchema(key: string, path: string, value: any): FieldSchema {
  const schema: FieldSchema = {
    key,
    path,
    type: inferFieldType(value),
    label: formatFieldLabel(key)
  };
  
  // Handle nested objects
  if (schema.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    schema.children = Object.keys(value).sort().map(childKey => 
      createFieldSchema(childKey, `${path}.${childKey}`, value[childKey])
    );
  }
  
  // Handle arrays
  if (schema.type === 'array' && Array.isArray(value) && value.length > 0) {
    const firstItem = value[0];
    if (typeof firstItem === 'object' && firstItem !== null) {
      schema.itemSchema = Object.keys(firstItem).sort().map(itemKey =>
        createFieldSchema(itemKey, `${path}[].${itemKey}`, firstItem[itemKey])
      );
    }
  }
  
  return schema;
}

/**
 * Infer field type from value
 */
function inferFieldType(value: any): 'string' | 'number' | 'boolean' | 'object' | 'array' {
  if (value === null || value === undefined) return 'string'; // Default for empty values
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'string';
}

/**
 * Format field name for display
 */
function formatFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
}

/**
 * Main diff generation function
 * Compares two cell line versions and produces structured difference data
 */
export function generateStructuredDiff(
  leftVersion: any,
  rightVersion: any,
  schema?: FieldSchema[]
): DiffResult[] {
  
  // Extract metadata from version responses
  const leftData = leftVersion?.metadata || leftVersion || {};
  const rightData = rightVersion?.metadata || rightVersion || {};
  
  // Generate schema if not provided
  const fieldSchema = schema || generateFieldSchema({ ...leftData, ...rightData });
  
  return processSchemaFields(leftData, rightData, fieldSchema);
}

/**
 * Process all schema fields to ensure complete visibility
 */
function processSchemaFields(
  leftData: any,
  rightData: any,
  schemaFields: FieldSchema[]
): DiffResult[] {
  return schemaFields.map(field => {
    const leftValue = getFieldValue(leftData, field.path);
    const rightValue = getFieldValue(rightData, field.path);
    
    return generateFieldDiff(field, leftValue, rightValue);
  });
}

/**
 * Get field value using dot notation path
 */
function getFieldValue(data: any, path: string): any {
  if (!data || !path) return null;
  
  const keys = path.split('.');
  let value = data;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return null;
    }
  }
  
  return value;
}

/**
 * Generate diff result for a single field
 */
function generateFieldDiff(
  field: FieldSchema,
  leftValue: any,
  rightValue: any
): DiffResult {
  const changeType = determineChangeType(leftValue, rightValue);
  
  if (field.type === 'object') {
    return processNestedObject(field, leftValue, rightValue);
  } else if (field.type === 'array') {
    return processArrayField(field, leftValue, rightValue);
  } else {
    return processPrimitiveField(field, leftValue, rightValue, changeType);
  }
}

/**
 * Process primitive field comparison
 */
function processPrimitiveField(
  field: FieldSchema,
  leftValue: any,
  rightValue: any,
  changeType: ChangeType
): DiffResult {
  return {
    fieldPath: field.path,
    changeType,
    leftValue,
    rightValue
  };
}

/**
 * Process nested object field comparison
 */
function processNestedObject(
  field: FieldSchema,
  leftValue: any,
  rightValue: any
): DiffResult {
  const children = field.children?.map(childField => {
    const leftChild = leftValue?.[childField.key] ?? null;
    const rightChild = rightValue?.[childField.key] ?? null;
    return generateFieldDiff(childField, leftChild, rightChild);
  }) || [];
  
  const hasNestedChanges = children.some(child => 
    child.changeType !== 'UNCHANGED' && child.changeType !== 'NOT_SET'
  );
  
  const changeType = determineChangeType(leftValue, rightValue);
  
  return {
    fieldPath: field.path,
    changeType: hasNestedChanges ? 'MODIFIED' : changeType,
    leftValue,
    rightValue,
    hasNestedChanges,
    children
  };
}

/**
 * Process array field comparison with index-based strategy
 */
function processArrayField(
  field: FieldSchema,
  leftArray: any[],
  rightArray: any[]
): DiffResult {
  const leftArr = leftArray || [];
  const rightArr = rightArray || [];
  const maxLength = Math.max(leftArr.length, rightArr.length);
  
  const children: DiffResult[] = [];
  
  for (let i = 0; i < maxLength; i++) {
    const leftItem = i < leftArr.length ? leftArr[i] : null;
    const rightItem = i < rightArr.length ? rightArr[i] : null;
    
    const itemDiff: DiffResult = {
      fieldPath: `${field.path}[${i}]`,
      changeType: determineChangeType(leftItem, rightItem),
      leftValue: leftItem,
      rightValue: rightItem
    };
    
    // Process nested object properties within array items
    if (field.itemSchema && (leftItem || rightItem)) {
      itemDiff.children = field.itemSchema.map(itemFieldSchema => {
        const leftProp = leftItem?.[itemFieldSchema.key] ?? null;
        const rightProp = rightItem?.[itemFieldSchema.key] ?? null;
        
        return {
          fieldPath: `${field.path}[${i}].${itemFieldSchema.key}`,
          changeType: determineChangeType(leftProp, rightProp),
          leftValue: leftProp,
          rightValue: rightProp
        };
      });
      
      // Check if any nested properties changed
      const hasNestedChanges = itemDiff.children.some(child => 
        child.changeType !== 'UNCHANGED' && child.changeType !== 'NOT_SET'
      );
      
      if (hasNestedChanges && itemDiff.changeType === 'UNCHANGED') {
        itemDiff.changeType = 'MODIFIED';
        itemDiff.hasNestedChanges = true;
      }
    }
    
    children.push(itemDiff);
  }
  
  const hasChanges = children.some(child => 
    child.changeType !== 'UNCHANGED' && child.changeType !== 'NOT_SET'
  );
  
  return {
    fieldPath: field.path,
    changeType: hasChanges ? 'MODIFIED' : determineChangeType(leftArr, rightArr),
    leftValue: leftArr,
    rightValue: rightArr,
    hasNestedChanges: hasChanges,
    children
  };
} 