import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { login as apiLogin, loadMe } from '../api/auth';
import type { User } from '../api/auth';

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
 * Verifica se o JWT armazenado tem o formato antigo (roles como strings simples
 * em vez de objetos com .level). Tokens antigos (pré-fix 43129d6) tinham
 * scopeLevel em vez de role.level, resultando em roles inválidos.
 *
 * Estratégia: decodificar o payload do JWT sem verificar assinatura e checar
 * se roles[0] é string ou objeto com .level.
 */
function hasLegacyToken(): boolean {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const roles = payload?.roles;
    if (!Array.isArray(roles) || roles.length === 0) return false;
    // Token novo: roles[0] é objeto com .level
    // Token antigo: roles[0] é string OU objeto sem .level
    if (typeof roles[0] === 'string') return true;
    if (typeof roles[0] === 'object' && roles[0] !== null && !roles[0].level) return true;
    return false;
  } catch {
    return false;
  }
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setLoading(false);
      return;
    }

    loadMe()
      .then((response) => {
        setUser(response.user);
      })
      .catch(() => {
        // Token inválido ou expirado, limpar
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
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

    // Carregar dados do usuário via /auth/me (retorna roles no formato rico)
    const response = await loadMe();
    setUser(response.user);
  };

  const logout = () => {
    // Limpar todos os tokens e estado de sessão
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.clear();
    // Limpar cookie de sessão se existir (Missão 01 — cookie-parser)
    document.cookie = 'access_token=; Max-Age=0; path=/';
    setUser(null);
    window.location.replace('/login');
  };

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
