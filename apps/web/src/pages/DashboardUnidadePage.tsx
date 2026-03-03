/**
 * Dashboard de Unidade — Gestão Operacional
 * Acesso: Direção, Coordenação Pedagógica, Administrativo, Secretaria, Nutricionista
 * CORRIGIDO: usa dados reais de /coordenacao/dashboard/unidade
 */
import { useState, useEffect, useCallback } from 'react';
import { IndicatorsCards } from '../components/ui/IndicatorsCards';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle, CheckCircle, Clock, ShoppingCart,
  BookOpen, RefreshCw, ChevronRight, Package,
} from 'lucide-react';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { formatPedagogicalDate } from '../lib/formatDate';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface TurmaReal {
  id: string;
  nome: string;
  totalAlunos: number;
  professor: string | null;
  chamadaFeita: boolean;
}

interface RequisicaoReal {
  id: string;
  title: string;
  createdBy: string;
  requestedDate: string;
  classroomId: string | null;
  priority: string;
  status?: string;
}

interface PlanejamentoReal {
  id: string;
  title: string;
  createdBy: string;
  startDate: string;
  endDate: string;
  classroomId: string;
  status: string;
}

interface DadosMateriais {
  categoria: string;
  quantidade: number;
}

interface TurmaSemChamada {
  id: string;
  name: string;
}

interface PlanejamentoParado {
  id: string;
  title: string;
  updatedAt: string;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function DashboardUnidadePage() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'pendencias' | 'alertas' | 'materiais' | 'planejamentos'>('pendencias');

  const [turmas, setTurmas] = useState<TurmaReal[]>([]);
  const [requisicoes, setRequisicoes] = useState<RequisicaoReal[]>([]);
  const [planejamentos, setPlanejamentos] = useState<PlanejamentoReal[]>([]);
  const [dadosMateriais, setDadosMateriais] = useState<DadosMateriais[]>([]);
  const [turmasSemChamada, setTurmasSemChamada] = useState<TurmaSemChamada[]>([]);
  const [planejamentosParados, setPlanejamentosParados] = useState<PlanejamentoParado[]>([]);
  const [indicators, setIndicators] = useState({
    totalAlunos: 0,
    totalTurmas: 0,
    requisicoesAbertas: 0,
    alertasAtivos: 0,
  });

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await http.get('/coordenacao/dashboard/unidade');
      const raw = res.data ?? {};
      const ind = raw.indicadores ?? {};
      const turmasArr: TurmaReal[] = Array.isArray(raw.turmas) ? raw.turmas : [];
      const reqArr: RequisicaoReal[] = Array.isArray(raw.requisicoesPendentesDetalhes)
        ? raw.requisicoesPendentesDetalhes
        : [];
      const planArr: PlanejamentoReal[] = Array.isArray(raw.planejamentosParaRevisao)
        ? raw.planejamentosParaRevisao
        : [];

      setIndicators({
        totalAlunos: ind.totalAlunos ?? 0,
        totalTurmas: ind.totalTurmas ?? turmasArr.length,
        requisicoesAbertas: ind.requisicoesPendentes ?? reqArr.length,
        alertasAtivos: (ind.planejamentosEmRevisao ?? 0) + (ind.planejamentosRascunho ?? 0) + (ind.totalTurmas - (ind.turmasComChamadaHoje ?? ind.totalTurmas)),
      });

      setTurmas(turmasArr);
      setRequisicoes(reqArr);
      setPlanejamentos(planArr);

      // Alertas operacionais
      const alertas = raw.alertas ?? {};
      setTurmasSemChamada(Array.isArray(alertas.turmasSemChamadaHoje) ? alertas.turmasSemChamadaHoje : []);
      setPlanejamentosParados(Array.isArray(alertas.planejamentosParados) ? alertas.planejamentosParados : []);

      // Agrupa requisições por categoria para o gráfico
      const categorias: Record<string, number> = {};
      reqArr.forEach((r) => {
        const cat = r.priority === 'alta' ? 'Urgente'
          : r.priority === 'baixa' ? 'Baixa Prio.'
          : 'Normal';
        categorias[cat] = (categorias[cat] ?? 0) + 1;
      });
      setDadosMateriais(Object.entries(categorias).map(([categoria, quantidade]) => ({ categoria, quantidade })));

    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const aprovarRequisicao = async (id: string) => {
    try {
      await http.patch(`/material-requests/${id}/review`, { decision: 'APPROVED' });
      setRequisicoes(prev => prev.filter(r => r.id !== id));
      setIndicators(k => ({ ...k, requisicoesAbertas: Math.max(0, k.requisicoesAbertas - 1) }));
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const rejeitarRequisicao = async (id: string) => {
    try {
      await http.patch(`/material-requests/${id}/review`, { decision: 'REJECTED' });
      setRequisicoes(prev => prev.filter(r => r.id !== id));
      setIndicators(k => ({ ...k, requisicoesAbertas: Math.max(0, k.requisicoesAbertas - 1) }));
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const labelPrioridade = (p: string) => {
    if (p === 'alta') return '🔴 Urgente';
    if (p === 'baixa') return 'Baixa prioridade';
    return 'Prioridade normal';
  };

  const labelStatus = (status: string) => {
    const mapa: Record<string, string> = {
      RASCUNHO: 'Rascunho',
      EM_REVISAO: 'Em Revisão',
      APROVADO: 'Aprovado',
      DEVOLVIDO: 'Devolvido',
    };
    return mapa[status] ?? status;
  };

  const corStatus = (status: string) => {
    const mapa: Record<string, string> = {
      RASCUNHO: 'bg-gray-100 text-gray-600',
      EM_REVISAO: 'bg-yellow-100 text-yellow-700',
      APROVADO: 'bg-emerald-100 text-emerald-700',
      DEVOLVIDO: 'bg-orange-100 text-orange-700',
    };
    return mapa[status] ?? 'bg-gray-100 text-gray-600';
  };

  const ABAS = [
    { id: 'pendencias', label: 'Pendências', icone: <Clock className="h-4 w-4" /> },
    { id: 'alertas', label: 'Alertas', icone: <AlertTriangle className="h-4 w-4" /> },
    { id: 'materiais', label: 'Requisições', icone: <ShoppingCart className="h-4 w-4" /> },
    { id: 'planejamentos', label: 'Planejamentos', icone: <BookOpen className="h-4 w-4" /> },
  ] as const;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-600" />
            Gestão da Unidade
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Controle operacional — pendências, alertas, materiais e planejamentos
          </p>
        </div>
        <button
          onClick={carregarDados}
          disabled={carregando}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 self-start"
        >
          <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          <strong>Erro ao carregar dados:</strong> {erro}
        </div>
      )}

      {/* Alertas operacionais no topo — turmas sem chamada e planejamentos parados */}
      {turmasSemChamada.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4">
          <p className="text-sm font-bold text-amber-800">
            ⚠️ {turmasSemChamada.length} turma(s) sem chamada hoje
          </p>
          {turmasSemChamada.map((t) => (
            <p key={t.id} className="text-xs text-amber-700 mt-1">• {t.name}</p>
          ))}
        </div>
      )}
      {planejamentosParados.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-4">
          <p className="text-sm font-bold text-red-800">
            🔴 {planejamentosParados.length} planejamento(s) devolvido(s) sem resposta há 3+ dias
          </p>
          {planejamentosParados.map((p) => (
            <p key={p.id} className="text-xs text-red-700 mt-1">
              • {p.title} — devolvido em {formatPedagogicalDate(p.updatedAt)}
            </p>
          ))}
        </div>
      )}
      {/* Indicadores reais da Unidade */}
      <IndicatorsCards
        title="Indicadores da Unidade"
        loading={carregando}
        error={!!erro && indicators.totalAlunos === 0}
        onRefresh={carregarDados}
        items={[
          { label: 'Total de Alunos',      value: indicators.totalAlunos,        tone: 'info' },
          { label: 'Turmas Ativas',         value: indicators.totalTurmas,        tone: 'success' },
          { label: 'Requisições Abertas',  value: indicators.requisicoesAbertas, tone: indicators.requisicoesAbertas > 0 ? 'warning' : 'default' },
          { label: 'Planos p/ Revisar',    value: indicators.alertasAtivos,      tone: indicators.alertasAtivos > 0 ? 'danger' : 'default' },
        ]}
      />

      {/* Gráfico de requisições por prioridade */}
      {dadosMateriais.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Requisições de Materiais por Prioridade</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={dadosMateriais} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis dataKey="categoria" type="category" tick={{ fontSize: 12 }} width={100} />
              <Tooltip />
              <Bar dataKey="quantidade" name="Requisições" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Abas */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {ABAS.map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                abaAtiva === aba.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {aba.icone}
              {aba.label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* Aba: Pendências — turmas com/sem chamada feita */}
          {abaAtiva === 'pendencias' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-3">
                Chamada diária por turma — {turmas.filter(t => t.chamadaFeita).length} de {turmas.length} realizadas hoje
              </p>
              {carregando && turmas.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Carregando turmas...</p>
              )}
              {!carregando && turmas.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Nenhuma turma encontrada.</p>
              )}
              {turmas.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    !t.chamadaFeita ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {!t.chamadaFeita
                      ? <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      : <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    }
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.nome}</p>
                      <p className="text-xs text-gray-500">
                        {t.professor ?? 'Sem professor atribuído'} · {t.totalAlunos} alunos
                      </p>
                    </div>
                  </div>
                  <div className="text-xs">
                    {t.chamadaFeita
                      ? <span className="text-emerald-600 font-medium">Chamada feita ✅</span>
                      : <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pendente</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Aba: Alertas — turmas sem chamada + planejamentos em revisão + parados */}
          {abaAtiva === 'alertas' && (() => {
            const planRevisao = planejamentos.filter(p => p.status === 'EM_REVISAO');
            const totalAlertas = turmasSemChamada.length + planRevisao.length + planejamentosParados.length;
            return (
              <div className="space-y-4">
                {totalAlertas === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-400" />
                    <p>Nenhum alerta ativo no momento</p>
                  </div>
                ) : (
                  <>
                    {/* Turmas sem chamada hoje */}
                    {turmasSemChamada.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-600 uppercase mb-2">Turmas sem chamada hoje ({turmasSemChamada.length})</p>
                        <div className="space-y-2">
                          {turmasSemChamada.map(t => (
                            <div key={t.id} className="border border-red-200 bg-red-50 rounded-lg p-3 flex items-center gap-3">
                              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                              <span className="text-sm font-medium text-red-800">{t.name}</span>
                              <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Sem chamada</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Planejamentos em revisão */}
                    {planRevisao.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-600 uppercase mb-2">Planejamentos aguardando revisão ({planRevisao.length})</p>
                        <div className="space-y-2">
                          {planRevisao.map(p => (
                            <div key={p.id} className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-800">{p.title}</span>
                                <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Em Revisão</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 ml-6">
                                {new Date(p.startDate).toLocaleDateString('pt-BR')} → {new Date(p.endDate).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Planejamentos parados (sem atualização há mais de 7 dias) */}
                    {planejamentosParados.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Planejamentos sem atualização ({planejamentosParados.length})</p>
                        <div className="space-y-2">
                          {planejamentosParados.map(p => (
                            <div key={p.id} className="border border-gray-200 bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                              <BookOpen className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{p.title}</span>
                              <span className="ml-auto text-xs text-gray-400">
                                {new Date(p.updatedAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* Aba: Requisições de Materiais */}
          {abaAtiva === 'materiais' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-3">
                Requisições enviadas pelos professores — encaminhadas à Coordenadora Pedagógica
              </p>
              {carregando && requisicoes.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Carregando requisições...</p>
              )}
              {!carregando && requisicoes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>Nenhuma requisição pendente</p>
                </div>
              ) : requisicoes.map((req) => (
                <div key={req.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800">{req.title}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {labelPrioridade(req.priority)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(req.requestedDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => aprovarRequisicao(req.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Aprovar
                      </button>
                      <button
                        onClick={() => rejeitarRequisicao(req.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        Devolver
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Aba: Planejamentos */}
          {abaAtiva === 'planejamentos' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-3">
                Planejamentos por turma — {planejamentos.length} no total
              </p>
              {carregando && planejamentos.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Carregando planejamentos...</p>
              )}
              {!carregando && planejamentos.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum planejamento encontrado</p>
                </div>
              )}
              {planejamentos.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.startDate).toLocaleDateString('pt-BR')} → {new Date(p.endDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${corStatus(p.status)}`}>
                      {labelStatus(p.status)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
