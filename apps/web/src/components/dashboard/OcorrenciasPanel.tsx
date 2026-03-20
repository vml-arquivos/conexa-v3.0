/**
 * OcorrenciasPanel — Painel de Ocorrências para perfis de gestão
 *
 * Exibe as ocorrências registradas pelos professores (tag 'ocorrencia')
 * com filtro por período, turma e categoria.
 * Usado em: DashboardCoordenacaoPedagogicaPage, DashboardCoordenacaoGeralPage, DashboardDiretorPage
 */
import { useState, useEffect, useCallback } from 'react';
import http from '../../api/http';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LoadingState } from '../ui/LoadingState';
import { getPedagogicalToday } from '@/utils/pedagogicalDate';
import {
  TriangleAlert, RefreshCw, Camera, User, BookOpen,
  Calendar, ChevronDown, ChevronUp, Search,
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Ocorrencia {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  tags: string[];
  aiContext?: { categoria?: string; categoriaLabel?: string };
  mediaUrls?: string[];
  child?: { id: string; firstName: string; lastName: string };
  classroom?: { id: string; name: string };
  createdByUser?: { id: string; firstName: string; lastName: string; email: string };
}

const CATEGORIAS: Record<string, { label: string; cor: string }> = {
  comportamento:  { label: 'Comportamento',  cor: 'bg-orange-100 text-orange-700 border-orange-200' },
  saude:          { label: 'Saúde',          cor: 'bg-red-100 text-red-700 border-red-200' },
  familia:        { label: 'Família',        cor: 'bg-purple-100 text-purple-700 border-purple-200' },
  material:       { label: 'Material',       cor: 'bg-blue-100 text-blue-700 border-blue-200' },
  comunicacao:    { label: 'Comunicação',    cor: 'bg-teal-100 text-teal-700 border-teal-200' },
  observacao:     { label: 'Observação',     cor: 'bg-gray-100 text-gray-700 border-gray-200' },
};

function getCategoriaTag(ocorr: Ocorrencia): string {
  if (ocorr.aiContext?.categoria) return ocorr.aiContext.categoria.toLowerCase();
  const cat = ocorr.tags.find(t => t !== 'ocorrencia');
  return cat ?? 'observacao';
}

// ─── Componente ──────────────────────────────────────────────────────────────
interface OcorrenciasPanelProps {
  /** Filtrar por unidade específica (opcional — se omitido, usa escopo do usuário) */
  unitId?: string;
  /** Título do painel */
  titulo?: string;
}

export function OcorrenciasPanel({ unitId, titulo = 'Ocorrências Registradas' }: OcorrenciasPanelProps) {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoje' | '7d' | '30d' | 'todos'>('7d');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const hoje = getPedagogicalToday();
      const params: Record<string, string> = {
        type: 'OBSERVACAO',
        limit: '100',
      };
      if (unitId) params.unitId = unitId;
      if (filtroPeriodo === 'hoje') {
        params.startDate = hoje + 'T00:00:00.000Z';
        params.endDate   = hoje + 'T23:59:59.999Z';
      } else if (filtroPeriodo === '7d') {
        const d = new Date(hoje);
        d.setDate(d.getDate() - 7);
        params.startDate = d.toISOString().split('T')[0] + 'T00:00:00.000Z';
      } else if (filtroPeriodo === '30d') {
        const d = new Date(hoje);
        d.setDate(d.getDate() - 30);
        params.startDate = d.toISOString().split('T')[0] + 'T00:00:00.000Z';
      }
      const res = await http.get('/diary-events', { params });
      const raw: any[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      // Filtrar apenas eventos com tag 'ocorrencia'
      const ocorrs = raw.filter((e: any) =>
        Array.isArray(e.tags) && e.tags.includes('ocorrencia')
      );
      setOcorrencias(ocorrs);
    } catch {
      setOcorrencias([]);
    } finally {
      setLoading(false);
    }
  }, [unitId, filtroPeriodo]);

  useEffect(() => { carregar(); }, [carregar]);

  // Filtros locais
  const filtradas = ocorrencias.filter(o => {
    const nomeCompleto = `${o.child?.firstName ?? ''} ${o.child?.lastName ?? ''}`.toLowerCase();
    const turma = (o.classroom?.name ?? '').toLowerCase();
    const desc = (o.description ?? '').toLowerCase();
    const matchBusca = !busca || nomeCompleto.includes(busca.toLowerCase()) || turma.includes(busca.toLowerCase()) || desc.includes(busca.toLowerCase());
    const cat = getCategoriaTag(o);
    const matchCat = !filtroCategoria || cat === filtroCategoria;
    return matchBusca && matchCat;
  });

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-800">{titulo}</h2>
          {!loading && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              {filtradas.length} {filtradas.length === 1 ? 'ocorrência' : 'ocorrências'}
            </span>
          )}
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {/* Período */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {(['hoje', '7d', '30d', 'todos'] as const).map(p => (
            <button
              key={p}
              onClick={() => setFiltroPeriodo(p)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                filtroPeriodo === p
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p === 'hoje' ? 'Hoje' : p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : 'Todos'}
            </button>
          ))}
        </div>

        {/* Categoria */}
        <select
          value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIAS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Busca */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar criança, turma ou descrição..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
      </div>

      {/* Lista */}
      {loading && <LoadingState message="Carregando ocorrências..." />}

      {!loading && filtradas.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <Camera className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhuma ocorrência no período selecionado</p>
        </div>
      )}

      {!loading && filtradas.length > 0 && (
        <div className="space-y-3">
          {filtradas.map(ocorr => {
            const cat = getCategoriaTag(ocorr);
            const catConfig = CATEGORIAS[cat] ?? CATEGORIAS['observacao'];
            const isExpanded = expandido === ocorr.id;
            const dataFormatada = ocorr.eventDate
              ? new Date(
                  (ocorr.eventDate || '').includes('T')
                    ? ocorr.eventDate
                    : ocorr.eventDate + 'T12:00:00'
                ).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : '—';
            const nomeCrianca = ocorr.child
              ? `${ocorr.child.firstName} ${ocorr.child.lastName}`
              : 'Criança não identificada';
            const nomeProfessor = ocorr.createdByUser
              ? `${ocorr.createdByUser.firstName} ${ocorr.createdByUser.lastName}`
              : 'Professor(a)';

            return (
              <Card
                key={ocorr.id}
                className="border-2 border-orange-100 hover:border-orange-200 transition-all cursor-pointer"
                onClick={() => setExpandido(isExpanded ? null : ocorr.id)}
              >
                <CardContent className="pt-4 pb-3">
                  {/* Linha principal */}
                  <div className="flex items-start gap-3">
                    {/* Avatar criança */}
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm flex-shrink-0">
                      {nomeCrianca.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm">{nomeCrianca}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${catConfig.cor}`}>
                          {catConfig.label}
                        </span>
                        {ocorr.mediaUrls && ocorr.mediaUrls.length > 0 && (
                          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Camera className="h-3 w-3" />
                            {ocorr.mediaUrls.length} foto{ocorr.mediaUrls.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {ocorr.classroom?.name ?? '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {nomeProfessor}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {dataFormatada}
                        </span>
                      </div>
                      {/* Preview da descrição */}
                      {!isExpanded && (
                        <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{ocorr.description}</p>
                      )}
                    </div>

                    <button className="flex-shrink-0 text-gray-400 hover:text-gray-600 mt-0.5">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Detalhes expandidos */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-orange-100 space-y-3">
                      <p className="text-sm text-gray-700">{ocorr.description}</p>

                      {/* Fotos */}
                      {ocorr.mediaUrls && ocorr.mediaUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {ocorr.mediaUrls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={url}
                                alt={`Foto ${i + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border border-orange-200 hover:opacity-90 transition-opacity"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
