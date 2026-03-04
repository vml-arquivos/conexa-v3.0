import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from '../ui/sonner';
import { UnitScopeProvider } from '../../contexts/UnitScopeContext';

export function AppLayout() {
  return (
    <UnitScopeProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <main className="flex-1">
            <Outlet />
          </main>
          <Toaster position="bottom-right" richColors closeButton />
        </div>
      </div>
    </UnitScopeProvider>
  );
}
