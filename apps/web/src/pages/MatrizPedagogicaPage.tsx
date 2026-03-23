import { useState, useMemo, useEffect } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  SEGMENTOS,
  CAMPOS_EXPERIENCIA_BNCC,
} from '../data/matrizPedagogica2026';
import { MATRIZ_2026, type ExemploAtividade } from '../data/matrizCompleta2026';
import {
  Search, ChevronDown, ChevronUp, BookOpen,
  Layers, Target, Calendar, Tag, Star, Sparkles,
  Grid, List, CheckCircle, RefreshCw, GraduationCap, Eye, EyeOff,
} from 'lucide-react';
import http from '../api/http';
import { useAuth } from '../app/AuthProvider';
import { isProfessor } from '../api/auth';

// ─── Tipo unificado para objetivo (API ou lookup local) ──────────────────────
interface ObjetivoMatriz {
  id: string;
  segmento: string;
  bimestre: number;
  semana: number;
  semana_tema: string;
  campo_experiencia: string;
  campo_id: string;
  codigo_bncc: string;
  objetivo_bncc: string;
  exemplo_atividade?: string;
  // FIX P0.4: campos pedagógicos obrigatórios para o professor
  objetivo_curriculo_movimento?: string;
  intencionalidade_pedagogica?: string;
  data?: string;
}

// ─── Mapeamento de campos de experiência ─────────────────────────────────────
// Suporta tanto o label legível quanto o valor do enum do banco (CampoDeExperiencia)
const CAMPO_MAP: Record<string, string> = {
  // Labels legíveis (fallback local e coordenacao/full)
  'O eu, o outro e o nós': 'eu-outro-nos',
  'Corpo, gestos e movimentos': 'corpo-gestos',
  'Traços, sons, cores e formas': 'tracos-sons',
  'Escuta, fala, pensamento e imaginação': 'escuta-fala',
  'Espaços, tempos, quantidades, relações e transformações': 'espacos-tempos',
  // Valores do enum do banco (retornados pelo findAll para o professor)
  'O_EU_O_OUTRO_E_O_NOS': 'eu-outro-nos',
  'CORPO_GESTOS_E_MOVIMENTOS': 'corpo-gestos',
  'TRACOS_SONS_CORES_E_FORMAS': 'tracos-sons',
  'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO': 'escuta-fala',
  'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES': 'espacos-tempos',
};

// Converte enum do banco para label legível
const CAMPO_LABEL: Record<string, string> = {
  'O_EU_O_OUTRO_E_O_NOS': 'O eu, o outro e o nós',
  'CORPO_GESTOS_E_MOVIMENTOS': 'Corpo, gestos e movimentos',
  'TRACOS_SONS_CORES_E_FORMAS': 'Traços, sons, cores e formas',
  'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO': 'Escuta, fala, pensamento e imaginação',
  'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES': 'Espaços, tempos, quantidades, relações e transformações',
};

function normalizeCampoLabel(campo: string): string {
  return CAMPO_LABEL[campo] ?? campo;
}

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

// ─── Lookup de exemplos de atividades por código BNCC ─────────────────────────
// Construído a partir do matrizCompleta2026 que tem 4 exemplos por objetivo
const EXEMPLOS_POR_CODIGO: Record<string, ExemploAtividade[]> = (() => {
  const map: Record<string, ExemploAtividade[]> = {};
  for (const seg of Object.values(MATRIZ_2026)) {
    for (const entrada of seg) {
      if (entrada.codigo_bncc && entrada.exemplos_atividades?.length) {
        // Manter apenas exemplos com descrição não vazia e distinta do objetivo
        const exemplos = entrada.exemplos_atividades.filter(
          e => e.descricao && e.descricao.trim().length > 0
        );
        if (exemplos.length > 0) {
          map[entrada.codigo_bncc] = exemplos;
        }
      }
    }
  }
  return map;
})();

// ─── Card de Objetivo ─────────────────────────────────────────────────────
function ObjetivoCard({ obj, compact, mostrarExemplo }: {
  obj: ObjetivoMatriz;
  compact?: boolean;
  mostrarExemplo?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const campoId = getCampoId(obj.campo_experiencia);
  const campoInfo = CAMPOS_EXPERIENCIA_BNCC.find(c => c.id === campoId);
  const segInfo = SEGMENTOS[obj.segmento as keyof typeof SEGMENTOS];
  // Exemplos do lookup local (matrizCompleta2026) — usados quando mostrarExemplo=true
  const exemplosLookup = obj.codigo_bncc ? (EXEMPLOS_POR_CODIGO[obj.codigo_bncc] ?? []) : [];
  // Exemplo da API (coordenação) ou fallback do lookup
  const exemploApi = obj.exemplo_atividade && obj.exemplo_atividade !== obj.objetivo_bncc ? obj.exemplo_atividade : null;
  // Usar exemplos do lookup quando disponíveis, senão usar exemplo da API
  const exemplosParaExibir: ExemploAtividade[] = exemplosLookup.length > 0
    ? exemplosLookup
    : exemploApi ? [{ titulo: 'Exemplo de Atividade', descricao: exemploApi }] : [];

  return (
    <div className={`bg-white border-2 rounded-xl transition-all hover:shadow-sm ${expanded ? 'border-blue-200' : 'border-gray-100 hover:border-gray-200'}`}>
      <div className="p-3 cursor-pointer" onClick={() => !compact && setExpanded(!expanded)}>
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
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
            <p className={`text-sm text-gray-800 font-medium leading-snug ${!expanded && !compact ? 'line-clamp-2' : ''}`}>
              {obj.objetivo_bncc}
            </p>
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

      {expanded && !compact && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 mt-0 space-y-2">
          {/* FIX A2: Objetivo do Currículo em Movimento — sempre visível quando preenchido (professor e coordenação) */}
          {obj.objetivo_curriculo_movimento && (
            <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-1 flex items-center gap-1">
                <Target className="h-3 w-3" /> Objetivo do Currículo 2026
              </p>
              <p className="text-sm text-blue-800">{obj.objetivo_curriculo_movimento}</p>
            </div>
          )}
          {/* FIX P0.4: Intencionalidade Pedagógica — visível para professor e coordenação */}
          {obj.intencionalidade_pedagogica && (
            <div className="bg-purple-50 rounded-lg p-2.5 border border-purple-100">
              <p className="text-xs font-semibold text-purple-600 uppercase mb-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Intencionalidade Pedagógica
              </p>
              <p className="text-sm text-purple-800">{obj.intencionalidade_pedagogica}</p>
            </div>
          )}
          {/* Exemplos de Atividade — visíveis para coordenação sempre; para professor quando toggle ativado */}
          {mostrarExemplo && exemplosParaExibir.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-green-600 uppercase flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Exemplos de Experiências / Atividades
                <span className="ml-1 text-green-400 font-normal normal-case">({exemplosParaExibir.length} sugest{exemplosParaExibir.length === 1 ? 'ão' : 'ões'})</span>
              </p>
              {exemplosParaExibir.map((ex, i) => (
                <div key={i} className="bg-green-50 rounded-lg p-2.5 border border-green-100">
                  {ex.titulo && ex.titulo !== 'Exemplo de Atividade' && (
                    <p className="text-xs font-semibold text-green-700 mb-1">{ex.titulo}</p>
                  )}
                  <p className="text-sm text-green-800 leading-snug">{ex.descricao}</p>
                </div>
              ))}
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
  const { user } = useAuth();
  const ehProfessor = isProfessor(user);
  // Coordenação sempre vê exemplos; professor pode ligar/desligar via toggle
  const [professorVerExemplos, setProfessorVerExemplos] = useState(false);
  const mostrarExemplo = ehProfessor ? professorVerExemplos : true;

  const [busca, setBusca] = useState('');
  const [segmentoFiltro, setSegmentoFiltro] = useState<string>('');
  const [campoFiltro, setCampoFiltro] = useState<string>('');
  const [bimestreFiltro, setBimestreFiltro] = useState<number>(0);
  const [visualizacao, setVisualizacao] = useState<'lista' | 'bimestre'>('lista');
  const [abaAtiva, setAbaAtiva] = useState<'matriz' | 'sobre'>('matriz');

  // Dados da API
  const [matrizApi, setMatrizApi] = useState<ObjetivoMatriz[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erroApi, setErroApi] = useState(false);

  // Fallback: lookup local
  const [matrizLocal, setMatrizLocal] = useState<ObjetivoMatriz[]>([]);

  // Carregar lookup local como fallback
  useEffect(() => {
    import('../data/matrizPedagogica2026').then(m => {
      setMatrizLocal(m.MATRIZ_PEDAGOGICA_2026.map((o: any) => ({
        id: o.id,
        segmento: o.segmento,
        bimestre: o.bimestre,
        semana: o.semana,
        semana_tema: o.semana_tema,
        campo_experiencia: o.campo_experiencia,
        campo_id: getCampoId(o.campo_experiencia),
        codigo_bncc: o.codigo_bncc,
        objetivo_bncc: o.objetivo_bncc,
        exemplo_atividade: o.exemplo_atividade,
        // FIX P0.4: mapear campos pedagógicos do lookup local
        objetivo_curriculo_movimento: o.objetivo_curriculo_movimento,
        intencionalidade_pedagogica: o.intencionalidade_pedagogica,
        data: o.data,
      })));
    });
  }, []);

  // Carregar dados da API
  // FIX A1: professor usa /curriculum-matrix-entries (findAll, acessível para todos os roles)
  // coordenação usa /curriculum-matrix-entries/coordenacao/full (restrito a UNIDADE+)
  // Os dois endpoints retornam campos com nomes diferentes — mapeamento específico por endpoint
  useEffect(() => {
    if (abaAtiva !== 'matriz') return;
    setCarregando(true);
    setErroApi(false);
    const startDate = '2026-02-01';
    const endDate = '2026-12-31';

    if (ehProfessor) {
      // Professor: usa findAll — retorna campos reais do banco
      // campoDeExperiencia (enum), objetivoBNCC, objetivoBNCCCode, objetivoCurriculo,
      // intencionalidade, bimester, weekOfYear, date, matrix.segment
      const params: Record<string, string | number> = { startDate, endDate };
      http.get('/curriculum-matrix-entries', { params })
        .then(r => {
          const raw: any[] = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
          const objetivos: ObjetivoMatriz[] = raw.map((e: any) => {
            const campoRaw: string = e.campoDeExperiencia ?? '';
            const campoLabel = normalizeCampoLabel(campoRaw);
            return {
              id: e.id ?? '',
              // matrix.segment é o segmento real (EI01/EI02/EI03)
              segmento: e.matrix?.segment ?? '',
              bimestre: e.bimester ?? 1,
              semana: e.weekOfYear ?? 1,
              semana_tema: '',
              // FIX A1: campo_experiencia usa o label legível para exibição
              campo_experiencia: campoLabel,
              campo_id: getCampoId(campoLabel),
              codigo_bncc: e.objetivoBNCCCode ?? '',
              // FIX A1: campos reais do banco mapeados corretamente
              objetivo_bncc: e.objetivoBNCC ?? '',
              objetivo_curriculo_movimento: e.objetivoCurriculo ?? '',
              intencionalidade_pedagogica: e.intencionalidade ?? '',
              // professor não recebe exemploAtividade (mascarado no backend)
              exemplo_atividade: '',
              data: e.date ? e.date.split('T')[0] : '',
            };
          });
          if (objetivos.length > 0) {
            setMatrizApi(objetivos);
          } else {
            setErroApi(true);
          }
        })
        .catch(() => setErroApi(true))
        .finally(() => setCarregando(false));
    } else {
      // Coordenação/Mantenedora: usa coordenacao/full — retorna diasLetivos agrupados por data
      const params: Record<string, string> = { startDate, endDate };
      if (segmentoFiltro) params.segment = segmentoFiltro;
      http.get('/curriculum-matrix-entries/coordenacao/full', { params })
        .then(r => {
          const diasLetivos: any[] = r.data?.diasLetivos ?? [];
          const objetivos: ObjetivoMatriz[] = [];
          for (const dia of diasLetivos) {
            for (const obj of (dia.objectives ?? [])) {
              const campoRaw: string = obj.campoExperiencia ?? '';
              const campoLabel = normalizeCampoLabel(campoRaw);
              objetivos.push({
                id: obj.id ?? `${dia.date}-${obj.objetivoBNCCCodigo}`,
                segmento: r.data?.segment ?? '',
                bimestre: obj.bimestre ?? 1,
                semana: obj.semana ?? 1,
                semana_tema: obj.semana ?? '',
                campo_experiencia: campoLabel,
                campo_id: getCampoId(campoLabel),
                codigo_bncc: obj.objetivoBNCCCodigo ?? '',
                objetivo_bncc: obj.objetivoBNCC ?? '',
                exemplo_atividade: obj.exemploAtividade ?? '',
                // FIX A1: getMatrizFullForCoord retorna 'objetivoCurriculo' e 'intencionalidade'
                objetivo_curriculo_movimento: obj.objetivoCurriculo ?? '',
                intencionalidade_pedagogica: obj.intencionalidade ?? '',
                data: dia.date,
              });
            }
          }
          if (objetivos.length > 0) {
            setMatrizApi(objetivos);
          } else {
            setErroApi(true);
          }
        })
        .catch(() => setErroApi(true))
        .finally(() => setCarregando(false));
    }
  }, [abaAtiva, segmentoFiltro, ehProfessor]);

  // Usar API se disponível, senão fallback local
  const matrizBase = matrizApi.length > 0 ? matrizApi : matrizLocal;

  const objetivosFiltrados = useMemo(() => {
    return matrizBase.filter(obj => {
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
          (obj.exemplo_atividade ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [matrizBase, busca, segmentoFiltro, campoFiltro, bimestreFiltro]);

  const porBimestre = useMemo(() => {
    const grupos: Record<number, ObjetivoMatriz[]> = { 1: [], 2: [], 3: [], 4: [] };
    objetivosFiltrados.forEach(obj => {
      if (grupos[obj.bimestre]) grupos[obj.bimestre].push(obj);
    });
    return grupos;
  }, [objetivosFiltrados]);

  const stats = useMemo(() => {
    const total = matrizBase.length;
    const porSeg = Object.fromEntries(
      Object.keys(SEGMENTOS).map(s => [s, matrizBase.filter(o => o.segmento === s).length])
    );
    return { total, porSeg };
  }, [matrizBase]);

  return (
    <PageShell
      title="Matriz Pedagógica 2026"
      subtitle="Sequência Pedagógica Piloto — Objetivos de Aprendizagem e Desenvolvimento (BNCC)"
    >
      {/* Badge de perfil + Toggle de exemplos para professor */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          {ehProfessor ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
              <GraduationCap className="h-3.5 w-3.5" />
              Visão do Professor — Objetivos BNCC
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
              <Sparkles className="h-3.5 w-3.5" />
              Visão da Coordenação — Objetivos + Exemplos de Atividades
            </span>
          )}
        </div>
        {/* Toggle de exemplos de atividades — apenas para professor */}
        {ehProfessor && (
          <button
            onClick={() => setProfessorVerExemplos(v => !v)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              professorVerExemplos
                ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
            title={professorVerExemplos ? 'Ocultar exemplos de atividades' : 'Exibir exemplos de atividades'}
          >
            {professorVerExemplos ? (
              <><Eye className="h-3.5 w-3.5" /> Exemplos visíveis</>
            ) : (
              <><EyeOff className="h-3.5 w-3.5" /> Exemplos ocultos</>
            )}
          </button>
        )}
      </div>
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
                  <p className={`text-3xl font-bold text-${info.cor}-600`}>{stats.porSeg[seg] ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{seg} — {info.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

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
                    <span className="ml-auto text-sm text-gray-400">{stats.porSeg[seg] ?? 0} objetivos</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

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
          {/* Aviso de fonte */}
          {matrizApi.length > 0 && !erroApi && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
              Dados carregados da API em tempo real
              {mostrarExemplo && !ehProfessor && <span className="ml-1 font-semibold">· Exemplos de atividades visíveis (coordenação)</span>}
              {mostrarExemplo && ehProfessor && <span className="ml-1 font-semibold text-green-600">· Exemplos de atividades ativados</span>}
            </div>
          )}
          {erroApi && matrizLocal.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <RefreshCw className="h-3.5 w-3.5 flex-shrink-0" />
              Usando dados locais (API indisponível)
            </div>
          )}

          {/* Filtros */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por objetivo, código BNCC, tema ou atividade..." className="pl-9 bg-white" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>

            <div className="flex flex-wrap gap-2">
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

              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(b => (
                  <button key={b} onClick={() => setBimestreFiltro(b)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${bimestreFiltro === b ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                    {b === 0 ? 'Todos bim.' : `${b}º Bim`}
                  </button>
                ))}
              </div>
            </div>

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
              {carregando
                ? <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Carregando...</span>
                : <><span className="font-semibold text-gray-700">{objetivosFiltrados.length}</span> objetivos encontrados</>
              }
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
              {!carregando && objetivosFiltrados.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">Nenhum objetivo encontrado</p>
                  <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros</p>
                </div>
              )}
              {objetivosFiltrados.map(obj => (
                <ObjetivoCard key={obj.id} obj={obj} mostrarExemplo={mostrarExemplo} />
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
                      <ObjetivoCard key={obj.id} obj={obj} compact mostrarExemplo={mostrarExemplo} />
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
