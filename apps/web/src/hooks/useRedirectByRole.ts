import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles, normalizeRoleTypes } from '../app/RoleProtectedRoute';

/**
 * Hook para redirecionar usuário após login baseado em seu role e roleType
 *
 * Prioridade de redirecionamento (por tipo — mais específico antes):
 * - PROFESSOR / PROFESSOR_AUXILIAR          → /app/teacher-dashboard
 * - UNIDADE_ADMINISTRATIVO                  → /app/secretaria
 * - UNIDADE_DIRETOR                         → /app/diretor
 * - UNIDADE_NUTRICIONISTA                   → /app/nutricionista
 * - UNIDADE_COORDENADOR_PEDAGOGICO          → /app/coordenacao-pedagogica
 * - STAFF_CENTRAL_PSICOLOGIA                → /app/psicologo
 * - STAFF_CENTRAL / STAFF_CENTRAL_PEDAGOGICO → /app/central
 * - MANTENEDORA / DEVELOPER                 → /app/dashboard
 * - UNIDADE (genérico sem tipo específico)  → /app/dashboard
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
 * Função auxiliar para obter rota de redirecionamento baseada em roles e roleTypes.
 * Exportada separadamente para permitir testes unitários.
 *
 * @param levels - RoleLevels do usuário (ex: ['PROFESSOR', 'UNIDADE'])
 * @param types  - RoleTypes do usuário (ex: ['UNIDADE_ADMINISTRATIVO'])
 */
export function getRedirectPathByRoles(levels: string[], types: string[] = []): string {
  // ── Nível Professor ────────────────────────────────────────────────────
  if (levels.includes('PROFESSOR') || levels.includes('PROFESSOR_AUXILIAR')) {
    // Se rodando como PWA instalado (standalone/fullscreen), vai direto para o mobile
    const isPWA = typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
       window.matchMedia('(display-mode: fullscreen)').matches ||
       (window.navigator as any).standalone === true);
    return isPWA ? '/app/mobile' : '/app/teacher-dashboard';
  }

  // ── Tipos de papel dentro de UNIDADE (mais específico primeiro) ────────
  // Administrativo (Secretaria)
  if (types.includes('UNIDADE_ADMINISTRATIVO')) {
    return '/app/secretaria';
  }
  // Diretor de Unidade
  if (types.includes('UNIDADE_DIRETOR')) {
    return '/app/diretor';
  }
  // Nutricionista de Unidade
  if (types.includes('UNIDADE_NUTRICIONISTA')) {
    return '/app/nutricionista';
  }
  // Coordenadora Pedagógica de Unidade — FIX: rota específica em vez de /app/dashboard
  if (types.includes('UNIDADE_COORDENADOR_PEDAGOGICO')) {
    return '/app/coordenacao-pedagogica';
  }

  // ── Tipos de papel Staff Central ──────────────────────────────────────
  // Psicóloga Central
  if (types.includes('STAFF_CENTRAL_PSICOLOGIA')) {
    return '/app/psicologo';
  }
  // Staff Central Pedagógico e genérico
  if (
    levels.includes('STAFF_CENTRAL') ||
    types.includes('STAFF_CENTRAL_PEDAGOGICO')
  ) {
    return '/app/central';
  }

  // ── Mantenedora / Developer ────────────────────────────────────────────
  if (levels.includes('MANTENEDORA') || levels.includes('DEVELOPER')) {
    return '/app/dashboard';
  }

  // ── Fallback: qualquer UNIDADE sem tipo específico identificado ────────
  // (ex: UNIDADE genérico ou novos tipos ainda não mapeados)
  return '/app/dashboard';
}
