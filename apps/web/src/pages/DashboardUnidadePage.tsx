/**
 * Dashboard de Unidade — Gestão Operacional
 * Acesso: Direção, Coordenação Pedagógica, Administrativo, Secretaria, Nutricionista
 * Funcionalidades: pendências, alertas, materiais, planejamentos, CRUD operacional
 */
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle, CheckCircle, Clock, ShoppingCart,
  BookOpen, Users, RefreshCw, ChevronRight, Package,
} from 'lucide-react';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PendenciaTurma {
  turma: string;
  professor: string;
  diariosPendentes: number;
  relatoriosPendentes: number;
  planejamentoPendente: boolean;
}

interface AlertaAluno {
  aluno: string;
  turma: string;
  tipo: string;
  descricao: string;
  data: string;
}

interface RequisicaoMaterial {
  id: string;
  professor: string;
  turma: string;
  titulo: string;
  categoria: string;
  urgencia: string;
  status: string;
  criadoEm: string;
}

interface DadosMateriais {
  categoria: string;
  quantidade: number;
  cor: string;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function DashboardUnidadePage() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'pendencias' | 'alertas' | 'materiais' | 'planejamentos'>('pendencias');

  const [pendencias, setPendencias] = useState<PendenciaTurma[]>([]);
  const [alertas, setAlertas] = useState<AlertaAluno[]>([]);
  const [requisicoes, setRequisicoes] = useState<RequisicaoMaterial[]>([]);
  const [dadosMateriais, setDadosMateriais] = useState<DadosMateriais[]>([]);
  const [kpis, setKpis] = useState({ totalAlunos: 0, totalTurmas: 0, requisicoesAbertas: 0, alertasAtivos: 0 });

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [reqRes] = await Promise.allSettled([
        http.get('/material-requests'),
      ]);

      if (reqRes.status === 'fulfilled') {
        const reqs = reqRes.value.data ?? [];
        setRequisicoes(reqs.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          professor: (r.createdBy as string) ?? 'Professor',
          turma: (r.classroomId as string) ?? '—',
          titulo: (r.title as string) ?? 'Material',
          categoria: (r.type as string) ?? 'OUTRO',
          urgencia: (r.priority as string) ?? 'normal',
          status: (r.status as string) ?? 'SOLICITADO',
          criadoEm: (r.requestedDate as string) ?? new Date().toISOString(),
        })));
        setKpis(k => ({ ...k, requisicoesAbertas: reqs.filter((r: Record<string, unknown>) => r.status === 'SOLICITADO').length }));
      }

      // Dados de demonstração para pendências e alertas
      gerarDadosDemo();
    } catch (e) {
      setErro(getErrorMessage(e));
      gerarDadosDemo();
    } finally {
      setCarregando(false);
    }
  }, []);

  const gerarDadosDemo = () => {
    setKpis({ totalAlunos: 78, totalTurmas: 6, requisicoesAbertas: 3, alertasAtivos: 2 });
    setPendencias([
      { turma: 'Berçário I', professor: 'Ana Paula', diariosPendentes: 2, relatoriosPendentes: 1, planejamentoPendente: false },
      { turma: 'Berçário II', professor: 'Maria José', diariosPendentes: 0, relatoriosPendentes: 0, planejamentoPendente: false },
      { turma: 'Maternal I', professor: 'Fernanda', diariosPendentes: 1, relatoriosPendentes: 2, planejamentoPendente: true },
      { turma: 'Maternal II', professor: 'Carla', diariosPendentes: 0, relatoriosPendentes: 1, planejamentoPendente: false },
      { turma: 'Jardim I', professor: 'Patrícia', diariosPendentes: 3, relatoriosPendentes: 0, planejamentoPendente: false },
      { turma: 'Jardim II', professor: 'Simone', diariosPendentes: 0, relatoriosPendentes: 0, planejamentoPendente: false },
    ]);
    setAlertas([
      { aluno: 'João Pedro', turma: 'Maternal I', tipo: 'Desenvolvimento', descricao: 'Dificuldade na coordenação motora fina observada em 3 registros consecutivos', data: '2026-02-15' },
      { aluno: 'Maria Clara', turma: 'Berçário I', tipo: 'Alimentação', descricao: 'Recusa alimentar persistente — verificar com nutricionista', data: '2026-02-16' },
    ]);
    setDadosMateriais([
      { categoria: 'Pedagógico', quantidade: 5, cor: '#3B82F6' },
      { categoria: 'Higiene', quantidade: 3, cor: '#10B981' },
      { categoria: 'Limpeza', quantidade: 2, cor: '#F59E0B' },
      { categoria: 'Alimentação', quantidade: 1, cor: '#EF4444' },
    ]);
  };

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const aprovarRequisicao = async (id: string) => {
    try {
      await http.patch(`/material-requests/${id}/review`, { decision: 'APPROVED' });
      setRequisicoes(prev => prev.map(r => r.id === id ? { ...r, status: 'APROVADO' } : r));
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const rejeitarRequisicao = async (id: string) => {
    try {
      await http.patch(`/material-requests/${id}/review`, { decision: 'REJECTED' });
      setRequisicoes(prev => prev.map(r => r.id === id ? { ...r, status: 'REJEITADO' } : r));
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const corStatus = (status: string) => {
    const mapa: Record<string, string> = {
      SOLICITADO: 'bg-amber-100 text-amber-700',
      APROVADO: 'bg-emerald-100 text-emerald-700',
      REJEITADO: 'bg-red-100 text-red-700',
      ENTREGUE: 'bg-blue-100 text-blue-700',
    };
    return mapa[status] ?? 'bg-gray-100 text-gray-600';
  };

  const labelStatus = (status: string) => {
    const mapa: Record<string, string> = {
      SOLICITADO: 'Aguardando',
      APROVADO: 'Aprovado',
      REJEITADO: 'Rejeitado',
      ENTREGUE: 'Entregue',
    };
    return mapa[status] ?? status;
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <strong>Aviso:</strong> {erro}. Exibindo dados de demonstração.
        </div>
      )}

      {/* Cards KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: 'Total de Alunos', valor: kpis.totalAlunos, icone: <Users className="h-5 w-5" />, cor: 'text-blue-600 bg-blue-50' },
          { titulo: 'Turmas Ativas', valor: kpis.totalTurmas, icone: <BookOpen className="h-5 w-5" />, cor: 'text-emerald-600 bg-emerald-50' },
          { titulo: 'Requisições Abertas', valor: kpis.requisicoesAbertas, icone: <ShoppingCart className="h-5 w-5" />, cor: 'text-amber-600 bg-amber-50' },
          { titulo: 'Alertas Ativos', valor: kpis.alertasAtivos, icone: <AlertTriangle className="h-5 w-5" />, cor: 'text-red-600 bg-red-50' },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.titulo}</span>
              <div className={`p-1.5 rounded-lg ${card.cor}`}>{card.icone}</div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.valor}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de materiais por categoria */}
      {dadosMateriais.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Requisições de Materiais por Categoria</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dadosMateriais} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="categoria" type="category" tick={{ fontSize: 12 }} width={90} />
              <Tooltip />
              <Bar dataKey="quantidade" name="Requisições" radius={[0, 4, 4, 0]}>
                {dadosMateriais.map((entry, index) => (
                  <rect key={index} fill={entry.cor} />
                ))}
              </Bar>
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

          {/* Aba: Pendências */}
          {abaAtiva === 'pendencias' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-3">Pendências por turma — diários, relatórios e planejamentos em aberto</p>
              {pendencias.map((p, i) => {
                const totalPendencias = p.diariosPendentes + p.relatoriosPendentes + (p.planejamentoPendente ? 1 : 0);
                return (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${totalPendencias > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      {totalPendencias > 0
                        ? <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        : <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      }
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.turma}</p>
                        <p className="text-xs text-gray-500">{p.professor}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs">
                      {p.diariosPendentes > 0 && (
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          {p.diariosPendentes} diário{p.diariosPendentes > 1 ? 's' : ''}
                        </span>
                      )}
                      {p.relatoriosPendentes > 0 && (
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                          {p.relatoriosPendentes} relatório{p.relatoriosPendentes > 1 ? 's' : ''}
                        </span>
                      )}
                      {p.planejamentoPendente && (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          planejamento
                        </span>
                      )}
                      {totalPendencias === 0 && (
                        <span className="text-emerald-600 font-medium">Em dia</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Aba: Alertas */}
          {abaAtiva === 'alertas' && (
            <div className="space-y-3">
              {alertas.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-400" />
                  <p>Nenhum alerta ativo no momento</p>
                </div>
              ) : alertas.map((alerta, i) => (
                <div key={i} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800">{alerta.aluno}</span>
                        <span className="text-xs text-gray-500">— {alerta.turma}</span>
                        <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{alerta.tipo}</span>
                      </div>
                      <p className="text-sm text-gray-700">{alerta.descricao}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(alerta.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Aba: Requisições de Materiais */}
          {abaAtiva === 'materiais' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-3">
                Requisições enviadas pelos professores — encaminhadas preferencialmente à Coordenadora Pedagógica
              </p>
              {requisicoes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>Nenhuma requisição pendente</p>
                </div>
              ) : requisicoes.map((req) => (
                <div key={req.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800">{req.titulo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${corStatus(req.status)}`}>
                          {labelStatus(req.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {req.professor} · {req.categoria} · {req.urgencia === 'alta' ? '🔴 Urgente' : req.urgencia === 'baixa' ? 'Baixa prioridade' : 'Prioridade normal'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(req.criadoEm).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {req.status === 'SOLICITADO' && (
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Aba: Planejamentos */}
          {abaAtiva === 'planejamentos' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-3">Visão geral dos planejamentos por turma</p>
              {pendencias.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.turma}</p>
                    <p className="text-xs text-gray-500">{p.professor}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.planejamentoPendente
                      ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Pendente</span>
                      : <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Atualizado</span>
                    }
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
