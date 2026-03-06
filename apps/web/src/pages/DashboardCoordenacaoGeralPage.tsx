/**
 * DashboardCoordenacaoGeralPage — Hiper Dashboard Inteligente
 * Perfil: STAFF_CENTRAL / MANTENEDORA / DEVELOPER
 *
 * Dados reais via endpoints:
 *  - GET /coordenacao/dashboard/geral
 *  - GET /insights/governance/funnel
 *  - GET /insights/governance/coverage
 *  - GET /coordenacao/requisicoes
 *  - GET /coordenacao/reunioes
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { useApiCache } from '../hooks/useApiCache';
import { useUnitScope } from '../contexts/UnitScopeContext';
import { toast } from 'sonner';
import http from '../api/http';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import {
  Users, BookOpen, ClipboardList, ShoppingCart, CheckCircle, AlertCircle,
  TrendingUp, Calendar, Network, RefreshCw, ChevronRight,
  Building2, GraduationCap, Bell, Star, Activity, BarChart2, Brain,
  FileText, Clock, ArrowRight, Zap, Target, Shield, Eye, Layers, Sparkles,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface UnidadeConsolidado {
  id: string;
  nome: string;
  totalAlunos: number;
  totalProfessores: number;
  totalTurmas: number;
  coberturaChamada: number;
  taxaPresenca?: number;
  requisicoesPendentes: number;
  planejamentosRascunho: number;
  diariosHoje: number;
  status?: 'otimo' | 'atencao' | 'critico';
}

interface DashboardGeralAPI {
  mantenedoraId: string;
  data: string;
  indicadoresGerais: {
    totalUnidades: number;
    totalAlunos: number;
    totalProfessores: number;
    requisicoesPendentes: number;
    planejamentosRascunho: number;
    diariosHoje: number;
    reunioesAgendadas: number;
  };
  consolidadoUnidades: UnidadeConsolidado[];
  ultimasReunioes: Array<{ id: string; titulo: string; dataRealizacao: string; status: string }>;
  proximasReunioes: Array<{ id: string; titulo: string; dataRealizacao: string; localOuLink?: string }>;
}

interface GovernanceFunnel {
  funnel: { created: number; submitted: number; approved: number; executed: number };
}

interface Requisicao {
  id: string;
  status: string;
  createdAt: string;
  category?: string;
  classroom?: { name: string; unit?: { name: string } };
  createdByUser?: { firstName: string; lastName: string };
}

// ─── Helpers visuais ─────────────────────────────────────────────────────────
function calcStatus(u: UnidadeConsolidado): 'otimo' | 'atencao' | 'critico' {
  const presenca = u.coberturaChamada ?? u.taxaPresenca ?? 0;
  if (presenca >= 85 && u.requisicoesPendentes === 0) return 'otimo';
  if (presenca < 50 || u.requisicoesPendentes >= 3) return 'critico';
  return 'atencao';
}

const STATUS_CFG = {
  otimo:   { label: 'Ótimo',   bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  bar: 'bg-green-500' },
  atencao: { label: 'Atenção', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', bar: 'bg-yellow-400' },
  critico: { label: 'Crítico', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    bar: 'bg-red-500' },
};

function fmt(n?: number | null): string {
  if (n == null) return '—';
  return n.toLocaleString('pt-BR');
}

function relDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  if (diff > 0) return `Em ${diff}d`;
  return `Há ${Math.abs(diff)}d`;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function KpiCard({
  icon, label, value, helper, tone = 'default', onClick,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  helper?: string; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    default: 'bg-white border-gray-200 text-gray-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    danger:  'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <div
      onClick={onClick}
      className={`border rounded-2xl p-4 flex flex-col gap-2 shadow-sm transition-all ${tones[tone]} ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="opacity-60">{icon}</span>
        {onClick && <ChevronRight className="h-4 w-4 opacity-30" />}
      </div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs font-medium opacity-70">{label}</p>
      {helper && <p className="text-xs opacity-50">{helper}</p>}
    </div>
  );
}

function SectionCard({ title, icon, children, action }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {icon}{title}
        </div>
        {action && (
          <button onClick={action.onClick} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
            {action.label} <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SkeletonGrid({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-2xl p-4 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="h-8 bg-gray-300 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DashboardCoordenacaoGeralPage() {
  const navigate = useNavigate();
  const { accessibleUnits: unidadesCtx } = useUnitScope();
  const apiCache = useApiCache(120_000);

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardGeralAPI | null>(null);
  const [funil, setFunil] = useState<GovernanceFunnel | null>(null);
  const [coverageFields, setCoverageFields] = useState<Array<{ field: string; pct: number }>>([]);
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'visao' | 'unidades' | 'pedagogico' | 'requisicoes' | 'reunioes'>('visao');
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'otimo' | 'atencao' | 'critico'>('todas');
  const [refreshKey, setRefreshKey] = useState(0);

  const hoje = new Date().toISOString().split('T')[0];
  const ha30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, funilRes, covRes, reqRes] = await Promise.allSettled([
        apiCache.get('/coordenacao/dashboard/geral', {}, () =>
          http.get('/coordenacao/dashboard/geral').then(r => r.data)),
        apiCache.get('/insights/governance/funnel', { startDate: ha30, endDate: hoje }, () =>
          http.get('/insights/governance/funnel', { params: { startDate: ha30, endDate: hoje } }).then(r => r.data)),
        apiCache.get('/insights/governance/coverage', { startDate: ha30, endDate: hoje }, () =>
          http.get('/insights/governance/coverage', { params: { startDate: ha30, endDate: hoje } }).then(r => r.data)),
        apiCache.get('/coordenacao/requisicoes', { status: 'SOLICITADO' }, () =>
          http.get('/coordenacao/requisicoes', { params: { status: 'SOLICITADO' } }).then(r => r.data)),
      ]);
      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value as DashboardGeralAPI);
      if (funilRes.status === 'fulfilled') setFunil(funilRes.value as GovernanceFunnel);
      if (covRes.status === 'fulfilled') {
        const raw = covRes.value as any;
        setCoverageFields(raw?.fields ?? raw?.coverage ?? []);
      }
      if (reqRes.status === 'fulfilled') {
        const raw = reqRes.value as any;
        setRequisicoes(Array.isArray(raw) ? raw : (raw?.requisicoes ?? raw?.data ?? []));
      }
    } catch {
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, [refreshKey]); // eslint-disable-line

  useEffect(() => { carregar(); }, [carregar]);

  // ─── Dados derivados ─────────────────────────────────────────────────────
  const ind = dashboard?.indicadoresGerais;
  const unidades = (dashboard?.consolidadoUnidades ?? []).map(u => ({
    ...u,
    _status: u.status ?? calcStatus(u),
    _presenca: u.coberturaChamada ?? u.taxaPresenca ?? 0,
  }));

  const alertasCriticos = unidades.filter(u => u._status === 'critico').length;
  const alertasAtencao  = unidades.filter(u => u._status === 'atencao').length;
  const reqPendentes    = requisicoes.filter(r => r.status === 'SOLICITADO' || r.status === 'PENDENTE').length;

  const unidadesFiltradas = filtroStatus === 'todas'
    ? unidades
    : unidades.filter(u => u._status === filtroStatus);

  // Gráfico de barras — presença por unidade
  const dadosPresenca = unidades.slice(0, 8).map(u => ({
    nome: u.nome.split(' ').slice(-1)[0],
    presenca: Math.round(u._presenca),
    alunos: u.totalAlunos,
  }));

  // Pizza — status das unidades
  const dadosPizza = [
    { name: 'Ótimo',   value: unidades.filter(u => u._status === 'otimo').length,   fill: '#10b981' },
    { name: 'Atenção', value: unidades.filter(u => u._status === 'atencao').length, fill: '#f59e0b' },
    { name: 'Crítico', value: unidades.filter(u => u._status === 'critico').length, fill: '#ef4444' },
  ].filter(d => d.value > 0);

  // Funil pedagógico
  const funilDados = funil ? [
    { etapa: 'Criados',    valor: funil.funnel.created,   cor: '#3b82f6' },
    { etapa: 'Enviados',   valor: funil.funnel.submitted, cor: '#8b5cf6' },
    { etapa: 'Aprovados',  valor: funil.funnel.approved,  cor: '#10b981' },
    { etapa: 'Executados', valor: funil.funnel.executed,  cor: '#f59e0b' },
  ] : [];

  // Radar BNCC
  const radarDados = coverageFields.slice(0, 6).map((f: any) => ({
    campo: (f.field ?? f.campoDeExperiencia ?? '').replace(/_/g, ' ').split(' ').slice(0, 2).join(' '),
    cobertura: Math.round(f.pct ?? f.percentual ?? 0),
  }));

  // ─── Abas ────────────────────────────────────────────────────────────────
  const ABAS = [
    { id: 'visao',       label: 'Visão Geral',   icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { id: 'unidades',    label: 'Unidades',       icon: <Building2 className="h-3.5 w-3.5" /> },
    { id: 'pedagogico',  label: 'Pedagógico',     icon: <Brain className="h-3.5 w-3.5" /> },
    { id: 'requisicoes', label: `Requisições${reqPendentes > 0 ? ` (${reqPendentes})` : ''}`, icon: <ShoppingCart className="h-3.5 w-3.5" /> },
    { id: 'reunioes',    label: 'Reuniões',        icon: <Calendar className="h-3.5 w-3.5" /> },
  ] as const;

  return (
    <PageShell
      title="Coordenação Geral"
      subtitle="Centro de inteligência da rede — dados em tempo real"
    >
      {/* ── Faixa de alertas ──────────────────────────────────────────── */}
      {!loading && (alertasCriticos > 0 || alertasAtencao > 0 || reqPendentes > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <Zap className="h-4 w-4 text-orange-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-orange-700">Alertas ativos:</span>
          {alertasCriticos > 0 && (
            <span className="inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800 border-red-300">
              <Bell className="h-3 w-3" />{alertasCriticos} unidade(s) crítica(s)
            </span>
          )}
          {alertasAtencao > 0 && (
            <span className="inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 border-yellow-300">
              <Bell className="h-3 w-3" />{alertasAtencao} em atenção
            </span>
          )}
          {reqPendentes > 0 && (
            <span className="inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 border-blue-300">
              <Bell className="h-3 w-3" />{reqPendentes} requisição(ões) pendente(s)
            </span>
          )}
          <button onClick={() => setAbaAtiva('unidades')} className="ml-auto text-xs text-orange-600 underline">
            Ver detalhes
          </button>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {ABAS.map(a => (
          <button
            key={a.id}
            onClick={() => setAbaAtiva(a.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              abaAtiva === a.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {a.icon}{a.label}
          </button>
        ))}
        <button onClick={() => setRefreshKey(k => k + 1)} className="ml-auto p-2 text-gray-400 hover:text-gray-600 rounded-lg" title="Atualizar">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ABA: VISÃO GERAL
      ══════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'visao' && (
        <div className="space-y-5">
          {loading ? <SkeletonGrid n={8} /> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard icon={<Building2 className="h-5 w-5" />} label="Unidades ativas"
                value={fmt(ind?.totalUnidades)} tone="info" onClick={() => setAbaAtiva('unidades')} />
              <KpiCard icon={<GraduationCap className="h-5 w-5" />} label="Total de alunos"
                value={fmt(ind?.totalAlunos)} tone="default" />
              <KpiCard icon={<Users className="h-5 w-5" />} label="Professores"
                value={fmt(ind?.totalProfessores)} tone="default" />
              <KpiCard icon={<Activity className="h-5 w-5" />} label="Diários hoje"
                value={fmt(ind?.diariosHoje)}
                tone={!ind?.diariosHoje ? 'warning' : 'success'}
                helper="Registros do dia" />
              <KpiCard icon={<ShoppingCart className="h-5 w-5" />} label="Req. pendentes"
                value={fmt(ind?.requisicoesPendentes)}
                tone={(ind?.requisicoesPendentes ?? 0) > 0 ? 'warning' : 'success'}
                onClick={() => setAbaAtiva('requisicoes')} />
              <KpiCard icon={<FileText className="h-5 w-5" />} label="Plan. em rascunho"
                value={fmt(ind?.planejamentosRascunho)}
                tone={(ind?.planejamentosRascunho ?? 0) > 5 ? 'warning' : 'default'}
                onClick={() => setAbaAtiva('pedagogico')} />
              <KpiCard icon={<Calendar className="h-5 w-5" />} label="Reuniões agendadas"
                value={fmt(ind?.reunioesAgendadas)} tone="info"
                onClick={() => setAbaAtiva('reunioes')} />
              <KpiCard icon={<Shield className="h-5 w-5" />} label="Unidades críticas"
                value={alertasCriticos}
                tone={alertasCriticos > 0 ? 'danger' : 'success'}
                helper={alertasCriticos === 0 ? 'Tudo OK' : 'Requerem atenção'}
                onClick={() => setAbaAtiva('unidades')} />
            </div>
          )}

          {/* Gráficos */}
          {!loading && unidades.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard title="Presença por Unidade" icon={<TrendingUp className="h-4 w-4 text-blue-500" />}>
                {dadosPresenca.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dadosPresenca} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip formatter={(v: number) => [`${v}%`, 'Presença']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="presenca" radius={[4, 4, 0, 0]}>
                        {dadosPresenca.map((e, i) => (
                          <Cell key={i} fill={e.presenca >= 85 ? '#10b981' : e.presenca >= 70 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-xs text-gray-400 text-center py-8">Sem dados de presença</p>}
              </SectionCard>

              <SectionCard title="Status das Unidades" icon={<Target className="h-4 w-4 text-purple-500" />}>
                {dadosPizza.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {dadosPizza.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 flex-1">
                      {dadosPizza.map((d, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: d.fill }} />
                            <span className="text-sm text-gray-700">{d.name}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-800">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <p className="text-xs text-gray-400 text-center py-8">Sem dados</p>}
              </SectionCard>
            </div>
          )}

          {/* Acesso rápido — Desenvolvimento Infantil */}
          {!loading && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-purple-800">Desenvolvimento Infantil</p>
                  <p className="text-xs text-purple-600">Acompanhe as observações de desenvolvimento por unidade, turma e criança</p>
                </div>
              </div>
              <button onClick={() => navigate('/app/desenvolvimento-infantil')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-all flex-shrink-0">
                Acessar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
          {/* Próximas reuniões */}
          {!loading && (dashboard?.proximasReunioes?.length ?? 0) > 0 && (
            <SectionCard title="Próximas Reuniões" icon={<Calendar className="h-4 w-4 text-indigo-500" />}
              action={{ label: 'Ver todas', onClick: () => setAbaAtiva('reunioes') }}>
              <div className="space-y-2">
                {dashboard!.proximasReunioes.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.titulo}</p>
                      {r.localOuLink && <p className="text-xs text-gray-400">{r.localOuLink}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{relDate(r.dataRealizacao)}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(r.dataRealizacao).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ABA: UNIDADES
      ══════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'unidades' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['todas', 'otimo', 'atencao', 'critico'] as const).map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filtroStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}>
                {s === 'todas' ? 'Todas' : STATUS_CFG[s].label}
                {s !== 'todas' && <span className="ml-1.5 opacity-70">({unidades.filter(u => u._status === s).length})</span>}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">{[0,1,2,3].map(i => <div key={i} className="h-28 animate-pulse bg-gray-100 rounded-2xl" />)}</div>
          ) : unidadesFiltradas.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma unidade encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...unidadesFiltradas].sort((a, b) => {
                const order = { critico: 0, atencao: 1, otimo: 2 };
                return order[a._status] - order[b._status];
              }).map(u => {
                const cfg = STATUS_CFG[u._status];
                return (
                  <div key={u.id} className={`border rounded-2xl p-4 ${cfg.bg} ${cfg.border}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} flex-shrink-0 mt-0.5`} />
                        <div>
                          <p className={`text-sm font-semibold ${cfg.text}`}>{u.nome}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${cfg.text}`}>{Math.round(u._presenca)}%</p>
                        <p className="text-xs text-gray-500">presença</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                      <div className={`h-1.5 rounded-full ${cfg.bar}`} style={{ width: `${Math.min(u._presenca, 100)}%` }} />
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                      {[
                        { label: 'Alunos',         val: u.totalAlunos,           alert: false },
                        { label: 'Professores',    val: u.totalProfessores,      alert: false },
                        { label: 'Turmas',         val: u.totalTurmas,           alert: false },
                        { label: 'Diários hoje',   val: u.diariosHoje,           alert: u.diariosHoje === 0 },
                        { label: 'Req. abertas',   val: u.requisicoesPendentes,  alert: u.requisicoesPendentes > 0 },
                        { label: 'Plan. rascunho', val: u.planejamentosRascunho, alert: u.planejamentosRascunho > 3 },
                      ].map((m, i) => (
                        <div key={i} className={`bg-white bg-opacity-60 rounded-lg p-2 ${m.alert ? 'ring-1 ring-orange-300' : ''}`}>
                          <p className={`text-base font-bold ${m.alert ? 'text-orange-600' : 'text-gray-700'}`}>{m.val}</p>
                          <p className="text-xs text-gray-500 leading-tight">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ABA: PEDAGÓGICO
      ══════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'pedagogico' && (
        <div className="space-y-5">
          <SectionCard title="Funil de Planejamentos (últimos 30 dias)" icon={<TrendingUp className="h-4 w-4 text-purple-500" />}>
            {loading ? (
              <div className="h-40 animate-pulse bg-gray-100 rounded-xl" />
            ) : funilDados.length > 0 ? (
              <div className="space-y-3">
                {funilDados.map((f, i) => {
                  const max = funilDados[0]?.valor || 1;
                  const pctVal = Math.round((f.valor / max) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 text-right">{f.etapa}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
                        <div className="h-7 rounded-full flex items-center justify-end pr-3 transition-all"
                          style={{ width: `${Math.max(pctVal, 8)}%`, background: f.cor }}>
                          <span className="text-xs font-bold text-white">{f.valor}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-10">{pctVal}%</span>
                    </div>
                  );
                })}
                {funil && (
                  <p className="text-xs text-gray-400 mt-2">
                    Taxa de aprovação: {funil.funnel.created
                      ? Math.round((funil.funnel.approved / funil.funnel.created) * 100)
                      : 0}% dos planejamentos criados foram aprovados
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Sem dados de planejamentos no período</p>
            )}
          </SectionCard>

          {radarDados.length > 0 && (
            <SectionCard title="Cobertura BNCC — Campos de Experiência" icon={<Star className="h-4 w-4 text-yellow-500" />}>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarDados}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="campo" tick={{ fontSize: 10 }} />
                  <Radar name="Cobertura" dataKey="cobertura" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Cobertura']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Planejamentos',         icon: <FileText className="h-5 w-5" />,  path: '/app/coordenacao',                badge: '' },
              { label: 'Diários de Bordo',      icon: <BookOpen className="h-5 w-5" />,  path: '/app/coordenacao',                badge: '' },
              { label: 'Matriz 2026',           icon: <Brain className="h-5 w-5" />,     path: '/app/matriz-pedagogica',          badge: '' },
              { label: 'Análises Centrais',     icon: <BarChart2 className="h-5 w-5" />, path: '/app/central',                    badge: '' },
              { label: 'RDICs Publicados',      icon: <Eye className="h-5 w-5" />,       path: '/app/rdic-geral',                 badge: '' },
              { label: 'Desenvolvimento Infantil', icon: <Sparkles className="h-5 w-5" />, path: '/app/desenvolvimento-infantil', badge: 'Novo' },
              { label: 'Relatórios',            icon: <TrendingUp className="h-5 w-5" />, path: '/app/reports',                   badge: '' },
              { label: 'Coord. Pedagógica',     icon: <Network className="h-5 w-5" />,   path: '/app/coordenacao-pedagogica',     badge: '' },
            ].map((item, i) => (
              <button key={i} onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-sm transition-all text-gray-600 hover:text-blue-700">
                {item.badge && (
                  <span className="absolute top-2 right-2 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                    {item.badge}
                  </span>
                )}
                {item.icon}
                <span className="text-xs font-medium text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ABA: REQUISIÇÕES
      ══════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'requisicoes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {reqPendentes > 0 ? `${reqPendentes} requisição(ões) pendente(s) de materiais` : 'Nenhuma requisição pendente'}
            </p>
            <button onClick={() => navigate('/app/coordenacao-geral')}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Ver detalhes <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-16 animate-pulse bg-gray-100 rounded-xl" />)}</div>
          ) : requisicoes.length === 0 ? (
            <div className="text-center py-12 bg-green-50 border border-green-200 rounded-2xl">
              <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-green-700 font-medium">Tudo em dia!</p>
              <p className="text-xs text-green-500">Nenhuma requisição pendente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requisicoes.slice(0, 20).map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-200 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {r.createdByUser ? `${r.createdByUser.firstName} ${r.createdByUser.lastName}` : 'Professor'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.classroom?.name ?? '—'}{r.classroom?.unit?.name ? ` · ${r.classroom.unit.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {r.category && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{r.category}</span>}
                    <span className="text-xs text-gray-400">{relDate(r.createdAt)}</span>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Pendente</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ABA: REUNIÕES
      ══════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'reunioes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {dashboard?.proximasReunioes?.length ?? 0} próxima(s) reunião(ões) agendada(s)
            </p>
            <button onClick={() => navigate('/app/coordenacao')}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Gerenciar <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {(dashboard?.proximasReunioes?.length ?? 0) > 0 && (
            <SectionCard title="Próximas" icon={<Clock className="h-4 w-4 text-blue-500" />}>
              <div className="space-y-3">
                {dashboard!.proximasReunioes.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.titulo}</p>
                      {r.localOuLink && <p className="text-xs text-gray-400">{r.localOuLink}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{relDate(r.dataRealizacao)}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(r.dataRealizacao).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {(dashboard?.ultimasReunioes?.length ?? 0) > 0 && (
            <SectionCard title="Últimas realizadas" icon={<CheckCircle className="h-4 w-4 text-green-500" />}>
              <div className="space-y-3">
                {dashboard!.ultimasReunioes.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <p className="text-sm text-gray-700">{r.titulo}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.status === 'REALIZADA' ? 'bg-green-100 text-green-700' :
                        r.status === 'CANCELADA' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>{r.status}</span>
                      <span className="text-xs text-gray-400">{new Date(r.dataRealizacao).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {!loading && !dashboard?.proximasReunioes?.length && !dashboard?.ultimasReunioes?.length && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma reunião registrada</p>
              <button onClick={() => navigate('/app/coordenacao')} className="mt-3 text-xs text-blue-600 underline">
                Agendar reunião
              </button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
