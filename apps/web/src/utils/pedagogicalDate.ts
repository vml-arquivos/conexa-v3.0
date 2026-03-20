/**
 * Pedagogical Date Utilities
 *
 * Single source of truth for date calculations in the pedagogical context.
 * All dates are calculated in America/Sao_Paulo timezone to ensure consistency
 * with the school calendar and avoid timezone-related bugs.
 *
 * HOTFIX: implementação canônica via Intl.DateTimeFormat (zero libs, SSR-safe).
 * Usar SEMPRE esta função — nunca new Date().toISOString() diretamente.
 */

export const PEDAGOGICAL_TZ = 'America/Sao_Paulo';

/**
 * Retorna a data pedagógica atual no formato YYYY-MM-DD (fuso America/Sao_Paulo).
 *
 * @param tz - Fuso horário (padrão: America/Sao_Paulo)
 * @returns string YYYY-MM-DD
 *
 * @example
 * getPedagogicalToday(); // "2026-03-20"
 */
export function getPedagogicalToday(tz: string = PEDAGOGICAL_TZ): string {
  // en-CA produz YYYY-MM-DD nativamente via Intl — sem manipulação manual de string
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

/**
 * Normaliza uma data pedagógica: se vier inválida ou ausente, retorna hoje.
 * Evita que datas corrompidas causem drift para 2020/2021.
 *
 * @param input - String de data (YYYY-MM-DD) ou undefined
 * @returns string YYYY-MM-DD válida
 *
 * @example
 * normalizePedagogicalDate('2026-03-20');  // '2026-03-20'
 * normalizePedagogicalDate('lixo');        // hoje
 * normalizePedagogicalDate(undefined);     // hoje
 */
export function normalizePedagogicalDate(input?: string): string {
  if (!input) return getPedagogicalToday();
  // Aceita estritamente YYYY-MM-DD
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(input);
  return ok ? input : getPedagogicalToday();
}

/**
 * Formats a Date object to YYYY-MM-DD in America/Sao_Paulo timezone
 * 
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date in YYYY-MM-DD format
 * 
 * @example
 * const date = new Date('2026-02-06T10:30:00Z');
 * const formatted = formatPedagogicalDate(date);
 * // Returns: "2026-02-06" (in America/Sao_Paulo timezone)
 */
export function formatPedagogicalDate(date: Date): string {
  const saoPauloDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  
  const year = saoPauloDate.getFullYear();
  const month = String(saoPauloDate.getMonth() + 1).padStart(2, '0');
  const day = String(saoPauloDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a date string (YYYY-MM-DD) is today in pedagogical context
 * 
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if the date is today
 * 
 * @example
 * const isToday = isPedagogicalToday('2026-02-06');
 * // Returns: true (if today is 2026-02-06 in America/Sao_Paulo)
 */
export function isPedagogicalToday(dateString: string): boolean {
  return dateString === getPedagogicalToday();
}
