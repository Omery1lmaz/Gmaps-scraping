import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans selection:bg-blue-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
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
