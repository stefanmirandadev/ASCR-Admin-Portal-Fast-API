'use client';

import React, { useState, useEffect } from 'react';
import { FilePond } from 'react-filepond';
import 'filepond/dist/filepond.min.css';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error' | 'duplicate';

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadComplete }) => {
  const [files, setFiles] = useState<any[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [isClosing, setIsClosing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && uploadState === 'idle') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, uploadState, onClose]);

  const handleFilesUpdate = (fileItems: any[]) => {
    setFiles(fileItems);
  };

  const handleUploadStart = () => {
    setUploadState('uploading');
  };

  const handleUploadSuccess = () => {
    setUploadState('success');
    onUploadComplete();
  };

  const handleUploadError = (error: any) => {
    console.log('Upload error:', error);
    
    // Check if this is a duplicate error
    if (error && error.body) {
      try {
        const errorData = JSON.parse(error.body);
        if (errorData.error_type === 'duplicate') {
          setUploadState('duplicate');
          setErrorMessage(errorData.message || 'This article has already been transcribed.');
          return;
        }
      } catch (e) {
        // Not JSON or no error_type, treat as general error
      }
    }
    
    // Check for direct error response format
    if (error && typeof error === 'object') {
      if (error.error_type === 'duplicate') {
        setUploadState('duplicate');
        setErrorMessage(error.message || 'This article has already been transcribed.');
        return;
      }
    }
    
    setUploadState('error');
    setErrorMessage('An error occurred during upload. Please try again.');
  };

  const handleOkClick = () => {
    setIsClosing(true);
    // Add transition delay before actually closing
    setTimeout(() => {
      handleModalClose();
    }, 200);
  };

  const handleRetryClick = () => {
    setUploadState('idle');
    setErrorMessage('');
    // Clear current files and allow user to re-select or trigger re-upload
    setFiles([]);
  };

  const handleModalClose = () => {
    setFiles([]);
    setUploadState('idle');
    setErrorMessage('');
    setIsClosing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      id="hs-static-backdrop-modal" 
      className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto"
      role="dialog" 
      tabIndex={-1} 
      aria-labelledby="hs-static-backdrop-modal-label" 
      data-hs-overlay-keyboard="false"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 transition-opacity"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={uploadState === 'idle' ? onClose : undefined}
      ></div>
      
      {/* Modal Container */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className={`relative bg-white border border-gray-200 shadow-2xl rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col dark:bg-neutral-800 dark:border-neutral-700 transition-all duration-200 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
          <div className="flex justify-between items-center py-3 px-4 border-b border-gray-200 dark:border-neutral-700">
            <h3 id="hs-static-backdrop-modal-label" className="font-bold text-gray-800 dark:text-white">
              Upload Files
            </h3>
            {(uploadState === 'idle' || uploadState === 'uploading') && (
              <button 
                type="button" 
                onClick={uploadState === 'idle' ? onClose : undefined}
                disabled={uploadState === 'uploading'}
                className="size-8 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-hidden focus:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-400 dark:focus:bg-neutral-600" 
                aria-label="Close"
              >
                <span className="sr-only">Close</span>
                <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </button>
            )}
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            {uploadState === 'duplicate' ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Article Already Transcribed
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>{errorMessage}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : uploadState === 'error' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Upload Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{errorMessage}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            
            <FilePond
              files={files}
              onupdatefiles={handleFilesUpdate}
              allowMultiple={true}
              maxFiles={20}
              server={{
                process: {
                  url: "http://localhost:8000/api/transcription/create_article/",
                  method: 'POST',
                  onload: (response) => {
                    // Check if response indicates success or error
                    try {
                      const responseData = JSON.parse(response);
                      if (responseData.success === false) {
                        // Handle as error
                        handleUploadError({ body: response });
                        return null;
                      } else if (responseData.success === true) {
                        // Handle as success
                        handleUploadSuccess();
                        return response;
                      }
                    } catch (e) {
                      // Not JSON, treat as success for backward compatibility
                      handleUploadSuccess();
                      return response;
                    }
                    // Default to success if no explicit success flag
                    handleUploadSuccess();
                    return response;
                  },
                  onerror: (response) => {
                    handleUploadError(response);
                    return response;
                  }
                }
              }}
              name="files"
              labelIdle='Drag and drop files to upload... (or <span class="filepond--label-action">browse)</span>.'
              acceptedFileTypes={['audio/*', 'video/*']}
              onprocessfilestart={handleUploadStart}
            />
          </div>
          <div className="flex justify-end items-center gap-x-2 py-3 px-4 border-t border-gray-200 dark:border-neutral-700">
            {uploadState === 'idle' && (
              <button 
                type="button" 
                onClick={onClose}
                className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-2xs hover:bg-gray-50 focus:outline-hidden focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
              >
                Close
              </button>
            )}
            
            {(uploadState === 'success' || uploadState === 'uploading') && (
              <button 
                type="button" 
                onClick={handleOkClick}
                disabled={uploadState === 'uploading'}
                className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg bg-green-600 text-white shadow-2xs hover:bg-green-700 focus:outline-hidden focus:bg-green-700 disabled:opacity-50 disabled:pointer-events-none disabled:bg-gray-400"
              >
                OK
              </button>
            )}
            
            {uploadState === 'duplicate' && (
              <>
                <button 
                  type="button" 
                  onClick={handleModalClose}
                  className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-2xs hover:bg-gray-50 focus:outline-hidden focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                >
                  Close
                </button>
                <button 
                  type="button" 
                  onClick={handleRetryClick}
                  className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg bg-yellow-600 text-white shadow-2xs hover:bg-yellow-700 focus:outline-hidden focus:bg-yellow-700 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Upload Different File
                </button>
              </>
            )}
            
            {uploadState === 'error' && (
              <>
                <button 
                  type="button" 
                  onClick={handleModalClose}
                  className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-2xs hover:bg-gray-50 focus:outline-hidden focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                >
                  Close
                </button>
                <button 
                  type="button" 
                  onClick={handleRetryClick}
                  className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg bg-blue-600 text-white shadow-2xs hover:bg-blue-700 focus:outline-hidden focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Retry
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal; 