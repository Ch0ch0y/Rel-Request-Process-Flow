import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PageTransition from './PageTransition';
import { useState } from 'react';
import { Menu } from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center h-14 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="ml-3 text-lg font-heading font-bold text-slate-900 dark:text-white">CA Request</h1>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <PageTransition />
          </div>
        </main>
      </div>
    </div>
  );
}

