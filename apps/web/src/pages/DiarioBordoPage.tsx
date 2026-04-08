import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles } from '../app/RoleProtectedRoute';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from 'sonner';
import http from '../api/http';
import { createMicrogestureEvent, type MicrogestureKind } from '../services/microgestures';
import {
  BookOpen, Plus, Save, Calendar, ChevronDown, ChevronUp,
  Sparkles, Lightbulb, Target, Clock, RefreshCw,
  CheckCircle, Users, Search, UserCircle, X, Brain, Heart, Apple, Star, AlertCircle,
  Camera, UploadCloud, Trash2, TriangleAlert, Pencil, ClipboardList,
} from 'lucide-react';
import { AlergiaAlert } from '../components/ui/AlergiaAlert';
import { extractErrorMessage } from '../lib/utils';
import { getPedagogicalToday } from '@/utils/pedagogicalDate';
import { ChildAvatar } from '../components/children/ChildAvatar';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Crianca {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  idade?: number;
  gender?: string;
  allergies?: string | null;
  medicalConditions?: string | null;
}

interface DiaryEntry {
  id: string;
  date: string;
  climaEmocional: string;
  microgestos: Microgesto[];
  rotina: RotinaItem[];
  momentoDestaque: string;
  reflexaoPedagogica: string;
  encaminhamentos: string;
  presencas: number;
  ausencias: number;
  status: string;
  createdAt: string;
  aiContext?: Record<string, any> | null;
}

interface Microgesto {
  id: string;
  tipo: string;
  descricao: string;
  criancaId?: string;
  criancaNome?: string;
  criancaFoto?: string;
  campo: string;
  horario?: string;
}

interface ObservacaoIndividual {
  id?: string;
  childId: string;
  category: string;
  date: string;
  behaviorDescription?: string;
  socialInteraction?: string;
  emotionalState?: string;
  dietaryNotes?: string;
  sleepPattern?: string;
  learningProgress?: string;
  planningParticipation?: string;
  psychologicalNotes?: string;
  developmentAlerts?: string;
  recommendations?: string;
  child?: { id: string; firstName: string; lastName: string; photoUrl?: string };
}

// ─── Ocorrências ─────────────────────────────────────────────────────────────
interface Ocorrencia {
  id?: string;
  childId: string;
  classroomId: string;
  categoria: string;
  descricao: string;
  mediaUrls?: string[];
  eventDate: string;
  createdAt?: string;
  createdBy?: string;
  child?: { id: string; firstName: string; lastName: string; photoUrl?: string };
}

const CATEGORIAS_OCORRENCIA = [
  { id: 'CHEGADA_SAIDA', label: 'Chegada / Saída', emoji: '🚪' },
  { id: 'SAUDE_LESAO', label: 'Saúde / Lesão', emoji: '🩹' },
  { id: 'MATERIAL_PERTENCES', label: 'Material / Pertences', emoji: '🎒' },
  { id: 'COMPORTAMENTO', label: 'Comportamento', emoji: '💬' },
  { id: 'COMUNICACAO_RESPONSAVEIS', label: 'Comunicação com responsáveis', emoji: '📞' },
  { id: 'OUTRO', label: 'Outro', emoji: '📝' },
];

interface RotinaItem {
  momento: string;
  descricao: string;
  observacao?: string;
  concluido: boolean;
}

// ─── Microgestos Pedagógicos ──────────────────────────────────────────────────
const TIPOS_MICROGESTO = [
  { id: 'ESCUTA', label: 'Escuta Ativa', emoji: '👂', desc: 'Momento de escuta sensível e acolhimento da fala da criança' },
  { id: 'MEDIACAO', label: 'Mediação', emoji: '🤝', desc: 'Intervenção pedagógica que amplia a experiência da criança' },
  { id: 'PROVOCACAO', label: 'Provocação', emoji: '💡', desc: 'Questionamento ou situação que instiga curiosidade e pensamento' },
  { id: 'ACOLHIMENTO', label: 'Acolhimento', emoji: '💚', desc: 'Gesto de cuidado, afeto e suporte emocional' },
  { id: 'OBSERVACAO', label: 'Observação', emoji: '👁️', desc: 'Registro de comportamento, aprendizagem ou interação observada' },
  { id: 'ENCORAJAMENTO', label: 'Encorajamento', emoji: '⭐', desc: 'Incentivo à autonomia, persistência e autoconfiança' },
  { id: 'DOCUMENTACAO', label: 'Documentação', emoji: '📸', desc: 'Registro fotográfico ou escrito de momento significativo' },
  { id: 'INTENCIONALIDADE', label: 'Intencionalidade', emoji: '🎯', desc: 'Ação pedagógica intencional vinculada ao planejamento' },
];

const CAMPOS_EXPERIENCIA = [
  { id: 'eu-outro-nos', label: 'O eu, o outro e o nós', emoji: '🤝' },
  { id: 'corpo-gestos', label: 'Corpo, gestos e movimentos', emoji: '🏃' },
  { id: 'tracos-sons', label: 'Traços, sons, cores e formas', emoji: '🎨' },
  { id: 'escuta-fala', label: 'Escuta, fala, pensamento e imaginação', emoji: '💬' },
  { id: 'espacos-tempos', label: 'Espaços, tempos, quantidades e relações', emoji: '🌍' },
];

// ─── Clima Emocional da Turma ─────────────────────────────────────────────────
const CLIMAS = [
  { id: 'MUITO_BOM', label: 'Muito Bom', emoji: '☀️', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'BOM', label: 'Bom', emoji: '🌤️', cor: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'REGULAR', label: 'Regular', emoji: '⛅', cor: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'AGITADO', label: 'Agitado', emoji: '🌩️', cor: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'DIFICIL', label: 'Difícil', emoji: '🌧️', cor: 'bg-gray-100 text-gray-600 border-gray-300' },
];

// ─── Rotina Padrão ────────────────────────────────────────────────────────────
const ROTINA_PADRAO = [
  { momento: 'Acolhida', descricao: 'Recepção das crianças, roda de conversa inicial', concluido: false },
  { momento: 'Roda de Conversa', descricao: 'Calendário, tempo, novidades, planejamento do dia', concluido: false },
  { momento: 'Atividade Dirigida', descricao: 'Atividade pedagógica intencional', concluido: false },
  { momento: 'Brincadeira Livre', descricao: 'Exploração autônoma de brinquedos e espaços', concluido: false },
  { momento: 'Higiene', descricao: 'Lavagem das mãos, troca de fraldas/banheiro', concluido: false },
  { momento: 'Refeição', descricao: 'Lanche ou almoço com autonomia e socialização', concluido: false },
  { momento: 'Repouso', descricao: 'Momento de descanso e relaxamento', concluido: false },
  { momento: 'Atividade Complementar', descricao: 'Arte, música, movimento ou exploração externa', concluido: false },
  { momento: 'Roda de Encerramento', descricao: 'Revisão do dia, combinados, despedida', concluido: false },
];

function pickPlanningText(source: Record<string, any> | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

function pickPlanningList(source: Record<string, any> | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (Array.isArray(value) && value.length > 0) {
      return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
  }
  return [] as string[];
}

function parsePlanningPayload(value: unknown) {
  if (!value) return {} as Record<string, any>;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, any>;
    } catch {
      return {} as Record<string, any>;
    }
  }
  return typeof value === 'object' ? value as Record<string, any> : {} as Record<string, any>;
}

function normalizePlanningObjectives(raw: unknown) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [] as any[];
}

function summarizePlanningObservation(planningTitle: string | undefined, observation: string) {
  const texto = observation.trim();
  if (!texto) return '';
  return planningTitle ? `${planningTitle}: ${texto}` : texto;
}

function resetObsFormState() {
  return {
    category: 'GERAL',
    date: getPedagogicalToday(),
    behaviorDescription: '',
    socialInteraction: '',
    emotionalState: '',
    dietaryNotes: '',
    sleepPattern: '',
    learningProgress: '',
    planningParticipation: '',
    psychologicalNotes: '',
    developmentAlerts: '',
    recommendations: '',
    observacaoPersonalizada: '',
  };
}

const CATEGORIA_AVALIACAO_PLANO = 'AVALIACAO_PLANO';

function getInitialDiaryForm(dateFromQuery?: string) {
  return {
    date: dateFromQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateFromQuery) ? dateFromQuery : getPedagogicalToday(),
    climaEmocional: 'BOM',
    acolhidaInicial: '',
    momentoDestaque: '',
    reflexaoPedagogica: '',
    encaminhamentos: '',
    presencas: 0,
    ausencias: 0,
    rotina: ROTINA_PADRAO.map(r => ({ ...r })),
    microgestos: [] as Microgesto[],
    criancasPresentes: [] as string[],
    execucaoPlanejamento: '',
    reacaoCriancas: '',
    adaptacoesRealizadas: '',
    ocorrencias: '',
    statusExecucaoPlano: '' as 'FEITO' | 'PARCIAL' | 'NAO_REALIZADO' | '',
    materiaisUtilizados: '',
    objetivoAtingido: '' as 'SIM' | 'PARCIAL' | 'NAO' | '',
    oQueFuncionou: '',
    oQueNaoFuncionou: '',
  };
}

function getInitialAvaliacaoIndividualForm() {
  return {
    childIds: [] as string[],
    observacao: '',
  };
}

function getInitialPlanningObservationForm(date: string) {
  return {
    category: CATEGORIA_AVALIACAO_PLANO,
    date,
    behaviorDescription: '',
    socialInteraction: '',
    emotionalState: '',
    dietaryNotes: '',
    sleepPattern: '',
    learningProgress: '',
    planningParticipation: '',
    psychologicalNotes: '',
    developmentAlerts: '',
    recommendations: '',
    observacaoPersonalizada: '',
  };
}

function getPlanningObservationPreview(planningTitle: string | undefined, observation: string) {
  const resumo = summarizePlanningObservation(planningTitle, observation);
  return resumo.length > 180 ? `${resumo.slice(0, 177)}...` : resumo;
}

function getCriancaNome(crianca?: Crianca) {
  if (!crianca) return 'Criança';
  return `${crianca.firstName} ${crianca.lastName}`.trim();
}

function getPlanningStatusLabel(status?: string) {
  return status === 'EM_EXECUCAO' ? '▶ Em Execução' : '✓ Aprovado';
}

function getPlanningSectionTitle() {
  return 'Plano de Aula do Dia';
}

function getPlanningEmptyText() {
  return 'Nenhum planejamento aprovado para hoje. Registre o diário livremente.';
}

function getObjectiveCardFields(obj: Record<string, any>) {
  return {
    camposExperiencia: pickPlanningList(obj, 'camposExperiencia'),
    campoExperiencia: pickPlanningText(obj, 'campoExperiencia'),
    objetivoBNCC: pickPlanningText(obj, 'objetivoBNCC'),
    objetivoCurriculo: pickPlanningText(obj, 'objetivoCurriculo'),
    intencionalidade: pickPlanningText(obj, 'intencionalidadePedagogica', 'intencionalidade'),
  };
}

function hasObjectiveCardContent(fields: ReturnType<typeof getObjectiveCardFields>, atividade?: string, recursos?: string) {
  return Boolean(
    fields.camposExperiencia.length
    || fields.campoExperiencia
    || fields.objetivoBNCC
    || fields.objetivoCurriculo
    || fields.intencionalidade
    || atividade
    || recursos,
  );
}

function getPlanningObservationTitle(totalSelecionadas: number) {
  return totalSelecionadas > 1 ? 'Salvar observações individuais' : 'Salvar observação individual';
}

function getPlanningObservationSuccess(totalSelecionadas: number) {
  return totalSelecionadas > 1
    ? 'Observações individuais salvas com sucesso!'
    : 'Observação individual salva com sucesso!';
}

function getPlanningObservationError() {
  return 'Erro ao salvar observação individual';
}

function getAcolhidaPlaceholder() {
  return 'Registre rapidamente como a turma chegou, como foi o acolhimento inicial e qualquer ocorrência breve do começo do dia.';
}

function getAvaliacaoPlaceholder() {
  return 'Ex.: participou com curiosidade, precisou de mediação para retomar a proposta, demonstrou dificuldade de concentração, reagiu com entusiasmo à atividade.';
}

function getExecucaoPlaceholder(statusExecucaoPlano: 'FEITO' | 'PARCIAL' | 'NAO_REALIZADO' | '') {
  if (statusExecucaoPlano === 'NAO_REALIZADO') {
    return 'Explique brevemente o que impediu a execução do plano.';
  }
  if (statusExecucaoPlano === 'PARCIAL') {
    return 'Explique brevemente o que foi realizado e o que ficou pendente.';
  }
  return 'Descreva o que foi executado no plano, como aconteceu a proposta e quais encaminhamentos pedagógicos foram feitos.';
}

function getExecucaoLabel(statusExecucaoPlano: 'FEITO' | 'PARCIAL' | 'NAO_REALIZADO' | '') {
  if (statusExecucaoPlano === 'NAO_REALIZADO') {
    return 'Motivo da não realização';
  }
  if (statusExecucaoPlano === 'PARCIAL') {
    return 'Justificativa da execução parcial';
  }
  return 'O que foi executado?';
}

function getExecucaoHint(statusExecucaoPlano: 'FEITO' | 'PARCIAL' | 'NAO_REALIZADO' | '') {
  if (statusExecucaoPlano === 'PARCIAL' || statusExecucaoPlano === 'NAO_REALIZADO') {
    return '(obrigatório nesta situação)';
  }
  return '(obrigatório quando houver plano do dia)';
}

function getAvaliacaoIntro() {
  return 'Faça a leitura pedagógica do dia e registre observações individuais breves por criança, sem escrever diretamente em RDIC.';
}

function getAvaliacaoIndividualHelper() {
  return 'Use este registro curto para comportamento, reação, necessidade de retomada ou qualquer observação relevante do aluno em relação ao plano/aula.';
}

function getChamadaManualHelper(chamadaCarregada: boolean) {
  return chamadaCarregada
    ? 'Chamada importada da lista de presença'
    : 'A chamada oficial ainda não foi realizada. Pode ajustar manualmente, mas o ideal é registrar a chamada antes.';
}

function getFechamentoTitle() {
  return 'Fechamento Geral do Dia';
}

function getAcolhidaTitle() {
  return 'Chamada + Acolhida';
}

function getChamadaTitle() {
  return 'Chamada / Presença';
}

function getExecucaoTitle() {
  return 'Execução do Plano';
}

function getAvaliacaoTitle() {
  return 'Avaliação do Plano de Aula';
}

// ─── Seletor de Criança por Foto ──────────────────────────────────────────────
function SeletorCrianca({
  criancas,
  selecionadas,
  onToggle,
  multiplo = false,
  label = 'Criança(s) envolvida(s)',
}: {
  criancas: Crianca[];
  selecionadas: string[];
  onToggle: (id: string) => void;
  multiplo?: boolean;
  label?: string;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-gray-700 mb-2 block">{label} (opcional)</Label>
      {criancas.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Nenhuma criança cadastrada na turma</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {criancas.map(c => {
            const sel = selecionadas.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${sel ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-300'}`}
                title={`${c.firstName} ${c.lastName}`}
              >
                <ChildAvatar
                  child={c}
                  alt={c.firstName}
                  sizeClassName="w-10 h-10"
                  imageClassName="rounded-full object-cover border-2 border-white shadow"
                  fallbackClassName="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-white shadow"
                  iconClassName="w-6 h-6 text-blue-400"
                />
                <span className={`text-xs font-medium leading-tight text-center max-w-[60px] truncate ${sel ? 'text-blue-700' : 'text-gray-600'}`}>
                  {c.firstName}
                </span>
                {sel && <span className="text-blue-500 text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
      {!multiplo && selecionadas.length > 0 && (
        <button
          type="button"
          onClick={() => onToggle(selecionadas[0])}
          className="mt-1 text-xs text-gray-400 hover:text-red-400 flex items-center gap-1"
        >
          <X className="h-3 w-3" /> Remover seleção
        </button>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────────────
export default function DiarioBordoPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const roles = normalizeRoles(user);
  const isDeveloper = roles.includes('DEVELOPER');
  const currentUserId = (user as any)?.id ?? (user as any)?.sub ?? '';
  const [aba, setAba] = useState<'lista' | 'novo' | 'microgestos' | 'observacoes' | 'ocorrencias'>('lista');
  const [diarios, setDiarios] = useState<DiaryEntry[]>([]);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const classroomIdFromQuery = searchParams.get('classroomId') ?? undefined;
  const childIdFromQuery = searchParams.get('childId') ?? undefined;
  const dateFromQuery = searchParams.get('date') ?? undefined;

  // Formulário do Diário
  const [form, setForm] = useState(() => getInitialDiaryForm(dateFromQuery));
  // Formulário de microgesto
  const [microgestoForm, setMicrogestoForm] = useState({
    tipos: ['ESCUTA'] as string[],
    descricao: '',
    campo: 'eu-outro-nos',
    horario: '',
    criancasSelecionadas: [] as string[],
  });

  // Dados da turma e professor
  const [classroomId, setClassroomId] = useState<string | undefined>();
  const [childId, setChildId] = useState<string | undefined>();
  // FIX P0: estado de loading/erro da turma para evitar spinner infinito
  const [loadingTurma, setLoadingTurma] = useState(true);
  const [turmaErro, setTurmaErro] = useState<string | null>(null);
  const [savingMicrogesto, setSavingMicrogesto] = useState(false);
  // Chamada do dia pré-carregada para preencher presenças automaticamente
  const [chamadaCarregada, setChamadaCarregada] = useState(false);
  const [chamadaInfo, setChamadaInfo] = useState<{ presentes: number; ausentes: number; total: number } | null>(null);
  // Planejamento aprovado do dia
  const [planejamentoHoje, setPlanejamentoHoje] = useState<{
    id: string;
    title: string;
    objectives?: string;
    activities?: string;
    status: string;
    // G3 FIX: campos da matriz pedagógica 2026
    camposExperiencia?: string[];
    objetivosMatriz?: Array<Record<string, any>>;
    intencionalidadeGeral?: string;
    recursos?: string;
    // Vínculo com matriz curricular — necessário para registrar ocorrências
    curriculumMatrixId?: string;
    curriculumEntryId?: string; // entrada da matriz para o dia de hoje
  } | null>(null);

  // Ocorrências
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loadingOcorr, setLoadingOcorr] = useState(false);
  const [savingOcorr, setSavingOcorr] = useState(false);
  const [criancaSelecionadaOcorr, setCriancaSelecionadaOcorr] = useState<string>('');
  const [ocorrForm, setOcorrForm] = useState({
    categoria: 'COMPORTAMENTO',
    descricao: '',
    eventDate: getPedagogicalToday(),
    fotos: [] as string[], // preview URLs (object URLs) — não enviados no JSON
    fotosFiles: [] as File[], // arquivos originais para upload multipart
  });
  const [uploadingFoto, setUploadingFoto] = useState(false);
  // Editar/Excluir ocorrências
  const [ocorrenciaEditando, setOcorrenciaEditando] = useState<Ocorrencia | null>(null);
  const [editForm, setEditForm] = useState({ categoria: 'COMPORTAMENTO', descricao: '', eventDate: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  // Observações individuais
  const [observacoes, setObservacoes] = useState<ObservacaoIndividual[]>([]);
  const [loadingObs, setLoadingObs] = useState(false);
  const [savingObs, setSavingObs] = useState(false);
  const [criancaSelecionadaObs, setCriancaSelecionadaObs] = useState<string>('');
  const [obsForm, setObsForm] = useState(() => resetObsFormState());
  const [avaliacaoIndividualForm, setAvaliacaoIndividualForm] = useState(() => getInitialAvaliacaoIndividualForm());
  const [savingAvaliacaoIndividual, setSavingAvaliacaoIndividual] = useState(false);

  useEffect(() => {
    loadDiarios();
    loadTurmaECriancas();
  }, []);

  useEffect(() => {
    if (dateFromQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateFromQuery)) {
      setForm(f => (f.date === dateFromQuery ? f : { ...f, date: dateFromQuery }));
    }
  }, [dateFromQuery]);

  // BUG D FIX: Carregar observações quando o usuário navega para a aba de observações.
  // O problema anterior: loadObservacoes era chamado apenas no click de uma criança,
  // mas criancas[] pode estar vazio se classroomId ainda não foi resolvido.
  // Agora: quando a aba muda para 'observacoes' e classroomId já está disponível,
  // carregamos todas as observações da turma para exibir o histórico.
  useEffect(() => {
    if (aba === 'observacoes' && classroomId) {
      loadObservacoes();
    }
  }, [aba, classroomId]);

  useEffect(() => {
    // Carregar ocorrências ao entrar na aba.
    // Aguardar classroomId ser resolvido por loadTurmaECriancas antes de buscar,
    // garantindo que o backend filtre pelo escopo correto da turma do professor.
    // Se classroomId ainda não está disponível, o loadingTurma ainda está em andamento
    // e o useEffect será re-executado quando classroomId for definido.
    if (aba === 'ocorrencias' && !loadingTurma) {
      loadOcorrencias();
    }
  }, [aba, classroomId, loadingTurma]);

  async function loadOcorrencias(childIdParam?: string) {
    setLoadingOcorr(true);
    try {
      const params: Record<string, string> = { limit: '100', tag: 'ocorrencia' };
      if (childIdParam) params.childId = childIdParam;
      if (classroomId) params.classroomId = classroomId;
      const res = await http.get('/diary-events', { params });
      const lista = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      // O servidor já filtra por tag=ocorrencia; mapear diretamente
      const ocorr = lista;
      setOcorrencias(ocorr.map((e: any) => ({
        id: e.id,
        childId: e.childId,
        classroomId: e.classroomId,
        categoria: e.aiContext?.categoria ?? e.type ?? 'OUTRO',
        descricao: e.description ?? e.behaviorNotes ?? '',
        mediaUrls: Array.isArray(e.mediaUrls) ? e.mediaUrls : [],
        eventDate: e.eventDate ?? e.createdAt,
        createdAt: e.createdAt,
        createdBy: e.createdBy,
        child: e.child,
      })));
    } catch {
      setOcorrencias([]);
    } finally {
      setLoadingOcorr(false);
    }
  }

  // ── Editar ocorrência (professor edita a própria; DEVELOPER edita qualquer) ─────────────────────────────────────────────────────────────
  function abrirEdicao(ocorr: Ocorrencia) {
    setOcorrenciaEditando(ocorr);
    setEditForm({
      categoria: ocorr.categoria,
      descricao: ocorr.descricao,
      eventDate: ocorr.eventDate?.split('T')[0] ?? getPedagogicalToday(),
    });
  }

  async function salvarEdicaoOcorrencia() {
    if (!ocorrenciaEditando?.id) return;
    if (!editForm.descricao.trim()) { toast.error('Descreva a ocorrência'); return; }
    setSavingEdit(true);
    try {
      const catLabel = CATEGORIAS_OCORRENCIA.find(c => c.id === editForm.categoria)?.label ?? editForm.categoria;
      await http.patch(`/diary-events/${ocorrenciaEditando.id}`, {
        title: `Ocorrência: ${catLabel}`,
        description: editForm.descricao,
        eventDate: editForm.eventDate + 'T12:00:00.000Z',
        aiContext: { categoria: editForm.categoria, categoriaLabel: catLabel },
        tags: ['ocorrencia', editForm.categoria.toLowerCase()],
      });
      toast.success('Ocorrência atualizada!');
      setOcorrenciaEditando(null);
      loadOcorrencias();
    } catch (err: any) {
      toast.error(extractErrorMessage(err, 'Erro ao editar ocorrência'));
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Excluir ocorrência (professor exclui a própria; DEVELOPER exclui qualquer) ─────────────────────────────────────────────────────────────
  async function excluirOcorrencia(ocorr: Ocorrencia) {
    if (!ocorr.id) return;
    const canDelete = isDeveloper || ocorr.createdBy === currentUserId;
    if (!canDelete) { toast.error('Sem permissão para excluir esta ocorrência'); return; }
    if (!window.confirm(`Excluir a ocorrência de ${ocorr.child?.firstName ?? 'criança'}? Esta ação não pode ser desfeita.`)) return;
    setExcluindoId(ocorr.id);
    try {
      await http.delete(`/diary-events/${ocorr.id}`);
      toast.success('Ocorrência excluída');
      setOcorrencias(prev => prev.filter(o => o.id !== ocorr.id));
    } catch (err: any) {
      toast.error(extractErrorMessage(err, 'Erro ao excluir ocorrência'));
    } finally {
      setExcluindoId(null);
    }
  }

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 5 MB)'); return; }
    // Usar object URL apenas para preview — não converte para base64
    const previewUrl = URL.createObjectURL(file);
    setOcorrForm(f => ({ ...f, fotos: [...f.fotos, previewUrl], fotosFiles: [...f.fotosFiles, file] }));
    e.target.value = '';
  }

  async function salvarOcorrencia() {
    if (!criancaSelecionadaOcorr) { toast.error('Selecione uma criança'); return; }
    if (!ocorrForm.descricao.trim()) { toast.error('Descreva a ocorrência'); return; }
    setSavingOcorr(true);
    try {
      // Resolver classroomId: usar o do estado ou buscar a primeira turma acessível
      let resolvedClassroomId = classroomId;
      if (!resolvedClassroomId) {
        try {
          const turmasRes = await http.get('/lookup/classrooms/accessible');
          const turmas: { id: string }[] = Array.isArray(turmasRes.data) ? turmasRes.data : [];
          if (turmas.length > 0) {
            resolvedClassroomId = turmas[0].id;
            setClassroomId(resolvedClassroomId);
          }
        } catch { /* continua sem classroomId */ }
      }

      const catLabel = CATEGORIAS_OCORRENCIA.find(c => c.id === ocorrForm.categoria)?.label ?? ocorrForm.categoria;
      // 1) Criar evento SEM base64 no JSON (resolve 413)
      // planningId e curriculumEntryId são opcionais — só incluir se existirem
      const payload: Record<string, any> = {
        type: 'OBSERVACAO',
        title: `Ocorrência: ${catLabel}`,
        description: ocorrForm.descricao,
        eventDate: (ocorrForm.eventDate || getPedagogicalToday()) + 'T12:00:00.000Z',
        childId: criancaSelecionadaOcorr,
        behaviorNotes: ocorrForm.descricao,
        mediaUrls: [],
        tags: ['ocorrencia', ocorrForm.categoria.toLowerCase()],
        aiContext: { categoria: ocorrForm.categoria, categoriaLabel: catLabel },
      };
      // classroomId é opcional no backend — incluir apenas se resolvido
      if (resolvedClassroomId) payload.classroomId = resolvedClassroomId;
      if (planejamentoHoje?.id) payload.planningId = planejamentoHoje.id;
      if (planejamentoHoje?.curriculumEntryId) payload.curriculumEntryId = planejamentoHoje.curriculumEntryId;

      const res = await http.post('/diary-events', payload);
      const eventoId: string = res.data?.id;

      // 2) Upload das fotos via multipart (sem base64 no payload)
      if (eventoId && ocorrForm.fotosFiles.length > 0) {
        for (const file of ocorrForm.fotosFiles) {
          const fd = new FormData();
          fd.append('file', file);
          await http.post(`/diary-events/${eventoId}/media`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }
      toast.success('Ocorrência registrada com sucesso!');
      ocorrForm.fotos.forEach(url => { try { URL.revokeObjectURL(url); } catch {} });
      setOcorrForm({ categoria: 'COMPORTAMENTO', descricao: '', eventDate: getPedagogicalToday(), fotos: [], fotosFiles: [] });
      setCriancaSelecionadaOcorr('');
      loadOcorrencias();
    } catch (err: any) {
      toast.error(extractErrorMessage(err, 'Erro ao salvar ocorrência'));
    } finally {
      setSavingOcorr(false);
    }
  }

  async function loadObservacoes(childIdParam?: string) {
    setLoadingObs(true);
    try {
      // BUG D FIX: Sempre incluir classroomId para garantir escopo correto.
      // childIdParam filtra por criança específica; sem ele, retorna todas da turma.
      const params: Record<string, string> = {};
      if (childIdParam) params.childId = childIdParam;
      // Usar classroomId do estado (já resolvido assincronamente por loadTurmaECriancas)
      const cid = classroomId;
      if (cid) params.classroomId = cid;
      if (!childIdParam && !cid) {
        // Sem contexto de turma ainda — aguardar
        setObservacoes([]);
        return;
      }
      const res = await http.get('/development-observations', { params });
      setObservacoes(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch {
      setObservacoes([]);
    } finally {
      setLoadingObs(false);
    }
  }

  async function salvarObservacao() {
    if (!criancaSelecionadaObs) { toast.error('Selecione uma criança'); return; }
    setSavingObs(true);
    try {
      // FIX 5: mapear observacaoPersonalizada para campo 'interests' (campo livre no schema)
      const { observacaoPersonalizada, ...obsFormRest } = obsForm;
      await http.post('/development-observations', {
        childId: criancaSelecionadaObs,
        classroomId,
        ...obsFormRest,
        date: obsForm.date + 'T12:00:00.000Z',
        ...(observacaoPersonalizada.trim() ? { interests: observacaoPersonalizada } : {}),
      });
      toast.success('Observação salva com sucesso!');
      setObsForm(resetObsFormState());
      setCriancaSelecionadaObs('');
      loadObservacoes();
    } catch (err: any) {
      toast.error(extractErrorMessage(err, 'Erro ao salvar observação'));
    } finally {
      setSavingObs(false);
    }
  }

  function toggleCriancaAvaliacaoIndividual(id: string) {
    setAvaliacaoIndividualForm(f => ({
      ...f,
      childIds: f.childIds.includes(id)
        ? f.childIds.filter(childIdSelecionado => childIdSelecionado !== id)
        : [...f.childIds, id],
    }));
  }

  async function salvarAvaliacaoIndividual() {
    if (avaliacaoIndividualForm.childIds.length === 0) {
      toast.error('Selecione pelo menos uma criança');
      return;
    }
    if (!avaliacaoIndividualForm.observacao.trim()) {
      toast.error('Escreva uma observação individual breve');
      return;
    }
    if (!classroomId) {
      toast.error('Turma não identificada. Recarregue a página e tente novamente.');
      return;
    }

    setSavingAvaliacaoIndividual(true);
    try {
      const payloadBase = getInitialPlanningObservationForm(form.date);
      const observacao = avaliacaoIndividualForm.observacao.trim();
      const resumoPlano = summarizePlanningObservation(planejamentoHoje?.title, observacao);

      await Promise.all(
        avaliacaoIndividualForm.childIds.map(childIdSelecionado =>
          http.post('/development-observations', {
            ...payloadBase,
            childId: childIdSelecionado,
            classroomId,
            date: `${form.date}T12:00:00.000Z`,
            behaviorDescription: observacao,
            planningParticipation: resumoPlano,
            ...(form.reflexaoPedagogica.trim() ? { recommendations: form.reflexaoPedagogica.trim() } : {}),
          })
        )
      );

      toast.success(getPlanningObservationSuccess(avaliacaoIndividualForm.childIds.length));
      setAvaliacaoIndividualForm(getInitialAvaliacaoIndividualForm());
      if (aba === 'observacoes') loadObservacoes();
    } catch (err: any) {
      toast.error(extractErrorMessage(err, getPlanningObservationError()));
    } finally {
      setSavingAvaliacaoIndividual(false);
    }
  }

  async function loadTurmaECriancas() {
    setLoadingTurma(true);
    setTurmaErro(null);
    try {
      // Usa o endpoint de lookup que retorna turmas acessíveis ao professor
      const turmasRes = await http.get('/lookup/classrooms/accessible');
      const turmas: { id: string; name: string }[] = Array.isArray(turmasRes.data) ? turmasRes.data : [];
      if (turmas.length === 0) {
        // FIX P0: não deixar spinner infinito — mostrar mensagem clara
        setTurmaErro('Você não tem turma vinculada. Fale com a coordenação.');
        setLoadingTurma(false);
        return;
      }
      const turmaInicial = classroomIdFromQuery
        ? turmas.find(t => t.id === classroomIdFromQuery) ?? turmas[0]
        : turmas[0];
      const cid = turmaInicial.id;
      setClassroomId(cid);

      // Buscar crianças matriculadas na turma
      let lista: Crianca[] = [];
      try {
        const criancasRes = await http.get('/lookup/children/accessible', { params: { classroomId: cid } });
        lista = Array.isArray(criancasRes.data) ? criancasRes.data : [];
        setCriancas(lista);
        if (lista.length > 0) {
          const childInicial = childIdFromQuery
            ? (lista.find(c => c.id === childIdFromQuery)?.id ?? lista[0].id)
            : lista[0].id;
          setChildId(childInicial);
        }
      } catch {
        setCriancas([]);
      }

      // Pré-carregar chamada do dia para preencher presenças automaticamente
      // Usa data local para evitar bug de timezone servidor UTC vs cliente GMT-3
      try {
        const dateBase = dateFromQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateFromQuery) ? dateFromQuery : form.date;
        const dateISO = /^\d{4}-\d{2}-\d{2}$/.test(dateBase)
          ? dateBase
          : (() => {
              const d = new Date();
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              return `${y}-${m}-${dd}`;
            })();
        const chamadaRes = await http.get('/attendance/today', { params: { classroomId: cid, date: dateISO } });
        const chamadaData = chamadaRes.data;
        // BUG B FIX: Usar os totais exatos retornados pelo backend (presentes, ausentes, justificados).
        // Não recalcular localmente — evita divergência entre chamada e diário.
        // Preencher mesmo quando não há presentes (ex: todos ausentes), desde que haja registros.
        if (chamadaData?.alunos && chamadaData.alunos.length > 0 && chamadaData.registrados > 0) {
          const presentesIds: string[] = chamadaData.alunos
            .filter((a: any) => a.status === 'PRESENTE')
            .map((a: any) => a.id);
          setForm(f => ({ ...f, criancasPresentes: presentesIds }));
          setChamadaCarregada(true);
          // Usar exatamente os valores do backend — fonte única de verdade
          setChamadaInfo({
            presentes: chamadaData.presentes,
            ausentes: chamadaData.ausentes,
            total: chamadaData.totalAlunos,
          });

          // Sincronizar lista de crianças com a chamada importada (evita denominador incorreto na UI)
          const criancasFromChamada: Crianca[] = chamadaData.alunos.map((a: any) => {
            const nome = String(a.nome ?? '').trim();
            const parts = nome.split(/\s+/).filter(Boolean);
            const firstName = parts[0] ?? nome ?? 'Criança';
            const lastName = parts.slice(1).join(' ');
            return {
              id: a.id,
              firstName,
              lastName,
              photoUrl: a.photoUrl ?? a.fotoUrl ?? a.photo_url ?? undefined,
              allergies: null,
              medicalConditions: null,
            };
          });

          if (criancasFromChamada.length > 0) {
            setCriancas(criancasFromChamada);
            setChildId(criancasFromChamada[0].id);
          }
        }
      } catch {
        // Chamada ainda não feita — não é erro, apenas não pré-preenche
      }

      // Buscar planejamento ativo do dia via endpoint dedicado (timezone-safe)
      // Usa getPedagogicalToday() para garantir data correta em America/Sao_Paulo
      try {
        const planDate = dateFromQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateFromQuery) ? dateFromQuery : form.date;
        const activePlanRes = await http.get('/plannings/active-today', {
          params: { classroomId: cid, date: planDate },
        });
        const activePlan = activePlanRes.data;
        if (activePlan?.hasActivePlanning && activePlan.planningId) {
          // Buscar detalhes completos do planning para exibição no painel
          let objectives = '';
          let activities = '';
          let camposExperiencia: string[] = [];
          let objetivosMatriz: Array<Record<string, any>> = [];
          let intencionalidadeGeral = '';
          let recursos = '';
          try {
            const detailRes = await http.get(`/plannings/${activePlan.planningId}`);
            const planHoje = detailRes.data;
            const pedagogicalContent = parsePlanningPayload(
              planHoje.pedagogicalContent
              ?? planHoje.description
              ?? planHoje.content,
            );
            const day0 = pedagogicalContent.days?.[0] ?? {};
            const parsedObjectives = normalizePlanningObjectives(
              day0.objectives
              ?? planHoje.objectives
              ?? pedagogicalContent.objectives,
            );

            objectives = pickPlanningText(
              day0,
              'objetivoCurriculo',
              'objetivoCurriculoDF',
            ) || pickPlanningText(
              pedagogicalContent,
              'objetivoCurriculo',
              'curriculumAlignment',
            ) || pickPlanningText(planHoje, 'curriculumAlignment');
            activities = pickPlanningText(
              day0.teacher,
              'atividade',
            ) || pickPlanningText(
              pedagogicalContent,
              'activities',
              'atividade',
            ) || pickPlanningText(planHoje, 'activities');
            camposExperiencia = pickPlanningList(pedagogicalContent, 'camposExperiencia');
            if (camposExperiencia.length === 0) {
              camposExperiencia = parsedObjectives
                .flatMap(obj => pickPlanningList(obj, 'camposExperiencia'))
                .concat(parsedObjectives.map(obj => pickPlanningText(obj, 'campoExperiencia')).filter(Boolean))
                .filter((campo, index, arr) => arr.indexOf(campo) === index);
            }
            if (camposExperiencia.length === 0) {
              const campoPrincipal = pickPlanningText(day0, 'campoExperiencia')
                || pickPlanningText(pedagogicalContent, 'campoDeExperiencia', 'campoExperiencia');
              camposExperiencia = campoPrincipal ? [campoPrincipal] : [];
            }
            objetivosMatriz = normalizePlanningObjectives(parsedObjectives);
            intencionalidadeGeral = pickPlanningText(
              pedagogicalContent,
              'intencionalidadePedagogica',
              'intencionalidade',
            ) || parsedObjectives
              .map(obj => pickPlanningText(obj, 'intencionalidadePedagogica', 'intencionalidade'))
              .find(Boolean) || '';
            recursos = pickPlanningText(
              day0.teacher,
              'recursos',
            ) || pickPlanningText(
              pedagogicalContent,
              'materials',
              'resources',
              'recursos',
            ) || pickPlanningText(planHoje, 'resources');
          } catch {
            // Detalhes não críticos — continua com dados básicos
          }
          setPlanejamentoHoje({
            id: activePlan.planningId,
            title: activePlan.title || 'Planejamento do Dia',
            objectives,
            activities,
            status: activePlan.status ?? 'EM_EXECUCAO',
            camposExperiencia,
            objetivosMatriz,
            intencionalidadeGeral,
            recursos,
            curriculumMatrixId: undefined,
            // curriculumEntryId vem do endpoint active-today (opcional — não bloqueia o botão)
            curriculumEntryId: activePlan.curriculumEntryId,
          });
        }
      } catch {
        // Sem planejamento para hoje — não é erro
      }
    } catch {
      // FIX P0: erro ao buscar turmas — mostrar mensagem clara em vez de spinner infinito
      setTurmaErro('Não foi possível carregar a turma. Recarregue a página.');
    } finally {
      setLoadingTurma(false);
    }
  }

  async function loadDiarios() {
    setLoading(true);
    try {
      const res = await http.get('/diary-events?limit=50&type=ATIVIDADE_PEDAGOGICA');
      const d = res.data;
      const raw: any[] = Array.isArray(d) ? d : d?.data ?? [];
      // BUG B FIX: O modelo DiaryEvent não possui campos raiz presencas/ausencias.
      // Esses valores são persistidos dentro do campo JSONB aiContext.
      // Mapear aiContext para campos raiz para exibição consistente na lista.
      const mapped = raw.map((item: any) => {
        const ctx = item.aiContext && typeof item.aiContext === 'object' ? item.aiContext : {};
        return {
          ...item,
          presencas: item.presencas ?? ctx.presencas ?? ctx.presentes ?? 0,
          ausencias: item.ausencias ?? ctx.ausencias ?? ctx.ausentes ?? 0,
          climaEmocional: item.climaEmocional ?? ctx.climaEmocional ?? '',
          momentoDestaque: item.momentoDestaque ?? ctx.momentoDestaque ?? item.description ?? '',
          reflexaoPedagogica: item.reflexaoPedagogica ?? ctx.reflexaoPedagogica ?? item.developmentNotes ?? '',
          rotina: item.rotina ?? ctx.rotina ?? [],
          microgestos: item.microgestos ?? ctx.microgestos ?? [],
        };
      });
      setDiarios(mapped);
    } catch {
      // Tenta carregar do localStorage como fallback
      try {
        const local = JSON.parse(localStorage.getItem('diarios_bordo') || '[]');
        setDiarios(local);
      } catch { /* silencioso */ }
    } finally {
      setLoading(false);
    }
  }

  function toggleCriancaMicrogesto(id: string) {
    setMicrogestoForm(f => ({
      ...f,
      criancasSelecionadas: f.criancasSelecionadas.includes(id)
        ? f.criancasSelecionadas.filter(c => c !== id)
        : [...f.criancasSelecionadas, id],
    }));
  }

  function toggleCriancaPresente(id: string) {
    setForm(f => ({
      ...f,
      criancasPresentes: f.criancasPresentes.includes(id)
        ? f.criancasPresentes.filter(c => c !== id)
        : [...f.criancasPresentes, id],
    }));
  }

  const adicionarMicrogesto = useCallback(async () => {
    if (!microgestoForm.descricao.trim()) { toast.error('Descreva o microgesto'); return; }

    // Montar nomes e fotos das crianças selecionadas
    const criancasSel = criancas.filter(c => microgestoForm.criancasSelecionadas.includes(c.id));
    const criancaNome = criancasSel.map(c => c.firstName).join(', ');
    const criancaFoto = criancasSel[0]?.photoUrl;
    const criancaIdSel = criancasSel[0]?.id;

    // Criança é opcional — se não selecionada, registra sem vínculo a criança específica
    // Bloquear se não houver turma identificada
    if (!classroomId) {
      toast.error('Turma não identificada. Recarregue a página e tente novamente.');
      return;
    }

    setSavingMicrogesto(true);
    try {
      // Todos os tipos pedagógicos (ESCUTA, MEDIACAO, etc.) são salvos como OBSERVACAO no backend
      const kind: MicrogestureKind = 'OBSERVACAO';

      const horarioInfo = microgestoForm.horario ? ` [${microgestoForm.horario}]` : '';
      const campoInfo = microgestoForm.campo ? ` | Campo: ${microgestoForm.campo}` : '';
      const tiposLabels = microgestoForm.tipos
        .map(t => TIPOS_MICROGESTO.find(x => x.id === t)?.label ?? t)
        .join(' + ');
      const textoPayload = `[${tiposLabels}]${horarioInfo}${campoInfo} — ${microgestoForm.descricao}`;

      if (criancasSel.length > 0) {
        // Registrar um evento por criança selecionada (múltiplos alunos suportados)
        await Promise.all(
          criancasSel.map(c =>
            createMicrogestureEvent({
              childId: c.id,
              classroomId,
              kind,
              payload: { texto: textoPayload },
              eventDate: new Date().toISOString(),
            })
          )
        );
      }
      // Se nenhuma criança selecionada: microgesto é adicionado apenas localmente
      // (backend exige childId, então não persiste no servidor)

      // Adicionar ao estado local para exibição imediata na lista do diário
      const tiposLabels2 = microgestoForm.tipos
        .map(t => TIPOS_MICROGESTO.find(x => x.id === t)?.label ?? t)
        .join(' + ');
      const novo: Microgesto = {
        id: Date.now().toString(),
        tipo: tiposLabels2,
        descricao: microgestoForm.descricao,
        campo: microgestoForm.campo,
        horario: microgestoForm.horario,
        criancaId: criancaIdSel,
        criancaNome: criancaNome || undefined,
        criancaFoto: criancaFoto,
      };
      setForm(f => ({ ...f, microgestos: [...f.microgestos, novo] }));
      setMicrogestoForm({ tipos: ['ESCUTA'], descricao: '', campo: 'eu-outro-nos', horario: '', criancasSelecionadas: [] });
      toast.success('Registrado com sucesso!');
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(extractErrorMessage(e, 'Erro ao salvar microgesto'));
    } finally {
      setSavingMicrogesto(false);
    }
  }, [microgestoForm, criancas, classroomId]);

  function removerMicrogesto(id: string) {
    setForm(f => ({ ...f, microgestos: f.microgestos.filter(m => m.id !== id) }));
  }

  function toggleRotinaItem(idx: number) {
    setForm(f => ({
      ...f,
      rotina: f.rotina.map((r, i) => i === idx ? { ...r, concluido: !r.concluido } : r),
    }));
  }

  async function salvarDiario() {
    if (!chamadaCarregada) {
      toast.error('Realize a Chamada do Dia antes de abrir e salvar o Diário do Dia.');
      return;
    }
    if (!form.momentoDestaque.trim() && !form.reflexaoPedagogica.trim()) {
      toast.error('Preencha pelo menos o Momento de Destaque ou a Reflexão Pedagógica');
      return;
    }
    // EXECUÇÃO DO PLANEJAMENTO OBRIGATÓRIA:
    // Quando há planejamento aprovado/em execução vinculado ao dia,
    // o campo "O que foi executado?" é obrigatório.
    // Regra de negócio: o diário é o registro de execução do planejamento.
    if (planejamentoHoje && !form.execucaoPlanejamento.trim()) {
      toast.error('Existe um planejamento aprovado para hoje. Preencha o campo "O que foi executado?" antes de salvar o diário.');
      return;
    }
    if (planejamentoHoje && !form.statusExecucaoPlano) {
      toast.error('Seleccione o status de execução do plano do dia: CUMPRIDO, PARCIAL ou NÃO REALIZADO.');
      return;
    }
    if (!form.reflexaoPedagogica.trim()) {
      toast.error('Preencha a Avaliação do Plano de Aula antes de salvar.');
      return;
    }
    // BUG F FIX: Bloquear registro de diário em fins de semana (dias não letivos)
    const dataDiario = new Date(form.date + 'T12:00:00');
    const diaSemana = dataDiario.getDay(); // 0=Dom, 6=Sáb
    if (diaSemana === 0 || diaSemana === 6) {
      toast.error('Não é possível registrar o diário em fins de semana (dia não letivo).');
      return;
    }
    setSaving(true);
    try {
      // BUG B FIX: Usar totais exatos da chamada consolidada (fonte única de verdade).
      // Se a chamada foi carregada do backend, usar chamadaInfo (valores exatos do servidor).
      // Só recalcular localmente se a chamada não foi feita ainda.
      const presencasReais = chamadaCarregada && chamadaInfo
        ? chamadaInfo.presentes
        : (form.criancasPresentes.length > 0 ? form.criancasPresentes.length : form.presencas);
      const ausenciasReais = chamadaCarregada && chamadaInfo
        ? chamadaInfo.ausentes
        : (criancas.length > 0 ? criancas.length - presencasReais : form.ausencias);

      if (!classroomId || !childId) {
        // Modo offline/demo: salva localmente
        const localEntry = {
          id: Date.now().toString(),
          date: form.date,
          climaEmocional: form.climaEmocional,
          momentoDestaque: form.momentoDestaque,
          reflexaoPedagogica: form.reflexaoPedagogica,
          encaminhamentos: form.encaminhamentos,
          presencas: presencasReais,
          ausencias: ausenciasReais,
          rotina: form.rotina,
          microgestos: form.microgestos,
          status: 'LOCAL',
          createdAt: new Date().toISOString(),
        };
        const saved = JSON.parse(localStorage.getItem('diarios_bordo') || '[]');
        saved.unshift(localEntry);
        localStorage.setItem('diarios_bordo', JSON.stringify(saved.slice(0, 100)));
      } else {
        await http.post('/diary-events', {
          type: 'ATIVIDADE_PEDAGOGICA',
          title: form.momentoDestaque.substring(0, 100) || 'Diário de Bordo',
          description: form.reflexaoPedagogica || form.momentoDestaque || 'Diário de Bordo',
          eventDate: form.date + 'T12:00:00.000Z',
          childId,
          classroomId,
          // FIX: planningId undefined (não null) para evitar falha de validação CUID no DTO
          ...(planejamentoHoje?.id ? { planningId: planejamentoHoje.id } : {}),
          observations: form.encaminhamentos,
          developmentNotes: form.reflexaoPedagogica,
          microgestos: form.microgestos,
          tags: [form.climaEmocional],
          // BUG B FIX: Enviar presencas/ausencias como campos raiz do DTO
          // O service usa createDto.presencas ?? 0 (campo raiz), não aiContext.presencas
          presencas: presencasReais,
          ausencias: ausenciasReais,
          aiContext: {
            // BUG B FIX: Persistir totais exatos da chamada no aiContext (campo JSONB)
            presencas: presencasReais,
            ausencias: ausenciasReais,
            climaEmocional: form.climaEmocional,
            acolhidaInicial: form.acolhidaInicial,
            momentoDestaque: form.momentoDestaque,
            reflexaoPedagogica: form.reflexaoPedagogica,
            rotina: form.rotina,
            criancasPresentes: form.criancasPresentes,
            // BUG C FIX: Registrar execução do planejamento no diário
            planejamentoId: planejamentoHoje?.id ?? null,
            planejamentoTitulo: planejamentoHoje?.title ?? null,
            execucaoPlanejamento: form.execucaoPlanejamento,
            reacaoCriancas: form.reacaoCriancas,
            adaptacoesRealizadas: form.adaptacoesRealizadas,
            ocorrencias: form.ocorrencias,
            statusExecucaoPlano: form.statusExecucaoPlano || null,
            materiaisUtilizados: form.materiaisUtilizados || null,
            objetivoAtingido: form.objetivoAtingido || null,
            oQueFuncionou: form.oQueFuncionou || null,
            oQueNaoFuncionou: form.oQueNaoFuncionou || null,
          },
        });
      }
      toast.success('Diário de Bordo salvo!');
      setAba('lista');
      loadDiarios();
      setForm(getInitialDiaryForm(dateFromQuery));
      setAvaliacaoIndividualForm(getInitialAvaliacaoIndividualForm());
    } catch (err: any) {
      toast.error(extractErrorMessage(err, 'Erro ao salvar diário'));
    } finally {
      setSaving(false);
    }
  }

  const diariosFiltrados = diarios.filter(d => {
    if (busca && !new Date(d.date || d.createdAt).toLocaleDateString('pt-BR').includes(busca) && !(d.momentoDestaque || '').toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <PageShell title="Diário da Turma" subtitle="Registre o dia pedagógico, microgestos e reflexões sobre a prática docente">
      {/* Abas */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {[
          { id: 'lista', label: 'Meus Diários', icon: <BookOpen className="h-4 w-4" /> },
          { id: 'novo', label: 'Diário do Dia', icon: <Plus className="h-4 w-4" /> },
          { id: 'ocorrencias', label: 'Ocorrências', icon: <TriangleAlert className="h-4 w-4" /> },
          { id: 'observacoes', label: 'Observações Individuais', icon: <Brain className="h-4 w-4" /> },
          { id: 'microgestos', label: 'O que são Microgestos?', icon: <Sparkles className="h-4 w-4" /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${aba === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── LISTA DE DIÁRIOS ─── */}
      {aba === 'lista' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por data ou conteúdo..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <Button onClick={() => setAba('novo')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo Diário
            </Button>
          </div>

          {loading && <LoadingState message="Carregando diários..." />}

          {!loading && diariosFiltrados.length === 0 && (
            <EmptyState
              icon={<BookOpen className="h-12 w-12 text-gray-300" />}
              title="Nenhum diário registrado"
              description="Comece registrando o dia pedagógico de hoje"
              action={<Button onClick={() => setAba('novo')}><Plus className="h-4 w-4 mr-2" />Criar Diário</Button>}
            />
          )}

          <div className="space-y-3">
            {diariosFiltrados.map(diario => {
              const clima = CLIMAS.find(c => c.id === diario.climaEmocional) || CLIMAS[1];
              const isExpanded = expandedId === diario.id;
              return (
                <Card key={diario.id} className="border-2 hover:border-blue-200 transition-all">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${clima.cor}`}>
                            {clima.emoji} {clima.label}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(((diario.date || diario.createdAt) || '').includes('T') ? (diario.date || diario.createdAt) : (diario.date || diario.createdAt) + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                          </span>
                          {diario.microgestos?.length > 0 && (
                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                              {diario.microgestos.length} microgestos
                            </span>
                          )}
                          {/* Badge status de execução do plano */}
                          {(() => {
                            const ctx = diario.aiContext && typeof diario.aiContext === 'object' ? diario.aiContext : {};
                            const s = ctx.statusExecucaoPlano;
                            if (!s) return null;
                            const cfg: Record<string, { label: string; cor: string }> = {
                              FEITO: { label: '✅ Cumprido', cor: 'bg-emerald-100 text-emerald-700' },
                              PARCIAL: { label: '⚠️ Parcial', cor: 'bg-amber-100 text-amber-700' },
                              NAO_REALIZADO: { label: '❌ Não Realizado', cor: 'bg-red-100 text-red-700' },
                            };
                            const c = cfg[s];
                            return c ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.cor}`}>
                                {c.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        {diario.momentoDestaque && (
                          <p className="text-sm text-gray-700 line-clamp-2 mt-1">
                            <span className="font-medium">Destaque: </span>{diario.momentoDestaque}
                          </p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          {diario.presencas > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3 text-green-500" />{diario.presencas} presentes</span>}
                          {diario.ausencias > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3 text-red-400" />{diario.ausencias} ausentes</span>}
                        </div>
                      </div>
                      <button onClick={() => setExpandedId(isExpanded ? null : diario.id)} className="text-gray-400 hover:text-gray-600 p-1">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        {diario.rotina?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Rotina do Dia</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {diario.rotina.map((r: any, i: number) => (
                                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${r.concluido ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                                  <CheckCircle className={`h-3.5 w-3.5 flex-shrink-0 ${r.concluido ? 'text-green-500' : 'text-gray-300'}`} />
                                  {r.momento}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {diario.microgestos?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Microgestos Pedagógicos</p>
                            <div className="space-y-2">
                              {diario.microgestos.map((m: any, i: number) => {
                                const tipo = TIPOS_MICROGESTO.find(t => t.id === m.tipo);
                                return (
                                  <div key={i} className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
                                    <span className="text-base flex-shrink-0">{tipo?.emoji || '✨'}</span>
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-purple-700">{tipo?.label || m.tipo}</p>
                                      <p className="text-xs text-gray-600">{m.descricao}</p>
                                      {m.criancaNome && (
                                        <div className="flex items-center gap-1 mt-1">
                                          {m.criancaFoto ? (
                                            <img src={m.criancaFoto} alt={m.criancaNome} className="w-5 h-5 rounded-full object-cover" />
                                          ) : (
                                            <UserCircle className="w-4 h-4 text-gray-400" />
                                          )}
                                          <p className="text-xs text-gray-500">{m.criancaNome}</p>
                                        </div>
                                      )}
                                    </div>
                                    {m.horario && <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{m.horario}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {diario.reflexaoPedagogica && (
                          <div className="bg-indigo-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-indigo-500 uppercase mb-1">Reflexão Pedagógica</p>
                            <p className="text-sm text-indigo-700">{diario.reflexaoPedagogica}</p>
                          </div>
                        )}
                        {diario.encaminhamentos && (
                          <div className="bg-orange-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-orange-500 uppercase mb-1">Encaminhamentos</p>
                            <p className="text-sm text-orange-700">{diario.encaminhamentos}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── NOVO DIÁRIO ─── */}
      {aba === 'novo' && (
        <div className="space-y-6 max-w-3xl">
          {!chamadaCarregada && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">Chamada do Dia ainda não realizada</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Realize a Chamada Diária antes de guardar o Diário do Dia. As presenças serão importadas automaticamente após a chamada.
                </p>
                <button
                  onClick={() => { if (classroomId) window.location.href = '/app/chamada'; }}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  <Users className="h-3.5 w-3.5" /> Ir para Chamada Diária
                </button>
              </div>
            </div>
          )}

          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Users className="h-5 w-5" /> {getAcolhidaTitle()}
              </CardTitle>
              <p className="text-sm text-blue-700">
                Registre a presença, o clima emocional da turma e um resumo curto do recebimento das crianças no início do dia.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  {(() => {
                    const d = new Date(form.date + 'T12:00:00').getDay();
                    return (d === 0 || d === 6) ? (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Fim de semana — dia não letivo. Altere a data.
                      </p>
                    ) : null;
                  })()}
                </div>
                {criancas.length === 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Presenças</Label>
                      <Input type="number" min={0} value={form.presencas} onChange={e => setForm(f => ({ ...f, presencas: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Ausências</Label>
                      <Input type="number" min={0} value={form.ausencias} onChange={e => setForm(f => ({ ...f, ausencias: Number(e.target.value) }))} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-2xl border border-blue-100 bg-white/80 p-4">
                <div>
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <Label>{getChamadaTitle()}</Label>
                    {criancas.length > 0 && chamadaCarregada && chamadaInfo && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        <CheckCircle className="h-3 w-3" /> Chamada importada da lista de presença
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{getChamadaManualHelper(chamadaCarregada)}</p>
                  {criancas.length > 0 ? (() => {
                    const totalChamadaUI = chamadaCarregada && chamadaInfo?.total ? chamadaInfo.total : criancas.length;
                    const presentesUI = form.criancasPresentes.length;
                    const ausentesUI = Math.max(0, totalChamadaUI - presentesUI);

                    return (
                      <div>
                        {!chamadaCarregada && (
                          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                            Ajuste manualmente se necessário, mas a guarda do diário continuará bloqueada até a chamada oficial ser feita.
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mb-2">Toque na foto para ajustar a presença</p>
                        <div className="flex flex-wrap gap-2">
                          {criancas.map(c => {
                            const presente = form.criancasPresentes.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleCriancaPresente(c.id)}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${presente ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white opacity-60 hover:opacity-100'}`}
                                title={getCriancaNome(c)}
                              >
                                <ChildAvatar
                                  child={c}
                                  alt={c.firstName}
                                  sizeClassName="w-10 h-10"
                                  imageClassName="rounded-full object-cover"
                                  fallbackClassName="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center"
                                  iconClassName="w-6 h-6 text-blue-400"
                                />
                                <span className="text-xs font-medium text-center max-w-[60px] truncate">{c.firstName}</span>
                                {presente && <span className="text-green-500 text-xs font-bold">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {chamadaCarregada
                            ? `${presentesUI} presente(s) · ${ausentesUI} ausente(s)`
                            : `${form.criancasPresentes.length} marcado(s) manualmente — chamada oficial ainda não realizada`}
                        </p>
                      </div>
                    );
                  })() : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Presenças</Label>
                        <Input type="number" min={0} value={form.presencas} onChange={e => setForm(f => ({ ...f, presencas: Number(e.target.value) }))} />
                      </div>
                      <div>
                        <Label>Ausências</Label>
                        <Input type="number" min={0} value={form.ausencias} onChange={e => setForm(f => ({ ...f, ausencias: Number(e.target.value) }))} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
                  <div>
                    <Label>Registro rápido da acolhida</Label>
                    <Textarea
                      placeholder={getAcolhidaPlaceholder()}
                      rows={3}
                      value={form.acolhidaInicial}
                      onChange={e => setForm(f => ({ ...f, acolhidaInicial: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Clima Emocional da Turma</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {CLIMAS.map(clima => (
                        <button
                          key={clima.id}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, climaEmocional: clima.id }))}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${form.climaEmocional === clima.id ? clima.cor + ' border-current shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                          {clima.emoji} {clima.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {planejamentoHoje ? (
            <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 shadow-md shadow-indigo-100/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-indigo-800 text-base">
                    <Target className="h-5 w-5 text-indigo-500" /> {getPlanningSectionTitle()}
                  </CardTitle>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-200 text-indigo-800">
                    {getPlanningStatusLabel(planejamentoHoje.status)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-indigo-900 mt-1">{planejamentoHoje.title}</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {(planejamentoHoje.camposExperiencia ?? []).length > 0 && (
                  <div className="rounded-xl border border-indigo-200 bg-white/70 p-3">
                    <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">Campo de Experiência</p>
                    <div className="flex flex-wrap gap-1.5">
                      {planejamentoHoje.camposExperiencia!.map((campo, i) => (
                        <span key={i} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">{campo}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(planejamentoHoje.objetivosMatriz ?? []).length > 0 ? (
                  <div className="space-y-3">
                    {planejamentoHoje.objetivosMatriz!.map((obj, i) => {
                      const fields = getObjectiveCardFields(obj as Record<string, any>);
                      if (!hasObjectiveCardContent(fields, planejamentoHoje.activities, planejamentoHoje.recursos)) return null;
                      const showGeneralIntencionalidade = !fields.intencionalidade && Boolean(planejamentoHoje.intencionalidadeGeral);
                      return (
                        <div key={i} className="rounded-xl border border-indigo-200 bg-white/80 p-3 space-y-3">
                          {fields.campoExperiencia && (
                            <div>
                              <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">Campo de Experiência</p>
                              <p className="text-sm font-medium text-indigo-900 whitespace-pre-line">{fields.campoExperiencia}</p>
                            </div>
                          )}
                          {fields.objetivoBNCC && (
                            <div>
                              <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">Objetivo BNCC</p>
                              <p className="text-sm text-indigo-900 whitespace-pre-line">{fields.objetivoBNCC}</p>
                            </div>
                          )}
                          {fields.objetivoCurriculo && (
                            <div>
                              <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">Objetivo do Currículo</p>
                              <p className="text-sm text-indigo-900 whitespace-pre-line">{fields.objetivoCurriculo}</p>
                            </div>
                          )}
                          {fields.intencionalidade && (
                            <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-3">
                              <p className="text-[11px] font-semibold text-fuchsia-700 uppercase tracking-wide mb-1">Intencionalidade Pedagógica</p>
                              <p className="text-sm text-fuchsia-950 whitespace-pre-line">{fields.intencionalidade}</p>
                            </div>
                          )}
                          {showGeneralIntencionalidade && (
                            <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-3">
                              <p className="text-[11px] font-semibold text-fuchsia-700 uppercase tracking-wide mb-1">Intencionalidade Pedagógica</p>
                              <p className="text-sm text-fuchsia-950 whitespace-pre-line">{planejamentoHoje.intencionalidadeGeral}</p>
                            </div>
                          )}
                          {planejamentoHoje.activities && (
                            <div>
                              <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">Desenvolvimento da Atividade</p>
                              <p className="text-sm text-indigo-900 whitespace-pre-line">{planejamentoHoje.activities}</p>
                            </div>
                          )}
                          {planejamentoHoje.recursos && (
                            <div>
                              <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">Recursos / Materiais</p>
                              <p className="text-sm text-indigo-900 whitespace-pre-line">{planejamentoHoje.recursos}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {planejamentoHoje.objectives && (
                      <div className="rounded-xl border border-indigo-200 bg-white/70 p-3">
                        <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">Objetivo do Currículo</p>
                        <p className="text-sm text-indigo-900 whitespace-pre-line">{planejamentoHoje.objectives}</p>
                      </div>
                    )}
                    {planejamentoHoje.intencionalidadeGeral && (
                      <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-3">
                        <p className="text-[11px] font-semibold text-fuchsia-700 uppercase tracking-wide mb-1">Intencionalidade Pedagógica</p>
                        <p className="text-sm text-fuchsia-950 whitespace-pre-line">{planejamentoHoje.intencionalidadeGeral}</p>
                      </div>
                    )}
                    {planejamentoHoje.activities && (
                      <div className="rounded-xl border border-indigo-200 bg-white/70 p-3">
                        <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">Desenvolvimento da Atividade</p>
                        <p className="text-sm text-indigo-900 whitespace-pre-line">{planejamentoHoje.activities}</p>
                      </div>
                    )}
                    {planejamentoHoje.recursos && (
                      <div className="rounded-xl border border-indigo-200 bg-white/70 p-3">
                        <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">Materiais / Recursos Previstos</p>
                        <p className="text-sm text-indigo-900 whitespace-pre-line">{planejamentoHoje.recursos}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500">{getPlanningEmptyText()}</p>
            </div>
          )}

          <Card className="border-2 border-green-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-green-700"><Clock className="h-5 w-5" /> Rotina do Dia</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-3">Marque os momentos da rotina que foram realizados hoje</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {form.rotina.map((item, idx) => (
                  <button key={idx} type="button" onClick={() => toggleRotinaItem(idx)} className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${item.concluido ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <CheckCircle className={`h-5 w-5 flex-shrink-0 ${item.concluido ? 'text-green-500' : 'text-gray-300'}`} />
                    <div>
                      <p className={`text-sm font-medium ${item.concluido ? 'text-green-700' : 'text-gray-700'}`}>{item.momento}</p>
                      <p className="text-xs text-gray-400">{item.descricao}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-purple-700"><Sparkles className="h-5 w-5" /> Microgestos Pedagógicos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">Registre as pequenas ações pedagógicas intencionais que você realizou ao longo do dia</p>

              <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                <div>
                  <Label>Tipo de Microgesto <span className="text-xs font-normal text-gray-400">(pode selecionar mais de um)</span></Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {TIPOS_MICROGESTO.map(tipo => (
                      <button key={tipo.id} type="button" onClick={() => setMicrogestoForm(f => ({
                        ...f,
                        tipos: f.tipos.includes(tipo.id)
                          ? f.tipos.filter(t => t !== tipo.id).length > 0
                            ? f.tipos.filter(t => t !== tipo.id)
                            : [tipo.id]
                          : [...f.tipos, tipo.id],
                      }))} className={`p-2 rounded-lg border-2 text-center transition-all ${microgestoForm.tipos.includes(tipo.id) ? 'border-purple-400 bg-white shadow-sm' : 'border-transparent bg-white/50 hover:bg-white'}`}>
                        <span className="text-lg block">{tipo.emoji}</span>
                        <span className="text-xs font-medium text-gray-700">{tipo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Campo de Experiência</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CAMPOS_EXPERIENCIA.map(c => (
                      <button key={c.id} type="button" onClick={() => setMicrogestoForm(f => ({ ...f, campo: c.id }))} className={`flex items-center gap-1 px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all ${microgestoForm.campo === c.id ? 'border-purple-500 bg-purple-100 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300'}`}>
                        {c.emoji} {c.label.split(',')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <SeletorCrianca
                  criancas={criancas}
                  selecionadas={microgestoForm.criancasSelecionadas}
                  onToggle={toggleCriancaMicrogesto}
                  multiplo={true}
                  label="Criança(s) envolvida(s)"
                />

                <div>
                  <Label>Horário (opcional)</Label>
                  <Input type="time" value={microgestoForm.horario} onChange={e => setMicrogestoForm(f => ({ ...f, horario: e.target.value }))} />
                </div>

                <div>
                  <Label>Descrição do Microgesto *</Label>
                  <Textarea
                    placeholder="Descreva a ação pedagógica: o que você fez, como a criança respondeu, qual foi o impacto..."
                    rows={2}
                    value={microgestoForm.descricao}
                    onChange={e => setMicrogestoForm(f => ({ ...f, descricao: e.target.value }))}
                  />
                </div>

                <Button type="button" onClick={adicionarMicrogesto} disabled={savingMicrogesto} variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-100">
                  {savingMicrogesto
                    ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                    : <><Plus className="h-4 w-4 mr-2" /> Adicionar Microgesto</>}
                </Button>
              </div>

              {form.microgestos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">{form.microgestos.length} microgesto(s) registrado(s)</p>
                  {form.microgestos.map(m => {
                    const tipo = TIPOS_MICROGESTO.find(t => t.id === m.tipo);
                    return (
                      <div key={m.id} className="flex items-start gap-3 p-3 bg-white border border-purple-200 rounded-xl">
                        <span className="text-xl flex-shrink-0">{tipo?.emoji || '✨'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-purple-700">{tipo?.label}</p>
                          <p className="text-sm text-gray-700">{m.descricao}</p>
                          {m.criancaNome && (
                            <div className="flex items-center gap-1 mt-1">
                              {m.criancaFoto ? (
                                <img src={m.criancaFoto} alt={m.criancaNome} className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <UserCircle className="w-4 h-4 text-gray-400" />
                              )}
                              <p className="text-xs text-gray-500">{m.criancaNome}</p>
                            </div>
                          )}
                        </div>
                        {m.horario && <span className="text-xs text-gray-400 flex-shrink-0">{m.horario}</span>}
                        <button type="button" onClick={() => removerMicrogesto(m.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 w-fit text-xs font-semibold uppercase tracking-wide text-sky-700">
              <ClipboardList className="h-4 w-4" /> {getAvaliacaoTitle()}
            </div>

            <Card className="border-2 border-emerald-200 bg-emerald-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-emerald-800">
                  <ClipboardList className="h-5 w-5 text-emerald-500" /> {getExecucaoTitle()}
                </CardTitle>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Registre o que foi executado no plano do dia e os ajustes pedagógicos feitos ao longo da rotina.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-emerald-800 mb-2">
                    Cumprimento do plano {planejamentoHoje && <span className="text-red-500">*</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { id: 'FEITO' as const, label: 'Cumprido', emoji: '✅', cor: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600', corOff: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
                      { id: 'PARCIAL' as const, label: 'Parcial', emoji: '⚠️', cor: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500', corOff: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
                      { id: 'NAO_REALIZADO' as const, label: 'Não realizado', emoji: '❌', cor: 'bg-red-500 hover:bg-red-600 text-white border-red-500', corOff: 'border-red-300 text-red-600 hover:bg-red-50' },
                    ]).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, statusExecucaoPlano: s.id }))}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${form.statusExecucaoPlano === s.id ? s.cor + ' shadow-md' : 'bg-white ' + s.corOff}`}
                      >
                        <span>{s.emoji}</span> {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(form.statusExecucaoPlano === 'PARCIAL' || form.statusExecucaoPlano === 'NAO_REALIZADO') && (
                  <div>
                    <Label>
                      {getExecucaoLabel(form.statusExecucaoPlano)} {planejamentoHoje && <span className="text-red-500">*</span>} <span className="font-normal text-gray-400">{getExecucaoHint(form.statusExecucaoPlano)}</span>
                    </Label>
                    <Textarea
                      placeholder={getExecucaoPlaceholder(form.statusExecucaoPlano)}
                      rows={3}
                      value={form.execucaoPlanejamento}
                      onChange={e => setForm(f => ({ ...f, execucaoPlanejamento: e.target.value }))}
                    />
                  </div>
                )}

                <div>
                  <Label>Materiais utilizados <span className="font-normal text-gray-400">(opcional)</span></Label>
                  <Textarea
                    placeholder="Quais materiais e recursos foram realmente utilizados?"
                    rows={2}
                    value={form.materiaisUtilizados}
                    onChange={e => setForm(f => ({ ...f, materiaisUtilizados: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Adaptações realizadas <span className="font-normal text-gray-400">(opcional)</span></Label>
                    <Textarea
                      placeholder="Que ajustes foram necessários em relação ao previsto?"
                      rows={2}
                      value={form.adaptacoesRealizadas}
                      onChange={e => setForm(f => ({ ...f, adaptacoesRealizadas: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Ocorrências relevantes <span className="font-normal text-gray-400">(opcional)</span></Label>
                    <Textarea
                      placeholder="Registe imprevistos, acontecimentos ou situações importantes do dia."
                      rows={2}
                      value={form.ocorrencias}
                      onChange={e => setForm(f => ({ ...f, ocorrencias: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-sky-200 bg-sky-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sky-800">
                  <ClipboardList className="h-5 w-5 text-sky-500" /> Avaliação do Dia
                </CardTitle>
                <p className="text-xs text-sky-600 mt-0.5">{getAvaliacaoIntro()}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Reação das crianças <span className="font-normal text-gray-400">(opcional)</span></Label>
                  <Textarea
                    placeholder="Como as crianças responderam às propostas e interações do dia?"
                    rows={2}
                    value={form.reacaoCriancas}
                    onChange={e => setForm(f => ({ ...f, reacaoCriancas: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>O que precisa ser retomado? <span className="text-red-500">*</span> <span className="font-normal text-gray-400">(obrigatório)</span></Label>
                  <Textarea
                    placeholder="O que continuar, aprofundar ou retomar no próximo dia?"
                    rows={3}
                    value={form.reflexaoPedagogica}
                    onChange={e => setForm(f => ({ ...f, reflexaoPedagogica: e.target.value }))}
                  />
                </div>

                <div className="rounded-xl border border-sky-200 bg-white/80 p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-sky-900">Observação individual por aluno</p>
                      <p className="text-xs text-sky-700">{getAvaliacaoIndividualHelper()}</p>
                    </div>
                    <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                      Use este registro para comportamento, reação, necessidade de retomada ou observação relevante do aluno em relação ao plano/aula.
                    </div>
                  </div>

                  <div>
                    <Label>Criança(s) da turma</Label>
                    {criancas.length === 0 ? (
                      <p className="text-xs text-gray-400 mt-2 italic">Nenhuma criança disponível para seleção.</p>
                    ) : (
                      <div className="space-y-3 mt-2">
                        <select
                          multiple
                          value={avaliacaoIndividualForm.childIds}
                          onChange={e => {
                            const selecionadas = Array.from(e.target.selectedOptions).map(option => option.value);
                            setAvaliacaoIndividualForm(f => ({ ...f, childIds: selecionadas }));
                          }}
                          className="w-full min-h-32 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        >
                          {criancas
                            .slice()
                            .sort((a, b) => getCriancaNome(a).localeCompare(getCriancaNome(b), 'pt-BR'))
                            .map(c => (
                              <option key={c.id} value={c.id}>{getCriancaNome(c)}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500">Use Ctrl/Cmd para selecionar mais de uma criança. A seleção permanece registrada abaixo de forma compacta para manter a área mais limpa.</p>
                        {avaliacaoIndividualForm.childIds.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {criancas
                              .filter(c => avaliacaoIndividualForm.childIds.includes(c.id))
                              .map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => toggleCriancaAvaliacaoIndividual(c.id)}
                                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:border-sky-300 hover:bg-sky-100"
                                  title={`Remover ${getCriancaNome(c)} da seleção`}
                                >
                                  <span className="truncate max-w-[140px]">{getCriancaNome(c)}</span>
                                  <span className="text-sky-500">×</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Observação individual breve</Label>
                    <Textarea
                      placeholder={getAvaliacaoPlaceholder()}
                      rows={3}
                      value={avaliacaoIndividualForm.observacao}
                      onChange={e => setAvaliacaoIndividualForm(f => ({ ...f, observacao: e.target.value }))}
                    />
                  </div>

                  {avaliacaoIndividualForm.childIds.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Selecionadas: {criancas.filter(c => avaliacaoIndividualForm.childIds.includes(c.id)).map(c => c.firstName).join(', ')}
                    </p>
                  )}

                  <Button
                    type="button"
                    onClick={salvarAvaliacaoIndividual}
                    disabled={savingAvaliacaoIndividual}
                    className="w-full bg-sky-600 hover:bg-sky-700"
                  >
                    {savingAvaliacaoIndividual
                      ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                      : <><Save className="h-4 w-4 mr-2" /> {getPlanningObservationTitle(avaliacaoIndividualForm.childIds.length)}</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Star className="h-5 w-5 text-blue-500" /> {getFechamentoTitle()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Momento de Destaque do Dia</Label>
                <Textarea
                  placeholder="Descreva o momento mais significativo do dia: uma descoberta, uma fala marcante, uma interação especial, uma conquista..."
                  rows={3}
                  value={form.momentoDestaque}
                  onChange={e => setForm(f => ({ ...f, momentoDestaque: e.target.value }))}
                />
              </div>
              <div>
                <Label>Encaminhamentos e Próximos Passos</Label>
                <Textarea
                  placeholder="Registre o que precisa ser comunicado aos pais, encaminhado à coordenação ou planejado para os próximos dias..."
                  rows={2}
                  value={form.encaminhamentos}
                  onChange={e => setForm(f => ({ ...f, encaminhamentos: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={salvarDiario} disabled={saving} className="flex-1">
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Diário do Dia
            </Button>
            <Button variant="outline" onClick={() => setAba('lista')}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* ─── OCORRÊNCIAS ─── */}
      {aba === 'ocorrencias' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4">
            <p className="text-sm text-orange-700">
              Registre ocorrências individuais por criança: chegada/saída, saúde, comportamento, material ou comunicação com responsáveis.
              Cada ocorrência fica vinculada à criança e pode incluir foto.
            </p>
          </div>

          {/* Ocorrências são independentes de planejamento */}

          {/* Formulário de nova ocorrência */}
          <Card className="border-2 border-orange-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-orange-700"><TriangleAlert className="h-5 w-5" /> Registrar Ocorrência</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Seleção de criança */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Criança *</Label>
                {/* FIX P0: usar loadingTurma/turmaErro para evitar spinner infinito */}
                {loadingTurma ? (
                  <p className="text-sm text-gray-400 italic flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Carregando turma...</p>
                ) : turmaErro ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-700 font-medium">{turmaErro}</p>
                    <button type="button" onClick={loadTurmaECriancas} className="mt-2 text-xs text-amber-600 underline hover:text-amber-800">Tentar novamente</button>
                  </div>
                ) : criancas.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-700">Nenhuma criança matriculada na turma. Verifique com a coordenação.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                      value={criancaSelecionadaOcorr}
                      onChange={e => setCriancaSelecionadaOcorr(e.target.value)}
                    >
                      <option value="">-- Selecione uma criança --</option>
                      {criancas
                        .slice()
                        .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'pt-BR'))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                        ))}
                    </select>
                    {criancaSelecionadaOcorr && (
                      <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                        Criança selecionada: <span className="font-semibold">{criancas.find(c => c.id === criancaSelecionadaOcorr)?.firstName} {criancas.find(c => c.id === criancaSelecionadaOcorr)?.lastName}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Categoria */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Categoria *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CATEGORIAS_OCORRENCIA.map(cat => (
                    <button key={cat.id} type="button"
                      onClick={() => setOcorrForm(f => ({ ...f, categoria: cat.id }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        ocorrForm.categoria === cat.id
                          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
                      }`}>
                      <span>{cat.emoji}</span> {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data */}
              <div>
                <Label>Data da ocorrência</Label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={ocorrForm.eventDate}
                  onChange={e => setOcorrForm(f => ({ ...f, eventDate: e.target.value }))}
                />
              </div>

              {/* Descrição */}
              <div>
                <Label>Descrição detalhada *</Label>
                <Textarea
                  placeholder="Descreva o que aconteceu com detalhes: hora, contexto, pessoas envolvidas, como foi resolvido..."
                  rows={4}
                  value={ocorrForm.descricao}
                  onChange={e => setOcorrForm(f => ({ ...f, descricao: e.target.value }))}
                />
              </div>

              {/* Upload de foto */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Foto (opcional)</Label>
                <div className="space-y-2">
                  {ocorrForm.fotos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {ocorrForm.fotos.map((foto, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-orange-200">
                          <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              try { URL.revokeObjectURL(ocorrForm.fotos[idx]); } catch {}
                              setOcorrForm(f => ({ ...f, fotos: f.fotos.filter((_, i) => i !== idx), fotosFiles: f.fotosFiles.filter((_, i) => i !== idx) }));
                            }}
                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:bg-orange-50 transition-colors">
                    {uploadingFoto ? (
                      <><RefreshCw className="h-4 w-4 animate-spin text-orange-500" /><span className="text-sm text-orange-600">Processando...</span></>
                    ) : (
                      <><UploadCloud className="h-4 w-4 text-orange-500" /><span className="text-sm text-orange-600">Adicionar foto (JPG, PNG — máx. 5 MB)</span></>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} disabled={uploadingFoto} />
                  </label>
                </div>
              </div>

              <Button
                onClick={salvarOcorrencia}
                disabled={
                  savingOcorr ||
                  !criancaSelecionadaOcorr ||
                  !ocorrForm.descricao.trim()
                }
                title={
                  !criancaSelecionadaOcorr
                    ? 'Selecione uma criança'
                    : !ocorrForm.descricao.trim()
                    ? 'Descreva a ocorrência'
                    : 'Registrar ocorrência'
                }
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingOcorr ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="h-4 w-4 mr-2" /> Registrar Ocorrência</>}
              </Button>
            </CardContent>
          </Card>

          {/* Histórico de ocorrências */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Histórico de Ocorrências</h3>
              <select
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                onChange={e => { const v = e.target.value; if (v) loadOcorrencias(v); else loadOcorrencias(); }}
              >
                <option value="">Todas as crianças</option>
                {criancas.slice().sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'pt-BR')).map(c => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>

            {loadingOcorr && <LoadingState message="Carregando ocorrências..." />}

            {!loadingOcorr && ocorrencias.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Camera className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma ocorrência registrada ainda</p>
              </div>
            )}

            {/* Modal de edição de ocorrência */}
            {ocorrenciaEditando && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOcorrenciaEditando(null)}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-lg">Editar Ocorrência</h3>
                    <button onClick={() => setOcorrenciaEditando(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Categoria</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIAS_OCORRENCIA.map(cat => (
                        <button key={cat.id} type="button"
                          onClick={() => setEditForm(f => ({ ...f, categoria: cat.id }))}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                            editForm.categoria === cat.id
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
                          }`}>
                          <span>{cat.emoji}</span> {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Data</Label>
                    <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      value={editForm.eventDate}
                      onChange={e => setEditForm(f => ({ ...f, eventDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Descrição *</Label>
                    <Textarea rows={4} value={editForm.descricao}
                      onChange={e => setEditForm(f => ({ ...f, descricao: e.target.value }))}
                      placeholder="Descreva a ocorrência..." />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setOcorrenciaEditando(null)}>Cancelar</Button>
                    <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={salvarEdicaoOcorrencia} disabled={savingEdit}>
                      {savingEdit ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="h-4 w-4 mr-2" /> Salvar alterações</>}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {ocorrencias.map(ocorr => {
              const cat = CATEGORIAS_OCORRENCIA.find(c => c.id === ocorr.categoria);
              const crianca = criancas.find(c => c.id === ocorr.childId);
              const dataFormatada = ocorr.eventDate
                ? new Date((ocorr.eventDate || '').includes('T') ? ocorr.eventDate : (ocorr.eventDate || '') + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '—';
              // Regras de RBAC: professor edita/exclui as próprias; DEVELOPER exclui qualquer
              const canEdit = ocorr.createdBy === currentUserId || isDeveloper;
              const canDelete = isDeveloper || ocorr.createdBy === currentUserId;
              return (
                <Card key={ocorr.id ?? ocorr.eventDate} className="border-2 border-orange-100 hover:border-orange-200 transition-all">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar da criança */}
                      <div className="flex-shrink-0">
                        <ChildAvatar
                          child={crianca}
                          alt={crianca?.firstName}
                          sizeClassName="w-10 h-10"
                          imageClassName="rounded-full object-cover border-2 border-orange-200"
                          fallbackClassName="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-200"
                          iconClassName="w-6 h-6 text-orange-400"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm text-gray-800">
                            {crianca ? `${crianca.firstName} ${crianca.lastName}` : 'Criança'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                            {cat?.emoji} {cat?.label ?? ocorr.categoria}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">{dataFormatada}</span>
                          {/* Botões de ação */}
                          {canEdit && (
                            <button
                              title="Editar ocorrência"
                              onClick={() => abrirEdicao(ocorr)}
                              className="ml-1 p-1 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              title="Excluir ocorrência"
                              onClick={() => excluirOcorrencia(ocorr)}
                              disabled={excluindoId === ocorr.id}
                              className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                              {excluindoId === ocorr.id
                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{ocorr.descricao}</p>
                        {/* Fotos */}
                        {ocorr.mediaUrls && ocorr.mediaUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {ocorr.mediaUrls.map((url, idx) => (
                              <img key={idx} src={url} alt={`Foto ${idx + 1}`}
                                className="w-16 h-16 rounded-lg object-cover border border-orange-200 cursor-pointer"
                                onClick={() => window.open(url, '_blank')}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── OBSERVAÇÕES INDIVIDUAIS ─── */}
      {aba === 'observacoes' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-4">
            <p className="text-sm text-teal-700">
              Registre observações individuais de cada criança: comportamento, alimentação, sono, participação no plano de aula, desenvolvimento psicológico e físico.
              Essas informações ficam disponíveis para a coordenadora pedagógica e geram relatórios de evolução.
            </p>
          </div>

          {/* Seletor de criança */}
          <Card className="border-2 border-teal-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-teal-700"><UserCircle className="h-5 w-5" /> Selecionar Criança</CardTitle></CardHeader>
            <CardContent>
              {/* FIX P0: usar loadingTurma/turmaErro para evitar spinner infinito */}
              {loadingTurma ? (
                <p className="text-sm text-gray-400 italic flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Carregando turma...
                </p>
              ) : turmaErro ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700 font-medium">{turmaErro}</p>
                  <button type="button" onClick={loadTurmaECriancas} className="mt-2 text-xs text-amber-600 underline hover:text-amber-800">Tentar novamente</button>
                </div>
              ) : criancas.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700">Nenhuma criança matriculada na turma. Verifique com a coordenação.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* FIX P0.2: select pesquisável com nome completo — obrigatório para uso real */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <select
                      className="w-full border border-teal-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                      value={criancaSelecionadaObs}
                      onChange={e => {
                        const val = e.target.value;
                        setCriancaSelecionadaObs(val);
                        if (val) loadObservacoes(val);
                        else loadObservacoes(undefined);
                      }}
                    >
                      <option value="">-- Selecione uma criança --</option>
                      {criancas
                        .slice()
                        .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'pt-BR'))
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.firstName} {c.lastName}
                          </option>
                        ))}
                    </select>
                  </div>
                  {criancaSelecionadaObs && (
                    <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800">
                      Criança selecionada: <span className="font-semibold">{criancas.find(c => c.id === criancaSelecionadaObs)?.firstName} {criancas.find(c => c.id === criancaSelecionadaObs)?.lastName}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulário de observação */}
          {criancaSelecionadaObs && (() => {
            const criancaObs = criancas.find(c => c.id === criancaSelecionadaObs);
            return (
            <Card className="border-2 border-teal-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-teal-700">
                  <Plus className="h-5 w-5" />
                  Nova Observação — {criancaObs?.firstName}
                </CardTitle>
              </CardHeader>
              {/* Alerta de Alergia */}
              {criancaObs && (
                <div className="px-6 pb-2">
                  <AlergiaAlert
                    childId={criancaObs.id}
                    allergies={criancaObs.allergies}
                    medicalConditions={criancaObs.medicalConditions}
                  />
                </div>
              )}
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data</Label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={obsForm.date}
                      onChange={e => setObsForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={obsForm.category}
                      onChange={e => setObsForm(f => ({ ...f, category: e.target.value }))}>
                      <option value="GERAL">Geral</option>
                      <option value="COMPORTAMENTO">Comportamento</option>
                      <option value="DESENVOLVIMENTO">Desenvolvimento</option>
                      <option value="SAUDE">Saúde e Bem-estar</option>
                      <option value="APRENDIZAGEM">Aprendizagem</option>
                    </select>
                  </div>
                </div>

                {/* Comportamento */}
                <div className="bg-orange-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-orange-700 flex items-center gap-2"><Heart className="h-4 w-4" /> Comportamento e Emoções</p>
                  <Textarea placeholder="Como foi o comportamento geral da criança hoje? Houve agitação, choro, agressividade, tranquilidade?" rows={2}
                    value={obsForm.behaviorDescription} onChange={e => setObsForm(f => ({ ...f, behaviorDescription: e.target.value }))} />
                  <Textarea placeholder="Interação social com outras crianças e adultos..." rows={2}
                    value={obsForm.socialInteraction} onChange={e => setObsForm(f => ({ ...f, socialInteraction: e.target.value }))} />
                  <Textarea placeholder="Estado emocional: alegre, triste, ansioso, calmo..." rows={2}
                    value={obsForm.emotionalState} onChange={e => setObsForm(f => ({ ...f, emotionalState: e.target.value }))} />
                </div>

                {/* Alimentação e sono */}
                <div className="bg-green-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-green-700 flex items-center gap-2"><Apple className="h-4 w-4" /> Alimentação e Sono</p>
                  <Textarea placeholder="Como foi a alimentação? Aceitou bem? Recusou algum alimento? Quantidade ingerida..." rows={2}
                    value={obsForm.dietaryNotes} onChange={e => setObsForm(f => ({ ...f, dietaryNotes: e.target.value }))} />
                  <Textarea placeholder="Padrão de sono: dormiu bem, teve dificuldade, dormiu mais que o habitual..." rows={2}
                    value={obsForm.sleepPattern} onChange={e => setObsForm(f => ({ ...f, sleepPattern: e.target.value }))} />
                </div>

                {/* Pedagógico */}
                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-blue-700 flex items-center gap-2"><Star className="h-4 w-4" /> Desenvolvimento Pedagógico</p>
                  <Textarea placeholder="Como foi o aprendizado? Progresso observado, dificuldades, conquistas..." rows={2}
                    value={obsForm.learningProgress} onChange={e => setObsForm(f => ({ ...f, learningProgress: e.target.value }))} />
                  <Textarea placeholder="Participação no plano de aula: engajamento, interesse, como foi o desempenho na atividade planejada..." rows={2}
                    value={obsForm.planningParticipation} onChange={e => setObsForm(f => ({ ...f, planningParticipation: e.target.value }))} />
                </div>

                {/* Psicológico / Desenvolvimento integral */}
                <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-purple-700 flex items-center gap-2"><Brain className="h-4 w-4" /> Desenvolvimento Integral</p>
                  <Textarea placeholder="Observações psicológicas, mentais e físicas: sinais de ansiedade, dificuldades de atenção, desenvolvimento motor, linguagem..." rows={2}
                    value={obsForm.psychologicalNotes} onChange={e => setObsForm(f => ({ ...f, psychologicalNotes: e.target.value }))} />
                  <Textarea placeholder="Alertas de desenvolvimento: algo que chama atenção e pode indicar necessidade de acompanhamento especializado..." rows={2}
                    value={obsForm.developmentAlerts} onChange={e => setObsForm(f => ({ ...f, developmentAlerts: e.target.value }))} />
                  <Textarea placeholder="Recomendações e próximos passos para esta criança..." rows={2}
                    value={obsForm.recommendations} onChange={e => setObsForm(f => ({ ...f, recommendations: e.target.value }))} />
                </div>

                {/* FIX 5: Campo livre opcional */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Observação Personalizada (opcional)</p>
                  <Textarea
                    placeholder="Escreva livremente qualquer observação que não se encaixe nos campos acima..."
                    rows={3}
                    value={obsForm.observacaoPersonalizada}
                    onChange={e => setObsForm(f => ({ ...f, observacaoPersonalizada: e.target.value }))}
                  />
                </div>

                <Button onClick={salvarObservacao} disabled={savingObs} className="w-full bg-teal-600 hover:bg-teal-700">
                  {savingObs ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Observação Individual
                </Button>
              </CardContent>
            </Card>
            );
          })()}

          {/* Lista de observações da criança selecionada */}
          {criancaSelecionadaObs && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase">Histórico de Observações</h3>
              {loadingObs && <LoadingState message="Carregando observações..." />}
              {!loadingObs && observacoes.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-4">Nenhuma observação registrada para esta criança</p>
              )}
              {observacoes.map(obs => (
                <Card key={obs.id} className="border hover:border-teal-200 transition-all">
                  <CardContent className="pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{obs.category}</span>
                      <span className="text-xs text-gray-400">{new Date(obs.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {obs.behaviorDescription && <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Comportamento:</span> {obs.behaviorDescription}</p>}
                    {obs.dietaryNotes && <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Alimentação:</span> {obs.dietaryNotes}</p>}
                    {obs.learningProgress && <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Aprendizagem:</span> {obs.learningProgress}</p>}
                    {obs.planningParticipation && <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Plano de Aula:</span> {obs.planningParticipation}</p>}
                    {obs.developmentAlerts && <p className="text-sm text-red-600 mb-1"><span className="font-medium">⚠️ Alerta:</span> {obs.developmentAlerts}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── O QUE SÃO MICROGESTOS? ─── */}
      {aba === 'microgestos' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-purple-800 mb-2">O que são Microgestos Pedagógicos?</h2>
                <p className="text-gray-700 leading-relaxed">
                  Microgestos pedagógicos são as <strong>pequenas ações intencionais</strong> que o professor realiza no cotidiano da Educação Infantil —
                  um olhar atento, uma pergunta provocadora, um gesto de acolhimento, uma mediação sutil.
                  Embora pareçam simples, esses gestos são <strong>poderosos instrumentos pedagógicos</strong> que promovem
                  vínculos, ampliam aprendizagens e revelam a intencionalidade da prática docente.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TIPOS_MICROGESTO.map(tipo => (
              <Card key={tipo.id} className="border-2 hover:border-purple-200 transition-all">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl flex-shrink-0">{tipo.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">{tipo.label}</h3>
                      <p className="text-sm text-gray-600">{tipo.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-2 border-indigo-100 bg-indigo-50">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                <Target className="h-5 w-5" /> Por que registrar microgestos?
              </h3>
              <div className="space-y-2 text-sm text-indigo-700">
                <p>• <strong>Tornar visível</strong> a intencionalidade pedagógica que muitas vezes é invisível</p>
                <p>• <strong>Documentar</strong> a qualidade das interações e do cuidado oferecido</p>
                <p>• <strong>Refletir</strong> sobre a própria prática e identificar pontos de melhoria</p>
                <p>• <strong>Evidenciar</strong> o trabalho pedagógico para a coordenação e famílias</p>
                <p>• <strong>Alimentar</strong> o planejamento com base no que foi observado</p>
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => setAba('novo')} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Começar a Registrar Microgestos
          </Button>
        </div>
      )}
    </PageShell>
  );
}
