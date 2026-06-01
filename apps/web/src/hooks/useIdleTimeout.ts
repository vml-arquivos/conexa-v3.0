/**
 * useIdleTimeout.ts — DESATIVADO
 *
 * Sessão permanente: o sistema NÃO desconecta o usuário por inatividade.
 * O usuário só é desconectado ao clicar explicitamente em "Sair"
 * ou quando o refresh token expirar (configurado via JWT_REFRESH_EXPIRES_IN).
 *
 * Este hook foi mantido apenas para compatibilidade de importações legadas.
 * Ele não faz nada.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useIdleTimeout(_onIdle: () => void, _timeout?: number): void {
  // Intencionalmente vazio — sem timeout por inatividade.
}
