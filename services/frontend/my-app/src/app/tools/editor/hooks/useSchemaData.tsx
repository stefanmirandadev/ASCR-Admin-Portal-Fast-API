'use client';

import { useState, useEffect, useCallback } from 'react';
import { FieldSchema } from '../types/editor';

export function useSchemaData() {
  const [schema, setSchema] = useState<FieldSchema | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8001/cellline-schema');
      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.statusText}`);
      }
      
      const data = await response.json();
      // Extract the fields from the schema response
      setSchema(data.schema?.fields || data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schema');
      console.error('Error fetching schema:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  return {
    schema,
    isLoading,
    error,
    refetch: fetchSchema,
  };
} 