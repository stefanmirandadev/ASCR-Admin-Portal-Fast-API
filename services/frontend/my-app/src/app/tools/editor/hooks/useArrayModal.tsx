'use client';

import { useState, useCallback } from 'react';

interface ArrayModalState {
  isOpen: boolean;
  fieldName: string;
  fieldPath: string;
  leftArray: any[];
  rightArray: any[];
  leftVersion: string;
  rightVersion: string;
  leftCellLine: string;
  rightCellLine: string;
}

interface ArrayModalContextData {
  leftVersionId?: string;
  rightVersionId?: string;
  leftCellLineId?: string;
  rightCellLineId?: string;
}

export function useArrayModal(contextData?: ArrayModalContextData) {
  const [modalState, setModalState] = useState<ArrayModalState>({
    isOpen: false,
    fieldName: '',
    fieldPath: '',
    leftArray: [],
    rightArray: [],
    leftVersion: '',
    rightVersion: '',
    leftCellLine: '',
    rightCellLine: ''
  });

  const openModal = useCallback((
    fieldPath: string,
    leftArray: any[],
    rightArray: any[],
    fieldName: string,
    additionalContext?: Partial<ArrayModalState>
  ) => {
    setModalState({
      isOpen: true,
      fieldPath,
      fieldName,
      leftArray: leftArray || [],
      rightArray: rightArray || [],
      leftVersion: additionalContext?.leftVersion || contextData?.leftVersionId || 'Unknown',
      rightVersion: additionalContext?.rightVersion || contextData?.rightVersionId || 'Unknown',
      leftCellLine: additionalContext?.leftCellLine || contextData?.leftCellLineId || 'Unknown',
      rightCellLine: additionalContext?.rightCellLine || contextData?.rightCellLineId || 'Unknown'
    });
  }, [contextData]);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return { 
    modalState, 
    openModal, 
    closeModal 
  };
} 