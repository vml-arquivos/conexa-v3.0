import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, ChevronRight, MapPin, UserRound } from 'lucide-react';
import type { ServiceOrder, ServiceOrderStatus } from '../../api/service-orders';
import { CATEGORY_LABEL, PRIORITY_LABEL, PRIORITY_STYLE, STATUS_LABEL, STATUS_STYLE, fmtDate } from './osMeta';

export function StatusPill({ status }: { status: ServiceOrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Cartão de ordem: grande e tocável (uso no celular/PWA). */
export function OrderCard({ order, showUnit = true }: { order: ServiceOrder; showUnit?: boolean }) {
  return (
    <Link
      to={`/app/ordens-servico/${order.id}`}
      className="group block rounded-ds-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-ds-xs transition hover:border-[var(--border-strong)] hover:shadow-ds-md focus-visible:outline-none focus-visible:shadow-ds-focus"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text-tertiary)]">
            OS #{order.number}
            <span className="mx-1.5">•</span>
            {CATEGORY_LABEL[order.category]}
          </p>
          <h3 className="mt-0.5 font-display text-[15px] font-semibold leading-snug text-[var(--text-primary)] line-clamp-2">
            {order.title}
          </h3>
        </div>
        <StatusPill status={order.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[var(--text-secondary)]">
        {showUnit && order.unit && (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-tertiary)]" />
            <span className="truncate">{order.unit.name} — {order.location}</span>
          </span>
        )}
        {!showUnit && (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-tertiary)]" />
            <span className="truncate">{order.location}</span>
          </span>
        )}
        <span className={`inline-flex items-center gap-1.5 font-semibold ${PRIORITY_STYLE[order.priority]}`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          {PRIORITY_LABEL[order.priority]}
        </span>
        {order.dueDate && (
          <span className={`inline-flex items-center gap-1.5 ${order.isOverdue ? 'font-semibold text-[var(--error)]' : ''}`}>
            <CalendarClock className="h-3.5 w-3.5" />
            {order.isOverdue ? 'Atrasada · ' : 'Prazo '}{fmtDate(order.dueDate)}
          </span>
        )}
        {order.assignedToName && (
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            {order.assignedToName}
          </span>
        )}
      </div>
      <span className="mt-2 hidden items-center gap-1 text-xs font-medium text-[var(--text-brand)] group-hover:inline-flex">
        Abrir <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
