/**
 * tokenStorage — Armazenamento central de tokens de autenticação.
 *
 * REGRA DE SESSÃO:
 * - Usa sessionStorage em vez de localStorage.
 * - sessionStorage é apagado automaticamente pelo navegador quando a aba/janela
 *   é fechada ou o computador é desligado.
 *
 * COMPORTAMENTO RESULTANTE:
 *   ✓ Enquanto a aba estiver aberta, a sessão NUNCA expira por inatividade
 *     (mesmo após 2 dias com o computador ligado).
 *   ✓ Ao FECHAR o navegador / desligar o PC, o token some → próximo acesso
 *     exige login novamente.
 *   ✗ Sem timer de inatividade. Sem logout automático por tempo parado.
 *
 * IMPORTANTE: todo o código de autenticação deve usar este módulo,
 * nunca localStorage/sessionStorage diretamente, para manter consistência.
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

/** Lê o access token da sessão atual. */
export function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Lê o refresh token da sessão atual. */
export function getRefreshToken(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Grava o access token na sessão atual. */
export function setAccessToken(token: string): void {
  try {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    /* ignore quota/availability errors */
  }
}

/** Grava o refresh token na sessão atual. */
export function setRefreshToken(token: string): void {
  try {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

/**
 * Limpa toda a sessão (logout).
 * Remove tokens de sessionStorage E de localStorage (migração: usuários que
 * ainda tinham tokens antigos no localStorage são limpos aqui também),
 * além do cookie de acesso.
 */
export function clearSession(): void {
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  try {
    // Migração: garantir que tokens antigos persistidos em localStorage sejam removidos.
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = 'access_token=; Max-Age=0; path=/';
  } catch {
    /* ignore */
  }
}

/**
 * Migração automática de localStorage → sessionStorage.
 *
 * Usuários que já estavam logados antes desta atualização têm o token em
 * localStorage. No primeiro carregamento após o deploy, movemos esse token
 * para sessionStorage (uma vez) para que a sessão continue válida sem exigir
 * novo login imediato, mas a partir daí passe a obedecer a regra de fechar o
 * navegador. Após mover, o localStorage é limpo.
 */
export function migrateLegacyLocalStorageTokens(): void {
  try {
    const legacyAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
    const legacyRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (legacyAccess && !sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, legacyAccess);
      if (legacyRefresh) {
        sessionStorage.setItem(REFRESH_TOKEN_KEY, legacyRefresh);
      }
    }
    // Sempre limpar o localStorage para não voltar a persistir entre fechamentos.
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
