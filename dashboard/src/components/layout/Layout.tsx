import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-emerald-500/20 transition-all duration-300 relative bg-grid-pattern">
      {/* Premium ambient green spotlights in the background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] glow-spotlight-green rounded-full opacity-65 z-0 pointer-events-none hidden dark:block animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] glow-spotlight-green rounded-full opacity-40 z-0 pointer-events-none hidden dark:block" />

      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
