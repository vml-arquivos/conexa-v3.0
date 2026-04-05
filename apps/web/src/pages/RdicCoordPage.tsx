/**
 * RdicCoordPage.tsx — SEDF 2026 (Trimestral + Kanban)
 *
 * Alterações vs versão anterior:
 *  - Filtro de Turma OBRIGATÓRIO antes de qualquer chamada à API
 *  - Filtro de Trimestre (1º, 2º, 3º) — SEDF 2026
 *  - Visualização Kanban: Pendentes | Em Rascunho/Devolvidos | Prontos p/ Revisão
 *  - BUG FIX: devolver usava http.patch — corrigido para http.post (alinhado com @Post controller)
 *  - Código defensivo: optional chaining + nullish coalescing + try/catch em toda chamada
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Brain, RefreshCw, CheckCircle, AlertCircle,
  RotateCcw, Globe, Filter, User, Users, TrendingUp,
} from 'lucide-react';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface Turma {
  id: string;
  name: string;
  code: string;
}

interface RdicDaCrianca {
  id: string;
  status: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewComment?: string;
}

interface CriancaStatus {
  childId: string;
  nome: string;
  rdic: RdicDaCrianca | null;
  status: 'PENDENTE' | 'RASCUNHO' | 'EM_REVISAO' | 'DEVOLVIDO' | 'APROVADO' | 'FINALIZADO' | 'PUBLICADO';
}

interface TurmaStatusResponse {
  classroomId: string;
  classroomName: string;
  periodo: string;
  anoLetivo: number;
  completude: number;
  contagem: Record<string, number>;
  criancas: CriancaStatus[];
}

// ─── Constantes ────────────────────────────────────────────────────────────────
const TRIMESTRES = [
  { id: 1, label: '1º Trimestre', periodo: 'Fev–Mai 2026', valor: 'PRIMEIRO_TRIMESTRE'  },
  { id: 2, label: '2º Trimestre', periodo: 'Jun–Set 2026', valor: 'SEGUNDO_TRIMESTRE'   },
  { id: 3, label: '3º Trimestre', periodo: 'Out–Dez 2026', valor: 'TERCEIRO_TRIMESTRE'  },
] as const;

const ANO_LETIVO = 2026;

const KANBAN_COLUNAS = [
  {
    id: 'pendente',
    titulo: '📋 Pendentes',
    cor: 'border-t-slate-400 bg-slate-50',
    header: 'bg-slate-100 text-slate-700',
    statusList: ['PENDENTE'],
  },
  {
    id: 'rascunho',
    titulo: '✏️ Em Rascunho',
    cor: 'border-t-amber-400 bg-amber-50/40',
    header: 'bg-amber-100 text-amber-800',
    statusList: ['RASCUNHO', 'DEVOLVIDO'],
  },
  {
    id: 'revisao',
    titulo: '🔍 Prontos para Revisão',
    cor: 'border-t-emerald-400 bg-emerald-50/40',
    header: 'bg-emerald-100 text-emerald-800',
    statusList: ['EM_REVISAO', 'APROVADO', 'FINALIZADO', 'PUBLICADO'],
  },
] as const;

// ─── StatusPill ────────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDENTE:   'bg-slate-100 text-slate-600',
    RASCUNHO:   'bg-gray-100 text-gray-600',
    DEVOLVIDO:  'bg-orange-100 text-orange-700',
    EM_REVISAO: 'bg-yellow-100 text-yellow-700',
    APROVADO:   'bg-emerald-100 text-emerald-700',
    FINALIZADO: 'bg-blue-100 text-blue-700',
    PUBLICADO:  'bg-green-100 text-green-700',
  };
  const labels: Record<string, string> = {
    PENDENTE: 'Pendente', RASCUNHO: 'Rascunho', DEVOLVIDO: 'Devolvido',
    EM_REVISAO: 'Em Revisão', APROVADO: 'Aprovado',
    FINALIZADO: 'Finalizado', PUBLICADO: 'Publicado',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ─── Modal de Devolução ────────────────────────────────────────────────────────
function ModalDevolucao({
  onConfirmar, onCancelar, salvando,
}: { onConfirmar: (c: string) => void; onCancelar: () => void; salvando: boolean }) {
  const [comentario, setComentario] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <RotateCcw className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Devolver ao Professor</h3>
            <p className="text-sm text-gray-500">Informe o motivo da devolução</p>
          </div>
        </div>
        <Textarea
          placeholder="Ex: Faltou descrever o desenvolvimento motor. Por favor, complemente."
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          className="min-h-[100px] text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">{comentario.length}/500</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirmar(comentario)}
            disabled={salvando || comentario.trim().length < 10}
            className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
          >
            {salvando
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <RotateCcw className="h-4 w-4" />}
            Confirmar
          </Button>
        </div>
        {comentario.length > 0 && comentario.trim().length < 10 && (
          <p className="text-xs text-red-500 mt-1">Mínimo de 10 caracteres.</p>
        )}
      </div>
    </div>
  );
}

// ─── Card Kanban por criança ───────────────────────────────────────────────────
function KanbanCard({
  crianca, onDevolver, onAprovar, onVerDetalhe, salvandoId,
}: {
  crianca: CriancaStatus;
  onDevolver: (id: string) => void;
  onAprovar: (id: string) => void;
  onVerDetalhe: (rdicId: string, childId: string) => void;
  salvandoId: string | null;
}) {
  const rdicId = crianca?.rdic?.id ?? null;
  const isSalvando = salvandoId === rdicId;
  const podeAprovar = crianca.status === 'EM_REVISAO' || crianca.status === 'RASCUNHO';
  const podeDevolver = crianca.status === 'EM_REVISAO';

  return (
    <Card className="hover:shadow-md transition-shadow border border-gray-100">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800 truncate">
              {crianca?.nome ?? 'Criança'}
            </p>
          </div>
          <StatusPill status={crianca?.status ?? 'PENDENTE'} />
        </div>

        {crianca.status === 'DEVOLVIDO' && crianca?.rdic?.reviewComment && (
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 flex gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-700 line-clamp-2">
              {crianca.rdic.reviewComment}
            </p>
          </div>
        )}

        {rdicId && (
          <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-100">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onVerDetalhe(rdicId, crianca.childId)}
              className="text-xs h-7 px-2"
            >
              {podeAprovar ? 'Revisar' : 'Ver'}
            </Button>
            {podeDevolver && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDevolver(rdicId)}
                disabled={isSalvando}
                className="text-xs h-7 px-2 text-orange-600 border-orange-200"
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Devolver
              </Button>
            )}
            {podeAprovar && (
              <Button
                size="sm"
                onClick={() => onAprovar(rdicId)}
                disabled={isSalvando}
                className="text-xs h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSalvando
                  ? <RefreshCw className="h-3 w-3 animate-spin" />
                  : <CheckCircle className="h-3 w-3 mr-1" />}
                Aprovar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function RdicCoordPage() {
  const navigate = useNavigate();

  const [turmaId, setTurmaId]               = useState<string>('');
  const [trimestreId, setTrimestreId]       = useState<number>(1);
  const [turmas, setTurmas]                 = useState<Turma[]>([]);
  const [loadingTurmas, setLoadingTurmas]   = useState(true);
  const [turmaStatus, setTurmaStatus]       = useState<TurmaStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus]   = useState(false);
  const [salvandoId, setSalvandoId]         = useState<string | null>(null);
  const [modalDevolucaoId, setModalDevolucaoId] = useState<string | null>(null);

  // ─── Carregar turmas via endpoint padronizado do projecto ──────────────────
  useEffect(() => {
    const fetchTurmas = async () => {
      setLoadingTurmas(true);
      try {
        const res = await http.get('/lookup/classrooms/accessible');
        const raw = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
        setTurmas(raw.map((t: any) => ({ id: t.id, name: t.name, code: t.code ?? '' })));
      } catch {
        toast.error('Não foi possível carregar as turmas.');
      } finally {
        setLoadingTurmas(false);
      }
    };
    fetchTurmas();
  }, []);

  // ─── Carregar status Kanban (GATE: só executa com turmaId preenchido) ──────
  const carregarStatus = useCallback(async () => {
    if (!turmaId) return;
    setLoadingStatus(true);
    try {
      const trimestre = TRIMESTRES.find(t => t.id === trimestreId);
      const res = await http.get('/rdic/turma/status', {
        params: {
          classroomId: turmaId,
          periodo:     trimestre?.label ?? '1º Trimestre',
          anoLetivo:   ANO_LETIVO,
        },
      });
      setTurmaStatus(res?.data ?? null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao carregar status da turma.');
      setTurmaStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, [turmaId, trimestreId]);

  useEffect(() => { carregarStatus(); }, [carregarStatus]);

  // ─── Aprovar RDIC ──────────────────────────────────────────────────────────
  const handleAprovar = async (id: string) => {
    if (!confirm('Aprovar este RDIC? O professor não poderá mais editá-lo.')) return;
    setSalvandoId(id);
    try {
      await http.post(`/rdic/${id}/aprovar`);
      toast.success('✓ RDIC aprovado com sucesso!');
      await carregarStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao aprovar RDIC.');
    } finally {
      setSalvandoId(null);
    }
  };

  // ─── Devolver com comentário — usa POST conforme @Post(':id/devolver') ─────
  const handleDevolver = async (id: string, comment: string) => {
    setSalvandoId(id);
    try {
      await http.post(`/rdic/${id}/devolver`, { comment });
      toast.success('RDIC devolvido ao professor.');
      setModalDevolucaoId(null);
      await carregarStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao devolver RDIC.');
    } finally {
      setSalvandoId(null);
    }
  };

  // ─── Navegar para detalhe — usa React Router (não window.location) ────────
  const handleVerDetalhe = useCallback((rdicId: string, childId: string) => {
    if (childId) {
      navigate(`/app/crianca/${childId}/rdic-central`);
    }
  }, [navigate]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const trimestre = TRIMESTRES.find(t => t.id === trimestreId) ?? TRIMESTRES[0];

  const criancasPorColuna = (statusList: readonly string[]) =>
    (turmaStatus?.criancas ?? []).filter(c => statusList.includes(c?.status ?? 'PENDENTE'));

  if (loadingTurmas) return <LoadingState message="Carregando turmas..." />;

  return (
    <PageShell
      title="Revisão de RDICs"
      subtitle="Coordenação Pedagógica — Relatórios de Desenvolvimento Individual"
    >
      {modalDevolucaoId && (
        <ModalDevolucao
          salvando={salvandoId === modalDevolucaoId}
          onCancelar={() => setModalDevolucaoId(null)}
          onConfirmar={(c) => handleDevolver(modalDevolucaoId, c)}
        />
      )}

      <div className="space-y-6">
        {/* ── Filtros obrigatórios ── */}
        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
              <Filter className="h-4 w-4" /> Selecione a Turma e o Trimestre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  Turma <span className="text-red-500">*</span>
                </Label>
                <select
                  value={turmaId}
                  onChange={e => setTurmaId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">— Selecione uma turma —</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>
                      {t?.name ?? '—'}{t?.code ? ` (${t.code})` : ''}
                    </option>
                  ))}
                </select>
                {turmas.length === 0 && (
                  <p className="text-xs text-gray-400">Nenhuma turma encontrada para esta unidade.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Trimestre (SEDF 2026)</Label>
                <div className="flex gap-2">
                  {TRIMESTRES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTrimestreId(t.id)}
                      className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                        trimestreId === t.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <span className="block font-semibold">{t.label}</span>
                      <span className="block text-[10px] opacity-70">{t.periodo}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Sem turma seleccionada ── */}
        {!turmaId && (
          <EmptyState
            icon={<Users className="h-12 w-12 text-gray-300" />}
            title="Selecione uma turma para começar"
            description="Escolha a turma acima para visualizar o painel Kanban de RDICs."
          />
        )}

        {/* ── Loading ── */}
        {turmaId && loadingStatus && (
          <LoadingState message="Carregando status da turma..." />
        )}

        {/* ── Kanban ── */}
        {turmaId && !loadingStatus && turmaStatus && (
          <>
            {/* Barra de completude */}
            <div className="bg-white border rounded-xl p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-gray-800">{turmaStatus?.classroomName ?? '—'}</p>
                <p className="text-sm text-gray-500">
                  {trimestre?.label} · {turmaStatus?.anoLetivo ?? ANO_LETIVO} · {turmaStatus?.contagem?.total ?? 0} crianças
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">{turmaStatus?.completude ?? 0}%</p>
                <p className="text-xs text-gray-500">completude</p>
              </div>
              <div className="flex-1 max-w-xs hidden sm:block">
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${turmaStatus?.completude ?? 0}%` }}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/app/turma/${turmaId}/painel`)}
                className="flex items-center gap-1 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <TrendingUp className="h-3.5 w-3.5" /> Painel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={carregarStatus}
                className="flex items-center gap-1 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Atualizar
              </Button>
            </div>

            {/* Colunas Kanban */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {KANBAN_COLUNAS.map(coluna => {
                const criancas = criancasPorColuna(coluna.statusList);
                return (
                  <div
                    key={coluna.id}
                    className={`rounded-xl border-t-4 ${coluna.cor} border border-gray-200 min-h-[300px]`}
                  >
                    <div className={`px-4 py-3 rounded-t-lg ${coluna.header} flex items-center justify-between`}>
                      <span className="font-semibold text-sm">{coluna.titulo}</span>
                      <span className="bg-white/60 text-current font-bold text-xs px-2 py-0.5 rounded-full">
                        {criancas.length}
                      </span>
                    </div>
                    <div className="p-3 space-y-2">
                      {criancas.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs">Nenhuma criança aqui</p>
                        </div>
                      ) : (
                        criancas.map(crianca => (
                          <KanbanCard
                            key={crianca?.childId}
                            crianca={crianca}
                            salvandoId={salvandoId}
                            onAprovar={handleAprovar}
                            onDevolver={(id) => setModalDevolucaoId(id)}
                            onVerDetalhe={handleVerDetalhe}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Turma seleccionada mas sem dados ── */}
        {turmaId && !loadingStatus && !turmaStatus && (
          <EmptyState
            icon={<Brain className="h-10 w-10 text-gray-300" />}
            title="Nenhum dado encontrado"
            description="Não foi possível carregar os dados desta turma. Verifique a conexão e tente novamente."
          />
        )}
      </div>
    </PageShell>
  );
}