import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

/**
 * Normaliza roles do usuário para array de strings (RoleLevel)
 * Suporta múltiplos formatos:
 * - user.roles (string[] ou objeto[])
 * - user.user.roles (fallback)
 * - Se objeto[]: mapear role.level (string)
 */
export function normalizeRoles(user: unknown): string[] {
  if (!user || typeof user !== 'object') return [];
  const userObj = user as Record<string, unknown>;
  let roles = userObj.roles;
  if (!roles && userObj.user && typeof userObj.user === 'object') {
    const nestedUser = userObj.user as Record<string, unknown>;
    roles = nestedUser.roles;
  }
  if (!roles || !Array.isArray(roles)) return [];
  if (typeof roles[0] === 'string') return roles as string[];
  if (typeof roles[0] === 'object' && roles[0] !== null) {
    return roles
      .map((role: { level?: string; roleId?: string }) => role.level || role.roleId || null)
      .filter((level: string | null) => level !== null) as string[];
  }
  return [];
}

/**
 * Extrai os RoleTypes do usuário (ex: UNIDADE_NUTRICIONISTA, UNIDADE_DIRETOR)
 * Retorna array de strings com os tipos de papel
 */
export function normalizeRoleTypes(user: unknown): string[] {
  if (!user || typeof user !== 'object') return [];
  const userObj = user as Record<string, unknown>;
  let roles = userObj.roles;
  if (!roles && userObj.user && typeof userObj.user === 'object') {
    const nestedUser = userObj.user as Record<string, unknown>;
    roles = nestedUser.roles;
  }
  if (!roles || !Array.isArray(roles)) return [];
  if (typeof roles[0] === 'object' && roles[0] !== null) {
    return roles
      .map((role: { type?: string }) => role.type || null)
      .filter((t: string | null) => t !== null) as string[];
  }
  return [];
}

/**
 * Retorna o papel primário do usuário para exibição no menu/topbar
 * Prioridade: DEVELOPER > MANTENEDORA > STAFF_CENTRAL > UNIDADE_DIRETOR > UNIDADE_NUTRICIONISTA > UNIDADE > PROFESSOR
 */
export function getPrimaryRole(user: unknown): string {
  const levels = normalizeRoles(user);
  const types = normalizeRoleTypes(user);
  const priority = [
    'DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL',
    'UNIDADE_DIRETOR', 'UNIDADE_NUTRICIONISTA',
    'UNIDADE_COORDENADOR_PEDAGOGICO', 'UNIDADE_ADMINISTRATIVO',
    'UNIDADE', 'PROFESSOR',
  ];
  // Verificar types primeiro (mais específico)
  for (const p of priority) {
    if (types.includes(p)) return p;
  }
  // Fallback para levels
  for (const p of priority) {
    if (levels.includes(p)) return p;
  }
  return levels[0] ?? 'DESCONHECIDO';
}

/**
 * Verifica se o usuário tem um role type específico
 */
export function hasRoleType(user: unknown, type: string): boolean {
  return normalizeRoleTypes(user).includes(type);
}

/**
 * Verifica se o usuário é Diretor de Unidade
 */
export function isDiretor(user: unknown): boolean {
  return hasRoleType(user, 'UNIDADE_DIRETOR');
}

/**
 * Verifica se o usuário é Nutricionista de Unidade
 */
export function isNutricionista(user: unknown): boolean {
  return hasRoleType(user, 'UNIDADE_NUTRICIONISTA');
}

/**
 * Verifica se o usuário é Coordenador Pedagógico de Unidade
 */
export function isCoordenadorPedagogico(user: unknown): boolean {
  return hasRoleType(user, 'UNIDADE_COORDENADOR_PEDAGOGICO');
}

/**
 * RoleProtectedRoute - Protege rotas baseadas em roles do usuário
 *
 * Verifica se o usuário autenticado possui pelo menos uma das roles permitidas.
 * Suporta verificação por RoleLevel (ex: 'UNIDADE') e por RoleType (ex: 'UNIDADE_DIRETOR').
 * Se não possuir, redireciona para o dashboard principal.
 */
export function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar por RoleLevel e por RoleType
  const userLevels = normalizeRoles(user);
  const userTypes = normalizeRoleTypes(user);
  const allUserRoles = [...new Set([...userLevels, ...userTypes])];

  const hasAllowedRole = allUserRoles.some((role: string) => allowedRoles.includes(role));

  if (!hasAllowedRole) {
    console.warn(
      `Acesso negado: usuário não possui role permitida. ` +
      `Roles do usuário: ${allUserRoles.join(', ')}, ` +
      `Roles permitidas: ${allowedRoles.join(', ')}`,
    );
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
