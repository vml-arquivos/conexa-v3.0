/**
 * RdicCoordPage.tsx
 * Tela da Coordenadora Pedagógica da Unidade para revisão, correção e aprovação de RDICs.
 *
 * Fluxo de acesso:
 *  - UNIDADE / DEVELOPER: acesso completo (ver, editar, devolver, finalizar, publicar)
 *  - Outros roles: bloqueado (RoleProtectedRoute no router)
 *
 * Fluxo de status:
 *  RASCUNHO → (professor envia) → EM_REVISAO → (coord. aprova) → FINALIZADO → (coord. publica) → PUBLICADO
 *                                             → (coord. devolve) → RASCUNHO
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
  ChevronDown, ChevronUp, User, FileText, Globe,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface RdicItem {
  id: string;
  childId: string;
  classroomId: string;
  periodo: string;
  anoLetivo: number;
  status: 'RASCUNHO' | 'EM_REVISAO' | 'FINALIZADO' | 'PUBLICADO';
  rascunhoJson: any;
  conteudoFinal: any;
  criadoPorId: string;
  revisadoPorId?: string;
  finalizadoEm?: string;
  publicadoEm?: string;
  criadoEm: string;
  child?: { firstName: string; lastName: string; dateOfBirth?: string };
}

// ─── Badge de status ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: RdicItem['status'] }) {
  const map = {
    RASCUNHO:   { label: 'Rascunho',      cls: 'bg-gray-100 text-gray-600',    icon: <Edit3 className="h-3 w-3" /> },
    EM_REVISAO: { label: 'Em Revisão',    cls: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
    FINALIZADO: { label: 'Finalizado',    cls: 'bg-blue-100 text-blue-700',     icon: <CheckCircle className="h-3 w-3" /> },
    PUBLICADO:  { label: 'Publicado',     cls: 'bg-green-100 text-green-700',   icon: <Globe className="h-3 w-3" /> },
  };
  const s = map[status] ?? map.RASCUNHO;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${s.cls}`}>
      {s.icon} {s.label}
    </span>
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

  // ─── Devolver ao professor ─────────────────────────────────────────────────
  async function devolver(id: string) {
    if (!confirm('Devolver este RDIC ao professor para correção?')) return;
    try {
      await http.patch(`/rdic/${id}/devolver`);
      toast.success('RDIC devolvido ao professor.');
      setSelecionado(null);
      await carregar();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao devolver RDIC');
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
      // Atualizar selecionado
      const atualizado = rdics.find(r => r.id === id);
      if (atualizado) setSelecionado({ ...atualizado, rascunhoJson: conteudoEditado });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar correções');
    } finally {
      setSalvando(false);
    }
  }

  // ─── Finalizar (aprovar) ───────────────────────────────────────────────────
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

    return (
      <PageShell
        title={`Revisão RDIC — ${nome}`}
        subtitle={`${selecionado.periodo} / ${selecionado.anoLetivo}`}
      >
        <div className="space-y-6">
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
              {(selecionado.status === 'EM_REVISAO' || selecionado.status === 'RASCUNHO') && !modoEdicao && (
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
              {(selecionado.status === 'EM_REVISAO' || selecionado.status === 'RASCUNHO') && (
                <Button
                  variant="outline"
                  onClick={() => devolver(selecionado.id)}
                  className="flex items-center gap-2 text-sm border-orange-300 text-orange-600"
                >
                  <RotateCcw className="h-4 w-4" /> Devolver ao Professor
                </Button>
              )}
              {(selecionado.status === 'EM_REVISAO' || selecionado.status === 'RASCUNHO') && (
                <Button
                  onClick={() => finalizar(selecionado.id)}
                  disabled={salvando}
                  className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <CheckCircle className="h-4 w-4" /> Finalizar e Aprovar
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
            {/* Observação Geral */}
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
                    rows={5}
                    className="text-sm"
                    placeholder="Observação geral do desenvolvimento da criança..."
                  />
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {dados.observacaoGeral || <span className="text-gray-400 italic">Não preenchido</span>}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Próximos Passos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-green-500" /> Próximos Passos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {modoEdicao ? (
                  <Textarea
                    value={dados.proximosPassos ?? ''}
                    onChange={e => setConteudoEditado({ ...dados, proximosPassos: e.target.value })}
                    rows={4}
                    className="text-sm"
                    placeholder="Estratégias e próximos passos pedagógicos..."
                  />
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {dados.proximosPassos || <span className="text-gray-400 italic">Não preenchido</span>}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Dimensões / Campos de Experiência */}
            {Array.isArray(dados.dimensoes) && dados.dimensoes.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500" /> Campos de Experiência BNCC
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dados.dimensoes.map((dim: any, i: number) => (
                      <div key={i} className="border rounded-lg p-3 bg-gray-50">
                        <p className="font-medium text-sm text-gray-800 mb-2">{dim.nome}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Array.isArray(dim.indicadores) && dim.indicadores.map((ind: any, j: number) => (
                            <div key={j} className="flex items-center justify-between text-xs bg-white border rounded px-2 py-1">
                              <span className="text-gray-600 flex-1 mr-2">{ind.nome}</span>
                              <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${
                                ind.nivel === 'A' ? 'bg-green-100 text-green-700' :
                                ind.nivel === 'C' ? 'bg-blue-100 text-blue-700' :
                                ind.nivel === 'ED' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {ind.nivel || 'NO'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conteúdo final (se já finalizado) */}
            {selecionado.status === 'PUBLICADO' && selecionado.conteudoFinal && (
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
  const contadores = {
    todos: rdics.length,
    RASCUNHO: rdics.filter(r => r.status === 'RASCUNHO').length,
    EM_REVISAO: rdics.filter(r => r.status === 'EM_REVISAO').length,
    FINALIZADO: rdics.filter(r => r.status === 'FINALIZADO').length,
    PUBLICADO: rdics.filter(r => r.status === 'PUBLICADO').length,
  };

  return (
    <PageShell
      title="Revisão de RDICs"
      subtitle="Coordenação Pedagógica — Relatórios de Desenvolvimento Individual"
    >
      <div className="space-y-6">
        {/* Resumo por status */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'EM_REVISAO', label: 'Aguardando Revisão', icon: <Clock className="h-5 w-5" />, cor: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
            { key: 'RASCUNHO',   label: 'Rascunhos',          icon: <Edit3 className="h-5 w-5" />, cor: 'text-gray-600 bg-gray-50 border-gray-200' },
            { key: 'FINALIZADO', label: 'Finalizados',         icon: <CheckCircle className="h-5 w-5" />, cor: 'text-blue-600 bg-blue-50 border-blue-200' },
            { key: 'PUBLICADO',  label: 'Publicados',          icon: <Globe className="h-5 w-5" />, cor: 'text-green-600 bg-green-50 border-green-200' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setFiltroStatus(filtroStatus === item.key ? 'todos' : item.key)}
              className={`border rounded-xl p-4 text-left transition-all hover:shadow-sm ${item.cor} ${filtroStatus === item.key ? 'ring-2 ring-offset-1 ring-current' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">{item.icon}<span className="font-bold text-xl">{contadores[item.key as keyof typeof contadores]}</span></div>
              <p className="text-xs font-medium">{item.label}</p>
            </button>
          ))}
        </div>

        {/* Filtro de status */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-400" />
          {(['todos', 'EM_REVISAO', 'RASCUNHO', 'FINALIZADO', 'PUBLICADO'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filtroStatus === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {s === 'todos' ? 'Todos' : s === 'EM_REVISAO' ? 'Em Revisão' : s === 'RASCUNHO' ? 'Rascunho' : s === 'FINALIZADO' ? 'Finalizado' : 'Publicado'}
              {s !== 'todos' && ` (${contadores[s]})`}
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

                    {/* Ações rápidas inline */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                        {(rdic.status === 'EM_REVISAO' || rdic.status === 'RASCUNHO') && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => devolver(rdic.id)} className="text-xs text-orange-600 border-orange-200">
                              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Devolver
                            </Button>
                            <Button size="sm" onClick={() => { abrirRevisao(rdic); setModoEdicao(true); }} className="text-xs bg-blue-600 text-white">
                              <Edit3 className="h-3.5 w-3.5 mr-1" /> Editar e Aprovar
                            </Button>
                            <Button size="sm" onClick={() => finalizar(rdic.id)} className="text-xs bg-indigo-600 text-white">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprovar Direto
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
