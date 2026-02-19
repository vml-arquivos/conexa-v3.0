/**
 * Pedagogical Date Utilities
 * 
 * Provides a single source of truth for date calculations in the pedagogical context.
 * All dates are calculated in America/Sao_Paulo timezone to ensure consistency
 * with the school calendar and avoid timezone-related bugs.
 */

/**
 * Returns the current pedagogical date in YYYY-MM-DD format (America/Sao_Paulo timezone)
 * 
 * This is the ONLY function that should be used to determine "today" in pedagogical contexts.
 * 
 * @returns {string} Current date in YYYY-MM-DD format (e.g., "2026-02-06")
 * 
 * @example
 * const today = getPedagogicalToday();
 * // Returns: "2026-02-06" (in America/Sao_Paulo timezone)
 */
export function getPedagogicalToday(): string {
  // Create date in America/Sao_Paulo timezone
  const now = new Date();
  const saoPauloDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  
  // Extract year, month, day
  const year = saoPauloDate.getFullYear();
  const month = String(saoPauloDate.getMonth() + 1).padStart(2, '0');
  const day = String(saoPauloDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
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
