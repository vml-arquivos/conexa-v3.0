/**
 * DashboardPsicologoPage — Dashboard da Psicóloga Central
 * Perfil: STAFF_CENTRAL_PSICOLOGIA
 *
 * Dados reais via endpoints:
 *  - GET /rdic/geral                         — RDICs aprovados/publicados
 *  - GET /development-observations           — Observações de desenvolvimento
 *  - GET /coordenacao/dashboard/geral        — Indicadores gerais da rede
 *  - GET /children                           — Alunos para busca
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { useAuth } from '../app/AuthProvider';
import { useApiCache } from '../hooks/useApiCache';
import { toast } from 'sonner';
import http from '../api/http';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  Brain, Users, FileText, CheckCircle, AlertCircle, Clock,
  RefreshCw, ChevronRight, ArrowRight, Search, Eye, Star,
  TrendingUp, Calendar, Building2, Heart, Activity, Zap,
  BookOpen, ClipboardList, Bell, Filter,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Rdic {
  id: string;
  status: string;
  periodo: string;
  anoLetivo: number;
  createdAt: string;
  updatedAt: string;
  child?: { id: string; name: string };
  classroom?: { id: string; name: string; unit?: { id: string; name: string } };
  createdByUser?: { firstName: string; lastName: string };
  rascunhoJson?: string;
}

interface Observacao {
  id: string;
  category: string;
  content: string;
  createdAt: string;
  child?: { id: string; name: string };
  classroom?: { name: string; unit?: { name: string } };
  createdByUser?: { firstName: string; lastName: string };
}

interface DashboardGeral {
  indicadoresGerais: {
    totalUnidades: number;
    totalAlunos: number;
    totalProfessores: number;
    diariosHoje: number;
  };
  consolidadoUnidades: Array<{
    id: string;
    nome: string;
    totalAlunos: number;
    coberturaChamada: number;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const RDIC_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  RASCUNHO:    { label: 'Rascunho',    bg: 'bg-gray-100',   text: 'text-gray-700' },
  EM_REVISAO:  { label: 'Em Revisão',  bg: 'bg-blue-100',   text: 'text-blue-700' },
  APROVADO:    { label: 'Aprovado',    bg: 'bg-green-100',  text: 'text-green-700' },
  DEVOLVIDO:   { label: 'Devolvido',   bg: 'bg-yellow-100', text: 'text-yellow-700' },
  PUBLICADO:   { label: 'Publicado',   bg: 'bg-purple-100', text: 'text-purple-700' },
  FINALIZADO:  { label: 'Finalizado',  bg: 'bg-indigo-100', text: 'text-indigo-700' },
};

const OBS_CATEGORY: Record<string, { label: string; color: string }> = {
  COGNITIVO:      { label: 'Cognitivo',      color: '#3b82f6' },
  SOCIOAFETIVO:   { label: 'Socioafetivo',   color: '#10b981' },
  MOTOR:          { label: 'Motor',          color: '#f59e0b' },
  LINGUAGEM:      { label: 'Linguagem',      color: '#8b5cf6' },
  COMPORTAMENTAL: { label: 'Comportamental', color: '#ef4444' },
  OUTRO:          { label: 'Outro',          color: '#6b7280' },
};

function fmt(n?: number | null): string {
  if (n == null) return '—';
  return n.toLocaleString('pt-BR');
}

function relDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff <= 7) return `Há ${diff} dias`;
  return d.toLocaleDateString('pt-BR');
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function KpiCard({
  icon, label, value, helper, tone = 'default', onClick,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  helper?: string; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    default: 'bg-white border-gray-200 text-gray-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    danger:  'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    purple:  'bg-purple-50 border-purple-200 text-purple-800',
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
          <button onClick={action.onClick} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
            {action.label} <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SkeletonGrid({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
export default function DashboardPsicologoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const apiCache = useApiCache(120_000);

  const [loading, setLoading] = useState(true);
  const [rdics, setRdics] = useState<Rdic[]>([]);
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [dashboard, setDashboard] = useState<DashboardGeral | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'visao' | 'rdics' | 'observacoes' | 'alunos'>('visao');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const hoje = getPedagogicalToday();
  const ha30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [rdicRes, obsRes, dashRes] = await Promise.allSettled([
        apiCache.get('/rdic/geral', undefined, () =>
          http.get('/rdic/geral').then(r => r.data)),
        apiCache.get('/development-observations', { startDate: ha30, endDate: hoje } as Record<string, unknown>, () =>
          http.get('/development-observations', { params: { startDate: ha30, endDate: hoje } }).then(r => r.data)),
        apiCache.get('/coordenacao/dashboard/geral', undefined, () =>
          http.get('/coordenacao/dashboard/geral').then(r => r.data)),
      ]);

      if (rdicRes.status === 'fulfilled') {
        const raw = rdicRes.value as any;
        setRdics(Array.isArray(raw) ? raw : (raw?.rdics ?? raw?.data ?? []));
      }
      if (obsRes.status === 'fulfilled') {
        const raw = obsRes.value as any;
        setObservacoes(Array.isArray(raw) ? raw : (raw?.observations ?? raw?.data ?? []));
      }
      if (dashRes.status === 'fulfilled') {
        setDashboard(dashRes.value as DashboardGeral);
      }
    } catch {
      toast.error('Erro ao carregar dashboard da psicóloga');
    } finally {
      setLoading(false);
    }
  }, [refreshKey]); // eslint-disable-line

  useEffect(() => { carregar(); }, [carregar]);

  // ─── Dados derivados ─────────────────────────────────────────────────────
  const ind = dashboard?.indicadoresGerais;

  const rdicsAprovados  = rdics.filter(r => r.status === 'APROVADO' || r.status === 'PUBLICADO');
  const rdicsRevisao    = rdics.filter(r => r.status === 'EM_REVISAO');
  const rdicsDevolvidos = rdics.filter(r => r.status === 'DEVOLVIDO');

  // Observações por categoria (últimos 30 dias)
  const obsPorCategoria = Object.entries(
    observacoes.reduce((acc, o) => {
      const cat = o.category ?? 'OUTRO';
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([cat, count]) => ({
    name: OBS_CATEGORY[cat]?.label ?? cat,
    value: count,
    fill: OBS_CATEGORY[cat]?.color ?? '#6b7280',
  }));

  // RDICs filtrados
  const rdicsFiltrados = rdics.filter(r => {
    const matchStatus = filtroStatus === 'todos' || r.status === filtroStatus;
    const matchBusca  = !busca || r.child?.name?.toLowerCase().includes(busca.toLowerCase()) ||
                        r.classroom?.name?.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca;
  });

  // Observações filtradas
  const obsFiltradas = observacoes.filter(o => {
    const matchCat   = filtroCategoria === 'todas' || o.category === filtroCategoria;
    const matchBusca = !busca || o.child?.name?.toLowerCase().includes(busca.toLowerCase());
    return matchCat && matchBusca;
  });

  // Distribuição de RDICs por unidade
  const rdicsPorUnidade = Object.entries(
    rdics.reduce((acc, r) => {
      const nome = r.classroom?.unit?.name ?? 'Sem unidade';
      acc[nome] = (acc[nome] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([nome, count]) => ({ nome: nome.split(' ').slice(-1)[0], count }));

  // ─── Abas ────────────────────────────────────────────────────────────────
  const ABAS = [
    { id: 'visao',       label: 'Visão Geral',    icon: <Brain className="h-3.5 w-3.5" /> },
    { id: 'rdics',       label: `RDICs${rdicsRevisao.length > 0 ? ` (${rdicsRevisao.length})` : ''}`, icon: <FileText className="h-3.5 w-3.5" /> },
    { id: 'observacoes', label: 'Observações',     icon: <ClipboardList className="h-3.5 w-3.5" /> },
    { id: 'alunos',      label: 'Alunos',          icon: <Users className="h-3.5 w-3.5" /> },
  ] as const;

  return (
    <PageShell
      title="Painel da Gestão Pedagógica"
      subtitle={`Bem-vindo, ${((user?.nome as string) || '').split(' ')[0] || 'Psicóloga'}! Acompanhamento do desenvolvimento infantil na rede.`}
    >
      {/* ── Faixa de alertas ──────────────────────────────────────────── */}
      {!loading && (rdicsRevisao.length > 0 || rdicsDevolvidos.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl">
          <Zap className="h-4 w-4 text-purple-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-purple-700">Atenção:</span>
          {rdicsRevisao.length > 0 && (
            <span className="inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 border-blue-300">
              <Bell className="h-3 w-3" />{rdicsRevisao.length} RDIC(s) em revisão
            </span>
          )}
          {rdicsDevolvidos.length > 0 && (
            <span className="inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 border-yellow-300">
              <Bell className="h-3 w-3" />{rdicsDevolvidos.length} RDIC(s) devolvido(s)
            </span>
          )}
          <button onClick={() => setAbaAtiva('rdics')} className="ml-auto text-xs text-purple-600 underline">
            Ver RDICs
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
              abaAtiva === a.id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
          {loading ? <SkeletonGrid n={6} /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard icon={<Users className="h-5 w-5" />} label="Total de alunos na rede"
                value={fmt(ind?.totalAlunos)} tone="info" />
              <KpiCard icon={<FileText className="h-5 w-5" />} label="RDICs aprovados/publicados"
                value={fmt(rdicsAprovados.length)} tone="success"
                onClick={() => setAbaAtiva('rdics')} />
              <KpiCard icon={<Clock className="h-5 w-5" />} label="RDICs em revisão"
                value={fmt(rdicsRevisao.length)}
                tone={rdicsRevisao.length > 0 ? 'warning' : 'success'}
                onClick={() => setAbaAtiva('rdics')} />
              <KpiCard icon={<ClipboardList className="h-5 w-5" />} label="Observações (30 dias)"
                value={fmt(observacoes.length)} tone="purple"
                onClick={() => setAbaAtiva('observacoes')} />
              <KpiCard icon={<Building2 className="h-5 w-5" />} label="Unidades monitoradas"
                value={fmt(ind?.totalUnidades)} tone="default" />
              <KpiCard icon={<Activity className="h-5 w-5" />} label="Diários hoje"
                value={fmt(ind?.diariosHoje)}
                tone={!ind?.diariosHoje ? 'warning' : 'success'}
                helper="Registros do dia" />
            </div>
          )}

          {/* Gráficos */}
          {!loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Observações por categoria */}
              <SectionCard title="Observações por Categoria (30 dias)" icon={<ClipboardList className="h-4 w-4 text-purple-500" />}>
                {obsPorCategoria.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie data={obsPorCategoria} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                          {obsPorCategoria.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {obsPorCategoria.map((d, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: d.fill }} />
                            <span className="text-xs text-gray-700">{d.name}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-800">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-8">Sem observações no período</p>
                )}
              </SectionCard>

              {/* RDICs por unidade */}
              <SectionCard title="RDICs por Unidade" icon={<Building2 className="h-4 w-4 text-blue-500" />}>
                {rdicsPorUnidade.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={rdicsPorUnidade} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="RDICs" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-8">Sem RDICs registrados</p>
                )}
              </SectionCard>
            </div>
          )}

          {/* Atalhos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ver RDICs',        icon: <FileText className="h-5 w-5" />,    onClick: () => setAbaAtiva('rdics') },
              { label: 'Observações',      icon: <ClipboardList className="h-5 w-5" />, onClick: () => setAbaAtiva('observacoes') },
              { label: 'Análises Centrais', icon: <TrendingUp className="h-5 w-5" />,  onClick: () => navigate('/app/central') },
              { label: 'Relatórios',       icon: <BookOpen className="h-5 w-5" />,     onClick: () => navigate('/app/reports') },
            ].map((item, i) => (
              <button key={i} onClick={item.onClick}
                className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-2xl hover:border-purple-300 hover:shadow-sm transition-all text-gray-600 hover:text-purple-700">
                {item.icon}
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ABA: RDICs
      ══════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'rdics' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar aluno ou turma..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            {['todos', 'EM_REVISAO', 'APROVADO', 'PUBLICADO', 'DEVOLVIDO'].map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filtroStatus === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                }`}>
                {s === 'todos' ? 'Todos' : (RDIC_STATUS[s]?.label ?? s)}
                {s !== 'todos' && (
                  <span className="ml-1.5 opacity-70">({rdics.filter(r => r.status === s).length})</span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-gray-100 rounded-xl" />)}</div>
          ) : rdicsFiltrados.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum RDIC encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rdicsFiltrados.map(r => {
                const cfg = RDIC_STATUS[r.status] ?? { label: r.status, bg: 'bg-gray-100', text: 'text-gray-700' };
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-purple-200 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {r.child?.name ?? 'Aluno não identificado'}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {r.classroom?.name ?? '—'}
                        {r.classroom?.unit?.name ? ` · ${r.classroom.unit.name}` : ''}
                        {' · '}Período: {r.periodo} · {r.anoLetivo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-xs text-gray-400">{relDate(r.updatedAt)}</span>
                      <button
                        onClick={() => navigate(`/app/rdic-geral`)}
                        className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all"
                        title="Ver RDIC"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ABA: OBSERVAÇÕES
      ══════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'observacoes' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar aluno..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            {['todas', ...Object.keys(OBS_CATEGORY)].map(c => (
              <button key={c} onClick={() => setFiltroCategoria(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filtroCategoria === c ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                }`}>
                {c === 'todas' ? 'Todas' : (OBS_CATEGORY[c]?.label ?? c)}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            {obsFiltradas.length} observação(ões) nos últimos 30 dias
          </p>

          {loading ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className="h-20 animate-pulse bg-gray-100 rounded-xl" />)}</div>
          ) : obsFiltradas.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma observação encontrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {obsFiltradas.slice(0, 30).map(o => {
                const catCfg = OBS_CATEGORY[o.category] ?? { label: o.category, color: '#6b7280' };
                return (
                  <div key={o.id} className="p-3 bg-white border border-gray-200 rounded-xl hover:border-purple-200 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: catCfg.color }} />
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {o.child?.name ?? 'Aluno não identificado'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {o.classroom?.name ?? '—'}
                            {o.classroom?.unit?.name ? ` · ${o.classroom.unit.name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${catCfg.color}20`, color: catCfg.color }}>
                          {catCfg.label}
                        </span>
                        <span className="text-xs text-gray-400">{relDate(o.createdAt)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{o.content}</p>
                    {o.createdByUser && (
                      <p className="text-xs text-gray-400 mt-1">
                        Por: {o.createdByUser.firstName} {o.createdByUser.lastName}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ABA: ALUNOS
      ══════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'alunos' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Para visualizar o perfil completo de desenvolvimento de um aluno, acesse as Análises Centrais ou os RDICs Publicados.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SectionCard title="Distribuição por Unidade" icon={<Building2 className="h-4 w-4 text-blue-500" />}>
              {loading ? (
                <div className="h-40 animate-pulse bg-gray-100 rounded-xl" />
              ) : (dashboard?.consolidadoUnidades ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(dashboard?.consolidadoUnidades ?? []).map(u => (
                    <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{u.nome}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{u.totalAlunos} alunos</span>
                        <span className="text-xs font-medium text-gray-600">{Math.round(u.coberturaChamada)}% presença</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">Sem dados de unidades</p>
              )}
            </SectionCard>

            <SectionCard title="Atalhos de Análise" icon={<Brain className="h-4 w-4 text-purple-500" />}>
              <div className="space-y-2">
                {[
                  { label: 'Desenvolvimento Infantil', path: '/app/desenvolvimento-infantil', desc: 'Observações por unidade, turma e criança' },
                  { label: 'RDICs Publicados',     path: '/app/rdic-geral',  desc: 'Relatórios de desenvolvimento individuais' },
                  { label: 'Análises Centrais',    path: '/app/central',     desc: 'Indicadores e gráficos da rede' },
                  { label: 'Relatórios',           path: '/app/reports',     desc: 'Exportar dados e relatórios' },
                  { label: 'Coordenação Geral',    path: '/app/coordenacao-geral', desc: 'Visão geral de todas as unidades' },
                ].map((item, i) => (
                  <button key={i} onClick={() => navigate(item.path)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-200 rounded-xl transition-all text-left">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </PageShell>
  );
}
