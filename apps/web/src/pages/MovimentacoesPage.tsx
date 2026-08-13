/**
 * MovimentacoesPage — Cancelamentos e Transferências
 *
 * Permite cancelar matrículas (status CANCELADA) e transferir alunos
 * entre turmas (nova matrícula + marcação da anterior como TRANSFERIDA).
 *
 * RBAC: UNIDADE_ADMINISTRATIVO, UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
 * Usa endpoints existentes: GET /children, PATCH /children/:id/enrollment/:eid,
 * POST /children/:id/enrollment
 */

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Button } from '../components/ui/button';
import { ChildAvatar } from '../components/children/ChildAvatar';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { toast } from 'sonner';
import {
  Search, RefreshCw, XCircle, Loader2, Users,
  ArrowRightLeft, UserMinus, ChevronDown, ChevronUp,
  AlertTriangle,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Enrollment {
  id: string;
  status: string;
  classroomId: string;
  enrollmentDate: string;
  classroom?: { name: string };
}

interface Aluno {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  enrollments: Enrollment[];
}

interface Turma {
  id: string;
  name: string;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function MovimentacoesPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [acao, setAcao] = useState<'cancelar' | 'transferir' | null>(null);
  const [novasTurmaId, setNovaTurmaId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [alunosRes, turmasRes] = await Promise.allSettled([
        http.get('/children', { params: { limit: 200 } }),
        http.get('/lookup/classrooms/accessible'),
      ]);
      if (alunosRes.status === 'fulfilled') {
        const data = alunosRes.value.data;
        const lista: Aluno[] = Array.isArray(data) ? data : data?.data ?? [];
        // Apenas alunos com matrícula ativa
        setAlunos(lista.filter(a => a.enrollments?.some(e => e.status === 'ATIVA')));
      }
      if (turmasRes.status === 'fulfilled') {
        setTurmas(Array.isArray(turmasRes.value.data) ? turmasRes.value.data : []);
      }
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const alunosFiltrados = alunos.filter(a =>
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(busca.toLowerCase()),
  );

  const enrollmentAtiva = (a: Aluno) => a.enrollments.find(e => e.status === 'ATIVA');

  const executarCancelamento = async () => {
    if (!alunoSelecionado) return;
    const enr = enrollmentAtiva(alunoSelecionado);
    if (!enr) return;
    setSalvando(true);
    try {
      await http.patch(`/children/${alunoSelecionado.id}/enrollment/${enr.id}`, {
        status: 'CANCELADA',
      });
      toast.success('Matrícula cancelada com sucesso.');
      setAlunoSelecionado(null);
      setAcao(null);
      setMotivo('');
      carregar();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const executarTransferencia = async () => {
    if (!alunoSelecionado || !novasTurmaId) return;
    const enr = enrollmentAtiva(alunoSelecionado);
    if (!enr) return;
    setSalvando(true);
    try {
      // Marcar matrícula atual como transferida sem exclusão
      await http.patch(`/children/${alunoSelecionado.id}/enrollment/${enr.id}`, {
        status: 'TRANSFERIDA',
      });
      // Criar nova matrícula na turma destino
      await http.post(`/children/${alunoSelecionado.id}/enrollment`, {
        classroomId: novasTurmaId,
        enrollmentDate: new Date().toISOString().split('T')[0],
      });
      toast.success('Transferência realizada com sucesso.');
      setAlunoSelecionado(null);
      setAcao(null);
      setMotivo('');
      setNovaTurmaId('');
      carregar();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <PageShell
      title="Cancelamentos e Transferências"
      description="Gerencie movimentações de matrículas"
      headerActions={
        <button
          onClick={carregar}
          disabled={carregando}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      }
    >
      {/* ── Aviso ── */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Cancelamentos e transferências são ações irreversíveis. Certifique-se de que os dados estão corretos antes de confirmar.
        </p>
      </div>

      {/* ── Busca ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
          placeholder="Buscar aluno por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* ── Erro ── */}
      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {erro}
        </div>
      )}

      {/* ── Lista ── */}
      {carregando ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Carregando alunos...</span>
        </div>
      ) : alunosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum aluno com matrícula ativa encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-50">
            <p className="text-xs text-slate-400 font-medium">
              {alunosFiltrados.length} aluno{alunosFiltrados.length !== 1 ? 's' : ''} com matrícula ativa
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {alunosFiltrados.map((aluno) => {
              const enr = enrollmentAtiva(aluno);
              const turmaNome = enr?.classroom?.name
                ?? turmas.find(t => t.id === enr?.classroomId)?.name
                ?? 'Sem turma';
              const isExpanded = alunoSelecionado?.id === aluno.id;

              return (
                <div key={aluno.id}>
                  <button
                    onClick={() => {
                      setAlunoSelecionado(isExpanded ? null : aluno);
                      setAcao(null);
                      setMotivo('');
                      setNovaTurmaId('');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left touch-manipulation"
                  >
                    <ChildAvatar
                      firstName={aluno.firstName}
                      lastName={aluno.lastName}
                      photoUrl={aluno.photoUrl ?? undefined}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {aluno.firstName} {aluno.lastName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{turmaNome}</p>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    }
                  </button>

                  {/* Painel de ações expandido */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                      <div className="pt-3 space-y-3">
                        {/* Seleção de ação */}
                        {!acao && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setAcao('transferir')}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                              Transferir de Turma
                            </button>
                            <button
                              onClick={() => setAcao('cancelar')}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              Cancelar Matrícula
                            </button>
                          </div>
                        )}

                        {/* Formulário de transferência */}
                        {acao === 'transferir' && (
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-slate-600">Transferir para:</p>
                            <select
                              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                              value={novasTurmaId}
                              onChange={(e) => setNovaTurmaId(e.target.value)}
                            >
                              <option value="">Selecione a turma destino</option>
                              {turmas
                                .filter(t => t.id !== enr?.classroomId)
                                .map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                              }
                            </select>
                            <textarea
                              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                              rows={2}
                              placeholder="Motivo da transferência (opcional)"
                              value={motivo}
                              onChange={(e) => setMotivo(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setAcao(null)}
                                className="text-xs px-3 py-1.5 h-auto"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={executarTransferencia}
                                disabled={!novasTurmaId || salvando}
                                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 h-auto"
                              >
                                {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
                                Confirmar Transferência
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Formulário de cancelamento */}
                        {acao === 'cancelar' && (
                          <div className="space-y-3">
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                              <p className="text-xs font-medium text-red-700">
                                Confirmar cancelamento da matrícula de {aluno.firstName} {aluno.lastName}?
                              </p>
                              <p className="text-[11px] text-red-500 mt-0.5">
                                Esta ação encerrará a matrícula ativa na turma {turmaNome}.
                              </p>
                            </div>
                            <textarea
                              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                              rows={2}
                              placeholder="Motivo do cancelamento (opcional)"
                              value={motivo}
                              onChange={(e) => setMotivo(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setAcao(null)}
                                className="text-xs px-3 py-1.5 h-auto"
                              >
                                Voltar
                              </Button>
                              <Button
                                onClick={executarCancelamento}
                                disabled={salvando}
                                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 h-auto"
                              >
                                {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                                Confirmar Cancelamento
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
