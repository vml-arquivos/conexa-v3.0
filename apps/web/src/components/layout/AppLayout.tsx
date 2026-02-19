import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from '../ui/sonner';

export function AppLayout() {
  return (
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
  );
}
