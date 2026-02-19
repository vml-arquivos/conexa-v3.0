import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

/**
 * Normaliza roles do usuário para array de strings
 * Suporta múltiplos formatos:
 * - user.roles (string[] ou objeto[])
 * - user.user.roles (fallback)
 * - Se objeto[]: mapear role.level (string)
 */
function normalizeRoles(user: unknown): string[] {
  if (!user || typeof user !== 'object') return [];

  // Type guard para acessar propriedades
  const userObj = user as Record<string, unknown>;

  // Tentar user.roles primeiro
  let roles = userObj.roles;

  // Fallback: user.user.roles
  if (!roles && userObj.user && typeof userObj.user === 'object') {
    const nestedUser = userObj.user as Record<string, unknown>;
    roles = nestedUser.roles;
  }

  // Se não encontrou roles, retornar vazio
  if (!roles || !Array.isArray(roles)) {
    return [];
  }

  // Se roles é array de strings, retornar direto
  if (typeof roles[0] === 'string') {
    return roles as string[];
  }

  // Se roles é array de objetos, mapear role.level
  if (typeof roles[0] === 'object' && roles[0] !== null) {
    return roles
      .map((role: { level?: string; roleId?: string }) => role.level || role.roleId || null)
      .filter((level: string | null) => level !== null) as string[];
  }

  return [];
}

/**
 * RoleProtectedRoute - Protege rotas baseadas em roles do usuário
 * 
 * Verifica se o usuário autenticado possui pelo menos uma das roles permitidas.
 * Se não possuir, redireciona para o dashboard principal.
 * 
 * @param children - Componente filho a ser renderizado se autorizado
 * @param allowedRoles - Array de roles permitidas (ex: ['PROFESSOR', 'MANTENEDORA'])
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

  // Normalizar roles do usuário
  const userRoles = normalizeRoles(user);

  // Verificar se o usuário possui pelo menos uma das roles permitidas
  const hasAllowedRole = userRoles.some((role: string) => allowedRoles.includes(role));

  if (!hasAllowedRole) {
    console.warn(
      `Acesso negado: usuário não possui role permitida. ` +
      `Roles do usuário: ${userRoles.join(', ')}, ` +
      `Roles permitidas: ${allowedRoles.join(', ')}`
    );
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}

// Exportar normalizeRoles para uso em outros componentes
// eslint-disable-next-line react-refresh/only-export-components
export { normalizeRoles };
