import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from '../ui/sonner';
import { UnitScopeProvider } from '../../contexts/UnitScopeContext';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  return (
    <UnitScopeProvider>
      <div className="flex min-h-screen bg-background">
        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* Sidebar — fixa no desktop, drawer no mobile */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0 md:z-auto md:flex-shrink-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar onClose={closeSidebar} />
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onMenuToggle={toggleSidebar} />
          <main className="flex-1 overflow-x-hidden">
            <Outlet />
          </main>
          <Toaster position="bottom-right" richColors closeButton />
        </div>
      </div>
    </UnitScopeProvider>
  );
}
