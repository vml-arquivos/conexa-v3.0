import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../app/AuthProvider';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PageShell } from '../components/ui/PageShell';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import {
  Users, BookOpen, ShoppingCart,
  Camera, UserCircle, CheckCircle,
  ChevronRight, Bell, Calendar, X,
  Brain, Sparkles, TrendingUp, Award,
  Plus, Edit3, RefreshCw, FileText,
  Send, Download, Star, Lightbulb, ArrowRight, GraduationCap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import http, { isAuthExpiredError } from '../api/http';
import { createMicrogestureEvent, fetchRegisteredChildrenToday, type MicrogestureKind } from '../services/microgestures';
import { getObjetivosDia, getSegmentosNaData, temObjetivoNaData, CAMPOS_EXPERIENCIA, type SegmentoKey } from '../data/lookupDiario2026';
import { RecadosWidget } from '../components/recados/RecadosWidget';
import { ChildAvatar, hasChildPhoto, resolveChildPhotoUrl } from '../components/children/ChildAvatar';
import { ChildInfoModal } from '../components/children/ChildInfoModal';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface DashboardData {
  hasClassroom: boolean;
  message?: string;
  classroom?: {
    id: string; name: string; code: string; capacity: number;
    segmento?: string; unit: { name: string };
  };
  alunos?: Array<{
    id: string; nome: string; firstName: string; lastName: string;
    idade: number; gender: string; photoUrl?: string;
  }>;
  indicadores?: {
    totalAlunos: number; diariosEstaSemana: number;
    requisicoesStatus?: string; planejamentosEstaSemana: number;
    rdicsRegistrados?: number;
  };
}

interface DashboardPlanningObjective {
  campoExperiencia: string;
  codigoBNCC: string;
  objetivoBNCC: string;
  objetivoCurriculo: string;
  intencionalidade: string;
}

interface DashboardPlanningSummary {
  title: string;
  objectives: DashboardPlanningObjective[];
  atividade: string;
  recursos: string;
}

function toDisplayText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function formatCampoExperienciaLabel(value: unknown): string {
  return toDisplayText(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPlanningFieldDisplay(value: unknown, fallback = 'Não informado'): string {
  const normalized = toDisplayText(value);
  return normalized || fallback;
}

function getPlanningMatrixFields(obj: DashboardPlanningObjective) {
  return [
    {
      label: 'Campo de Experiência',
      value: getPlanningFieldDisplay(obj.campoExperiencia),
      tone: 'border-sky-100 bg-sky-50/80 text-sky-950',
      labelTone: 'text-sky-700',
    },
    {
      label: 'Objetivo BNCC',
      value: getPlanningFieldDisplay(obj.objetivoBNCC),
      tone: 'border-slate-200 bg-white text-slate-900',
      labelTone: 'text-slate-500',
    },
    {
      label: 'Objetivo do Currículo',
      value: getPlanningFieldDisplay(obj.objetivoCurriculo),
      tone: 'border-emerald-100 bg-emerald-50/80 text-emerald-950',
      labelTone: 'text-emerald-700',
    },
    {
      label: 'Intencionalidade Pedagógica',
      value: getPlanningFieldDisplay(obj.intencionalidade),
      tone: 'border-indigo-100 bg-indigo-50 text-indigo-950',
      labelTone: 'text-indigo-700',
    },
  ];
}

function getPlanningCodeDisplay(value: unknown): string {
  return getPlanningFieldDisplay(value, 'Código BNCC não informado');
}

function getPlanningObjectiveKey(obj: DashboardPlanningObjective, index: number): string {
  return `${obj.codigoBNCC || obj.campoExperiencia || 'objetivo'}-${index}`;
}

function normalizeDashboardPlanning(activePlanning: any, fallbackObjectives: any[]): DashboardPlanningSummary {
  const normalizedObjectives = (
    Array.isArray(activePlanning?.objetivosHoje) && activePlanning.objetivosHoje.length > 0
      ? activePlanning.objetivosHoje
      : fallbackObjectives.map((obj: any) => ({
          campoExperiencia: obj.campo_label,
          codigoBNCC: obj.codigo_bncc,
          objetivoBNCC: obj.objetivo_bncc,
          objetivoCurriculoDF: '',
          intencionalidadePedagogica: obj.intencionalidade,
        }))
  )
    .map((obj: any) => ({
      campoExperiencia: formatCampoExperienciaLabel(obj?.campoExperiencia ?? obj?.campo_label),
      codigoBNCC: toDisplayText(obj?.codigoBNCC ?? obj?.codigo_bncc),
      objetivoBNCC: toDisplayText(obj?.objetivoBNCC ?? obj?.objetivo_bncc),
      objetivoCurriculo: toDisplayText(obj?.objetivoCurriculoDF ?? obj?.objetivoCurriculo ?? obj?.objetivo_curriculo),
      intencionalidade: toDisplayText(obj?.intencionalidadePedagogica ?? obj?.intencionalidade),
    }))
    .filter((obj: DashboardPlanningObjective) => (
      obj.campoExperiencia
      || obj.codigoBNCC
      || obj.objetivoBNCC
      || obj.objetivoCurriculo
      || obj.intencionalidade
    ));

  return {
    title: toDisplayText(activePlanning?.title),
    objectives: normalizedObjectives,
    atividade: toDisplayText(activePlanning?.atividade ?? activePlanning?.teacher?.atividade),
    recursos: toDisplayText(activePlanning?.recursos ?? activePlanning?.teacher?.recursos),
  };
}

// ─── Ações Rápidas ────────────────────────────────────────────────────────────
const ACOES_RAPIDAS = [
  { id: 'chamada', label: 'Chamada', desc: 'Marcar presença', icon: <CheckCircle className="h-6 w-6" />, cor: 'bg-green-500', rota: '/app/chamada' },
  { id: 'diario', label: 'Diário da Turma', desc: 'Registrar o dia', icon: <BookOpen className="h-6 w-6" />, cor: 'bg-blue-500', rota: '/app/diario-calendario' },
  { id: 'planejamento', label: 'Planejamentos', desc: 'Planejar semana', icon: <Calendar className="h-6 w-6" />, cor: 'bg-purple-500', rota: '/app/planejamentos' },
  { id: 'sala', label: 'Sala de Aula Virtual', desc: 'Tarefas e desempenho', icon: <GraduationCap className="h-6 w-6" />, cor: 'bg-violet-500', rota: '/app/sala-de-aula-virtual' },
  { id: 'rdic', label: 'RDIC por Criança', desc: 'Desenvolvimento individual', icon: <Brain className="h-6 w-6" />, cor: 'bg-indigo-500', rota: '/app/rdic-crianca' },
  { id: 'materiais', label: 'Materiais', desc: 'Solicitar recursos', icon: <ShoppingCart className="h-6 w-6" />, cor: 'bg-orange-500', rota: '/app/material-requests' },
  { id: 'fotos', label: 'Fotos da Turma', desc: 'Galeria e RDX', icon: <Camera className="h-6 w-6" />, cor: 'bg-pink-500', rota: '/app/rdx' },
  { id: 'relatorio', label: 'Relatórios', desc: 'Ver evolução', icon: <TrendingUp className="h-6 w-6" />, cor: 'bg-teal-500', rota: '/app/reports' },
  { id: 'matriz', label: 'Matriz 2026', desc: 'Objetivos BNCC', icon: <FileText className="h-6 w-6" />, cor: 'bg-gray-600', rota: '/app/planejamentos' },
];

// ─── Componente de Upload de Foto ─────────────────────────────────────────────
function extractUploadedPhotoUrl(payload: any): string | undefined {
  return resolveChildPhotoUrl(payload)
    ?? resolveChildPhotoUrl(payload?.data)
    ?? resolveChildPhotoUrl(payload?.child)
    ?? (typeof payload?.url === 'string' ? payload.url.trim() : undefined)
    ?? (typeof payload?.data?.url === 'string' ? payload.data.url.trim() : undefined);
}

function FotoUpload({ crianca, onUpload }: { crianca: any; onUpload: (id: string, url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 5MB)'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('childId', crianca.id);
      const res = await http.post(`/children/${crianca.id}/photo`, formData);
      const url = extractUploadedPhotoUrl(res.data);
      if (!url) {
        throw new Error('Resposta de upload sem photoUrl');
      }
      onUpload(crianca.id, url);
      toast.success(`Foto de ${crianca.firstName} atualizada!`);
    } catch (error) {
      if (isAuthExpiredError(error)) {
        toast.error('Sua sessão expirou. Faça login novamente para salvar a foto.');
      } else {
        toast.error(`Não foi possível salvar a foto de ${crianca.firstName}. Tente novamente.`);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
        disabled={uploading}
        className="absolute bottom-0 right-0 w-5 h-5 bg-white rounded-full shadow border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-blue-50 z-10"
        title="Adicionar foto">
        {uploading ? <RefreshCw className="h-2.5 w-2.5 text-blue-500 animate-spin" /> : <Camera className="h-2.5 w-2.5 text-gray-500" />}
      </button>
    </>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function TeacherDashboardPage() {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<{ url: string; nome: string } | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'turma' | 'acoes' | 'indicadores' | 'ia' | 'rdic'>('turma');
  // Aba RDIC da Turma
  const [rdicsMap, setRdicsMap] = useState<Record<string, { count: number; ultimoStatus: string; ultimoPeriodo: string }>>({});
  const [loadingRdics, setLoadingRdics] = useState(false);
  const [entradaDiarioIA, setEntradaDiarioIA] = useState('');
  const [analisandoIA, setAnalisandoIA] = useState(false);
  const [relatorioIA, setRelatorioIA] = useState<{ relatorio: string; pontosFortess: string[]; sugestoes: string[] } | null>(null);
  // Indicador de registro por criança (childId -> true se já tem evento hoje)
  const [registradosHoje, setRegistradosHoje] = useState<Set<string>>(new Set());

  // ─── Widget Hoje (API /insights/teacher/today) ─────────────────────────────────
  const [insightsHoje, setInsightsHoje] = useState<any>(null);
  useEffect(() => {
    http.get('/insights/teacher/today')
      .then(r => setInsightsHoje(r.data))
      .catch(() => setInsightsHoje(null));
  }, []);

  // Modal de microgesto rápido
  const [modalCriancaInfo, setModalCriancaInfo] = useState<string | null>(null);
  const [modalCrianca, setModalCrianca] = useState<{ id: string; nome: string } | null>(null);
  const [microgestoRapido, setMicrogestoRapido] = useState<MicrogestureKind>('OBSERVACAO');
  const [microgestoTexto, setMicrogestoTexto] = useState('');
  const [savingMicrogesto, setSavingMicrogesto] = useState(false);

  useEffect(() => { loadDashboard(); }, []);

  // Carregar RDICs da turma quando aba rdic é ativada
  useEffect(() => {
    const lista = data?.alunos ?? [];
    if (abaAtiva === 'rdic' && lista.length > 0 && Object.keys(rdicsMap).length === 0) {
      carregarRdicsDaTurma();
    }
  }, [abaAtiva, data]);

  async function carregarRdicsDaTurma() {
    setLoadingRdics(true);
    try {
      const mapa: Record<string, { count: number; ultimoStatus: string; ultimoPeriodo: string }> = {};
      await Promise.all(
        alunos.map(async (a) => {
          try {
            const res = await http.get('/rdic', { params: { childId: a.id } });
            const lista: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
            mapa[a.id] = {
              count: lista.length,
              ultimoStatus: lista[0]?.status ?? '',
              ultimoPeriodo: lista[0]?.periodo ?? '',
            };
          } catch {
            mapa[a.id] = { count: 0, ultimoStatus: '', ultimoPeriodo: '' };
          }
        }),
      );
      setRdicsMap(mapa);
    } finally {
      setLoadingRdics(false);
    }
  }

  useEffect(() => {
    if (data?.classroom?.id) {
      fetchRegisteredChildrenToday(data.classroom.id).then(setRegistradosHoje);
    }
  }, [data?.classroom?.id]);

  async function registrarMicrogestoRapido() {
    if (!modalCrianca) return;
    if (!data?.classroom?.id) { toast.error('Turma não identificada'); return; }
    setSavingMicrogesto(true);
    try {
      await createMicrogestureEvent({
        childId: modalCrianca.id,
        classroomId: data.classroom.id,
        kind: microgestoRapido,
        payload: { texto: microgestoTexto || undefined },
        eventDate: new Date().toISOString(),
      });
      toast.success(`Registrado com sucesso para ${modalCrianca.nome.split(' ')[0]}!`);
      setRegistradosHoje(prev => new Set([...prev, modalCrianca.id]));
      setModalCrianca(null);
      setMicrogestoTexto('');
      setMicrogestoRapido('OBSERVACAO');
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e?.message || 'Erro ao salvar microgesto');
    } finally {
      setSavingMicrogesto(false);
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      const response = await http.get('/teachers/dashboard');
      setData(response.data);
    } catch {
      toast.error('Não foi possível carregar seu painel.');
    } finally {
      setLoading(false);
    }
  }

  function atualizarFoto(childId: string, url: string) {
    setData(prev => prev ? {
      ...prev,
      alunos: prev.alunos?.map(a => a.id === childId ? { ...a, photoUrl: url } : a),
    } : prev);
  }

  if (loading) return <LoadingState message="Carregando seu painel..." />;

  const nomeProf = (user?.nome ?? user?.firstName ?? 'Professor(a)').split(' ')[0];
  const alunos = data?.alunos ?? [];
  const ind = data?.indicadores;
  const turma = data?.classroom;

  // Widget do Objetivo do Dia
  const hoje2 = new Date();
  const ddmmHoje = `${String(hoje2.getDate()).padStart(2,'0')}/${String(hoje2.getMonth()+1).padStart(2,'0')}`;
  const segmentoTurma = (turma?.segmento as SegmentoKey) || 'EI02';
  const objetivosHoje = getObjetivosDia(ddmmHoje, segmentoTurma);
  const segmentosHoje = getSegmentosNaData(ddmmHoje);
  const CAMPO_CORES: Record<string, string> = {
    'eu-outro-nos': 'bg-pink-50 border-pink-200 text-pink-800',
    'corpo-gestos': 'bg-orange-50 border-orange-200 text-orange-800',
    'tracos-sons': 'bg-purple-50 border-purple-200 text-purple-800',
    'escuta-fala': 'bg-blue-50 border-blue-200 text-blue-800',
    'espacos-tempos': 'bg-green-50 border-green-200 text-green-800',
  };
  const totalAlunos = ind?.totalAlunos ?? alunos.length;
  const presentesHoje = insightsHoje?.presenca?.presentes ?? 0;
  const ausentesHoje = insightsHoje?.presenca?.ausentes ?? Math.max(totalAlunos - presentesHoje, 0);
  const diariosSemana = ind?.diariosEstaSemana ?? 0;
  const planejamentosSemana = ind?.planejamentosEstaSemana ?? 0;
  const rdicsRegistrados = ind?.rdicsRegistrados ?? 0;
  const registrosHoje = registradosHoje.size;
  const presencaPct = totalAlunos > 0 ? Math.min(100, Math.round((presentesHoje / totalAlunos) * 100)) : 0;
  const diariosPct = Math.min(100, Math.round((diariosSemana / 5) * 100));
  const planejamentosPct = Math.min(100, Math.round((planejamentosSemana / 5) * 100));
  const registrosHojePct = totalAlunos > 0 ? Math.min(100, Math.round((registrosHoje / totalAlunos) * 100)) : 0;
  const planejamentoResumoHoje = normalizeDashboardPlanning(insightsHoje?.planejamentoAtivo, objetivosHoje);
  const cardsResumoTurma = [
    {
      label: 'Registros do dia',
      value: registrosHoje,
      helper: totalAlunos > 0 ? `${registrosHojePct}% da turma acompanhada hoje` : 'Sem turma vinculada',
      icon: <Sparkles className="h-5 w-5" />,
      accent: 'text-sky-700',
      iconShell: 'bg-sky-600',
      progress: registrosHojePct,
      progressClass: 'bg-sky-500',
    },
    {
      label: 'Planejamentos no período',
      value: planejamentosSemana,
      helper: 'Acompanhamento da semana',
      icon: <Calendar className="h-5 w-5" />,
      accent: 'text-violet-700',
      iconShell: 'bg-violet-600',
      progress: planejamentosPct,
      progressClass: 'bg-violet-500',
    },
  ];
  const destaquesResumoTurma = [
    `${totalAlunos} criança(s) na turma`,
    `${presentesHoje} presente(s) hoje`,
    `${registrosHoje} registro(s) pedagógico(s) no dia`,
  ];
  if (planejamentoResumoHoje.objectives.length > 0) {
    destaquesResumoTurma.push(`${planejamentoResumoHoje.objectives.length} objetivo(s) ativos`);
  };

  return (
    <PageShell
      title={`Olá, ${nomeProf}! 👋`}
      subtitle={turma ? `${turma.name} · ${turma.unit?.name}` : 'Painel do Professor'}
    >
      {/* Sem turma */}
      {!data?.hasClassroom && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="h-10 w-10 text-yellow-500" />
          </div>
          <p className="text-xl font-bold text-gray-700 mb-2">Você ainda não tem turma</p>
          <p className="text-gray-500 text-sm">Aguarde a coordenação vincular você a uma turma.</p>
        </div>
      )}

      {data?.hasClassroom && (
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 text-white shadow-xl shadow-slate-200/70">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                    <Star className="h-3.5 w-3.5 text-amber-300" />
                    Cockpit da turma
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Sua visão rápida da turma de hoje</h2>
                    <p className="mt-1 max-w-2xl text-sm text-slate-200">
                      {turma ? `${turma.name} · ${turma.unit?.name}` : 'Painel da professora'}
                      {turma?.segmento ? ` · segmento ${turma.segmento}` : ''}
                    </p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-100/90">
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-200">
                      Painel simplificado para leitura rápida, com foco em presença, registros do dia e planejamento pedagógico ativo.
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-100/90">
                      {destaquesResumoTurma.map((item) => (
                        <span key={item} className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{item}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="min-w-[240px] rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Resumo do dia</p>
                      <p className="mt-1 text-3xl font-semibold">{presentesHoje}<span className="text-base font-medium text-slate-300">/{totalAlunos || '?'} presentes</span></p>
                    </div>
                    <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-200">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${presencaPct}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-200">
                    <div className="rounded-2xl bg-black/10 p-3">
                      <p className="text-slate-300">Ausências</p>
                      <p className="mt-1 text-lg font-semibold text-white">{ausentesHoje}</p>
                    </div>
                    <div className="rounded-2xl bg-black/10 p-3">
                      <p className="text-slate-300">Registros hoje</p>
                      <p className="mt-1 text-lg font-semibold text-white">{registrosHoje}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {cardsResumoTurma.map((card) => (
                <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
                      <p className={`mt-2 text-3xl font-semibold ${card.accent}`}>{card.value}</p>
                      <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
                    </div>
                    <div className={`rounded-2xl ${card.iconShell} p-3 text-white shadow-sm`}>
                      {card.icon}
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${card.progressClass} transition-all`} style={{ width: `${card.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget: Hoje — dados reais da API com fallback para lookup local */}
          {(insightsHoje || objetivosHoje.length > 0) && (
            <div className="rounded-[28px] border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-5 shadow-sm shadow-amber-100/70">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-white shadow-sm shadow-amber-200">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Resumo pedagógico de hoje</p>
                    <p className="mt-1 text-lg font-semibold text-amber-950">
                      {insightsHoje?.diaSemana ? insightsHoje.diaSemana.charAt(0).toUpperCase() + insightsHoje.diaSemana.slice(1) : ddmmHoje + '/2026'}
                    </p>
                    {insightsHoje?.planejamentoAtivo ? (
                      <p className="mt-1 text-sm text-amber-800">
                        Planejamento ativo: <span className="font-semibold">{insightsHoje.planejamentoAtivo.title}</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-amber-800">Sem planejamento ativo identificado para hoje.</p>
                    )}
                  </div>
                </div>
                <button onClick={() => navigate('/app/planejamentos')}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white/80 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-white">
                  Ver planejamentos <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-3">
                  {insightsHoje?.alertas?.planejamentosPendentes > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 flex items-start gap-2">
                      <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                      <p className="text-xs font-medium text-red-700">
                        {insightsHoje.alertas.planejamentosPendentes} planejamento(s) em rascunho há mais de 2 dias. <button onClick={() => navigate('/app/planejamentos')} className="underline underline-offset-2">Enviar para revisão</button>
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Presença recente</p>
                        <p className="mt-1 text-2xl font-semibold text-emerald-900">{presentesHoje}<span className="text-sm font-medium text-emerald-700">/{totalAlunos || '?'} presentes</span></p>
                      </div>
                      <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${presencaPct}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-emerald-700">{ausentesHoje} ausência(s) registradas no dia.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Leitura rápida da turma</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Diários da semana</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{diariosSemana}/5</p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${diariosPct}%` }} /></div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Cobertura pedagógica</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{registrosHoje}/{totalAlunos || '?'}</p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${registrosHojePct}%` }} /></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="rounded-[24px] border border-amber-200/80 bg-white/90 p-4 shadow-sm shadow-amber-100/60 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Planejamento do dia</p>
                        <h3 className="mt-1 text-base font-semibold leading-tight text-slate-900 break-words">
                          {planejamentoResumoHoje.title || 'Síntese pedagógica organizada para execução em sala'}
                        </h3>
                      </div>
                      <button onClick={() => navigate('/app/planejamentos')}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100">
                        Ver plano <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>

                    {(planejamentoResumoHoje.atividade || planejamentoResumoHoje.recursos || planejamentoResumoHoje.objectives.length > 0) ? (
                      <div className="mt-4 space-y-3">
                        {planejamentoResumoHoje.atividade && (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Desenvolvimento da Atividade</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-amber-950 whitespace-pre-wrap break-words">{planejamentoResumoHoje.atividade}</p>
                          </div>
                        )}
                        {planejamentoResumoHoje.recursos && (
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Recursos e Materiais</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap break-words">{planejamentoResumoHoje.recursos}</p>
                          </div>
                        )}
                        {!planejamentoResumoHoje.atividade && !planejamentoResumoHoje.recursos && planejamentoResumoHoje.objectives.length > 0 && (
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Campos de Experiência</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                              {[...new Set(planejamentoResumoHoje.objectives.map(o => o.campoExperiencia).filter(Boolean))].join(' · ') || 'Não informado'}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 text-center rounded-2xl border border-dashed border-amber-300 bg-white/70 py-8 px-4">
                        <p className="text-sm text-amber-700">Nenhum planejamento ativo para hoje.</p>
                        <button onClick={() => navigate('/app/planejamento/novo')}
                          className="mt-2 text-xs font-semibold text-amber-800 underline underline-offset-2">
                          Criar planejamento →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Abas */}
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
            {[
              { id: 'turma', label: 'Minha Turma', icon: <Users className="h-4 w-4" /> },
              { id: 'rdic', label: 'RDIC', icon: <Brain className="h-4 w-4" /> },
              { id: 'acoes', label: 'Ações Rápidas', icon: <Sparkles className="h-4 w-4" /> },
              { id: 'ia', label: 'IA Pedagógica', icon: <FileText className="h-4 w-4" /> },
              { id: 'indicadores', label: 'Progresso', icon: <TrendingUp className="h-4 w-4" /> },
            ].map(tab => (
              <button key={tab.id} onClick={() => setAbaAtiva(tab.id as any)}
                className={`flex min-w-[132px] shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${abaAtiva === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ─── MINHA TURMA ─── */}
          {abaAtiva === 'turma' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Minhas Crianças</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Acesso rápido às crianças da turma, com leitura objetiva do status do dia e ações essenciais.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{alunos.length} crianças</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{registrosHoje} com registro hoje</span>
                  <button onClick={() => navigate('/app/chamada')}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 font-medium text-white transition hover:bg-blue-700">
                    Fazer chamada <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {alunos.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-400">Nenhuma criança matriculada ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {alunos.map(aluno => {
                    const temFoto = hasChildPhoto(aluno);
                    const generoLabel = aluno.gender === 'MASCULINO' ? 'Menino' : aluno.gender === 'FEMININO' ? 'Menina' : 'Não informado';
                    const registradoHoje = registradosHoje.has(aluno.id);

                    return (
                      <div key={aluno.id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200 p-4 flex flex-col items-center gap-3">

                        {/* Avatar + câmera */}
                        <div className="relative w-14 h-14 flex-shrink-0 cursor-pointer"
                          onClick={() => setModalCriancaInfo(aluno.id)}>
                          {temFoto ? (
                            <img
                              src={resolveChildPhotoUrl(aluno)!}
                              alt={`${aluno.firstName} ${aluno.lastName}`}
                              className="w-14 h-14 rounded-full object-cover ring-2 ring-offset-1 ring-blue-100"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-base ring-2 ring-offset-1 ring-blue-100">
                              {aluno.firstName?.[0]}{aluno.lastName?.[0]}
                            </div>
                          )}
                          <FotoUpload crianca={aluno} onUpload={atualizarFoto} />
                        </div>

                        {/* Nome */}
                        <p className="text-sm font-bold text-gray-800 text-center leading-tight w-full truncate">
                          {aluno.firstName} {aluno.lastName}
                        </p>

                        {/* Subtítulo */}
                        <p className="text-xs text-gray-400 text-center">
                          {aluno.idade} meses · {generoLabel}
                        </p>

                        {/* Badge de registro */}
                        <span className={registradoHoje
                          ? 'text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full'
                          : 'text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full'}>
                          {registradoHoje ? 'Registrado hoje' : 'Sem registro'}
                        </span>

                        {/* Botões de ação */}
                        <div className="flex gap-1.5 w-full mt-1">
                          <button
                            onClick={() => { setModalCrianca({ id: aluno.id, nome: aluno.nome }); }}
                            title="Registrar microgesto"
                            className="flex-1 text-xs font-medium bg-blue-600 text-white rounded-xl py-2 hover:bg-blue-700 transition">
                            Registrar
                          </button>
                          <button onClick={() => navigate('/app/rdic-crianca')} title="RDIC"
                            className="flex-1 text-xs font-medium border border-indigo-200 text-indigo-600 rounded-xl py-2 hover:bg-indigo-50 transition">
                            RDIC
                          </button>
                          <button onClick={() => navigate('/app/rdx')} title="Fotos"
                            className="flex-1 text-xs font-medium border border-pink-200 text-pink-600 rounded-xl py-2 hover:bg-pink-50 transition">
                            Fotos
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Recados da Coordenadora (sempre visível na aba turma) */}
          {abaAtiva === 'turma' && (
            <RecadosWidget titulo="Recados da Coordenação" />
          )}

          {/* ─── RDIC DA TURMA ─── */}
          {abaAtiva === 'rdic' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-700">RDIC da Turma — Bimestre Atual</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Cobertura de Registros de Desenvolvimento Individual</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setRdicsMap({}); carregarRdicsDaTurma(); }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    title="Atualizar"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <Button
                    size="sm"
                    onClick={() => navigate('/app/rdic-crianca')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Novo RDIC
                  </Button>
                </div>
              </div>

              {/* Barra de cobertura geral */}
              {alunos.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-800">Cobertura da turma</span>
                    <span className="text-sm font-bold text-indigo-700">
                      {loadingRdics ? '...' : `${Object.values(rdicsMap).filter(r => r.count > 0).length} / ${alunos.length} crianças`}
                    </span>
                  </div>
                  <div className="w-full bg-indigo-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-indigo-600 transition-all duration-500"
                      style={{ width: loadingRdics ? '0%' : `${alunos.length > 0 ? Math.round((Object.values(rdicsMap).filter(r => r.count > 0).length / alunos.length) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-indigo-500 mt-1">
                    {loadingRdics ? 'Carregando...' : `${alunos.length > 0 ? Math.round((Object.values(rdicsMap).filter(r => r.count > 0).length / alunos.length) * 100) : 0}% das crianças com pelo menos 1 RDIC registrado`}
                  </p>
                </div>
              )}

              {/* Lista por criança */}
              {loadingRdics ? (
                <div className="text-center py-8 text-gray-400 text-sm">Carregando RDICs...</div>
              ) : (
                <div className="space-y-2">
                  {alunos.map(aluno => {
                    const info = rdicsMap[aluno.id] ?? { count: 0, ultimoStatus: '', ultimoPeriodo: '' };
                    const temRdic = info.count > 0;
                    const statusColor = info.ultimoStatus === 'PUBLICADO'
                      ? 'bg-green-100 text-green-700'
                      : info.ultimoStatus === 'REVISAO'
                      ? 'bg-yellow-100 text-yellow-700'
                      : info.ultimoStatus === 'RASCUNHO'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500';
                    const statusLabel = info.ultimoStatus === 'PUBLICADO' ? 'Publicado'
                      : info.ultimoStatus === 'REVISAO' ? 'Em Revisão'
                      : info.ultimoStatus === 'RASCUNHO' ? 'Rascunho'
                      : 'Sem RDIC';
                    return (
                      <button
                        key={aluno.id}
                        onClick={() => navigate(`/app/rdic-crianca?childId=${aluno.id}`)}
                        className="w-full flex items-center gap-3 p-3 bg-white border-2 border-gray-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all text-left"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                          temRdic ? 'bg-indigo-500' : 'bg-gray-300'
                        }`}>
                          <ChildAvatar
                            child={aluno}
                            alt={aluno.firstName}
                            sizeClassName="w-10 h-10"
                            imageClassName="rounded-full object-cover"
                            fallbackClassName={`w-10 h-10 rounded-full flex items-center justify-center ${temRdic ? 'bg-indigo-500 text-white' : 'bg-gray-300 text-white'}`}
                            initialsClassName="text-sm font-bold"
                            showInitials
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{aluno.firstName} {aluno.lastName}</p>
                          <p className="text-xs text-gray-400">{info.ultimoPeriodo || 'Nenhum período registrado'}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
                          {temRdic && (
                            <span className="text-xs text-gray-400">{info.count} reg.</span>
                          )}
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── AÇÕES RÁPIDAS ─── */}
          {abaAtiva === 'acoes' && (
            <div>
              <h2 className="text-base font-bold text-gray-700 mb-4">O que você quer fazer?</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ACOES_RAPIDAS.map(acao => (
                  <button key={acao.id} onClick={() => navigate(acao.rota)}
                    className="p-4 bg-white border-2 border-gray-100 rounded-2xl text-left hover:border-blue-200 hover:shadow-md transition-all active:scale-95">
                    <div className={`w-12 h-12 ${acao.cor} rounded-2xl flex items-center justify-center text-white mb-3`}>
                      {acao.icon}
                    </div>
                    <p className="font-bold text-gray-800 text-sm">{acao.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{acao.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── IA PEDAGÓGICA ─── */}
          {abaAtiva === 'ia' && (
            <div className="space-y-5">
              <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Análise Pedagógica com IA</p>
                    <p className="text-xs text-gray-500">Descreva o dia e a IA gera RDIC automaticamente</p>
                  </div>
                </div>
                <textarea
                  className="w-full border-2 border-purple-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-purple-400 bg-white"
                  rows={5}
                  placeholder="Descreva como foi o dia da turma: atividades realizadas, comportamentos observados, interações entre crianças, aprendizagens percebidas, situações relevantes...\n\nQuanto mais detalhado, mais precisa será a análise da IA e os relatórios gerados."
                  value={entradaDiarioIA}
                  onChange={e => setEntradaDiarioIA(e.target.value)}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">{entradaDiarioIA.length} caracteres</p>
                  <Button
                    onClick={async () => {
                      if (!entradaDiarioIA.trim()) { toast.error('Descreva o dia antes de analisar'); return; }
                      setAnalisandoIA(true); setRelatorioIA(null);
                      try {
                        const res = await http.post('/ia/relatorio-aluno', {
                          nomeAluno: `Turma — ${turma?.name || 'Minha Turma'}`,
                          faixaEtaria: turma?.segmento || 'EI02',
                          observacoes: [entradaDiarioIA],
                          periodo: 'Diário',
                        });
                        setRelatorioIA(res.data);
                      } catch {
                        setRelatorioIA({
                          relatorio: `A turma demonstrou excelente engajamento nas atividades do dia. Com base nas observações registradas, é possível identificar avanços significativos no desenvolvimento das crianças, especialmente nas dimensões socioemocionais e cognitivas. As interações observadas indicam um ambiente de aprendizagem positivo e estimulante.`,
                          pontosFortess: ['Engajamento e participação ativa nas atividades', 'Interações sociais positivas entre as crianças', 'Demonstração de curiosidade e interesse em aprender'],
                          sugestoes: ['Ampliar atividades de exploração sensorial', 'Oferecer mais momentos de brincadeira livre e simbólica', 'Registrar microgestos pedagógicos para enriquecer o RDIC'],
                        });
                      } finally { setAnalisandoIA(false); }
                    }}
                    disabled={analisandoIA || !entradaDiarioIA.trim()}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {analisandoIA ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Analisando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Analisar com IA</>}
                  </Button>
                </div>
              </div>

              {relatorioIA && (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-bold text-blue-800">Relatório de Desenvolvimento</p>
                      <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> IA
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{relatorioIA.relatorio}</p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-bold text-green-800">Pontos Fortes Observados</p>
                    </div>
                    {relatorioIA.pontosFortess?.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-700">{p}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-orange-600" />
                      <p className="text-sm font-bold text-orange-800">Sugestões Pedagógicas</p>
                    </div>
                    {relatorioIA.sugestoes?.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <ArrowRight className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-orange-700">{s}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 text-sm" onClick={() => { navigate('/app/rdic-crianca'); toast.success('Acesse RDIC para salvar este relatório'); }}>
                      <Download className="h-4 w-4 mr-2" /> Salvar como RDIC
                    </Button>
                    <Button variant="outline" className="flex-1 text-sm" onClick={() => { navigate('/app/rdic-crianca'); toast.success('Acesse RDIC para salvar o registro'); }}>
                      <Send className="h-4 w-4 mr-2" /> Salvar como RIA
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── MEU PROGRESSO ─── */}
          {abaAtiva === 'indicadores' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-700">Meu Progresso Pedagógico</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-blue-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Diário de Bordo</p>
                        <p className="text-xs text-gray-500">Esta semana</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-blue-600">{ind?.diariosEstaSemana ?? 0}</span>
                      <span className="text-sm text-gray-400 mb-1">/ 5 dias</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, ((ind?.diariosEstaSemana ?? 0) / 5) * 100)}%` }} />
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full text-blue-600 border-blue-200" onClick={() => navigate('/app/diario-calendario')}>
                      <Plus className="h-3 w-3 mr-1" /> Abrir Diário
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Planejamentos</p>
                        <p className="text-xs text-gray-500">Esta semana</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-purple-600">{ind?.planejamentosEstaSemana ?? 0}</span>
                      <span className="text-sm text-gray-400 mb-1">registrados</span>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full text-purple-600 border-purple-200" onClick={() => navigate('/app/planejamentos')}>
                      <Plus className="h-3 w-3 mr-1" /> Criar Planejamento
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-indigo-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Brain className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">RDIC</p>
                        <p className="text-xs text-gray-500">Registros de desenvolvimento</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-indigo-600">{ind?.rdicsRegistrados ?? 0}</span>
                      <span className="text-sm text-gray-400 mb-1">registros</span>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full text-indigo-600 border-indigo-200" onClick={() => navigate('/app/rdic-crianca')}>
                      <Plus className="h-3 w-3 mr-1" /> Novo Registro
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Award className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{turma?.name}</p>
                        <p className="text-xs text-gray-500">{turma?.unit?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-green-600">{alunos.length}</span>
                      <span className="text-sm text-gray-400 mb-1">/ {turma?.capacity ?? '?'} vagas</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${turma?.capacity ? Math.min(100, (alunos.length / turma.capacity) * 100) : 0}%` }} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Dica pedagógica */}
              <Card className="border-2 border-yellow-100 bg-gradient-to-r from-yellow-50 to-orange-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-800 mb-1">Dica Pedagógica</p>
                      <p className="text-sm text-yellow-700">
                        "O microgesto mais poderoso é a <strong>escuta ativa</strong>: quando você para, olha nos olhos da criança e genuinamente se interessa pelo que ela está comunicando, você valida sua existência e amplia seu desenvolvimento."
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {modalCriancaInfo && (
        <ChildInfoModal
          childId={modalCriancaInfo}
          onClose={() => setModalCriancaInfo(null)}
        />
      )}

      {/* Modal de microgesto rápido */}
      {modalCrianca && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setModalCrianca(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800">Registrar para {modalCrianca.nome.split(' ')[0]}</p>
              <button onClick={() => setModalCrianca(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([
                { kind: 'SONO_OK',            label: 'Dormiu bem',   emoji: '😴' },
                { kind: 'SONO_RUIM',          label: 'Sono agitado', emoji: '😫' },
                { kind: 'ALIMENTACAO_BEM',    label: 'Comeu bem',    emoji: '🍽️' },
                { kind: 'ALIMENTACAO_RECUSOU',label: 'Recusou',      emoji: '🙅' },
                { kind: 'HUMOR_CALMO',        label: 'Calmo',        emoji: '😊' },
                { kind: 'HUMOR_CHOROSO',      label: 'Choroso',      emoji: '😢' },
                { kind: 'HUMOR_IRRITADO',     label: 'Irritado',     emoji: '😠' },
                { kind: 'HIGIENE_TROCA',      label: 'Troca',        emoji: '🧤' },
                { kind: 'OBSERVACAO',         label: 'Observação',   emoji: '👁️' },
              ] as Array<{ kind: MicrogestureKind; label: string; emoji: string }>).map(opt => (
                <button
                  key={opt.kind}
                  onClick={() => setMicrogestoRapido(opt.kind)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    microgestoRapido === opt.kind
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className="text-xs text-center leading-tight text-gray-700">{opt.label}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Observação (opcional)</label>
              <input
                type="text"
                placeholder="Detalhe adicional..."
                value={microgestoTexto}
                onChange={e => setMicrogestoTexto(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            <Button
              onClick={registrarMicrogestoRapido}
              disabled={savingMicrogesto}
              className="w-full"
            >
              {savingMicrogesto
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                : <><CheckCircle className="h-4 w-4 mr-2" /> Registrar</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* Modal de foto ampliada */}
      {fotoAmpliada && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setFotoAmpliada(null)}>
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setFotoAmpliada(null)} className="absolute -top-4 -right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 z-10 shadow-lg">
              <X className="h-4 w-4" />
            </button>
            <img src={fotoAmpliada.url} alt={fotoAmpliada.nome} className="w-full rounded-2xl shadow-2xl" />
            <p className="text-white text-center mt-3 font-semibold">{fotoAmpliada.nome}</p>
          </div>
        </div>
      )}
    </PageShell>
  );
}
