import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles } from '../app/RoleProtectedRoute';

/**
 * Hook para redirecionar usuário após login baseado em seu role
 * - PROFESSOR → /app/teacher-dashboard
 * - Outros roles → /app/dashboard
 */
export function useRedirectByRole() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const roles = normalizeRoles(user);
    
    // Professor vai para dashboard específico
    if (roles.includes('PROFESSOR')) {
      navigate('/app/teacher-dashboard', { replace: true });
      return;
    }

    // Outros roles vão para dashboard administrativo
    navigate('/app/dashboard', { replace: true });
  }, [user, navigate]);
}

/**
 * Função auxiliar para obter rota de redirecionamento baseada em roles
 * Útil para uso fora de componentes React
 */
export function getRedirectPathByRoles(roles: string[]): string {
  if (roles.includes('PROFESSOR')) {
    return '/app/teacher-dashboard';
  }
  return '/app/dashboard';
}
