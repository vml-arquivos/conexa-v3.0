import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles } from '../app/RoleProtectedRoute';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  WandSparkles, Loader2, Printer, ChevronRight, ArrowLeft, ChevronLeft, History, BarChart2,
} from 'lucide-react';
import { AlergiaAlert } from '../components/ui/AlergiaAlert';
import { extractErrorMessage } from '../lib/utils';
import { getPedagogicalToday } from '@/utils/pedagogicalDate';
import { ChildAvatar } from '../components/children/ChildAvatar';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { abrirDiarioImprimivel, type DiaryPrintData } from '../components/PrintableDiary';
import { CalendarioMensal, type CalendarioMensalEvento } from '../components/calendario/CalendarioMensal';

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

function getDiaryEntryDate(diary: Pick<DiaryEntry, 'date' | 'createdAt'>) {
  return (diary.date || diary.createdAt || '').substring(0, 10);
}

function isPublishedDiaryStatus(status?: string | null) {
  return ['PUBLICADO', 'REVISADO', 'ARQUIVADO'].includes((status || '').toUpperCase());
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

const STATUS_AVALIACAO_OBJETIVO = [
  { id: 'ATINGIDO', label: 'Atingido', emoji: '✅', activeClassName: 'bg-emerald-600 border-emerald-600 text-white', idleClassName: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
  { id: 'EM_PROCESSO', label: 'Em processo', emoji: '🟡', activeClassName: 'bg-amber-500 border-amber-500 text-white', idleClassName: 'border-amber-200 text-amber-700 hover:bg-amber-50' },
  { id: 'PRECISA_RETOMAR', label: 'Precisa retomar', emoji: '🔁', activeClassName: 'bg-rose-500 border-rose-500 text-white', idleClassName: 'border-rose-200 text-rose-700 hover:bg-rose-50' },
] as const;

const FATORES_QUE_INFLUENCIARAM = [
  { id: 'ENGAJAMENTO_DA_TURMA', label: 'Engajamento da turma' },
  { id: 'TEMPO_DA_ROTINA', label: 'Tempo da rotina' },
  { id: 'MATERIAIS_DISPONIVEIS', label: 'Materiais disponíveis' },
  { id: 'INTERVENCAO_DOCENTE', label: 'Intervenção docente' },
  { id: 'ADAPTACOES_NECESSARIAS', label: 'Adaptações necessárias' },
  { id: 'OCORRENCIAS_DO_DIA', label: 'Ocorrências do dia' },
] as const;

const MARCACOES_RAPIDAS_CRIANCA = [
  { id: 'PARTICIPOU_COM_ENVOLVIMENTO', label: 'Participou com envolvimento', emoji: '🌟' },
  { id: 'PARTICIPOU_COM_MEDIAÇÃO', label: 'Participou com mediação', emoji: '🤝' },
  { id: 'PRECISOU_RETOMADA', label: 'Precisou de retomada', emoji: '🔁' },
  { id: 'DEMONSTROU_AVANCO', label: 'Demonstrou avanço', emoji: '🚀' },
] as const;

// ─── Observações Individuais por Criança ──────────────────────────────────────
const OBSERVACOES_INDIVIDUAIS_TIPOS = [
  // Desempenho e aprendizagem
  { id: 'SE_DESTACOU', label: 'Se destacou na atividade', emoji: '⭐', grupo: 'desempenho' },
  { id: 'DEMONSTROU_COMPREENSAO', label: 'Demonstrou compreensão', emoji: '💡', grupo: 'desempenho' },
  { id: 'PARTICIPOU_ATIVAMENTE', label: 'Participou ativamente', emoji: '🤝', grupo: 'desempenho' },
  { id: 'DEMONSTROU_AUTONOMIA', label: 'Demonstrou autonomia', emoji: '🙌', grupo: 'desempenho' },
  { id: 'PARTICIPACAO_PARCIAL', label: 'Participação parcial', emoji: '😐', grupo: 'desempenho' },
  { id: 'RECUSOU_PARTICIPAR', label: 'Recusou participar', emoji: '🚫', grupo: 'desempenho' },
  { id: 'PRECISA_RETOMAR', label: 'Precisa retomar o conteúdo', emoji: '🔁', grupo: 'desempenho' },
  // Comportamento e regulação emocional
  { id: 'COMPORTAMENTO_AGITADO', label: 'Comportamento agitado', emoji: '😤', grupo: 'comportamento' },
  { id: 'DIFICULDADE_CONCENTRACAO', label: 'Dificuldade de concentração', emoji: '🎯', grupo: 'comportamento' },
  { id: 'COMPORTAMENTO_AGRESSIVO', label: 'Comportamento agressivo', emoji: '😠', grupo: 'comportamento' },
  { id: 'INSTABILIDADE_EMOCIONAL', label: 'Instabilidade emocional / choro', emoji: '😢', grupo: 'comportamento' },
  { id: 'ISOLAMENTO', label: 'Ficou isolado / não interagiu', emoji: '🤫', grupo: 'comportamento' },
  // Desenvolvimento e sinais de alerta
  { id: 'DIFICULDADE_FALA', label: 'Dificuldade na fala / comunicação', emoji: '💬', grupo: 'desenvolvimento' },
  { id: 'ATENCAO_ESPECIAL', label: 'Precisa de atenção especial', emoji: '🏥', grupo: 'desenvolvimento' },
  { id: 'RECUSOU_ALIMENTACAO', label: 'Recusou alimentação', emoji: '🍽️', grupo: 'desenvolvimento' },
] as const;
type ObservacaoIndividualTipo = typeof OBSERVACOES_INDIVIDUAIS_TIPOS[number]['id'];
interface ObsIndividualDiario {
  tipo: ObservacaoIndividualTipo;
  criancaIds: string[];
}

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

function pickDiaryPdfValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized && !['undefined', 'null'].includes(normalized.toLowerCase())) {
        return normalized;
      }
    }
  }
  return undefined;
}

function resolveDiaryProfessorName(entry: Record<string, any>, ctx: Record<string, any>, fallback: string) {
  return pickDiaryPdfValue(
    entry?.professorNome,
    entry?.teacherName,
    entry?.createdByUser?.nome,
    entry?.createdByUser?.name,
    ctx?.professorNome,
    ctx?.teacherName,
    ctx?.teacher,
    fallback,
  ) ?? fallback;
}

function resolveDiaryTurmaNome(entry: Record<string, any>, ctx: Record<string, any>, fallback?: string) {
  return pickDiaryPdfValue(
    entry?.turmaNome,
    entry?.classroomName,
    entry?.classroom?.name,
    ctx?.turmaNome,
    ctx?.classroomName,
    fallback,
    'Turma',
  ) ?? 'Turma';
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
    fatoresInfluenciaram: [] as string[],
    avaliacoesObjetivos: [] as Array<{ objectiveIndex: number; status: 'ATINGIDO' | 'EM_PROCESSO' | 'PRECISA_RETOMAR' | ''; observacao: string }>,
    adaptacoesRealizadas: '',
    ocorrencias: '',
    statusExecucaoPlano: '' as 'FEITO' | 'PARCIAL' | 'NAO_REALIZADO' | '',
    materiaisUtilizados: '',
    textoComplementarProfessor: '',
    objetivoAtingido: '' as 'SIM' | 'PARCIAL' | 'NAO' | '',
    oQueFuncionou: '',
    oQueNaoFuncionou: '',
    avaliacaoPlanoAula: '',
    observacoesIndividuais: [] as ObsIndividualDiario[],
  };
}

function getDiaryFormFromEntry(entry: DiaryEntry) {
  const ctx = entry.aiContext && typeof entry.aiContext === 'object' ? entry.aiContext as Record<string, any> : {};
  const date = getDiaryEntryDate(entry) || getPedagogicalToday();

  return {
    ...getInitialDiaryForm(date),
    date,
    acolhidaInicial: ctx.acolhidaInicial || '',
    climaEmocional: entry.climaEmocional || ctx.climaEmocional || 'BOM',
    momentoDestaque: entry.momentoDestaque || ctx.momentoDestaque || '',
    reflexaoPedagogica: entry.reflexaoPedagogica || ctx.reflexaoPedagogica || '',
    encaminhamentos: entry.encaminhamentos || ctx.encaminhamentos || '',
    presencas: entry.presencas ?? ctx.presencas ?? 0,
    ausencias: entry.ausencias ?? ctx.ausencias ?? 0,
    rotina: Array.isArray(ctx.rotina) && ctx.rotina.length > 0 ? ctx.rotina : ROTINA_PADRAO.map(r => ({ ...r })),
    microgestos: Array.isArray(entry.microgestos) && entry.microgestos.length > 0 ? entry.microgestos : (Array.isArray(ctx.microgestos) ? ctx.microgestos : []),
    criancasPresentes: Array.isArray(ctx.criancasPresentes) ? ctx.criancasPresentes : [],
    execucaoPlanejamento: ctx.execucaoPlanejamento || '',
    reacaoCriancas: ctx.reacaoCriancas || '',
    fatoresInfluenciaram: Array.isArray(ctx.fatoresInfluenciaram) ? ctx.fatoresInfluenciaram : [],
    avaliacoesObjetivos: Array.isArray(ctx.avaliacoesObjetivos) ? ctx.avaliacoesObjetivos : [],
    adaptacoesRealizadas: ctx.adaptacoesRealizadas || '',
    ocorrencias: ctx.ocorrencias || '',
    statusExecucaoPlano: ctx.statusExecucaoPlano || '',
    materiaisUtilizados: ctx.materiaisUtilizados || '',
    textoComplementarProfessor: ctx.textoComplementarProfessor || '',
    objetivoAtingido: ctx.objetivoAtingido || '',
    oQueFuncionou: ctx.oQueFuncionou || '',
    oQueNaoFuncionou: ctx.oQueNaoFuncionou || '',
    avaliacaoPlanoAula: ctx.avaliacaoPlanoAula || '',
    observacoesIndividuais: Array.isArray(ctx.observacoesIndividuais) ? ctx.observacoesIndividuais : [],
  };
}

function getInitialAvaliacaoIndividualForm() {
  return {
    childIds: [] as string[],
    marcacaoRapida: '',
    focoObservado: '',
    proximoPasso: '',
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

function getCriancaNome(crianca?: Crianca | null) {
  if (!crianca) return 'Criança';
  const nome = `${crianca.firstName ?? ''} ${crianca.lastName ?? ''}`.trim();
  return nome || 'Criança';
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
    camposExperiencia: pickPlanningList(obj, 'camposExperiencia', 'campos_de_experiencia'),
    campoExperiencia: pickPlanningText(obj, 'campoExperiencia', 'campo', 'campo_de_experiencia'),
    objetivoBNCC: pickPlanningText(obj, 'objetivoBNCC', 'objetivo_bncc'),
    objetivoCurriculo: pickPlanningText(obj, 'objetivoCurriculo', 'objetivoCurriculoDF', 'objetivo_curriculo'),
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

function normalizePlanningParagraphs(content?: string) {
  if (!content) return [] as string[];
  const normalized = content.replace(/\r/g, '').trim();
  if (!normalized) return [] as string[];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) return paragraphs;

  return normalized
    .split('\n')
    .map(part => part.trim())
    .filter(Boolean);
}

function getPlanningPreviewText(content?: string, maxLength = 240) {
  const normalized = (content ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trimEnd()}...`
    : normalized;
}

function isPlanningExpandable(content?: string, maxLength = 240) {
  const normalized = (content ?? '').replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength;
}

function PlanningTextSection({
  title,
  content,
  tone = 'indigo',
  expanded = false,
  onToggle,
}: {
  title: string;
  content?: string;
  tone?: 'indigo' | 'fuchsia';
  expanded?: boolean;
  onToggle?: () => void;
}) {
  if (!content?.trim()) return null;

  const paragraphs = normalizePlanningParagraphs(content);
  const expandable = isPlanningExpandable(content);
  const labelClassName = tone === 'fuchsia'
    ? 'text-[11px] font-semibold text-fuchsia-700 uppercase tracking-wide mb-1'
    : 'text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1';
  const textClassName = tone === 'fuchsia'
    ? 'text-sm text-fuchsia-950 leading-6 break-words'
    : 'text-sm text-indigo-900 leading-6 break-words';
  const buttonClassName = tone === 'fuchsia'
    ? 'text-xs font-semibold text-fuchsia-700 hover:text-fuchsia-900'
    : 'text-xs font-semibold text-indigo-700 hover:text-indigo-900';

  return (
    <div>
      <p className={labelClassName}>{title}</p>
      {expanded ? (
        <div className="space-y-2">
          {paragraphs.map((paragraph, index) => (
            <div key={`${title}-${index}`} className="rounded-lg border border-black/5 bg-white/60 px-3 py-2">
              <p className={`${textClassName} whitespace-pre-line`}>{paragraph}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className={`${textClassName} whitespace-pre-line`}>{getPlanningPreviewText(content)}</p>
      )}
      {expandable && onToggle && (
        <button type="button" onClick={onToggle} className={`mt-2 inline-flex items-center gap-1 ${buttonClassName}`}>
          {expanded ? 'Ver menos' : 'Ver mais'}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

function CompactChildMultiSelect({
  criancas,
  selecionadas,
  onChange,
  label = 'Criança(s) envolvida(s)',
  helperText,
  showSelectedChips = true,
}: {
  criancas: Crianca[];
  selecionadas: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  helperText?: string;
  showSelectedChips?: boolean;
}) {
  const criancasOrdenadas = criancas
    .slice()
    .sort((a, b) => getCriancaNome(a).localeCompare(getCriancaNome(b), 'pt-BR'));

  return (
    <div>
      <Label className="text-sm font-medium text-gray-700 mb-2 block">{label}</Label>
      {criancas.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Nenhuma criança cadastrada na turma</p>
      ) : (
        <div className="space-y-3">
          <select
            multiple
            value={selecionadas}
            onChange={e => {
              const ids = Array.from(e.target.selectedOptions).map(option => option.value);
              onChange(ids);
            }}
            className="w-full min-h-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {criancasOrdenadas.map(crianca => (
              <option key={crianca.id} value={crianca.id}>{getCriancaNome(crianca)}</option>
            ))}
          </select>
          {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
          {showSelectedChips && selecionadas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {criancasOrdenadas
                .filter(crianca => selecionadas.includes(crianca.id))
                .map(crianca => (
                  <button
                    key={crianca.id}
                    type="button"
                    onClick={() => onChange(selecionadas.filter(id => id !== crianca.id))}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100"
                    title={`Remover ${getCriancaNome(crianca)} da seleção`}
                  >
                    <span className="truncate max-w-[180px]">{getCriancaNome(crianca)}</span>
                    <span className="text-indigo-500">×</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
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

// ─── Componente Principal ─────────────────────────────────────────────────────────────
export default function DiarioBordoPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roles = normalizeRoles(user);
  const isDeveloper = roles.includes('DEVELOPER');
  // Coordenação e gestão: acesso somente leitura ao diário (audita, não preenche)
  const isApenasLeitura = !isDeveloper && (
    roles.includes('UNIDADE') ||
    roles.includes('STAFF_CENTRAL') ||
    roles.includes('MANTENEDORA')
  );
  const currentUserId = (user as any)?.id ?? (user as any)?.sub ?? '';
  const classroomIdFromQuery = searchParams.get('classroomId') ?? undefined;
  const childIdFromQuery = searchParams.get('childId') ?? undefined;
  const dateFromQuery = searchParams.get('date') ?? undefined;
  // PR 1: suporte a ?aba=novo para abrir diretamente no formulário de registro
  const abaFromQuery = searchParams.get('aba') as 'lista' | 'novo' | 'microgestos' | 'observacoes' | 'ocorrencias' | null;
  // Se vier com ?aba=novo (via calendário) ou com ?date= (via chamada), abrir direto no formulário
  const abaInicial: 'lista' | 'novo' | 'microgestos' | 'observacoes' | 'ocorrencias' =
    (abaFromQuery === 'novo' || (dateFromQuery && !abaFromQuery)) ? 'novo' : (abaFromQuery ?? 'lista');
  const [aba, setAba] = useState<'lista' | 'novo' | 'microgestos' | 'observacoes' | 'ocorrencias' | 'fotos'>(abaInicial);
  const [diarios, setDiarios] = useState<DiaryEntry[]>([]);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);
  const [obsIndividualAberta, setObsIndividualAberta] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // ── Estado do Calendário Mensal ──────────────────────────────────────────────
  const hojeStr = getPedagogicalToday();
  const [calMes, setCalMes] = useState<number>(() => new Date().getMonth());
  const [calAno, setCalAno] = useState<number>(() => new Date().getFullYear());
  // Painel lateral: diário selecionado ao clicar em dia com diário
  const [painelDiario, setPainelDiario] = useState<DiaryEntry | null>(null);
  // PR 141: ID do diário sendo editado — quando preenchido, salvarDiario usa PATCH em vez de POST
  const [diarioEditandoId, setDiarioEditandoId] = useState<string | null>(null);
  // AUDITORIA RETROATIVA: modal de justificativa obrigatória
  const [modalJustificativaAberto, setModalJustificativaAberto] = useState(false);
  const [justificativaRetroativa, setJustificativaRetroativa] = useState('');
  const [modalJustificativaTipo, setModalJustificativaTipo] = useState<'ocorrencia' | 'registro' | ''>('');
  const [pendingRetroativoAction, setPendingRetroativoAction] = useState<(() => void) | null>(null);

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
  const [turmaNomeAtual, setTurmaNomeAtual] = useState<string>('Turma');
  const [draftRegistry, setDraftRegistry] = useLocalStorage<Record<string, {
    form: ReturnType<typeof getInitialDiaryForm>;
    microgestoForm: { tipos: string[]; descricao: string; campo: string; horario: string; criancasSelecionadas: string[] };
    avaliacaoIndividualForm: ReturnType<typeof getInitialAvaliacaoIndividualForm>;
    savedAt: string;
  }>>('diario-bordo-drafts', {});
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
  const [expandedPlanningSections, setExpandedPlanningSections] = useState<Record<string, boolean>>({});
  const draftKey = `diario:${currentUserId || 'anon'}:${classroomId || classroomIdFromQuery || 'sem-turma'}:${form.date}`;
  const currentDraft = draftRegistry[draftKey] ?? null;

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
    // AUDITORIA: ocorrência retroativa exige justificativa
    if (isDataRetroativa(ocorrForm.eventDate)) {
      solicitarJustificativa('ocorrencia', () => executarSalvarOcorrencia());
      return;
    }
    await executarSalvarOcorrencia();
  }
  async function executarSalvarOcorrencia() {
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

  function updateAvaliacaoObjetivo(objectiveIndex: number, updates: Partial<{ status: 'ATINGIDO' | 'EM_PROCESSO' | 'PRECISA_RETOMAR' | ''; observacao: string }>) {
    setForm(current => {
      const atuais = Array.isArray(current.avaliacoesObjetivos) ? current.avaliacoesObjetivos : [];
      const existente = atuais.find(item => item.objectiveIndex === objectiveIndex) ?? { objectiveIndex, status: '', observacao: '' };
      const proximo = { ...existente, ...updates };

      return {
        ...current,
        avaliacoesObjetivos: [...atuais.filter(item => item.objectiveIndex !== objectiveIndex), proximo]
          .sort((a, b) => a.objectiveIndex - b.objectiveIndex),
      };
    });
  }

  function toggleFatorInfluenciou(fatorId: string) {
    setForm(current => ({
      ...current,
      fatoresInfluenciaram: current.fatoresInfluenciaram.includes(fatorId)
        ? current.fatoresInfluenciaram.filter(item => item !== fatorId)
        : [...current.fatoresInfluenciaram, fatorId],
    }));
  }

  async function salvarAvaliacaoIndividual() {
    if (avaliacaoIndividualForm.childIds.length === 0) {
      toast.error('Selecione pelo menos uma criança');
      return;
    }

    const marcacaoSelecionada = MARCACOES_RAPIDAS_CRIANCA.find(item => item.id === avaliacaoIndividualForm.marcacaoRapida);
    const observacaoLivre = avaliacaoIndividualForm.observacao.trim();
    const focoObservado = avaliacaoIndividualForm.focoObservado.trim();
    const proximoPasso = avaliacaoIndividualForm.proximoPasso.trim();
    const observacao = [
      marcacaoSelecionada ? `Marcação rápida: ${marcacaoSelecionada.label}` : '',
      focoObservado ? `Aspecto observado: ${focoObservado}` : '',
      observacaoLivre,
    ].filter(Boolean).join('\n');

    if (!observacao) {
      toast.error('Registre ao menos uma marcação ou observação individual');
      return;
    }
    if (!classroomId) {
      toast.error('Turma não identificada. Recarregue a página e tente novamente.');
      return;
    }

    setSavingAvaliacaoIndividual(true);
    try {
      const payloadBase = getInitialPlanningObservationForm(form.date);
      const resumoPlano = summarizePlanningObservation(planejamentoHoje?.title, observacaoLivre || observacao);
      const recommendations = [
        proximoPasso ? `Próximo passo: ${proximoPasso}` : '',
        form.reflexaoPedagogica.trim(),
      ].filter(Boolean).join('\n');
      const learningProgress = [
        marcacaoSelecionada ? `Marcação rápida: ${marcacaoSelecionada.label}` : '',
        focoObservado ? `Foco observado: ${focoObservado}` : '',
      ].filter(Boolean).join(' · ');

      await Promise.all(
        avaliacaoIndividualForm.childIds.map(childIdSelecionado =>
          http.post('/development-observations', {
            ...payloadBase,
            childId: childIdSelecionado,
            classroomId,
            date: `${form.date}T12:00:00.000Z`,
            behaviorDescription: observacao,
            planningParticipation: resumoPlano,
            ...(learningProgress ? { learningProgress } : {}),
            ...(recommendations ? { recommendations } : {}),
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
      setTurmaNomeAtual(turmaInicial.name || 'Turma');

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
      const res = await http.get('/diary-events', {
        params: {
          limit: '50',
          type: 'ATIVIDADE_PEDAGOGICA',
          pedagogicalOnly: 'true',
        },
      });
      const d = res.data;
      const raw: any[] = Array.isArray(d) ? d : d?.data ?? [];
      const semFimDeSemana = raw.filter((item: any) => {
        const dataStr = (item.eventDate || item.date || item.createdAt || '').substring(0, 10);
        if (!dataStr) return false;
        const diaSemana = new Date(`${dataStr}T12:00:00`).getDay();
        return diaSemana !== 0 && diaSemana !== 6;
      });
      // BUG B FIX: O modelo DiaryEvent não possui campos raiz presencas/ausencias.
      // Esses valores são persistidos dentro do campo JSONB aiContext.
      // Mapear aiContext para campos raiz para exibição consistente na lista.
      const mapped = semFimDeSemana.map((item: any) => {
        const ctx = item.aiContext && typeof item.aiContext === 'object' ? item.aiContext : {};
        return {
          ...item,
          presencas: item.presencas ?? ctx.presencas ?? ctx.presentes ?? 0,
          ausencias: item.ausencias ?? ctx.ausencias ?? ctx.ausentes ?? 0,
          climaEmocional: item.climaEmocional ?? ctx.climaEmocional ?? '',
          momentoDestaque: item.momentoDestaque ?? ctx.momentoDestaque ?? item.description ?? '',
          reflexaoPedagogica: item.reflexaoPedagogica ?? ctx.reflexaoPedagogica ?? item.developmentNotes ?? '',
          // FIX P4-2: mapear observations (campo do backend) para encaminhamentos (campo do frontend)
          encaminhamentos: item.encaminhamentos ?? ctx.encaminhamentos ?? item.observations ?? '',
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

  // ─── Fechar painel de observações individuais ao clicar fora ───────────────
  useEffect(() => {
    if (!obsIndividualAberta) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-obs-panel]')) setObsIndividualAberta(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [obsIndividualAberta]);

  // ─── Geração de Avaliação do Plano de Aula via Gemini ──────────────────────
  async function gerarAvaliacaoIA() {
    setGerandoIA(true);
    try {
      const payload = {
        planejamentoTitulo: planejamentoHoje?.title ?? '',
        statusExecucaoPlano: form.statusExecucaoPlano || undefined,
        execucaoPlanejamento: form.execucaoPlanejamento || undefined,
        reacaoCriancas: form.reacaoCriancas || undefined,
        fatoresInfluenciaram: form.fatoresInfluenciaram.length ? form.fatoresInfluenciaram : undefined,
        avaliacoesObjetivos: form.avaliacoesObjetivos.filter(o => o.status).length
          ? form.avaliacoesObjetivos.filter(o => o.status)
          : undefined,
        adaptacoesRealizadas: form.adaptacoesRealizadas || undefined,
        materiaisUtilizados: form.materiaisUtilizados || undefined,
        ocorrencias: form.ocorrencias || undefined,
        reflexaoPedagogica: form.reflexaoPedagogica || undefined,
        textoComplementarProfessor: form.textoComplementarProfessor || undefined,
        camposExperiencia: planningCamposExperiencia.length ? planningCamposExperiencia : undefined,
        observacoesIndividuais: (form.observacoesIndividuais ?? []).length > 0
          ? form.observacoesIndividuais.map(o => ({
              tipo: o.tipo,
              label: OBSERVACOES_INDIVIDUAIS_TIPOS.find(t => t.id === o.tipo)?.label ?? o.tipo,
              quantidadeCriancas: o.criancaIds.length,
            }))
          : undefined,
      };
      const res = await http.post<{ avaliacao: string }>('/diary-events/generate-avaliacao', payload);
      setForm(f => ({ ...f, avaliacaoPlanoAula: res.data.avaliacao }));
      toast.success('Avaliação gerada com sucesso! Revise e edite se necessário.');
    } catch (err: any) {
      toast.error(extractErrorMessage(err, 'Erro ao gerar avaliação. Verifique se a IA está configurada.'));
    } finally {
      setGerandoIA(false);
    }
  }

  function salvarRascunhoDiario() {
    setDraftRegistry({
      ...draftRegistry,
      [draftKey]: {
        form,
        microgestoForm,
        avaliacaoIndividualForm,
        savedAt: new Date().toISOString(),
      },
    });
    toast.success('Rascunho salvo com sucesso. Você pode continuar depois.');
  }

  function continuarRascunhoDiario() {
    if (!currentDraft) {
      toast.error('Nenhum rascunho disponível para esta turma e data.');
      return;
    }

    setForm({ ...getInitialDiaryForm(dateFromQuery), ...currentDraft.form, date: currentDraft.form?.date || form.date });
    setMicrogestoForm({ ...currentDraft.microgestoForm });
    setAvaliacaoIndividualForm({ ...getInitialAvaliacaoIndividualForm(), ...currentDraft.avaliacaoIndividualForm });
    setAba('novo');
    toast.success('Rascunho carregado para continuar a edição.');
  }

  function descartarRascunhoDiario() {
    if (!currentDraft) {
      toast.error('Nenhum rascunho disponível para descartar.');
      return;
    }

    const nextDraftRegistry = { ...draftRegistry };
    delete nextDraftRegistry[draftKey];
    setDraftRegistry(nextDraftRegistry);
    toast.success('Rascunho descartado.');
  }

  function isDataRetroativa(data: string): boolean {
    return data < getPedagogicalToday();
  }
  function solicitarJustificativa(
    tipo: 'ocorrencia' | 'registro',
    acao: () => void,
  ) {
    setModalJustificativaTipo(tipo);
    setJustificativaRetroativa('');
    setPendingRetroativoAction(() => acao);
    setModalJustificativaAberto(true);
  }
  async function confirmarJustificativa() {
    if (!justificativaRetroativa.trim()) {
      toast.error('A justificativa é obrigatória para esta edição auditada.');
      return;
    }
    pendingRetroativoAction?.();
    setModalJustificativaAberto(false);
    setJustificativaRetroativa('');
    setPendingRetroativoAction(null);
  }

  async function salvarDiario() {
    if (!chamadaCarregada) {
      toast.error('Realize a Chamada do Dia antes de abrir e salvar o Diário do Dia.');
      return;
    }
    // GATE 2 (segurança produção): plano de aula aprovado obrigatório para publicação
    if (!planejamentoHoje) {
      toast.error(
        'Publicação bloqueada: nenhum plano de aula aprovado vinculado a hoje. ' +
        'Solicite à coordenação aprovar o planejamento antes de publicar o diário.',
      );
      return;
    }
    if (!form.momentoDestaque.trim() && !form.avaliacaoPlanoAula.trim() && !form.reflexaoPedagogica.trim()) {
      toast.error('Preencha pelo menos o Momento de Destaque ou a Avaliação do Plano de Aula.');
      return;
    }
    // EXECUÇÃO DO PLANEJAMENTO OBRIGATÓRIA:
    // Quando há planejamento aprovado/em execução vinculado ao dia,
    // o campo "O que foi executado?" é obrigatório.
    // Regra de negócio: o diário é o registro de execução do planejamento.
    if (planejamentoHoje && (form.statusExecucaoPlano === 'PARCIAL' || form.statusExecucaoPlano === 'NAO_REALIZADO') && !form.execucaoPlanejamento.trim()) {
      toast.error('Existe um planejamento aprovado para hoje. Descreva o que foi executado parcialmente ou o motivo de não realização.');
      return;
    }
    if (planejamentoHoje && !form.statusExecucaoPlano) {
      toast.error('Seleccione o status de execução do plano do dia: CUMPRIDO, PARCIAL ou NÃO REALIZADO.');
      return;
    }
    // GATE 3 (segurança produção): avaliação da execução obrigatória para publicação
    if (!form.avaliacaoPlanoAula.trim()) {
      toast.error(
        'Preencha a Avaliação do Plano de Aula antes de publicar. ' +
        'Use o botão "Gerar com IA" ou escreva diretamente no campo.',
      );
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
        toast.error('Turma ou aluno não identificado. Não é possível salvar o diário sem vínculo com uma turma ativa. Recarregue a página ou contate a coordenação.');
        setSaving(false);
        return;
      } else {
        // PR 141: payload compartilhado entre POST (novo) e PATCH (edição)
        const diarioPayload = {
          type: 'ATIVIDADE_PEDAGOGICA',
          title: form.momentoDestaque.substring(0, 100) || 'Diário de Bordo',
          description: form.reflexaoPedagogica || form.momentoDestaque || 'Diário de Bordo',
          eventDate: form.date + 'T12:00:00.000Z',
          childId,
          classroomId,
          status: 'PUBLICADO',
          ...(form.date < getPedagogicalToday() ? { retroactiveEdit: true, retroactiveNote: `Registro retroativo criado em ${new Date().toLocaleDateString('pt-BR')}` } : {}),
          ...(planejamentoHoje?.id ? { planningId: planejamentoHoje.id } : {}),
          observations: form.encaminhamentos,
          developmentNotes: form.reflexaoPedagogica,
          microgestos: form.microgestos,
          tags: [form.climaEmocional],
          presencas: presencasReais,
          ausencias: ausenciasReais,
          aiContext: {
            presencas: presencasReais,
            ausencias: ausenciasReais,
            climaEmocional: form.climaEmocional,
            acolhidaInicial: form.acolhidaInicial,
            momentoDestaque: form.momentoDestaque,
            reflexaoPedagogica: form.reflexaoPedagogica,
            rotina: form.rotina,
            criancasPresentes: form.criancasPresentes,
            planejamentoId: planejamentoHoje?.id ?? null,
            planejamentoTitulo: planejamentoHoje?.title ?? null,
            execucaoPlanejamento: form.execucaoPlanejamento,
            reacaoCriancas: form.reacaoCriancas,
            fatoresInfluenciaram: form.fatoresInfluenciaram,
            avaliacoesObjetivos: form.avaliacoesObjetivos,
            adaptacoesRealizadas: form.adaptacoesRealizadas,
            ocorrencias: form.ocorrencias,
            statusExecucaoPlano: form.statusExecucaoPlano || null,
            materiaisUtilizados: form.materiaisUtilizados || null,
            textoComplementarProfessor: form.textoComplementarProfessor || null,
            objetivoAtingido: form.objetivoAtingido || null,
            oQueFuncionou: form.oQueFuncionou || null,
            oQueNaoFuncionou: form.oQueNaoFuncionou || null,
            avaliacaoPlanoAula: form.avaliacaoPlanoAula || null,
            observacoesIndividuais: (form.observacoesIndividuais ?? []).length > 0 ? form.observacoesIndividuais : null,
            planejamentoObjetivos: planejamentoHoje?.objetivosMatriz ?? null,
            planejamentoAtividade: planejamentoHoje?.activities ?? null,
            planejamentoRecursos: planejamentoHoje?.recursos ?? null,
            turmaNome: turmaNomeAtual || null,
            professorNome: (user as any)?.nome ?? (user as any)?.firstName ?? null,
            criancas: criancas.map(c => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
            })),
          },
        };
        // PR 141: se há um ID de diário sendo editado, usar PATCH; caso contrário, POST
        if (diarioEditandoId) {
          const resPatch = await http.patch(`/diary-events/${diarioEditandoId}`, diarioPayload);
          if (!resPatch.data?.id) {
            throw new Error('O servidor não confirmou a atualização do diário. Tente novamente.');
          }
        } else {
          const resPost = await http.post('/diary-events', diarioPayload);
          if (!resPost.data?.id) {
            throw new Error('O servidor não confirmou o registro do diário. Tente novamente.');
          }
        }
      }
      toast.success('Diário de Bordo salvo! Abrindo versão para impressão...');
      // Gerar PDF imediatamente após salvar
      const nomeProfessor = (user as any)?.nome ?? (user as any)?.firstName ?? 'Professor(a)';
      // Buscar nome da turma via lookup (já disponível na URL ou no classroomId)
      let turmaNomeResolvido = 'Turma';
      try {
        const turmasRes2 = await http.get('/lookup/classrooms/accessible');
        const turmas2: any[] = Array.isArray(turmasRes2.data) ? turmasRes2.data : [];
        const turmaAtual = turmas2.find((t: any) => t.id === classroomId);
        if (turmaAtual?.name) turmaNomeResolvido = turmaAtual.name;
      } catch { /* usa fallback */ }
      const pdfData: DiaryPrintData = {
        data: form.date,
        turmaNome: turmaNomeResolvido || turmaNomeAtual,
        professorNome: nomeProfessor,
        planejamentoTitulo: planejamentoHoje?.title,
        planejamentoAtividade: planejamentoHoje?.activities,
        planejamentoRecursos: planejamentoHoje?.recursos,
        planejamentoObjetivos: planejamentoHoje?.objetivosMatriz as any,
        statusExecucaoPlano: form.statusExecucaoPlano || undefined,
        execucaoPlanejamento: form.execucaoPlanejamento || undefined,
        avaliacaoPlanoAula: form.avaliacaoPlanoAula || undefined,
        momentoDestaque: form.momentoDestaque || undefined,
        reflexaoPedagogica: form.reflexaoPedagogica || undefined,
        // FIX P4-2: incluir encaminhamentos no payload do PDF (campo observations no backend)
        encaminhamentos: form.encaminhamentos || undefined,
        presencas: presencasReais,
        ausencias: ausenciasReais,
        totalAlunos: criancas.length || undefined,
        climaEmocional: form.climaEmocional || undefined,
        rotina: form.rotina.reduce((acc, r) => { acc[r.momento] = r.concluido; return acc; }, {} as Record<string, boolean>),
        observacoesIndividuais: (form.observacoesIndividuais ?? []) as any,
        criancas: criancas.map(c => ({ id: c.id, firstName: c.firstName, lastName: c.lastName })),
      };
      abrirDiarioImprimivel(pdfData);
      const nextDraftRegistry = { ...draftRegistry };
      delete nextDraftRegistry[draftKey];
      setDraftRegistry(nextDraftRegistry);
      setAba('lista');
      loadDiarios();
      setForm(getInitialDiaryForm(dateFromQuery));
      setMicrogestoForm({ tipos: ['ESCUTA'], descricao: '', campo: 'eu-outro-nos', horario: '', criancasSelecionadas: [] });
      setAvaliacaoIndividualForm(getInitialAvaliacaoIndividualForm());
      // PR 141: limpar o ID de edição após salvar com sucesso
      setDiarioEditandoId(null);
    } catch (err: any) {
      toast.error(extractErrorMessage(err, 'Erro ao salvar diário'));
    } finally {
      setSaving(false);
    }
  }

  const diariosFiltrados = diarios.filter(d => {
    const ctx = d.aiContext && typeof d.aiContext === 'object' ? d.aiContext as any : {};

    if (filtroBusca.trim()) {
      const q = filtroBusca.toLowerCase();
      const nomesObservacoes = (ctx.observacoesIndividuais ?? []).flatMap((o: any) =>
        (o.criancaIds ?? []).map((id: string) => {
          const crianca = criancas.find(c => c.id === id);
          return crianca ? `${crianca.firstName ?? ''} ${crianca.lastName ?? ''}`.trim() : '';
        })
      );
      const texto = [
        d.momentoDestaque || '',
        d.reflexaoPedagogica || '',
        ctx.momentoDestaque || '',
        ctx.reflexaoPedagogica || '',
        ctx.avaliacaoPlanoAula || '',
        ctx.turmaNome || '',
        ...nomesObservacoes,
        ...(ctx.microgestos ?? []).map((m: any) => m.descricao ?? ''),
      ].join(' ').toLowerCase();
      const dataStr = (d.date || d.createdAt || '').substring(0, 10);
      if (!texto.includes(q) && !dataStr.includes(q)) return false;
    }

    if (filtroTipo) {
      const status = (d.status || '').toUpperCase();
      if (filtroTipo === 'PUBLICADO' && !['PUBLICADO', 'REVISADO', 'ARQUIVADO'].includes(status)) return false;
      if (filtroTipo === 'RASCUNHO' && status !== 'RASCUNHO') return false;
      if (filtroTipo === 'OCORRENCIA') {
        const temOcorrencia = (ctx.ocorrencias ?? []).length > 0 || (d as any).type === 'OCORRENCIA';
        if (!temOcorrencia) return false;
      }
    }

    if (filtroDataInicio) {
      const dataD = (d.date || d.createdAt || '').substring(0, 10);
      if (dataD < filtroDataInicio) return false;
    }

    if (filtroDataFim) {
      const dataD = (d.date || d.createdAt || '').substring(0, 10);
      if (dataD > filtroDataFim) return false;
    }

    return true;
  });

  const planningObjectiveCards = (planejamentoHoje?.objetivosMatriz ?? [])
    .map((obj, index) => ({ index, ...getObjectiveCardFields(obj as Record<string, any>) }))
    .filter(card => hasObjectiveCardContent(card, undefined, undefined));

  const planningCamposExperiencia = Array.from(new Set([
    ...(planejamentoHoje?.camposExperiencia ?? []),
    ...planningObjectiveCards.flatMap(card => card.camposExperiencia),
    ...planningObjectiveCards
      .map(card => card.campoExperiencia)
      .filter((campo): campo is string => Boolean(campo && campo.trim())),
  ].map(campo => campo.trim()).filter(Boolean)));

  const planningIntencionalidades = Array.from(new Set([
    ...planningObjectiveCards
      .map(card => card.intencionalidade)
      .filter((item): item is string => Boolean(item && item.trim())),
    ...(planejamentoHoje?.intencionalidadeGeral?.trim() ? [planejamentoHoje.intencionalidadeGeral.trim()] : []),
  ]));

  // FIX P4-1: Detectar se já existe diário PUBLICADO para a data do formulário.
  // Quando verdadeiro, o formulário de novo diário deve ocultar as ações de rascunho/guardar
  // e exibir apenas o modo leitura/edição segura, evitando duplicação ou sobrescrita acidental.
  const diarioPublicadoParaData = diarios.find(d => {
    return getDiaryEntryDate(d) === form.date && isPublishedDiaryStatus(d.status);
  }) ?? null;

  useEffect(() => {
    if (aba !== 'novo' || diarioEditandoId || !diarioPublicadoParaData) return;
    setPainelDiario(diarioPublicadoParaData);
    setAba('lista');
  }, [aba, diarioEditandoId, diarioPublicadoParaData]);

  return (
    <>
    {modalJustificativaAberto && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold text-gray-800">
              Justificativa Obrigatória
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            {modalJustificativaTipo === 'ocorrencia'
              ? 'Alterar ocorrências retroativamente exige justificativa registrada em auditoria.'
              : 'Alterar registros importantes retroativamente exige justificativa registrada.'}
          </p>
          <Textarea
            value={justificativaRetroativa}
            onChange={e => setJustificativaRetroativa(e.target.value)}
            placeholder="Descreva o motivo da alteração retroativa..."
            className="min-h-24 text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm"
              onClick={() => {
                setModalJustificativaAberto(false);
                setPendingRetroativoAction(null);
              }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={confirmarJustificativa}
              className="bg-amber-600 hover:bg-amber-700 text-white">
              Confirmar e Salvar
            </Button>
          </div>
        </div>
      </div>
    )}
    <PageShell title="Diário da Turma" subtitle="Registre o dia pedagógico, microgestos e reflexões sobre a prática docente">
      {/* PR 1: Breadcrumb e navegação de volta ao calendário */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 -mt-4 mb-4">
        <button
          onClick={() => navigate('/app/teacher-dashboard')}
          className="hover:text-gray-800 transition-colors"
        >
          Central da Turma
        </button>
        <ChevronRight className="h-3 w-3" />
        <button
          onClick={() => navigate('/app/diario-calendario')}
          className="hover:text-gray-800 transition-colors"
        >
          Diário da Turma
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-800 font-medium">
          {aba === 'novo' ? 'Registrar Dia' : aba === 'lista' ? 'Histórico' : aba === 'ocorrencias' ? 'Ocorrências' : aba === 'observacoes' ? 'Observações' : 'Microgestos'}
        </span>
      </nav>
      {/* Botão voltar ao calendário (visível quando veio do calendário via ?aba=novo) */}
      {abaFromQuery === 'novo' && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/diario-calendario')}
            className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Calendário
          </Button>
        </div>
      )}
      {/* Abas */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {[
          { id: 'lista', label: 'Meus Diários', icon: <BookOpen className="h-4 w-4" /> },
          { id: 'novo', label: 'Diário do Dia', icon: <Plus className="h-4 w-4" />, onClickOverride: () => {
            // Se já existe diário salvo para hoje, mostrar no painel lateral
            const hoje = new Date().toISOString().split('T')[0];
            const diarioHoje = diarios.find((d: any) => {
              const dataStr = (d.date || d.createdAt || '').substring(0, 10);
              return dataStr === hoje;
            });
            if (diarioHoje) {
              setPainelDiario(diarioHoje as any);
              setAba('lista');
            } else {
              setPainelDiario(null);
              // PR 141: garantir que não há ID de edição residual ao criar novo
              setDiarioEditandoId(null);
              setAba('novo');
            }
          }},
          { id: 'ocorrencias', label: 'Ocorrências', icon: <TriangleAlert className="h-4 w-4" /> },
          { id: 'observacoes', label: 'Observações Individuais', icon: <Brain className="h-4 w-4" /> },
          { id: 'microgestos', label: 'O que são Microgestos?', icon: <Sparkles className="h-4 w-4" /> },
          { id: 'fotos', label: 'Fotos da Turma', icon: <Camera className="h-4 w-4" /> },
        ].filter(tab => {
          if (!isApenasLeitura) return true;
          // Coordenação/Gestão: apenas leitura — ocultar abas de criação
          return tab.id === 'lista';
        }).map(tab => (
          <button key={tab.id} onClick={() => (tab as any).onClickOverride ? (tab as any).onClickOverride() : setAba(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${aba === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── LISTA DE DIÁRIOS (CALENDÁRIO MENSAL) ─── */}
      {aba === 'lista' && (() => {
        // Mapear diários para o formato de eventos do CalendarioMensal
        const eventosCalendario: CalendarioMensalEvento[] = diarios.map(d => {
          const dataStr = (d.date || d.createdAt || '').substring(0, 10);
          const statusRaw = (d.status || '').toUpperCase();
          let status: CalendarioMensalEvento['status'];
          if (statusRaw === 'PUBLICADO' || statusRaw === 'REVISADO' || statusRaw === 'ARQUIVADO') {
            status = 'publicado';
          } else if (statusRaw === 'APROVADO') {
            status = 'aprovado';
          } else if (statusRaw === 'EM_REVISAO') {
            status = 'em_revisao';
          } else {
            status = 'rascunho';
          }
          return { data: dataStr, status };
        });

        // Mapa data → diário completo para o painel lateral
        const diarioMap = new Map<string, DiaryEntry>();
        for (const d of diarios) {
          const dataStr = (d.date || d.createdAt || '').substring(0, 10);
          if (dataStr) diarioMap.set(dataStr, d);
        }

        function handleDiaClick(data: string, evento?: CalendarioMensalEvento) {
          const diario = diarioMap.get(data);
          if (diario) {
            // Dia COM diário: abrir painel lateral
            setPainelDiario(diario);
          } else {
            // Dia SEM diário (passado/hoje): navegar para formulário de criação
            setPainelDiario(null);
            // PR 141: garantir que não há ID de edição residual ao criar novo
            setDiarioEditandoId(null);
            setForm(f => ({ ...f, date: data }));
            setAba('novo');
          }
        }

        return (
          <div className="space-y-4">
            {/* Barra de ações */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/app/diario/historico')}
                    className="flex items-center gap-2 text-gray-600 border-gray-200 hover:bg-gray-50"
                  >
                    <History className="h-4 w-4" /> Histórico completo
                  </Button>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar por aluno, conteúdo ou data..."
                          value={filtroBusca}
                          onChange={e => setFiltroBusca(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        {filtroBusca && (
                          <button
                            onClick={() => setFiltroBusca('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setMostrarFiltros(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors flex-shrink-0 ${
                          mostrarFiltros
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <BarChart2 className="h-4 w-4" />
                        Filtros
                        {(filtroTipo || filtroDataInicio || filtroDataFim) && (
                          <span className="w-2 h-2 bg-amber-400 rounded-full" />
                        )}
                      </button>
                    </div>

                    {mostrarFiltros && (
                      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <select
                          value={filtroTipo}
                          onChange={e => setFiltroTipo(e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                        >
                          <option value="">Todos os tipos</option>
                          <option value="PUBLICADO">Publicados</option>
                          <option value="RASCUNHO">Rascunhos</option>
                          <option value="OCORRENCIA">Com ocorrências</option>
                        </select>
                        <input
                          type="date"
                          value={filtroDataInicio}
                          onChange={e => setFiltroDataInicio(e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                          placeholder="De"
                        />
                        <input
                          type="date"
                          value={filtroDataFim}
                          onChange={e => setFiltroDataFim(e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                          placeholder="Até"
                        />
                        {(filtroTipo || filtroDataInicio || filtroDataFim) && (
                          <button
                            onClick={() => { setFiltroTipo(''); setFiltroDataInicio(''); setFiltroDataFim(''); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Limpar filtros
                          </button>
                        )}
                      </div>
                    )}

                    {(filtroBusca || filtroTipo || filtroDataInicio || filtroDataFim) && (
                      <p className="text-xs text-gray-500 px-1">
                        {diariosFiltrados.length} resultado{diariosFiltrados.length !== 1 ? 's' : ''} encontrado{diariosFiltrados.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <Button onClick={() => {
                  setDiarioEditandoId(null);
                  setForm(getInitialDiaryForm(getPedagogicalToday()));
                  setAba('novo');
                }} size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Novo Diário
                </Button>
              </div>

            </div>

            {loading && <LoadingState message="Carregando diários..." />}

            {!loading && (
              <div className="flex flex-col lg:flex-row gap-4 items-start">
                {/* Calendário */}
                <div className="w-full lg:max-w-sm flex-shrink-0">
                  <CalendarioMensal
                    mes={calMes}
                    ano={calAno}
                    eventos={eventosCalendario}
                    onDiaClick={handleDiaClick}
                    hoje={hojeStr}
                    onMesAnterior={() => {
                      if (calMes === 0) { setCalMes(11); setCalAno(a => a - 1); }
                      else setCalMes(m => m - 1);
                    }}
                    onProximoMes={() => {
                      if (calMes === 11) { setCalMes(0); setCalAno(a => a + 1); }
                      else setCalMes(m => m + 1);
                    }}
                  />
                </div>

                {/* Painel lateral: visualização do diário selecionado */}
                <div className="flex-1 min-w-0">
                  {painelDiario ? (
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                      {/* Cabeçalho do painel */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const clima = CLIMAS.find(c => c.id === painelDiario.climaEmocional) || CLIMAS[1];
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${clima.cor}`}>
                                {clima.emoji} {clima.label}
                              </span>
                            );
                          })()}
                          <span className="text-sm font-semibold text-gray-800">
                            {new Date(
                              ((painelDiario.date || painelDiario.createdAt) || '').includes('T')
                                ? (painelDiario.date || painelDiario.createdAt)
                                : (painelDiario.date || painelDiario.createdAt) + 'T12:00:00'
                            ).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                          </span>
                        </div>
                        <button
                          onClick={() => setPainelDiario(null)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
                          aria-label="Fechar painel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Conteúdo do diário */}
                      <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
                        {/* Presenças */}
                        {(painelDiario.presencas > 0 || painelDiario.ausencias > 0) && (
                          <div className="flex gap-3 text-xs text-gray-500">
                            {painelDiario.presencas > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 text-green-500" />{painelDiario.presencas} presentes
                              </span>
                            )}
                            {painelDiario.ausencias > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 text-red-400" />{painelDiario.ausencias} ausentes
                              </span>
                            )}
                          </div>
                        )}

                        {/* Microgestos */}
                        {painelDiario.microgestos?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Microgestos Pedagógicos</p>
                            <div className="space-y-2">
                              {painelDiario.microgestos.map((m: any, i: number) => {
                                const tipo = TIPOS_MICROGESTO.find(t => t.id === m.tipo);
                                return (
                                  <div key={i} className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
                                    <span className="text-base flex-shrink-0">{tipo?.emoji || '✨'}</span>
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-purple-700">{tipo?.label || m.tipo}</p>
                                      <p className="text-xs text-gray-600">{m.descricao}</p>
                                      {m.criancaNome && (
                                        <p className="text-xs text-gray-500 mt-0.5">{m.criancaNome}</p>
                                      )}
                                    </div>
                                    {m.horario && <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{m.horario}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Rotina */}
                        {painelDiario.rotina?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Rotina do Dia</p>
                            <div className="grid grid-cols-2 gap-2">
                              {painelDiario.rotina.map((r: any, i: number) => (
                                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${r.concluido ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                                  <CheckCircle className={`h-3.5 w-3.5 flex-shrink-0 ${r.concluido ? 'text-green-500' : 'text-gray-300'}`} />
                                  {r.momento}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Momento Destaque */}
                        {painelDiario.momentoDestaque && (
                          <div className="bg-yellow-50 rounded-xl p-3">
                            <p className="text-xs font-semibold text-yellow-600 uppercase mb-1">Momento Destaque</p>
                            <p className="text-sm text-yellow-800">{painelDiario.momentoDestaque}</p>
                          </div>
                        )}

                        {/* Reflexão Pedagógica */}
                        {painelDiario.reflexaoPedagogica && (
                          <div className="bg-indigo-50 rounded-xl p-3">
                            <p className="text-xs font-semibold text-indigo-500 uppercase mb-1">Reflexão Pedagógica</p>
                            <p className="text-sm text-indigo-700">{painelDiario.reflexaoPedagogica}</p>
                          </div>
                        )}

                        {/* Encaminhamentos */}
                        {painelDiario.encaminhamentos && (
                          <div className="bg-orange-50 rounded-xl p-3">
                            <p className="text-xs font-semibold text-orange-500 uppercase mb-1">Encaminhamentos</p>
                            <p className="text-sm text-orange-700">{painelDiario.encaminhamentos}</p>
                          </div>
                        )}

                        {/* Botões: Editar e Imprimir */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setForm(getDiaryFormFromEntry(painelDiario));
                              setDiarioEditandoId(painelDiario.id);
                              setPainelDiario(null);
                              setAba('novo');
                             }}
                             className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
                           >
                             ✏️ Editar
                          </button>
                          {isDeveloper && (
                            <button
                              onClick={async () => {
                                if (!window.confirm('Apagar este diário permanentemente? Esta ação não pode ser desfeita.')) return;
                                try {
                                  await http.delete(`/diary-events/${painelDiario.id}`);
                                  toast.success('Diário apagado.');
                                  setPainelDiario(null);
                                  loadDiarios();
                                } catch (err: any) {
                                  toast.error(err?.response?.data?.message || 'Erro ao apagar diário.');
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                            >
                              🗑️ Apagar
                            </button>
                          )}
                          </div>
                          <button
                            onClick={() => {
                              const ctx = painelDiario.aiContext && typeof painelDiario.aiContext === 'object' ? painelDiario.aiContext : {};
                              const nomeProfessor = resolveDiaryProfessorName(painelDiario as any, ctx as Record<string, any>, (user as any)?.nome ?? (user as any)?.firstName ?? 'Professor(a)');
                              const turmaNomePdf = resolveDiaryTurmaNome(painelDiario as any, ctx as Record<string, any>, turmaNomeAtual);
                              const dataStr = (painelDiario.date || painelDiario.createdAt || '').substring(0, 10);
                              abrirDiarioImprimivel({
                                data: dataStr,
                                turmaNome: turmaNomePdf,
                                professorNome: nomeProfessor,
                                planejamentoTitulo: ctx.planejamentoTitulo,
                                statusExecucaoPlano: ctx.statusExecucaoPlano,
                                execucaoPlanejamento: ctx.execucaoPlanejamento,
                                avaliacaoPlanoAula: ctx.avaliacaoPlanoAula,
                                momentoDestaque: painelDiario.momentoDestaque || ctx.momentoDestaque,
                                 reflexaoPedagogica: painelDiario.reflexaoPedagogica || ctx.reflexaoPedagogica,
                                 // FIX P4-2: incluir encaminhamentos no PDF do painel lateral
                                 encaminhamentos: (painelDiario as any).encaminhamentos || ctx.encaminhamentos || (painelDiario as any).observations || undefined,
                                 presencas: painelDiario.presencas ?? ctx.presencas ?? 0,
                                 ausencias: painelDiario.ausencias ?? ctx.ausencias ?? 0,
                                 climaEmocional: painelDiario.climaEmocional || ctx.climaEmocional,
                                 rotina: (() => {
                                   const r = ctx.rotina;
                                   if (!r) return undefined;
                                   if (Array.isArray(r)) {
                                     return Object.fromEntries(
                                       (r as Array<{ momento: string; concluido: boolean }>)
                                         .map(item => [item.momento, item.concluido])
                                     );
                                   }
                                   return r as Record<string, boolean>;
                                 })(),
                                 observacoesIndividuais: ctx.observacoesIndividuais as any,
                                 criancas: (ctx.criancas as any[])?.length > 0
                                   ? ctx.criancas as any[]
                                   : criancas.map(c => ({ id: c.id, firstName: c.firstName, lastName: c.lastName })),
                                 planejamentoObjetivos: ((ctx as any).planejamentoObjetivos
                                   ?? (ctx as any).objetivosMatriz)
                                   || undefined,
                                 planejamentoAtividade: (ctx as any).planejamentoAtividade
                                   || (ctx as any).activities || undefined,
                                 planejamentoRecursos: (ctx as any).planejamentoRecursos
                                   || (ctx as any).recursos || undefined,
                               });
                             }}
                             className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                           >
                             <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
                           </button>
                         </div>
                       </div>
                     </div>
                   ) : (
                    <div className="flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/40 text-gray-400 gap-3">
                      <Calendar className="h-10 w-10 text-gray-300" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-500">Selecione um dia no calendário</p>
                        <p className="text-xs mt-0.5 text-gray-400">Dias com ponto colorido já possuem diário registrado</p>
                      </div>
                      {diarios.length > 0 && (
                        <button
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors"
                        >
                          <Printer className="h-3.5 w-3.5" /> Imprimir mês ({diarios.length} diários)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── LISTA HISTÓRICA (mantida para referência interna) ─── */}
      {false && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por data ou conteúdo..." className="pl-9" value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} />
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
                        {/* ── Avaliação do Plano de Aula ── */}
                        {(() => {
                          const ctx = diario.aiContext && typeof diario.aiContext === 'object' ? diario.aiContext as Record<string, any> : {};
                          const statusMap: Record<string, { label: string; color: string }> = {
                            cumprido: { label: '✅ Cumprido', color: 'text-green-700 bg-green-50 border border-green-200' },
                            parcial:  { label: '⚠️ Parcialmente cumprido', color: 'text-yellow-700 bg-yellow-50 border border-yellow-200' },
                            nao_realizado: { label: '❌ Não realizado', color: 'text-red-700 bg-red-50 border border-red-200' },
                          };
                          const statusExec = ctx.statusExecucaoPlano ? statusMap[ctx.statusExecucaoPlano] : null;
                          const hasBlock = ctx.planejamentoTitulo || statusExec || ctx.execucaoPlanejamento || ctx.avaliacaoPlanoAula || ctx.reacaoCriancas || ctx.materiaisUtilizados || ctx.adaptacoesRealizadas || ctx.textoComplementarProfessor || (ctx.fatoresInfluenciaram && ctx.fatoresInfluenciaram.length > 0);
                          if (!hasBlock) return null;
                          return (
                            <div className="border border-blue-100 rounded-xl p-4 space-y-3 bg-blue-50/40">
                              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Avaliação do Plano de Aula</p>
                              {ctx.planejamentoTitulo && (
                                <p className="text-sm font-medium text-gray-800">📋 {ctx.planejamentoTitulo}</p>
                              )}
                              {statusExec && (
                                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${statusExec.color}`}>{statusExec.label}</span>
                              )}
                              {ctx.execucaoPlanejamento && (
                                <div><p className="text-xs text-gray-500 mb-0.5">Como foi a execução do plano</p><p className="text-sm text-gray-700">{ctx.execucaoPlanejamento}</p></div>
                              )}
                              {ctx.avaliacaoPlanoAula && (
                                <div><p className="text-xs text-gray-500 mb-0.5">Avaliação do Plano de Aula (IA)</p><p className="text-sm text-gray-700">{ctx.avaliacaoPlanoAula}</p></div>
                              )}
                              {ctx.reacaoCriancas && (
                                <div><p className="text-xs text-gray-500 mb-0.5">Como a turma respondeu</p><p className="text-sm text-gray-700">{ctx.reacaoCriancas}</p></div>
                              )}
                              {ctx.fatoresInfluenciaram && ctx.fatoresInfluenciaram.length > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Fatores que influenciaram</p>
                                  <div className="flex flex-wrap gap-1">
                                    {(ctx.fatoresInfluenciaram as string[]).map((f: string) => {
                                      const fator = FATORES_QUE_INFLUENCIARAM.find(x => x.id === f);
                                      return <span key={f} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{fator?.label ?? f}</span>;
                                    })}
                                  </div>
                                </div>
                              )}
                              {ctx.materiaisUtilizados && (
                                <div><p className="text-xs text-gray-500 mb-0.5">Materiais utilizados</p><p className="text-sm text-gray-700">{ctx.materiaisUtilizados}</p></div>
                              )}
                              {ctx.adaptacoesRealizadas && (
                                <div><p className="text-xs text-gray-500 mb-0.5">Adaptações realizadas</p><p className="text-sm text-gray-700">{ctx.adaptacoesRealizadas}</p></div>
                              )}
                              {ctx.textoComplementarProfessor && (
                                <div><p className="text-xs text-gray-500 mb-0.5">Texto complementar</p><p className="text-sm text-gray-700">{ctx.textoComplementarProfessor}</p></div>
                              )}
                            </div>
                          );
                        })()}
                        {/* ── Reflexão Pedagógica ── */}
                        {diario.reflexaoPedagogica && (
                          <div className="bg-indigo-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-indigo-500 uppercase mb-1">Reflexão Pedagógica</p>
                            <p className="text-sm text-indigo-700">{diario.reflexaoPedagogica}</p>
                          </div>
                        )}
                        {/* ── Fechamento Geral do Dia ── */}
                        {(() => {
                          const ctx = diario.aiContext && typeof diario.aiContext === 'object' ? diario.aiContext as Record<string, any> : {};
                          const hasFechamento = ctx.oQueFuncionou || ctx.oQueNaoFuncionou || ctx.objetivoAtingido;
                          if (!hasFechamento) return null;
                          return (
                            <div className="border border-emerald-100 rounded-xl p-4 space-y-3 bg-emerald-50/40">
                              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Fechamento Geral do Dia</p>
                              {ctx.oQueFuncionou && (
                                <div><p className="text-xs text-gray-500 mb-0.5">O que funcionou</p><p className="text-sm text-gray-700">{ctx.oQueFuncionou}</p></div>
                              )}
                              {ctx.oQueNaoFuncionou && (
                                <div><p className="text-xs text-gray-500 mb-0.5">O que não funcionou</p><p className="text-sm text-gray-700">{ctx.oQueNaoFuncionou}</p></div>
                              )}
                              {ctx.objetivoAtingido && (
                                <div><p className="text-xs text-gray-500 mb-0.5">Objetivo atingido</p><p className="text-sm text-gray-700">{ctx.objetivoAtingido}</p></div>
                              )}
                            </div>
                          );
                        })()}
                        {/* ── Observações Individuais ── */}
                        {(() => {
                          const ctx = diario.aiContext && typeof diario.aiContext === 'object' ? diario.aiContext as Record<string, any> : {};
                          const obs: any[] = Array.isArray(ctx.observacoesIndividuais) ? ctx.observacoesIndividuais : [];
                          if (obs.length === 0) return null;
                          return (
                            <div className="border border-violet-100 rounded-xl p-4 bg-violet-50/40">
                              <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-3">Observações Individuais ({obs.length})</p>
                              <div className="space-y-2">
                                {obs.map((o: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-violet-100">
                                    <UserCircle className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-violet-700 truncate">{o.criancaNome || o.childId || 'Criança'}</p>
                                      {o.marcacaoRapida && <span className="inline-block text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full mr-1">{o.marcacaoRapida}</span>}
                                      {o.focoObservado && <p className="text-xs text-gray-600 mt-0.5"><span className="font-medium">Foco:</span> {o.focoObservado}</p>}
                                      {o.observacao && <p className="text-xs text-gray-600 mt-0.5">{o.observacao}</p>}
                                      {o.proximoPasso && <p className="text-xs text-gray-500 mt-0.5"><span className="font-medium">Próximo passo:</span> {o.proximoPasso}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        {/* ── Encaminhamentos e Próximos Passos ── */}
                        {diario.encaminhamentos && (
                          <div className="bg-orange-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-orange-500 uppercase mb-1">Encaminhamentos e Próximos Passos</p>
                            <p className="text-sm text-orange-700">{diario.encaminhamentos}</p>
                          </div>
                        )}
                        {/* Botão de impressão do diário */}
                        <div className="flex justify-end pt-2 border-t border-gray-100">
                          <button
                            onClick={() => {
                              const ctx = diario.aiContext && typeof diario.aiContext === 'object' ? diario.aiContext : {};
                              const nomeProfessor = resolveDiaryProfessorName(diario as any, ctx as Record<string, any>, (user as any)?.nome ?? (user as any)?.firstName ?? 'Professor(a)');
                              const turmaNomePdf = resolveDiaryTurmaNome(diario as any, ctx as Record<string, any>, turmaNomeAtual);
                              const dataStr = (diario.date || diario.createdAt || '').substring(0, 10);
                              abrirDiarioImprimivel({
                                data: dataStr,
                                turmaNome: turmaNomePdf,
                                professorNome: nomeProfessor,
                                planejamentoTitulo: ctx.planejamentoTitulo,
                                statusExecucaoPlano: ctx.statusExecucaoPlano,
                                execucaoPlanejamento: ctx.execucaoPlanejamento,
                                avaliacaoPlanoAula: ctx.avaliacaoPlanoAula,
                                momentoDestaque: diario.momentoDestaque || ctx.momentoDestaque,
                                 reflexaoPedagogica: diario.reflexaoPedagogica || ctx.reflexaoPedagogica,
                                 // FIX P4-2: incluir encaminhamentos no PDF da lista histórica
                                 encaminhamentos: diario.encaminhamentos || ctx.encaminhamentos || (diario as any).observations || undefined,
                                 presencas: diario.presencas ?? ctx.presencas ?? 0,
                                 ausencias: diario.ausencias ?? ctx.ausencias ?? 0,
                                 climaEmocional: diario.climaEmocional || ctx.climaEmocional,
                                 rotina: (() => {
                                   const r = ctx.rotina;
                                   if (!r) return undefined;
                                   // Se já é Record<string,boolean> (novo formato)
                                   if (!Array.isArray(r)) return r as Record<string, boolean>;
                                   // Se é RotinaItem[] (formato antigo: {momento, concluido})
                                   return (r as any[]).reduce((acc: Record<string, boolean>, item: any) => {
                                     if (item?.momento) acc[item.momento] = Boolean(item.concluido);
                                     return acc;
                                   }, {});
                                 })(),
                                 observacoesIndividuais: ctx.observacoesIndividuais as any,
                                 criancas: (ctx.criancas as any[])?.length > 0
                                   ? ctx.criancas as any[]
                                   : criancas.map(c => ({ id: c.id, firstName: c.firstName, lastName: c.lastName })),
                                 planejamentoObjetivos: ((ctx as any).planejamentoObjetivos
                                   ?? (ctx as any).objetivosMatriz)
                                   || undefined,
                                 planejamentoAtividade: (ctx as any).planejamentoAtividade
                                   || (ctx as any).activities || undefined,
                                 planejamentoRecursos: (ctx as any).planejamentoRecursos
                                   || (ctx as any).recursos || undefined,
                               });
                             }}
                             className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                           >
                             <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
                          </button>
                        </div>
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
        <div className="space-y-5 max-w-4xl">
          {currentDraft && (
            <Card className="border border-emerald-200 bg-emerald-50/70 shadow-sm">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-900">Rascunho disponível para esta turma e data</p>
                  <p className="text-xs text-emerald-700">
                    Último salvamento: {new Date(currentDraft.savedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={continuarRascunhoDiario} className="border-emerald-300 text-emerald-800 hover:bg-emerald-100">
                    Continuar rascunho
                  </Button>
                  <Button type="button" variant="outline" onClick={descartarRascunhoDiario} className="border-red-200 text-red-700 hover:bg-red-50">
                    Descartar rascunho
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!chamadaCarregada && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">Chamada do Dia ainda não realizada</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Realize a Chamada Diária antes de guardar o Diário do Dia. As presenças serão importadas automaticamente após a chamada.
                </p>
                <button
                  onClick={() => navigate(`/app/chamada?classroomId=${classroomId}&date=${form.date}`)}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-colors w-fit"
                >
                  <CheckCircle className="h-4 w-4" />
                  Ir para Chamada Diária
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
                    const hoje = getPedagogicalToday();
                    const isRetroativo = form.date < hoje;
                    return (
                      <>
                        {(d === 0 || d === 6) && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Fim de semana — dia não letivo. Altere a data.
                          </p>
                        )}
                        {isRetroativo && d !== 0 && d !== 6 && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Edição retroativa — este diário será marcado como editado após a data original.
                          </p>
                        )}
                      </>
                    );
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
                {planningObjectiveCards.length > 0 ? (
                  <div className="rounded-xl border border-indigo-200 bg-white/80 p-3 sm:p-4 space-y-3">
                    <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Matriz Pedagógica do Dia</p>
                    <div className="space-y-3">
                      {planningObjectiveCards.map(card => {
                        const campoPrincipal = card.campoExperiencia?.trim() || card.camposExperiencia[0]?.trim() || 'Não cadastrado';
                        const objetivoBNCC = card.objetivoBNCC?.trim() || 'Não cadastrado';
                        const objetivoCurriculo = card.objetivoCurriculo?.trim() || 'Não cadastrado';
                        const intencionalidade = card.intencionalidade?.trim() || 'Não cadastrada';

                        return (
                          <div key={card.index} className="rounded-xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
                            <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between gap-2 flex-wrap">
                              <span className="inline-flex items-center rounded-full bg-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                                Objetivo {card.index + 1}
                              </span>
                            </div>
                            <div className="p-3 space-y-3">
                              <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2">
                                <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">Campo de Experiência</p>
                                <p className="text-sm text-indigo-900 whitespace-pre-line break-words leading-6">{campoPrincipal}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Objetivo da BNCC</p>
                                <p className="text-sm text-gray-900 whitespace-pre-line break-words leading-6">{objetivoBNCC}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold text-teal-600 uppercase tracking-wide mb-1">Objetivo do Currículo</p>
                                <p className="text-sm text-gray-900 whitespace-pre-line break-words leading-6">{objetivoCurriculo}</p>
                              </div>
                              <div className="rounded-lg border border-fuchsia-100 bg-fuchsia-50/70 px-3 py-2">
                                <p className="text-[11px] font-semibold text-fuchsia-700 uppercase tracking-wide mb-1">Intencionalidade Pedagógica</p>
                                <p className="text-sm text-fuchsia-950 whitespace-pre-line break-words leading-6">{intencionalidade}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    {planningCamposExperiencia.length > 0 && (
                      <div className="rounded-xl border border-indigo-200 bg-white/80 p-3 sm:p-4">
                        <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-2">Campo de Experiência</p>
                        <div className="flex flex-wrap gap-1.5">
                          {planningCamposExperiencia.map((campo, i) => (
                            <span key={i} className="max-w-full break-words rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-800">
                              {campo}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(planejamentoHoje.objectives || planningIntencionalidades.length > 0) && (
                      <div className="rounded-xl border border-indigo-200 bg-white/80 p-3 sm:p-4 space-y-3">
                        {planejamentoHoje.objectives && (
                          <div>
                            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Objetivo da BNCC / Currículo</p>
                            <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-3">
                              <p className="text-sm text-indigo-900 whitespace-pre-line break-words leading-6">{planejamentoHoje.objectives}</p>
                            </div>
                          </div>
                        )}
                        {planningIntencionalidades.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-[11px] font-semibold text-fuchsia-700 uppercase tracking-wide">Intencionalidade Pedagógica</p>
                            {planningIntencionalidades.map((intencionalidade, index) => {
                              const sectionKey = `intencionalidade-${index}`;
                              return (
                                <div key={sectionKey} className="rounded-lg border border-fuchsia-100 bg-white/70 p-3">
                                  <PlanningTextSection
                                    title={planningIntencionalidades.length > 1 ? `Intencionalidade ${index + 1}` : 'Intencionalidade Pedagógica'}
                                    content={intencionalidade}
                                    tone="fuchsia"
                                    expanded={Boolean(expandedPlanningSections[sectionKey])}
                                    onToggle={() => setExpandedPlanningSections(current => ({ ...current, [sectionKey]: !current[sectionKey] }))}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {planejamentoHoje.activities && (
                  <div className="rounded-xl border border-indigo-200 bg-white/80 p-3 sm:p-4">
                    <PlanningTextSection
                      title="Desenvolvimento da Atividade"
                      content={planejamentoHoje.activities}
                      expanded={Boolean(expandedPlanningSections.activities)}
                      onToggle={() => setExpandedPlanningSections(current => ({ ...current, activities: !current.activities }))}
                    />
                  </div>
                )}

                {planejamentoHoje.recursos && (
                  <div className="rounded-xl border border-indigo-200 bg-white/80 p-3 sm:p-4">
                    <PlanningTextSection
                      title="Recursos / Materiais"
                      content={planejamentoHoje.recursos}
                      expanded={Boolean(expandedPlanningSections.resources)}
                      onToggle={() => setExpandedPlanningSections(current => ({ ...current, resources: !current.resources }))}
                    />
                  </div>
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

                <CompactChildMultiSelect
                  criancas={criancas}
                  selecionadas={microgestoForm.criancasSelecionadas}
                  onChange={ids => setMicrogestoForm(f => ({ ...f, criancasSelecionadas: ids }))}
                  label="Criança(s) envolvida(s)"
                  helperText="Use apenas o select para vincular uma ou mais crianças ao microgesto."
                  showSelectedChips={false}
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

          {/* ─── AVALIAÇÃO DA PRÁTICA — Layout Premium ─── */}
          <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-md shadow-indigo-100/60">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-0.5">
                  <CardTitle className="flex items-center gap-2 text-indigo-900 text-base sm:text-lg">
                    <ClipboardList className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                    Avaliação da Prática
                  </CardTitle>
                  <p className="text-xs text-indigo-600">
                    Registre a execução do plano e gere a Avaliação do Plano de Aula com IA.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* ── Bloco 1: Cumprimento do Plano — Botões de alto contraste ── */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex-shrink-0">1</span>
                  <p className="text-sm font-bold text-emerald-900">
                    Como foi a execução do plano?
                    {planejamentoHoje && <span className="ml-1 text-red-500">*</span>}
                  </p>
                </div>
                {/* Botões grandes de alto contraste */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'FEITO' as const,
                      label: 'Cumprido',
                      sublabel: 'Plano executado integralmente',
                      emoji: '✅',
                      activeBg: 'bg-emerald-600 border-emerald-600 shadow-emerald-200',
                      activeText: 'text-white',
                      idleBg: 'bg-white border-emerald-300 hover:bg-emerald-50',
                      idleText: 'text-emerald-800',
                    },
                    {
                      id: 'PARCIAL' as const,
                      label: 'Parcial',
                      sublabel: 'Executado com adaptações',
                      emoji: '⚠️',
                      activeBg: 'bg-amber-500 border-amber-500 shadow-amber-200',
                      activeText: 'text-white',
                      idleBg: 'bg-white border-amber-300 hover:bg-amber-50',
                      idleText: 'text-amber-800',
                    },
                    {
                      id: 'NAO_REALIZADO' as const,
                      label: 'Não realizado',
                      sublabel: 'Plano não foi executado',
                      emoji: '❌',
                      activeBg: 'bg-red-600 border-red-600 shadow-red-200',
                      activeText: 'text-white',
                      idleBg: 'bg-white border-red-300 hover:bg-red-50',
                      idleText: 'text-red-800',
                    },
                  ].map(s => {
                    const isActive = form.statusExecucaoPlano === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, statusExecucaoPlano: s.id }))}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-4 py-4 text-center transition-all duration-150 shadow-sm
                          ${isActive
                            ? `${s.activeBg} ${s.activeText} shadow-md scale-[1.02]`
                            : `${s.idleBg} ${s.idleText}`
                          }`}
                      >
                        <span className="text-2xl leading-none">{s.emoji}</span>
                        <span className="text-sm font-bold leading-tight">{s.label}</span>
                        <span className={`text-[11px] leading-tight ${isActive ? 'text-white/80' : 'text-gray-500'}`}>{s.sublabel}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Campo condicional para PARCIAL ou NAO_REALIZADO */}
                {(form.statusExecucaoPlano === 'PARCIAL' || form.statusExecucaoPlano === 'NAO_REALIZADO') && (
                  <div className="space-y-1">
                    <Label className="text-emerald-900">
                      {form.statusExecucaoPlano === 'PARCIAL' ? 'O que foi executado parcialmente?' : 'Por que não foi realizado?'}
                      {planejamentoHoje && <span className="ml-1 text-red-500">*</span>}
                    </Label>
                    <Textarea
                      placeholder={getExecucaoPlaceholder(form.statusExecucaoPlano)}
                      rows={3}
                      value={form.execucaoPlanejamento}
                      onChange={e => setForm(f => ({ ...f, execucaoPlanejamento: e.target.value }))}
                      className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </div>
                )}
              </div>

              {/* ── Bloco 2: Leitura da turma + Fatores ── */}
              <div className="rounded-2xl border-2 border-sky-200 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-sm flex-shrink-0">2</span>
                  <p className="text-sm font-bold text-sky-900">Como a turma respondeu?</p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sky-900">Leitura da turma <span className="font-normal text-gray-400">(opcional)</span></Label>
                    <Textarea
                      placeholder="Como as crianças responderam à proposta, à rotina e às interações do dia?"
                      rows={3}
                      value={form.reacaoCriancas}
                      onChange={e => setForm(f => ({ ...f, reacaoCriancas: e.target.value }))}
                      className="border-sky-200 focus:border-sky-400 focus:ring-sky-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-sky-900">Fatores que influenciaram</p>
                    <div className="flex flex-wrap gap-2">
                      {FATORES_QUE_INFLUENCIARAM.map(fator => {
                        const ativo = form.fatoresInfluenciaram.includes(fator.id);
                        return (
                          <button
                            key={fator.id}
                            type="button"
                            onClick={() => toggleFatorInfluenciou(fator.id)}
                            className={`rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all ${
                              ativo
                                ? 'border-sky-600 bg-sky-600 text-white shadow-sm'
                                : 'border-sky-200 bg-white text-sky-700 hover:border-sky-400 hover:bg-sky-50'
                            }`}
                          >
                            {fator.label}
                          </button>
                        );
                      })}
                    </div>
                    {form.fatoresInfluenciaram.length > 0 && (
                      <p className="text-xs text-sky-600 font-medium">
                        ✓ {FATORES_QUE_INFLUENCIARAM.filter(f => form.fatoresInfluenciaram.includes(f.id)).map(f => f.label).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Bloco 3: Avaliação por objetivo do plano ── */}
              {planningObjectiveCards.length > 0 && (
                <div className="rounded-2xl border-2 border-violet-200 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-sm flex-shrink-0">3</span>
                    <div>
                      <p className="text-sm font-bold text-violet-900">Avaliação por objetivo</p>
                      <p className="text-xs text-violet-600">Clique no status de cada objetivo observado no dia.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {planningObjectiveCards.map(card => {
                      const av = (form.avaliacoesObjetivos ?? []).find(item => item.objectiveIndex === card.index) ?? { objectiveIndex: card.index, status: '', observacao: '' };
                      return (
                        <div key={card.index} className="rounded-xl border border-violet-100 bg-violet-50/40 p-3 sm:p-4 space-y-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-800">
                              Objetivo {card.index + 1}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {STATUS_AVALIACAO_OBJETIVO.map(status => (
                                <button
                                  key={status.id}
                                  type="button"
                                  onClick={() => updateAvaliacaoObjetivo(card.index, { status: status.id })}
                                  className={`rounded-xl border-2 px-3 py-2 text-xs font-bold transition-all ${
                                    av.status === status.id
                                      ? status.activeClassName + ' shadow-sm scale-105'
                                      : 'bg-white ' + status.idleClassName
                                  }`}
                                >
                                  {status.emoji} {status.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          {av.status && (
                            <Textarea
                              placeholder="Observação sobre este objetivo (opcional)"
                              rows={2}
                              value={av.observacao}
                              onChange={e => updateAvaliacaoObjetivo(card.index, { observacao: e.target.value })}
                              className="border-violet-200 focus:border-violet-400 text-sm"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Bloco 3.5: Observações Individuais por Criança ── */}
              {criancas.length > 0 && (
                <div className="rounded-2xl border-2 border-fuchsia-200 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-700 font-bold text-sm flex-shrink-0">
                      <Users className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-fuchsia-900">Observações individuais</p>
                      <p className="text-xs text-fuchsia-600">Clique em um comportamento e selecione as crianças. Alimenta o RDIC.</p>
                    </div>
                  </div>
                  {(['desempenho', 'comportamento', 'desenvolvimento'] as const).map(grupo => {
                    const grupoLabel = grupo === 'desempenho' ? 'Desempenho e aprendizagem' : grupo === 'comportamento' ? 'Comportamento e regulação' : 'Desenvolvimento e sinais de alerta';
                    const grupoTipos = OBSERVACOES_INDIVIDUAIS_TIPOS.filter(t => t.grupo === grupo);
                    return (
                      <div key={grupo} className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400">{grupoLabel}</p>
                        <div className="flex flex-wrap gap-2">
                          {grupoTipos.map(tipo => {
                            const obs = (form.observacoesIndividuais ?? []).find(o => o.tipo === tipo.id);
                            const count = obs?.criancaIds?.length ?? 0;
                            const ativo = count > 0;
                            return (
                              <div key={tipo.id} className="relative" data-obs-panel>
                                <button
                                  type="button"
                                  onClick={() => setObsIndividualAberta(prev => prev === tipo.id ? null : tipo.id)}
                                  className={`rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    ativo
                                      ? 'border-fuchsia-600 bg-fuchsia-600 text-white shadow-sm'
                                      : 'border-fuchsia-200 bg-white text-fuchsia-700 hover:border-fuchsia-400 hover:bg-fuchsia-50'
                                  }`}
                                >
                                  <span>{tipo.emoji}</span>
                                  <span>{tipo.label}</span>
                                  {ativo && (
                                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/30 text-[10px] font-bold">
                                      {count}
                                    </span>
                                  )}
                                </button>
                                {obsIndividualAberta === tipo.id && (
                                  <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-2xl border-2 border-fuchsia-200 bg-white shadow-xl p-3 space-y-3" data-obs-panel>
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-bold text-fuchsia-900">{tipo.emoji} {tipo.label}</p>
                                      <button type="button" onClick={() => setObsIndividualAberta(null)} className="text-gray-400 hover:text-gray-600">
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <p className="text-[10px] text-fuchsia-600">Selecione as crianças que se enquadram hoje:</p>
                                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                      {criancas.slice().sort((a, b) => a.firstName.localeCompare(b.firstName, 'pt-BR')).map(c => {
                                        const selecionada = (obs?.criancaIds ?? []).includes(c.id);
                                        return (
                                          <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                              setForm(f => {
                                                const atual = f.observacoesIndividuais ?? [];
                                                const existente = atual.find(o => o.tipo === tipo.id);
                                                if (existente) {
                                                  const novas = selecionada
                                                    ? existente.criancaIds.filter(id => id !== c.id)
                                                    : [...existente.criancaIds, c.id];
                                                  if (novas.length === 0) return { ...f, observacoesIndividuais: atual.filter(o => o.tipo !== tipo.id) };
                                                  return { ...f, observacoesIndividuais: atual.map(o => o.tipo === tipo.id ? { ...o, criancaIds: novas } : o) };
                                                }
                                                return { ...f, observacoesIndividuais: [...atual, { tipo: tipo.id as ObservacaoIndividualTipo, criancaIds: [c.id] }] };
                                              });
                                            }}
                                            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all text-center ${
                                              selecionada ? 'border-fuchsia-500 bg-fuchsia-50' : 'border-gray-100 bg-white hover:border-fuchsia-200'
                                            }`}
                                          >
                                            {c.photoUrl ? (
                                              <img src={c.photoUrl} alt={c.firstName} className="h-8 w-8 rounded-full object-cover" />
                                            ) : (
                                              <div className="h-8 w-8 rounded-full bg-fuchsia-100 flex items-center justify-center text-fuchsia-700 font-bold text-xs">
                                                {c.firstName[0]}{c.lastName?.[0] ?? ''}
                                              </div>
                                            )}
                                            <span className="text-[10px] font-medium text-gray-700 leading-tight max-w-[56px] truncate">{c.firstName}</span>
                                            {selecionada && <CheckCircle className="h-3 w-3 text-fuchsia-500" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setObsIndividualAberta(null)}
                                      className="w-full rounded-xl bg-fuchsia-600 text-white text-xs font-bold py-2 hover:bg-fuchsia-700 transition-colors"
                                    >
                                      Confirmar seleção
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {(form.observacoesIndividuais ?? []).length > 0 && (
                    <div className="rounded-xl bg-fuchsia-50 border border-fuchsia-200 p-3 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-500">Resumo das observações</p>
                      {(form.observacoesIndividuais ?? []).map(obs => {
                        const tipo = OBSERVACOES_INDIVIDUAIS_TIPOS.find(t => t.id === obs.tipo);
                        const nomes = obs.criancaIds.map(id => criancas.find(c => c.id === id)?.firstName ?? id).join(', ');
                        return (
                          <div key={obs.tipo} className="flex items-start gap-2 text-xs text-fuchsia-800">
                            <span>{tipo?.emoji}</span>
                            <span><strong>{tipo?.label}:</strong> {nomes}</span>
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, observacoesIndividuais: (f.observacoesIndividuais ?? []).filter(o => o.tipo !== obs.tipo) }))}
                              className="ml-auto text-fuchsia-300 hover:text-red-400 flex-shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {/* ── Bloco 4: Complementares (materiais, adaptações, ocorrências) ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Materiais utilizados <span className="font-normal text-gray-400">(opcional)</span></Label>
                  <Textarea
                    placeholder="Materiais e recursos realmente utilizados"
                    rows={2}
                    value={form.materiaisUtilizados}
                    onChange={e => setForm(f => ({ ...f, materiaisUtilizados: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Adaptações realizadas <span className="font-normal text-gray-400">(opcional)</span></Label>
                  <Textarea
                    placeholder="Ajustes em relação ao previsto"
                    rows={2}
                    value={form.adaptacoesRealizadas}
                    onChange={e => setForm(f => ({ ...f, adaptacoesRealizadas: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>O que precisa ser retomado? <span className="text-red-500">*</span></Label>
                  <Textarea
                    placeholder="O que continuar, aprofundar ou retomar no próximo dia?"
                    rows={2}
                    value={form.reflexaoPedagogica}
                    onChange={e => setForm(f => ({ ...f, reflexaoPedagogica: e.target.value }))}
                  />
                </div>
              </div>

              {/* ── Bloco 5: AVALIAÇÃO DO PLANO DE AULA — Destaque principal com IA ── */}
              <div className="rounded-2xl border-2 border-indigo-400 bg-gradient-to-br from-indigo-50 to-violet-50 p-4 sm:p-6 space-y-4 shadow-md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-sm flex-shrink-0">✦</span>
                      <p className="text-base font-bold text-indigo-900">Avaliação do Plano de Aula</p>
                    </div>
                    <p className="text-xs text-indigo-700 pl-9">
                      Campo obrigatório. Gerado pela IA com base nos dados acima — revise e edite antes de salvar.
                      Este texto alimenta o RIA e o RDIC.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={gerarAvaliacaoIA}
                    disabled={gerandoIA}
                    className={`flex-shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all shadow-sm
                      ${gerandoIA
                        ? 'bg-indigo-300 text-white cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-200'
                      }`}
                  >
                    {gerandoIA
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
                      : <><WandSparkles className="h-4 w-4" /> Gerar com IA</>
                    }
                  </button>
                </div>
                <Textarea
                  placeholder="Clique em 'Gerar com IA' para criar a avaliação automaticamente, ou escreva diretamente aqui. Este campo será usado no RIA e RDIC."
                  rows={6}
                  value={form.avaliacaoPlanoAula}
                  onChange={e => setForm(f => ({ ...f, avaliacaoPlanoAula: e.target.value }))}
                  className="border-indigo-300 focus:border-indigo-500 focus:ring-indigo-200 bg-white/80 text-sm leading-relaxed resize-y"
                />
                {form.avaliacaoPlanoAula && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-indigo-600">
                      ✓ {form.avaliacaoPlanoAula.length} caracteres — pronto para salvar
                    </p>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, avaliacaoPlanoAula: '' }))}
                      className="text-xs text-indigo-400 hover:text-red-500 transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                )}
              </div>

              {/* ── Bloco 6: Texto complementar (opcional) ── */}
              <div className="space-y-1">
                <Label>Texto complementar <span className="font-normal text-gray-400">(opcional)</span></Label>
                <Textarea
                  placeholder="Nuances pedagógicas, decisões tomadas em sala e percepções complementares."
                  rows={2}
                  value={form.textoComplementarProfessor}
                  onChange={e => setForm(f => ({ ...f, textoComplementarProfessor: e.target.value }))}
                />
              </div>

            </CardContent>
          </Card>

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

          {/* PR 141: 3 modos de ação:
              1) Editando diário existente (diarioEditandoId preenchido) → só Atualizar + Cancelar
              2) Diário publicado para a data (sem ID de edição) → banner bloqueio
              3) Novo diário (nenhum dos anteriores) → Rascunho + Guardar + Cancelar
          */}
          {diarioEditandoId ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={salvarDiario} disabled={saving} className="sm:flex-[1.4] bg-blue-600 hover:bg-blue-700">
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Atualizar Diário
              </Button>
              <Button variant="outline" onClick={() => { setDiarioEditandoId(null); setAba('lista'); }} className="sm:flex-1">Cancelar</Button>
            </div>
          ) : diarioPublicadoParaData ? (
            <div className="flex flex-col gap-3 sm:flex-row items-center p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">Diário já publicado para esta data</p>
                <p className="text-xs text-emerald-600 mt-0.5">Para editar, use o botão ✏️ Editar no painel do diário na aba Meus Diários.</p>
              </div>
              <Button variant="outline" onClick={() => setAba('lista')} className="sm:flex-1 border-emerald-300 text-emerald-800 hover:bg-emerald-100">Ver diários</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" onClick={salvarRascunhoDiario} className="sm:flex-1">
                <Save className="mr-2 h-4 w-4" /> Salvar rascunho
              </Button>
              <Button onClick={salvarDiario} disabled={saving} className="sm:flex-[1.4]">
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar Diário do Dia
              </Button>
              <Button variant="outline" onClick={() => setAba('lista')} className="sm:flex-1">Cancelar</Button>
            </div>
          )}
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

      {/* ─── FOTOS DA TURMA — REGISTRO OBRIGATÓRIO DE ATIVIDADES ─── */}
      {aba === 'fotos' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            📸 As fotos da turma são registros obrigatórios das atividades pedagógicas executadas.
            Devem ser enviadas semanalmente ao Regional de Ensino.
            Vincule cada foto ao campo de experiência da BNCC e à atividade realizada.
          </div>
          <Card>
            <CardContent className="pt-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Camera className="h-4 w-4" /> Registrar Foto de Atividade
              </h3>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Descrição da Atividade *</Label>
                <Input placeholder="Ex: Brincadeira de roda — eu, o outro e o nós" className="text-sm" id="foto-desc" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Campo de Experiência (BNCC)</Label>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" id="foto-campo">
                  <option value="">Selecione...</option>
                  {[
                    { id: 'eu-outro-nos', label: 'O eu, o outro e o nós' },
                    { id: 'corpo-gestos', label: 'Corpo, gestos e movimentos' },
                    { id: 'tracos-sons', label: 'Traços, sons, cores e formas' },
                    { id: 'escuta-fala', label: 'Escuta, fala, pensamento e imaginação' },
                    { id: 'espacos-tempos', label: 'Espaços, tempos, quantidades e relações' },
                  ].map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Foto</Label>
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-700"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem máx. 5 MB'); return; }
                    try {
                      const desc = (document.getElementById('foto-desc') as HTMLInputElement)?.value?.trim();
                      const campo = (document.getElementById('foto-campo') as HTMLSelectElement)?.value;
                      if (!desc) { toast.error('Descreva a atividade antes de enviar a foto'); return; }
                      const fd = new FormData();
                      fd.append('file', file);
                      fd.append('description', desc);
                      fd.append('campoExperiencia', campo || '');
                      fd.append('classroomId', classroomId || '');
                      fd.append('date', form.date);
                      await http.post('/rdx/upload', fd, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      toast.success('Foto registrada com sucesso!');
                      e.target.value = '';
                    } catch (err: any) {
                      toast.error(extractErrorMessage(err, 'Erro ao enviar foto'));
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-700">Envio Semanal ao Regional</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    As fotos da semana atual devem ser enviadas até sexta-feira.
                    O envio gera registro de auditoria automático.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0 flex items-center gap-1"
                  onClick={async () => {
                    try {
                      await http.post('/rdx/enviar-semanal', {
                        classroomId,
                        semana: form.date.substring(0, 7),
                      });
                      toast.success('Fotos marcadas como enviadas ao Regional!');
                    } catch (err: any) {
                      toast.error(extractErrorMessage(err, 'Erro ao registrar envio'));
                    }
                  }}
                >
                  <UploadCloud className="h-3.5 w-3.5" /> Marcar como Enviado
                </Button>
              </div>
            </CardContent>
          </Card>
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
    </>
  );
}
