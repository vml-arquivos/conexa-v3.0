/**
 * Utilitários de Data - Conexa
 * 
 * PADRONIZAÇÃO DE TIMEZONE:
 * - Todas as validações de "dia pedagógico" usam APP_TIMEZONE (America/Sao_Paulo)
 * - Logs podem estar em UTC, mas regras de negócio sempre usam o fuso pedagógico
 * - Comparações de data são feitas por "dia pedagógico" (YYYY-MM-DD) no fuso local
 */

/**
 * Extrai o "dia pedagógico" (YYYY-MM-DD) de uma data no fuso horário de São Paulo
 */
export function getPedagogicalDay(date: Date): string {
  const timezone = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Retorna "YYYY-MM-DD"
}

/**
 * Compara se duas datas correspondem ao mesmo "dia pedagógico"
 */
export function isSamePedagogicalDay(date1: Date, date2: Date): boolean {
  return getPedagogicalDay(date1) === getPedagogicalDay(date2);
}

/**
 * Formata uma data para exibição no formato brasileiro (DD/MM/YYYY)
 */
export function formatPedagogicalDate(date: Date): string {
  const timezone = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Verifica se uma data é um dia letivo.
 *
 * Regras (em ordem de prioridade):
 * 1. Sábado (6) e Domingo (0) são sempre não letivos.
 * 2. Se a data estiver na lista de nonSchoolDays da unidade, é não letivo.
 *
 * @param date - Data a verificar (objeto Date)
 * @param nonSchoolDays - Lista de datas não letivas configuradas pela unidade (strings YYYY-MM-DD)
 * @returns true se for dia letivo, false caso contrário
 *
 * @example
 * isSchoolDay(new Date('2026-03-07'), []); // false (sábado)
 * isSchoolDay(new Date('2026-03-09'), []); // true (segunda)
 * isSchoolDay(new Date('2026-04-21'), ['2026-04-21']); // false (Tiradentes)
 */
export function isSchoolDay(date: Date, nonSchoolDays: string[] = []): boolean {
  const timezone = process.env.APP_TIMEZONE || 'America/Sao_Paulo';

  // Extrair o dia da semana no fuso pedagógico
  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });
  const weekday = weekdayFormatter.format(date); // "Sat", "Sun", etc.
  if (weekday === 'Sat' || weekday === 'Sun') {
    return false;
  }

  // Verificar se está na lista de datas não letivas configuradas
  const dayStr = getPedagogicalDay(date); // "YYYY-MM-DD"
  if (nonSchoolDays.includes(dayStr)) {
    return false;
  }

  return true;
}

/**
 * Lança BadRequestException se a data não for um dia letivo.
 * Centraliza a mensagem de erro para consistência entre services.
 *
 * @param date - Data a verificar
 * @param nonSchoolDays - Lista de datas não letivas da unidade
 * @param BadRequestException - Classe de exceção do NestJS (injetada para evitar acoplamento)
 */
export function assertSchoolDay(
  date: Date,
  nonSchoolDays: string[],
  BadRequestExceptionClass: new (msg: string) => Error,
): void {
  if (!isSchoolDay(date, nonSchoolDays)) {
    const dayStr = formatPedagogicalDate(date);
    const timezone = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
    const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      weekday: 'long',
    });
    const weekday = weekdayFormatter.format(date);
    throw new BadRequestExceptionClass(
      `${dayStr} (${weekday}) não é um dia letivo. Operações pedagógicas não são permitidas em fins de semana ou datas não letivas configuradas.`,
    );
  }
}
