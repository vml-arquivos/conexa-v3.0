import { useState, useMemo } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  MATRIZ_PEDAGOGICA_2026,
  SEGMENTOS,
  CAMPOS_EXPERIENCIA_BNCC,
  type ObjetivoAprendizagem,
} from '../data/matrizPedagogica2026';
import {
  Search, Filter, ChevronDown, ChevronUp, BookOpen,
  Layers, Target, Calendar, Tag, Star, Download,
  Grid, List, CheckCircle, Sparkles,
} from 'lucide-react';

// ─── Mapeamento de campos de experiência ─────────────────────────────────────
const CAMPO_MAP: Record<string, string> = {
  'O eu, o outro e o nós': 'eu-outro-nos',
  'Corpo, gestos e movimentos': 'corpo-gestos',
  'Traços, sons, cores e formas': 'tracos-sons',
  'Escuta, fala, pensamento e imaginação': 'escuta-fala',
  'Espaços, tempos, quantidades, relações e transformações': 'espacos-tempos',
};

const COR_CAMPO: Record<string, string> = {
  'eu-outro-nos': 'bg-pink-100 text-pink-700 border-pink-200',
  'corpo-gestos': 'bg-orange-100 text-orange-700 border-orange-200',
  'tracos-sons': 'bg-purple-100 text-purple-700 border-purple-200',
  'escuta-fala': 'bg-blue-100 text-blue-700 border-blue-200',
  'espacos-tempos': 'bg-green-100 text-green-700 border-green-200',
};

const COR_SEGMENTO: Record<string, string> = {
  EI01: 'bg-blue-100 text-blue-700 border-blue-200',
  EI02: 'bg-green-100 text-green-700 border-green-200',
  EI03: 'bg-purple-100 text-purple-700 border-purple-200',
};

function getCampoId(campoExperiencia: string): string {
  return CAMPO_MAP[campoExperiencia] || 'outro';
}

// ─── Card de Objetivo ─────────────────────────────────────────────────────────
function ObjetivoCard({ obj, compact }: { obj: ObjetivoAprendizagem; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const campoId = getCampoId(obj.campo_experiencia);
  const campoInfo = CAMPOS_EXPERIENCIA_BNCC.find(c => c.id === campoId);
  const segInfo = SEGMENTOS[obj.segmento as keyof typeof SEGMENTOS];

  return (
    <div className={`bg-white border-2 rounded-xl transition-all hover:shadow-sm ${expanded ? 'border-blue-200' : 'border-gray-100 hover:border-gray-200'}`}>
      <div className="p-3 cursor-pointer" onClick={() => !compact && setExpanded(!expanded)}>
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap gap-1 mb-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${COR_SEGMENTO[obj.segmento] || 'bg-gray-100 text-gray-600'}`}>
                {obj.segmento} · {segInfo?.label}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${COR_CAMPO[campoId] || 'bg-gray-100 text-gray-600'}`}>
                {campoInfo?.emoji} {obj.campo_experiencia.split(',')[0]}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                {obj.bimestre}º Bim · Sem {obj.semana}
              </span>
              {obj.codigo_bncc && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600 font-mono">
                  {obj.codigo_bncc}
                </span>
              )}
            </div>

            {/* Objetivo */}
            <p className={`text-sm text-gray-800 font-medium leading-snug ${!expanded && !compact ? 'line-clamp-2' : ''}`}>
              {obj.objetivo_bncc}
            </p>

            {/* Tema da semana */}
            {obj.semana_tema && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Tag className="h-3 w-3" /> {obj.semana_tema}
                {obj.data && <span className="ml-1">· {obj.data}</span>}
              </p>
            )}
          </div>

          {!compact && (
            <button className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-0.5">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expanded && !compact && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 mt-0 space-y-2">
          {obj.exemplo_atividade && obj.exemplo_atividade !== obj.objetivo_bncc && (
            <div className="bg-blue-50 rounded-lg p-2.5">
              <p className="text-xs font-semibold text-blue-500 uppercase mb-1">Exemplo de Atividade</p>
              <p className="text-sm text-blue-700">{obj.exemplo_atividade}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs h-7 text-purple-600 border-purple-200 hover:bg-purple-50">
              <CheckCircle className="h-3 w-3 mr-1" /> Usar no Planejamento
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              <Star className="h-3 w-3 mr-1" /> Vincular ao RDIC
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function MatrizPedagogicaPage() {
  const [busca, setBusca] = useState('');
  const [segmentoFiltro, setSegmentoFiltro] = useState<string>('');
  const [campoFiltro, setCampoFiltro] = useState<string>('');
  const [bimestreFiltro, setBimestreFiltro] = useState<number>(0);
  const [visualizacao, setVisualizacao] = useState<'lista' | 'grade' | 'bimestre'>('lista');
  const [abaAtiva, setAbaAtiva] = useState<'matriz' | 'sobre'>('matriz');

  // Filtrar objetivos
  const objetivosFiltrados = useMemo(() => {
    return MATRIZ_PEDAGOGICA_2026.filter(obj => {
      if (segmentoFiltro && obj.segmento !== segmentoFiltro) return false;
      if (campoFiltro && getCampoId(obj.campo_experiencia) !== campoFiltro) return false;
      if (bimestreFiltro && obj.bimestre !== bimestreFiltro) return false;
      if (busca) {
        const q = busca.toLowerCase();
        return (
          obj.objetivo_bncc.toLowerCase().includes(q) ||
          obj.codigo_bncc.toLowerCase().includes(q) ||
          obj.campo_experiencia.toLowerCase().includes(q) ||
          obj.semana_tema.toLowerCase().includes(q) ||
          obj.exemplo_atividade.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [busca, segmentoFiltro, campoFiltro, bimestreFiltro]);

  // Agrupar por bimestre para visualização de grade
  const porBimestre = useMemo(() => {
    const grupos: Record<number, ObjetivoAprendizagem[]> = { 1: [], 2: [], 3: [], 4: [] };
    objetivosFiltrados.forEach(obj => {
      if (grupos[obj.bimestre]) grupos[obj.bimestre].push(obj);
    });
    return grupos;
  }, [objetivosFiltrados]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = MATRIZ_PEDAGOGICA_2026.length;
    const porSeg = Object.fromEntries(
      Object.keys(SEGMENTOS).map(s => [s, MATRIZ_PEDAGOGICA_2026.filter(o => o.segmento === s).length])
    );
    return { total, porSeg };
  }, []);

  return (
    <PageShell
      title="Matriz Pedagógica 2026"
      subtitle="Sequência Pedagógica Piloto — Objetivos de Aprendizagem e Desenvolvimento (BNCC)"
    >
      {/* Abas */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
        {[
          { id: 'matriz', label: 'Objetivos de Aprendizagem', icon: <Target className="h-4 w-4" /> },
          { id: 'sobre', label: 'Sobre a Matriz', icon: <BookOpen className="h-4 w-4" /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setAbaAtiva(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${abaAtiva === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── SOBRE A MATRIZ ─── */}
      {abaAtiva === 'sobre' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Layers className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-indigo-800 mb-2">Sequência Pedagógica Piloto 2026</h2>
                <p className="text-gray-700 leading-relaxed">
                  A Matriz Pedagógica do Conexa é baseada na <strong>Sequência Pedagógica Piloto 2026</strong>, 
                  documento que organiza os objetivos de aprendizagem e desenvolvimento da Educação Infantil 
                  alinhados à <strong>Base Nacional Comum Curricular (BNCC)</strong>, distribuídos em 4 bimestres 
                  e 3 segmentos etários.
                </p>
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-2 border-indigo-100 text-center">
              <CardContent className="pt-4 pb-3">
                <p className="text-3xl font-bold text-indigo-600">{stats.total}</p>
                <p className="text-xs text-gray-500 mt-1">Objetivos totais</p>
              </CardContent>
            </Card>
            {Object.entries(SEGMENTOS).map(([seg, info]) => (
              <Card key={seg} className={`border-2 text-center border-${info.cor}-100`}>
                <CardContent className="pt-4 pb-3">
                  <p className={`text-3xl font-bold text-${info.cor}-600`}>{stats.porSeg[seg]}</p>
                  <p className="text-xs text-gray-500 mt-1">{seg} — {info.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Segmentos */}
          <div className="space-y-3">
            {Object.entries(SEGMENTOS).map(([seg, info]) => (
              <Card key={seg} className="border-2 border-gray-100">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${COR_SEGMENTO[seg]}`}>{seg}</span>
                    <div>
                      <p className="font-semibold text-gray-800">{info.label}</p>
                      <p className="text-xs text-gray-500">{info.desc}</p>
                    </div>
                    <span className="ml-auto text-sm text-gray-400">{stats.porSeg[seg]} objetivos</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Campos de Experiência */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Campos de Experiência (BNCC)</h3>
            <div className="space-y-2">
              {CAMPOS_EXPERIENCIA_BNCC.map(campo => (
                <div key={campo.id} className={`flex items-center gap-3 p-3 rounded-xl border ${COR_CAMPO[campo.id]}`}>
                  <span className="text-2xl">{campo.emoji}</span>
                  <p className="font-medium text-sm">{campo.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── MATRIZ DE OBJETIVOS ─── */}
      {abaAtiva === 'matriz' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por objetivo, código BNCC, tema ou atividade..." className="pl-9 bg-white" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Segmento */}
              <div className="flex gap-1">
                <button onClick={() => setSegmentoFiltro('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${!segmentoFiltro ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  Todos
                </button>
                {Object.entries(SEGMENTOS).map(([seg, info]) => (
                  <button key={seg} onClick={() => setSegmentoFiltro(segmentoFiltro === seg ? '' : seg)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${segmentoFiltro === seg ? `bg-${info.cor}-600 text-white border-${info.cor}-600` : `bg-white text-gray-600 border-gray-200 hover:border-gray-300`}`}>
                    {seg}
                  </button>
                ))}
              </div>

              {/* Bimestre */}
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(b => (
                  <button key={b} onClick={() => setBimestreFiltro(b)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${bimestreFiltro === b ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                    {b === 0 ? 'Todos bim.' : `${b}º Bim`}
                  </button>
                ))}
              </div>
            </div>

            {/* Campos de Experiência */}
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setCampoFiltro('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${!campoFiltro ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                Todos os campos
              </button>
              {CAMPOS_EXPERIENCIA_BNCC.map(campo => (
                <button key={campo.id} onClick={() => setCampoFiltro(campoFiltro === campo.id ? '' : campo.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${campoFiltro === campo.id ? COR_CAMPO[campo.id] + ' border-current' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  {campo.emoji} {campo.label.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Controles de visualização */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-700">{objetivosFiltrados.length}</span> objetivos encontrados
            </p>
            <div className="flex gap-1">
              {[
                { id: 'lista', icon: <List className="h-4 w-4" /> },
                { id: 'bimestre', icon: <Grid className="h-4 w-4" /> },
              ].map(v => (
                <button key={v.id} onClick={() => setVisualizacao(v.id as any)}
                  className={`p-2 rounded-lg border transition-all ${visualizacao === v.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  {v.icon}
                </button>
              ))}
            </div>
          </div>

          {/* ─── VISUALIZAÇÃO LISTA ─── */}
          {visualizacao === 'lista' && (
            <div className="space-y-2">
              {objetivosFiltrados.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">Nenhum objetivo encontrado</p>
                  <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros</p>
                </div>
              )}
              {objetivosFiltrados.map(obj => (
                <ObjetivoCard key={obj.id} obj={obj} />
              ))}
            </div>
          )}

          {/* ─── VISUALIZAÇÃO POR BIMESTRE ─── */}
          {visualizacao === 'bimestre' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(bim => (
                <div key={bim} className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="font-semibold text-indigo-800">{bim}º Bimestre</p>
                      <p className="text-xs text-indigo-500">{porBimestre[bim]?.length || 0} objetivos</p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {(porBimestre[bim] || []).length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">Nenhum objetivo para este bimestre com os filtros atuais</p>
                    )}
                    {(porBimestre[bim] || []).map(obj => (
                      <ObjetivoCard key={obj.id} obj={obj} compact />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
