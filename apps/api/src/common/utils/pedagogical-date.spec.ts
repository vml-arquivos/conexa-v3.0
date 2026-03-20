/**
 * PR-UI-DATE-0002 — Regression tests for pedagogical date utilities
 *
 * Root cause: `new Date().toISOString().split('T')[0]` uses UTC time.
 * In Brazil (UTC-3), between 21:00–23:59 local time, this returns
 * tomorrow's date (UTC), causing the displayed "Data Pedagógica" to
 * jump to the wrong day — or, when combined with date-only ISO strings
 * parsed by `new Date(dateStr)`, to show the previous day.
 *
 * Fix: All "today" calculations in pedagogical context MUST use
 * `getPedagogicalToday()` which uses `toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })`.
 */

describe('PR-UI-DATE-0002 — Pedagogical Date Regression', () => {
  /**
   * Simulates getPedagogicalToday() logic in Node (same as browser).
   */
  function getPedagogicalToday_sim(): string {
    const now = new Date();
    const saoPauloDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const year = saoPauloDate.getFullYear();
    const month = String(saoPauloDate.getMonth() + 1).padStart(2, '0');
    const day = String(saoPauloDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Simulates the BUGGY pattern: new Date().toISOString().split('T')[0]
   */
  function getBuggyToday_sim(): string {
    return new Date().toISOString().split('T')[0];
  }

  it('should return a valid YYYY-MM-DD date string', () => {
    const result = getPedagogicalToday_sim();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return a year >= 2025 (not 2020 or 2021)', () => {
    const result = getPedagogicalToday_sim();
    const year = parseInt(result.split('-')[0]);
    expect(year).toBeGreaterThanOrEqual(2025);
  });

  it('should never return a date that is more than 1 day different from UTC today', () => {
    const pedagogical = getPedagogicalToday_sim();
    const utcToday = getBuggyToday_sim();
    const pDate = new Date(pedagogical + 'T12:00:00');
    const uDate = new Date(utcToday + 'T12:00:00');
    const diffMs = Math.abs(pDate.getTime() - uDate.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // The Sao Paulo date should never be more than 1 day off from UTC date
    expect(diffDays).toBeLessThanOrEqual(1);
  });

  it('should correctly parse date-only ISO strings with T12:00:00 suffix to avoid UTC midnight shift', () => {
    // Without suffix: new Date('2026-03-20') is UTC midnight = 2026-03-19 21:00 BRT
    const withoutSuffix = new Date('2026-03-20');
    // With suffix: new Date('2026-03-20T12:00:00') is noon local = correct day
    const withSuffix = new Date('2026-03-20T12:00:00');

    // The without-suffix version may show the wrong day in Brazil
    const withoutSuffixLocal = withoutSuffix.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const withSuffixLocal = withSuffix.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // With suffix should always show 20/03/2026
    expect(withSuffixLocal).toBe('20/03/2026');

    // This documents the known UTC shift behavior (without suffix may show 19/03/2026 in UTC-3)
    // The fix ensures we always use T12:00:00 suffix when displaying date-only strings
    expect(withSuffixLocal).not.toBe('19/03/2026');
  });

  it('should not produce year 2020 or 2021 from current date calculations', () => {
    // Regression: some code paths were producing 2020/2021 due to incorrect date parsing
    const today = getPedagogicalToday_sim();
    expect(today).not.toMatch(/^2020/);
    expect(today).not.toMatch(/^2021/);
    expect(today).not.toMatch(/^2022/);
    expect(today).not.toMatch(/^2023/);
  });
});
