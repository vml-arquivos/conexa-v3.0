This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: apps/web/src/components/layout/Sidebar.tsx, apps/web/src/app/router.tsx, apps/web/src/pages/DashboardCoordenacaoPedagogicaPage.tsx, apps/web/src/pages/DashboardUnidadePage.tsx
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
apps/web/src/app/router.tsx
apps/web/src/components/layout/Sidebar.tsx
apps/web/src/pages/DashboardCoordenacaoPedagogicaPage.tsx
apps/web/src/pages/DashboardUnidadePage.tsx
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="apps/web/src/pages/DashboardUnidadePage.tsx">
/**
 * Dashboard de Unidade — Gestão Operacional
 * Acesso: Direção, Coordenação Pedagógica, Administrativo, Secretaria, Nutricionista
 * CORRIGIDO: usa dados reais de /coordenacao/dashboard/unidade
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../app/AuthProvider';
import { IndicatorsCards } from '../components/ui/IndicatorsCards';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle, CheckCircle, Clock, ShoppingCart,
  BookOpen, RefreshCw, ChevronRight, Package, TriangleAlert,
} from 'lucide-react';
import { OcorrenciasPanel } from '../components/dashboard/OcorrenciasPanel';
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
  const { user } = useAuth();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'pendencias' | 'alertas' | 'materiais' | 'planejamentos' | 'ocorrencias'>('pendencias');

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
        alertasAtivos: (ind.planejamentosEmRevisao ?? 0) + (ind.planejamentosRascunho ?? 0) + Math.max(0, (ind.totalTurmas ?? 0) - (ind.turmasComChamadaHoje ?? ind.totalTurmas ?? 0)),
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
    { id: 'ocorrencias', label: 'Ocorrências', icone: <TriangleAlert className="h-4 w-4" /> },
  ] as const;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-600" />
            Painel da Coordenação Geral
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Bem-vindo, {((user?.nome as string) || '').split(' ')[0] || 'Coordenador(a)'}! Controle operacional — pendências, alertas, materiais e planejamentos.
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

        {/* ─── OCORRÊNCIAS ─────────────────────────────────────────────── */}
        {abaAtiva === 'ocorrencias' && (
          <OcorrenciasPanel
            titulo="Ocorrências da Unidade"
            unitId={user?.unitId ?? undefined}
          />
        )}
      </div>
    </div>
  );
}
</file>

<file path="apps/web/src/app/router.tsx">
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { PlanningsPage } from '../pages/PlanningsPage';
import { DiaryPage } from '../pages/DiaryPage';
import { MatricesPage } from '../pages/MatricesPage';
import { ReportsPage } from '../pages/ReportsPage';
import TeacherDashboardPage from '../pages/TeacherDashboardPage';
import { MaterialRequestPage } from '../pages/MaterialRequestPage';
import { PedidosCompraPage } from '../pages/PedidosCompraPage';
import { CatalogImportPage } from '../pages/CatalogImportPage';
import { DashboardCentralPage } from '../pages/DashboardCentralPage';
import { DashboardUnidadePage } from '../pages/DashboardUnidadePage';
import { AtendimentoPaisPage } from '../pages/AtendimentoPaisPage';
import DashboardCoordenacaoPedagogicaPage from '../pages/DashboardCoordenacaoPedagogicaPage';
import DashboardCoordenacaoGeralPage from '../pages/DashboardCoordenacaoGeralPage';
import ControleFaltasPage from '../pages/ControleFaltasPage';
import RdxPage from '../pages/RdxPage';
// ─── Novas páginas implementadas ─────────────────────────────────────────────
import PlanejamentosPage from '../pages/PlanejamentosPage';
import RdicRiaPage from '../pages/RdicRiaPage';
import DiarioBordoPage from '../pages/DiarioBordoPage';
import DiarioCalendarioPage from '../pages/DiarioCalendarioPage';
import MatrizPedagogicaPage from '../pages/MatrizPedagogicaPage';
import ConfiguracoesPage from '../pages/ConfiguracoesPage';
import AdminUsuariosPage from '../pages/AdminUsuariosPage';
import AdminUnidadesPage from '../pages/AdminUnidadesPage';
import AdminTurmasPage from '../pages/AdminTurmasPage';
import MeuPerfilPage from '../pages/MeuPerfilPage';
import PlanejamentoDiarioPage from '../pages/PlanejamentoDiarioPage';
import PlanoDeAulaPage from '../pages/PlanoDeAulaPage';
import CoordenacaoPedagogicaPage from '../pages/CoordenacaoPedagogicaPage';
import RelatorioConsumoMateriaisPage from '../pages/RelatorioConsumoMateriaisPage';
import PainelAlergiasPage from '../pages/PainelAlergiasPage';
import DashboardConsumoMateriaisPage from '../pages/DashboardConsumoMateriaisPage';
import RdicCriancaPage from '../pages/RdicCriancaPage';
import SalaDeAulaVirtualPage from '../pages/SalaDeAulaVirtualPage';
import RdicCoordPage from '../pages/RdicCoordPage';
import RdicGeralPage from '../pages/RdicGeralPage';
// ─── Fases 1, 2 e 3 — Central RDIC, Painel Analítico e Painel da Turma ────────────────────
import CentralRdicCriancaPage from '../pages/CentralRdicCriancaPage';
import PainelAnaliticoCriancaPage from '../pages/PainelAnaliticoCriancaPage';
import PainelTurmaPage from '../pages/PainelTurmaPage';
import PainelInteligenciaPage from '../pages/PainelInteligenciaPage';
import ConferenciaPlanejamentoPage from '../pages/ConferenciaPlanejamentoPage';
import { DashboardDiretorPage } from '../pages/DashboardDiretorPage';
import { DashboardNutricionistaPage } from '../pages/DashboardNutricionistaPage';
import DashboardPsicologoPage from '../pages/DashboardPsicologoPage';
import DesenvolvimentoInfantilPage from '../pages/DesenvolvimentoInfantilPage';
// ─── Módulo de Planejamento — Oficina e Painel de Planejamentos ─────────────────────
import PlanoDeAulaNovoPage from '../pages/PlanoDeAulaNovoPage';
import PlanoDeAulaListaPage from '../pages/PlanoDeAulaListaPage';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleProtectedRoute } from './RoleProtectedRoute';
import { RouteErrorBoundary } from '../components/ErrorBoundary';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app/dashboard" replace />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Rotas legadas (mantidas para compatibilidade, sem exposição no menu) ─
      {
        path: 'plannings',
        element: <PlanningsPage />,
        errorElement: <RouteErrorBoundary />,
      },
      {
        // Legada: UI primitiva sem guards de role. Mantida para links externos.
        path: 'diary',
        element: <DiaryPage />,
        errorElement: <RouteErrorBoundary />,
      },
      {
        path: 'matrices',
        element: <MatricesPage />,
        errorElement: <RouteErrorBoundary />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
        errorElement: <RouteErrorBoundary />,
      },
      {
        // Legada: redireciona para a rota canônica com suporte a PROFESSOR_AUXILIAR
        path: 'professor',
        element: <Navigate to="/app/teacher-dashboard" replace />,
      },
      // ─── Painel do Professor ───────────────────────────────────────────────
      {
        path: 'teacher-dashboard',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <TeacherDashboardPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Plano de Aula com Matriz Completa 2026 ──────────────────
      {
        path: 'plano-de-aula',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Planejamento Diário com Calendário Pedagógico 2026 ────────────
      {
        path: 'planejamento-diario',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanejamentoDiarioPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Planejamentos — Painel de Planejamentos (rota canônica do professor) ─────────
      {
        path: 'planejamentos',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaListaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Planejamento individual (visualização) — rota que gerava 404 ─────────
      // Rota adicionada para suportar links /app/planejamentos/:id
      {
        path: 'planejamentos/:id',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaListaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // Legada: PlanejamentosPage (mantida para links internos existentes)
      {
        path: 'planejamentos-legado',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanejamentosPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── RDIC por Criança (professor) ──────────────────────────────────────
      {
        path: 'rdic-crianca',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RdicCriancaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── RDIC Coordenação Pedagógica da Unidade (revisão e aprovação) ────────
      {
        path: 'rdic-coord',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <RdicCoordPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── RDIC Coordenação Geral (somente leitura, apenas PUBLICADOS) ────────
      {
        path: 'rdic-geral',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RdicGeralPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── RDIC & RIA ────────────────────────────────────────────────────────
      {
        path: 'rdic-ria',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RdicRiaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── RDIC alias (/app/rdic → RdicCriancaPage) ─────────────────────────────────
      {
        path: 'rdic',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RdicCriancaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Observações Individuais alias (/app/coordenacao/observacoes) ────────────
      {
        path: 'coordenacao/observacoes',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DesenvolvimentoInfantilPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Diário da Turma — Calendário por Dia Letivo (PR 1: nova entrada principal) ────
      {
        path: 'diario-calendario',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'DEVELOPER']}>
            <DiarioCalendarioPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Diário de Bordo com Microgestos (preservado — entrada via calendário ou link direto) ──
      {
        path: 'diario-de-bordo',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DiarioBordoPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Matriz Pedagógica 2026 ────────────────────────────────────────────
      {
        path: 'matriz-pedagogica',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <MatrizPedagogicaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Configurações ────────────────────────────────────────────────────
      {
        path: 'configuracoes',
        element: (
          <ProtectedRoute>
            <ConfiguracoesPage />
          </ProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Requisições de Materiais ─────────────────────────────────────────
      {
        path: 'material-requests',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <MaterialRequestPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Pedidos de Compra ────────────────────────────────────────────────
      {
        path: 'pedidos-compra',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PedidosCompraPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Catálogo de Produtos (importação CSV/XLSX) ─────────────────────
      {
        path: 'catalog-import',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <CatalogImportPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard Central ────────────────────────────────────────────────
      {
        path: 'central',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardCentralPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard do Diretor ──────────────────────────────────────────────
      {
        path: 'diretor',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardDiretorPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard da Nutricionista ───────────────────────────────────────────────────────────────────────────────────────
      {
        path: 'nutricionista',
        element: (
          // FASE 1: restrito a UNIDADE_NUTRICIONISTA (RoleType específico).
          // UNIDADE genérico (diretor, coord, administrativo) não acessa este painel.
          // MANTENEDORA e DEVELOPER mantêm acesso para suporte e auditoria.
          <RoleProtectedRoute allowedRoles={['UNIDADE_NUTRICIONISTA', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardNutricionistaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard de Unidade ───────────────────────────────────────────────────────────────────────────────────────
      {
        path: 'unidade',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardUnidadePage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Atendimentos aos Pais ────────────────────────────────────────────
      {
        path: 'atendimentos-pais',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AtendimentoPaisPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Chamada Diária ───────────────────────────────────────────────────
      {
        path: 'chamada',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <ControleFaltasPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Relatório de Fotos (RDX) ─────────────────────────────────────────
      {
        path: 'rdx',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RdxPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard de Coordenação Pedagógica ──────────────────────────────
      {
        path: 'coordenacao-pedagogica',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardCoordenacaoPedagogicaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard de Coordenação Geral ───────────────────────────────────
      {
        path: 'coordenacao-geral',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardCoordenacaoGeralPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard da Psicóloga Central ──────────────────────────────────
      {
        path: 'psicologo',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardPsicologoPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Desenvolvimento Infantil ────────────────────────────────────────
      {
        path: 'desenvolvimento-infantil',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DesenvolvimentoInfantilPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Meu Perfil (todos os usuários) ──────────────────────────────────
      {
        path: 'meu-perfil',
        element: (
          <ProtectedRoute>
            <MeuPerfilPage />
          </ProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
            // ─── Admin: Gestão de Usuários ────────────────────
      // RBAC: UNIDADE_NUTRICIONISTA NÃO acessa gestão de usuários.
      // Apenas perfis UNIDADE genéricos (diretor, coord, admin) e superiores.
      {
        path: 'admin/usuarios',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE_DIRETOR', 'UNIDADE_COORDENADOR_PEDAGOGICO', 'UNIDADE_ADMINISTRATIVO', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AdminUsuariosPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Admin: Gestão de Unidades ────────────────────────────────────────
      {
        path: 'admin/unidades',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AdminUnidadesPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Admin: Gestão de Turmas ──────────────────────────────────────────────────────
      {
        path: 'admin/turmas',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AdminTurmasPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Coordenação Pedagógica Completa (turmas + currículo + reuniões) ────
      {
        path: 'coordenacao',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <CoordenacaoPedagogicaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Relatório de Consumo de Materiais (Coordenação) ─────────────────
      {
        path: 'relatorio-consumo-materiais',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RelatorioConsumoMateriaisPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard de Consumo de Materiais com gráficos ─────────────────────
      {
        path: 'dashboard-consumo-materiais',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardConsumoMateriaisPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Painel de Alergias e Dietas ────────────────────────────────────
      // Visível para professor, coordenação, diretor, nutri e secretaria
      {
        path: 'painel-alergias',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PainelAlergiasPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Módulo de Planejamento — Oficina (criação/edição) ─────────────────
      {
        path: 'planejamento/novo',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaNovoPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      {
        path: 'planejamento/:id/editar',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaNovoPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      {
        path: 'planejamento/:planningId/conferir',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <ConferenciaPlanejamentoPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Módulo de Planejamento — Painel de Planejamentos (lista/calendário) ────────
      {
        path: 'planejamentos-calendario',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaListaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Sala de Aula Virtual (Professor + Coordenação) ─────────────────────────
      {
        path: 'sala-de-aula-virtual',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <SalaDeAulaVirtualPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      { path:'turma/:classroomId/painel', element:(<RoleProtectedRoute allowedRoles={['PROFESSOR','PROFESSOR_AUXILIAR','UNIDADE','STAFF_CENTRAL','MANTENEDORA','DEVELOPER']}><PainelTurmaPage/></RoleProtectedRoute>), errorElement:<RouteErrorBoundary/> },
      { path:'crianca/:childId/rdic-central', element:(<RoleProtectedRoute allowedRoles={['PROFESSOR','PROFESSOR_AUXILIAR','UNIDADE','STAFF_CENTRAL','MANTENEDORA','DEVELOPER']}><CentralRdicCriancaPage/></RoleProtectedRoute>), errorElement:<RouteErrorBoundary/> },
      { path:'crianca/:childId/painel-analitico', element:(<RoleProtectedRoute allowedRoles={['PROFESSOR','PROFESSOR_AUXILIAR','UNIDADE','STAFF_CENTRAL','MANTENEDORA','DEVELOPER']}><PainelAnaliticoCriancaPage/></RoleProtectedRoute>), errorElement:<RouteErrorBoundary/> },
      { path:'inteligencia', element:(<RoleProtectedRoute allowedRoles={['UNIDADE','STAFF_CENTRAL','MANTENEDORA','DEVELOPER']}><PainelInteligenciaPage/></RoleProtectedRoute>), errorElement:<RouteErrorBoundary/> },
    ],
  },
]);
</file>

<file path="apps/web/src/components/layout/Sidebar.tsx">
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen, ClipboardList, BarChart2, ShoppingCart, GraduationCap,
  ChevronRight, TrendingUp, Users, LayoutDashboard, ShoppingBag,
  FileText, Home, MessageCircle, Camera, UserCheck, Building2,
  Network, Brain, Layers, Settings, Sparkles, UserCircle, Calendar,
  Apple, Utensils, Shield, X, Eye, FileEdit, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../app/AuthProvider';
import { normalizeRoles, normalizeRoleTypes } from '../../app/RoleProtectedRoute';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

// ─── Menus por perfil ─────────────────────────────────────────────────────────

// PROFESSOR / PROFESSOR_AUXILIAR ──────────────────────────────────────────────
const PROFESSOR_PRINCIPAL: MenuItem[] = [
  { path: '/app/teacher-dashboard', label: 'Painel do Professor', icon: <GraduationCap className="h-4 w-4" /> },
  { path: '/app/material-requests', label: 'Requisições de Materiais', icon: <ShoppingCart className="h-4 w-4" /> },
];
const PROFESSOR_FERRAMENTAS: MenuItem[] = [
  // Plano de Aula: entrada única → calendário de planejamentos
  { path: '/app/planejamentos',       label: 'Plano de Aula',          icon: <BookOpen className="h-4 w-4" />, badge: 'Novo' },
  // Diário: entrada única → calendário de dias letivos (PR 1/PR 2)
  { path: '/app/diario-calendario',   label: 'Diário',                 icon: <ClipboardList className="h-4 w-4" />, badge: 'Novo' },
  // Chamada Diária removida do menu principal (incorporada ao fluxo do Diário)
  { path: '/app/rdic-crianca',        label: 'RDIC por Criança',       icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/rdx',                 label: 'Fotos da Turma',         icon: <Camera className="h-4 w-4" /> },
  { path: '/app/atendimentos-pais',   label: 'Atendimentos Pais',      icon: <MessageCircle className="h-4 w-4" /> },
  { path: '/app/matriz-pedagogica',   label: 'Matriz 2026',            icon: <Layers className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/painel-alergias',     label: 'Alergias e Dietas',      icon: <Apple className="h-4 w-4" />, badge: 'Atenção' },
];

// UNIDADE — Coordenadora Pedagógica ────────────────────────────────────────────
const COORD_GESTAO: MenuItem[] = [
  { path: '/app/coordenacao-pedagogica', label: 'Painel da Coordenação',    icon: <Home className="h-4 w-4" /> },
  { path: '/app/coordenacao',            label: 'Turmas & Reuniões',        icon: <Users className="h-4 w-4" /> },
  { path: '/app/material-requests',      label: 'Requisições de Materiais', icon: <ShoppingCart className="h-4 w-4" /> },
  { path: '/app/pedidos-compra',         label: 'Pedidos de Compra',        icon: <ShoppingBag className="h-4 w-4" /> },
];
const COORD_PEDAGOGICO: MenuItem[] = [
  { path: '/app/rdic-coord',      label: 'RDIC — Revisão',      icon: <Brain className="h-4 w-4" />, badge: 'Coord' },
  { path: '/app/rdic-crianca',    label: 'RDIC por Criança',    icon: <Brain className="h-4 w-4" /> },
  { path: '/app/inteligencia',    label: 'Inteligência',        icon: <Sparkles className="h-4 w-4" /> },
  { path: '/app/reports',         label: 'Relatórios',          icon: <BarChart2 className="h-4 w-4" /> },
  { path: '/app/painel-alergias', label: 'Alergias e Dietas',   icon: <Apple className="h-4 w-4" />, badge: 'Importante' },
];

// UNIDADE — Diretor ────────────────────────────────────────────────────────────
const DIRETOR_ITEMS: MenuItem[] = [
  { path: '/app/diretor',           label: 'Painel do Diretor',      icon: <Shield className="h-4 w-4" /> },
  { path: '/app/pedidos-compra',    label: 'Aprovar Pedidos',        icon: <ShoppingBag className="h-4 w-4" />, badge: 'Aprovação' },
  { path: '/app/coordenacao',       label: 'Turmas & Equipe',        icon: <Users className="h-4 w-4" /> },
  { path: '/app/reports',           label: 'Relatórios',             icon: <BarChart2 className="h-4 w-4" /> },
  { path: '/app/planejamentos',     label: 'Planejamentos',          icon: <BookOpen className="h-4 w-4" /> },
  { path: '/app/painel-alergias',   label: 'Alergias e Dietas',      icon: <Apple className="h-4 w-4" /> },
];

// UNIDADE — Nutricionista ──────────────────────────────────────────────────────
// Navegação completa do módulo via query param ?s=<secao>
// A sidebar global escura é o único menu do módulo (sem sidebar interna)
const NUTRI_ITEMS: MenuItem[] = [
  { path: '/app/nutricionista',                      label: 'Painel da Nutricionista', icon: <Utensils className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=cardapios',          label: 'Cardápios',               icon: <BookOpen className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=cardapios-nutricao', label: 'Cálculo Nutricional',     icon: <BarChart2 className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=turmas',             label: 'Turmas e Crianças',       icon: <Users className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=dietas',             label: 'Dietas e Restrições',     icon: <AlertTriangle className="h-4 w-4" />, badge: 'Importante' },
  { path: '/app/nutricionista?s=observacoes-prof',   label: 'Obs. dos Professores',    icon: <Eye className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=anotacoes-nutri',          label: 'Anotações Nutricionais',    icon: <FileEdit className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=acompanhamento-individual', label: 'Acompanhamento Individual', icon: <Shield className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/nutricionista?s=relatorio',                 label: 'Relatórios',                icon: <FileText className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=pedidos',            label: 'Pedidos de Alimentação',  icon: <ShoppingCart className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=configuracoes',      label: 'Configurações',           icon: <Settings className="h-4 w-4" /> },
];

// UNIDADE — Administrativo ─────────────────────────────────────────────────────
const ADMIN_UNIDADE_ITEMS: MenuItem[] = [
  { path: '/app/unidade',                       label: 'Painel da Unidade',      icon: <Home className="h-4 w-4" /> },
  { path: '/app/material-requests',             label: 'Requisições Pendentes',  icon: <ShoppingCart className="h-4 w-4" /> },
  { path: '/app/pedidos-compra',                label: 'Pedidos de Compra',      icon: <ShoppingBag className="h-4 w-4" /> },
  { path: '/app/relatorio-consumo-materiais',   label: 'Consumo de Materiais',   icon: <BarChart2 className="h-4 w-4" /> },
  { path: '/app/coordenacao',                   label: 'Turmas',                 icon: <Users className="h-4 w-4" /> },
];

// UNIDADE — Genérico (sem roleType específico) ─────────────────────────────────
const UNIDADE_GESTAO: MenuItem[] = [
  { path: '/app/unidade',                       label: 'Painel da Unidade',      icon: <Home className="h-4 w-4" /> },
  { path: '/app/coordenacao-pedagogica',        label: 'Coord. Pedagógica',      icon: <Building2 className="h-4 w-4" /> },
  { path: '/app/coordenacao',                   label: 'Turmas & Reuniões',      icon: <Users className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/material-requests',             label: 'Requisições Pendentes',  icon: <ShoppingCart className="h-4 w-4" /> },
  { path: '/app/relatorio-consumo-materiais',   label: 'Consumo de Materiais',   icon: <BarChart2 className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/dashboard-consumo-materiais',   label: 'Consumo — Gráficos',      icon: <TrendingUp className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/painel-alergias',               label: 'Alergias e Dietas',      icon: <Apple className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/pedidos-compra',                label: 'Pedidos de Compra',      icon: <ShoppingBag className="h-4 w-4" /> },
];
const UNIDADE_PEDAGOGICO: MenuItem[] = [
  { path: '/app/rdic-coord',        label: 'RDIC — Revisão e Aprovação', icon: <Brain className="h-4 w-4" />, badge: 'Coord' },
  { path: '/app/rdic-crianca',      label: 'RDIC por Criança',           icon: <Brain className="h-4 w-4" /> },
  { path: '/app/inteligencia',      label: 'Painel de Inteligência',     icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/rdx',               label: 'Fotos da Turma',             icon: <Camera className="h-4 w-4" /> },
  { path: '/app/matriz-pedagogica', label: 'Matriz 2026',                icon: <Layers className="h-4 w-4" /> },
  { path: '/app/atendimentos-pais', label: 'Atendimentos Pais',          icon: <MessageCircle className="h-4 w-4" /> },
  { path: '/app/reports',           label: 'Relatórios',                 icon: <BarChart2 className="h-4 w-4" /> },
];
// STAFF_CENTRAL_PSICOLOGIA ──────────────────────────────────────────────────────────────────────────────────
const PSICOLOGA_ITEMS: MenuItem[] = [
  { path: '/app/psicologo',                label: 'Psicologia Central',      icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/desenvolvimento-infantil', label: 'Desenvolvimento Infantil', icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/rdic-geral',               label: 'RDICs Publicados',         icon: <FileText className="h-4 w-4" /> },
  { path: '/app/central',                  label: 'Análises Centrais',        icon: <TrendingUp className="h-4 w-4" /> },
  { path: '/app/reports',                  label: 'Relatórios',               icon: <BarChart2 className="h-4 w-4" /> },
];
// STAFF_CENTRAL ──────────────────────────────────────────────────────────────────────────────────
const CENTRAL_ITEMS: MenuItem[] = [
  { path: '/app/central',                  label: 'Análises Centrais',        icon: <TrendingUp className="h-4 w-4" /> },
  { path: '/app/inteligencia',             label: 'Painel de Inteligência',   icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/coordenacao-geral',        label: 'Coordenação Geral',        icon: <Network className="h-4 w-4" /> },
  { path: '/app/rdic-geral',               label: 'RDICs Publicados',         icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/desenvolvimento-infantil', label: 'Desenvolvimento Infantil', icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/matriz-pedagogica',        label: 'Matriz 2026',              icon: <Layers className="h-4 w-4" /> },
  { path: '/app/reports',                  label: 'Relatórios',               icon: <BarChart2 className="h-4 w-4" /> },
];

// MANTENEDORA ──────────────────────────────────────────────────────────────────
const MANTENEDORA_ITEMS: MenuItem[] = [
  { path: '/app/dashboard',         label: 'Painel Global',       icon: <LayoutDashboard className="h-4 w-4" /> },
  { path: '/app/coordenacao-geral', label: 'Coordenação Geral',   icon: <Network className="h-4 w-4" /> },
  { path: '/app/central',           label: 'Análises Centrais',   icon: <TrendingUp className="h-4 w-4" /> },
  { path: '/app/rdic-geral',        label: 'RDICs Publicados',    icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/pedidos-compra',    label: 'Pedidos de Compra',   icon: <ShoppingBag className="h-4 w-4" /> },
  { path: '/app/matriz-pedagogica', label: 'Matriz 2026',         icon: <Layers className="h-4 w-4" /> },
  { path: '/app/reports',           label: 'Relatórios',          icon: <BarChart2 className="h-4 w-4" /> },
];

// DEVELOPER — acesso completo ──────────────────────────────────────────────────
const DEV_EXTRA: MenuItem[] = [
  { path: '/app/sala-de-aula-virtual', label: 'Sala de Aula Virtual',   icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/rdic-ria',             label: 'RDIC — Registros (RIA)', icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/planejamentos',        label: 'Planejamentos',          icon: <FileText className="h-4 w-4" /> },
  { path: '/app/nutricionista',        label: 'Painel da Nutricionista',icon: <Utensils className="h-4 w-4" /> },
  { path: '/app/diretor',              label: 'Painel do Diretor',      icon: <Shield className="h-4 w-4" /> },
  { path: '/app/configuracoes',        label: 'Configurações',          icon: <Settings className="h-4 w-4" /> },
];

// ─── Componentes de navegação ─────────────────────────────────────────────────

// isActiveForItem: compara pathname + search para itens com query params
function isActiveForItem(location: ReturnType<typeof useLocation>, itemPath: string): boolean {
  const [itemPathname, itemSearch] = itemPath.split('?');
  if (itemSearch) {
    // Item com query param: pathname deve bater E o param ?s= deve bater
    if (location.pathname !== itemPathname) return false;
    const itemParams = new URLSearchParams(itemSearch);
    const locParams = new URLSearchParams(location.search);
    for (const [key, val] of itemParams.entries()) {
      if (locParams.get(key) !== val) return false;
    }
    return true;
  }
  // Item sem query param: ativo apenas se pathname bate E não há ?s= na URL
  // (para não marcar "Painel da Nutricionista" quando uma sub-seção está ativa)
  if (location.pathname === itemPathname) {
    const locParams = new URLSearchParams(location.search);
    return !locParams.has('s');
  }
  return false;
}

function NavItem({ item, active, onClick }: { item: MenuItem; active: boolean; onClick?: () => void }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <span className="flex items-center gap-2.5">
        {item.icon}
        {item.label}
      </span>
      <span className="flex items-center gap-1">
        {item.badge && (
          <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full leading-none">
            {item.badge}
          </span>
        )}
        {active && <ChevronRight className="h-3 w-3 opacity-70" />}
      </span>
    </Link>
  );
}

function NavSection({
  titulo, items, location, onItemClick,
}: { titulo: string; items: MenuItem[]; location: ReturnType<typeof useLocation>; onItemClick?: () => void }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
        {titulo}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <NavItem key={item.path} item={item} active={isActiveForItem(location, item.path)} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar Principal ────────────────────────────────────────────────────────
interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const userLevels = normalizeRoles(user);
  const userTypes  = normalizeRoleTypes(user);

  // Flags de nível
  const isProfessor   = userLevels.some((r) => r === 'PROFESSOR' || r === 'PROFESSOR_AUXILIAR');
  const isUnidade     = userLevels.some((r) => r === 'UNIDADE' || r.startsWith('UNIDADE_'));
  const isCentral     = userLevels.some((r) => r === 'STAFF_CENTRAL' || r.startsWith('STAFF_CENTRAL_'));
  const isMantenedora = userLevels.some((r) => r === 'MANTENEDORA' || r.startsWith('MANTENEDORA_'));
  const isDeveloper   = userLevels.includes('DEVELOPER');

  // Flags de tipo (sub-papel dentro de UNIDADE)
  const isDiretor         = userTypes.includes('UNIDADE_DIRETOR');
  const isNutricionista   = userTypes.includes('UNIDADE_NUTRICIONISTA');
  const isCoordPedagogico = userTypes.includes('UNIDADE_COORDENADOR_PEDAGOGICO');
  const isAdministrativo  = userTypes.includes('UNIDADE_ADMINISTRATIVO');
  // Flag de tipo para Psicóloga Central
  const isPsicologa = userTypes.includes('STAFF_CENTRAL_PSICOLOGIA');
  // Se UNIDADE mas sem tipo específico, tratar como coordenadora genérica
  const isUnidadeGenerica = isUnidade && !isDiretor && !isNutricionista && !isCoordPedagogico && !isAdministrativo;

  // Label de perfil para exibição
  const perfilLabel = isDeveloper        ? 'Desenvolvedor'
    : isMantenedora                      ? 'Mantenedora'
    : isPsicologa                        ? 'Psicóloga Central'
    : isCentral                          ? 'Equipe Central'
    : isDiretor                          ? 'Diretor(a)'
    : isNutricionista                    ? 'Nutricionista'
    : isCoordPedagogico                  ? 'Coord. Pedagógica'
    : isAdministrativo                   ? 'Administrativo'
    : isUnidade                          ? 'Unidade'
    : isProfessor                        ? 'Professor(a)'
    : 'Usuário';

  const configItem: MenuItem = { path: '/app/configuracoes', label: 'Configurações', icon: <Settings className="h-4 w-4" /> };
  const perfilItem: MenuItem = { path: '/app/meu-perfil',    label: 'Meu Perfil',    icon: <UserCircle className="h-4 w-4" /> };

  // adminItems: exibido apenas para perfis com acesso administrativo real.
  // Nutricionista (isNutricionista) NÃO recebe este bloco — ela não gerencia
  // usuários, turmas ou unidades administrativas.
  const adminItems: MenuItem[] = [
    ...(!isNutricionista ? [{ path: '/app/admin/usuarios', label: 'Usuários', icon: <Users className="h-4 w-4" /> }] : []),
    ...(!isNutricionista ? [{ path: '/app/admin/turmas',   label: 'Turmas',   icon: <GraduationCap className="h-4 w-4" /> }] : []),
    ...(isMantenedora || isCentral || isDeveloper
      ? [{ path: '/app/admin/unidades', label: 'Unidades', icon: <Building2 className="h-4 w-4" /> }]
      : []),
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white h-full min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">Conexa V3</h1>
              <p className="text-xs text-gray-400 mt-0.5">Sistema Pedagógico</p>
            </div>
          </div>
          {/* Botão fechar — só aparece em mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {user && (
          <div className="mt-3 px-2 py-2 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400">Perfil</p>
            <p className="text-sm font-medium text-gray-200 truncate">
              {(user.nome as string) || user.email}
            </p>
            <span className="inline-block mt-1 text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
              {perfilLabel}
            </span>
          </div>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">

        {/* DEVELOPER: vê tudo */}
        {isDeveloper && (
          <>
            <NavSection titulo="Professor"    items={[...PROFESSOR_PRINCIPAL, ...PROFESSOR_FERRAMENTAS]} location={location} onItemClick={onClose} />
            <NavSection titulo="Nutricionista" items={NUTRI_ITEMS}                                        location={location} onItemClick={onClose} />
            <NavSection titulo="Diretor"       items={DIRETOR_ITEMS}                                      location={location} onItemClick={onClose} />
            <NavSection titulo="Unidade"       items={[...UNIDADE_GESTAO, ...UNIDADE_PEDAGOGICO]}         location={location} onItemClick={onClose} />
            <NavSection titulo="Central"       items={CENTRAL_ITEMS}                                      location={location} onItemClick={onClose} />
            <NavSection titulo="Mantenedora"   items={MANTENEDORA_ITEMS}                                  location={location} onItemClick={onClose} />
            <NavSection titulo="Dev — Extras"  items={DEV_EXTRA}                                          location={location} onItemClick={onClose} />
          </>
        )}

        {/* MANTENEDORA */}
        {!isDeveloper && isMantenedora && (
          <NavSection titulo="Mantenedora" items={MANTENEDORA_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* STAFF_CENTRAL — Psicóloga Central (menu dedicado) */}
        {!isDeveloper && isCentral && isPsicologa && (
          <NavSection titulo="Psicologia" items={PSICOLOGA_ITEMS} location={location} onItemClick={onClose} />
        )}
        {/* STAFF_CENTRAL — Coordenação Geral e demais */}
        {!isDeveloper && isCentral && !isPsicologa && (
          <NavSection titulo="Análises Centrais" items={CENTRAL_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* UNIDADE — Diretor */}
        {!isDeveloper && isDiretor && (
          <NavSection titulo="Diretor" items={DIRETOR_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* UNIDADE — Nutricionista */}
        {!isDeveloper && isNutricionista && (
          <NavSection titulo="Nutricionista" items={NUTRI_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* UNIDADE — Coordenadora Pedagógica */}
        {!isDeveloper && isCoordPedagogico && (
          <>
            <NavSection titulo="Gestão"      items={COORD_GESTAO}      location={location} onItemClick={onClose} />
            <NavSection titulo="Pedagógico"  items={COORD_PEDAGOGICO}  location={location} onItemClick={onClose} />
          </>
        )}

        {/* UNIDADE — Administrativo */}
        {!isDeveloper && isAdministrativo && (
          <NavSection titulo="Administrativo" items={ADMIN_UNIDADE_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* UNIDADE — Genérico (sem roleType específico) */}
        {!isDeveloper && isUnidadeGenerica && (
          <>
            <NavSection titulo="Gestão"      items={UNIDADE_GESTAO}      location={location} onItemClick={onClose} />
            <NavSection titulo="Pedagógico"  items={UNIDADE_PEDAGOGICO}  location={location} onItemClick={onClose} />
          </>
        )}

        {/* PROFESSOR / PROFESSOR_AUXILIAR */}
        {!isDeveloper && !isUnidade && isProfessor && (
          <>
            <NavSection titulo="Pedagógico"  items={PROFESSOR_PRINCIPAL}   location={location} onItemClick={onClose} />
            <NavSection titulo="Ferramentas" items={PROFESSOR_FERRAMENTAS} location={location} onItemClick={onClose} />
          </>
        )}

        {/* Fallback */}
        {!isDeveloper && !isMantenedora && !isCentral && !isUnidade && !isProfessor && (
          <NavSection titulo="Menu" items={UNIDADE_GESTAO} location={location} onItemClick={onClose} />
        )}

      </nav>

      {/* Rodapé */}
      <div className="p-3 border-t border-gray-800 space-y-1">
        {(isUnidade || isCentral || isMantenedora || isDeveloper) && adminItems.length > 0 && (
          <NavSection titulo="Administração" items={adminItems} location={location} onItemClick={onClose} />
        )}
        <div className="pt-1 space-y-1">
          <NavItem item={perfilItem} active={isActiveForItem(location, '/app/meu-perfil')} onClick={onClose} />
          <NavItem item={configItem} active={isActiveForItem(location, '/app/configuracoes')} onClick={onClose} />
        </div>
        <p className="text-xs text-gray-600 text-center pt-1">Conexa V3 © 2026</p>
      </div>
    </aside>
  );
}
</file>

<file path="apps/web/src/pages/DashboardCoordenacaoPedagogicaPage.tsx">
import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { useApiCache } from '../hooks/useApiCache';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Users, BookOpen, ClipboardList, ShoppingCart,
  CheckCircle, AlertCircle, ChevronRight,
  Eye, ThumbsUp, MessageSquare, TrendingUp,
  Bell, Star, Brain, GraduationCap, Plus, RefreshCw, BarChart2, FileText, ArrowRight,
} from 'lucide-react';
import { RecadosWidget } from '../components/recados/RecadosWidget';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { isCentral as checkIsCentral, isUnidade as checkIsUnidade } from '../api/auth';
import { useUnitScope } from '../contexts/UnitScopeContext';
import { getPedagogicalToday } from '@/utils/pedagogicalDate';
import { OcorrenciasPanel } from '../components/dashboard/OcorrenciasPanel';
import { TriangleAlert } from 'lucide-react';

const URGENCIA_CONFIG: Record<string, { label: string; cor: string; dot: string }> = {
  ALTA: { label: 'Urgente', cor: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' },
  MEDIA: { label: 'Normal', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' },
  BAIXA: { label: 'Sem pressa', cor: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500' },
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface Planejamento {
  id: string;
  title: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
  professorNome: string;
  turmaNome: string;
  templateNome?: string;
  objectives?: string;
  reviewComment?: string;
  createdByUser?: { id: string; firstName: string; lastName: string; email: string };
  classroom?: { id: string; name: string };
  template?: { id: string; name: string; type: string };
}
interface Diario {
  id: string;
  professorNome: string;
  turmaNome: string;
  data: string;
  titulo: string;
  status?: string;
  climaEmocional?: string;
  presencas?: number;
  ausencias?: number;
  momentoDestaque?: string;
  statusExecucaoPlano?: string;
  camposBNCC?: string[];
}
interface TurmaResumo {
  id: string; nome: string; totalAlunos: number; professor: string | null; chamadaFeita: boolean;
}
interface DashboardData {
  turmas: number; professores: number; alunosTotal: number;
  requisicoesParaAnalisar: number; planejamentosParaRevisar: number;
  diariosEstaSemana: number; taxaPresencaMedia: number; alertas: string[];
  turmasLista: TurmaResumo[];
}

// ─── Sub-componente: aba Pedagógico com sub-navegação ────────────────────────
interface PedagogicoSubNavProps {
  diarios: any[];
  turmasLista: any[];
  cobertura: any;
  loadingCobertura: boolean;
  carregarCobertura: () => void;
  setCobertura: (v: any) => void;
  setPendencias: (v: any) => void;
  navigate: (path: string) => void;
}

function PedagogicoSubNav({
  diarios, turmasLista, cobertura, loadingCobertura,
  carregarCobertura, setCobertura, setPendencias, navigate,
}: PedagogicoSubNavProps) {
  const [subAba, setSubAba] = React.useState<'diarios' | 'turmas' | 'cobertura'>('diarios');

  return (
    <div className="space-y-4">
      {/* Sub-navegação */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { id: 'diarios',   label: 'Diários' },
          { id: 'turmas',    label: 'Turmas e Registros' },
          { id: 'cobertura', label: 'Cobertura' },
        ].map(s => (
          <button key={s.id} onClick={() => setSubAba(s.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              subAba === s.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Sub-aba: Diários */}
      {subAba === 'diarios' && (
        <div className="space-y-3">
          {diarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-gray-100 gap-2">
              <p className="text-sm text-gray-400">Nenhum diário registrado neste período.</p>
            </div>
          ) : (
            diarios.map((diario: any) => {
              const legacyTurma = diario['turmaNome'];
              const legacyProfessor = diario['professorNome'];
              const legacyData = diario['data'];
              const turma = diario.classroom?.name || legacyTurma || '—';
              const professor = diario.createdByUser
                ? `${diario.createdByUser.firstName ?? ''} ${diario.createdByUser.lastName ?? ''}`.trim()
                : legacyProfessor || '—';
              const dataRaw = diario.eventDate || legacyData || diario.createdAt || '';
              const dataFmt = dataRaw
                ? new Date(dataRaw.includes('T') ? dataRaw : `${dataRaw}T12:00:00`).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                  })
                : '—';
              const ctx = diario.aiContext && typeof diario.aiContext === 'object' ? diario.aiContext as any : {};
              const statusPubl = ['PUBLICADO','REVISADO','ARQUIVADO'].includes((diario.status || '').toUpperCase());
              const execLabel = ctx.statusExecucaoPlano === 'CUMPRIDO' ? '✅ Cumprido'
                : ctx.statusExecucaoPlano === 'PARCIAL' ? '⚠️ Parcial'
                : ctx.statusExecucaoPlano === 'NAO_REALIZADO' ? '❌ Não realizado' : null;
              const climaLabel = ctx.climaEmocional === 'OTIMO' ? '🌟 Ótimo'
                : ctx.climaEmocional === 'BOM' ? '😊 Bom'
                : ctx.climaEmocional === 'REGULAR' ? '😐 Regular'
                : ctx.climaEmocional === 'AGITADO' ? '😬 Agitado'
                : ctx.climaEmocional === 'DIFICIL' ? '😔 Difícil' : null;
              return (
                <div key={diario.id} className={`rounded-2xl border p-4 bg-white ${statusPubl ? 'border-emerald-100' : 'border-amber-100'}}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${statusPubl ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}}`}>
                          {statusPubl ? 'Publicado' : 'Rascunho'}
                        </span>
                        {execLabel && <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700">{execLabel}</span>}
                        {climaLabel && <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-sky-50 text-sky-700 border border-sky-200">{climaLabel}</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {turma}
                        {professor !== '—' && (
                          <span className="text-xs font-normal text-gray-400 ml-2">
                            · {professor}
                          </span>
                        )}
                      </p>
                      {ctx.presencas != null && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          👥 {ctx.presencas} presentes · {ctx.ausencias ?? 0} ausentes
                        </p>
                      )}
                      {ctx.momentoDestaque && (
                        <p className="text-xs text-gray-500 mt-1.5 italic truncate max-w-md">"{ctx.momentoDestaque}"</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <p className="text-xs font-semibold text-gray-400">{dataFmt}</p>
                      <button
                        onClick={() => navigate(
                          `/app/diario-calendario?classroomId=${
                            diario.classroomId ?? diario.classroom?.id ?? ''
                          }`
                        )}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                      >
                        Ver →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sub-aba: Turmas */}
      {subAba === 'turmas' && (
        <div className="grid grid-cols-1 gap-3">
          {turmasLista.map((turma: any) => (
            <div key={turma.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{turma.nome}</p>
                  <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor || 'Sem professor'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${turma.chamadaFeita ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {turma.chamadaFeita ? '✅ Chamada' : '⏳ Pendente'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Observações', path: `/app/coordenacao/observacoes?classroomId=${turma.id}`, color: 'purple' },
                  { label: 'Diários', path: `/app/diario-calendario?classroomId=${turma.id}`, color: 'blue' },
                  { label: 'Atividades', path: `/app/sala-de-aula-virtual?classroomId=${turma.id}`, color: 'indigo' },
                  { label: 'RDIC', path: `/app/rdic?classroomId=${turma.id}`, color: 'teal' },
                ].map(item => (
                  <button key={item.label} onClick={() => navigate(item.path)}
                    className={`flex flex-col items-center gap-1 p-2.5 bg-${item.color}-50 rounded-xl hover:bg-${item.color}-100 transition-all`}>
                    <span className={`text-[11px] font-medium text-${item.color}-700`}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-aba: Cobertura */}
      {subAba === 'cobertura' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Cobertura de Registros — Hoje</p>
            <button
              onClick={() => { setCobertura(null); setPendencias(null); carregarCobertura(); }}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Atualizar
            </button>
          </div>
          {loadingCobertura ? (
            <div className="flex items-center justify-center py-10 gap-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Carregando...</p>
            </div>
          ) : !cobertura ? (
            <button onClick={carregarCobertura}
              className="w-full py-8 rounded-2xl border-2 border-dashed border-blue-200 text-sm text-blue-600 hover:bg-blue-50 transition-all">
              Carregar dados de cobertura
            </button>
          ) : (
            <div className="space-y-2">
              {(cobertura.classrooms ?? []).map((cls: any) => (
                <div key={cls.classroomId} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-800">{cls.classroomName}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(cls.coveragePct ?? 0) >= 80 ? 'bg-emerald-100 text-emerald-700' : (cls.coveragePct ?? 0) >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                      {cls.coveragePct ?? 0}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${(cls.coveragePct ?? 0) >= 80 ? 'bg-emerald-500' : (cls.coveragePct ?? 0) >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.max(cls.coveragePct ?? 0, 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardCoordenacaoPedagogicaPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [planejamentos, setPlanejamentos] = useState<Planejamento[]>([]);
  const [diarios, setDiarios] = useState<any[]>([]);
  const [metricasExecucao, setMetricasExecucao] = useState<Record<string, {
    total: number; publicados: number; comMatriz: number; comPlano: number;
  }>>({});
  // Aba Cobertura
  interface CoberturaData {
    unitId: string; startDate: string; endDate: string;
    totalCriancas: number; totalComRegistro: number; percentualGeral: number;
    turmas: Array<{ classroomId: string; classroomName: string; totalCriancas: number; criancasComRegistro: number; percentual: number }>;
  }
  interface PendenciasData {
    totalPendentes: number;
    pendentes: Array<{ childId: string; nome: string; classroomId: string; classroomName: string }>;
  }
  const [cobertura, setCobertura] = useState<CoberturaData | null>(null);
  const [alertasReais, setAlertasReais] = useState<{
    total: number;
    criticos: any[];
    atencao: any[];
    info: any[];
  } | null>(null);
  const [resumoDiarios, setResumoDiarios] = useState<any | null>(null);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [pendencias, setPendencias] = useState<PendenciasData | null>(null);
  const [loadingCobertura, setLoadingCobertura] = useState(false);
  const apiCache = useApiCache(60_000);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaAtiva = (searchParams.get('aba') as any) ?? 'inicio';
  function setAbaAtiva(novaAba: string) {
    const novosParams = new URLSearchParams(searchParams.toString());
    novosParams.set('aba', novaAba);
    setSearchParams(novosParams, { replace: false });
  }
  // FIX P1: usar selectedUnitId do contexto global como fallback para unitIdParam
  // Isso resolve o erro 403 quando STAFF_CENTRAL acessa sem unitId no token
  const { selectedUnitId: ctxUnitId } = useUnitScope();
  const unitIdParam = searchParams.get('unitId') ?? ctxUnitId ?? undefined;
  const { user } = useAuth();
  // Coordenação Geral (STAFF_CENTRAL) = somente leitura/análise. Apenas UNIDADE pode aprovar.
  const isCentralUser = checkIsCentral(user);
  const isUnidadeUser = checkIsUnidade(user);
  const canApprove = isUnidadeUser && !isCentralUser;
  const [processando, setProcessando] = useState<string|null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [itemParaRejeitar, setItemParaRejeitar] = useState<{id:string;tipo:'req'|'plan'}|null>(null);
  const [filtroPlanStatus, setFiltroPlanStatus] = useState<string>('TODOS');
  const [planExpandido, setPlanExpandido] = useState<string|null>(null);
  const [turmaExpandida, setTurmaExpandida] = useState<string | null>(null);
  const [erroPainel, setErroPainel] = useState<string | null>(null);
  // FIX P4-3: filtros operacionais para a aba de diários da coordenação
  const [filtroDiarioTurma, setFiltroDiarioTurma] = useState<string>('');
  const [filtroDiarioStatus, setFiltroDiarioStatus] = useState<string>('TODOS');
  const [filtroDiarioDataInicio, setFiltroDiarioDataInicio] = useState<string>('');
  const [filtroDiarioDataFim, setFiltroDiarioDataFim] = useState<string>('');
  const [filtroDiarioProfessor, setFiltroDiarioProfessor] = useState<string>('');
  const ITENS_POR_PAGINA = 10;
  const [paginaDiarios, setPaginaDiarios] = useState(1);

  async function carregarDiarios() {
    try {
      const params: Record<string, string> = unitIdParam ? { unitId: unitIdParam } : {};
      if (filtroDiarioDataInicio) params.startDate = `${filtroDiarioDataInicio}T00:00:00.000Z`;
      if (filtroDiarioDataFim) params.endDate = `${filtroDiarioDataFim}T23:59:59.999Z`;
      const res = await http.get('/coordenacao/diarios', { params });
      const payload = res.data;
      const listaDiarios = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.diarios) ? payload.diarios : []);
      setDiarios(listaDiarios);
      if (payload?.metricas) setMetricasExecucao(payload.metricas);
    } catch {
      setDiarios([]);
      setMetricasExecucao({});
    }
  }

  // FIX P1: recarregar quando unitIdParam mudar (troca de unidade pelo seletor)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadDashboardCb = useCallback(loadDashboard, [unitIdParam]);
  useEffect(() => { loadDashboardCb(); }, [loadDashboardCb]);

  useEffect(() => {
    carregarDiarios();
  }, [unitIdParam, filtroDiarioDataInicio, filtroDiarioDataFim]);

  useEffect(() => {
    setPaginaDiarios(1);
    if (abaAtiva === 'cobertura' && !cobertura) {
      carregarCobertura();
    }
  }, [abaAtiva]);

  async function carregarCobertura() {
    setLoadingCobertura(true);
    try {
      const hoje = getPedagogicalToday();
      const [covData, pendData] = await Promise.all([
        apiCache.get('/reports/unit/coverage', { startDate: hoje, endDate: hoje }, () =>
          http.get('/reports/unit/coverage', { params: { startDate: hoje, endDate: hoje } }).then(r => r.data)
        ),
        apiCache.get('/reports/unit/pendings', { daysWithout: 1 }, () =>
          http.get('/reports/unit/pendings', { params: { daysWithout: 1 } }).then(r => r.data)
        ),
      ]);
      setCobertura(covData as CoberturaData);
      setPendencias(pendData as PendenciasData);
    } catch {
      toast.error('Erro ao carregar cobertura');
    } finally {
      setLoadingCobertura(false);
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      const diarioParams: Record<string, string> = unitIdParam ? { unitId: unitIdParam } : {};
      if (filtroDiarioDataInicio) diarioParams.startDate = `${filtroDiarioDataInicio}T00:00:00.000Z`;
      if (filtroDiarioDataFim) diarioParams.endDate = `${filtroDiarioDataFim}T23:59:59.999Z`;
      const [dashRes, reqRes, planRes, diarRes] = await Promise.allSettled([
        http.get('/coordenacao/dashboard/unidade', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/coordenacao/requisicoes', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/coordenacao/planejamentos', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/coordenacao/diarios', { params: diarioParams }),
      ]);
      // Carregar alertas e resumo em paralelo (não bloqueante)
      const mes = new Date().toISOString().slice(0, 7);
      setLoadingAlertas(true);
      Promise.allSettled([
        http.get('/insights/unit/alerts', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/reports/diary/summary', { params: { mes, ...(unitIdParam ? { unitId: unitIdParam } : {}) } }),
      ]).then(([alertasRes, resumoRes]) => {
        if (alertasRes.status === 'fulfilled') setAlertasReais(alertasRes.value.data);
        if (resumoRes.status === 'fulfilled') setResumoDiarios(resumoRes.value.data);
      }).finally(() => setLoadingAlertas(false));
      if (dashRes.status === 'fulfilled') {
        const raw = dashRes.value.data;
        const ind = raw?.indicadores ?? {};
        const turmasArr: TurmaResumo[] = Array.isArray(raw?.turmas) ? raw.turmas : [];
        const professoresSet = new Set(turmasArr.map((t: TurmaResumo) => t.professor).filter((p: string | null) => p !== null && p !== 'Não atribuído'));
        setDashboard({
          turmas: ind.totalTurmas ?? turmasArr.length,
          // FIX D: usa totalProfessores do backend (professores únicos ativos na unidade)
          professores: ind.totalProfessores ?? professoresSet.size ?? 0,
          alunosTotal: ind.totalAlunos ?? 0,
          requisicoesParaAnalisar: ind.requisicoesPendentes ?? 0,
          planejamentosParaRevisar: (ind.planejamentosEmRevisao ?? ind.planejamentosRascunho) ?? 0,
          diariosEstaSemana: ind.diariosHoje ?? 0,
          taxaPresencaMedia: ind.totalTurmas > 0
            ? Math.round((ind.turmasComChamadaHoje / ind.totalTurmas) * 100)
            : 0,
          alertas: [],
          turmasLista: turmasArr,
        });
        if (Array.isArray(raw?.planejamentosParaRevisao) && raw.planejamentosParaRevisao.length > 0) {
          setPlanejamentos(raw.planejamentosParaRevisao.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            title: (p.title as string) ?? 'Plano de Aula',
            status: (p.status as string) ?? 'RASCUNHO',
            type: (p.type as string) ?? '',
            startDate: (p.startDate as string) ?? '',
            endDate: (p.endDate as string) ?? '',
            professorNome: (p.createdBy as string) ?? 'Professor',
            turmaNome: ((p.grupo as Record<string, unknown> | null)?.turmaNome as string)
              ?? ((p.classroom as Record<string, unknown> | null)?.name as string)
              ?? (p.classroomId as string)
              ?? '—',
            templateNome: ((p.template as Record<string, unknown> | null)?.name as string) ?? undefined,
            objectives: (p.objectives as string) ?? undefined,
            reviewComment: (p.reviewComment as string) ?? undefined,
            createdByUser: (p.createdByUser as Planejamento['createdByUser']) ?? undefined,
            classroom: (p.classroom as Planejamento['classroom']) ?? undefined,
            template: (p.template as Planejamento['template']) ?? undefined,
          })));
        }
      }
      if (planRes.status === 'fulfilled') {
        const rawPlans: Record<string, unknown>[] = Array.isArray(planRes.value.data) ? planRes.value.data : [];
        setPlanejamentos(rawPlans.map((p) => {
          const user = p.createdByUser as Record<string, string> | null;
          const classroom = p.classroom as Record<string, string> | null;
          const template = p.template as Record<string, string> | null;
          return {
            id: p.id as string,
            title: (p.title as string) ?? 'Plano de Aula',
            status: (p.status as string) ?? 'RASCUNHO',
            type: (p.type as string) ?? '',
            startDate: (p.startDate as string) ?? '',
            endDate: (p.endDate as string) ?? '',
            professorNome: user ? `${user.firstName} ${user.lastName}`.trim() : (p.createdBy as string) ?? 'Professor',
            turmaNome: ((p.porTurma as Record<string, unknown> | null)?.turmaNome as string)
              ?? ((p.grupo as Record<string, unknown> | null)?.turmaNome as string)
              ?? classroom?.name
              ?? (p.classroomId as string)
              ?? '—',
            templateNome: template?.name ?? undefined,
            objectives: (p.objectives as string) ?? undefined,
            reviewComment: (p.reviewComment as string) ?? undefined,
            createdByUser: user as Planejamento['createdByUser'],
            classroom: classroom as Planejamento['classroom'],
            template: template as Planejamento['template'],
          };
        }));
      }
      if (diarRes.status === 'fulfilled') {
        const payload = diarRes.value.data;
        const listaDiarios = Array.isArray(payload)
          ? payload
          : (Array.isArray(payload?.diarios) ? payload.diarios : []);
        setDiarios(listaDiarios);
        if (payload?.metricas) setMetricasExecucao(payload.metricas);
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Erro desconhecido';
      setErroPainel(msg);
      toast.error('Erro ao carregar painel');
    } finally {
      setLoading(false);
    }
  }

  async function aprovarPlanejamento(id: string) {
    try {
      setProcessando(id);
      await http.post(`/plannings/${id}/aprovar`);
      toast.success('Planejamento aprovado! ✅');
      setPlanejamentos(prev => prev.filter(p => p.id !== id));
    } catch {
      toast.error('Erro ao aprovar');
    } finally {
      setProcessando(null);
    }
  }

  async function devolverPlanejamento(id: string, motivo: string) {
    try {
      setProcessando(id);
      // Usa o endpoint dedicado de devolução com comentário obrigatório
      await http.post(`/plannings/${id}/devolver`, { comment: motivo });
      toast.success('Planejamento devolvido com observações');
      setPlanejamentos(prev => prev.filter(p => p.id !== id));
      setItemParaRejeitar(null); setMotivoRejeicao('');
    } catch { toast.error('Erro ao devolver'); }
    finally { setProcessando(null); }
  }

  if (loading) return <LoadingState message="Carregando painel de coordenação..." />;
  // FIX P1: mostrar mensagem de erro clara quando o painel não carregou
  if (erroPainel && !dashboard) return (
    <PageShell title="Painel da Coordenação Pedagógica" subtitle="">
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <p className="font-bold text-red-800 mb-2">Não foi possível carregar o painel</p>
          <p className="text-sm text-red-600 mb-4">{erroPainel}</p>
          {erroPainel.includes('unidade') && (
            <p className="text-xs text-gray-500 mb-4">Selecione uma unidade no seletor de escopo para visualizar o painel.</p>
          )}
          <Button onClick={() => { setErroPainel(null); loadDashboard(); }} className="rounded-xl">Tentar novamente</Button>
        </div>
      </div>
    </PageShell>
  );

  const totalPendencias = (dashboard?.requisicoesParaAnalisar ?? 0) + (dashboard?.planejamentosParaRevisar ?? 0);
  const primeiroNome = (((user?.nome as string) || 'Coordenação').trim().split(' ')[0]) || 'Coordenação';
  const totalTurmasHoje = dashboard?.turmasLista?.length ?? dashboard?.turmas ?? 0;
  const turmasComChamadaHoje = (dashboard?.turmasLista ?? []).filter(t => t.chamadaFeita).length;
  const turmasPendentesHoje = Math.max(totalTurmasHoje - turmasComChamadaHoje, 0);
  const diariosPublicados = diarios.filter(d => ['PUBLICADO', 'REVISADO', 'ARQUIVADO'].includes((d.status || '').toUpperCase())).length;
  const diariosRascunho = diarios.filter(d => (d.status || '').toUpperCase() === 'RASCUNHO').length;
  const atalhosExecutivos = [
    {
      label: 'Diários e turmas',
      desc: 'Registros de diários, cobertura e acompanhamento de turmas',
      icon: <Brain className="h-5 w-5" />,
      className: 'from-sky-600 via-blue-600 to-indigo-700',
      action: () => setAbaAtiva('pedagogico'),
    },
    {
      label: 'Planejamentos',
      desc: `${dashboard?.planejamentosParaRevisar ?? 0} planejamento(s) aguardando revisão`,
      icon: <BookOpen className="h-5 w-5" />,
      className: 'from-amber-500 via-orange-500 to-rose-500',
      action: () => setAbaAtiva('planejamentos'),
    },
    {
      label: 'Pedidos de material',
      desc: canApprove ? 'Aprovar, devolver ou acompanhar pedidos pendentes' : 'Acompanhar pedidos e itens urgentes',
      icon: <ShoppingCart className="h-5 w-5" />,
      className: 'from-rose-500 via-red-500 to-pink-600',
      action: () => navigate(unitIdParam ? `/app/material-requests?unitId=${unitIdParam}` : '/app/material-requests'),
    },
    {
      label: 'Relatórios',
      desc: 'Indicadores e registros da unidade',
      icon: <FileText className="h-5 w-5" />,
      className: 'from-emerald-500 via-teal-500 to-cyan-600',
      action: () => setAbaAtiva('relatorios'),
    },
    {
      label: 'Atendimentos Pais',
      desc: 'Registrar reuniões e gerar PDF de comprovante',
      icon: <Users className="h-5 w-5" />,
      className: 'from-violet-500 via-purple-500 to-fuchsia-600',
      action: () => navigate('/app/atendimentos-pais'),
    },
  ] as const;

  const abas = [
    { id: 'inicio',        label: 'Hoje',          icon: <Star className="h-4 w-4" />,
      badge: (dashboard?.requisicoesParaAnalisar ?? 0) + (dashboard?.planejamentosParaRevisar ?? 0) || undefined },
    { id: 'turmas',        label: 'Turmas',         icon: <Users className="h-4 w-4" /> },
    { id: 'planejamentos', label: 'Planejamentos',  icon: <BookOpen className="h-4 w-4" />,
      badge: dashboard?.planejamentosParaRevisar },
    { id: 'relatorios',    label: 'Relatórios',     icon: <TrendingUp className="h-4 w-4" /> },
    // PR 141: aba de ocorrências para a coordenação pedagógica
    { id: 'ocorrencias',   label: 'Ocorrências',    icon: <TriangleAlert className="h-4 w-4" /> },
  ] as const;

  return (
    <PageShell
      title={`Painel da Coordenação Pedagógica`}
      subtitle={`Olá, ${primeiroNome}. Acompanhe diários, planejamentos, chamadas e pendências da unidade.`}
    >
      {/* Modal motivo rejeição */}
      {itemParaRejeitar && canApprove && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-lg mb-2">Devolver com orientação</h3>
            <p className="text-sm text-gray-500 mb-4">Escreva uma orientação para o professor:</p>
            <textarea className="w-full border-2 rounded-xl p-3 text-sm resize-none mb-4" rows={4}
              placeholder="Ex: Por favor, detalhe melhor os objetivos..."
              value={motivoRejeicao} onChange={e => setMotivoRejeicao(e.target.value)} />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl"
                onClick={() => { setItemParaRejeitar(null); setMotivoRejeicao(''); }}>Cancelar</Button>
              <Button className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
                onClick={() => {
                  if (!motivoRejeicao.trim()) { toast.error('Escreva uma orientação'); return; }
                  devolverPlanejamento(itemParaRejeitar.id, motivoRejeicao);
                }}>Devolver</Button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 flex-wrap">
        <button
          onClick={() => navigate('/app/teacher-dashboard')}
          className="hover:text-gray-700 transition-colors"
        >
          Início
        </button>
        <ChevronRight className="h-3 w-3 flex-shrink-0" />
        <button
          onClick={() => setAbaAtiva('inicio')}
          className="hover:text-gray-700 transition-colors"
        >
          Coordenação Pedagógica
        </button>
        {abaAtiva !== 'inicio' && (
          <>
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            <span className="text-gray-600 font-medium capitalize">
              {abaAtiva === 'turmas' ? 'Turmas' :
               abaAtiva === 'planejamentos' ? 'Planejamentos' :
               abaAtiva === 'relatorios' ? 'Relatórios' :
               abaAtiva === 'ocorrencias' ? 'Ocorrências' :
               abaAtiva === 'pedagogico' ? 'Pedagógico' :
               abaAtiva === 'diarios' ? 'Diários' : abaAtiva}
            </span>
          </>
        )}
      </nav>

      {/* Alerta de pendências */}
      {totalPendencias > 0 && (
        <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex items-center gap-3">
          <Bell className="h-6 w-6 text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-orange-800">{totalPendencias} {totalPendencias === 1 ? 'item precisa' : 'itens precisam'} da sua atenção</p>
            <p className="text-sm text-orange-600">
              {(dashboard?.requisicoesParaAnalisar ?? 0) > 0 ? `${dashboard?.requisicoesParaAnalisar} pedido(s) de material · ` : ''}
              {(dashboard?.planejamentosParaRevisar ?? 0) > 0 ? `${dashboard?.planejamentosParaRevisar} planejamento(s) para revisar` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Banner modo leitura para Coordenação Geral */}
      {isCentralUser && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
          <Eye className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Modo Análise — Coordenação Geral</p>
            <p className="text-xs text-blue-600">Você está visualizando dados desta unidade. Aprovações são responsabilidade da Coordenação da Unidade.</p>
          </div>
        </div>
      )}
      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {abas.map(aba => (
          <button
            key={aba.id}
            onClick={() => {
              if ((aba.id as string) === 'requisicoes') {
                navigate(unitIdParam ? `/app/material-requests?unitId=${unitIdParam}` : '/app/material-requests');
                return;
              }
              setAbaAtiva(aba.id as any);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              abaAtiva === aba.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {aba.icon}{aba.label}
            {(aba as any).badge > 0 && (
              <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {(aba as any).badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ABA: HOJE */}
      {abaAtiva === 'inicio' && (
        <div className="space-y-5">

          {/* Indicadores do dia — bloco compacto e operacional com drill-down */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Pendências → aba planejamentos (principal pendência acionável) */}
            <button
              onClick={() => setAbaAtiva('planejamentos')}
              className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Pendências</p>
              <p className="mt-1.5 text-3xl font-bold group-hover:text-blue-300 transition-colors">{totalPendencias}</p>
              <p className="mt-1 text-xs text-slate-400">{(dashboard?.planejamentosParaRevisar ?? 0)} planos · {(dashboard?.requisicoesParaAnalisar ?? 0)} pedidos</p>
              <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver planejamentos →</p>
            </button>
            {/* Chamadas hoje → aba turmas */}
            <button
              onClick={() => setAbaAtiva('turmas')}
              className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Chamadas hoje</p>
              <p className="mt-1.5 text-3xl font-bold group-hover:text-emerald-300 transition-colors">{totalTurmasHoje > 0 ? `${Math.round((turmasComChamadaHoje / totalTurmasHoje) * 100)}%` : '—'}</p>
              <p className="mt-1 text-xs text-slate-400">{turmasComChamadaHoje} de {totalTurmasHoje} turmas</p>
              <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver status das turmas →</p>
            </button>
            {/* Diários → aba pedagógico (sub-aba diários) */}
            <button
              onClick={() => setAbaAtiva('pedagogico')}
              className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Diários</p>
              <p className="mt-1.5 text-3xl font-bold group-hover:text-amber-300 transition-colors">{dashboard?.diariosEstaSemana ?? 0}</p>
              <p className="mt-1 text-xs text-slate-400">{diariosPublicados} publicados · {diariosRascunho} rascunho(s)</p>
              <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver diários →</p>
            </button>
            {/* Turmas → aba turmas */}
            <button
              onClick={() => setAbaAtiva('turmas')}
              className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Turmas</p>
              <p className="mt-1.5 text-3xl font-bold group-hover:text-violet-300 transition-colors">{dashboard?.turmas ?? 0}</p>
              <p className="mt-1 text-xs text-slate-400">{dashboard?.alunosTotal ?? 0} alunos · {dashboard?.professores ?? 0} professores</p>
              <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver todas as turmas →</p>
            </button>
          </div>

          {/* Atalhos rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {atalhosExecutivos.map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className={`group rounded-2xl bg-gradient-to-br ${item.className} p-[1px] text-left shadow-sm transition-transform duration-200 hover:-translate-y-0.5`}
              >
                <div className="h-full rounded-2xl bg-slate-950/80 px-4 py-4 backdrop-blur-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                      {item.icon}
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-blue-100/75">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Alertas automáticos calculados no dashboard (fallback) */}
          {!loadingAlertas && (!alertasReais || alertasReais.total === 0) && dashboard?.alertas && (dashboard.alertas as any[]).length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Atenção hoje
              </p>
              <ul className="space-y-1">
                {(dashboard.alertas as any[]).map((a: any, i: number) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                    {typeof a === 'string' ? a : (a.mensagem ?? JSON.stringify(a))}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loadingAlertas && (
            <Card className="rounded-2xl border-2 border-blue-200 bg-blue-50">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-blue-800"><AlertCircle className="h-5 w-5"/>Atualizando alertas</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700">Carregando alertas da unidade e resumo de diários...</p>
              </CardContent>
            </Card>
          )}

          {/* Alertas reais do banco */}
          {alertasReais && alertasReais.total > 0 && (
            <div className="space-y-2">
              {alertasReais.criticos.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {alertasReais.criticos.length} alerta{alertasReais.criticos.length > 1 ? 's' : ''} crítico{alertasReais.criticos.length > 1 ? 's' : ''}
                  </p>
                  <ul className="space-y-1">
                    {alertasReais.criticos.map((a: any) => (
                      <li key={a.id} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                        <span><strong>{a.titulo}</strong> — {a.descricao}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {alertasReais.atencao.length > 0 && (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {alertasReais.atencao.length} atenção
                  </p>
                  <ul className="space-y-1">
                    {alertasReais.atencao.map((a: any) => (
                      <li key={a.id} className="text-sm text-orange-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
                        {a.titulo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Status das turmas hoje */}
          {(dashboard?.turmasLista ?? []).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-800">Status das Turmas — Hoje</p>
                <button
                  onClick={() => setAbaAtiva('turmas')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver todas as turmas →
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {(dashboard.turmasLista ?? []).map(turma => (
                  <div key={turma.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{turma.nome}</p>
                        <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor || 'Sem professor'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        turma.chamadaFeita ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {turma.chamadaFeita ? '✓ Chamada' : '⏳ Pendente'}
                      </span>
                      <button
                        onClick={() => navigate(`/app/turma/${turma.id}/painel`)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Painel →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações pendentes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(dashboard?.planejamentosParaRevisar ?? 0) > 0 && (
              <button
                onClick={() => setAbaAtiva('planejamentos')}
                className="flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-left hover:bg-amber-100 transition-all"
              >
                <span className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {dashboard?.planejamentosParaRevisar}
                </span>
                <div>
                  <p className="text-sm font-bold text-amber-800">Planejamentos</p>
                  <p className="text-xs text-amber-600">aguardando revisão</p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-500 ml-auto" />
              </button>
            )}
            {(dashboard?.requisicoesParaAnalisar ?? 0) > 0 && (
              <button
                onClick={() => navigate(unitIdParam ? `/app/material-requests?unitId=${unitIdParam}` : '/app/material-requests')}
                className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-left hover:bg-red-100 transition-all"
              >
                <span className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {dashboard?.requisicoesParaAnalisar}
                </span>
                <div>
                  <p className="text-sm font-bold text-red-800">Pedidos de material</p>
                  <p className="text-xs text-red-600">{canApprove ? 'aguardando aprovação' : 'para visualizar e analisar'}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-red-500 ml-auto" />
              </button>
            )}
            <button
              onClick={() => navigate('/app/atendimentos-pais')}
              className="flex items-center gap-3 p-4 bg-violet-50 border-2 border-violet-200 rounded-2xl text-left hover:bg-violet-100 transition-all"
            >
              <span className="w-10 h-10 bg-violet-500 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-violet-800">Atendimentos Pais</p>
                <p className="text-xs text-violet-600">Registrar reunião e gerar PDF</p>
              </div>
              <ChevronRight className="h-4 w-4 text-violet-500 ml-auto flex-shrink-0" />
            </button>
          </div>

          {/* Recados */}
          <RecadosWidget unitId={unitIdParam} />
        </div>
      )}

      {/* ABA: TURMAS — visão consolidada de todas as turmas da unidade */}
      {abaAtiva === 'turmas' && (
        <div className="space-y-4">

          {/* Resumo pedagógico da semana */}
          {dashboard && (
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Diários esta semana',
                  val: dashboard.diariosEstaSemana ?? (dashboard as any).indicadores?.diariosHoje ?? 0,
                  icon: <ClipboardList className="h-4 w-4 text-blue-600" />,
                  bg: 'bg-blue-50',
                  onClick: () => setAbaAtiva('diarios' as any),
                },
                {
                  label: 'Turmas com chamada',
                  val: `${(dashboard as any).indicadores?.turmasComChamadaHoje ?? 0}/${(dashboard as any).indicadores?.totalTurmas ?? dashboard.turmas ?? 0}`,
                  icon: <CheckCircle className="h-4 w-4 text-emerald-600" />,
                  bg: 'bg-emerald-50',
                  onClick: undefined as (() => void) | undefined,
                },
                {
                  label: 'Cobertura hoje',
                  val: (dashboard as any).indicadores?.diariosHoje > 0 ? `${(dashboard as any).indicadores.diariosHoje} reg.` : '—',
                  icon: <BarChart2 className="h-4 w-4 text-purple-600" />,
                  bg: 'bg-purple-50',
                  onClick: () => { setCobertura(null); setPendencias(null); carregarCobertura(); },
                },
              ].map(c => (
                <button
                  key={c.label}
                  onClick={c.onClick}
                  disabled={!c.onClick}
                  className={`${c.bg} rounded-2xl p-3 text-center ${c.onClick ? 'hover:opacity-90 cursor-pointer transition-opacity' : 'cursor-default'}`}
                >
                  <div className="flex justify-center mb-1">{c.icon}</div>
                  <p className="text-lg font-bold text-gray-800">{c.val}</p>
                  <p className="text-[11px] text-gray-500">{c.label}</p>
                </button>
              ))}
            </div>
          )}

          {/* Lista de turmas com acesso rápido */}
          <div className="space-y-2">
            {(dashboard?.turmasLista ?? []).map(turma => (
              <div key={turma.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-200 transition-colors">
                {/* Cabeçalho da turma */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{turma.nome}</p>
                      <p className="text-xs text-gray-400">
                        {turma.totalAlunos} alunos · Prof. {turma.professor || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      turma.chamadaFeita
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {turma.chamadaFeita ? '✓ Chamada' : '⏳ Pendente'}
                    </span>
                  </div>
                </div>
                {/* Ações rápidas */}
                <div className="grid grid-cols-5 gap-0 border-t border-gray-50">
                  {[
                    {
                      label: 'Diários',
                      color: 'text-blue-600',
                      bg: 'hover:bg-blue-50',
                      onClick: () => navigate(
                        `/app/diario-calendario?classroomId=${turma.id}`
                      ),
                    },
                    { label: 'Planos', path: `/app/planejamentos?classroomId=${turma.id}`, color: 'text-amber-600', bg: 'hover:bg-amber-50' },
                    { label: 'RDIC', path: `/app/rdic-coord?classroomId=${turma.id}`, color: 'text-violet-600', bg: 'hover:bg-violet-50' },
                    { label: 'Painel', path: `/app/turma/${turma.id}/painel`, color: 'text-teal-600', bg: 'hover:bg-teal-50' },
                    { label: 'Obs.', path: `/app/coordenacao/observacoes?classroomId=${turma.id}`, color: 'text-pink-600', bg: 'hover:bg-pink-50' },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => ('onClick' in item ? item.onClick() : navigate(item.path))}
                      className={`py-2.5 text-[11px] font-semibold ${item.color} ${item.bg} transition-colors text-center border-r border-gray-50 last:border-0`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Diários recentes da unidade */}
          {diarios.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">
                Diários recentes — todas as turmas
              </p>
              <div className="space-y-2">
                {diarios.slice(0, 6).map((diario: any) => {
                  const legacyTurma = diario['turmaNome'];
                  const legacyProfessor = diario['professorNome'];
                  const legacyData = diario['data'];
                  const turmaNm = diario.classroom?.name || legacyTurma || '—';
                  const professorNm = diario.createdByUser
                    ? `${diario.createdByUser.firstName ?? ''} ${diario.createdByUser.lastName ?? ''}`.trim()
                    : legacyProfessor || '—';
                  const dataRaw = diario.eventDate || legacyData || diario.createdAt || '';
                  const dataFmt = dataRaw
                    ? new Date(dataRaw.includes('T') ? dataRaw : `${dataRaw}T12:00:00`)
                        .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    : '—';
                  const ctx      = diario.aiContext && typeof diario.aiContext === 'object'
                    ? diario.aiContext as any : {};
                  const publicado = ['PUBLICADO','REVISADO','ARQUIVADO']
                    .includes((diario.status || '').toUpperCase());
                  return (
                    <div key={diario.id}
                      className={`rounded-xl border px-4 py-2.5 bg-white flex items-center justify-between gap-3 ${
                        publicado ? 'border-emerald-100' : 'border-amber-100'
                      }`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{turmaNm}</p>
                        <p className="text-xs text-gray-400">
                          {professorNm}
                          {ctx.presencas != null && <span className="ml-2 text-emerald-600">· {ctx.presencas} pres.</span>}
                          {ctx.climaEmocional && <span className="ml-1">· {ctx.climaEmocional}</span>}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{dataFmt}</span>
                    </div>
                  );
                })}
                {diarios.length > 6 && (
                  <button
                    onClick={() => setAbaAtiva('diarios' as any)}
                    className="w-full py-2 text-xs text-blue-600 hover:underline font-medium"
                  >
                    Ver todos os {diarios.length} diários →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Cobertura inline */}
          {cobertura && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">Cobertura — hoje</p>
              <div className="space-y-2">
                {(cobertura.turmas ?? []).map((cls: any) => (
                  <div key={cls.classroomId}
                    className="bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex items-center gap-3">
                    <p className="text-sm font-medium text-gray-800 flex-1 truncate">{cls.classroomName}</p>
                    <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                      <div
                        className={`h-full rounded-full ${
                          (cls.percentual ?? 0) >= 80 ? 'bg-emerald-500'
                          : (cls.percentual ?? 0) >= 40 ? 'bg-amber-400'
                          : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.max(cls.percentual ?? 0, 2)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold flex-shrink-0 ${
                      (cls.percentual ?? 0) >= 80 ? 'text-emerald-600'
                      : (cls.percentual ?? 0) >= 40 ? 'text-amber-600'
                      : 'text-red-500'
                    }`}>{cls.percentual ?? 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA: PLANEJAMENTOS — compacto por turma */}
      {abaAtiva === 'planejamentos' && (() => {
        const STATUS_CFG: Record<string, { label: string; cor: string; dot: string }> = {
          RASCUNHO:   { label: 'Rascunho',   cor: 'bg-gray-100 text-gray-600 border-gray-300',      dot: 'bg-gray-400'   },
          EM_REVISAO: { label: 'Em Revisão', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' },
          APROVADO:   { label: 'Aprovado',   cor: 'bg-green-100 text-green-700 border-green-300',   dot: 'bg-green-500'  },
          DEVOLVIDO:  { label: 'Devolvido',  cor: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
          PUBLICADO:  { label: 'Publicado',  cor: 'bg-blue-100 text-blue-700 border-blue-300',      dot: 'bg-blue-500'   },
          CONCLUIDO:  { label: 'Concluído',  cor: 'bg-purple-100 text-purple-700 border-purple-300', dot: 'bg-purple-500' },
        };

        // Agrupar por turma
        const porTurma: Record<string, {
          turmaNome: string; professor: string;
          itens: typeof planejamentos;
        }> = {};
        for (const p of planejamentos) {
          const chave = (p as any).classroom?.id || (p as any).classroomId || p.turmaNome || 'sem-turma';
          const nome  = (p as any).classroom?.name || p.turmaNome || chave;
          const prof  = (p as any).createdByUser
            ? `${(p as any).createdByUser.firstName} ${(p as any).createdByUser.lastName}`.trim()
            : p.professorNome || '—';
          if (!porTurma[chave]) porTurma[chave] = { turmaNome: nome, professor: prof, itens: [] };
          porTurma[chave].itens.push(p);
        }
        const grupos = Object.entries(porTurma);

        // Contadores globais
        const pendentes = planejamentos.filter(p =>
          p.status === 'EM_REVISAO' || p.status === 'RASCUNHO' || p.status === 'DEVOLVIDO'
        ).length;

        return (
          <div className="space-y-3">

            {/* Cabeçalho resumido */}
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-semibold text-gray-800">Planejamentos</p>
                <p className="text-xs text-gray-400">
                  {grupos.length} turma{grupos.length !== 1 ? 's' : ''} · {planejamentos.length} plano{planejamentos.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pendentes > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full border border-amber-200">
                    {pendentes} pendente{pendentes !== 1 ? 's' : ''}
                  </span>
                )}
                <button onClick={loadDashboard}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {planejamentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-gray-100 gap-2">
                <BookOpen className="h-10 w-10 text-gray-200" />
                <p className="text-sm font-semibold text-gray-400">Nenhum planejamento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {grupos.map(([chave, grupo]) => {
                  const aberto = turmaExpandida === chave;
                  const temPendente = grupo.itens.some(p =>
                    ['EM_REVISAO','RASCUNHO','DEVOLVIDO'].includes(p.status || '')
                  );
                  const countPendente = grupo.itens.filter(p =>
                    ['EM_REVISAO','RASCUNHO','DEVOLVIDO'].includes(p.status || '')
                  ).length;

                  return (
                    <div key={chave} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

                      {/* Header da turma — sempre visível */}
                      <button
                        onClick={() => setTurmaExpandida(aberto ? null : chave)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{grupo.turmaNome}</p>
                            <p className="text-xs text-gray-400 truncate">Prof. {grupo.professor}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs text-gray-400">
                            {grupo.itens.length} plano{grupo.itens.length !== 1 ? 's' : ''}
                          </span>
                          {temPendente && (
                            <span className="text-[11px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                              {countPendente} pendente{countPendente !== 1 ? 's' : ''}
                            </span>
                          )}
                          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${aberto ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {/* Lista de planos — só aparece quando expandido */}
                      {aberto && (
                        <div className="divide-y divide-gray-50 border-t border-gray-100">
                          {grupo.itens.map(plan => {
                            const cfg = STATUS_CFG[(plan.status || '').toUpperCase()] ?? STATUS_CFG.RASCUNHO;
                            const dataRaw = (plan as any).startDate || '';
                            const dataFmt = dataRaw
                              ? new Date(dataRaw.includes('T') ? dataRaw : dataRaw + 'T12:00:00')
                                  .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                              : '—';
                            return (
                              <div key={plan.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                      {plan.title || 'Planejamento'}
                                    </p>
                                    <p className="text-xs text-gray-400">{dataFmt}</p>
                                    {(plan as any).reviewComment && (
                                      <p className="text-xs text-red-500 mt-0.5 truncate">
                                        💬 {(plan as any).reviewComment}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${cfg.cor}`}>
                                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${cfg.dot}`} />
                                      {cfg.label}
                                    </span>
                                    {canApprove && ['EM_REVISAO','RASCUNHO'].includes(plan.status || '') && (
                                      <>
                                        <button
                                          onClick={() => aprovarPlanejamento(plan.id)}
                                          disabled={processando === plan.id}
                                          className="text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-semibold transition-colors disabled:opacity-50"
                                        >
                                          Aprovar
                                        </button>
                                        <button
                                          onClick={() => setItemParaRejeitar({ id: plan.id, tipo: 'plan' })}
                                          className="text-[11px] bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 rounded-lg font-semibold transition-colors"
                                        >
                                          Devolver
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => navigate(`/app/planejamento/${plan.id}/conferir`)}
                                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline"
                                    >
                                      Ver →
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal devolução */}
            {itemParaRejeitar?.tipo === 'plan' && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
                  <h3 className="font-bold text-gray-800 mb-3">Devolver Planejamento</h3>
                  <textarea
                    rows={4}
                    value={motivoRejeicao}
                    onChange={e => setMotivoRejeicao(e.target.value)}
                    placeholder="Descreva o que precisa ser ajustado..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => { setItemParaRejeitar(null); setMotivoRejeicao(''); }}
                      className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => devolverPlanejamento(itemParaRejeitar.id, motivoRejeicao)}
                      disabled={!motivoRejeicao.trim()}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40"
                    >
                      Devolver
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}


      {/* ══════════════════════════════════════════════════════════════════
          ABA: PEDAGÓGICO (diários + turmas + cobertura)
      ══════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'pedagogico' && (
        <PedagogicoSubNav
          diarios={diarios}
          turmasLista={dashboard?.turmasLista ?? []}
          cobertura={cobertura}
          loadingCobertura={loadingCobertura}
          carregarCobertura={carregarCobertura}
          setCobertura={setCobertura}
          setPendencias={setPendencias}
          navigate={navigate}
        />
      )}

      {/* ABA: DIÁRIOS */}
      {abaAtiva === 'diarios' && (
        <div className="space-y-4">
          {/* Header com resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(() => {
              const publicados = diarios.filter(d => ['PUBLICADO','REVISADO','ARQUIVADO'].includes((d.status||'').toUpperCase())).length;
              const rascunhos = diarios.filter(d => (d.status||'').toUpperCase() === 'RASCUNHO').length;
              const comExecucao = diarios.filter(d => d.statusExecucaoPlano === 'CUMPRIDO').length;
              const presencaMedia = diarios.filter(d => d.presencas != null).reduce((acc, d, _, arr) => {
                const total = (d.presencas ?? 0) + (d.ausencias ?? 0);
                return total > 0 ? acc + ((d.presencas ?? 0) / total) * 100 / arr.length : acc;
              }, 0);
              return (
                <>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{publicados}</p>
                    <p className="text-xs text-emerald-600 mt-0.5 font-medium">Publicados</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">{rascunhos}</p>
                    <p className="text-xs text-amber-600 mt-0.5 font-medium">Rascunhos</p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{comExecucao}</p>
                    <p className="text-xs text-blue-600 mt-0.5 font-medium">Plano cumprido</p>
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3 text-center">
                    <p className="text-2xl font-bold text-violet-700">{presencaMedia > 0 ? `${Math.round(presencaMedia)}%` : '—'}</p>
                    <p className="text-xs text-violet-600 mt-0.5 font-medium">Presença média</p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* FIX P4-3: Filtros operacionais por turma, status, data e professor */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtrar diários</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Turma</label>
                <input
                  type="text"
                  placeholder="Buscar turma..."
                  value={filtroDiarioTurma}
                  onChange={e => setFiltroDiarioTurma(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={filtroDiarioStatus}
                  onChange={e => setFiltroDiarioStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="TODOS">Todos</option>
                  <option value="PUBLICADO">Publicado</option>
                  <option value="RASCUNHO">Rascunho</option>
                  <option value="REVISADO">Revisado</option>
                  <option value="ARQUIVADO">Arquivado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data início</label>
                <input
                  type="date"
                  value={filtroDiarioDataInicio}
                  onChange={e => setFiltroDiarioDataInicio(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data fim</label>
                <input
                  type="date"
                  value={filtroDiarioDataFim}
                  onChange={e => setFiltroDiarioDataFim(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Professor</label>
                <input
                  type="text"
                  placeholder="Buscar professor..."
                  value={filtroDiarioProfessor}
                  onChange={e => setFiltroDiarioProfessor(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <button
                onClick={() => { setFiltroDiarioTurma(''); setFiltroDiarioStatus('TODOS'); setFiltroDiarioDataInicio(''); setFiltroDiarioDataFim(''); setFiltroDiarioProfessor(''); }}
                className="mt-4 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          </div>

          {/* Lista de diários */}
          {(() => {
            const diariosFiltrados = (diarios as any[]).filter((d: any) => {
              const turma = d.classroom?.name || d.turmaNome || '';
              const professor = d.createdByUser
                ? `${d.createdByUser.firstName ?? ''} ${d.createdByUser.lastName ?? ''}`.trim()
                : d.professorNome || '';
              const dataRaw = (d.eventDate || d.data || d.createdAt || '').substring(0, 10);
              const status = (d.status || '').toUpperCase();
              if (filtroDiarioTurma && !turma.toLowerCase().includes(filtroDiarioTurma.toLowerCase())) return false;
              if (filtroDiarioProfessor && !professor.toLowerCase().includes(filtroDiarioProfessor.toLowerCase())) return false;
              if (filtroDiarioStatus !== 'TODOS') {
                const isPublicado = ['PUBLICADO','REVISADO','ARQUIVADO'].includes(status);
                if (filtroDiarioStatus === 'PUBLICADO' && !isPublicado) return false;
                if (filtroDiarioStatus === 'RASCUNHO' && status !== 'RASCUNHO') return false;
                if (filtroDiarioStatus === 'REVISADO' && status !== 'REVISADO') return false;
                if (filtroDiarioStatus === 'ARQUIVADO' && status !== 'ARQUIVADO') return false;
              }
              if (filtroDiarioDataInicio && dataRaw < filtroDiarioDataInicio) return false;
              if (filtroDiarioDataFim && dataRaw > filtroDiarioDataFim) return false;
              return true;
            });
            return diariosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-gray-100 gap-2">
              <ClipboardList className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">{diarios.length === 0 ? 'Nenhum diário registrado neste período.' : 'Nenhum diário encontrado com os filtros aplicados.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {diariosFiltrados.slice(0, paginaDiarios * ITENS_POR_PAGINA).map((diario: any) => {
                const turma = diario.classroom?.name || diario.turmaNome || '—';
                const professor = diario.createdByUser
                  ? `${diario.createdByUser.firstName ?? ''} ${diario.createdByUser.lastName ?? ''}`.trim()
                  : diario.professorNome || '—';
                const dataRaw = diario.eventDate || diario.data || diario.createdAt || '';
                const dataFmt = dataRaw
                  ? new Date(dataRaw.includes('T') ? dataRaw : `${dataRaw}T12:00:00`).toLocaleDateString('pt-BR', {
                    weekday: 'short', day: '2-digit', month: '2-digit',
                  })
                  : '—';
                const status = (diario.status || '').toUpperCase();
                const ctx = diario.aiContext && typeof diario.aiContext === 'object'
                  ? diario.aiContext as any : {};
                const publicado = ['PUBLICADO', 'REVISADO', 'ARQUIVADO'].includes(status);

                const entrada = diario.curriculumEntry;
                const campo = entrada?.campoDeExperiencia?.replace(/_/g, ' ') ?? null;
                const bncc = entrada?.objetivoBNCC ?? null;
                const curricDF = entrada?.objetivoCurriculo ?? null;
                const intenc = entrada?.intencionalidade ?? null;
                const codigoBNCC = entrada?.objetivoBNCCCode ?? null;

                const conferencia = diario.conferencia;
                const plano = diario.planning;
                const execStatus = ctx.statusExecucaoPlano || conferencia?.status || null;

                const EXEC_CFG: Record<string, { label: string; bg: string; text: string }> = {
                  CUMPRIDO: { label: 'Cumprido', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                  FEITO: { label: 'Feito', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                  PARCIAL: { label: 'Parcial', bg: 'bg-amber-50', text: 'text-amber-700' },
                  NAO_REALIZADO: { label: 'Não realizado', bg: 'bg-red-50', text: 'text-red-700' },
                };
                const execCfg = execStatus ? (EXEC_CFG[execStatus] ?? null) : null;

                const CLIMA: Record<string, string> = {
                  OTIMO: 'Ótimo', BOM: 'Bom', REGULAR: 'Regular', AGITADO: 'Agitado', DIFICIL: 'Difícil',
                };

                const metricasTurma = metricasExecucao[diario.classroomId] ?? null;

                return (
                  <div
                    key={diario.id}
                    className={`rounded-2xl border bg-white overflow-hidden ${
                      publicado ? 'border-emerald-200' : 'border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/70">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                            publicado
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {publicado ? 'Publicado' : 'Rascunho'}
                          </span>
                          {execCfg && (
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${execCfg.bg} ${execCfg.text}`}>
                              Execução: {execCfg.label}
                            </span>
                          )}
                          {diario.curriculumEntryId && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              BNCC vinculada
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-gray-900 truncate">{turma}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Prof. {professor}
                          {diario.presencas != null && (
                            <span className="ml-2 text-emerald-600 font-medium">· {diario.presencas} presentes</span>
                          )}
                          {diario.ausencias != null && (
                            <span className="ml-2 text-rose-500 font-medium">· {diario.ausencias} ausências</span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-gray-400 flex-shrink-0 mt-0.5">{dataFmt}</span>
                    </div>

                    <div className="p-4 space-y-3">
                      {(diario.momentoDestaque || diario.title) && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Registro</p>
                          <p className="mt-1 text-sm text-gray-700 leading-6">
                            {diario.momentoDestaque || diario.title}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">BNCC / Currículo</p>
                          {entrada ? (
                            <div className="mt-2 space-y-1.5 text-sm text-indigo-900">
                              {campo && <p><span className="font-semibold">Campo:</span> {campo}</p>}
                              {codigoBNCC && <p><span className="font-semibold">Código:</span> {codigoBNCC}</p>}
                              {bncc && <p><span className="font-semibold">Objetivo BNCC:</span> {bncc}</p>}
                              {curricDF && <p><span className="font-semibold">Currículo:</span> {curricDF}</p>}
                              {intenc && <p><span className="font-semibold">Intencionalidade:</span> {intenc}</p>}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-indigo-700">Sem vínculo de BNCC neste diário.</p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Conferência de execução</p>
                          {plano ? (
                            <div className="mt-2 space-y-1.5 text-sm text-emerald-900">
                              <p><span className="font-semibold">Plano:</span> {plano.title}</p>
                              <p><span className="font-semibold">Status do plano:</span> {plano.status}</p>
                              {execCfg && <p><span className="font-semibold">Execução:</span> {execCfg.label}</p>}
                              {conferencia?.observacao && <p><span className="font-semibold">Observação:</span> {conferencia.observacao}</p>}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-emerald-700">Diário sem planejamento vinculado.</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Clima</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{CLIMA[diario.climaEmocional || ctx.climaEmocional] ?? '—'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Métrica turma</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{metricasTurma ? `${metricasTurma.publicados}/${metricasTurma.total} publicados` : '—'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Com BNCC</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{metricasTurma ? `${metricasTurma.comMatriz}/${metricasTurma.total}` : '—'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Com plano</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{metricasTurma ? `${metricasTurma.comPlano}/${metricasTurma.total}` : '—'}</p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/app/diario-calendario?classroomId=${diario.classroomId ?? diario.classroom?.id ?? ''}`);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Ver diário completo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {diariosFiltrados.length > paginaDiarios * ITENS_POR_PAGINA && (
                <button
                  onClick={() => setPaginaDiarios(p => p + 1)}
                  className="w-full py-3 text-sm text-blue-600 hover:bg-blue-50 rounded-2xl border border-blue-100 font-medium transition-colors mt-2"
                >
                  Carregar mais ({diariosFiltrados.length - paginaDiarios * ITENS_POR_PAGINA} restantes)
                </button>
              )}
            </div>
          );
          })()
          }
        </div>
      )}
      {/* ABA: OBSERVAÇÕES INDIVIDUAIS */}
      {abaAtiva === 'observacoes' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
            <p className="text-sm text-teal-700">
              Visualize as observações individuais registradas pelos professores para cada aluno.
              Você pode filtrar por turma, aluno ou categoria.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {dashboard?.turmasLista?.map(turma => (
              <button key={turma.id}
                onClick={() => navigate(`/app/coordenacao/observacoes?classroomId=${turma.id}`)}
                className="p-4 bg-white border-2 border-teal-100 rounded-2xl text-left hover:border-teal-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                    <Brain className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{turma.nome}</p>
                    <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ABA: SALA DE AULA VIRTUAL */}
      {abaAtiva === 'sala' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <p className="text-sm text-indigo-700">
              Acompanhe as atividades e tarefas publicadas pelos professores na Sala de Aula Virtual.
              Visualize o desempenho individual de cada aluno por atividade.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {dashboard?.turmasLista?.map(turma => (
              <button key={turma.id}
                onClick={() => navigate(`/app/sala-de-aula-virtual?classroomId=${turma.id}`)}
                className="p-4 bg-white border-2 border-indigo-100 rounded-2xl text-left hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{turma.nome}</p>
                    <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ABA: RELATÓRIOS */}
      {/* ABA: RELATÓRIOS */}
      {abaAtiva === 'relatorios' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 px-1">Acesso direto aos relatórios da unidade</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Diários por turma',     path: unitIdParam ? `/app/reports?unitId=${unitIdParam}` : '/app/reports',                         icon: <ClipboardList className="h-5 w-5 text-blue-600" />,   bg: 'bg-blue-50',   border: 'border-blue-100'   },
              { label: 'Consumo de materiais',  path: unitIdParam ? `/app/relatorio-consumo-materiais?unitId=${unitIdParam}` : '/app/relatorio-consumo-materiais', icon: <ShoppingCart className="h-5 w-5 text-orange-600" />, bg: 'bg-orange-50', border: 'border-orange-100' },
              { label: 'Desenvolvimento',       path: unitIdParam ? `/app/desenvolvimento-infantil?unitId=${unitIdParam}` : '/app/desenvolvimento-infantil', icon: <Brain className="h-5 w-5 text-purple-600" />,        bg: 'bg-purple-50', border: 'border-purple-100' },
              { label: 'RDICs publicados',      path: '/app/rdic-geral',                                                                           icon: <FileText className="h-5 w-5 text-teal-600" />,        bg: 'bg-teal-50',   border: 'border-teal-100'   },
              { label: 'Requisições aprovadas', path: '/app/material-requests',                                                                    icon: <CheckCircle className="h-5 w-5 text-emerald-600" />,  bg: 'bg-emerald-50',border: 'border-emerald-100' },
              { label: 'Ocorrências',           path: '/app/ocorrencias',                                                                          icon: <TriangleAlert className="h-5 w-5 text-red-500" />,    bg: 'bg-red-50',    border: 'border-red-100'    },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.path)}
                className={`${item.bg} border ${item.border} rounded-2xl p-4 text-left hover:opacity-90 transition-opacity`}>
                <div className="mb-2">{item.icon}</div>
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PR 141: ABA OCORRÊNCIAS — painel de ocorrências da unidade para a coordenação pedagógica */}
      {abaAtiva === 'ocorrencias' && (
        <OcorrenciasPanel
          titulo="Ocorrências da Unidade"
          unitId={unitIdParam ?? user?.unitId ?? undefined}
        />
      )}
    </PageShell>
  );
}
</file>

</files>
