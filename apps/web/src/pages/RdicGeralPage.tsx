/**
 * RdicGeralPage.tsx
 * Tela da Coordenadora Geral (STAFF_CENTRAL) — somente leitura.
 *
 * Regra de negócio:
 *  - Somente RDICs com status PUBLICADO são visíveis aqui.
 *  - O backend já filtra automaticamente por role (STAFF_CENTRAL → status: PUBLICADO).
 *  - Nenhuma ação de edição, aprovação ou publicação está disponível.
 *  - Acesso restrito a STAFF_CENTRAL, MANTENEDORA e DEVELOPER (via RoleProtectedRoute).
 */
import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Brain, Globe, User, BookOpen, Send, ChevronDown,
  ChevronUp, CheckCircle, Filter, Eye,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface RdicPublicado {
  id: string;
  childId: string;
  classroomId: string;
  periodo: string;
  anoLetivo: number;
  status: 'PUBLICADO';
  rascunhoJson: any;
  conteudoFinal: any;
  revisadoPorId?: string;
  finalizadoEm?: string;
  publicadoEm?: string;
  criadoEm: string;
  child?: { firstName: string; lastName: string; dateOfBirth?: string };
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function RdicGeralPage() {
  const [loading, setLoading] = useState(true);
  const [rdics, setRdics] = useState<RdicPublicado[]>([]);
  const [selecionado, setSelecionado] = useState<RdicPublicado | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');

  // ─── Carregar apenas RDICs PUBLICADOS ─────────────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      // Backend filtra automaticamente por role: STAFF_CENTRAL só recebe PUBLICADOS
      const res = await http.get('/rdic');
      setRdics(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch {
      toast.error('Erro ao carregar RDICs publicados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ─── Períodos únicos para filtro ──────────────────────────────────────────
  const periodos = ['todos', ...Array.from(new Set(rdics.map(r => `${r.periodo} ${r.anoLetivo}`)))];

  const rdicsFiltrados = rdics.filter(r =>
    filtroPeriodo === 'todos' ? true : `${r.periodo} ${r.anoLetivo}` === filtroPeriodo
  );

  // ─── Render: detalhe de um RDIC ───────────────────────────────────────────
  if (selecionado) {
    const dados = selecionado.conteudoFinal ?? selecionado.rascunhoJson ?? {};
    const nome = `${selecionado.child?.firstName ?? ''} ${selecionado.child?.lastName ?? ''}`.trim();

    return (
      <PageShell
        title={`RDIC — ${nome}`}
        subtitle={`${selecionado.periodo} / ${selecionado.anoLetivo} · Somente Leitura`}
      >
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{nome}</p>
                <p className="text-sm text-gray-500">{selecionado.periodo} · {selecionado.anoLetivo}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                <Globe className="h-3 w-3" /> Publicado
              </span>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-green-600">
                Publicado em {selecionado.publicadoEm ? new Date(selecionado.publicadoEm).toLocaleDateString('pt-BR') : '—'}
              </p>
              <Button variant="outline" onClick={() => setSelecionado(null)} className="text-sm">
                ← Voltar à lista
              </Button>
            </div>
          </div>

          {/* Aviso somente leitura */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Eye className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              <strong>Visualização somente leitura.</strong> Este RDIC foi aprovado e publicado pela coordenação pedagógica da unidade. Não é possível fazer alterações.
            </p>
          </div>

          {/* Observação Geral */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-500" /> Observação Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {dados.observacaoGeral || <span className="text-gray-400 italic">Não preenchido</span>}
              </p>
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
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {dados.proximosPassos || <span className="text-gray-400 italic">Não preenchido</span>}
              </p>
            </CardContent>
          </Card>

          {/* Campos de Experiência BNCC */}
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
                              ind.nivel === 'A'  ? 'bg-green-100 text-green-700' :
                              ind.nivel === 'C'  ? 'bg-blue-100 text-blue-700' :
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
        </div>
      </PageShell>
    );
  }

  // ─── Lista de RDICs publicados ─────────────────────────────────────────────
  if (loading) return <LoadingState message="Carregando RDICs publicados..." />;

  return (
    <PageShell
      title="RDICs Publicados"
      subtitle="Coordenação Geral — Visualização somente leitura"
    >
      <div className="space-y-6">
        {/* Aviso de somente leitura */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <Eye className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Aqui você visualiza apenas os RDICs que foram <strong>aprovados e publicados</strong> pela coordenação pedagógica de cada unidade. Nenhuma alteração pode ser feita nesta tela.
          </p>
        </div>

        {/* Contador */}
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <Globe className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-2xl font-bold text-green-700">{rdics.length}</p>
            <p className="text-sm text-green-600">RDICs publicados disponíveis</p>
          </div>
        </div>

        {/* Filtro por período */}
        {periodos.length > 2 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400" />
            {periodos.map(p => (
              <button
                key={p}
                onClick={() => setFiltroPeriodo(p)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  filtroPeriodo === p
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                }`}
              >
                {p === 'todos' ? 'Todos os períodos' : p}
              </button>
            ))}
          </div>
        )}

        {/* Lista */}
        {rdicsFiltrados.length === 0 ? (
          <EmptyState
            icon={<Brain className="h-12 w-12 text-gray-400" />}
            title="Nenhum RDIC publicado ainda"
            description="Os RDICs aparecerão aqui após serem aprovados e publicados pela coordenação pedagógica de cada unidade."
          />
        ) : (
          <div className="space-y-3">
            {rdicsFiltrados.map(rdic => {
              const nome = `${rdic.child?.firstName ?? ''} ${rdic.child?.lastName ?? ''}`.trim() || 'Criança';
              const isExpanded = expandido === rdic.id;
              const dados = rdic.conteudoFinal ?? rdic.rascunhoJson ?? {};

              return (
                <Card key={rdic.id} className="hover:shadow-md transition-shadow border-green-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{nome}</p>
                          <p className="text-xs text-gray-500">{rdic.periodo} · {rdic.anoLetivo}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700 flex-shrink-0">
                          <CheckCircle className="h-3 w-3" /> Publicado
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelecionado(rdic)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" /> Visualizar
                        </Button>
                        <button
                          onClick={() => setExpandido(isExpanded ? null : rdic.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Preview expandido */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        {dados.observacaoGeral && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Observação Geral</p>
                            <p className="text-sm text-gray-700 line-clamp-3">{dados.observacaoGeral}</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          Publicado em {rdic.publicadoEm ? new Date(rdic.publicadoEm).toLocaleDateString('pt-BR') : '—'}
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
