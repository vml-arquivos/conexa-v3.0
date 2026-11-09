import type {
  ServiceOrderCategory, ServiceOrderPriority, ServiceOrderResult, ServiceOrderStatus,
} from '../../api/service-orders';

export const STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  ABERTA: 'Nova',
  ACEITA: 'Aceita',
  EM_EXECUCAO: 'Em execução',
  AGUARDANDO_AVALIACAO: 'Aguardando avaliação',
  ENCERRADA: 'Encerrada',
  CANCELADA: 'Cancelada',
};

/** Classes só com tokens → funcionam nos dois temas. */
export const STATUS_STYLE: Record<ServiceOrderStatus, string> = {
  ABERTA: 'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info-border)]',
  ACEITA: 'bg-[var(--surface-brand)] text-[var(--text-brand)] border-[var(--border-brand)]',
  EM_EXECUCAO: 'bg-[var(--surface-brand)] text-[var(--text-brand)] border-[var(--border-brand)]',
  AGUARDANDO_AVALIACAO: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]',
  ENCERRADA: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]',
  CANCELADA: 'bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border-[var(--border-default)]',
};

export const PRIORITY_LABEL: Record<ServiceOrderPriority, string> = {
  BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente',
};
export const PRIORITY_STYLE: Record<ServiceOrderPriority, string> = {
  BAIXA: 'text-[var(--text-tertiary)]',
  MEDIA: 'text-[var(--text-secondary)]',
  ALTA: 'text-[var(--warning)]',
  URGENTE: 'text-[var(--error)]',
};

export const CATEGORY_LABEL: Record<ServiceOrderCategory, string> = {
  ELETRICA: 'Elétrica',
  HIDRAULICA: 'Hidráulica',
  ALVENARIA_PINTURA: 'Alvenaria / Pintura',
  MOBILIARIO: 'Mobiliário',
  PORTAS_JANELAS: 'Portas e janelas',
  AREA_EXTERNA: 'Área externa / Jardim',
  EQUIPAMENTOS: 'Equipamentos',
  TI_REDES: 'TI / Internet',
  LIMPEZA_DEDETIZACAO: 'Limpeza / Dedetização',
  SEGURANCA: 'Segurança',
  OUTRO: 'Outro',
};

export const RESULT_LABEL: Record<ServiceOrderResult, string> = {
  EXECUTADO: 'Executado',
  PARCIAL: 'Parcialmente executado',
  NAO_EXECUTADO: 'Não executado',
};

export const EVENT_LABEL: Record<string, string> = {
  CRIADA: 'Ordem aberta',
  ACEITA: 'Aceita pela manutenção',
  INICIADA: 'Execução iniciada',
  CONCLUIDA: 'Executada — aguardando avaliação',
  AVALIADA: 'Avaliada e encerrada',
  REABERTA: 'Devolvida para refazer',
  CANCELADA: 'Cancelada',
  COMENTARIO: 'Comentário',
  ATUALIZADA: 'Atualizada',
};

export function fmtDate(iso?: string | null, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
