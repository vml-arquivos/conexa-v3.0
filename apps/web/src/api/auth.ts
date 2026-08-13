import http from './http';

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Role no formato rico retornado pelo /auth/me e embutido no JWT.
 * O backend sempre inclui level + type + unitScopes desde o fix 43129d6.
 */
export interface UserRole {
  roleId: string;
  level: string;        // RoleLevel: PROFESSOR, UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
  type: string;         // RoleType: UNIDADE_ADMINISTRATIVO, UNIDADE_DIRETOR, PROFESSOR, etc.
  unitScopes: string[]; // Array de unitIds que o usuário tem acesso
}

export interface User {
  id: string;
  email: string;
  nome?: string;
  status?: string;
  mantenedoraId?: string;
  unitId?: string;
  /** Dados da unidade retornados pelo /auth/me (id, name, unitCode) */
  unit?: { id: string; name: string; unitCode?: string } | null;
  /**
   * Roles no formato rico (UserRole[]) — formato atual do /auth/me e do JWT.
   * Mantido como unknown[] internamente para compatibilidade com tokens legados (string[]).
   */
  roles?: UserRole[] | string[];
  [key: string]: unknown;
}

export interface MeResponse {
  user: User;
}

/**
 * Parsing tolerante do login response
 * Aceita: accessToken | access_token | token
 * Aceita: refreshToken | refresh_token (se existir)
 */
function parseLoginResponse(data: Record<string, unknown>): LoginResponse {
  const accessToken = (data.accessToken || data.access_token || data.token) as string;
  const refreshToken = (data.refreshToken || data.refresh_token) as string | undefined;

  if (!accessToken) {
    console.error('Login response inválido:', data);
    throw new Error(
      `Não foi possível encontrar token de acesso na resposta. Resposta recebida: ${JSON.stringify(data)}`
    );
  }

  return {
    accessToken,
    refreshToken,
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await http.post('/auth/login', { email, password });
  return parseLoginResponse(response.data);
}

/**
 * Carrega os dados do usuário autenticado via GET /auth/me
 */
export async function loadMe(): Promise<MeResponse> {
  const response = await http.get('/auth/me');
  return response.data;
}

/**
 * Verifica se o usuário tem um determinado role por LEVEL.
 * Suporta roles como string[] (legado) ou UserRole[] (formato atual do /auth/me).
 */
export function hasRole(user: User | null, role: string): boolean {
  if (!user?.roles) return false;
  return (user.roles as unknown[]).some((r) => {
    if (typeof r === 'string') return r === role;
    if (typeof r === 'object' && r !== null) {
      const obj = r as Record<string, unknown>;
      return obj.level === role || obj.roleId === role;
    }
    return false;
  });
}

/**
 * Verifica se o usuário tem um determinado role por TYPE (ex: UNIDADE_ADMINISTRATIVO).
 * Usa o campo type do UserRole — disponível em todos os ambientes (testepiloto, planopiloto, produção).
 */
export function hasRoleType(user: User | null, type: string): boolean {
  if (!user?.roles) return false;
  return (user.roles as unknown[]).some((r) => {
    if (typeof r === 'object' && r !== null) {
      const obj = r as Record<string, unknown>;
      return obj.type === type;
    }
    return false;
  });
}

/**
 * Verifica se o usuário é da Central (STAFF_CENTRAL)
 */
export function isCentral(user: User | null): boolean {
  return hasRole(user, 'STAFF_CENTRAL');
}

/**
 * Verifica se o usuário é Professor
 */
export function isProfessor(user: User | null): boolean {
  return hasRole(user, 'PROFESSOR');
}

/**
 * Verifica se o usuário é da Unidade (direção/coordenação/administrativo)
 */
export function isUnidade(user: User | null): boolean {
  return hasRole(user, 'UNIDADE');
}

/**
 * Verifica se o usuário é da Mantenedora
 */
export function isMantenedora(user: User | null): boolean {
  return hasRole(user, 'MANTENEDORA');
}

/**
 * Retorna o label do perfil principal do usuário em português.
 * Usa type quando disponível para maior precisão.
 */
export function getPerfilLabel(user: User | null): string {
  if (!user?.roles || user.roles.length === 0) return 'Usuário';
  if (hasRole(user, 'DEVELOPER')) return 'Desenvolvedor';
  if (hasRole(user, 'MANTENEDORA')) return 'Mantenedora';
  if (hasRole(user, 'STAFF_CENTRAL')) return 'Equipe Central';
  if (hasRoleType(user, 'UNIDADE_DIRETOR')) return 'Diretor(a)';
  if (hasRoleType(user, 'UNIDADE_COORDENADOR_PEDAGOGICO')) return 'Coordenador(a) Pedagógico(a)';
  if (hasRoleType(user, 'UNIDADE_ADMINISTRATIVO')) return 'Secretaria';
  if (hasRoleType(user, 'UNIDADE_NUTRICIONISTA')) return 'Nutricionista';
  if (hasRole(user, 'UNIDADE')) return 'Unidade';
  if (hasRoleType(user, 'PROFESSOR_AUXILIAR')) return 'Professor(a) Auxiliar';
  if (hasRole(user, 'PROFESSOR')) return 'Professor(a)';
  return 'Usuário';
}
