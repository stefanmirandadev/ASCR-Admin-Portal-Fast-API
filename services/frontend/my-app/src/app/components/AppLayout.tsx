"use client";
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      {/* Fixed navbar at the top */}
      <Navbar />
      
      {/* Main content area with top margin to account for fixed navbar */}
      <main className="pt-20 p-6">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;