/**
 * Dashboard do Diretor
 * Acesso: UNIDADE_DIRETOR
 * Abas: Visão Geral | Aprovação de Pedidos | Equipe | Relatórios
 */
import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/ui/PageShell';
import http from '../api/http';
import { useAuth } from '../app/AuthProvider';
import {
  LayoutDashboard, ShoppingCart, Users, FileText,
  CheckCircle, XCircle, Clock, RefreshCw, Eye,
  TrendingUp, AlertTriangle, BookOpen, ChevronRight, TriangleAlert,
} from 'lucide-react';
import { OcorrenciasPanel } from '../components/dashboard/OcorrenciasPanel';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface PedidoCompra {
  id: string;
  mesReferencia: string;
  status: string;
  observacoes?: string;
  criadoEm: string;
  unit?: { id: string; name: string };
  itens: {
    id: string;
    categoria: string;
    descricao: string;
    quantidade: number;
    unidadeMedida?: string;
    custoEstimado?: number;
  }[];
}

interface DashboardData {
  totalCriancas: number;
  totalTurmas: number;
  totalProfessores: number;
  pedidosPendentes: number;
  planejamentosAtivos: number;
  // Pedagógico
  diariosHoje: number;
  diariosEstaSemana: number;
  turmasComChamadaHoje: number;
  planejamentosEmRevisao: number;
  rdicIniciadosTrimestre: number;
  rdicAprovadosTrimestre: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  RASCUNHO:   { label: 'Rascunho',   color: 'text-gray-600',   bg: 'bg-gray-100'   },
  ENVIADO:    { label: 'Enviado',    color: 'text-blue-700',   bg: 'bg-blue-100'   },
  EM_ANALISE: { label: 'Em Análise', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  APROVADO:   { label: 'Aprovado',   color: 'text-green-700',  bg: 'bg-green-100'  },
  COMPRADO:   { label: 'Comprado',   color: 'text-purple-700', bg: 'bg-purple-100' },
  EM_ENTREGA: { label: 'Em Entrega', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  ENTREGUE:   { label: 'Entregue',   color: 'text-green-800',  bg: 'bg-green-200'  },
  CANCELADO:  { label: 'Cancelado',  color: 'text-red-700',    bg: 'bg-red-100'    },
};

const CAT_LABEL: Record<string, string> = {
  ALIMENTACAO: 'Alimentação', PEDAGOGICO: 'Pedagógico',
  HIGIENE: 'Higiene', LIMPEZA: 'Limpeza',
  MANUTENCAO: 'Manutenção', ADMINISTRATIVO: 'Administrativo', OUTRO: 'Outro',
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export function DashboardDiretorPage() {
  const { user } = useAuth();
  const [aba, setAba] = useState<'geral' | 'pedidos' | 'equipe' | 'relatorios' | 'ocorrencias'>('geral');

  // ── Estado: Visão Geral ──
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [loadingDados, setLoadingDados] = useState(false);
  const [alertasPedagogicos, setAlertasPedagogicos] = useState<string[]>([]);

  // ── Estado: Pedidos ──
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);
  const [aprovando, setAprovando] = useState<string | null>(null);
  const [obsAprovacao, setObsAprovacao] = useState('');
  const [msgSucesso, setMsgSucesso] = useState('');
  const [msgErro, setMsgErro] = useState('');

  // ── Estado: Equipe ──
  const [equipe, setEquipe] = useState<{ id: string; firstName: string; lastName: string; email: string; roles: any[] }[]>([]);
  const [loadingEquipe, setLoadingEquipe] = useState(false);

  // ── Carregar Visão Geral ──
  const carregarDados = useCallback(async () => {
    setLoadingDados(true);
    try {
      const unitId = (user as any)?.unitId;
      const hoje = new Date().toISOString().slice(0, 10);
      const inicioSemana = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const [criancasRes, turmasRes, profRes, pedidosRes, planRes, coordRes, rdic1Res] = await Promise.allSettled([
        http.get('/children', { params: { unitId, limit: 1 } }),
        http.get('/lookup/classrooms/accessible', { params: { unitId } }),
        http.get('/lookup/teachers/accessible', { params: { unitId } }),
        http.get('/pedidos-compra', { params: { unitId, status: 'ENVIADO' } }),
        http.get('/plannings', { params: { unitId, status: 'EM_REVISAO', limit: 1 } }),
        http.get('/coordenacao/dashboard/unidade', { params: unitId ? { unitId } : {} }),
        http.get('/rdic/turma/status', { params: { periodo: '1º Trimestre', anoLetivo: 2026, ...(unitId ? { unitId } : {}) } }).catch(() => ({ data: null })),
      ]);

      const coordData = coordRes.status === 'fulfilled' ? coordRes.value.data : null;
      const ind = coordData?.indicadores ?? {};
      const rdic1Data = rdic1Res.status === 'fulfilled' ? (rdic1Res.value as any)?.data : null;

      const diariosHoje = ind.diariosHoje ?? 0;
      const turmasComChamada = ind.turmasComChamadaHoje ?? 0;
      const totalTurmasVal = turmasRes.status === 'fulfilled' ? (Array.isArray(turmasRes.value.data) ? turmasRes.value.data.length : 0) : 0;
      const planEmRevisao = ind.planejamentosEmRevisao ?? (planRes.status === 'fulfilled' ? (planRes.value.data?.total ?? 0) : 0);

      const rdicTotal = rdic1Data?.contagem?.total ?? 0;
      const rdicAprov = (rdic1Data?.contagem?.aprovado ?? 0) + (rdic1Data?.contagem?.finalizado ?? 0) + (rdic1Data?.contagem?.publicado ?? 0);
      const rdicIniciados = rdicTotal - (rdic1Data?.contagem?.pendente ?? rdicTotal);

      // Alertas automáticos
      const alertas: string[] = [];
      if (turmasComChamada < totalTurmasVal && totalTurmasVal > 0) {
        alertas.push(`${totalTurmasVal - turmasComChamada} turma(s) sem chamada hoje`);
      }
      if (planEmRevisao > 0) {
        alertas.push(`${planEmRevisao} planejamento(s) aguardando revisão`);
      }
      if (rdicTotal > 0 && rdicIniciados / rdicTotal < 0.3) {
        alertas.push(`RDIC do 1º Trimestre: apenas ${Math.round((rdicIniciados / rdicTotal) * 100)}% iniciados`);
      }
      setAlertasPedagogicos(alertas);

      setDados({
        totalCriancas: criancasRes.status === 'fulfilled' ? (criancasRes.value.data?.total ?? criancasRes.value.data?.length ?? 0) : 0,
        totalTurmas: totalTurmasVal,
        totalProfessores: profRes.status === 'fulfilled' ? (Array.isArray(profRes.value.data) ? profRes.value.data.length : 0) : 0,
        pedidosPendentes: pedidosRes.status === 'fulfilled' ? (Array.isArray(pedidosRes.value.data) ? pedidosRes.value.data.length : pedidosRes.value.data?.data?.length ?? 0) : 0,
        planejamentosAtivos: planEmRevisao,
        diariosHoje,
        diariosEstaSemana: ind.diariosEstaSemana ?? diariosHoje,
        turmasComChamadaHoje: turmasComChamada,
        planejamentosEmRevisao: planEmRevisao,
        rdicIniciadosTrimestre: rdicIniciados,
        rdicAprovadosTrimestre: rdicAprov,
      });
    } catch {
      setDados(null);
    } finally {
      setLoadingDados(false);
    }
  }, [user]);

  // ── Carregar Pedidos Pendentes de Aprovação ──
  const carregarPedidos = useCallback(async () => {
    setLoadingPedidos(true);
    try {
      const { data } = await http.get('/pedidos-compra', {
        params: { unitId: (user as any)?.unitId },
      });
      const lista = Array.isArray(data) ? data : data?.data ?? [];
      // Mostrar apenas ENVIADOS (aguardando aprovação do Diretor) e APROVADOS recentes
      const filtrados = lista.filter((p: PedidoCompra) =>
        ['ENVIADO', 'APROVADO', 'EM_ANALISE', 'COMPRADO', 'EM_ENTREGA', 'ENTREGUE'].includes(p.status),
      );
      setPedidos(filtrados);
    } catch {
      setPedidos([]);
    } finally {
      setLoadingPedidos(false);
    }
  }, [user]);

  // ── Carregar Equipe ──
  const carregarEquipe = useCallback(async () => {
    setLoadingEquipe(true);
    try {
      const { data } = await http.get('/admin/users', {
        params: { unitId: (user as any)?.unitId, limit: 50 },
      });
      setEquipe(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      setEquipe([]);
    } finally {
      setLoadingEquipe(false);
    }
  }, [user]);

  useEffect(() => { carregarDados(); }, [carregarDados]);
  useEffect(() => { if (aba === 'pedidos') carregarPedidos(); }, [aba, carregarPedidos]);
  useEffect(() => { if (aba === 'equipe') carregarEquipe(); }, [aba, carregarEquipe]);

  // ── Aprovar Pedido ──
  const aprovarPedido = async (pedidoId: string) => {
    setAprovando(pedidoId);
    setMsgErro('');
    setMsgSucesso('');
    try {
      await http.patch(`/pedidos-compra/${pedidoId}/status`, {
        status: 'APROVADO',
        observacoes: obsAprovacao || undefined,
      });
      setMsgSucesso('Pedido aprovado com sucesso! Será enviado à Mantenedora.');
      setObsAprovacao('');
      setPedidoExpandido(null);
      await carregarPedidos();
    } catch (e: any) {
      setMsgErro(e?.response?.data?.message ?? 'Erro ao aprovar pedido.');
    } finally {
      setAprovando(null);
    }
  };

  // ── Rejeitar Pedido ──
  const rejeitarPedido = async (pedidoId: string) => {
    if (!obsAprovacao.trim()) {
      setMsgErro('Informe o motivo da rejeição antes de cancelar.');
      return;
    }
    setAprovando(pedidoId);
    setMsgErro('');
    try {
      await http.patch(`/pedidos-compra/${pedidoId}/status`, {
        status: 'CANCELADO',
        observacoes: obsAprovacao,
      });
      setMsgSucesso('Pedido devolvido para revisão.');
      setObsAprovacao('');
      setPedidoExpandido(null);
      await carregarPedidos();
    } catch (e: any) {
      setMsgErro(e?.response?.data?.message ?? 'Erro ao rejeitar pedido.');
    } finally {
      setAprovando(null);
    }
  };

  const pedidosEnviados = pedidos.filter((p) => p.status === 'ENVIADO');

  return (
    <PageShell
      title="Painel do Diretor"
      subtitle={`Bem-vindo, ${((user?.nome as string) || '').split(' ')[0] || 'Diretor(a)'}! Gestão e aprovações da unidade.`}
    >
      {/* Alertas de topo */}
      {msgSucesso && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {msgSucesso}
          <button onClick={() => setMsgSucesso('')} className="ml-auto text-green-500 hover:text-green-700">✕</button>
        </div>
      )}
      {msgErro && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {msgErro}
          <button onClick={() => setMsgErro('')} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Badge de pedidos pendentes */}
      {pedidosEnviados.length > 0 && aba !== 'pedidos' && (
        <div
          className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setAba('pedidos')}
        >
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">
              {pedidosEnviados.length} pedido{pedidosEnviados.length !== 1 ? 's' : ''} aguardando sua aprovação
            </p>
            <p className="text-xs text-blue-600">Clique para revisar e aprovar</p>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-500" />
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {([
          { id: 'geral', label: 'Visão Geral', icon: LayoutDashboard },
          { id: 'pedidos', label: `Pedidos${pedidosEnviados.length > 0 ? ` (${pedidosEnviados.length})` : ''}`, icon: ShoppingCart },
          { id: 'equipe', label: 'Equipe', icon: Users },
          { id: 'relatorios', label: 'Relatórios', icon: FileText },
          { id: 'ocorrencias', label: 'Ocorrências', icon: TriangleAlert },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              aba === id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Aba: Visão Geral ── */}
      {aba === 'geral' && (
        <div className="space-y-6">
          {loadingDados ? (
            <div className="text-center py-12 text-gray-500">Carregando dados da unidade...</div>
          ) : (
            <>
              {/* ── Alertas automáticos ── */}
              {alertasPedagogicos.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-amber-800">Atenção necessária hoje</span>
                  </div>
                  <ul className="space-y-1">
                    {alertasPedagogicos.map((a, i) => (
                      <li key={i} className="text-sm text-amber-700 flex items-start gap-1.5">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── Cards operacionais ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Crianças',       value: dados?.totalCriancas ?? 0,    icon: Users,       color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100' },
                  { label: 'Turmas',         value: dados?.totalTurmas ?? 0,      icon: BookOpen,    color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
                  { label: 'Professores',    value: dados?.totalProfessores ?? 0, icon: Users,       color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                  { label: 'Pedidos Pend.',  value: dados?.pedidosPendentes ?? 0, icon: ShoppingCart,color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
                ].map(({ label, value, icon: Icon, color, bg, border }) => (
                  <div key={label} className={`${bg} ${border} rounded-2xl border p-4`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <span className="text-xs font-medium text-gray-500">{label}</span>
                    </div>
                    <span className={`text-3xl font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* ── Pulso pedagógico de hoje ── */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Pulso Pedagógico — Hoje
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Chamada */}
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {(dados?.turmasComChamadaHoje ?? 0) >= (dados?.totalTurmas ?? 1)
                        ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        : <Clock className="h-3.5 w-3.5 text-amber-500" />
                      }
                    </div>
                    <p className="text-xl font-bold text-gray-800">
                      {dados?.turmasComChamadaHoje ?? 0}/{dados?.totalTurmas ?? 0}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Chamadas feitas</p>
                  </div>

                  {/* Diários */}
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <p className="text-xl font-bold text-gray-800">{dados?.diariosHoje ?? 0}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Diários hoje</p>
                  </div>

                  {/* Planejamentos em revisão */}
                  <div className={`rounded-xl border p-3 text-center ${(dados?.planejamentosEmRevisao ?? 0) > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Eye className={`h-3.5 w-3.5 ${(dados?.planejamentosEmRevisao ?? 0) > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-xl font-bold ${(dados?.planejamentosEmRevisao ?? 0) > 0 ? 'text-amber-700' : 'text-gray-800'}`}>
                      {dados?.planejamentosEmRevisao ?? 0}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Planos p/ revisar</p>
                  </div>

                  {/* RDIC trimestre */}
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
                    </div>
                    <p className="text-xl font-bold text-gray-800">
                      {dados?.rdicAprovadosTrimestre ?? 0}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">RDIC aprovados 1T</p>
                  </div>
                </div>

                {/* Barra de cobertura de chamada */}
                {(dados?.totalTurmas ?? 0) > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Cobertura de chamada hoje</span>
                      <span className="font-semibold">
                        {Math.round(((dados?.turmasComChamadaHoje ?? 0) / (dados?.totalTurmas ?? 1)) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.round(((dados?.turmasComChamadaHoje ?? 0) / (dados?.totalTurmas ?? 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="bg-white rounded-xl border p-5 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setAba('pedidos')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Pedidos de Compra</h3>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                  {pedidosEnviados.length > 0 ? (
                    <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <Clock className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-semibold text-orange-800">{pedidosEnviados.length} aguardando aprovação</p>
                        <p className="text-xs text-orange-600">Clique para revisar</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhum pedido pendente de aprovação</p>
                  )}
                </div>

                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Ações Rápidas</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setAba('pedidos')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-700">Aprovar pedidos de compra</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                    </button>
                    <button
                      onClick={() => setAba('equipe')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors"
                    >
                      <Users className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-gray-700">Ver equipe da unidade</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                    </button>
                    <button
                      onClick={() => setAba('relatorios')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors"
                    >
                      <FileText className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">Acessar relatórios</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Aba: Aprovação de Pedidos ── */}
      {aba === 'pedidos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Pedidos de Compra da Unidade</h2>
            <button
              onClick={carregarPedidos}
              disabled={loadingPedidos}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingPedidos ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {loadingPedidos ? (
            <div className="text-center py-12 text-gray-500">Carregando pedidos...</div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhum pedido encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pedidos aguardando aprovação primeiro */}
              {pedidosEnviados.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-orange-800 mb-1">
                    ⏳ {pedidosEnviados.length} pedido{pedidosEnviados.length !== 1 ? 's' : ''} aguardando sua aprovação
                  </p>
                  <p className="text-xs text-orange-600">Após aprovação, o pedido será enviado automaticamente à Mantenedora.</p>
                </div>
              )}

              {pedidos.map((p) => {
                const st = STATUS_CONFIG[p.status] ?? { label: p.status, color: 'text-gray-600', bg: 'bg-gray-100' };
                const isEnviado = p.status === 'ENVIADO';
                const isOpen = pedidoExpandido === p.id;
                const totalEst = p.itens.reduce((acc, i) => acc + (i.custoEstimado ?? 0) * i.quantidade, 0);

                return (
                  <div key={p.id} className={`bg-white rounded-xl border overflow-hidden ${isEnviado ? 'border-orange-300 shadow-sm' : ''}`}>
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-semibold text-gray-800">
                            Pedido — {p.mesReferencia}
                            {isEnviado && <span className="ml-2 text-xs text-orange-600 font-normal">⏳ Aguarda aprovação</span>}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.itens.length} item{p.itens.length !== 1 ? 'ns' : ''} ·
                            {totalEst > 0 ? ` R$ ${totalEst.toFixed(2)} est.` : ' sem custo estimado'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                          {st.label}
                        </span>
                        <button
                          onClick={() => setPedidoExpandido(isOpen ? null : p.id)}
                          className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                        >
                          <Eye className="w-3 h-3" />
                          {isOpen ? 'Fechar' : 'Ver itens'}
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t">
                        {/* Tabela de itens */}
                        <div className="p-5">
                          <table className="w-full text-sm mb-4">
                            <thead>
                              <tr className="text-xs text-gray-500 border-b">
                                <th className="text-left pb-2">Categoria</th>
                                <th className="text-left pb-2">Descrição</th>
                                <th className="text-center pb-2">Qtd</th>
                                <th className="text-center pb-2">Unid.</th>
                                <th className="text-right pb-2">Custo Est.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.itens.map((i) => (
                                <tr key={i.id} className="border-b last:border-0">
                                  <td className="py-2">
                                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                      {CAT_LABEL[i.categoria] ?? i.categoria}
                                    </span>
                                  </td>
                                  <td className="py-2 text-gray-700">{i.descricao}</td>
                                  <td className="py-2 text-center text-gray-700">{i.quantidade}</td>
                                  <td className="py-2 text-center text-gray-500">{i.unidadeMedida ?? '—'}</td>
                                  <td className="py-2 text-right text-gray-700">
                                    {i.custoEstimado ? `R$ ${(i.custoEstimado * i.quantidade).toFixed(2)}` : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            {totalEst > 0 && (
                              <tfoot>
                                <tr className="border-t font-semibold">
                                  <td colSpan={4} className="pt-2 text-gray-600">Total estimado</td>
                                  <td className="pt-2 text-right text-blue-700">R$ {totalEst.toFixed(2)}</td>
                                </tr>
                              </tfoot>
                            )}
                          </table>

                          {/* Ações de aprovação (apenas para ENVIADO) */}
                          {isEnviado && (
                            <div className="border-t pt-4 space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Observações (opcional para aprovação, obrigatório para rejeição)
                                </label>
                                <textarea
                                  rows={2}
                                  placeholder="Adicione observações sobre este pedido..."
                                  value={obsAprovacao}
                                  onChange={(e) => setObsAprovacao(e.target.value)}
                                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                                />
                              </div>
                              <div className="flex gap-3 justify-end">
                                <button
                                  onClick={() => rejeitarPedido(p.id)}
                                  disabled={aprovando === p.id}
                                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                  {aprovando === p.id ? 'Processando...' : 'Devolver para Revisão'}
                                </button>
                                <button
                                  onClick={() => aprovarPedido(p.id)}
                                  disabled={aprovando === p.id}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  {aprovando === p.id ? 'Aprovando...' : 'Aprovar e Enviar à Mantenedora'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Observações do pedido */}
                          {p.observacoes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border text-sm text-gray-600">
                              <span className="font-medium">Observações: </span>{p.observacoes}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Aba: Equipe ── */}
      {aba === 'equipe' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Equipe da Unidade</h2>
            <button
              onClick={carregarEquipe}
              disabled={loadingEquipe}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingEquipe ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
          {loadingEquipe ? (
            <div className="text-center py-12 text-gray-500">Carregando equipe...</div>
          ) : equipe.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhum membro da equipe encontrado</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Nome</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">E-mail</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Papel</th>
                  </tr>
                </thead>
                <tbody>
                  {equipe.map((m) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {m.firstName} {m.lastName}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{m.email}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 font-medium">
                          {m.roles?.[0]?.level ?? 'UNIDADE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Aba: Relatórios ── */}
      {aba === 'relatorios' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Acesse os relatórios da unidade pelos links abaixo.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Relatório de Diário por Período', desc: 'Atividades registradas em um período', href: '/app/relatorios' },
              { label: 'Planejamentos da Unidade', desc: 'Status e histórico de planejamentos', href: '/app/planejamentos' },
              { label: 'Pedidos de Compra', desc: 'Histórico de pedidos e status', href: '/app/pedidos-compra' },
              { label: 'Painel de Alergias', desc: 'Restrições alimentares das crianças', href: '/app/painel-alergias' },
            ].map(({ label, desc, href }) => (
              <a
                key={href}
                href={href}
                className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow flex items-center justify-between group"
              >
                <div>
                  <p className="font-semibold text-gray-800 group-hover:text-blue-700">{label}</p>
                  <p className="text-xs text-gray-500 mt-1">{desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Aba: Ocorrências ── */}
      {aba === 'ocorrencias' && (
        <div className="space-y-4">
          <OcorrenciasPanel titulo="Ocorrências da Unidade" unitId={user?.unitId ?? undefined} />
        </div>
      )}
    </PageShell>
  );
}
