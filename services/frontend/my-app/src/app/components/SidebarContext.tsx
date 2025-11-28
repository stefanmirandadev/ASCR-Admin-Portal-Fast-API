"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  accordionStates: Record<string, boolean>;
  toggleAccordion: (accordionId: string) => void;
  isHydrated: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [accordionStates, setAccordionStates] = useState<Record<string, boolean>>(() => {
    // Initialize with default values immediately to prevent flicker
    return {
      'users-accordion-collapse-1': true, // Default Tools accordion to open
      'account-accordion-sub-1-collapse-1': false, // Default Ontologies accordion to closed
    };
  });

  // Hydrate from localStorage on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStates = localStorage.getItem('sidebarAccordionStates');
      if (savedStates) {
        try {
          const parsedStates = JSON.parse(savedStates);
          setAccordionStates(parsedStates);
        } catch (error) {
          console.warn('Failed to parse saved sidebar states:', error);
          // Keep default states if parsing fails
        }
      }
      setIsHydrated(true);
    }
  }, []);

  // Save accordion states to localStorage whenever they change (only after hydration)
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      localStorage.setItem('sidebarAccordionStates', JSON.stringify(accordionStates));
    }
  }, [accordionStates, isHydrated]);

  const toggleAccordion = (accordionId: string) => {
    setAccordionStates(prev => ({
      ...prev,
      [accordionId]: !prev[accordionId]
    }));
  };

  return (
    <SidebarContext.Provider value={{ accordionStates, toggleAccordion, isHydrated }}>
      {children}
    </SidebarContext.Provider>
  );
}; 