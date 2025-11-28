import { useEffect, useRef } from 'react';

// Screen reader announcements
export function useScreenReaderAnnouncement() {
  const announcementRef = useRef<HTMLDivElement>(null);
  
  const announce = (message: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
      announcementRef.current.setAttribute('aria-live', 'polite');
    }
  };
  
  return { announce, announcementRef };
}

// Focus management
export function useFocusManagement() {
  const focusRef = useRef<HTMLDivElement>(null);
  
  const focusFirstInteractive = () => {
    if (focusRef.current) {
      const firstInteractive = focusRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstInteractive) {
        firstInteractive.focus();
      }
    }
  };
  
  return { focusRef, focusFirstInteractive };
}

// Keyboard navigation
export function useKeyboardNavigation() {
  const handleKeyDown = (event: KeyboardEvent, onEnter?: () => void, onEscape?: () => void) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        onEnter?.();
        break;
      case 'Escape':
        event.preventDefault();
        onEscape?.();
        break;
    }
  };
  
  return { handleKeyDown };
}

// Skip link for keyboard users
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
    >
      Skip to main content
    </a>
  );
}

// Loading announcement
export function LoadingAnnouncement({ isLoading, message }: { isLoading: boolean; message: string }) {
  const { announce } = useScreenReaderAnnouncement();
  
  useEffect(() => {
    if (isLoading) {
      announce(message);
    }
  }, [isLoading, message, announce]);
  
  return null;
}

// Screen reader only text
export function SrOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

// Accessible button with proper ARIA attributes
export function AccessibleButton({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  [key: string]: any;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

// Accessible table with proper headers
export function AccessibleTable({
  headers,
  children,
  caption,
  className = ""
}: {
  headers: string[];
  children: React.ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <table className={className} role="table" aria-label={caption}>
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={index} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {children}
      </tbody>
    </table>
  );
} 