import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles } from '../app/RoleProtectedRoute';
import { useUnitScope } from '../contexts/UnitScopeContext';
import { UnitScopeSelector } from '../components/select/UnitScopeSelector';
import {
  BarChart2, ShoppingCart, CheckCircle, XCircle,
  Clock, Package, RefreshCw, Filter, TrendingUp, TrendingDown,
  Users, BookOpen, DollarSign, Activity, X,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface RelatorioPeriodo { inicio: string | null; fim: string | null; }
interface PorCategoria {
  [tipo: string]: { total: number; aprovados: number; pendentes: number; rejeitados: number; quantidade: number; custo: number };
}
interface PorTurma { nome: string; total: number; aprovados: number; }
interface PorProfessor { teacherId: string; nome: string; requisicoes: number; aprovadas: number; entregues: number; custoEstimado: number; itens: number; }
interface SerieMensal { mes: string; requisicoes: number; aprovadas: number; pendentes: number; rejeitadas: number; entregues: number; custoEstimado: number; itens: number; }
interface Detalhe {
  id: string; code: string; titulo: string; tipo: string; quantidade: number;
  status: string; prioridade: string; turma: string | null; professor: string | null;
  unidade: string | null; custoEstimado: number | null; dataSolicitacao: string; dataAprovacao: string | null;
}
interface RelatorioData {
  periodo: RelatorioPeriodo;
  total: number;
  quantidadeTotal: number;
  aprovados: number;
  pendentes: number;
  rejeitados: number;
  entregues: number;
  custoEstimadoTotal: number;
  porCategoria: PorCategoria;
  porTurma: PorTurma[];
  porStatus: Record<string, number>;
  porProfessor: PorProfessor[];
  serieMensal: SerieMensal[];
  detalhes: Detalhe[];
  filtros: { status: string | null; type: string | null };
  escopo: string;
}
interface LookupItem { id: string; name?: string; nome?: string; code?: string; }

// ─── Labels e Cores ───────────────────────────────────────────────────────────
const TIPO_LABEL: Record<string, string> = {
  PEDAGOGICO: 'Pedagógico', HIGIENE: 'Higiene', HIGIENE_PESSOAL: 'Higiene Pessoal',
  LIMPEZA: 'Limpeza', ALIMENTACAO: 'Alimentação', CONSUMIVEL: 'Consumível',
  PERMANENTE: 'Permanente', OUTRO: 'Outros', OUTROS: 'Outros',
};
const STATUS_LABEL: Record<string, { label: string; cor: string; hex: string }> = {
  SOLICITADO: { label: 'Solicitado', cor: 'bg-blue-100 text-blue-700', hex: '#3b82f6' },
  EM_ANALISE: { label: 'Em Análise', cor: 'bg-yellow-100 text-yellow-700', hex: '#f59e0b' },
  APROVADO:   { label: 'Aprovado',   cor: 'bg-green-100 text-green-700',  hex: '#22c55e' },
  REJEITADO:  { label: 'Rejeitado',  cor: 'bg-red-100 text-red-700',      hex: '#ef4444' },
  ENTREGUE:   { label: 'Entregue',   cor: 'bg-purple-100 text-purple-700',hex: '#a855f7' },
  RASCUNHO:   { label: 'Rascunho',   cor: 'bg-gray-100 text-gray-600',    hex: '#9ca3af' },
};
const CATEGORIA_CORES: Record<string, string> = {
  PEDAGOGICO: '#6366f1', HIGIENE: '#06b6d4', LIMPEZA: '#10b981',
  ALIMENTACAO: '#f59e0b', CONSUMIVEL: '#f97316', PERMANENTE: '#8b5cf6', OUTRO: '#9ca3af',
};
const PRIORITY_LABEL: Record<string, { label: string; cor: string }> = {
  baixa: { label: 'Baixa', cor: 'text-gray-400' },
  normal: { label: 'Normal', cor: 'text-blue-500' },
  alta: { label: 'Alta', cor: 'text-orange-500' },
  urgente: { label: 'Urgente', cor: 'text-red-600 font-bold' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return new Intl.NumberFormat('pt-BR').format(n); }
function fmtBRL(n: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n); }
function fmtData(iso: string) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR'); }
function fmtMes(mes: string) {
  const [y, m] = mes.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${meses[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 100) : 0; }

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; trend?: { value: number; label: string };
}) {
  return (
    <Card className={`border ${color} shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color.replace('border-', 'bg-').replace('-200', '-100')}`}>
            <Icon className="h-5 w-5 text-gray-600" />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function RelatorioConsumoMateriaisPage() {
  const { user } = useAuth();
  const roles = normalizeRoles(user);
  const isCentral = roles.includes('STAFF_CENTRAL') || roles.includes('MANTENEDORA') || roles.includes('DEVELOPER');

  const [searchParams] = useSearchParams();
  const unitIdFromQuery = searchParams.get('unitId') ?? '';
  const { selectedUnitId: ctxUnitId, setUnit: ctxSetUnit, accessibleUnits } = useUnitScope();

  useEffect(() => {
    if (unitIdFromQuery && unitIdFromQuery !== ctxUnitId) ctxSetUnit(unitIdFromQuery);
  }, [unitIdFromQuery]); // eslint-disable-line

  const selectedUnitId = ctxUnitId ?? '';
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'graficos' | 'detalhes'>('overview');

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    status: '',
    type: '',
    classroomId: '',
    teacherId: '',
  });

  // ── Lookup: Turmas e Professores ─────────────────────────────────────────────
  const [turmas, setTurmas] = useState<LookupItem[]>([]);
  const [professores, setProfessores] = useState<LookupItem[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);

  const carregarLookups = useCallback(async () => {
    setLoadingLookup(true);
    try {
      const params = new URLSearchParams();
      if (isCentral && selectedUnitId) params.set('unitId', selectedUnitId);
      const [turmasRes, professoresRes] = await Promise.all([
        http.get(`/lookup/classrooms/accessible?${params.toString()}`).catch(() => ({ data: [] })),
        http.get(`/lookup/teachers/accessible?${params.toString()}`).catch(() => ({ data: [] })),
      ]);
      setTurmas(Array.isArray(turmasRes.data) ? turmasRes.data : []);
      setProfessores(Array.isArray(professoresRes.data) ? professoresRes.data : []);
    } catch {
      // silencioso — não bloqueia o dashboard
    } finally {
      setLoadingLookup(false);
    }
  }, [isCentral, selectedUnitId]);

  useEffect(() => { carregarLookups(); }, [carregarLookups]);

  const carregarRelatorio = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
      if (filtros.status) params.set('status', filtros.status);
      if (filtros.type) params.set('type', filtros.type);
      if (filtros.classroomId) params.set('classroomId', filtros.classroomId);
      if (filtros.teacherId) params.set('teacherId', filtros.teacherId);
      if (isCentral && selectedUnitId) params.set('unitId', selectedUnitId);
      const res = await http.get(`/material-requests/relatorio-consumo?${params.toString()}`);
      setRelatorio(res.data ?? null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao carregar relatório';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filtros, selectedUnitId, isCentral]);

  useEffect(() => { carregarRelatorio(); }, [carregarRelatorio]);

  function handleFiltrar(e: React.FormEvent) { e.preventDefault(); carregarRelatorio(); }
  function limparFiltros() {
    setFiltros({ dataInicio: '', dataFim: '', status: '', type: '', classroomId: '', teacherId: '' });
  }

  const unidadeNome = accessibleUnits.find(u => u.id === selectedUnitId)?.name;
  const turmaAtiva = turmas.find(t => t.id === filtros.classroomId);
  const professorAtivo = professores.find(p => p.id === filtros.teacherId);

  // ── Métricas analíticas derivadas ──────────────────────────────────────────
  const taxaAprovacao = relatorio ? pct(relatorio.aprovados, relatorio.total) : 0;
  const taxaRejeicao  = relatorio ? pct(relatorio.rejeitados, relatorio.total) : 0;
  const taxaEntrega   = relatorio ? pct(relatorio.entregues, relatorio.total) : 0;
  const ticketMedio   = relatorio && relatorio.total > 0
    ? Math.round((relatorio.custoEstimadoTotal / relatorio.total) * 100) / 100
    : 0;

  // Tendência: comparar 1º metade vs 2ª metade da série mensal
  const tendencia = (() => {
    if (!relatorio?.serieMensal || relatorio.serieMensal.length < 2) return null;
    const s = relatorio.serieMensal;
    const mid = Math.floor(s.length / 2);
    const primeira = s.slice(0, mid).reduce((a, b) => a + b.requisicoes, 0);
    const segunda  = s.slice(mid).reduce((a, b) => a + b.requisicoes, 0);
    if (primeira === 0) return null;
    return Math.round(((segunda - primeira) / primeira) * 100);
  })();

  // Top categorias por custo
  const topCategorias = relatorio
    ? Object.entries(relatorio.porCategoria)
        .map(([k, v]) => ({ name: TIPO_LABEL[k] ?? k, custo: v.custo, total: v.total, quantidade: v.quantidade }))
        .sort((a, b) => b.custo - a.custo)
    : [];

  // Dados para gráfico de pizza de status
  const pieStatus = relatorio
    ? Object.entries(relatorio.porStatus)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: STATUS_LABEL[k]?.label ?? k, value: v, fill: STATUS_LABEL[k]?.hex ?? '#9ca3af' }))
    : [];

  // Série mensal formatada para Recharts
  const serieMensalFmt = relatorio?.serieMensal?.map(s => ({
    ...s,
    mesLabel: fmtMes(s.mes),
  })) ?? [];

  // Verifica se há filtros ativos
  const filtrosAtivos = filtros.status || filtros.type || filtros.classroomId || filtros.teacherId || filtros.dataInicio || filtros.dataFim;

  return (
    <PageShell
      title="Dashboard de Consumo de Materiais"
      subtitle={
        isCentral
          ? selectedUnitId ? `Unidade: ${unidadeNome ?? selectedUnitId}` : 'Toda a rede'
          : 'Análise gerencial de requisições por turma, professor, categoria e período'
      }
    >
      {/* Seletor de Unidade */}
      {isCentral && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
          <UnitScopeSelector showNetworkOption placeholder="Toda a rede" className="flex-1 min-w-[200px]" />
          {selectedUnitId && (
            <span className="text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
              Filtrando: <strong>{unidadeNome}</strong>
            </span>
          )}
        </div>
      )}

      {/* ── Painel de Filtros ──────────────────────────────────────────────── */}
      <Card className="border border-gray-200 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-gray-700 text-base">
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-indigo-500" /> Filtros
            </span>
            {filtrosAtivos && (
              <button type="button" onClick={limparFiltros}
                className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFiltrar}>
            {/* Linha 1: Data Início, Data Fim, Turma, Professor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">Data Início</Label>
                <Input type="date" value={filtros.dataInicio}
                  onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))}
                  className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">Data Fim</Label>
                <Input type="date" value={filtros.dataFim}
                  onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))}
                  className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Turma {loadingLookup && <span className="text-gray-400 font-normal">(carregando...)</span>}
                </Label>
                <select
                  value={filtros.classroomId}
                  onChange={e => setFiltros(f => ({ ...f, classroomId: e.target.value }))}
                  className="w-full h-9 border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="">Todas as turmas</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.name ?? t.nome ?? t.code ?? t.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Professor {loadingLookup && <span className="text-gray-400 font-normal">(carregando...)</span>}
                </Label>
                <select
                  value={filtros.teacherId}
                  onChange={e => setFiltros(f => ({ ...f, teacherId: e.target.value }))}
                  className="w-full h-9 border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="">Todos os professores</option>
                  {professores.map(p => (
                    <option key={p.id} value={p.id}>{p.name ?? p.nome ?? p.id}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Linha 2: Tipo de Consumo, Status, Botão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">Tipo de Consumo</Label>
                <select value={filtros.type}
                  onChange={e => setFiltros(f => ({ ...f, type: e.target.value }))}
                  className="w-full h-9 border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="">Todos os tipos</option>
                  <option value="HIGIENE">🧴 Higiene Pessoal (fralda, shampoo, sabonete)</option>
                  <option value="LIMPEZA">🧹 Limpeza</option>
                  <option value="PEDAGOGICO">📚 Pedagógico</option>
                  <option value="ALIMENTACAO">🍽️ Alimentação</option>
                  <option value="CONSUMIVEL">📦 Consumível</option>
                  <option value="PERMANENTE">🏫 Permanente</option>
                  <option value="OUTRO">📋 Outros</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">Status</Label>
                <select value={filtros.status}
                  onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}
                  className="w-full h-9 border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                  <option value="">Todos os status</option>
                  <option value="SOLICITADO">Solicitado</option>
                  <option value="EM_ANALISE">Em Análise</option>
                  <option value="APROVADO">Aprovado</option>
                  <option value="REJEITADO">Rejeitado</option>
                  <option value="ENTREGUE">Entregue</option>
                  <option value="RASCUNHO">Rascunho</option>
                </select>
              </div>
              <div className="lg:col-span-2 flex items-end">
                <Button type="submit" disabled={loading} className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white">
                  {loading
                    ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Carregando...</>
                    : <><BarChart2 className="h-4 w-4 mr-2" /> Atualizar Dashboard</>}
                </Button>
              </div>
            </div>
          </form>

          {/* Tags de filtros ativos */}
          {filtrosAtivos && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filtros.type && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full flex items-center gap-1">
                  Tipo: <strong>{TIPO_LABEL[filtros.type] ?? filtros.type}</strong>
                  <button type="button" onClick={() => setFiltros(f => ({ ...f, type: '' }))} className="ml-1 hover:text-indigo-900">×</button>
                </span>
              )}
              {filtros.status && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
                  Status: <strong>{STATUS_LABEL[filtros.status]?.label ?? filtros.status}</strong>
                  <button type="button" onClick={() => setFiltros(f => ({ ...f, status: '' }))} className="ml-1 hover:text-purple-900">×</button>
                </span>
              )}
              {filtros.classroomId && turmaAtiva && (
                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full flex items-center gap-1">
                  Turma: <strong>{turmaAtiva.name ?? turmaAtiva.nome ?? turmaAtiva.code}</strong>
                  <button type="button" onClick={() => setFiltros(f => ({ ...f, classroomId: '' }))} className="ml-1 hover:text-teal-900">×</button>
                </span>
              )}
              {filtros.teacherId && professorAtivo && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full flex items-center gap-1">
                  Professor: <strong>{professorAtivo.name ?? professorAtivo.nome}</strong>
                  <button type="button" onClick={() => setFiltros(f => ({ ...f, teacherId: '' }))} className="ml-1 hover:text-orange-900">×</button>
                </span>
              )}
              {filtros.dataInicio && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex items-center gap-1">
                  De: <strong>{fmtData(filtros.dataInicio)}</strong>
                  <button type="button" onClick={() => setFiltros(f => ({ ...f, dataInicio: '' }))} className="ml-1 hover:text-gray-900">×</button>
                </span>
              )}
              {filtros.dataFim && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex items-center gap-1">
                  Até: <strong>{fmtData(filtros.dataFim)}</strong>
                  <button type="button" onClick={() => setFiltros(f => ({ ...f, dataFim: '' }))} className="ml-1 hover:text-gray-900">×</button>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {loading && <LoadingState message="Carregando dashboard..." />}

      {!loading && relatorio && (
        <>
          {/* ── KPIs Principais ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="col-span-1">
              <KpiCard icon={ShoppingCart} label="Total Requisições" value={fmt(relatorio.total)}
                sub={`${fmt(relatorio.quantidadeTotal)} itens`} color="border-indigo-200"
                trend={tendencia !== null ? { value: tendencia, label: 'tendência' } : undefined} />
            </div>
            <div className="col-span-1">
              <KpiCard icon={DollarSign} label="Custo Estimado" value={fmtBRL(relatorio.custoEstimadoTotal)}
                sub={`Ticket médio: ${fmtBRL(ticketMedio)}`} color="border-blue-200" />
            </div>
            <div className="col-span-1">
              <KpiCard icon={CheckCircle} label="Aprovadas" value={`${taxaAprovacao}%`}
                sub={`${fmt(relatorio.aprovados)} req.`} color="border-green-200" />
            </div>
            <div className="col-span-1">
              <KpiCard icon={XCircle} label="Rejeitadas" value={`${taxaRejeicao}%`}
                sub={`${fmt(relatorio.rejeitados)} req.`} color="border-red-200" />
            </div>
            <div className="col-span-1">
              <KpiCard icon={Package} label="Entregues" value={`${taxaEntrega}%`}
                sub={`${fmt(relatorio.entregues)} entregues`} color="border-purple-200" />
            </div>
            <div className="col-span-1">
              <KpiCard icon={Clock} label="Pendentes" value={fmt(relatorio.pendentes)}
                sub={`${pct(relatorio.pendentes, relatorio.total)}% do total`} color="border-yellow-200" />
            </div>
            <div className="col-span-1">
              <KpiCard icon={Users} label="Professores" value={fmt(relatorio.porProfessor?.length ?? 0)}
                sub="com requisições" color="border-teal-200" />
            </div>
          </div>

          {/* ── Abas de Navegação ───────────────────────────────────────────── */}
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
            {(['overview', 'turmas', 'professores', 'graficos', 'detalhes'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${(activeTab as string) === tab ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab === 'overview' ? 'Visão Geral'
                  : tab === 'turmas' ? 'Por Turma'
                  : tab === 'professores' ? 'Por Professor'
                  : tab === 'graficos' ? 'Gráficos'
                  : 'Detalhes'}
              </button>
            ))}
          </div>

          {/* ── ABA: VISÃO GERAL ─────────────────────────────────────────────── */}
          {(activeTab as string) === 'overview' && (
            <div className="space-y-6">
              {/* Evolução Temporal */}
              {serieMensalFmt.length > 0 && (
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base text-gray-700 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-indigo-500" /> Evolução Temporal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={serieMensalFmt} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="gradReq" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradAprov" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number, name: string) => [fmt(v), name]} />
                        <Legend />
                        <Area type="monotone" dataKey="requisicoes" name="Requisições" stroke="#6366f1" fill="url(#gradReq)" strokeWidth={2} dot={{ r: 3 }} />
                        <Area type="monotone" dataKey="aprovadas" name="Aprovadas" stroke="#22c55e" fill="url(#gradAprov)" strokeWidth={2} dot={{ r: 3 }} />
                        <Area type="monotone" dataKey="entregues" name="Entregues" stroke="#a855f7" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Por Tipo de Consumo */}
                {topCategorias.length > 0 && (
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base text-gray-700 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-indigo-500" /> Consumo por Tipo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={topCategorias} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                          <Tooltip formatter={(v: number, name: string) => [name === 'custo' ? fmtBRL(v) : fmt(v), name === 'custo' ? 'Custo' : 'Requisições']} />
                          <Bar dataKey="total" name="Requisições" radius={[0, 4, 4, 0]}>
                            {topCategorias.map((_, i) => (
                              <Cell key={i} fill={CATEGORIA_CORES[Object.keys(CATEGORIA_CORES)[i % Object.keys(CATEGORIA_CORES).length]] ?? '#6366f1'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-3 space-y-1">
                        {topCategorias.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORIA_CORES[Object.keys(CATEGORIA_CORES)[i % Object.keys(CATEGORIA_CORES).length]] ?? '#6366f1' }} />
                            <span className="text-gray-600 flex-1">{c.name}</span>
                            <span className="text-gray-400">{pct(c.total, relatorio.total)}%</span>
                            {c.custo > 0 && <span className="text-gray-500 font-medium">{fmtBRL(c.custo)}</span>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Distribuição por Status */}
                {pieStatus.length > 0 && (
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base text-gray-700 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-500" /> Distribuição por Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={pieStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                            dataKey="value" nameKey="name" paddingAngle={2}>
                            {pieStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip formatter={(v: number, name: string) => [fmt(v), name]} />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {pieStatus.map((s, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.fill }} />
                            <span className="text-gray-600">{s.name}</span>
                            <span className="text-gray-400 ml-auto">{pct(s.value, relatorio.total)}%</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Métricas analíticas */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-base text-gray-700">Métricas Analíticas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Média de itens/req.</p>
                      <p className="text-xl font-bold text-gray-800">
                        {relatorio.total > 0 ? (relatorio.quantidadeTotal / relatorio.total).toFixed(1) : '—'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Ticket médio</p>
                      <p className="text-xl font-bold text-gray-800">{fmtBRL(ticketMedio)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Taxa de aprovação</p>
                      <p className="text-xl font-bold text-green-600">{taxaAprovacao}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Taxa de entrega</p>
                      <p className="text-xl font-bold text-purple-600">{taxaEntrega}%</p>
                    </div>
                    {tendencia !== null && (
                      <div className="col-span-2 md:col-span-4 bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                        {tendencia >= 0
                          ? <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0" />
                          : <TrendingDown className="h-5 w-5 text-red-500 flex-shrink-0" />}
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Tendência: {tendencia >= 0 ? '+' : ''}{tendencia}% vs período anterior equivalente
                          </p>
                          <p className="text-xs text-gray-400">Comparando 1ª metade vs 2ª metade da série temporal disponível</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── ABA: POR TURMA ───────────────────────────────────────────────── */}
          {(activeTab as string) === 'turmas' && (
            <div className="space-y-6">
              {relatorio.porTurma.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">Nenhum dado de turma disponível</p>
                  <p className="text-gray-400 text-sm mt-1">As requisições podem não ter turma vinculada</p>
                </div>
              ) : (
                <>
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base text-gray-700 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-teal-500" /> Consumo por Turma
                        <span className="text-xs font-normal text-gray-400 ml-auto">{relatorio.porTurma.length} turmas</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={Math.max(160, relatorio.porTurma.length * 40)}>
                        <BarChart data={relatorio.porTurma} layout="vertical" margin={{ top: 0, right: 20, left: 100, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={100} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="total" name="Total" fill="#6366f1" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="aprovados" name="Aprovadas" fill="#22c55e" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Tabela detalhada por turma */}
                  <Card className="border border-gray-200">
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500">Turma</th>
                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Requisições</th>
                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Aprovadas</th>
                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Taxa Aprov.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {relatorio.porTurma.sort((a, b) => b.total - a.total).map((t, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="py-2 px-4 text-gray-700 font-medium">{t.nome}</td>
                              <td className="py-2 px-4 text-gray-700 text-right">{fmt(t.total)}</td>
                              <td className="py-2 px-4 text-green-600 text-right">{fmt(t.aprovados)}</td>
                              <td className="py-2 px-4 text-right">
                                <span className={`text-xs font-medium ${pct(t.aprovados, t.total) >= 70 ? 'text-green-600' : pct(t.aprovados, t.total) >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                                  {pct(t.aprovados, t.total)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ── ABA: POR PROFESSOR ───────────────────────────────────────────── */}
          {(activeTab as string) === 'professores' && (
            <div className="space-y-6">
              {(!relatorio.porProfessor || relatorio.porProfessor.length === 0) ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">Nenhum dado de professor disponível</p>
                  <p className="text-gray-400 text-sm mt-1">As requisições podem não ter professor vinculado</p>
                </div>
              ) : (
                <>
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base text-gray-700 flex items-center gap-2">
                        <Users className="h-4 w-4 text-indigo-500" /> Top Professores por Consumo
                        <span className="text-xs font-normal text-gray-400 ml-auto">{relatorio.porProfessor.length} professores</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {relatorio.porProfessor.map((p, i) => {
                          const pctAprov = pct(p.aprovadas, p.requisicoes);
                          return (
                            <div key={p.teacherId} className="flex items-center gap-3">
                              <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-sm font-medium text-gray-700 truncate">{p.nome}</span>
                                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{fmt(p.requisicoes)} req.</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct(p.requisicoes, relatorio.porProfessor[0].requisicoes)}%` }} />
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="text-xs text-green-600 font-medium">{pctAprov}% aprov.</span>
                                {p.custoEstimado > 0 && <p className="text-xs text-gray-400">{fmtBRL(p.custoEstimado)}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tabela detalhada por professor */}
                  <Card className="border border-gray-200">
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500">#</th>
                            <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500">Professor</th>
                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Requisições</th>
                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Aprovadas</th>
                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Entregues</th>
                            <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500">Custo Est.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {relatorio.porProfessor.map((p, i) => (
                            <tr key={p.teacherId} className="hover:bg-gray-50 transition-colors">
                              <td className="py-2 px-4 text-gray-400 text-xs">{i + 1}</td>
                              <td className="py-2 px-4 text-gray-700 font-medium">{p.nome}</td>
                              <td className="py-2 px-4 text-gray-700 text-right">{fmt(p.requisicoes)}</td>
                              <td className="py-2 px-4 text-green-600 text-right">{fmt(p.aprovadas)}</td>
                              <td className="py-2 px-4 text-purple-600 text-right">{fmt(p.entregues)}</td>
                              <td className="py-2 px-4 text-gray-700 text-right text-xs">{p.custoEstimado > 0 ? fmtBRL(p.custoEstimado) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ── ABA: GRÁFICOS ────────────────────────────────────────────────── */}
          {(activeTab as string) === 'graficos' && (
            <div className="space-y-6">
              {/* Custo por Mês */}
              {serieMensalFmt.length > 0 && (
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base text-gray-700">Custo Estimado por Mês</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={serieMensalFmt} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtBRL(v)} />
                        <Tooltip formatter={(v: number) => [fmtBRL(v), 'Custo Estimado']} />
                        <Bar dataKey="custoEstimado" name="Custo Estimado" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Itens por Mês */}
              {serieMensalFmt.length > 0 && (
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base text-gray-700">Volume de Itens por Mês</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={serieMensalFmt} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [fmt(v), 'Itens']} />
                        <Bar dataKey="itens" name="Itens" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Custo por Tipo de Consumo */}
              {topCategorias.filter(c => c.custo > 0).length > 0 && (
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base text-gray-700">Custo por Tipo de Consumo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={topCategorias.filter(c => c.custo > 0)} layout="vertical" margin={{ top: 0, right: 20, left: 80, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => fmtBRL(v)} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                        <Tooltip formatter={(v: number) => [fmtBRL(v), 'Custo']} />
                        <Bar dataKey="custo" name="Custo" radius={[0, 4, 4, 0]}>
                          {topCategorias.filter(c => c.custo > 0).map((_, i) => (
                            <Cell key={i} fill={CATEGORIA_CORES[Object.keys(CATEGORIA_CORES)[i % Object.keys(CATEGORIA_CORES).length]] ?? '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── ABA: DETALHES ────────────────────────────────────────────────── */}
          {(activeTab as string) === 'detalhes' && (
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-base text-gray-700 flex items-center justify-between">
                  <span>Detalhes das Requisições</span>
                  <span className="text-xs font-normal text-gray-400">{relatorio.detalhes.length} itens</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {relatorio.detalhes.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">Nenhuma requisição encontrada</p>
                    <p className="text-gray-400 text-sm mt-1">Ajuste os filtros para ver resultados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Código</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Título</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Turma</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Professor</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Prior.</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Qtd</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Custo</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Solicitado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {relatorio.detalhes.map(d => (
                          <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-3 text-gray-400 font-mono text-xs">{d.code}</td>
                            <td className="py-2 px-3 text-gray-700 font-medium max-w-[200px] truncate" title={d.titulo}>{d.titulo}</td>
                            <td className="py-2 px-3 text-gray-500 text-xs">{TIPO_LABEL[d.tipo] ?? d.tipo}</td>
                            <td className="py-2 px-3 text-gray-600 text-xs">{d.turma || '—'}</td>
                            <td className="py-2 px-3 text-gray-600 text-xs max-w-[120px] truncate" title={d.professor ?? ''}>{d.professor || '—'}</td>
                            <td className="py-2 px-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABEL[d.status]?.cor ?? 'bg-gray-100 text-gray-600'}`}>
                                {STATUS_LABEL[d.status]?.label ?? d.status}
                              </span>
                            </td>
                            <td className={`py-2 px-3 text-xs ${PRIORITY_LABEL[d.prioridade]?.cor ?? 'text-gray-500'}`}>
                              {PRIORITY_LABEL[d.prioridade]?.label ?? d.prioridade}
                            </td>
                            <td className="py-2 px-3 text-gray-700 text-right">{fmt(d.quantidade)}</td>
                            <td className="py-2 px-3 text-gray-700 text-right text-xs">{d.custoEstimado != null ? fmtBRL(d.custoEstimado) : '—'}</td>
                            <td className="py-2 px-3 text-gray-400 text-xs">{fmtData(d.dataSolicitacao)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!loading && !relatorio && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <BarChart2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">Clique em "Atualizar Dashboard" para carregar os dados</p>
        </div>
      )}
    </PageShell>
  );
}
