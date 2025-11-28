"use client";
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const Navbar = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine active item based on current pathname
  const getActiveItem = () => {
    if (pathname.includes('/tools/transcription')) {
      return 'transcription';
    } else if (pathname.includes('/tools/curation')) {
      return 'curation';
    } else if (pathname.includes('/tools/data-editor')) {
      return 'data-editor';
    } else if (pathname.includes('/tools/ontologies')) {
      return 'ontologies';
    } else if (pathname === '/' || pathname.includes('/dashboard')) {
      return 'dashboard';
    } else if (pathname.includes('/documentation')) {
      return 'documentation';
    }
    return null;
  };

  const activeItem = getActiveItem();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 dark:bg-neutral-800 dark:border-neutral-700">
      <nav className="w-full px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center">
            <a className="font-semibold text-xl text-black dark:text-white" href="/" aria-label="Brand">
              ASCR AdminPortal
            </a>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <a 
              className={`flex items-center gap-x-2 py-2 px-3 text-sm rounded-lg border border-transparent transition-colors ${
                activeItem === 'dashboard' 
                  ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white' 
                  : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
              href="/"
            >
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Dashboard
            </a>

            <a 
              href="/tools/transcription"
              className={`flex items-center gap-x-2 py-2 px-3 text-sm rounded-lg border border-transparent transition-colors ${
                activeItem === 'transcription'
                  ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white'
                  : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
            >
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Transcription
            </a>

            <a 
              href="/tools/curation"
              className={`flex items-center gap-x-2 py-2 px-3 text-sm rounded-lg border border-transparent transition-colors ${
                activeItem === 'curation'
                  ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white'
                  : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
            >
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Curation
            </a>

            <a 
              href="/tools/editor"
              className={`flex items-center gap-x-2 py-2 px-3 text-sm rounded-lg border border-transparent transition-colors ${
                activeItem === 'data-editor'
                  ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white'
                  : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
            >
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Browser
            </a>

            <a 
              href="/tools/ontologies"
              className={`flex items-center gap-x-2 py-2 px-3 text-sm rounded-lg border border-transparent transition-colors ${
                activeItem === 'ontologies' 
                  ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white' 
                  : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
            >
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m21.7 16.4-.9-.3"/><path d="m15.2 13.9-.9-.3"/><path d="m16.6 18.7.3-.9"/><path d="m19.1 12.2.3-.9"/><path d="m19.6 18.7-.4-1"/><path d="m16.8 12.3-.4-1"/><path d="m14.3 16.6 1-.4"/><path d="m20.7 13.8 1-.4"/></svg>
              Ontologies
            </a>

            <a 
              className={`flex items-center gap-x-2 py-2 px-3 text-sm rounded-lg border border-transparent transition-colors ${
                activeItem === 'documentation'
                  ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white'
                  : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
              href="#"
            >
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              Documentation
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              type="button" 
              className="relative size-9 flex justify-center items-center gap-x-2 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-700 dark:border-neutral-600 dark:text-white dark:hover:bg-neutral-600" 
              aria-label="Toggle navigation"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              ) : (
                <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden mt-3 pb-3`}>
          <div className="flex flex-col space-y-1">
            <a 
              className={`flex items-center gap-x-2 py-2 px-3 text-sm rounded-lg border border-transparent ${
                activeItem === 'dashboard' 
                  ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white' 
                  : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white'
              }`}
              href="/"
            >
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Dashboard
            </a>

            <a 
              href="/tools/transcription"
              className={`flex items-center gap-x-2 py-2 px-3 text-sm rounded-lg border border-transparent ${
                activeItem === 'transcription'
                  ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white'
                  : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white'
              }`}
            >
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Transcription
            </a>

            <a 
              href="/tools/curation"
              className={`flex items-center gap-x-2 py-2 px-3 text-sm rounded-lg border border-transparent ${
                activeItem === 'curation'
                  ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white'
                  : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white'
              }`}
            >
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Curation
            </a>

            <a 
              href="/tools/data-editor"
              className={`flex items-center gap-x-2 py-2 px-3 text-sm rounded-lg border border-transparent ${
                activeItem === 'data-editor'
                  ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white'
                  : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white'
              }`}
            >
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Data Editor
            </a>

            <a 
              href="/tools/ontologies"
              className={`flex items-center gap-x-2 py-2 px-3 text-sm rounded-lg border border-transparent ${
                activeItem === 'ontologies' 
                  ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white' 
                  : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white'
              }`}
            >
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m21.7 16.4-.9-.3"/><path d="m15.2 13.9-.9-.3"/><path d="m16.6 18.7.3-.9"/><path d="m19.1 12.2.3-.9"/><path d="m19.6 18.7-.4-1"/><path d="m16.8 12.3-.4-1"/><path d="m14.3 16.6 1-.4"/><path d="m20.7 13.8 1-.4"/></svg>
              Ontologies
            </a>

            <a 
              className={`flex items-center gap-x-2 py-2 px-3 text-sm rounded-lg border border-transparent ${
                activeItem === 'documentation'
                  ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white'
                  : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white'
              }`}
              href="#"
            >
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              Documentation
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;