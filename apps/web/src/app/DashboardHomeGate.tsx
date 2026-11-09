import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { normalizeRoles } from './RoleProtectedRoute';

/**
 * Porta de entrada de /app/dashboard.
 * A equipe de Manutenção não tem painel pedagógico: vai direto para a fila de serviços.
 * Para todos os outros perfis, renderiza exatamente o que já existia.
 */
export function DashboardHomeGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const levels = normalizeRoles(user);
  const manutOnly =
    levels.includes('MANUTENCAO') && !levels.some((l) => l === 'DEVELOPER' || l === 'MANTENEDORA');
  if (manutOnly) return <Navigate to="/app/manutencao" replace />;
  return <>{children}</>;
}
