import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles, normalizeRoleTypes } from '../app/RoleProtectedRoute';

/**
 * Hook para redirecionar usuário após login baseado em seu role e roleType
 *
 * Prioridade de redirecionamento:
 * - PROFESSOR / PROFESSOR_AUXILIAR → /app/teacher-dashboard
 * - UNIDADE_NUTRICIONISTA          → /app/nutricionista
 * - UNIDADE_DIRETOR                → /app/diretor
 * - STAFF_CENTRAL                  → /app/central
 * - MANTENEDORA / DEVELOPER        → /app/dashboard
 * - UNIDADE (outros)               → /app/dashboard
 */
export function useRedirectByRole() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const path = getRedirectPathByRoles(normalizeRoles(user), normalizeRoleTypes(user));
    navigate(path, { replace: true });
  }, [user, navigate]);
}

/**
 * Função auxiliar para obter rota de redirecionamento baseada em roles e roleTypes
 */
export function getRedirectPathByRoles(levels: string[], types: string[] = []): string {
  // Professor
  if (levels.includes('PROFESSOR') || levels.includes('PROFESSOR_AUXILIAR')) {
    return '/app/teacher-dashboard';
  }
  // Nutricionista
  if (types.includes('UNIDADE_NUTRICIONISTA')) {
    return '/app/nutricionista';
  }
  // Diretor
  if (types.includes('UNIDADE_DIRETOR')) {
    return '/app/diretor';
  }
  // Coordenação Central
  if (levels.includes('STAFF_CENTRAL')) {
    return '/app/central';
  }
  // Mantenedora / Developer
  if (levels.includes('MANTENEDORA') || levels.includes('DEVELOPER')) {
    return '/app/dashboard';
  }
  // Unidade (Coordenadora Pedagógica, Administrativo, etc.)
  return '/app/dashboard';
}
