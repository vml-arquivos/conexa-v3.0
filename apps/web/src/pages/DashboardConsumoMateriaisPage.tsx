import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/ui/PageShell';
import http from '../api/http';
import { useUnitScope } from '../contexts/UnitScopeContext';
import { UnitScopeSelector } from '../components/select/UnitScopeSelector';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles } from '../app/RoleProtectedRoute';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from 'recharts';
import {
  RefreshCw, AlertTriangle, PackageOpen, CheckCircle, Clock,
  XCircle, TrendingUp, Filter, ChevronDown, Truck, BarChart2,
} from 'lucide-react';

interface CategoriaStats { total: number; aprovados: number; pendentes: number; rejeitados: number; }
interface TurmaStats { nome: string; total: number; aprovados: number; }
interface SerieMensal { mes: string; requisicoes: number; aprovadas: number; pendentes: number; rejeitadas: number; custoEstimado: number; itens: number; }
interface PorProfessor { teacherId: string; nome: string; requisicoes: number; aprovadas: number; entregues: number; custoEstimado: number; itens: number; }
interface RelatorioConsumo {
  total: number; aprovados: number; pendentes: number; rejeitados: number; custoEstimadoTotal: number;
  porCategoria: Record<string, CategoriaStats>;
  porTurma: TurmaStats[];
  porStatus: Record<string, number>;
  serieMensal?: SerieMensal[];
  porProfessor?: PorProfessor[];
}

const PALETTE = {
  indigo: '#6366f1', green: '#10b981', amber: '#f59e0b', red: '#ef4444',
  purple: '#8b5cf6', cyan: '#06b6d4', teal: '#14b8a6',
};
const STATUS_COLORS: Record<string, string> = {
  APROVADO: '#10b981', SOLICITADO: '#6366f1', RASCUNHO: '#f59e0b',
  REJEITADO: '#ef4444', ENTREGUE: '#06b6d4', CANCELADO: '#94a3b8',
};
const STATUS_LABEL: Record<string, string> = {
  APROVADO: 'Aprovado', SOLICITADO: 'Solicitado', RASCUNHO: 'Rascunho',
  REJEITADO: 'Rejeitado', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado',
};
const CATEGORIA_LABEL: Record<string, string> = {
  PEDAGOGICO: 'Pedagógico', HIGIENE_PESSOAL: 'Higiene', OUTROS: 'Outros',
  CONSUMIVEL: 'Consumível', PERMANENTE: 'Permanente', LIMPEZA: 'Limpeza', ALIMENTACAO: 'Alimentação',
};
const CAT_COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#14b8a6', '#ec4899', '#f97316', '#84cc16'];

const TooltipPremium = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3 text-sm min-w-[140px]">
      {label && <p className="text-gray-300 font-medium mb-2 text-xs">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-gray-400 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
            {p.name}
          </span>
          <span className="font-bold text-white text-xs">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function MetricCard({ label, value, icon, color, bg, sub }: {
  label: string; value: number | string; icon: React.ReactNode; color: string; bg: string; sub?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${bg} border border-white/60 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
          <p className={`text-3xl font-black ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl bg-white/60">
          <span className={color}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardConsumoMateriaisPage() {
  const { user } = useAuth();
  const roles = normalizeRoles(user);
  const isCentral = roles.includes('STAFF_CENTRAL') || roles.includes('MANTENEDORA') || roles.includes('DEVELOPER');
  const { selectedUnitId: ctxUnitId } = useUnitScope();

  const hoje = getPedagogicalToday();
  const tresAtras = (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0]; })();

  const [dataInicio, setDataInicio] = useState(tresAtras);
  const [dataFim, setDataFim] = useState(hoje);
  const [classroomId, setClassroomId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [turmas, setTurmas] = useState<{ id: string; name: string }[]>([]);
  const [professores, setProfessores] = useState<{ id: string; name: string }[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioConsumo | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true); setErro('');
    try {
      const params: Record<string, string> = {};
      if (dataInicio) params.dataInicio = dataInicio;
      if (dataFim) params.dataFim = dataFim;
      if (classroomId) params.classroomId = classroomId;
      if (teacherId) params.teacherId = teacherId;
      if (ctxUnitId) params.unitId = ctxUnitId;
      const { data } = await http.get('/material-requests/relatorio-consumo', { params });
      setRelatorio(data);
    } catch { setErro('Não foi possível carregar o relatório de consumo.'); }
    finally { setLoading(false); }
  }, [dataInicio, dataFim, classroomId, teacherId, ctxUnitId]);

  const carregarFiltros = useCallback(async () => {
    try {
      const [turmasRes, profRes] = await Promise.allSettled([
        http.get('/lookup/classrooms/accessible'),
        http.get('/lookup/teachers/accessible', { params: { unitId: ctxUnitId || (user as any)?.unitId } }),
      ]);
      if (turmasRes.status === 'fulfilled') setTurmas(turmasRes.value.data || []);
      if (profRes.status === 'fulfilled') setProfessores(Array.isArray(profRes.value.data) ? profRes.value.data : []);
    } catch {}
  }, [ctxUnitId, user]);

  useEffect(() => { carregar(); carregarFiltros(); }, [ctxUnitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const taxaAprovacao = relatorio && relatorio.total > 0 ? Math.round((relatorio.aprovados / relatorio.total) * 100) : 0;

  const dadosStatus = relatorio
    ? Object.entries(relatorio.porStatus).map(([k, v]) => ({ name: STATUS_LABEL[k] ?? k, value: v, fill: STATUS_COLORS[k] ?? '#94a3b8' })).filter(d => d.value > 0)
    : [];

  const dadosCategoria = relatorio
    ? Object.entries(relatorio.porCategoria).map(([k, v], i) => ({
        name: CATEGORIA_LABEL[k] ?? k, Aprovados: v.aprovados, Pendentes: v.pendentes, Rejeitados: v.rejeitados, Total: v.total, fill: CAT_COLORS[i % CAT_COLORS.length],
      })).sort((a, b) => b.Total - a.Total)
    : [];

  const dadosTurma = relatorio?.porTurma?.slice(0, 8).map((t) => ({
    name: t.nome.length > 18 ? t.nome.slice(0, 18) + '\u2026' : t.nome, Total: t.total, Aprovados: t.aprovados,
  })) ?? [];

  const dadosMensal = (relatorio as any)?.serieMensal?.map((s: SerieMensal) => ({
    name: s.mes.slice(5) + '/' + s.mes.slice(2, 4),
    "Requisições": s.requisicoes, Aprovadas: s.aprovadas, Pendentes: s.pendentes, Rejeitadas: s.rejeitadas,
  })) ?? [];

  const dadosProfessor = (relatorio as any)?.porProfessor?.slice(0, 8).map((p: PorProfessor) => ({
    name: p.nome.length > 20 ? p.nome.slice(0, 20) + '\u2026' : p.nome,
    "Requisições": p.requisicoes, Aprovadas: p.aprovadas,
  })) ?? [];

  return (
    <PageShell title="Dashboard de Consumo de Materiais" subtitle="Métricas, gráficos e estatísticas de requisições por período">
      {isCentral && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg"><BarChart2 className="h-4 w-4 text-indigo-600" /></div>
          <span className="text-sm font-semibold text-indigo-700">Escopo da análise:</span>
          <UnitScopeSelector showNetworkOption compact />
          {!ctxUnitId && <span className="text-xs text-indigo-400 ml-auto">Exibindo toda a rede</span>}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <button onClick={() => setFiltrosAbertos(v => !v)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-500" />
            <span className="font-semibold text-gray-700 text-sm">Filtros</span>
            {(classroomId || teacherId) && (
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {[classroomId && 'Turma', teacherId && 'Professor'].filter(Boolean).join(' + ')}
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} />
        </button>
        {filtrosAbertos && (
          <div className="px-5 pb-5 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Data início</label>
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Data fim</label>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Turma</label>
                <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50">
                  <option value="">Todas as turmas</option>
                  {turmas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {professores.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Professor</label>
                  <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50">
                    <option value="">Todos os professores</option>
                    {professores.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <button onClick={carregar} disabled={loading}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Carregando…' : 'Atualizar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
          <p className="text-sm text-gray-400">Carregando dados…</p>
        </div>
      )}
      {!loading && erro && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-10 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-700 font-semibold">{erro}</p>
          <button onClick={carregar} className="mt-4 text-sm text-red-500 underline">Tentar novamente</button>
        </div>
      )}

      {!loading && !erro && relatorio && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <MetricCard label="Total de Requisições" value={relatorio.total} icon={<PackageOpen className="h-5 w-5" />} color="text-indigo-600" bg="bg-indigo-50" />
            <MetricCard label="Aprovadas" value={relatorio.aprovados} icon={<CheckCircle className="h-5 w-5" />} color="text-emerald-600" bg="bg-emerald-50" />
            <MetricCard label="Pendentes" value={relatorio.pendentes} icon={<Clock className="h-5 w-5" />} color="text-amber-600" bg="bg-amber-50" />
            <MetricCard label="Rejeitadas" value={relatorio.rejeitados} icon={<XCircle className="h-5 w-5" />} color="text-red-500" bg="bg-red-50" />
            <MetricCard label="Custo Estimado"
              value={relatorio.custoEstimadoTotal > 0 ? `R$ ${relatorio.custoEstimadoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
              icon={<TrendingUp className="h-5 w-5" />} color="text-purple-600" bg="bg-purple-50" sub={`Aprovação: ${taxaAprovacao}%`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            {dadosStatus.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-0.5 text-sm">Distribuição por Status</h3>
                <p className="text-xs text-gray-400 mb-3">Proporção de cada status no período</p>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={dadosStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {dadosStatus.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
                    </Pie>
                    <Tooltip content={<TooltipPremium />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center mt-1">
                  {dadosStatus.map((d) => (
                    <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                      {d.name} <strong className="text-gray-700">{d.value}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-5 text-white flex flex-col items-center justify-center">
              <h3 className="font-bold text-white/90 mb-0.5 text-sm">Taxa de Aprovação</h3>
              <p className="text-xs text-white/60 mb-3">Aprovadas + Entregues / Total</p>
              <div className="relative">
                <ResponsiveContainer width={150} height={150}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius={48} outerRadius={72} startAngle={90} endAngle={-270}
                    data={[{ value: taxaAprovacao, fill: '#10b981' }, { value: 100 - taxaAprovacao, fill: 'rgba(255,255,255,0.15)' }]}>
                    <RadialBar dataKey="value" cornerRadius={8} background={false} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-white">{taxaAprovacao}%</span>
                </div>
              </div>
              <p className="text-white/70 text-xs mt-2 text-center">{relatorio.aprovados} aprovadas de {relatorio.total} total</p>
            </div>
            {dadosCategoria.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-0.5 text-sm">Requisições por Categoria</h3>
                <p className="text-xs text-gray-400 mb-3">Volume total por tipo de material</p>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={dadosCategoria} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="Total"
                      label={({ percent }) => percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : ''} labelLine={false}>
                      {dadosCategoria.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
                    </Pie>
                    <Tooltip content={<TooltipPremium />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center mt-1">
                  {dadosCategoria.map((d) => (
                    <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {dadosCategoria.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
              <h3 className="font-bold text-gray-800 mb-0.5 text-sm">Detalhamento por Categoria</h3>
              <p className="text-xs text-gray-400 mb-5">Aprovados, pendentes e rejeitados por tipo de material</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dadosCategoria} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<TooltipPremium />} cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="Aprovados" fill={PALETTE.green} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Pendentes" fill={PALETTE.amber} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Rejeitados" fill={PALETTE.red} radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {dadosMensal.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
              <h3 className="font-bold text-gray-800 mb-0.5 text-sm">Evolução Mensal de Requisições</h3>
              <p className="text-xs text-gray-400 mb-5">Tendência ao longo do período selecionado</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dadosMensal} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<TooltipPremium />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Line type="monotone" dataKey="Requisições" stroke={PALETTE.indigo} strokeWidth={2.5} dot={{ r: 4, fill: PALETTE.indigo, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Aprovadas" stroke={PALETTE.green} strokeWidth={2.5} dot={{ r: 4, fill: PALETTE.green, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Pendentes" stroke={PALETTE.amber} strokeWidth={2} strokeDasharray="5 3" dot={false} />
                  <Line type="monotone" dataKey="Rejeitadas" stroke={PALETTE.red} strokeWidth={2} strokeDasharray="5 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {dadosTurma.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-0.5 text-sm">Requisições por Turma</h3>
                <p className="text-xs text-gray-400 mb-5">Top 8 turmas com mais requisições</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dadosTurma} layout="vertical" margin={{ top: 0, right: 20, left: 8, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={90} axisLine={false} tickLine={false} />
                    <Tooltip content={<TooltipPremium />} cursor={{ fill: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="Total" fill={PALETTE.indigo} radius={[0, 4, 4, 0]} maxBarSize={18} />
                    <Bar dataKey="Aprovados" fill={PALETTE.green} radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {dadosProfessor.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-0.5 text-sm">Requisições por Professor</h3>
                <p className="text-xs text-gray-400 mb-5">Top 8 professores por volume de requisições</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dadosProfessor} layout="vertical" margin={{ top: 0, right: 20, left: 8, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={110} axisLine={false} tickLine={false} />
                    <Tooltip content={<TooltipPremium />} cursor={{ fill: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="Requisições" fill={PALETTE.purple} radius={[0, 4, 4, 0]} maxBarSize={18} />
                    <Bar dataKey="Aprovadas" fill={PALETTE.teal} radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {relatorio.total === 0 && (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-12 text-center">
              <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Nenhuma requisição encontrada no período selecionado.</p>
              <p className="text-gray-400 text-sm mt-1">Tente ampliar o intervalo de datas ou remover os filtros.</p>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
