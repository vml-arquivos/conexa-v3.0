import React, { useState, useMemo } from 'react';
import {
  BookOpen, Calendar, ChevronLeft, ChevronRight, Download,
  FileText, Filter, Layers, Search, Star, CheckCircle2,
  Clock, Users, Brain, Target, Lightbulb, Activity,
  Printer, Share2, Plus, Eye, GraduationCap, BookMarked,
} from 'lucide-react';
import {
  MATRIZ_2026, SEGMENTOS, CAMPOS_EXPERIENCIA, EntradaMatriz,
  SegmentoKey, getEntradasSegmentoDia, getEntradasSemana,
  getDatasLetivas, temAtividadeNaData,
} from '../data/matrizCompleta2026';

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

function getDiasSemana(dataDDMM: string): string[] {
  const [dia, mes] = dataDDMM.split('/').map(Number);
  const datas: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(2026, mes - 1, dia + i);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    datas.push(`${dd}/${mm}`);
  }
  return datas;
}

function getCorCampo(campoId: string): string {
  const cores: Record<string, string> = {
    'eu-outro-nos': 'blue',
    'corpo-gestos': 'green',
    'tracos-sons': 'purple',
    'escuta-fala': 'yellow',
    'espacos-tempos': 'orange',
  };
  return cores[campoId] || 'gray';
}

function BadgeCampo({ campo_id, campo_label, campo_emoji }: { campo_id: string; campo_label: string; campo_emoji: string }) {
  const cor = getCorCampo(campo_id);
  const classes: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${classes[cor]}`}>
      {campo_emoji} {campo_label}
    </span>
  );
}

// ─── Card de Entrada da Matriz ────────────────────────────────────────────────
function CardEntrada({ entrada, expanded, onToggle }: {
  entrada: EntradaMatriz;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`border rounded-xl transition-all ${expanded ? 'border-blue-300 shadow-md' : 'border-gray-200 hover:border-blue-200 hover:shadow-sm'} bg-white`}>
      {/* Cabeçalho */}
      <div
        className="p-4 cursor-pointer flex items-start justify-between gap-3"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {entrada.data} — {entrada.dia_semana}
            </span>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {entrada.codigo_bncc}
            </span>
            <BadgeCampo campo_id={entrada.campo_id} campo_label={entrada.campo_label} campo_emoji={entrada.campo_emoji} />
          </div>
          <p className="text-sm font-semibold text-gray-900 line-clamp-2">
            {entrada.objetivo_bncc}
          </p>
          {entrada.semana_tema && (
            <p className="text-xs text-gray-500 mt-1 truncate">{entrada.semana_tema}</p>
          )}
        </div>
        <button className="text-gray-400 hover:text-blue-600 flex-shrink-0 mt-1">
          {expanded ? <ChevronLeft className="h-4 w-4 rotate-90" /> : <ChevronRight className="h-4 w-4 rotate-90" />}
        </button>
      </div>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          {/* Objetivo BNCC */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Objetivo da BNCC (Transcrição Literal)</span>
            </div>
            <p className="text-sm text-blue-900 leading-relaxed">{entrada.objetivo_bncc}</p>
          </div>

          {/* Objetivo Currículo em Movimento */}
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <BookMarked className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Objetivo do Currículo em Movimento</span>
            </div>
            <p className="text-sm text-purple-900 leading-relaxed">{entrada.objetivo_curriculo}</p>
          </div>

          {/* Intencionalidade Pedagógica */}
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Intencionalidade Pedagógica</span>
            </div>
            <p className="text-sm text-amber-900 leading-relaxed">{entrada.intencionalidade}</p>
          </div>

          {/* Exemplo de Atividade */}
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Exemplo de Experiência / Atividade</span>
            </div>
            <p className="text-sm text-green-900 leading-relaxed">{entrada.exemplo_atividade}</p>
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            <button className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              <Plus className="h-3.5 w-3.5" />
              Usar no Plano de Aula
            </button>
            <button className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Plano de Aula Semanal ─────────────────────────────────────────────────────
function PlanoSemanal({ segmento, semanaInicio }: { segmento: SegmentoKey; semanaInicio: string }) {
  const diasSemana = getDiasSemana(semanaInicio);
  const entradasSemana = diasSemana.map(data => ({
    data,
    entradas: getEntradasSegmentoDia(data, segmento),
  }));

  const segInfo = SEGMENTOS.find(s => s.id === segmento);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Plano de Aula Semanal</h3>
          <p className="text-sm text-gray-500">{segInfo?.label} — {segInfo?.faixa} | Semana de {semanaInicio}</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          <button className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Share2 className="h-3.5 w-3.5" />
            Compartilhar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {entradasSemana.map(({ data, entradas }) => (
          <div key={data} className={`rounded-xl border p-3 ${entradas.length > 0 ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="text-center mb-3">
              <p className="text-xs font-bold text-gray-500">{entradas[0]?.dia_semana?.split('-')[0] || data}</p>
              <p className="text-lg font-bold text-gray-900">{data.split('/')[0]}</p>
            </div>
            {entradas.length > 0 ? (
              <div className="space-y-2">
                {entradas.map((e, i) => (
                  <div key={i} className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-xs">{e.campo_emoji}</span>
                      <span className="text-xs font-mono font-bold text-blue-700">{e.codigo_bncc}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-tight line-clamp-3">{e.objetivo_bncc}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-gray-400">Sem atividade</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function PlanoDeAulaPage() {
  const [segmento, setSegmento] = useState<SegmentoKey>('EI01');
  const [modoVisualizacao, setModoVisualizacao] = useState<'diario' | 'semanal' | 'lista'>('diario');
  const [dataAtual, setDataAtual] = useState(hoje());
  const [filtroCampo, setFiltroCampo] = useState('');
  const [filtroBimestre, setFiltroBimestre] = useState('');
  const [busca, setBusca] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Datas letivas do segmento
  const datasLetivas = useMemo(() => getDatasLetivas(segmento), [segmento]);

  // Entradas do dia atual
  const entradasDia = useMemo(
    () => getEntradasSegmentoDia(dataAtual, segmento),
    [dataAtual, segmento]
  );

  // Todas as entradas filtradas (modo lista)
  const entradasFiltradas = useMemo(() => {
    let entries = MATRIZ_2026[segmento];
    if (filtroCampo) entries = entries.filter(e => e.campo_id === filtroCampo);
    if (filtroBimestre) entries = entries.filter(e => e.bimestre === filtroBimestre);
    if (busca) {
      const b = busca.toLowerCase();
      entries = entries.filter(e =>
        e.objetivo_bncc.toLowerCase().includes(b) ||
        e.codigo_bncc.toLowerCase().includes(b) ||
        e.campo_label.toLowerCase().includes(b) ||
        e.intencionalidade.toLowerCase().includes(b) ||
        e.exemplo_atividade.toLowerCase().includes(b)
      );
    }
    return entries;
  }, [segmento, filtroCampo, filtroBimestre, busca]);

  // Bimestres disponíveis
  const bimestres = useMemo(() => {
    const bs = [...new Set(MATRIZ_2026[segmento].map(e => e.bimestre))].filter(Boolean).sort();
    return bs;
  }, [segmento]);

  // Navegar entre datas letivas
  const idxAtual = datasLetivas.indexOf(dataAtual);
  const dataAnterior = idxAtual > 0 ? datasLetivas[idxAtual - 1] : null;
  const dataProxima = idxAtual < datasLetivas.length - 1 ? datasLetivas[idxAtual + 1] : null;

  const segInfo = SEGMENTOS.find(s => s.id === segmento);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
                  onClick={() => { setSegmento(seg.id); setDataAtual(hoje()); }}
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
                { id: 'diario', label: 'Diário', icon: Calendar },
                { id: 'semanal', label: 'Semanal', icon: Layers },
                { id: 'lista', label: 'Lista', icon: FileText },
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
        <div className={`rounded-2xl p-5 text-white shadow-sm ${
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
                {MATRIZ_2026[segmento].length} objetivos de aprendizagem · {bimestres.length} bimestres
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold opacity-20">{segmento}</p>
            </div>
          </div>
        </div>

        {/* Modo Diário */}
        {modoVisualizacao === 'diario' && (
          <div className="space-y-4">
            {/* Navegação de data */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
              <button
                onClick={() => dataAnterior && setDataAtual(dataAnterior)}
                disabled={!dataAnterior}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                {dataAnterior ? formatarData(dataAnterior) : 'Início'}
              </button>

              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{formatarData(dataAtual)}</p>
                {entradasDia[0]?.dia_semana && (
                  <p className="text-sm text-gray-500">{entradasDia[0].dia_semana}</p>
                )}
                {entradasDia[0]?.semana_tema && (
                  <p className="text-xs text-blue-600 font-medium mt-0.5">{entradasDia[0].semana_tema}</p>
                )}
              </div>

              <button
                onClick={() => dataProxima && setDataAtual(dataProxima)}
                disabled={!dataProxima}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {dataProxima ? formatarData(dataProxima) : 'Fim'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Entradas do dia */}
            {entradasDia.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">
                  {entradasDia.length} {entradasDia.length === 1 ? 'atividade' : 'atividades'} para este dia
                </p>
                {entradasDia.map((entrada, i) => (
                  <CardEntrada
                    key={`${entrada.data}-${entrada.codigo_bncc}-${i}`}
                    entrada={entrada}
                    expanded={expandedId === `${entrada.data}-${entrada.codigo_bncc}-${i}`}
                    onToggle={() => setExpandedId(
                      expandedId === `${entrada.data}-${entrada.codigo_bncc}-${i}` ? null : `${entrada.data}-${entrada.codigo_bncc}-${i}`
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
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

        {/* Modo Semanal */}
        {modoVisualizacao === 'semanal' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <PlanoSemanal segmento={segmento} semanaInicio={dataAtual} />
          </div>
        )}

        {/* Modo Lista */}
        {modoVisualizacao === 'lista' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-48">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por objetivo, código, campo..."
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <select
                  value={filtroCampo}
                  onChange={e => setFiltroCampo(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os campos</option>
                  {CAMPOS_EXPERIENCIA.map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                  ))}
                </select>
                <select
                  value={filtroBimestre}
                  onChange={e => setFiltroBimestre(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os bimestres</option>
                  {bimestres.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <div className="flex items-center text-sm text-gray-500">
                  <Filter className="h-4 w-4 mr-1" />
                  {entradasFiltradas.length} resultados
                </div>
              </div>
            </div>

            {/* Lista de entradas */}
            <div className="space-y-2">
              {entradasFiltradas.map((entrada, i) => (
                <CardEntrada
                  key={`lista-${entrada.data}-${entrada.codigo_bncc}-${i}`}
                  entrada={entrada}
                  expanded={expandedId === `lista-${entrada.data}-${entrada.codigo_bncc}-${i}`}
                  onToggle={() => setExpandedId(
                    expandedId === `lista-${entrada.data}-${entrada.codigo_bncc}-${i}` ? null : `lista-${entrada.data}-${entrada.codigo_bncc}-${i}`
                  )}
                />
              ))}
              {entradasFiltradas.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma entrada encontrada com os filtros selecionados</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
