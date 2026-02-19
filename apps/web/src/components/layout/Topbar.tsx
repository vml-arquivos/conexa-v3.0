import { useAuth } from '../../app/AuthProvider';

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-gray-800">
          Bem-vindo ao Conexa
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
