import { useState, useEffect } from 'react';
import { PageShell } from '@/components/ui/PageShell';
import http from '../api/http';
import { useUnitScope } from '../contexts/UnitScopeContext';
import { UnitScopeSelector } from '../components/select/UnitScopeSelector';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles } from '../app/RoleProtectedRoute';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from 'recharts';
import {
  BarChart2,
  RefreshCw,
  AlertTriangle,
  PackageOpen,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface CategoriaStats {
  total: number;
  aprovados: number;
  pendentes: number;
  rejeitados: number;
}
interface TurmaStats {
  nome: string;
  total: number;
  aprovados: number;
}
interface RelatorioConsumo {
  total: number;
  aprovados: number;
  pendentes: number;
  rejeitados: number;
  custoEstimadoTotal: number;
  porCategoria: Record<string, CategoriaStats>;
  porTurma: TurmaStats[];
  porStatus: Record<string, number>;
}

// ─── Cores ────────────────────────────────────────────────────────────────────
const CORES_STATUS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
const CORES_BARRAS = { aprovados: '#22c55e', pendentes: '#f59e0b', rejeitados: '#ef4444' };

const CATEGORIA_LABEL: Record<string, string> = {
  PEDAGOGICO: 'Pedagógico',
  HIGIENE_PESSOAL: 'Higiene Pessoal',
  OUTROS: 'Outros',
  CONSUMIVEL: 'Consumível',
  PERMANENTE: 'Permanente',
  LIMPEZA: 'Limpeza',
  ALIMENTACAO: 'Alimentação',
};

// ─── Tooltip customizado ──────────────────────────────────────────────────────
const TooltipCustom = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function DashboardConsumoMateriaisPage() {
  const { user } = useAuth();
  const roles = normalizeRoles(user);
  const isCentral = roles.includes('STAFF_CENTRAL') || roles.includes('MANTENEDORA') || roles.includes('DEVELOPER');
  const { selectedUnitId: ctxUnitId } = useUnitScope();

  const [relatorio, setRelatorio] = useState<RelatorioConsumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');  
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [classroomId, setClassroomId] = useState('');
  const [turmas, setTurmas] = useState<{ id: string; name: string }[]>([]);

  const carregar = async () => {
    setLoading(true);
    setErro('');
    try {
      const params: Record<string, string> = {};
      if (dataInicio) params.dataInicio = dataInicio;
      if (dataFim) params.dataFim = dataFim;
      if (classroomId) params.classroomId = classroomId;
      // Aplicar filtro de unidade do contexto global (para STAFF_CENTRAL)
      if (ctxUnitId) params.unitId = ctxUnitId;
      const { data } = await http.get('/material-requests/relatorio-consumo', { params });
      setRelatorio(data);
    } catch (e: any) {
      setErro('Não foi possível carregar o relatório de consumo.');
    } finally {
      setLoading(false);
    }
  };

  const carregarTurmas = async () => {
    try {
      const { data } = await http.get('/lookup/classrooms/accessible');
      setTurmas(data || []);
    } catch {}
  };

  // Recarregar quando o escopo de unidade mudar
  useEffect(() => { carregar(); carregarTurmas(); }, [ctxUnitId]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Dados para gráficos ───────────────────────────────────────────────────
  const dadosCategoria = relatorio
    ? Object.entries(relatorio.porCategoria).map(([key, v]) => ({
        name: CATEGORIA_LABEL[key] ?? key,
        Aprovados: v.aprovados,
        Pendentes: v.pendentes,
        Rejeitados: v.rejeitados,
      }))
    : [];

  const dadosTurma = relatorio?.porTurma?.slice(0, 10).map((t) => ({
    name: t.nome.length > 14 ? t.nome.slice(0, 14) + '…' : t.nome,
    Total: t.total,
    Aprovados: t.aprovados,
  })) ?? [];

  const dadosStatus = relatorio
    ? Object.entries(relatorio.porStatus).map(([k, v]) => ({ name: k, value: v }))
    : [];

  return (
    <PageShell
      title="Consumo de Materiais — Gráficos"
      subtitle="Análise de requisições por categoria, turma e período"
    >
      {/* ─── Seletor de unidade (apenas para STAFF_CENTRAL) ─── */}
      {isCentral && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 flex items-center gap-3">
          <span className="text-sm font-medium text-indigo-700">Escopo:</span>
          <UnitScopeSelector showNetworkOption compact />
          {!ctxUnitId && (
            <span className="text-xs text-indigo-500">Exibindo dados de toda a rede</span>
          )}
        </div>
      )}
      {/* ─── Filtros ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Turma (opcional)</label>
            <select
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas as turmas</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={carregar}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : erro ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">{erro}</p>
          <button onClick={carregar} className="mt-3 text-sm text-red-600 underline">Tentar novamente</button>
        </div>
      ) : relatorio ? (
        <>
          {/* ─── Cards de resumo ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total de requisições', value: relatorio.total, icon: <PackageOpen className="h-5 w-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Aprovadas / Entregues', value: relatorio.aprovados, icon: <CheckCircle className="h-5 w-5" />, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Pendentes', value: relatorio.pendentes, icon: <Clock className="h-5 w-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'Rejeitadas', value: relatorio.rejeitados, icon: <XCircle className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-50' },
            ].map((c) => (
              <div key={c.label} className={`rounded-xl ${c.bg} p-4`}>
                <div className={`flex items-center gap-2 ${c.color} mb-1`}>
                  {c.icon}
                  <span className="text-2xl font-bold">{c.value}</span>
                </div>
                <p className="text-xs text-gray-600">{c.label}</p>
              </div>
            ))}
          </div>

          {/* ─── Gráfico de barras por categoria ─── */}
          {dadosCategoria.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-800">Requisições por Categoria</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dadosCategoria} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<TooltipCustom />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Aprovados" fill={CORES_BARRAS.aprovados} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pendentes" fill={CORES_BARRAS.pendentes} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Rejeitados" fill={CORES_BARRAS.rejeitados} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ─── Gráficos lado a lado: turmas + status ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Barras por turma */}
            {dadosTurma.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Requisições por Turma (Top 10)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dadosTurma} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip content={<TooltipCustom />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Total" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Aprovados" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pizza por status */}
            {dadosStatus.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Distribuição por Status</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={dadosStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {dadosStatus.map((_, i) => (
                        <Cell key={i} fill={CORES_STATUS[i % CORES_STATUS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} requisições`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legenda manual */}
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {dadosStatus.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-1 text-xs text-gray-600">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ background: CORES_STATUS[i % CORES_STATUS.length] }} />
                      {d.name} ({d.value})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Taxa de aprovação ─── */}
          {relatorio.total > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Taxa de Aprovação Geral</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-4 rounded-full bg-gradient-to-r from-indigo-500 to-green-500 transition-all duration-700"
                    style={{ width: `${Math.round((relatorio.aprovados / relatorio.total) * 100)}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-indigo-700 min-w-[4rem] text-right">
                  {Math.round((relatorio.aprovados / relatorio.total) * 100)}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {relatorio.aprovados} aprovadas de {relatorio.total} total no período selecionado
              </p>
            </div>
          )}
        </>
      ) : null}
    </PageShell>
  );
}
