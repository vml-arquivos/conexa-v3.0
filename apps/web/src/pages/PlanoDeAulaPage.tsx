import React, { useState, useMemo } from 'react';
import {
  BookOpen, Calendar, ChevronLeft, ChevronRight, Download,
  FileText, Filter, Layers, Search, CheckCircle2,
  Clock, Brain, Target, Lightbulb, Activity,
  Printer, Share2, Plus, GraduationCap, BookMarked,
  Sparkles, ChevronDown, ChevronUp, Star, Check,
} from 'lucide-react';
import {
  MATRIZ_2026, SEGMENTOS, CAMPOS_EXPERIENCIA,
  SegmentoKey, getEntradasSegmentoDia,
  getDatasLetivas,
} from '../data/matrizCompleta2026';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ExemploAtividade {
  titulo: string;
  descricao: string;
}

interface EntradaComExemplos {
  data: string;
  dia_semana: string;
  campo_id: string;
  campo_label: string;
  campo_emoji: string;
  codigo_bncc: string;
  objetivo_bncc: string;
  objetivo_curriculo: string;
  intencionalidade: string;
  exemplo_atividade: string;
  exemplos_atividades?: ExemploAtividade[];
  semana_tema: string;
  bimestre: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hoje(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

function formatarData(ddmm: string): string {
  const [d, m] = ddmm.split('/');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${d} ${meses[parseInt(m)-1]} 2026`;
}

function getCorCampo(campoId: string): { bg: string; border: string; text: string; badge: string } {
  const cores: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    'eu-outro-nos':  { bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-900',  badge: 'bg-blue-100 text-blue-800 border-blue-200' },
    'corpo-gestos':  { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-900', badge: 'bg-green-100 text-green-800 border-green-200' },
    'tracos-sons':   { bg: 'bg-purple-50', border: 'border-purple-200',text: 'text-purple-900',badge: 'bg-purple-100 text-purple-800 border-purple-200' },
    'escuta-fala':   { bg: 'bg-yellow-50', border: 'border-yellow-200',text: 'text-yellow-900',badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'espacos-tempos':{ bg: 'bg-orange-50', border: 'border-orange-200',text: 'text-orange-900',badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  };
  return cores[campoId] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900', badge: 'bg-gray-100 text-gray-800 border-gray-200' };
}

// ─── Card de Exemplo de Atividade ─────────────────────────────────────────────
function CardExemplo({
  exemplo, index, selecionado, onSelecionar
}: {
  exemplo: ExemploAtividade;
  index: number;
  selecionado: boolean;
  onSelecionar: () => void;
}) {
  const cores = ['blue', 'emerald', 'violet', 'amber'];
  const cor = cores[index % cores.length];

  const classesBorda: Record<string, string> = {
    blue:    selecionado ? 'border-blue-500 bg-blue-50 shadow-blue-100' : 'border-gray-200 hover:border-blue-300',
    emerald: selecionado ? 'border-emerald-500 bg-emerald-50 shadow-emerald-100' : 'border-gray-200 hover:border-emerald-300',
    violet:  selecionado ? 'border-violet-500 bg-violet-50 shadow-violet-100' : 'border-gray-200 hover:border-violet-300',
    amber:   selecionado ? 'border-amber-500 bg-amber-50 shadow-amber-100' : 'border-gray-200 hover:border-amber-300',
  };

  const classesTitulo: Record<string, string> = {
    blue:    'text-blue-700',
    emerald: 'text-emerald-700',
    violet:  'text-violet-700',
    amber:   'text-amber-700',
  };

  const classesBadge: Record<string, string> = {
    blue:    'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    violet:  'bg-violet-100 text-violet-700',
    amber:   'bg-amber-100 text-amber-700',
  };

  return (
    <div
      onClick={onSelecionar}
      className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all shadow-sm ${classesBorda[cor]} ${selecionado ? 'shadow-md' : ''}`}
    >
      {selecionado && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${classesBadge[cor]}`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold mb-1.5 ${classesTitulo[cor]}`}>{exemplo.titulo}</p>
          <p className="text-sm text-gray-700 leading-relaxed">{exemplo.descricao}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Card de Entrada da Matriz ────────────────────────────────────────────────
function CardEntrada({ entrada, expanded, onToggle }: {
  entrada: EntradaComExemplos;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [exemploSelecionado, setExemploSelecionado] = useState<number | null>(null);
  const [adicionadoAoPlano, setAdicionadoAoPlano] = useState(false);
  const cor = getCorCampo(entrada.campo_id);

  const exemplos: ExemploAtividade[] = (entrada as any).exemplos_atividades?.length
    ? (entrada as any).exemplos_atividades
    : [{ titulo: 'Atividade Principal', descricao: entrada.exemplo_atividade }];

  const handleAdicionarAoPlano = () => {
    setAdicionadoAoPlano(true);
    setTimeout(() => setAdicionadoAoPlano(false), 2000);
  };

  return (
    <div className={`border-2 rounded-2xl transition-all bg-white ${expanded ? 'border-blue-300 shadow-lg' : 'border-gray-200 hover:border-blue-200 hover:shadow-sm'}`}>
      {/* Cabeçalho */}
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                📅 {entrada.data} — {entrada.dia_semana}
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${cor.badge}`}>
                {entrada.codigo_bncc}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cor.badge}`}>
                {entrada.campo_emoji} {entrada.campo_label}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
              {entrada.objetivo_bncc}
            </p>
            {entrada.semana_tema && (
              <p className="text-xs text-gray-400 mt-1 truncate">📚 {entrada.semana_tema}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400 hidden sm:block">{exemplos.length} atividades</span>
            {expanded
              ? <ChevronUp className="h-4 w-4 text-blue-500" />
              : <ChevronDown className="h-4 w-4 text-gray-400" />
            }
          </div>
        </div>
      </div>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="px-4 pb-5 border-t border-gray-100 pt-4 space-y-5">
          {/* Objetivo BNCC */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Objetivo da BNCC — Transcrição Literal</span>
            </div>
            <p className="text-sm text-blue-900 leading-relaxed">{entrada.objetivo_bncc}</p>
          </div>

          {/* Objetivo Currículo em Movimento */}
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <BookMarked className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Objetivo do Currículo em Movimento</span>
            </div>
            <p className="text-sm text-purple-900 leading-relaxed">{entrada.objetivo_curriculo}</p>
          </div>

          {/* Intencionalidade Pedagógica */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Intencionalidade Pedagógica</span>
            </div>
            <p className="text-sm text-amber-900 leading-relaxed">{entrada.intencionalidade}</p>
          </div>

          {/* Exemplos de Atividade — Escolha */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-green-600" />
              <span className="text-sm font-bold text-gray-800">Escolha uma Experiência / Atividade</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{exemplos.length} opções</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exemplos.map((ex, i) => (
                <CardExemplo
                  key={i}
                  exemplo={ex}
                  index={i}
                  selecionado={exemploSelecionado === i}
                  onSelecionar={() => setExemploSelecionado(exemploSelecionado === i ? null : i)}
                />
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdicionarAoPlano}
              disabled={exemploSelecionado === null}
              className={`flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold transition-all ${
                adicionadoAoPlano
                  ? 'bg-green-500 text-white'
                  : exemploSelecionado !== null
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {adicionadoAoPlano ? (
                <><CheckCircle2 className="h-4 w-4" /> Adicionado ao Plano!</>
              ) : (
                <><Plus className="h-4 w-4" /> {exemploSelecionado !== null ? 'Adicionar ao Plano de Aula' : 'Selecione uma atividade'}</>
              )}
            </button>
            <button className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 text-gray-600 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <Printer className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 text-gray-600 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function PlanoDeAulaPage() {
  const [segmento, setSegmento] = useState<SegmentoKey>('EI01');
  const [modoVisualizacao, setModoVisualizacao] = useState<'diario' | 'lista'>('diario');
  const [dataAtual, setDataAtual] = useState(hoje());
  const [filtroCampo, setFiltroCampo] = useState('');
  const [filtroBimestre, setFiltroBimestre] = useState('');
  const [busca, setBusca] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const datasLetivas = useMemo(() => getDatasLetivas(segmento), [segmento]);

  const entradasDia = useMemo(
    () => getEntradasSegmentoDia(dataAtual, segmento) as EntradaComExemplos[],
    [dataAtual, segmento]
  );

  const entradasFiltradas = useMemo(() => {
    let entries = MATRIZ_2026[segmento] as EntradaComExemplos[];
    if (filtroCampo) entries = entries.filter(e => e.campo_id === filtroCampo);
    if (filtroBimestre) entries = entries.filter(e => e.bimestre === filtroBimestre);
    if (busca) {
      const b = busca.toLowerCase();
      entries = entries.filter(e =>
        e.objetivo_bncc.toLowerCase().includes(b) ||
        e.codigo_bncc.toLowerCase().includes(b) ||
        e.campo_label.toLowerCase().includes(b) ||
        e.intencionalidade.toLowerCase().includes(b) ||
        e.objetivo_curriculo.toLowerCase().includes(b)
      );
    }
    return entries;
  }, [segmento, filtroCampo, filtroBimestre, busca]);

  const bimestres = useMemo(() => {
    return [...new Set(MATRIZ_2026[segmento].map(e => e.bimestre))].filter(Boolean).sort();
  }, [segmento]);

  const idxAtual = datasLetivas.indexOf(dataAtual);
  const dataAnterior = idxAtual > 0 ? datasLetivas[idxAtual - 1] : null;
  const dataProxima = idxAtual < datasLetivas.length - 1 ? datasLetivas[idxAtual + 1] : null;

  const segInfo = SEGMENTOS.find(s => s.id === segmento);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Plano de Aula</h1>
                <p className="text-xs text-gray-500">Matriz Curricular 2026 — Sequência Pedagógica Piloto</p>
              </div>
            </div>

            {/* Seletor de segmento */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {SEGMENTOS.map(seg => (
                <button
                  key={seg.id}
                  onClick={() => { setSegmento(seg.id); setDataAtual(hoje()); setExpandedId(null); }}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    segmento === seg.id
                      ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="block">{seg.id}</span>
                  <span className="block text-[10px] font-normal opacity-70">{seg.faixa}</span>
                </button>
              ))}
            </div>

            {/* Modo de visualização */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {[
                { id: 'diario', label: 'Por Dia', icon: Calendar },
                { id: 'lista', label: 'Lista Completa', icon: FileText },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setModoVisualizacao(id as typeof modoVisualizacao)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    modoVisualizacao === id
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Banner do segmento */}
        <div className={`rounded-2xl p-5 text-white shadow-md ${
          segmento === 'EI01' ? 'bg-gradient-to-r from-rose-500 to-pink-600' :
          segmento === 'EI02' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
          'bg-gradient-to-r from-emerald-500 to-teal-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="h-5 w-5 opacity-90" />
                <span className="text-sm font-semibold opacity-90">{segInfo?.label}</span>
              </div>
              <p className="text-2xl font-bold">Faixa Etária: {segInfo?.faixa}</p>
              <p className="text-sm opacity-80 mt-1">
                {MATRIZ_2026[segmento].length} objetivos · {bimestres.length} bimestres · 3-4 atividades por objetivo
              </p>
            </div>
            <div className="text-right opacity-20">
              <p className="text-5xl font-black">{segmento}</p>
            </div>
          </div>
        </div>

        {/* Modo Diário */}
        {modoVisualizacao === 'diario' && (
          <div className="space-y-4">
            {/* Navegação de data */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <button
                onClick={() => dataAnterior && setDataAtual(dataAnterior)}
                disabled={!dataAnterior}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:block">{dataAnterior ? formatarData(dataAnterior) : 'Início'}</span>
              </button>

              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{formatarData(dataAtual)}</p>
                {entradasDia[0]?.dia_semana && (
                  <p className="text-sm text-gray-500">{entradasDia[0].dia_semana}</p>
                )}
                {entradasDia[0]?.semana_tema && (
                  <p className="text-xs text-blue-600 font-medium mt-0.5">📚 {entradasDia[0].semana_tema}</p>
                )}
                {entradasDia[0]?.bimestre && (
                  <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {entradasDia[0].bimestre}
                  </span>
                )}
              </div>

              <button
                onClick={() => dataProxima && setDataAtual(dataProxima)}
                disabled={!dataProxima}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:block">{dataProxima ? formatarData(dataProxima) : 'Fim'}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Entradas do dia */}
            {entradasDia.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">
                    {entradasDia.length} {entradasDia.length === 1 ? 'objetivo' : 'objetivos'} para este dia
                  </p>
                  <p className="text-xs text-gray-400">Clique para ver os 3-4 exemplos de atividade</p>
                </div>
                {entradasDia.map((entrada, i) => {
                  const id = `dia-${entrada.data}-${entrada.codigo_bncc}-${i}`;
                  return (
                    <CardEntrada
                      key={id}
                      entrada={entrada}
                      expanded={expandedId === id}
                      onToggle={() => setExpandedId(expandedId === id ? null : id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Sem atividades para esta data</p>
                <p className="text-sm text-gray-400 mt-1">Esta pode ser uma data de recesso ou feriado</p>
                <button
                  onClick={() => dataProxima && setDataAtual(dataProxima)}
                  className="mt-4 text-sm text-blue-600 hover:underline"
                >
                  Ir para próxima data letiva →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modo Lista */}
        {modoVisualizacao === 'lista' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-48">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por objetivo, código, campo, atividade..."
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <select
                  value={filtroCampo}
                  onChange={e => setFiltroCampo(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os campos</option>
                  {CAMPOS_EXPERIENCIA.map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                  ))}
                </select>
                <select
                  value={filtroBimestre}
                  onChange={e => setFiltroBimestre(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os bimestres</option>
                  {bimestres.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
                  <Filter className="h-4 w-4 mr-1.5" />
                  <span className="font-semibold text-gray-700">{entradasFiltradas.length}</span>
                  <span className="ml-1">resultados</span>
                </div>
              </div>
            </div>

            {/* Lista */}
            <div className="space-y-3">
              {entradasFiltradas.map((entrada, i) => {
                const id = `lista-${entrada.data}-${entrada.codigo_bncc}-${i}`;
                return (
                  <CardEntrada
                    key={id}
                    entrada={entrada}
                    expanded={expandedId === id}
                    onToggle={() => setExpandedId(expandedId === id ? null : id)}
                  />
                );
              })}
              {entradasFiltradas.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                  <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma entrada encontrada</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
