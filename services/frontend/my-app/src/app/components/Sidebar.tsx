"use client";
import { usePathname } from 'next/navigation';
import { useSidebar } from './SidebarContext';

const Sidebar = () => {
  const pathname = usePathname();
  const { accordionStates, toggleAccordion } = useSidebar();

  // Determine active item based on current pathname (works during SSR)
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
    }
    return null;
  };

  const activeItem = getActiveItem();

  return (
    <div className="w-64 bg-white border-e border-gray-200 dark:bg-neutral-800 dark:border-neutral-700 flex flex-col h-screen">
      <div className="relative flex flex-col h-full max-h-full">
        <header className="p-4 flex justify-between items-center gap-x-2">
          <a className="flex-none font-semibold text-xl text-black dark:text-white" href="#" aria-label="Brand">Curate AI</a>
        </header>

        <nav className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
          <div className="hs-accordion-group pb-0 px-2 w-full flex flex-col flex-wrap" data-hs-accordion-always-open>
            <ul className="space-y-1">
              <li>
                <a 
                  className={`flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg border border-transparent ${
                    activeItem === 'dashboard' 
                      ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white' 
                      : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white'
                  }`}
                  href="/"
                >
                  <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  Dashboard
                </a>
              </li>

              <li className="hs-accordion" id="users-accordion">
                <button 
                  type="button" 
                  className="hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-800 rounded-lg border border-transparent hover:border-black dark:bg-neutral-800 dark:hover:border-white dark:text-neutral-200" 
                  aria-expanded={accordionStates['users-accordion-collapse-1'] ? 'true' : 'false'}
                  aria-controls="users-accordion-collapse-1"
                  onClick={() => toggleAccordion('users-accordion-collapse-1')}
                >
                  <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                  Tools

                  <svg className={`ms-auto size-4 text-gray-600 group-hover:text-gray-500 dark:text-neutral-400 ${accordionStates['users-accordion-collapse-1'] ? 'block' : 'hidden'}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>

                  <svg className={`ms-auto size-4 text-gray-600 group-hover:text-gray-500 dark:text-neutral-400 ${accordionStates['users-accordion-collapse-1'] ? 'hidden' : 'block'}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>

                <div 
                  id="users-accordion-collapse-1" 
                  className={accordionStates['users-accordion-collapse-1'] ? 'block' : 'hidden'}
                  role="region" 
                  aria-labelledby="users-accordion"
                  suppressHydrationWarning={true}
                >
                  <ul className="pt-1 ps-7 space-y-1">
                    <li>
                      <a 
                        href="/tools/transcription"
                        className={`w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg border border-transparent hover:border-black dark:hover:border-white ${
                          activeItem === 'transcription'
                            ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white'
                            : 'text-gray-800 dark:bg-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        Transcription
                      </a>
                    </li>

                    <li>
                      <a 
                        href="/tools/curation"
                        className={`w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg border border-transparent hover:border-black dark:hover:border-white ${
                          activeItem === 'curation'
                            ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white'
                            : 'text-gray-800 dark:bg-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        Curation
                      </a>
                    </li>

                    <li>
                      <a 
                        href="/tools/data-editor"
                        className={`w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg border border-transparent hover:border-black dark:hover:border-white ${
                          activeItem === 'data-editor'
                            ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white'
                            : 'text-gray-800 dark:bg-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        Data editor
                      </a>
                    </li>
                  </ul>
                </div>
              </li>

              {/* Ontologies link */}
              <li>
                <a 
                  className={`flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg border border-transparent ${
                    activeItem === 'ontologies' 
                      ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white' 
                      : 'text-gray-800 dark:text-white hover:border-black dark:hover:border-white'
                  }`}
                  href="/tools/ontologies"
                >
                  <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m21.7 16.4-.9-.3"/><path d="m15.2 13.9-.9-.3"/><path d="m16.6 18.7.3-.9"/><path d="m19.1 12.2.3-.9"/><path d="m19.6 18.7-.4-1"/><path d="m16.8 12.3-.4-1"/><path d="m14.3 16.6 1-.4"/><path d="m20.7 13.8 1-.4"/></svg>
                  Ontologies
                </a>
              </li>

              <li>
                <a 
                  className={`w-full flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg border border-transparent ${
                    activeItem === 'documentation'
                      ? 'bg-gray-800 text-white dark:bg-gray-600 dark:text-white'
                      : 'text-gray-800 hover:border-black dark:bg-neutral-800 dark:hover:border-white dark:text-neutral-200'
                  }`}
                  href="#"
                >
                  <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  Documentation
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
