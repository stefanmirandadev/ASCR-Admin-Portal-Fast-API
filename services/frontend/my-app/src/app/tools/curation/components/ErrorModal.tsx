'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorDetails {
  article_id: number;
  error_message: string;
  curation_status: string;
  failed_at: string;
  filename?: string;
  pubmed_id?: number | null;
}

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorDetails: ErrorDetails | null;
  loading?: boolean;
}

export function ErrorModal({ isOpen, onClose, errorDetails, loading = false }: ErrorModalProps) {
  const categorizeError = (errorMessage: string) => {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('openai') || lowerError.includes('api key') || lowerError.includes('token limit')) {
      return {
        category: 'OpenAI API Error',
        severity: 'high',
        description: 'Issue with OpenAI API integration'
      };
    } else if (lowerError.includes('parsing') || lowerError.includes('json') || lowerError.includes('format')) {
      return {
        category: 'Data Processing Error',
        severity: 'medium',
        description: 'Issue with data parsing or formatting'
      };
    } else if (lowerError.includes('timeout') || lowerError.includes('connection')) {
      return {
        category: 'Network Error',
        severity: 'medium',
        description: 'Network connectivity issue'
      };
    } else {
      return {
        category: 'Application Error',
        severity: 'low',
        description: 'General application error'
      };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading error details...</span>
                  </div>
                ) : errorDetails ? (
                  <div>
                    <div className="flex items-center">
                      <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                      </div>
                      <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                          Curation Error Details
                        </Dialog.Title>
                      </div>
                    </div>

                    <div className="mt-6 space-y-6">
                      {/* Article Information */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Article Information</h4>
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <dt className="font-medium text-gray-500">Article ID:</dt>
                            <dd className="text-gray-900">{errorDetails.article_id}</dd>
                          </div>
                          {errorDetails.filename && (
                            <div>
                              <dt className="font-medium text-gray-500">Filename:</dt>
                              <dd className="text-gray-900">{errorDetails.filename}</dd>
                            </div>
                          )}
                          {errorDetails.pubmed_id && (
                            <div>
                              <dt className="font-medium text-gray-500">PubMed ID:</dt>
                              <dd className="text-gray-900">{errorDetails.pubmed_id}</dd>
                            </div>
                          )}
                          <div>
                            <dt className="font-medium text-gray-500">Failed At:</dt>
                            <dd className="text-gray-900">{formatDate(errorDetails.failed_at)}</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Error Categorization */}
                      {(() => {
                        const errorInfo = categorizeError(errorDetails.error_message);
                        return (
                          <div className={`rounded-lg p-4 border ${getSeverityColor(errorInfo.severity)}`}>
                            <h4 className="text-sm font-medium mb-2">Error Category</h4>
                            <p className="text-sm font-medium">{errorInfo.category}</p>
                            <p className="text-sm mt-1">{errorInfo.description}</p>
                          </div>
                        );
                      })()}

                      {/* Error Message */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Error Message</h4>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono">
                            {errorDetails.error_message}
                          </pre>
                        </div>
                      </div>

                      {/* Troubleshooting Tips */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Troubleshooting Tips</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Check if the article content is properly formatted</li>
                          <li>• Verify that the transcription process completed successfully</li>
                          <li>• Contact support if the error persists</li>
                          <li>• You can retry curation once the issue is resolved</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        onClick={onClose}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No error details available.</p>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 