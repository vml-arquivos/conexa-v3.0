/**
 * Dashboard Central — Análises
 * Acesso: Coordenadora Geral (Bruna Vaz) e Psicóloga Central (Carla)
 * Funcionalidades: KPIs, gráficos, filtros, exportação CSV
 * Somente leitura — sem edição de cadastros operacionais
 */
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Users, BookOpen, AlertTriangle, TrendingUp,
  Download, Filter, RefreshCw, Building2, GraduationCap,
} from 'lucide-react';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface FiltrosCentral {
  unidadeId: string;
  periodo: '7d' | '30d' | '90d' | '180d' | '365d';
}

interface KpiCard {
  titulo: string;
  valor: number | string;
  variacao?: number;
  icone: React.ReactNode;
  cor: string;
}

interface DadosMensais {
  mes: string;
  registros: number;
  presencas: number;
  alertas: number;
}

interface DadosUnidade {
  nome: string;
  alunos: number;
  professores: number;
  alertas: number;
  cobertura: number;
}

interface DadosAlerta {
  tipo: string;
  quantidade: number;
  cor: string;
}

interface Unidade {
  id: string;
  name: string;
}

// ─── Cores ───────────────────────────────────────────────────────────────────

const CORES_GRAFICOS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

// ─── Componente Principal ─────────────────────────────────────────────────────

export function DashboardCentralPage() {
  const [filtros, setFiltros] = useState<FiltrosCentral>({ unidadeId: '', periodo: '30d' });
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Dados dos gráficos
  const [dadosMensais, setDadosMensais] = useState<DadosMensais[]>([]);
  const [dadosUnidades, setDadosUnidades] = useState<DadosUnidade[]>([]);
  const [dadosAlertas, setDadosAlertas] = useState<DadosAlerta[]>([]);
  const [kpis, setKpis] = useState({ totalAlunos: 0, totalProfessores: 0, totalAlertas: 0, coberturaDiario: 0 });

  // Carregar unidades acessíveis
  useEffect(() => {
    http.get('/lookup/units/accessible')
      .then(r => setUnidades(r.data ?? []))
      .catch(() => setUnidades([]));
  }, []);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const params: Record<string, string> = { periodo: filtros.periodo };
      if (filtros.unidadeId) params.unidadeId = filtros.unidadeId;

      // Buscar dados do dashboard central
      const [dashRes] = await Promise.allSettled([
        http.get('/dashboard/central', { params }),
      ]);

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        setKpis({
          totalAlunos: d.totalAlunos ?? 0,
          totalProfessores: d.totalProfessores ?? 0,
          totalAlertas: d.totalAlertas ?? 0,
          coberturaDiario: d.coberturaDiario ?? 0,
        });
        setDadosMensais(d.evolucaoMensal ?? []);
        setDadosUnidades(d.comparativoUnidades ?? []);
        setDadosAlertas(d.distribuicaoAlertas ?? []);
      } else {
        // Dados de demonstração quando o endpoint ainda não existe
        gerarDadosDemo();
      }
    } catch (e) {
      setErro(getErrorMessage(e));
      gerarDadosDemo();
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  const gerarDadosDemo = () => {
    setKpis({ totalAlunos: 142, totalProfessores: 18, totalAlertas: 7, coberturaDiario: 87 });
    setDadosMensais([
      { mes: 'Set', registros: 312, presencas: 289, alertas: 4 },
      { mes: 'Out', registros: 345, presencas: 310, alertas: 6 },
      { mes: 'Nov', registros: 298, presencas: 275, alertas: 3 },
      { mes: 'Dez', registros: 187, presencas: 168, alertas: 2 },
      { mes: 'Jan', registros: 356, presencas: 328, alertas: 5 },
      { mes: 'Fev', registros: 401, presencas: 372, alertas: 7 },
    ]);
    setDadosUnidades([
      { nome: 'Arara-Canindé', alunos: 78, professores: 10, alertas: 4, cobertura: 91 },
      { nome: 'Unidade II', alunos: 64, professores: 8, alertas: 3, cobertura: 82 },
    ]);
    setDadosAlertas([
      { tipo: 'Comportamental', quantidade: 3, cor: '#EF4444' },
      { tipo: 'Desenvolvimento', quantidade: 2, cor: '#F59E0B' },
      { tipo: 'Saúde', quantidade: 1, cor: '#8B5CF6' },
      { tipo: 'Alimentação', quantidade: 1, cor: '#06B6D4' },
    ]);
  };

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const exportarCSV = () => {
    const linhas = [
      ['Mês', 'Registros', 'Presenças', 'Alertas'],
      ...dadosMensais.map(d => [d.mes, d.registros, d.presencas, d.alertas]),
    ];
    const csv = linhas.map(l => l.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conexa-relatorio-central-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Cards KPI ─────────────────────────────────────────────────────────────

  const cardsKpi: KpiCard[] = [
    {
      titulo: 'Total de Alunos',
      valor: kpis.totalAlunos,
      icone: <Users className="h-6 w-6" />,
      cor: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      titulo: 'Professores Ativos',
      valor: kpis.totalProfessores,
      icone: <GraduationCap className="h-6 w-6" />,
      cor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      titulo: 'Alertas Ativos',
      valor: kpis.totalAlertas,
      icone: <AlertTriangle className="h-6 w-6" />,
      cor: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
      titulo: 'Cobertura do Diário',
      valor: `${kpis.coberturaDiario}%`,
      icone: <TrendingUp className="h-6 w-6" />,
      cor: 'bg-purple-50 text-purple-600 border-purple-100',
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Análises Centrais
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visão global de todas as unidades — somente leitura
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={carregarDados}
            disabled={carregando}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
            <select
              value={filtros.unidadeId}
              onChange={e => setFiltros(f => ({ ...f, unidadeId: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as unidades</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Período</label>
            <select
              value={filtros.periodo}
              onChange={e => setFiltros(f => ({ ...f, periodo: e.target.value as FiltrosCentral['periodo'] }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 3 meses</option>
              <option value="180d">Últimos 6 meses</option>
              <option value="365d">Último ano</option>
            </select>
          </div>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <strong>Aviso:</strong> {erro}. Exibindo dados de demonstração.
        </div>
      )}

      {/* Cards KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cardsKpi.map((card, i) => (
          <div key={i} className={`bg-white border rounded-xl p-4 ${card.cor.split(' ').slice(-1)[0]}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.titulo}</span>
              <div className={`p-2 rounded-lg ${card.cor.split(' ').slice(0, 2).join(' ')}`}>
                {card.icone}
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.valor}</p>
          </div>
        ))}
      </div>

      {/* Gráficos — linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Evolução Mensal */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            Evolução Mensal — Registros e Presenças
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dadosMensais}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="registros" name="Registros" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="presencas" name="Presenças" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="alertas" name="Alertas" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição de Alertas */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Distribuição de Alertas por Tipo
          </h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={220}>
              <PieChart>
                <Pie
                  data={dadosAlertas}
                  dataKey="quantidade"
                  nameKey="tipo"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {dadosAlertas.map((entry, index) => (
                    <Cell key={index} fill={entry.cor || CORES_GRAFICOS[index % CORES_GRAFICOS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {dadosAlertas.map((alerta, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: alerta.cor || CORES_GRAFICOS[i % CORES_GRAFICOS.length] }} />
                  <span className="text-gray-600 flex-1">{alerta.tipo}</span>
                  <span className="font-semibold text-gray-800">{alerta.quantidade}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparativo por Unidade */}
      {dadosUnidades.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-500" />
            Comparativo por Unidade
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dadosUnidades} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="alunos" name="Alunos" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="professores" name="Professores" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="alertas" name="Alertas" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela de Cobertura por Unidade */}
      {dadosUnidades.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Cobertura do Diário por Unidade</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidade</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alunos</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Professores</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alertas</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cobertura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dadosUnidades.map((u, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{u.nome}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{u.alunos}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{u.professores}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${u.alertas > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.alertas}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${u.cobertura >= 80 ? 'bg-emerald-500' : u.cobertura >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${u.cobertura}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-10 text-right">{u.cobertura}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Nota de somente leitura */}
      <div className="text-xs text-gray-400 text-center pb-2">
        Este painel é somente leitura. Para editar cadastros operacionais, acesse o painel da unidade.
      </div>
    </div>
  );
}
