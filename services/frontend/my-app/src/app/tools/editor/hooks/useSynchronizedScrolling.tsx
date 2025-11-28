'use client';

import { useEffect, RefObject } from 'react';

export function useSynchronizedScrolling(
  leftPanelRef: RefObject<HTMLDivElement | null>,
  rightPanelRef: RefObject<HTMLDivElement | null>,
  isLocked: boolean
) {
  useEffect(() => {
    if (!isLocked || !leftPanelRef.current || !rightPanelRef.current) return;
    
    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;
    
    let isScrolling = false;
    
    const syncScroll = (source: HTMLDivElement, target: HTMLDivElement) => {
      return () => {
        if (isScrolling) return;
        isScrolling = true;
        target.scrollTop = source.scrollTop;
        requestAnimationFrame(() => {
          isScrolling = false;
        });
      };
    };
    
    const leftToRight = syncScroll(leftPanel, rightPanel);
    const rightToLeft = syncScroll(rightPanel, leftPanel);
    
    leftPanel.addEventListener('scroll', leftToRight, { passive: true });
    rightPanel.addEventListener('scroll', rightToLeft, { passive: true });
    
    return () => {
      leftPanel.removeEventListener('scroll', leftToRight);
      rightPanel.removeEventListener('scroll', rightToLeft);
    };
  }, [leftPanelRef, rightPanelRef, isLocked]);
} 