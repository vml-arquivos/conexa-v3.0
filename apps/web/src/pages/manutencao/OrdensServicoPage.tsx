import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BellRing, CheckCircle2, ClipboardCheck, Hammer, Inbox, Plus, RefreshCcw, Search, Wrench,
} from 'lucide-react';
import { PageShell } from '../../components/ui/PageShell';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { KpiCard, SkeletonGrid } from '../../components/ui/ds';
import { useAuth } from '../../app/AuthProvider';
import { normalizeRoles } from '../../app/RoleProtectedRoute';
import {
  getServiceOrderSummary, listServiceOrders,
  type ServiceOrder, type ServiceOrderSummary,
} from '../../api/service-orders';
import { OrderCard } from './OsBits';

type TabKey = 'novas' | 'minhas' | 'andamento' | 'avaliar' | 'encerradas';

interface TabDef { key: TabKey; label: string; status: string; assignedTo?: string; overdue?: boolean }

const TABS_MANUT: TabDef[] = [
  { key: 'novas', label: 'Novas', status: 'ABERTA' },
  { key: 'minhas', label: 'Minhas', status: 'ACEITA,EM_EXECUCAO', assignedTo: 'me' },
  { key: 'andamento', label: 'Em andamento', status: 'ACEITA,EM_EXECUCAO' },
  { key: 'avaliar', label: 'Aguardando avaliação', status: 'AGUARDANDO_AVALIACAO' },
  { key: 'encerradas', label: 'Encerradas', status: 'ENCERRADA,CANCELADA' },
];
const TABS_OTHER: TabDef[] = [
  { key: 'andamento', label: 'Em andamento', status: 'ABERTA,ACEITA,EM_EXECUCAO' },
  { key: 'avaliar', label: 'Para avaliar', status: 'AGUARDANDO_AVALIACAO' },
  { key: 'encerradas', label: 'Encerradas', status: 'ENCERRADA,CANCELADA' },
];

const REFRESH_MS = 60_000;

/**
 * Lista de ordens de serviço.
 *  - Manutenção (/app/manutencao): fila de trabalho, otimizada para celular/PWA.
 *  - Unidade, Professor, Mantenedora (/app/ordens-servico): acompanhamento.
 */
export default function OrdensServicoPage({ variant }: { variant: 'manutencao' | 'acompanhamento' }) {
  const { user } = useAuth();
  const levels = normalizeRoles(user);
  const isManutOnly = levels.includes('MANUTENCAO') && !levels.some((l) => l === 'DEVELOPER' || l === 'MANTENEDORA');
  const canCreate = !isManutOnly;
  const isManager = levels.some((l) => l === 'DEVELOPER' || l === 'MANTENEDORA' || l === 'MANUTENCAO');

  const tabs = variant === 'manutencao' ? TABS_MANUT : TABS_OTHER;
  const [tab, setTab] = useState<TabKey>(tabs[0].key);
  const [q, setQ] = useState('');
  const [unitId, setUnitId] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [items, setItems] = useState<ServiceOrder[]>([]);
  const [summary, setSummary] = useState<ServiceOrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const lastNovas = useRef<number | null>(null);

  const current = useMemo(() => tabs.find((t) => t.key === tab) ?? tabs[0], [tabs, tab]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [sum, list] = await Promise.all([
        getServiceOrderSummary(),
        listServiceOrders({
          status: current.status,
          assignedTo: current.assignedTo,
          unitId: unitId || undefined,
          overdue: onlyOverdue,
          q: q.trim() || undefined,
          limit: 100,
        }),
      ]);
      setSummary(sum);
      setItems(list.items);
      setError(null);
      // Aviso de "nova ordem recebida" para a manutenção (atualização automática)
      if (variant === 'manutencao') {
        const n = sum.unassigned;
        if (lastNovas.current !== null && n > lastNovas.current) setNewCount(n - lastNovas.current);
        lastNovas.current = n;
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Não foi possível carregar as ordens de serviço.');
    } finally {
      setLoading(false);
    }
  }, [current, unitId, onlyOverdue, q, variant]);

  // Carrega ao mudar filtros (com pequeno atraso na busca)
  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Atualização automática: a cada minuto e ao voltar para a aba/app
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') void load(true); };
    const id = setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [load]);

  const title = variant === 'manutencao' ? 'Fila de serviços' : 'Ordens de serviço';
  const subtitle = variant === 'manutencao'
    ? 'Ordens enviadas pelas unidades: aceite, execute e preste contas.'
    : isManager
      ? 'Acompanhe tudo o que foi pedido à manutenção, por unidade.'
      : 'Peça um reparo e acompanhe até o fim.';

  const counts = summary?.counts;

  return (
    <PageShell
      title={title}
      subtitle={subtitle}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} aria-label="Atualizar">
            <RefreshCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          {canCreate && (
            <Button asChild size="sm">
              <Link to="/app/ordens-servico/nova"><Plus className="h-4 w-4" /> Nova ordem</Link>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
      {newCount > 0 && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-ds-xl border border-[var(--border-brand)] bg-[var(--surface-brand)] px-4 py-3 text-sm text-[var(--text-brand)]">
          <span className="inline-flex items-center gap-2 font-semibold">
            <BellRing className="h-4 w-4" />
            {newCount === 1 ? 'Chegou 1 nova ordem de serviço' : `Chegaram ${newCount} novas ordens de serviço`}
          </span>
          <button className="text-xs font-semibold underline" onClick={() => { setNewCount(0); setTab('novas'); }}>
            Ver
          </button>
        </div>
      )}

      {/* Indicadores */}
      {loading && !summary ? (
        <SkeletonGrid n={4} cols={4} />
      ) : summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {variant === 'manutencao' ? (
            <>
              <KpiCard label="Novas" value={summary.unassigned} icon={<Inbox className="h-5 w-5" />} tone="info" helper="Aguardando aceite" onClick={() => setTab('novas')} />
              <KpiCard label="Minhas ativas" value={summary.mine} icon={<Hammer className="h-5 w-5" />} tone="purple" helper="Aceitas ou em execução" onClick={() => setTab('minhas')} />
              <KpiCard label="Atrasadas" value={summary.overdue} icon={<AlertTriangle className="h-5 w-5" />} tone={summary.overdue ? 'danger' : 'default'} helper="Prazo vencido" onClick={() => { setOnlyOverdue((v) => !v); setTab('andamento'); }} />
              <KpiCard label="Urgentes" value={summary.urgent} icon={<Wrench className="h-5 w-5" />} tone={summary.urgent ? 'warning' : 'default'} helper="Prioridade máxima" />
            </>
          ) : (
            <>
              <KpiCard label="Em aberto" value={summary.open} icon={<Wrench className="h-5 w-5" />} tone="purple" onClick={() => setTab('andamento')} />
              <KpiCard label="Para avaliar" value={summary.awaitingEvaluation} icon={<ClipboardCheck className="h-5 w-5" />} tone={summary.awaitingEvaluation ? 'warning' : 'default'} helper="Serviço pronto, falta sua avaliação" onClick={() => setTab('avaliar')} />
              <KpiCard label="Atrasadas" value={summary.overdue} icon={<AlertTriangle className="h-5 w-5" />} tone={summary.overdue ? 'danger' : 'default'} onClick={() => { setOnlyOverdue((v) => !v); setTab('andamento'); }} />
              <KpiCard
                label="Tempo médio"
                value={summary.avgResolutionHours != null ? `${summary.avgResolutionHours} h` : '—'}
                icon={<CheckCircle2 className="h-5 w-5" />}
                tone="success"
                helper={counts ? `${counts.ENCERRADA} encerradas` : undefined}
              />
            </>
          )}
        </div>
      )}

      {/* Visão por unidade (mantenedora / manutenção) */}
      {isManager && summary && summary.units.length > 0 && (
        <section aria-label="Por unidade" className="rounded-ds-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-ds-xs">
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">Por unidade</h2>
          <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
            {summary.units.map((u) => (
              <li key={u.unitId}>
                <button
                  type="button"
                  onClick={() => { setUnitId(unitId === u.unitId ? '' : u.unitId); setTab('andamento'); }}
                  className={`flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm ${unitId === u.unitId ? 'font-semibold text-[var(--text-brand)]' : 'text-[var(--text-primary)]'}`}
                >
                  <span className="truncate">{u.unitName}</span>
                  <span className="flex flex-shrink-0 items-center gap-3 text-xs text-[var(--text-secondary)]">
                    <span>{u.open} em aberto</span>
                    {u.overdue > 0 && <span className="font-semibold text-[var(--error)]">{u.overdue} atrasadas</span>}
                    <span className="text-[var(--text-tertiary)]">{u.total} total</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Abas + busca */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Situação" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
                tab === t.key
                  ? 'border-[var(--border-brand)] bg-[var(--surface-brand)] text-[var(--text-brand)]'
                  : 'border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título, local ou nº"
            aria-label="Buscar ordens"
            className="ds-input pl-9"
          />
        </div>
      </div>

      {(unitId || onlyOverdue) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
          Filtros:
          {unitId && <button className="ds-badge ds-badge-brand" onClick={() => setUnitId('')}>Unidade ✕</button>}
          {onlyOverdue && <button className="ds-badge ds-badge-red" onClick={() => setOnlyOverdue(false)}>Só atrasadas ✕</button>}
        </div>
      )}

      {/* Lista */}
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading ? (
        <SkeletonGrid n={3} cols={1} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhuma ordem por aqui"
          description={variant === 'manutencao' ? 'Quando uma unidade pedir um serviço, ele aparece nesta fila.' : 'Nenhuma ordem nesta situação.'}
          action={canCreate ? <Button asChild size="sm"><Link to="/app/ordens-servico/nova"><Plus className="h-4 w-4" /> Nova ordem</Link></Button> : undefined}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((o) => <OrderCard key={o.id} order={o} showUnit={isManager} />)}
        </div>
      )}
          </div>
    </PageShell>
  );
}
