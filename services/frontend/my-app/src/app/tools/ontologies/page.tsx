'use client'

import { useState, useEffect } from 'react'
import React from 'react'


const ontologies = [
  { id: 'mondo', name: 'Mondo disease ontology' },
  { id: 'efo', name: 'Experimental factor ontology' },
  { id: 'uberon', name: 'Uberon anatomical ontology' },
  { id: 'go', name: 'Gene ontology' },
  { id: 'chebi', name: 'Chemical entity ontology' },
  { id: 'clo', name: 'Cell ontology' },
  { id: 'so', name: 'Sequence types and features ontology' },
  { id: 'fma', name: 'Foundational model of anatomy ontology' },
  { id: 'obi', name: 'Ontology for biomedical investigations' },
  { id: 'geno', name: 'GENO ontology' },
]

interface SearchResult {
  iri: string
  description: string
  label: string
  obo_id: string
  short_form: string
  ontology_name: string
  ontology_prefix: string
  type: number
}

// Type guard to ensure an object matches SearchResult interface
function isSearchResult(obj: any): obj is SearchResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.label === 'string' &&
    (obj.description === undefined || typeof obj.description === 'string') &&
    typeof obj.source === 'string'
  )
}

export default function OntologiesPage() {
  const [selectedOntology, setSelectedOntology] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Add effect to handle body scroll lock
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isModalOpen])

  // OLSConnection
  const handleAddTerm = async () => {
    if (!selectedOntology) {
      alert('Please select an ontology first')
      return
    }

    if (!searchTerm) {
      alert('Please enter a search term')
      return
    }

    setIsLoading(true)
    try {
      const requestBody = {
        ontologyId: selectedOntology,
        searchTerm: searchTerm,
      }
      
      console.log('Sending request to backend:', {
        url: '/api/ontologies/search/',
        method: 'POST',
        body: requestBody
      })

      const response = await fetch('/api/ontologies/search/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch results')
      }
      
      const data = await response.json()
      console.log('Received response from backend:', data)
      
      if (!data.results || !Array.isArray(data.results)) {
        console.error('Invalid response format:', data)
        throw new Error('Invalid response format from server')
      }
      
      setSearchResults(data.results)
      console.log('Search results:', data.results)

    } catch (error) {
      console.error('Error fetching results:', error)
      alert('Failed to fetch results. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log('Enter key pressed, triggering search')
      handleAddTerm()
    }
  }

  const toggleResultSelection = (resultId: string) => {
    setSelectedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(resultId)) {
        newSet.delete(resultId)
      } else {
        newSet.add(resultId)
      }
      return newSet
    })
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl">Ontologies</h1>
      </div>
      
      <div className="space-y-4">
        {/* Ontology Selection */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="font-light text-gray-500 whitespace-nowrap">Select your ontology:</h2>
            <div className="flex gap-2">
              {ontologies.map((ontology) => (
                <div 
                  key={ontology.id}
                  className={`px-3 py-1 text-md font-light text-gray-500 cursor-pointer rounded-full border ${
                    selectedOntology === ontology.id 
                      ? 'border-gray-700 bg-none' 
                      : 'border-gray-200 hover:border-gray-700'
                  }`}
                  onClick={() => {
                    setSelectedOntology(ontology.id)
                    setSearchResults([])
                    setSearchTerm('')
                  }}
                >
                  {ontology.id}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors duration-200"
            aria-label="View ontology information"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-medium">Ontology Information</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {ontologies.map((ontology) => (
                  <React.Fragment key={ontology.id}>
                    <span className="font-medium text-gray-900">{ontology.id}</span>
                    <span className="text-gray-600">{ontology.name}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Bar - Only visible when an ontology is selected */}
        {selectedOntology && (
          <div className="flex items-center justify-between gap-4">
            <div className="max-w-2xl relative flex-1">
              <input
                type="text"
                placeholder="Enter a term to search..."
                className="w-full px-4 py-2 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-light hover:border-gray-300 transition-colors duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div 
                className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer group"
                onClick={handleAddTerm}
              >
                <div className="h-6 w-px bg-gray-200 mr-3"></div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {searchResults.length > 0 && (
              <div className="text-sm text-gray-500 whitespace-nowrap">
                Showing {searchResults.length} / {searchResults.length} results
              </div>
            )}
          </div>
        )}

        {/* Search Results List */}
        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-0">
              {searchResults.map((result, index) => (
                <div 
                  key={index} 
                  className="bg-white border-b border-gray-200 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="p-3">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-medium text-gray-900">
                            {result.label}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {result.obo_id}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">
                          <span className="font-medium">Description:</span> {result.description && result.description.length > 0 ? result.description : 'None'}
                        </p>
                      </div>
                      <button 
                        className="ml-4 px-3 py-1.5 bg-white text-black rounded-full hover:bg-gray-100 transition-colors duration-200 text-sm font-medium shadow-sm"
                        onClick={() => console.log('Add to ASCR clicked for:', result)}
                      >
                        Add to ASCR
                      </button>
                    </div>
                    
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      <div>
                        IRI: <a 
                          href={result.iri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {result.iri}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 