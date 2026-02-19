import http from './http';

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface User {
  id: string;
  email: string;
  nome?: string;
  status?: string;
  mantenedoraId?: string;
  unitId?: string;
  roles?: string[];
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
 * Verifica se o usuário tem um determinado role
 */
export function hasRole(user: User | null, role: string): boolean {
  if (!user?.roles) return false;
  return user.roles.includes(role);
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
 * Retorna o label do perfil principal do usuário em português
 */
export function getPerfilLabel(user: User | null): string {
  if (!user?.roles || user.roles.length === 0) return 'Usuário';
  if (hasRole(user, 'DEVELOPER')) return 'Desenvolvedor';
  if (hasRole(user, 'MANTENEDORA')) return 'Mantenedora';
  if (hasRole(user, 'STAFF_CENTRAL')) return 'Equipe Central';
  if (hasRole(user, 'UNIDADE')) return 'Unidade';
  if (hasRole(user, 'PROFESSOR')) return 'Professor(a)';
  return 'Usuário';
}
