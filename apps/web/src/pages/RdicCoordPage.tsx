/**
 * RdicCoordPage.tsx
 * Tela da Coordenadora Pedagógica da Unidade para revisão, correção e aprovação de RDICs.
 *
 * Fluxo de acesso:
 *  - UNIDADE: acesso completo (ver, editar, devolver, finalizar, publicar)
 *  - Outros roles: bloqueado (RoleProtectedRoute no router)
 *
 * Fluxo de status:
 *  RASCUNHO → (professor envia) → EM_REVISAO → (coord. aprova) → FINALIZADO → (coord. publica) → PUBLICADO
 *                                             → (coord. devolve com comentário) → DEVOLVIDO
 *  DEVOLVIDO → (professor corrige e reenvia) → EM_REVISAO
 */
import { useState, useEffect, useCallback } from 'react';
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
  Brain, RefreshCw, CheckCircle, AlertCircle, Clock,
  Eye, Edit3, Send, RotateCcw, BookOpen, Filter,
  ChevronDown, ChevronUp, User, FileText, Globe, XCircle,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface RdicItem {
  id: string;
  childId: string;
  classroomId: string;
  periodo: string;
  anoLetivo: number;
  status: 'RASCUNHO' | 'EM_REVISAO' | 'DEVOLVIDO' | 'APROVADO' | 'FINALIZADO' | 'PUBLICADO';
  rascunhoJson: any;
  conteudoFinal: any;
  criadoPorId: string;
  revisadoPorId?: string;
  reviewComment?: string;
  finalizadoEm?: string;
  publicadoEm?: string;
  criadoEm: string;
  child?: { firstName: string; lastName: string; dateOfBirth?: string };
}

// ─── Badge de status ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: RdicItem['status'] }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    RASCUNHO:   { label: 'Rascunho',      cls: 'bg-gray-100 text-gray-600',        icon: <Edit3 className="h-3 w-3" /> },
    EM_REVISAO: { label: 'Em Revisão',    cls: 'bg-yellow-100 text-yellow-700',    icon: <Clock className="h-3 w-3" /> },
    DEVOLVIDO:  { label: 'Devolvido',     cls: 'bg-orange-100 text-orange-700',    icon: <RotateCcw className="h-3 w-3" /> },
    APROVADO:   { label: '✓ Aprovado',    cls: 'bg-emerald-100 text-emerald-700',  icon: <CheckCircle className="h-3 w-3" /> },
    FINALIZADO: { label: 'Finalizado',    cls: 'bg-blue-100 text-blue-700',        icon: <CheckCircle className="h-3 w-3" /> },
    PUBLICADO:  { label: 'Publicado',     cls: 'bg-green-100 text-green-700',      icon: <Globe className="h-3 w-3" /> },
  };
  const s = map[status] ?? map.RASCUNHO;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

// ─── Modal de Devolução ───────────────────────────────────────────────────────
function ModalDevolucao({
  onConfirmar,
  onCancelar,
  salvando,
}: {
  onConfirmar: (comment: string) => void;
  onCancelar: () => void;
  salvando: boolean;
}) {
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
        <div className="space-y-3">
          <Label htmlFor="comentario-devolucao" className="text-sm font-medium text-gray-700">
            Comentário para o professor <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="comentario-devolucao"
            placeholder="Ex: Faltou descrever o desenvolvimento motor no campo 'Corpo, Gestos e Movimentos'. Por favor, complemente com observações da semana de 10/02."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            className="min-h-[100px] text-sm"
          />
          <p className="text-xs text-gray-400">{comentario.length}/500 caracteres</p>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={onCancelar} disabled={salvando} className="text-sm">
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirmar(comentario)}
            disabled={salvando || comentario.trim().length < 10}
            className="bg-orange-600 hover:bg-orange-700 text-white text-sm flex items-center gap-2"
          >
            {salvando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Confirmar Devolução
          </Button>
        </div>
        {comentario.trim().length < 10 && comentario.length > 0 && (
          <p className="text-xs text-red-500 mt-2">O comentário deve ter pelo menos 10 caracteres.</p>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function RdicCoordPage() {
  const [loading, setLoading] = useState(true);
  const [rdics, setRdics] = useState<RdicItem[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [selecionado, setSelecionado] = useState<RdicItem | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [conteudoEditado, setConteudoEditado] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modalDevolucao, setModalDevolucao] = useState<string | null>(null); // id do RDIC a devolver

  // ─── Carregar RDICs da unidade ─────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get('/rdic');
      setRdics(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch {
      toast.error('Erro ao carregar RDICs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ─── Filtrar por status ────────────────────────────────────────────────────
  const rdicsFiltrados = rdics.filter(r =>
    filtroStatus === 'todos' ? true : r.status === filtroStatus
  );

  // ─── Abrir RDIC para revisão ───────────────────────────────────────────────
  function abrirRevisao(rdic: RdicItem) {
    setSelecionado(rdic);
    setConteudoEditado(rdic.rascunhoJson ?? {});
    setModoEdicao(false);
  }

  // ─── Devolver ao professor (com comentário obrigatório) ───────────────────
  async function confirmarDevolucao(id: string, comment: string) {
    setSalvando(true);
    try {
      await http.patch(`/rdic/${id}/devolver`, { comment });
      toast.success('RDIC devolvido ao professor com comentário.');
      setModalDevolucao(null);
      setSelecionado(null);
      await carregar();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao devolver RDIC');
    } finally {
      setSalvando(false);
    }
  }

  // ─── Salvar correções ──────────────────────────────────────────────────────
  async function salvarCorrecoes(id: string) {
    setSalvando(true);
    try {
      await http.patch(`/rdic/${id}`, { rascunhoJson: conteudoEditado });
      toast.success('Correções salvas com sucesso.');
      setModoEdicao(false);
      await carregar();
      const atualizado = rdics.find(r => r.id === id);
      if (atualizado) setSelecionado({ ...atualizado, rascunhoJson: conteudoEditado });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar correções');
    } finally {
      setSalvando(false);
    }
  }

   // ─── Aprovar RDIC (novo endpoint POST /aprovar) ──────────────────────────────
  async function aprovar(id: string) {
    if (!confirm('Aprovar este RDIC? O professor não poderá mais editá-lo.')) return;
    setSalvando(true);
    try {
      await http.post(`/rdic/${id}/aprovar`);
      toast.success('✓ RDIC aprovado com sucesso!');
      setSelecionado(null);
      await carregar();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao aprovar RDIC');
    } finally {
      setSalvando(false);
    }
  }

  // ─── Finalizar (legado) ─────────────────────────────────────────────
  async function finalizar(id: string) {
    if (!confirm('Finalizar e aprovar este RDIC? O professor não poderá mais editá-lo.')) return;
    setSalvando(true);
    try {
      await http.patch(`/rdic/${id}/finalizar`, { conteudoFinal: conteudoEditado });
      toast.success('RDIC finalizado e aprovado!');
      setSelecionado(null);
      await carregar();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao finalizar RDIC');
    } finally {
      setSalvando(false);
    }
  }

  // ─── Publicar (libera para coord. geral) ──────────────────────────────────
  async function publicar(id: string) {
    if (!confirm('Publicar este RDIC? Ele ficará disponível para a Coordenação Geral.')) return;
    setSalvando(true);
    try {
      await http.patch(`/rdic/${id}/publicar`);
      toast.success('RDIC publicado! Agora visível para a Coordenação Geral.');
      setSelecionado(null);
      await carregar();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao publicar RDIC');
    } finally {
      setSalvando(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return <LoadingState message="Carregando RDICs da unidade..." />;

  // ─── Painel de revisão de um RDIC selecionado ─────────────────────────────
  if (selecionado) {
    const dados = conteudoEditado ?? selecionado.rascunhoJson ?? {};
    const nome = `${selecionado.child?.firstName ?? ''} ${selecionado.child?.lastName ?? ''}`.trim();
    const podeEditar = selecionado.status === 'EM_REVISAO' || selecionado.status === 'RASCUNHO';

    return (
      <PageShell
        title={`Revisão RDIC — ${nome}`}
        subtitle={`${selecionado.periodo} / ${selecionado.anoLetivo}`}
      >
        {/* Modal de devolução */}
        {modalDevolucao && (
          <ModalDevolucao
            salvando={salvando}
            onCancelar={() => setModalDevolucao(null)}
            onConfirmar={(comment) => confirmarDevolucao(modalDevolucao, comment)}
          />
        )}

        <div className="space-y-6">
          {/* Alerta de comentário de devolução anterior */}
          {selecionado.status === 'DEVOLVIDO' && selecionado.reviewComment && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-700">Devolvido pela coordenação</p>
                <p className="text-sm text-orange-600 mt-1">{selecionado.reviewComment}</p>
              </div>
            </div>
          )}

          {/* Cabeçalho com status e ações */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{nome}</p>
                <p className="text-sm text-gray-500">{selecionado.periodo} · {selecionado.anoLetivo}</p>
              </div>
              <StatusBadge status={selecionado.status} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setSelecionado(null)} className="text-sm">
                ← Voltar à lista
              </Button>
              {podeEditar && !modoEdicao && (
                <Button
                  variant="outline"
                  onClick={() => setModoEdicao(true)}
                  className="flex items-center gap-2 text-sm border-blue-300 text-blue-600"
                >
                  <Edit3 className="h-4 w-4" /> Editar / Corrigir
                </Button>
              )}
              {modoEdicao && (
                <Button
                  onClick={() => salvarCorrecoes(selecionado.id)}
                  disabled={salvando}
                  className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {salvando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Salvar Correções
                </Button>
              )}
              {podeEditar && (
                <Button
                  variant="outline"
                  onClick={() => setModalDevolucao(selecionado.id)}
                  className="flex items-center gap-2 text-sm border-orange-300 text-orange-600"
                >
                  <RotateCcw className="h-4 w-4" /> Devolver ao Professor
                </Button>
              )}
              {podeEditar && (
                <Button
                  onClick={() => aprovar(selecionado.id)}
                  disabled={salvando}
                  className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="h-4 w-4" /> Aprovar RDIC
                </Button>
              )}
              {selecionado.status === 'FINALIZADO' && (
                <Button
                  onClick={() => publicar(selecionado.id)}
                  disabled={salvando}
                  className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white"
                >
                  <Globe className="h-4 w-4" /> Publicar para Coord. Geral
                </Button>
              )}
            </div>
          </div>

          {/* Conteúdo do RDIC */}
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-500" /> Observação Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                {modoEdicao ? (
                  <Textarea
                    value={dados.observacaoGeral ?? ''}
                    onChange={e => setConteudoEditado({ ...dados, observacaoGeral: e.target.value })}
                    className="min-h-[120px] text-sm"
                    placeholder="Observação geral sobre o desenvolvimento da criança..."
                  />
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {dados.observacaoGeral || <span className="text-gray-400 italic">Sem observação geral registrada.</span>}
                  </p>
                )}
              </CardContent>
            </Card>

            {selecionado.status === 'PUBLICADO' && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-green-700">
                    <Globe className="h-4 w-4" /> Conteúdo Publicado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-green-600">
                    Publicado em {selecionado.publicadoEm ? new Date(selecionado.publicadoEm).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  // ─── Lista de RDICs ────────────────────────────────────────────────────────
  const contadores: Record<string, number> = {
    todos: rdics.length,
    RASCUNHO: rdics.filter(r => r.status === 'RASCUNHO').length,
    EM_REVISAO: rdics.filter(r => r.status === 'EM_REVISAO').length,
    DEVOLVIDO: rdics.filter(r => r.status === 'DEVOLVIDO').length,
    APROVADO: rdics.filter(r => r.status === 'APROVADO').length,
    FINALIZADO: rdics.filter(r => r.status === 'FINALIZADO').length,
    PUBLICADO: rdics.filter(r => r.status === 'PUBLICADO').length,
  };

  return (
    <PageShell
      title="Revisão de RDICs"
      subtitle="Coordenação Pedagógica — Relatórios de Desenvolvimento Individual"
    >
      {/* Modal de devolução (na lista) */}
      {modalDevolucao && (
        <ModalDevolucao
          salvando={salvando}
          onCancelar={() => setModalDevolucao(null)}
          onConfirmar={(comment) => confirmarDevolucao(modalDevolucao, comment)}
        />
      )}

      <div className="space-y-6">
        {/* Resumo por status */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: 'EM_REVISAO', label: 'Aguardando Revisão', icon: <Clock className="h-5 w-5" />, cor: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
            { key: 'DEVOLVIDO',  label: 'Devolvidos',          icon: <RotateCcw className="h-5 w-5" />, cor: 'text-orange-600 bg-orange-50 border-orange-200' },
            { key: 'APROVADO',   label: 'Aprovados',           icon: <CheckCircle className="h-5 w-5" />, cor: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
            { key: 'FINALIZADO', label: 'Finalizados',          icon: <CheckCircle className="h-5 w-5" />, cor: 'text-blue-600 bg-blue-50 border-blue-200' },
            { key: 'PUBLICADO',  label: 'Publicados',           icon: <Globe className="h-5 w-5" />, cor: 'text-green-600 bg-green-50 border-green-200' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setFiltroStatus(filtroStatus === item.key ? 'todos' : item.key)}
              className={`border rounded-xl p-4 text-left transition-all hover:shadow-sm ${item.cor} ${filtroStatus === item.key ? 'ring-2 ring-offset-1 ring-current' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">{item.icon}<span className="font-bold text-xl">{contadores[item.key] ?? 0}</span></div>
              <p className="text-xs font-medium">{item.label}</p>
            </button>
          ))}
        </div>

        {/* Filtro de status */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-400" />
          {(['todos', 'EM_REVISAO', 'DEVOLVIDO', 'RASCUNHO', 'APROVADO', 'FINALIZADO', 'PUBLICADO'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filtroStatus === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {s === 'todos' ? 'Todos' : s === 'EM_REVISAO' ? 'Em Revisão' : s === 'DEVOLVIDO' ? 'Devolvidos' : s === 'RASCUNHO' ? 'Rascunho' : s === 'APROVADO' ? 'Aprovados' : s === 'FINALIZADO' ? 'Finalizado' : 'Publicado'}
              {s !== 'todos' && ` (${contadores[s] ?? 0})`}
            </button>
          ))}
        </div>

        {/* Lista */}
        {rdicsFiltrados.length === 0 ? (
          <EmptyState
            icon={<Brain className="h-12 w-12 text-gray-400" />}
            title="Nenhum RDIC encontrado"
            description={filtroStatus === 'EM_REVISAO' ? 'Nenhum RDIC aguardando revisão no momento.' : 'Nenhum RDIC neste status.'}
          />
        ) : (
          <div className="space-y-3">
            {rdicsFiltrados.map(rdic => {
              const nome = `${rdic.child?.firstName ?? ''} ${rdic.child?.lastName ?? ''}`.trim() || 'Criança';
              const isExpanded = expandido === rdic.id;
              const podeEditar = rdic.status === 'EM_REVISAO' || rdic.status === 'RASCUNHO';
              return (
                <Card key={rdic.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{nome}</p>
                          <p className="text-xs text-gray-500">{rdic.periodo} · {rdic.anoLetivo}</p>
                        </div>
                        <StatusBadge status={rdic.status} />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {rdic.status === 'EM_REVISAO' && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
                            Aguarda revisão
                          </span>
                        )}
                        {rdic.status === 'DEVOLVIDO' && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                            Devolvido
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirRevisao(rdic)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {rdic.status === 'EM_REVISAO' ? 'Revisar' : 'Ver'}
                        </Button>
                        <button
                          onClick={() => setExpandido(isExpanded ? null : rdic.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Comentário de devolução */}
                    {rdic.status === 'DEVOLVIDO' && rdic.reviewComment && (
                      <div className="mt-2 bg-orange-50 border border-orange-100 rounded-lg p-2 flex gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-orange-700">{rdic.reviewComment}</p>
                      </div>
                    )}

                    {/* Ações rápidas inline */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                        {podeEditar && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setModalDevolucao(rdic.id)} className="text-xs text-orange-600 border-orange-200">
                              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Devolver
                            </Button>
                            <Button size="sm" onClick={() => { abrirRevisao(rdic); setModoEdicao(true); }} className="text-xs bg-blue-600 text-white">
                              <Edit3 className="h-3.5 w-3.5 mr-1" /> Editar e Aprovar
                            </Button>
                            <Button size="sm" onClick={() => aprovar(rdic.id)} className="text-xs bg-emerald-600 text-white">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprovar
                            </Button>
                          </>
                        )}
                        {rdic.status === 'FINALIZADO' && (
                          <Button size="sm" onClick={() => publicar(rdic.id)} className="text-xs bg-green-600 text-white">
                            <Globe className="h-3.5 w-3.5 mr-1" /> Publicar
                          </Button>
                        )}
                        <p className="text-xs text-gray-400 self-center">
                          Criado em {new Date(rdic.criadoEm).toLocaleDateString('pt-BR')}
                          {rdic.finalizadoEm && ` · Aprovado em ${new Date(rdic.finalizadoEm).toLocaleDateString('pt-BR')}`}
                          {rdic.publicadoEm && ` · Publicado em ${new Date(rdic.publicadoEm).toLocaleDateString('pt-BR')}`}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
