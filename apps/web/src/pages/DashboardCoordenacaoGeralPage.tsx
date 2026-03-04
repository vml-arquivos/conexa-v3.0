import { useState, useEffect } from 'react';
import { useApiCache } from '../hooks/useApiCache';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { LoadingState } from '../components/ui/LoadingState';
import http from '../api/http';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, TrendingUp, ShoppingCart,
  BookOpen, ClipboardList, CheckCircle, AlertCircle,
  ChevronRight, BarChart2, Network, Star, Layers, Calendar, ArrowRight, RefreshCw,
} from 'lucide-react';
// lookup local REMOVIDO — aba Matriz agora usa API /curriculum-matrix-entries

interface UnidadeResumo {
  id: string; nome: string;
  totalTurmas: number; totalAlunos: number; totalProfessores: number;
  taxaPresenca: number; requisicoesAbertas: number;
  planejamentosOk: boolean; diariosEstaSemana: number;
  status: 'otimo' | 'atencao' | 'critico';
}
interface DashboardGeral {
  totalUnidades: number; totalAlunos: number; totalProfessores: number;
  mediaPresenca: number; requisicoesAbertas: number;
  unidades: UnidadeResumo[];
}
const STATUS_CONFIG = {
  otimo: { label: 'Otimo', cor: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500', barCor: 'bg-green-500' },
  atencao: { label: 'Atencao', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500', barCor: 'bg-yellow-500' },
  critico: { label: 'Critico', cor: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500', barCor: 'bg-red-500' },
};
const DEMO: DashboardGeral = {
  totalUnidades: 4, totalAlunos: 312, totalProfessores: 28, mediaPresenca: 87, requisicoesAbertas: 5,
  unidades: [
    { id:'1', nome:'Unidade Centro', totalTurmas:6, totalAlunos:89, totalProfessores:8, taxaPresenca:92, requisicoesAbertas:1, planejamentosOk:true, diariosEstaSemana:12, status:'otimo' },
    { id:'2', nome:'Unidade Norte', totalTurmas:5, totalAlunos:74, totalProfessores:7, taxaPresenca:78, requisicoesAbertas:3, planejamentosOk:false, diariosEstaSemana:8, status:'atencao' },
    { id:'3', nome:'Unidade Sul', totalTurmas:4, totalAlunos:61, totalProfessores:6, taxaPresenca:95, requisicoesAbertas:0, planejamentosOk:true, diariosEstaSemana:9, status:'otimo' },
    { id:'4', nome:'Unidade Leste', totalTurmas:6, totalAlunos:88, totalProfessores:7, taxaPresenca:65, requisicoesAbertas:1, planejamentosOk:false, diariosEstaSemana:4, status:'critico' },
  ],
};

export default function DashboardCoordenacaoGeralPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardGeral | null>(null);
  const [filtro, setFiltro] = useState<'todas'|'otimo'|'atencao'|'critico'>('todas');
  const [abaAtiva, setAbaAtiva] = useState<'visao'|'unidades'|'relatorio'|'matriz'|'alunos'|'observacoes'|'psicologia'|'cobertura'|'funil'|'consumo'>('visao');
  // Aba Cobertura Multiunidade
  interface CoberturaUnidade {
    unitId: string; unitName: string;
    totalCriancas: number; totalComRegistro: number; percentual: number;
  }
  interface CentralCoverage {
    startDate: string; endDate: string;
    totalCriancas: number; totalComRegistro: number; percentualGeral: number;
    unidades: CoberturaUnidade[];
  }
  const [coberturaGeral, setCoberturaGeral] = useState<CentralCoverage | null>(null);
  const [loadingCoberturaGeral, setLoadingCoberturaGeral] = useState(false);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>('');
  const apiCache = useApiCache(60_000);

  // Aba Funil Pedagógico
  interface GovernanceFunnel {
    scope: string; unitId: string | null;
    periodo: { inicio: string | null; fim: string | null };
    funnel: { created: number; submitted: number; approved: number; executed: number };
  }
  const [funil, setFunil] = useState<GovernanceFunnel | null>(null);
  const [loadingFunil, setLoadingFunil] = useState(false);
  const [funilStartDate, setFunilStartDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [funilEndDate, setFunilEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [funilUnitId, setFunilUnitId] = useState<string>('');

  // Aba Consumo Rede
  interface ConsumoRedeData {
    escopo: string;
    totais: { requisicoes: number; aprovadas: number; pendentes: number; rejeitadas: number; entregues: number };
    porCategoria: Record<string, { total: number; aprovados: number; pendentes: number; rejeitados: number }>;
    porUnidade: Array<{ nome: string; total: number; aprovados: number; pendentes: number }>;
  }
  const [consumoRede, setConsumoRede] = useState<ConsumoRedeData | null>(null);
  const [loadingConsumoRede, setLoadingConsumoRede] = useState(false);
  const [consumoUnitId, setConsumoUnitId] = useState<string>('');
  const [consumoDataInicio, setConsumoDataInicio] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [consumoDataFim, setConsumoDataFim] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Unidades disponíveis para filtros
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState<Array<{id: string; name: string}>>([]);

  // Aba Matriz — dados reais da API (sem lookup local)
  interface MatrizEntry {
    id: string;
    campoDeExperiencia: string;
    objetivoBNCCCode: string | null;
    objetivoBNCC: string;
    objetivoCurriculo: string;
    intencionalidade: string | null;
    exemploAtividade: string | null;
    date: string;
    matrix: { id: string; name: string; year: number; segment: string };
  }
  const [matrizEntries, setMatrizEntries] = useState<MatrizEntry[]>([]);
  const [loadingMatriz, setLoadingMatriz] = useState(false);
  const [matrizSegFiltro, setMatrizSegFiltro] = useState<string>('todos');
  const [matrizDataFiltro, setMatrizDataFiltro] = useState<string>(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });

  useEffect(() => {
    loadDashboard();
    http.get('/lookup/units/accessible').then(r => {
      const data = r.data;
      setUnidadesDisponiveis(Array.isArray(data) ? data : (data?.units ?? []));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (abaAtiva === 'cobertura' && !coberturaGeral) {
      carregarCoberturaGeral();
    }
    if (abaAtiva === 'matriz') {
      carregarMatriz(matrizDataFiltro);
    }
    if (abaAtiva === 'funil' && !funil) {
      carregarFunil();
    }
    if (abaAtiva === 'consumo' && !consumoRede) {
      carregarConsumoRede();
    }
  }, [abaAtiva]);

  async function carregarFunil(unitId?: string, start?: string, end?: string) {
    setLoadingFunil(true);
    try {
      const params: Record<string, string> = {
        startDate: start ?? funilStartDate,
        endDate: end ?? funilEndDate,
      };
      const uid = unitId ?? funilUnitId;
      if (uid) params.unitId = uid;
      const res = await http.get('/insights/governance/funnel', { params });
      setFunil(res.data);
    } catch {
      setFunil(null);
    } finally {
      setLoadingFunil(false);
    }
  }

  async function carregarConsumoRede(unitId?: string, inicio?: string, fim?: string) {
    setLoadingConsumoRede(true);
    try {
      const params: Record<string, string> = {
        dataInicio: inicio ?? consumoDataInicio,
        dataFim: fim ?? consumoDataFim,
      };
      const uid = unitId ?? consumoUnitId;
      if (uid) params.unitId = uid;
      const res = await http.get('/material-requests/relatorio-consumo', { params });
      setConsumoRede(res.data);
    } catch {
      setConsumoRede(null);
    } finally {
      setLoadingConsumoRede(false);
    }
  }

  async function carregarMatriz(data: string) {
    setLoadingMatriz(true);
    try {
      // Busca entradas da matriz para os próximos 7 dias a partir da data selecionada
      const fim = new Date(data);
      fim.setDate(fim.getDate() + 6);
      const endDate = fim.toISOString().split('T')[0];
      const res = await http.get('/curriculum-matrix-entries', {
        params: { startDate: data, endDate },
      });
      setMatrizEntries(Array.isArray(res.data) ? res.data : (res.data?.entries ?? []));
    } catch {
      setMatrizEntries([]);
    } finally {
      setLoadingMatriz(false);
    }
  }

  async function carregarCoberturaGeral() {
    setLoadingCoberturaGeral(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const data = await apiCache.get('/reports/central/coverage', { startDate: hoje, endDate: hoje }, () =>
        http.get('/reports/central/coverage', { params: { startDate: hoje, endDate: hoje } }).then(r => r.data)
      );
      setCoberturaGeral(data as CentralCoverage);
    } catch {
      // mantém null — UI mostra estado vazio
    } finally {
      setLoadingCoberturaGeral(false);
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await http.get('/coordenacao/dashboard/geral');
      const d = res.data ?? {};
      // Map API response (indicadoresGerais + consolidadoUnidades) to local shape
      if (d.indicadoresGerais && Array.isArray(d.consolidadoUnidades)) {
        const ind = d.indicadoresGerais;
        const mapped: DashboardGeral = {
          totalUnidades: ind.totalUnidades ?? 0,
          totalAlunos: ind.totalAlunos ?? 0,
          totalProfessores: ind.totalProfessores ?? 0,
          mediaPresenca: 0,
          requisicoesAbertas: ind.requisicoesPendentes ?? 0,
          unidades: (d.consolidadoUnidades as any[]).map((u: any) => ({
            id: u.id,
            nome: u.nome,
            totalTurmas: u.totalTurmas ?? 0,
            totalAlunos: u.totalAlunos ?? 0,
            totalProfessores: u.totalProfessores ?? 0,
            taxaPresenca: u.coberturaChamada ?? 0,
            requisicoesAbertas: u.requisicoesPendentes ?? 0,
            planejamentosOk: (u.planejamentosRascunho ?? 0) === 0,
            diariosEstaSemana: u.diariosHoje ?? 0,
            status: u.coberturaChamada >= 90 && u.requisicoesPendentes === 0 ? 'otimo'
                  : u.coberturaChamada < 50 || u.requisicoesPendentes >= 3 ? 'critico'
                  : 'atencao',
          })),
        };
        setDashboard(mapped);
      }
    } catch { /* mantém DEMO */ }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingState message="Carregando painel geral da rede..." />;

  const unidadesFiltradas = filtro === 'todas' ? (dashboard?.unidades ?? []) : (dashboard?.unidades ?? []).filter(u => u.status === filtro);
  const abas = [
    { id:'visao', label:'Visao Geral', icon:<Star className="h-4 w-4"/> },
    { id:'unidades', label:'Por Unidade', icon:<Building2 className="h-4 w-4"/> },
    { id:'relatorio', label:'Relatorio', icon:<BarChart2 className="h-4 w-4"/> },
    { id:'alunos', label:'Alunos por Unidade', icon:<Users className="h-4 w-4"/> },
    { id:'observacoes', label:'Observacoes Individuais', icon:<ClipboardList className="h-4 w-4"/> },
    { id:'psicologia', label:'Desenvolvimento Psicológico', icon:<Network className="h-4 w-4"/> },
    { id:'matriz', label:'Matriz 2026', icon:<Layers className="h-4 w-4"/> },
    { id:'cobertura', label:'Cobertura', icon:<BarChart2 className="h-4 w-4"/> },
    { id:'funil', label:'Funil Pedagógico', icon:<TrendingUp className="h-4 w-4"/> },
    { id:'consumo', label:'Consumo Rede', icon:<ShoppingCart className="h-4 w-4"/> },
  ] as const;
  const filtros = [
    { id:'todas', label:'Todas', count:(dashboard?.unidades ?? []).length },
    { id:'otimo', label:'Otimo', count:(dashboard?.unidades ?? []).filter(u=>u.status==='otimo').length },
    { id:'atencao', label:'Atencao', count:(dashboard?.unidades ?? []).filter(u=>u.status==='atencao').length },
    { id:'critico', label:'Critico', count:(dashboard?.unidades ?? []).filter(u=>u.status==='critico').length },
  ] as const;

  return (
    <PageShell title="Coordenacao Geral da Rede" description="Acompanhe todas as unidades em um so lugar">
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {abas.map(aba => (
          <button key={aba.id} onClick={() => setAbaAtiva(aba.id as typeof abaAtiva)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${abaAtiva===aba.id?'bg-white text-blue-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {aba.icon}{aba.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'visao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {icon:<Building2 className="h-6 w-6 text-blue-600"/>,bg:'bg-blue-100',val:dashboard?.totalUnidades ?? 0,label:'Unidades'},
              {icon:<Users className="h-6 w-6 text-purple-600"/>,bg:'bg-purple-100',val:dashboard?.totalAlunos ?? 0,label:'Criancas na rede'},
              {icon:<Star className="h-6 w-6 text-yellow-600"/>,bg:'bg-yellow-100',val:dashboard?.totalProfessores ?? 0,label:'Professores'},
              {icon:<TrendingUp className="h-6 w-6 text-green-600"/>,bg:'bg-green-100',val:`${dashboard?.mediaPresenca ?? 0}%`,label:'Presenca media'},
            ].map((c,i)=>(
              <Card key={i} className="rounded-2xl border-2 text-center">
                <CardContent className="pt-5 pb-4">
                  <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center mx-auto mb-3`}>{c.icon}</div>
                  <p className="text-3xl font-bold text-gray-800">{c.val}</p>
                  <p className="text-sm text-gray-500 mt-1">{c.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="h-5 w-5 text-blue-500"/>Como estao as unidades hoje?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(dashboard?.unidades ?? []).map(u=>{
                const cfg=STATUS_CONFIG[u.status];
                return (
                  <div key={u.id} className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`}/>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">{u.nome}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cor}`}>{cfg.label}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${cfg.barCor}`} style={{width:`${u.taxaPresenca}%`}}/>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{u.taxaPresenca}% de presenca · {u.totalAlunos} criancas</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {(dashboard?.unidades ?? []).some(u=>u.status!=='otimo') && (
            <Card className="rounded-2xl border-2 border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-orange-800">
                  <AlertCircle className="h-5 w-5"/>Unidades que precisam de atencao
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(dashboard?.unidades ?? []).filter(u=>u.status!=='otimo').map(u=>(
                  <div key={u.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-orange-200">
                    <div>
                      <p className="font-semibold text-sm">{u.nome}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        {u.taxaPresenca<80 && <span>Presenca baixa ({u.taxaPresenca}%)</span>}
                        {!u.planejamentosOk && <span>Planejamentos pendentes</span>}
                        {u.requisicoesAbertas>0 && <span>{u.requisicoesAbertas} pedido(s) aberto(s)</span>}
                      </div>
                    </div>
                    <button onClick={()=>{setFiltro(u.status);setAbaAtiva('unidades');}}
                      className="flex items-center gap-1 text-blue-500 text-sm font-medium hover:text-blue-700">
                      Ver <ChevronRight className="h-4 w-4"/>
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {abaAtiva === 'unidades' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {filtros.map(f=>(
              <button key={f.id} onClick={()=>setFiltro(f.id as typeof filtro)}
                className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${filtro===f.id?'bg-blue-500 text-white border-blue-500':'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                {f.label} ({f.count})
              </button>
            ))}
          </div>
          {unidadesFiltradas.map(u=>{
            const cfg=STATUS_CONFIG[u.status];
            return (
              <Card key={u.id} className={`rounded-2xl border-2 overflow-hidden ${u.status==='critico'?'border-red-300':u.status==='atencao'?'border-yellow-300':'border-green-200'}`}>
                <div className={`px-4 py-2 flex items-center justify-between ${u.status==='critico'?'bg-red-50':u.status==='atencao'?'bg-yellow-50':'bg-green-50'}`}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600"/>
                    <span className="font-bold text-sm">{u.nome}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${cfg.cor}`}>{cfg.label}</span>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-800">{u.totalAlunos}</p>
                      <p className="text-xs text-gray-500">Criancas</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-800">{u.totalTurmas}</p>
                      <p className="text-xs text-gray-500">Turmas</p>
                    </div>
                    <div className={`text-center p-3 rounded-xl ${u.taxaPresenca>=85?'bg-green-50':u.taxaPresenca>=70?'bg-yellow-50':'bg-red-50'}`}>
                      <p className={`text-2xl font-bold ${u.taxaPresenca>=85?'text-green-700':u.taxaPresenca>=70?'text-yellow-700':'text-red-700'}`}>{u.taxaPresenca}%</p>
                      <p className="text-xs text-gray-500">Presenca</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${u.planejamentosOk?'bg-green-50 text-green-700 border-green-200':'bg-red-50 text-red-700 border-red-200'}`}>
                      {u.planejamentosOk?<CheckCircle className="h-3 w-3"/>:<AlertCircle className="h-3 w-3"/>}
                      Planejamentos {u.planejamentosOk?'ok':'pendentes'}
                    </span>
                    <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                      <ClipboardList className="h-3 w-3"/>{u.diariosEstaSemana} diarios esta semana
                    </span>
                    {u.requisicoesAbertas>0 && (
                      <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200">
                        <ShoppingCart className="h-3 w-3"/>{u.requisicoesAbertas} pedido(s) aberto(s)
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {abaAtiva === 'relatorio' && (
        <div className="space-y-4">
          <Card className="rounded-2xl border-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-blue-500"/>Ranking de Presenca por Unidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[...(dashboard?.unidades ?? [])].sort((a,b)=>b.taxaPresenca-a.taxaPresenca).map((u,idx)=>{
                const cfg=STATUS_CONFIG[u.status];
                return (
                  <div key={u.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx===0?'bg-yellow-400 text-white':idx===1?'bg-gray-300 text-white':idx===2?'bg-orange-400 text-white':'bg-gray-100 text-gray-600'}`}>{idx+1}</span>
                        <span className="text-sm font-semibold">{u.nome}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{u.taxaPresenca}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className={`h-3 rounded-full ${cfg.barCor}`} style={{width:`${u.taxaPresenca}%`}}/>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-500"/>Diarios registrados esta semana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(dashboard?.unidades ?? []).map(u=>(
                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium">{u.nome}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {Array.from({length:Math.min(u.diariosEstaSemana,10)}).map((_,i)=>(
                        <span key={i} className="w-3 h-3 bg-blue-400 rounded-sm"/>
                      ))}
                      {u.diariosEstaSemana>10 && <span className="text-xs text-gray-500">+{u.diariosEstaSemana-10}</span>}
                    </div>
                    <span className="text-sm font-bold text-blue-600">{u.diariosEstaSemana}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── ABA MATRIZ 2026 ─── */}
      {abaAtiva === 'matriz' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Matriz Pedagógica 2026 — Dados Reais</h2>
              <p className="text-sm text-gray-500">Objetivos do banco de dados, com Exemplo de Atividade visível para coordenação</p>
            </div>
            <button onClick={() => navigate('/app/planejamento-diario')}
              className="flex items-center gap-1 text-indigo-600 text-sm font-medium hover:text-indigo-800">
              Calendário completo <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data inicial</label>
              <input
                type="date"
                value={matrizDataFiltro}
                onChange={e => {
                  setMatrizDataFiltro(e.target.value);
                  carregarMatriz(e.target.value);
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Segmento</label>
              <select
                value={matrizSegFiltro}
                onChange={e => setMatrizSegFiltro(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="todos">Todos</option>
                <option value="EI01">EI01 (0–18m)</option>
                <option value="EI02">EI02 (19–47m)</option>
                <option value="EI03">EI03 (48–71m)</option>
              </select>
            </div>
            <button
              onClick={() => carregarMatriz(matrizDataFiltro)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </button>
          </div>

          {loadingMatriz ? (
            <div className="text-center py-10 text-gray-400 text-sm">Carregando dados da Matriz...</div>
          ) : matrizEntries.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <Layers className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum objetivo encontrado para o período selecionado</p>
              <p className="text-xs text-gray-300 mt-1">Verifique se há entradas cadastradas na Matriz 2026</p>
            </div>
          ) : (
            <>
              {/* Resumo por segmento */}
              {(() => {
                const SEG_CORES: Record<string, string> = { EI01: 'bg-rose-50 border-rose-200', EI02: 'bg-amber-50 border-amber-200', EI03: 'bg-emerald-50 border-emerald-200' };
                const SEG_TEXT: Record<string, string> = { EI01: 'text-rose-700', EI02: 'text-amber-700', EI03: 'text-emerald-700' };
                const SEG_LABEL: Record<string, string> = { EI01: 'Bebês (0–18m)', EI02: 'Crianças Pequenas (19–47m)', EI03: 'Crianças Maiores (48–71m)' };
                const segs = ['EI01', 'EI02', 'EI03'];
                const filtradas = matrizEntries.filter(e => matrizSegFiltro === 'todos' || e.matrix.segment === matrizSegFiltro);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {segs.filter(s => matrizSegFiltro === 'todos' || s === matrizSegFiltro).map(seg => {
                      const total = filtradas.filter(e => e.matrix.segment === seg).length;
                      return (
                        <Card key={seg} className={`border-2 ${SEG_CORES[seg] ?? 'bg-gray-50 border-gray-200'}`}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`font-bold text-sm ${SEG_TEXT[seg] ?? 'text-gray-700'}`}>{seg}</span>
                              <span className="text-xs text-gray-500">{SEG_LABEL[seg]}</span>
                            </div>
                            <div className="flex items-end gap-2">
                              <span className={`text-3xl font-bold ${SEG_TEXT[seg] ?? 'text-gray-700'}`}>{total}</span>
                              <span className="text-sm text-gray-400 mb-1">objetivos no período</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Tabela de objetivos com exemploAtividade */}
              <Card className="border-2 border-indigo-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                    Objetivos do período — {matrizEntries.filter(e => matrizSegFiltro === 'todos' || e.matrix.segment === matrizSegFiltro).length} registros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Data</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Segmento</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Campo</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Código BNCC</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Objetivo BNCC</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 bg-amber-50">Exemplo de Atividade ✦</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matrizEntries
                          .filter(e => matrizSegFiltro === 'todos' || e.matrix.segment === matrizSegFiltro)
                          .map(entry => {
                            const dateStr = entry.date ? new Date(entry.date).toLocaleDateString('pt-BR') : '—';
                            const SEG_BADGE: Record<string, string> = {
                              EI01: 'bg-rose-100 text-rose-700',
                              EI02: 'bg-amber-100 text-amber-700',
                              EI03: 'bg-emerald-100 text-emerald-700',
                            };
                            return (
                              <tr key={entry.id} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-3 font-medium whitespace-nowrap">{dateStr}</td>
                                <td className="py-2 px-3">
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${SEG_BADGE[entry.matrix.segment] ?? 'bg-gray-100 text-gray-600'}`}>
                                    {entry.matrix.segment}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-xs text-gray-600 max-w-[120px] truncate">
                                  {entry.campoDeExperiencia.replace(/_/g, ' ')}
                                </td>
                                <td className="py-2 px-3">
                                  {entry.objetivoBNCCCode && (
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{entry.objetivoBNCCCode}</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-xs text-gray-700 max-w-[200px]">
                                  <p className="line-clamp-2">{entry.objetivoBNCC}</p>
                                </td>
                                <td className="py-2 px-3 text-xs max-w-[200px] bg-amber-50/30">
                                  {entry.exemploAtividade ? (
                                    <p className="text-amber-800 line-clamp-2">{entry.exemploAtividade}</p>
                                  ) : (
                                    <span className="text-gray-300 italic">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-end">
                    <button onClick={() => navigate('/app/planejamento-diario')}
                      className="flex items-center gap-1 text-indigo-600 text-sm font-medium hover:text-indigo-800">
                      Ver calendário pedagógico completo <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
      {/* ABA: ALUNOS POR UNIDADE */}
      {abaAtiva === 'alunos' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm text-blue-700">
              Selecione uma unidade para visualizar todas as turmas, alunos, chamadas, diários de bordo e RDIC.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(dashboard?.unidades ?? []).map(unidade => (
              <button key={unidade.id}
                onClick={() => navigate(`/app/coordenacao?unitId=${unidade.id}`)}
                className="p-4 bg-white border-2 border-blue-100 rounded-2xl text-left hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{unidade.nome}</p>
                    <p className="text-xs text-gray-400">{unidade.totalTurmas} turmas · {unidade.totalAlunos} alunos · {unidade.totalProfessores} professores</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${unidade.taxaPresenca}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{unidade.taxaPresenca}% presença</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ABA: OBSERVAÇÕES INDIVIDUAIS */}
      {abaAtiva === 'observacoes' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
            <p className="text-sm text-teal-700">
              Visualize as observações individuais de desenvolvimento, comportamento e evolução de todos os alunos de todas as unidades.
              Selecione uma unidade para começar.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(dashboard?.unidades ?? []).map(unidade => (
              <button key={unidade.id}
                onClick={() => navigate(`/app/rdic-geral?unitId=${unidade.id}`)}
                className="p-4 bg-white border-2 border-teal-100 rounded-2xl text-left hover:border-teal-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                    <ClipboardList className="h-6 w-6 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{unidade.nome}</p>
                    <p className="text-xs text-gray-400">{unidade.totalAlunos} alunos · {unidade.totalTurmas} turmas</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ABA: DESENVOLVIMENTO PSICOLÓGICO */}
      {abaAtiva === 'psicologia' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-purple-800 mb-1">Relatórios de Desenvolvimento Psicológico e Mental</p>
            <p className="text-sm text-purple-700">
              Acesse os alertas de desenvolvimento, observações psicológicas e relatórios individuais de evolução de todas as crianças.
              Disponível para coordenadora geral e psicóloga.
            </p>
          </div>

          {/* Alertas por unidade */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Selecione uma unidade para ver os alertas:</p>
            {(dashboard?.unidades ?? []).map(unidade => (
              <div key={unidade.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-purple-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{unidade.nome}</p>
                      <p className="text-xs text-gray-400">{unidade.totalAlunos} alunos · {unidade.totalTurmas} turmas</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium border ${STATUS_CONFIG[unidade.status].cor}`}>
                    {STATUS_CONFIG[unidade.status].label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => navigate(`/app/rdic-geral?unitId=${unidade.id}`)}
                    className="flex flex-col items-center gap-1 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-all">
                    <Network className="h-5 w-5 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">Obs. Psicol.</span>
                  </button>
                  <button
                    onClick={() => navigate(`/app/rdic-geral?unitId=${unidade.id}`)}
                    className="flex flex-col items-center gap-1 p-3 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all">
                    <ClipboardList className="h-5 w-5 text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-700">RDICs</span>
                  </button>
                  <button
                    onClick={() => navigate(`/app/reports?unitId=${unidade.id}`)}
                    className="flex flex-col items-center gap-1 p-3 bg-teal-50 rounded-xl hover:bg-teal-100 transition-all">
                    <TrendingUp className="h-5 w-5 text-teal-600" />
                    <span className="text-xs font-medium text-teal-700">Evolução</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Indicadores consolidados */}
          <div className="bg-white border-2 border-purple-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Indicadores Consolidados — Todas as Unidades</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{dashboard?.totalAlunos ?? 0}</p>
                <p className="text-xs text-gray-500">Total de crianças</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {(dashboard?.unidades ?? []).filter(u => u.status === 'critico').length}
                </p>
                <p className="text-xs text-gray-500">Unidades em alerta crítico</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {(dashboard?.unidades ?? []).filter(u => u.status === 'atencao').length}
                </p>
                <p className="text-xs text-gray-500">Unidades em atenção</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {(dashboard?.unidades ?? []).filter(u => u.status === 'otimo').length}
                </p>
                <p className="text-xs text-gray-500">Unidades ótimas</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ABA: COBERTURA MULTIUNIDADE */}
      {abaAtiva === 'cobertura' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-700">Cobertura de Registros — Rede</h2>
              <p className="text-xs text-gray-400 mt-0.5">Crianças com pelo menos 1 DiaryEvent hoje, por unidade</p>
            </div>
            <button
              onClick={() => { setCoberturaGeral(null); carregarCoberturaGeral(); }}
              className="text-gray-400 hover:text-gray-600 p-1 rounded" title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loadingCoberturaGeral ? (
            <div className="text-center py-10 text-gray-400 text-sm">Carregando cobertura da rede...</div>
          ) : coberturaGeral ? (
            <>
              {/* Indicadores da Rede */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{coberturaGeral.totalComRegistro}</p>
                  <p className="text-xs text-blue-500 mt-1">Com registro hoje</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-700">{coberturaGeral.totalCriancas}</p>
                  <p className="text-xs text-gray-500 mt-1">Total na rede</p>
                </div>
                <div className={`border rounded-xl p-4 text-center ${
                  coberturaGeral.percentualGeral >= 80 ? 'bg-green-50 border-green-200' :
                  coberturaGeral.percentualGeral >= 50 ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-2xl font-bold ${
                    coberturaGeral.percentualGeral >= 80 ? 'text-green-700' :
                    coberturaGeral.percentualGeral >= 50 ? 'text-yellow-700' : 'text-red-700'
                  }`}>{coberturaGeral.percentualGeral}%</p>
                  <p className="text-xs text-gray-500 mt-1">Cobertura geral</p>
                </div>
              </div>

              {/* Barra global */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Cobertura da rede hoje</span>
                  <span className="text-sm font-bold text-gray-600">{coberturaGeral.percentualGeral}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-700 ${
                      coberturaGeral.percentualGeral >= 80 ? 'bg-green-500' :
                      coberturaGeral.percentualGeral >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${coberturaGeral.percentualGeral}%` }}
                  />
                </div>
              </div>

              {/* Comparativo por unidade — ranking */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Comparativo por unidade</p>
                {[...coberturaGeral.unidades]
                  .sort((a, b) => b.percentual - a.percentual)
                  .map((u, idx) => (
                    <div key={u.unitId} className="bg-white border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          idx === 0 ? 'bg-yellow-400 text-white' :
                          idx === 1 ? 'bg-gray-300 text-white' :
                          idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>{idx + 1}</span>
                        <span className="flex-1 font-medium text-sm text-gray-800">{u.unitName}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          u.percentual >= 80 ? 'bg-green-100 text-green-700' :
                          u.percentual >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{u.totalComRegistro}/{u.totalCriancas} · {u.percentual}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            u.percentual >= 80 ? 'bg-green-500' :
                            u.percentual >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${u.percentual}%` }}
                        />
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Alerta unidades críticas */}
              {coberturaGeral.unidades.filter(u => u.percentual < 50).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <p className="text-sm font-semibold text-red-700">Unidades com cobertura crítica (&lt;50%)</p>
                  </div>
                  <div className="space-y-1.5">
                    {coberturaGeral.unidades
                      .filter(u => u.percentual < 50)
                      .map(u => (
                        <div key={u.unitId} className="flex items-center justify-between bg-white border border-red-100 rounded-lg px-3 py-2">
                          <span className="text-sm font-medium text-gray-800">{u.unitName}</span>
                          <span className="text-xs font-bold text-red-600">{u.percentual}%</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <BarChart2 className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum dado de cobertura disponível</p>
              <p className="text-xs text-gray-300 mt-1">Verifique se há crianças e turmas cadastradas</p>
            </div>
          )}
        </div>
      )}


      {/* ABA: FUNIL PEDAGÓGICO */}
      {abaAtiva === 'funil' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-indigo-800 mb-1">Funil de Planejamentos Pedagógicos</p>
              <p className="text-xs text-indigo-600">Acompanhe quantos planejamentos avançaram por cada etapa do fluxo de revisão.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={funilUnitId} onChange={e => setFunilUnitId(e.target.value)}
                className="text-xs border border-indigo-200 rounded-lg px-2 py-1.5 bg-white">
                <option value="">Toda a rede</option>
                {unidadesDisponiveis.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <input type="date" value={funilStartDate} onChange={e => setFunilStartDate(e.target.value)}
                className="text-xs border border-indigo-200 rounded-lg px-2 py-1.5 bg-white" />
              <input type="date" value={funilEndDate} onChange={e => setFunilEndDate(e.target.value)}
                className="text-xs border border-indigo-200 rounded-lg px-2 py-1.5 bg-white" />
              <button onClick={() => { setFunil(null); carregarFunil(funilUnitId, funilStartDate, funilEndDate); }}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
                Aplicar
              </button>
            </div>
          </div>

          {loadingFunil ? (
            <div className="text-center py-10 text-gray-400 text-sm">Carregando funil pedagógico...</div>
          ) : funil ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Criados', val: funil.funnel.created, cor: 'bg-blue-50 border-blue-200 text-blue-700', pct: 100 },
                  { label: 'Submetidos', val: funil.funnel.submitted, cor: 'bg-indigo-50 border-indigo-200 text-indigo-700', pct: funil.funnel.created > 0 ? Math.round(funil.funnel.submitted / funil.funnel.created * 100) : 0 },
                  { label: 'Aprovados', val: funil.funnel.approved, cor: 'bg-green-50 border-green-200 text-green-700', pct: funil.funnel.created > 0 ? Math.round(funil.funnel.approved / funil.funnel.created * 100) : 0 },
                  { label: 'Executados', val: funil.funnel.executed, cor: 'bg-emerald-50 border-emerald-200 text-emerald-700', pct: funil.funnel.created > 0 ? Math.round(funil.funnel.executed / funil.funnel.created * 100) : 0 },
                ].map((item, idx) => (
                  <div key={idx} className={`border rounded-2xl p-4 text-center ${item.cor}`}>
                    <p className="text-3xl font-bold">{item.val}</p>
                    <p className="text-xs font-medium mt-1">{item.label}</p>
                    <p className="text-xs mt-1 opacity-70">{item.pct}% do total</p>
                  </div>
                ))}
              </div>
              {/* Barra de funil visual */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Conversão por etapa</p>
                {[
                  { label: 'Criados → Submetidos', val: funil.funnel.created > 0 ? Math.round(funil.funnel.submitted / funil.funnel.created * 100) : 0, cor: 'bg-indigo-500' },
                  { label: 'Submetidos → Aprovados', val: funil.funnel.submitted > 0 ? Math.round(funil.funnel.approved / funil.funnel.submitted * 100) : 0, cor: 'bg-green-500' },
                  { label: 'Aprovados → Executados', val: funil.funnel.approved > 0 ? Math.round(funil.funnel.executed / funil.funnel.approved * 100) : 0, cor: 'bg-emerald-500' },
                ].map((bar, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{bar.label}</span>
                      <span className="font-bold">{bar.val}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${bar.cor}`} style={{ width: `${bar.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center">
                Escopo: {funil.scope} · Período: {funil.periodo.inicio ?? '—'} a {funil.periodo.fim ?? '—'}
              </p>
            </>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum dado de funil disponível</p>
              <p className="text-xs text-gray-300 mt-1">Verifique se há planejamentos cadastrados no período</p>
            </div>
          )}
        </div>
      )}

      {/* ABA: CONSUMO REDE */}
      {abaAtiva === 'consumo' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800 mb-1">Consumo de Materiais — Rede</p>
              <p className="text-xs text-orange-600">Requisições de materiais consolidadas por unidade e categoria.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={consumoUnitId} onChange={e => setConsumoUnitId(e.target.value)}
                className="text-xs border border-orange-200 rounded-lg px-2 py-1.5 bg-white">
                <option value="">Toda a rede</option>
                {unidadesDisponiveis.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <input type="date" value={consumoDataInicio} onChange={e => setConsumoDataInicio(e.target.value)}
                className="text-xs border border-orange-200 rounded-lg px-2 py-1.5 bg-white" />
              <input type="date" value={consumoDataFim} onChange={e => setConsumoDataFim(e.target.value)}
                className="text-xs border border-orange-200 rounded-lg px-2 py-1.5 bg-white" />
              <button onClick={() => { setConsumoRede(null); carregarConsumoRede(consumoUnitId, consumoDataInicio, consumoDataFim); }}
                className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 transition-colors">
                Aplicar
              </button>
            </div>
          </div>

          {loadingConsumoRede ? (
            <div className="text-center py-10 text-gray-400 text-sm">Carregando consumo da rede...</div>
          ) : consumoRede ? (
            <>
              {/* Cards de totais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total', val: consumoRede.totais.requisicoes, cor: 'bg-gray-50 border-gray-200 text-gray-700' },
                  { label: 'Aprovadas', val: consumoRede.totais.aprovadas, cor: 'bg-green-50 border-green-200 text-green-700' },
                  { label: 'Pendentes', val: consumoRede.totais.pendentes, cor: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                  { label: 'Rejeitadas', val: consumoRede.totais.rejeitadas, cor: 'bg-red-50 border-red-200 text-red-700' },
                ].map((c, i) => (
                  <div key={i} className={`border rounded-2xl p-4 text-center ${c.cor}`}>
                    <p className="text-3xl font-bold">{c.val}</p>
                    <p className="text-xs font-medium mt-1">{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Por unidade */}
              {consumoRede.porUnidade.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Por Unidade</p>
                  <div className="space-y-2">
                    {[...consumoRede.porUnidade]
                      .sort((a, b) => b.total - a.total)
                      .map((u, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-4">{idx + 1}</span>
                          <span className="flex-1 text-sm font-medium text-gray-800">{u.nome}</span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{u.total} req.</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{u.aprovados} apr.</span>
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{u.pendentes} pend.</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Por categoria */}
              {Object.keys(consumoRede.porCategoria).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Por Categoria</p>
                  <div className="space-y-2">
                    {Object.entries(consumoRede.porCategoria)
                      .sort(([,a],[,b]) => b.total - a.total)
                      .map(([cat, data]) => (
                        <div key={cat} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 capitalize">{cat.replace(/_/g, ' ').toLowerCase()}</span>
                          <div className="flex gap-2">
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{data.total}</span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{data.aprovados} apr.</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <ShoppingCart className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum dado de consumo disponível</p>
              <p className="text-xs text-gray-300 mt-1">Verifique se há requisições de materiais no período</p>
            </div>
          )}
        </div>
      )}

    </PageShell>
  );
}
