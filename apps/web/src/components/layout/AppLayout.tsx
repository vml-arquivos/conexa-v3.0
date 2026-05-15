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
      {/* Wrapper raiz: sem scroll no body, layout fixo */}
      <div className="flex h-screen overflow-hidden bg-background">

        {/* ── Overlay mobile ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar ──
            Desktop: fixed left-0 top-0 h-screen w-64 z-40
            Mobile:  drawer deslizante, z-50, controlado por sidebarOpen
        */}
        <aside
          className={`
            fixed left-0 top-0 h-screen w-64 z-40
            transform transition-transform duration-300 ease-in-out
            md:translate-x-0
            ${sidebarOpen ? 'translate-x-0 z-50' : '-translate-x-full'}
          `}
        >
          <Sidebar onClose={closeSidebar} />
        </aside>

        {/* ── Área principal (direita da sidebar) ──
            md:ml-64 garante que o conteúdo não fique sob a sidebar fixa
        */}
        <div className="flex flex-col flex-1 min-w-0 md:ml-64 h-screen overflow-hidden">

          {/* Header sólido, sticky, z-50, sem transparência */}
          <Topbar onMenuToggle={toggleSidebar} />

          {/* Conteúdo com scroll independente */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <Outlet />
          </main>

          <Toaster position="bottom-right" richColors closeButton />
        </div>
      </div>
    </UnitScopeProvider>
  );
}
