/**
 * Formata datas sempre no timezone pedagógico America/Sao_Paulo.
 * Garante que professor e coordenador vejam a mesma data
 * independente do timezone do dispositivo.
 */
export function formatPedagogicalDate(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...opts,
  }).format(d);
}

export function toPedagogicalISODate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date); // retorna YYYY-MM-DD no fuso correto
}

export function startOfPedagogicalMonth(year: number, month: number): string {
  return toPedagogicalISODate(new Date(year, month, 1));
}

export function endOfPedagogicalMonth(year: number, month: number): string {
  return toPedagogicalISODate(new Date(year, month + 1, 0));
}
