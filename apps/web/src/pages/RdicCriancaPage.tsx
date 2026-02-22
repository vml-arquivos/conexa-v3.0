/**
 * RdicCriancaPage.tsx
 * Tela dedicada de RDIC por criança para o professor.
 *
 * Fluxo:
 * 1. Professor seleciona a turma (carregada automaticamente via /teachers/dashboard)
 * 2. Professor seleciona a criança da turma
 * 3. Preenche o formulário RDIC com os 5 Campos de Experiência da BNCC
 * 4. Pode gerar um rascunho automático via Motor de IA LGPD (dados anonimizados)
 * 5. Salva o RDIC no banco
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../app/AuthProvider';
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
  Brain, Sparkles, User, Users, ChevronLeft, ChevronRight,
  Save, RefreshCw, CheckCircle, AlertCircle, Star,
  BookOpen, Heart, Music, Palette, Calculator, MessageSquare,
  ArrowLeft, FileText, Eye, EyeOff,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Aluno {
  id: string;
  nome: string;
  firstName: string;
  lastName: string;
  idade: number;
  gender: string;
  photoUrl?: string;
}

interface Turma {
  id: string;
  name: string;
  code: string;
  segmento?: string;
  unit: { name: string };
}

interface IndicadorAvaliacao {
  codigo: string;
  descricao: string;
  nivel: 'NAO_OBSERVADO' | 'EM_DESENVOLVIMENTO' | 'CONSOLIDADO' | 'AMPLIADO';
}

interface DimensaoAvaliacao {
  dimensao: string;
  indicadores: IndicadorAvaliacao[];
}

interface RdicSalvo {
  id: string;
  childId: string;
  child?: { firstName: string; lastName: string };
  periodo: string;
  bimestre: number;
  dimensoes: DimensaoAvaliacao[];
  observacaoGeral: string;
  proximosPassos: string;
  status: string;
  createdAt: string;
}

interface RelatorioIAConsolidado {
  relatorio: string;
  pontosFortess: string[];
  sugestoes: string[];
  anonimizado: boolean;
  totalObservacoes: number;
  codigoAnonimizado: string;
}

// ─── Dimensões BNCC (5 Campos de Experiência) ─────────────────────────────────
const DIMENSOES_BNCC = [
  {
    id: 'eu-outro-nos',
    label: 'O eu, o outro e o nós',
    descricao: 'Identidade, autonomia, relações sociais e afetivas',
    icon: Heart,
    cor: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800', badge: 'bg-pink-100 text-pink-700', btn: 'bg-pink-600 hover:bg-pink-700' },
    indicadores: [
      { codigo: 'EO01', descricao: 'Demonstra interesse em interagir com outras crianças e adultos' },
      { codigo: 'EO02', descricao: 'Expressa necessidades, desejos e emoções de forma verbal ou não verbal' },
      { codigo: 'EO03', descricao: 'Participa de brincadeiras coletivas e situações de cuidado' },
      { codigo: 'EO04', descricao: 'Demonstra empatia e respeito nas relações com os outros' },
      { codigo: 'EO05', descricao: 'Reconhece e respeita diferenças entre as pessoas' },
    ],
  },
  {
    id: 'corpo-gestos',
    label: 'Corpo, gestos e movimentos',
    descricao: 'Desenvolvimento motor, expressão corporal e coordenação',
    icon: Users,
    cor: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700' },
    indicadores: [
      { codigo: 'CG01', descricao: 'Explora e controla movimentos corporais amplos e finos' },
      { codigo: 'CG02', descricao: 'Utiliza o corpo para expressar emoções e comunicar-se' },
      { codigo: 'CG03', descricao: 'Demonstra equilíbrio, coordenação e lateralidade' },
      { codigo: 'CG04', descricao: 'Participa de brincadeiras que envolvem movimento e expressão corporal' },
      { codigo: 'CG05', descricao: 'Demonstra autonomia nos cuidados pessoais (higiene, alimentação)' },
    ],
  },
  {
    id: 'tracos-sons',
    label: 'Traços, sons, cores e formas',
    descricao: 'Expressão artística, criatividade e apreciação estética',
    icon: Palette,
    cor: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700' },
    indicadores: [
      { codigo: 'TS01', descricao: 'Explora diferentes materiais plásticos e sonoros' },
      { codigo: 'TS02', descricao: 'Produz trabalhos artísticos com intencionalidade expressiva' },
      { codigo: 'TS03', descricao: 'Aprecia e comenta produções artísticas próprias e dos colegas' },
      { codigo: 'TS04', descricao: 'Demonstra criatividade e imaginação nas produções' },
      { codigo: 'TS05', descricao: 'Identifica e nomeia cores, formas e texturas no ambiente' },
    ],
  },
  {
    id: 'escuta-fala',
    label: 'Escuta, fala, pensamento e imaginação',
    descricao: 'Linguagem oral e escrita, narrativa e letramento emergente',
    icon: MessageSquare,
    cor: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-700', btn: 'bg-blue-600 hover:bg-blue-700' },
    indicadores: [
      { codigo: 'EF01', descricao: 'Demonstra interesse por histórias, livros e situações de leitura' },
      { codigo: 'EF02', descricao: 'Comunica-se oralmente com clareza e amplia o vocabulário' },
      { codigo: 'EF03', descricao: 'Reconhece letras, palavras e inicia a escrita espontânea' },
      { codigo: 'EF04', descricao: 'Reconta histórias e cria narrativas com coerência' },
      { codigo: 'EF05', descricao: 'Participa ativamente de rodas de conversa e situações de escuta' },
    ],
  },
  {
    id: 'espacos-tempos',
    label: 'Espaços, tempos, quantidades, relações e transformações',
    descricao: 'Raciocínio lógico-matemático, ciências e exploração do mundo',
    icon: Calculator,
    cor: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100 text-green-700', btn: 'bg-green-600 hover:bg-green-700' },
    indicadores: [
      { codigo: 'ET01', descricao: 'Explora e descreve características do ambiente natural e social' },
      { codigo: 'ET02', descricao: 'Estabelece relações de comparação, classificação e seriação' },
      { codigo: 'ET03', descricao: 'Compreende noções de número, quantidade e medida' },
      { codigo: 'ET04', descricao: 'Resolve situações-problema com autonomia e criatividade' },
      { codigo: 'ET05', descricao: 'Demonstra curiosidade e interesse por fenômenos naturais' },
    ],
  },
];

const NIVEIS: Array<{ id: IndicadorAvaliacao['nivel']; label: string; short: string; cor: string; corBg: string }> = [
  { id: 'NAO_OBSERVADO', label: 'Não Observado', short: 'NO', cor: 'text-gray-500', corBg: 'bg-gray-100 border-gray-300 text-gray-600' },
  { id: 'EM_DESENVOLVIMENTO', label: 'Em Desenvolvimento', short: 'ED', cor: 'text-yellow-600', corBg: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { id: 'CONSOLIDADO', label: 'Consolidado', short: 'C', cor: 'text-green-600', corBg: 'bg-green-100 border-green-300 text-green-700' },
  { id: 'AMPLIADO', label: 'Ampliado', short: 'A', cor: 'text-blue-600', corBg: 'bg-blue-100 border-blue-300 text-blue-700' },
];

const BIMESTRES = [
  { id: 1, label: '1º Bimestre', periodo: 'Fev–Abr 2026' },
  { id: 2, label: '2º Bimestre', periodo: 'Mai–Jul 2026' },
  { id: 3, label: '3º Bimestre', periodo: 'Ago–Out 2026' },
  { id: 4, label: '4º Bimestre', periodo: 'Nov–Dez 2026' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function criarDimensoesVazias(): DimensaoAvaliacao[] {
  return DIMENSOES_BNCC.map(d => ({
    dimensao: d.id,
    indicadores: d.indicadores.map(ind => ({
      codigo: ind.codigo,
      descricao: ind.descricao,
      nivel: 'NAO_OBSERVADO' as const,
    })),
  }));
}

function calcularProgresso(dimensoes: DimensaoAvaliacao[]): { total: number; preenchidos: number; pct: number } {
  const total = dimensoes.reduce((s, d) => s + d.indicadores.length, 0);
  const preenchidos = dimensoes.reduce(
    (s, d) => s + d.indicadores.filter(i => i.nivel !== 'NAO_OBSERVADO').length,
    0,
  );
  return { total, preenchidos, pct: total > 0 ? Math.round((preenchidos / total) * 100) : 0 };
}

// ─── Componente de Card de Criança ────────────────────────────────────────────
function CardCrianca({
  aluno,
  selecionado,
  onClick,
  rdicsCount,
}: {
  aluno: Aluno;
  selecionado: boolean;
  onClick: () => void;
  rdicsCount: number;
}) {
  const iniciais = `${aluno.firstName[0]}${aluno.lastName[0]}`.toUpperCase();
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border-2 transition-all hover:shadow-md ${
        selecionado
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
          selecionado ? 'bg-blue-600' : 'bg-gradient-to-br from-indigo-400 to-purple-500'
        }`}>
          {aluno.photoUrl ? (
            <img src={aluno.photoUrl} alt={aluno.firstName} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            iniciais
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm truncate ${selecionado ? 'text-blue-800' : 'text-gray-800'}`}>
            {aluno.firstName} {aluno.lastName}
          </p>
          <p className="text-xs text-gray-500">{aluno.idade} anos · {aluno.gender === 'FEMININO' ? 'Menina' : aluno.gender === 'MASCULINO' ? 'Menino' : 'N/I'}</p>
        </div>
        {/* Badge RDIC */}
        <div className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
          rdicsCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {rdicsCount > 0 ? `${rdicsCount} RDIC` : 'Sem RDIC'}
        </div>
      </div>
    </button>
  );
}

// ─── Componente de Indicador ──────────────────────────────────────────────────
function IndicadorRow({
  indicador,
  onChange,
}: {
  indicador: IndicadorAvaliacao;
  onChange: (nivel: IndicadorAvaliacao['nivel']) => void;
}) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <span className="text-xs font-mono text-gray-400 mr-2">{indicador.codigo}</span>
          <span className="text-sm text-gray-700">{indicador.descricao}</span>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {NIVEIS.map(nivel => (
            <button
              key={nivel.id}
              onClick={() => onChange(nivel.id)}
              title={nivel.label}
              className={`w-8 h-8 rounded-lg text-xs font-bold border-2 transition-all ${
                indicador.nivel === nivel.id
                  ? `${nivel.corBg} border-current scale-110 shadow-sm`
                  : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'
              }`}
            >
              {nivel.short}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function RdicCriancaPage() {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [turma, setTurma] = useState<Turma | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [rdicsDoAluno, setRdicsDoAluno] = useState<RdicSalvo[]>([]);
  const [loadingRdics, setLoadingRdics] = useState(false);

  // Formulário RDIC
  const [bimestre, setBimestre] = useState(1);
  const [dimensoes, setDimensoes] = useState<DimensaoAvaliacao[]>(criarDimensoesVazias());
  const [observacaoGeral, setObservacaoGeral] = useState('');
  const [proximosPassos, setProximosPassos] = useState('');
  const [saving, setSaving] = useState(false);

  // IA LGPD
  const [gerandoIA, setGerandoIA] = useState(false);
  const [relatorioIA, setRelatorioIA] = useState<RelatorioIAConsolidado | null>(null);
  const [mostrarRelatorioIA, setMostrarRelatorioIA] = useState(false);

  // Navegação
  const [etapa, setEtapa] = useState<'selecionar' | 'formulario' | 'historico'>('selecionar');
  const [dimensaoAberta, setDimensaoAberta] = useState<string | null>('eu-outro-nos');

  // ─── Carregar turma e alunos ──────────────────────────────────────────────
  useEffect(() => {
    carregarTurma();
  }, []);

  async function carregarTurma() {
    try {
      setLoading(true);
      const res = await http.get('/teachers/dashboard');
      if (res.data?.hasClassroom) {
        setTurma(res.data.classroom);
        setAlunos(res.data.alunos ?? []);
      }
    } catch {
      toast.error('Não foi possível carregar a turma.');
    } finally {
      setLoading(false);
    }
  }

  async function selecionarAluno(aluno: Aluno) {
    setAlunoSelecionado(aluno);
    setDimensoes(criarDimensoesVazias());
    setObservacaoGeral('');
    setProximosPassos('');
    setRelatorioIA(null);
    setMostrarRelatorioIA(false);
    setEtapa('formulario');
    await carregarRdicsDoAluno(aluno.id);
  }

  async function carregarRdicsDoAluno(childId: string) {
    try {
      setLoadingRdics(true);
      const res = await http.get('/rdx', { params: { childId, type: 'RDIC' } });
      setRdicsDoAluno(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch {
      setRdicsDoAluno([]);
    } finally {
      setLoadingRdics(false);
    }
  }

  // ─── Atualizar nível de indicador ─────────────────────────────────────────
  function atualizarNivel(dimensaoId: string, codigoIndicador: string, nivel: IndicadorAvaliacao['nivel']) {
    setDimensoes(prev =>
      prev.map(d =>
        d.dimensao === dimensaoId
          ? {
              ...d,
              indicadores: d.indicadores.map(ind =>
                ind.codigo === codigoIndicador ? { ...ind, nivel } : ind,
              ),
            }
          : d,
      ),
    );
  }

  // ─── Gerar rascunho via IA LGPD ───────────────────────────────────────────
  async function gerarRascunhoIA() {
    if (!alunoSelecionado) return;
    setGerandoIA(true);
    setRelatorioIA(null);
    try {
      const ano = new Date().getFullYear();
      const bimestreAtual = BIMESTRES.find(b => b.id === bimestre);
      const res = await http.post('/ia/relatorio-consolidado-lgpd', {
        childId: alunoSelecionado.id,
        periodo: `${bimestreAtual?.label ?? `${bimestre}º Bimestre`} ${ano}`,
      });
      setRelatorioIA(res.data);
      setMostrarRelatorioIA(true);
      // Preencher automaticamente observação geral com o rascunho da IA
      if (res.data?.relatorio && !observacaoGeral.trim()) {
        setObservacaoGeral(res.data.relatorio);
      }
      if (res.data?.sugestoes?.length > 0 && !proximosPassos.trim()) {
        setProximosPassos(res.data.sugestoes.join('\n'));
      }
      toast.success(`Rascunho gerado com base em ${res.data.totalObservacoes} observações do Diário de Bordo!`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao gerar rascunho com IA';
      toast.error(msg);
    } finally {
      setGerandoIA(false);
    }
  }

  // ─── Salvar RDIC ──────────────────────────────────────────────────────────
  async function salvarRdic() {
    if (!alunoSelecionado) return;
    if (!observacaoGeral.trim()) {
      toast.error('Preencha a observação geral antes de salvar');
      return;
    }
    setSaving(true);
    try {
      const bimestreAtual = BIMESTRES.find(b => b.id === bimestre);
      const ano = new Date().getFullYear();
      await http.post('/rdx', {
        childId: alunoSelecionado.id,
        type: 'RDIC',
        periodo: `${bimestreAtual?.label ?? `${bimestre}º Bimestre`} ${ano}`,
        bimestre,
        dimensoes,
        observacaoGeral,
        proximosPassos,
      });
      toast.success(`RDIC de ${alunoSelecionado.firstName} salvo com sucesso!`);
      await carregarRdicsDoAluno(alunoSelecionado.id);
      setEtapa('historico');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar RDIC');
    } finally {
      setSaving(false);
    }
  }

  // ─── Progresso ────────────────────────────────────────────────────────────
  const progresso = calcularProgresso(dimensoes);

  // ─── Render: Loading ──────────────────────────────────────────────────────
  if (loading) return <LoadingState message="Carregando turma..." />;

  // ─── Render: Sem turma ────────────────────────────────────────────────────
  if (!turma) {
    return (
      <PageShell title="RDIC por Criança" subtitle="Registro de Desenvolvimento Individual">
        <EmptyState
          icon={<Users className="h-12 w-12 text-gray-400" />}
          title="Você ainda não tem turma"
          description="Aguarde a coordenação vincular você a uma turma para acessar os RDICs."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="RDIC por Criança"
      subtitle={`${turma.name} · ${turma.unit?.name}`}
    >
      {/* ─── Cabeçalho informativo ─── */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Brain className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-indigo-800">RDIC — Registro de Desenvolvimento Individual da Criança</h3>
            <p className="text-sm text-indigo-600 mt-0.5">
              Avaliação bimestral por dimensões de desenvolvimento baseada nos <strong>5 Campos de Experiência da BNCC</strong>.
              Selecione uma criança da sua turma para iniciar ou continuar o RDIC.
            </p>
          </div>
        </div>
      </div>

      {/* ─── ETAPA 1: Seleção de criança ─── */}
      {etapa === 'selecionar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Selecione a criança
            </h2>
            <span className="text-sm text-gray-500">{alunos.length} alunos na turma</span>
          </div>

          {alunos.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12 text-gray-400" />}
              title="Nenhum aluno encontrado"
              description="A turma ainda não tem alunos matriculados."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {alunos.map(aluno => (
                <CardCrianca
                  key={aluno.id}
                  aluno={aluno}
                  selecionado={alunoSelecionado?.id === aluno.id}
                  onClick={() => selecionarAluno(aluno)}
                  rdicsCount={rdicsDoAluno.filter(r => r.childId === aluno.id).length}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ETAPA 2: Formulário RDIC ─── */}
      {etapa === 'formulario' && alunoSelecionado && (
        <div className="space-y-6">
          {/* Header da criança selecionada */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setEtapa('selecionar')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Trocar criança
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                {alunoSelecionado.photoUrl ? (
                  <img src={alunoSelecionado.photoUrl} alt={alunoSelecionado.firstName} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  `${alunoSelecionado.firstName[0]}${alunoSelecionado.lastName[0]}`
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {alunoSelecionado.firstName} {alunoSelecionado.lastName}
                </h2>
                <p className="text-sm text-gray-500">{alunoSelecionado.idade} anos · {turma.name}</p>
              </div>
            </div>
            {rdicsDoAluno.length > 0 && (
              <button
                onClick={() => setEtapa('historico')}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-all"
              >
                <FileText className="h-4 w-4" />
                Ver histórico ({rdicsDoAluno.length})
              </button>
            )}
          </div>

          {/* Seleção de bimestre */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Período de Avaliação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {BIMESTRES.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setBimestre(b.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      bimestre === b.id
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700'
                    }`}
                  >
                    <p className="font-semibold text-sm">{b.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{b.periodo}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Barra de progresso */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progresso do preenchimento</span>
              <span className={`text-sm font-bold ${progresso.pct === 100 ? 'text-green-600' : 'text-gray-600'}`}>
                {progresso.preenchidos}/{progresso.total} indicadores ({progresso.pct}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  progresso.pct === 100 ? 'bg-green-500' : progresso.pct >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${progresso.pct}%` }}
              />
            </div>
            <div className="flex gap-4 mt-3 flex-wrap">
              {NIVEIS.map(n => {
                const count = dimensoes.reduce(
                  (s, d) => s + d.indicadores.filter(i => i.nivel === n.id).length,
                  0,
                );
                return (
                  <div key={n.id} className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center border ${n.corBg}`}>{n.short}</span>
                    <span className="text-xs text-gray-600">{n.label}: <strong>{count}</strong></span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botão IA LGPD */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-violet-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-violet-800 text-sm">Motor de IA Assistiva LGPD</p>
                  <p className="text-xs text-violet-600 mt-0.5">
                    Gera um rascunho de observação geral e próximos passos com base nas entradas do Diário de Bordo.
                    Os dados são <strong>anonimizados automaticamente</strong> antes de serem enviados à IA.
                  </p>
                </div>
              </div>
              <Button
                onClick={gerarRascunhoIA}
                disabled={gerandoIA}
                className="flex-shrink-0 bg-violet-600 hover:bg-violet-700 text-white text-sm"
              >
                {gerandoIA ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Gerar Rascunho IA</>
                )}
              </Button>
            </div>

            {/* Resultado da IA */}
            {relatorioIA && (
              <div className="mt-4 border-t border-violet-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Rascunho gerado — {relatorioIA.totalObservacoes} observações analisadas
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Código: {relatorioIA.codigoAnonimizado}
                    </span>
                  </div>
                  <button
                    onClick={() => setMostrarRelatorioIA(v => !v)}
                    className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1"
                  >
                    {mostrarRelatorioIA ? <><EyeOff className="h-3 w-3" /> Ocultar</> : <><Eye className="h-3 w-3" /> Ver</>}
                  </button>
                </div>

                {mostrarRelatorioIA && (
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-violet-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Relatório gerado pela IA</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{relatorioIA.relatorio}</p>
                    </div>
                    {relatorioIA.pontosFortess?.length > 0 && (
                      <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                        <p className="text-xs font-semibold text-green-700 uppercase mb-2">Pontos Fortes</p>
                        <ul className="space-y-1">
                          {relatorioIA.pontosFortess.map((p, i) => (
                            <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                              <Star className="h-3 w-3 mt-1 flex-shrink-0" /> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {relatorioIA.sugestoes?.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Sugestões de Continuidade</p>
                        <ul className="space-y-1">
                          {relatorioIA.sugestoes.map((s, i) => (
                            <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                              <ChevronRight className="h-3 w-3 mt-1 flex-shrink-0" /> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 italic">
                      * Rascunho gerado por IA. Revise e adapte conforme sua observação direta da criança.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5 Campos de Experiência BNCC */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">Avaliação por Campo de Experiência</h3>
            {DIMENSOES_BNCC.map(dim => {
              const dimData = dimensoes.find(d => d.dimensao === dim.id);
              const aberta = dimensaoAberta === dim.id;
              const DimIcon = dim.icon;
              const consolidados = dimData?.indicadores.filter(i => i.nivel === 'CONSOLIDADO' || i.nivel === 'AMPLIADO').length ?? 0;
              const total = dim.indicadores.length;

              return (
                <div key={dim.id} className={`border-2 rounded-xl overflow-hidden ${dim.cor.border}`}>
                  {/* Header da dimensão */}
                  <button
                    onClick={() => setDimensaoAberta(aberta ? null : dim.id)}
                    className={`w-full flex items-center justify-between p-4 ${dim.cor.bg} transition-colors hover:opacity-90`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${dim.cor.badge}`}>
                        <DimIcon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className={`font-semibold text-sm ${dim.cor.text}`}>{dim.label}</p>
                        <p className="text-xs text-gray-500">{dim.descricao}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${dim.cor.badge}`}>
                        {consolidados}/{total} avaliados
                      </span>
                      {aberta ? (
                        <ChevronRight className="h-4 w-4 text-gray-500 rotate-90 transition-transform" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500 transition-transform" />
                      )}
                    </div>
                  </button>

                  {/* Indicadores */}
                  {aberta && dimData && (
                    <div className="bg-white px-4 pb-2">
                      {/* Legenda */}
                      <div className="flex gap-3 py-3 border-b border-gray-100 flex-wrap">
                        {NIVEIS.map(n => (
                          <div key={n.id} className="flex items-center gap-1">
                            <span className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center border ${n.corBg}`}>{n.short}</span>
                            <span className="text-xs text-gray-500">{n.label}</span>
                          </div>
                        ))}
                      </div>
                      {dimData.indicadores.map(ind => (
                        <IndicadorRow
                          key={ind.codigo}
                          indicador={ind}
                          onChange={nivel => atualizarNivel(dim.id, ind.codigo, nivel)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Observação Geral */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                Observação Geral do Professor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Observação geral sobre o desenvolvimento de {alunoSelecionado.firstName}
                  <span className="text-gray-400 font-normal ml-1">(obrigatório)</span>
                </Label>
                <Textarea
                  value={observacaoGeral}
                  onChange={e => setObservacaoGeral(e.target.value)}
                  placeholder={`Descreva o desenvolvimento geral de ${alunoSelecionado.firstName} neste bimestre, considerando avanços, dificuldades e aspectos relevantes observados durante as atividades...`}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{observacaoGeral.length} caracteres</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Próximos passos e encaminhamentos
                  <span className="text-gray-400 font-normal ml-1">(opcional)</span>
                </Label>
                <Textarea
                  value={proximosPassos}
                  onChange={e => setProximosPassos(e.target.value)}
                  placeholder="Descreva as estratégias pedagógicas, encaminhamentos e objetivos para o próximo período..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Botões de ação */}
          <div className="flex items-center justify-between gap-3 pb-6">
            <button
              onClick={() => setEtapa('selecionar')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <div className="flex gap-3">
              {rdicsDoAluno.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setEtapa('historico')}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" /> Histórico
                </Button>
              )}
              <Button
                onClick={salvarRdic}
                disabled={saving || !observacaoGeral.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
              >
                {saving ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="h-4 w-4" /> Salvar RDIC</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ETAPA 3: Histórico de RDICs da criança ─── */}
      {etapa === 'historico' && alunoSelecionado && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setEtapa('formulario')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar ao formulário
            </button>
            <h2 className="text-lg font-semibold text-gray-800 flex-1">
              Histórico de RDICs — {alunoSelecionado.firstName} {alunoSelecionado.lastName}
            </h2>
            <Button
              onClick={() => setEtapa('formulario')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              <Plus className="h-4 w-4" /> Novo RDIC
            </Button>
          </div>

          {loadingRdics && <LoadingState message="Carregando histórico..." />}

          {!loadingRdics && rdicsDoAluno.length === 0 && (
            <EmptyState
              icon={<FileText className="h-12 w-12 text-gray-400" />}
              title="Nenhum RDIC registrado"
              description={`${alunoSelecionado.firstName} ainda não tem RDICs. Clique em "Novo RDIC" para criar o primeiro.`}
            />
          )}

          {!loadingRdics && rdicsDoAluno.length > 0 && (
            <div className="space-y-3">
              {rdicsDoAluno.map(rdic => {
                const prog = calcularProgresso(rdic.dimensoes ?? []);
                return (
                  <Card key={rdic.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-800">{rdic.periodo}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              rdic.status === 'PUBLICADO' ? 'bg-green-100 text-green-700' :
                              rdic.status === 'REVISAO' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {rdic.status === 'PUBLICADO' ? 'Publicado' : rdic.status === 'REVISAO' ? 'Em Revisão' : 'Rascunho'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{rdic.observacaoGeral}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-24 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full"
                                  style={{ width: `${prog.pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{prog.pct}% preenchido</span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(rdic.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <CheckCircle className={`h-5 w-5 flex-shrink-0 ${
                          rdic.status === 'PUBLICADO' ? 'text-green-500' : 'text-gray-300'
                        }`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
