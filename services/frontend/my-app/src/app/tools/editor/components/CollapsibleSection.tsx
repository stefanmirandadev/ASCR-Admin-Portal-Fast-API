'use client';

import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  level: number;
}

export default function CollapsibleSection({
  title,
  isCollapsed,
  onToggle,
  children,
  level
}: CollapsibleSectionProps) {
  const indentStyle = {
    paddingLeft: `${level * 16}px`
  };

  return (
    <div style={indentStyle}>
      <div
        onClick={onToggle}
        className="flex items-center cursor-pointer hover:bg-gray-50 py-1 px-2 rounded"
      >
        <span className="mr-2 text-gray-500 text-sm">
          {isCollapsed ? '▶' : '▼'}
        </span>
        <span className="text-gray-800 font-medium">{title}</span>
      </div>
      
      {!isCollapsed && (
        <div className="ml-4 border-l border-gray-200 pl-4">
          {children}
        </div>
      )}
    </div>
  );
} 