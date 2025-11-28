import { Suspense } from 'react';
import { EditorContainer } from './components/EditorContainer';

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading editor...</span>
        </div>
      </div>
    }>
      <EditorContainer />
    </Suspense>
  );
} 