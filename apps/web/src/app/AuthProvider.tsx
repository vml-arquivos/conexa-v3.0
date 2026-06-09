import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { login as apiLogin, loadMe } from '../api/auth';
import type { User } from '../api/auth';
import { isAuthExpiredError } from '../api/http';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Ordem de prioridade de roles para seleção determinística do "role mais alto".
 * Usado para garantir que STAFF_CENTRAL seja reconhecido mesmo se vier depois de
 * outros roles no array.
 */
const ROLE_PRIORITY: Record<string, number> = {
  DEVELOPER: 100,
  MANTENEDORA: 90,
  STAFF_CENTRAL: 80,
  UNIDADE: 50,
  PROFESSOR_AUXILIAR: 20,
  PROFESSOR: 10,
};

/**
 * Decodifica o payload do JWT sem verificar assinatura.
 * Usado APENAS para detecção de tokens legados (formato antigo),
 * NUNCA como fonte de roles ou identidade do usuário.
 */
function decodeAccessTokenPayload(): Record<string, unknown> | null {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/**
 * Detecta token no formato antigo (pré-fix 43129d6):
 * roles como strings simples ou objetos sem .level.
 *
 * ATENÇÃO: esta função serve APENAS para forçar logout e renovação de token.
 * Não deve ser usada para extrair dados do usuário.
 */
function hasLegacyToken(): boolean {
  const payload = decodeAccessTokenPayload();
  const roles = payload?.roles;
  if (!Array.isArray(roles) || roles.length === 0) return false;
  if (typeof roles[0] === 'string') return true;
  if (typeof roles[0] === 'object' && roles[0] !== null && !roles[0].level) return true;
  return false;
}

/**
 * Limpa todos os tokens e estado de sessão do cliente.
 * Centralizado aqui para garantir consistência em todos os casos de logout.
 */
function clearLocalSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.clear();
  document.cookie = 'access_token=; Max-Age=0; path=/';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    // FIX p0.1: detectar token antigo (pré-fix 43129d6) e forçar logout
    // para que o usuário faça login novamente e obtenha JWT com role.level correto.
    if (hasLegacyToken()) {
      console.warn('[AuthProvider] Token antigo detectado (sem role.level) — forçando logout para renovação.');
      clearLocalSession();
      setLoading(false);
      return;
    }

    loadMe()
      .then((response) => {
        // Fonte única e confiável de verdade: o backend via /auth/me.
        // Roles vêm do banco de dados, sempre com isActive=true.
        setUser(response.user);
      })
      .catch((error) => {
        // FIX p0.2: NUNCA usar o JWT local como fallback de roles.
        // Se /auth/me falha, o usuário deve fazer login novamente.
        // Motivo: o JWT pode conter roles desatualizadas (ex: STAFF_CENTRAL de
        // um papel que foi desativado no banco). O banco é a fonte de verdade.
        if (isAuthExpiredError(error)) {
          // Token expirado ou inválido — sessão encerrada normalmente.
          clearLocalSession();
        } else {
          // Erro de rede ou erro transitório do servidor.
          // Comportamento seguro: forçar novo login em vez de usar dados stale.
          console.warn(
            '[AuthProvider] Falha ao carregar /auth/me. ' +
            'Por segurança, a sessão não será restaurada a partir do token local. ' +
            'O usuário precisará fazer login novamente.',
            error,
          );
          clearLocalSession();
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const { accessToken, refreshToken } = await apiLogin(email, password);
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }

    // Carregar dados do usuário via /auth/me (retorna roles atuais do banco)
    const response = await loadMe();
    setUser(response.user);
  };

  const logout = useCallback(() => {
    clearLocalSession();
    setUser(null);
    window.location.replace('/login');
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // SESSÃO PERMANENTE — SEM DESCONEXÃO POR INATIVIDADE
  //
  // Regra de negócio: enquanto o navegador estiver aberto e o usuário na
  // página, a sessão NUNCA expira por ociosidade.
  //
  // O que desconecta o usuário:
  //   1. Clicar em "Sair" (logout explícito)
  //   2. Fechar o navegador / encerrar o app (localStorage é preservado
  //      em reaberturas — o usuário volta autenticado)
  //   3. Refresh token expirar após longo período sem abrir o sistema
  //      (configurável via JWT_REFRESH_EXPIRES_IN no backend)
  //   4. Falha ao validar sessão em /auth/me na reabertura (ex: role desativada)
  //
  // O que NÃO desconecta:
  //   ✗ Inatividade (mouse parado, sem cliques)
  //   ✗ Tempo na mesma página
  //   ✗ Qualquer temporizador interno
  //
  // O access token (curto) é renovado silenciosamente pelo interceptor
  // HTTP sempre que uma requisição retorna 401. O usuário não percebe.
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Retorna o role de maior prioridade do usuário.
 * Útil para seleção determinística do "role ativo" quando o usuário tem múltiplos roles.
 *
 * Exemplo: usuário com ['PROFESSOR', 'STAFF_CENTRAL'] → retorna 'STAFF_CENTRAL'
 */
export function getPrimaryRole(roles: string[]): string | null {
  if (!roles || roles.length === 0) return null;
  return roles.reduce((best, current) => {
    const bestPriority = ROLE_PRIORITY[best] ?? 0;
    const currentPriority = ROLE_PRIORITY[current] ?? 0;
    return currentPriority > bestPriority ? current : best;
  }, roles[0]);
}
