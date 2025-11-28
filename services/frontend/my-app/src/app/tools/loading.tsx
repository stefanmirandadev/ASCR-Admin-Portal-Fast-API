export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 dark:border-white"></div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">Loading...</p>
      </div>
    </div>
  );
} 