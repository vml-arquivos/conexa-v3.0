import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Building2, ClipboardCheck, GraduationCap, Network, ShoppingBag, Users, Wrench, BarChart2, Baby,
} from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';
import { KpiCard, SkeletonGrid } from '../components/ui/ds';
import { ErrorState } from '../components/ui/ErrorState';
import { MissionPanel } from '../components/insights/MissionCard';
import { useMissions } from '../components/agent/useMissions';
import { useAuth } from '../app/AuthProvider';
import { getNetworkIntelligenceOverview } from '../api/intelligence-core';
import { getServiceOrderSummary, type ServiceOrderSummary } from '../api/service-orders';
import { listarPedidosCompra, type PedidoCompra } from '../api/pedido-compra';

interface UnitRow {
  unitId: string;
  unitName: string;
  metrics?: {
    activeChildren?: number;
    openOperationalAlerts?: number;
    records?: { childrenWithRecord?: number };
  };
}
interface NetworkOverview {
  metrics?: {
    units?: number;
    activeChildren?: number;
    coverageRate?: number;
    openOperationalAlerts?: number;
    nutritionalRevaluationsDue?: number;
  };
  units?: UnitRow[];
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Painel da Administração (Mantenedora): visão executiva da rede.
 * Reúne dados que já existem (rede, compras, ordens de serviço, missões da IA)
 * e dá acesso direto às ferramentas administrativas. Não altera nada: só leitura.
 */
export default function PainelAdministracaoPage() {
  const { user } = useAuth();
  const [net, setNet] = useState<NetworkOverview | null>(null);
  const [os, setOs] = useState<ServiceOrderSummary | null>(null);
  const [pedidos, setPedidos] = useState<PedidoCompra[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [partial, setPartial] = useState<string[]>([]);
  const missions = useMissions(true, (user as { id?: string } | null)?.id ?? 'anon');

  const load = useCallback(async () => {
    setLoading(true);
    const end = new Date();
    const start = new Date(Date.now() - 30 * 864e5);
    const failed: string[] = [];
    // Cada fonte falha de forma independente: o painel mostra o que conseguir.
    const [n, o, p] = await Promise.allSettled([
      getNetworkIntelligenceOverview({ startDate: iso(start), endDate: iso(end) }),
      getServiceOrderSummary(),
      listarPedidosCompra(),
    ]);
    if (n.status === 'fulfilled') setNet(n.value as NetworkOverview); else failed.push('rede');
    if (o.status === 'fulfilled') setOs(o.value); else failed.push('manutenção');
    if (p.status === 'fulfilled') setPedidos(p.value); else failed.push('compras');
    setPartial(failed);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const m = net?.metrics;
  const pedidosPend = (pedidos ?? []).filter((x) => x.status === 'ENVIADO' || x.status === 'EM_ANALISE').length;
  const osByUnit = new Map((os?.units ?? []).map((u) => [u.unitId, u]));

  const shortcuts = [
    { to: '/app/admin/unidades', label: 'Unidades', icon: <Building2 className="h-5 w-5" /> },
    { to: '/app/admin/usuarios', label: 'Usuários e acessos', icon: <Users className="h-5 w-5" /> },
    { to: '/app/admin/turmas', label: 'Turmas', icon: <GraduationCap className="h-5 w-5" /> },
    { to: '/app/pedidos-compra', label: 'Pedidos de compra', icon: <ShoppingBag className="h-5 w-5" /> },
    { to: '/app/ordens-servico', label: 'Ordens de serviço', icon: <Wrench className="h-5 w-5" /> },
    { to: '/app/coordenacao-geral', label: 'Coordenação geral', icon: <Network className="h-5 w-5" /> },
    { to: '/app/reports', label: 'Relatórios', icon: <BarChart2 className="h-5 w-5" /> },
    { to: '/app/inteligencia', label: 'Inteligência', icon: <ClipboardCheck className="h-5 w-5" /> },
  ];

  return (
    <PageShell title="Painel da Administração" subtitle="Visão da rede: crianças, unidades, compras, manutenção e alertas da IA.">
      <div className="space-y-5">
      {partial.length > 0 && (
        <div role="status" className="ds-alert ds-alert-warning">
          Alguns dados não carregaram ({partial.join(', ')}). O restante do painel está atualizado.
          <button className="ml-2 font-semibold underline" onClick={() => void load()}>Tentar de novo</button>
        </div>
      )}

      {loading ? (
        <SkeletonGrid n={4} cols={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Unidades" value={num(m?.units)} icon={<Building2 className="h-5 w-5" />} tone="purple" />
          <KpiCard label="Crianças ativas" value={num(m?.activeChildren)} icon={<Baby className="h-5 w-5" />} tone="success" helper={m?.coverageRate != null ? `${num(m.coverageRate)}% com registro (30 dias)` : undefined} />
          <KpiCard label="Alertas abertos" value={num(m?.openOperationalAlerts)} icon={<AlertTriangle className="h-5 w-5" />} tone={num(m?.openOperationalAlerts) ? 'warning' : 'default'} helper={num(m?.nutritionalRevaluationsDue) ? `${num(m?.nutritionalRevaluationsDue)} reavaliações nutricionais` : undefined} />
          <KpiCard label="Compras para decidir" value={pedidos ? pedidosPend : '—'} icon={<ShoppingBag className="h-5 w-5" />} tone={pedidosPend ? 'warning' : 'default'} helper="Enviados ou em análise" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-ds-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-ds-xs sm:p-5" aria-label="Unidades">
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">Unidades</h2>
          {(net?.units?.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Sem dados de unidades no período.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--text-tertiary)]">
                    <th className="py-2 pr-3 font-medium">Unidade</th>
                    <th className="py-2 pr-3 font-medium">Crianças</th>
                    <th className="py-2 pr-3 font-medium">Registro</th>
                    <th className="py-2 pr-3 font-medium">Alertas</th>
                    <th className="py-2 font-medium">Manutenção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {net!.units!.map((u) => {
                    const ch = num(u.metrics?.activeChildren);
                    const rec = num(u.metrics?.records?.childrenWithRecord);
                    const pct = ch ? Math.round((rec / ch) * 100) : 0;
                    const o = osByUnit.get(u.unitId);
                    return (
                      <tr key={u.unitId}>
                        <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)]">{u.unitName}</td>
                        <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{ch}</td>
                        <td className={`py-2.5 pr-3 ${pct < 60 ? 'text-[var(--warning)] font-semibold' : 'text-[var(--text-secondary)]'}`}>{pct}%</td>
                        <td className={`py-2.5 pr-3 ${num(u.metrics?.openOperationalAlerts) ? 'text-[var(--warning)] font-semibold' : 'text-[var(--text-secondary)]'}`}>{num(u.metrics?.openOperationalAlerts)}</td>
                        <td className="py-2.5 text-[var(--text-secondary)]">
                          {o ? <>{o.open} abertas{o.overdue ? <span className="ml-1 font-semibold text-[var(--error)]">· {o.overdue} atrasadas</span> : null}</> : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-ds-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-ds-xs sm:p-5" aria-label="Manutenção">
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">Manutenção</h2>
          {os ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Ordens em aberto</dt><dd className="font-semibold">{os.open}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Aguardando aceite</dt><dd className="font-semibold">{os.unassigned}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Atrasadas</dt><dd className={`font-semibold ${os.overdue ? 'text-[var(--error)]' : ''}`}>{os.overdue}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Tempo médio</dt><dd className="font-semibold">{os.avgResolutionHours != null ? `${os.avgResolutionHours} h` : '—'}</dd></div>
            </dl>
          ) : <p className="mt-3 text-sm text-[var(--text-secondary)]">Sem dados.</p>}
          <Link to="/app/ordens-servico" className="mt-4 inline-block text-sm font-semibold text-[var(--text-brand)] hover:underline">Ver todas as ordens →</Link>
        </section>
      </div>

      <MissionPanel
        missions={missions.missions}
        loading={missions.loading}
        error={missions.error ?? undefined}
        title="O que a inteligência da rede pede atenção"
        maxItems={5}
      />

      <section aria-label="Atalhos">
        <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">Ferramentas da administração</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shortcuts.map((s) => (
            <Link key={s.to} to={s.to} className="flex items-center gap-3 rounded-ds-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3.5 text-sm font-semibold text-[var(--text-primary)] shadow-ds-xs transition hover:border-[var(--border-strong)] hover:shadow-ds-md">
              <span className="ds-icon-tile">{s.icon}</span>
              {s.label}
            </Link>
          ))}
        </div>
      </section>

      {!loading && !net && !os && !pedidos && <ErrorState message="Não foi possível carregar o painel." onRetry={() => void load()} />}
          </div>
    </PageShell>
  );
}
