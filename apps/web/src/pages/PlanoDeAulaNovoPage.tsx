/**
 * PlanoDeAulaNovoPage — Formulário de criação/edição de planejamento por DATA
 *
 * V2 — Planejamento por data com lote de dias e Matriz automática do banco.
 *
 * Regras:
 * - Turma é preenchida automaticamente via GET /teachers/me/default-classroom
 * - Título é gerado automaticamente (não obrigatório manualmente)
 * - Professor escolhe: data inicial + quantidade de dias (1–31)
 * - Sistema renderiza 1 card por dia com objetivos da Matriz (somente leitura)
 * - Professor preenche: atividade, recursos, observações por dia
 * - Dados salvos em JSON no campo description (sem alterar schema Prisma)
 *
 * Endpoint matriz: GET /curriculum-matrix-entries/by-classroom-day?classroomId=&date=YYYY-MM-DD
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Save,
  Send,
  Clock,
  CheckCircle,
  BookOpen,
  Calendar,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../api/http';
import { submitPlanningForReview, getPlanning } from '../api/plannings';
import { safeJsonParse, safeJsonStringify } from '../lib/safeJson';
import { toPedagogicalISODate } from '../lib/formatDate';
import { extractErrorMessage } from '../lib/utils';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Turma {
  id: string;
  name: string;
  code?: string;
  ageGroupMin?: number | null;
  ageGroupMax?: number | null;
}

interface DayTeacherData {
  atividade: string;
  recursos: string;
  observacoes: string;
}

interface DayState {
  date: string; // YYYY-MM-DD
  objectives: MatrizObjective[];
  matrizLoading: boolean;
  matrizMessage?: string;
  teacher: DayTeacherData;
  expanded: boolean;
}

/** Contrato de retorno do endpoint by-classroom-day */
interface MatrizObjective {
  campoExperiencia: string;
  codigoBNCC: string | null;
  objetivoBNCC: string;
  objetivoCurriculoDF: string;
  intencionalidadePedagogica: string | null;
  // FIX P3: retornado para UNIDADE/STAFF_CENTRAL/MANTENEDORA/DEVELOPER
  exemploAtividade?: string | null;
}

interface MatrizByDayResponse {
  segment: string | null;
  date: string;
  classroomId: string;
  objectives: MatrizObjective[];
  message?: string;
}

/** Shape do JSON salvo no campo description (versão 2) */
interface PlanningV2Json {
  version: 2;
  classroomId: string;
  range: { start: string; end: string; days: number };
  days: Array<{
    date: string;
    objectives: MatrizObjective[];
    teacher: DayTeacherData;
  }>;
}

const TEACHER_EMPTY: DayTeacherData = { atividade: '', recursos: '', observacoes: '' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Gera lista de datas sequenciais a partir de startDate (YYYY-MM-DD) por N dias.
 * Usa aritmética local para evitar shift de UTC.
 */
function generateDateRange(startDate: string, numDays: number): string[] {
  const dates: string[] = [];
  const [y, m, d] = startDate.split('-').map(Number);
  for (let i = 0; i < numDays; i++) {
    const dt = new Date(y, m - 1, d + i);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    dates.push(`${yy}-${mm}-${dd}`);
  }
  return dates;
}

/** Formata YYYY-MM-DD para dd/mm/aaaa */
function formatDateBR(date: string): string {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

/** Infere o tipo de planejamento pelo número de dias (apenas valores válidos do enum PlanningType) */
function inferTipo(numDays: number): string {
  if (numDays <= 7) return 'SEMANAL';
  if (numDays <= 31) return 'MENSAL';
  return 'TRIMESTRAL';
}

// ─── Componente de Objetivo da Matriz (somente leitura) ──────────────────────
function ObjetivoCard({ objetivo, index }: { objetivo: MatrizObjective; index: number }) {
  const colors = [
    'bg-blue-50 border-blue-200',
    'bg-green-50 border-green-200',
    'bg-orange-50 border-orange-200',
    'bg-pink-50 border-pink-200',
    'bg-purple-50 border-purple-200',
    'bg-yellow-50 border-yellow-200',
  ];
  const bg = colors[index % colors.length];

  return (
    <div className={`rounded-xl border ${bg} overflow-hidden`}>
      <div className={`px-4 py-2 flex items-center gap-2 flex-wrap border-b ${bg}`}>
        <span className="text-xs font-bold uppercase tracking-wide text-gray-700">
          Campo de Experiência: {objetivo.campoExperiencia.replace(/_/g, ' ')}
        </span>
        {objetivo.codigoBNCC && (
          <Badge variant="secondary" className="ml-auto text-xs font-mono">
            {objetivo.codigoBNCC}
          </Badge>
        )}
      </div>
      <div className="px-4 py-3 space-y-3 bg-white/80">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Objetivo da BNCC (Transcrição Literal)
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{objetivo.objetivoBNCC}</p>
        </div>
        {objetivo.objetivoCurriculoDF && objetivo.objetivoCurriculoDF !== objetivo.objetivoBNCC && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Objetivo do Currículo em Movimento — DF (Transcrição Literal)
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">{objetivo.objetivoCurriculoDF}</p>
          </div>
        )}
        {objetivo.intencionalidadePedagogica && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
              Intencionalidade Pedagógica
            </p>
            <p className="text-sm text-indigo-800 leading-relaxed">
              {objetivo.intencionalidadePedagogica}
            </p>
          </div>
        )}
        {/* FIX P3: exemploAtividade visível para coordenação/unidade */}
        {objetivo.exemploAtividade && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">
              Exemplo de Atividade
            </p>
            <p className="text-sm text-emerald-800 leading-relaxed">
              {objetivo.exemploAtividade}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PlanoDeAulaNovoPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  // ─── Estado principal ─────────────────────────────────────────────────────
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [classroomId, setClassroomId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [numDays, setNumDays] = useState(1);
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<DayState[]>([]);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [planningId, setPlanningId] = useState<string | null>(id ?? null);
  const [status, setStatus] = useState<string>('RASCUNHO');

  // Datas ocupadas (já existem planejamentos nessas datas)
  const [occupiedDates, setOccupiedDates] = useState<string[]>([]);
  const [checkingDates, setCheckingDates] = useState(false);

  // Cache de matriz: chave = "classroomId|YYYY-MM-DD"
  const matrizCache = useRef<Map<string, MatrizByDayResponse>>(new Map());
  // Rastreia a turma anterior para detectar mudança e limpar objetivos
  const prevClassroomIdRef = useRef<string>('');

  // ─── Turma selecionada ────────────────────────────────────────────────────
  const turmaSelecionada = useMemo(
    () => turmas.find(t => t.id === classroomId) ?? null,
    [turmas, classroomId],
  );

  // ─── Auto-gera título ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!turmaSelecionada || !startDate) return;
    const dates = generateDateRange(startDate, numDays);
    const end = dates[dates.length - 1];
    let t: string;
    if (numDays <= 1) {
      t = `Planejamento ${turmaSelecionada.name} — ${formatDateBR(startDate)}`;
    } else {
      t = `Planejamento ${turmaSelecionada.name} — ${formatDateBR(startDate)} a ${formatDateBR(end)}`;
    }
    setTitle(t);
  }, [turmaSelecionada, startDate, numDays]);

  // ─── Carrega turma padrão e planejamento existente ────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // 1) Busca turma padrão do professor
        const defaultRes = await http.get('/teachers/me/default-classroom').catch(() => null);
        const defaultData = defaultRes?.data;

        // 2) Busca todas as turmas acessíveis
        const turmaRes = await http.get('/lookup/classrooms/accessible');
        const d = turmaRes.data;
        let lista: Turma[] = [];
        if (Array.isArray(d)) lista = d;
        else if (d?.classrooms) lista = d.classrooms;
        else if (d?.classroom) lista = [d.classroom];

        // Complementa com turmas do default se não estiver na lista
        if (defaultData?.classrooms?.length) {
          const ids = new Set(lista.map((t: Turma) => t.id));
          for (const c of defaultData.classrooms) {
            if (!ids.has(c.id)) lista.push(c);
          }
        }
        setTurmas(lista);

        // 3) Auto-seleciona turma padrão
        if (defaultData?.classroomId && !id) {
          setClassroomId(defaultData.classroomId);
        }

        // 4) Se editando, carrega planejamento existente
        if (id) {
          const planning = await getPlanning(id);
          setStatus(planning.status ?? 'RASCUNHO');
          setPlanningId(id);

          // Tenta restaurar formato V2
          const v2 = safeJsonParse<PlanningV2Json>(
            (planning as any).description,
            null as unknown as PlanningV2Json,
          );

          if (v2?.version === 2 && Array.isArray(v2.days)) {
            setClassroomId(v2.classroomId ?? planning.classroomId ?? '');
            setStartDate(v2.range?.start ?? '');
            setNumDays(v2.range?.days ?? 1);
            // Restaura dados do professor por dia.
            // Preserva objectives salvos: o useEffect de matriz só recarrega
            // via API quando objectives está vazio, portanto dados salvos
            // não são sobrescritos.
            const restored: DayState[] = v2.days.map(day => ({
              date: day.date,
              objectives: Array.isArray(day.objectives) && day.objectives.length > 0
                ? day.objectives
                : [],
              matrizLoading: false,
              teacher: day.teacher ?? { ...TEACHER_EMPTY },
              expanded: true,
            }));
            setDays(restored);
          } else {
            // Formato legado (V1)
            const desc = safeJsonParse<{ activities?: string; resources?: string; notes?: string }>(
              (planning as any).description,
              {}
            );
            const pc = (planning as any).pedagogicalContent ?? {};
            setClassroomId(planning.classroomId ?? '');
            setStartDate(planning.startDate ? planning.startDate.slice(0, 10) : '');
            setNumDays(1);
            setDays([{
              date: planning.startDate ? planning.startDate.slice(0, 10) : '',
              objectives: [],
              matrizLoading: false,
              teacher: {
                atividade: desc.activities ?? pc.metodologia ?? '',
                recursos: desc.resources ?? pc.recursos ?? '',
                observacoes: desc.notes ?? pc.avaliacao ?? '',
              },
              expanded: true,
            }]);
          }
        }
      } catch {
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ─── Verifica datas ocupadas via API ────────────────────────────────────
  useEffect(() => {
    if (!classroomId || !startDate || numDays < 1 || isEditing) return;
    const timer = setTimeout(async () => {
      setCheckingDates(true);
      try {
        const res = await http.get('/plannings/check-dates', {
          params: { classroomId, startDate, days: numDays },
        });
        setOccupiedDates(res.data?.occupied ?? []);
      } catch {
        setOccupiedDates([]);
      } finally {
        setCheckingDates(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [classroomId, startDate, numDays, isEditing]);

  // ─── Gera/atualiza lista de dias quando startDate ou numDays mudam ────────
  useEffect(() => {
    if (!startDate || numDays < 1) return;
    const dates = generateDateRange(startDate, numDays);
    setDays(prev => {
      const prevMap = new Map(prev.map(d => [d.date, d]));
      return dates.map(date => {
        const existing = prevMap.get(date);
        return {
          date,
          objectives: existing?.objectives ?? [],
          matrizLoading: existing?.matrizLoading ?? false,
          matrizMessage: existing?.matrizMessage,
          teacher: existing?.teacher ?? { ...TEACHER_EMPTY },
          expanded: existing?.expanded ?? true,
        };
      });
    });
  }, [startDate, numDays]);

  // ─── Busca matriz para cada dia (com cache) ───────────────────────────────
  const fetchMatrizForDay = useCallback(async (date: string, cid: string) => {
    if (!cid || !date) return;
    const cacheKey = `${cid}|${date}`;
    if (matrizCache.current.has(cacheKey)) {
      const cached = matrizCache.current.get(cacheKey)!;
      setDays(prev =>
        prev.map(d =>
          d.date === date
            ? { ...d, objectives: cached.objectives, matrizLoading: false, matrizMessage: cached.message }
            : d
        )
      );
      return;
    }
    setDays(prev => prev.map(d => d.date === date ? { ...d, matrizLoading: true } : d));
    try {
      const res = await http.get('/curriculum-matrix-entries/by-classroom-day', {
        params: { classroomId: cid, date },
      });
      const data = res.data as MatrizByDayResponse;
      matrizCache.current.set(cacheKey, data);
      setDays(prev =>
        prev.map(d =>
          d.date === date
            ? { ...d, objectives: data.objectives ?? [], matrizLoading: false, matrizMessage: data.message }
            : d
        )
      );
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Erro ao carregar Matriz Pedagógica.');
      setDays(prev =>
        prev.map(d =>
          d.date === date
            ? { ...d, objectives: [], matrizLoading: false, matrizMessage: msg }
            : d
        )
      );
    }
  }, []);

  /** Carrega todos os dias em lote usando by-classroom-date (mais eficiente para numDays > 1) */
  const fetchMatrizLote = useCallback(async (cid: string, start: string, n: number) => {
    if (!cid || !start || n < 1) return;
    setDays(prev => prev.map(d => ({ ...d, matrizLoading: true })));
    try {
      const res = await http.get('/curriculum-matrix-entries/by-classroom-date', {
        params: { classroomId: cid, date: start, days: n },
      });
      const data = res.data as { diasLetivos: Array<{ date: string; objectives: MatrizObjective[]; message?: string }> };
      const byDate = new Map(data.diasLetivos.map(d => [d.date, d]));
      setDays(prev =>
        prev.map(d => {
          const found = byDate.get(d.date);
          return found
            ? { ...d, objectives: found.objectives ?? [], matrizLoading: false, matrizMessage: found.message }
            : { ...d, matrizLoading: false };
        })
      );
    } catch {
      setDays(prev => prev.map(d => ({ ...d, matrizLoading: false, matrizMessage: 'Erro ao carregar Matriz.' })));
    }
  }, []);

  // Quando classroomId muda, limpa cache e objetivos para forçar recarga
  useEffect(() => {
    if (!classroomId) return;
    if (prevClassroomIdRef.current && prevClassroomIdRef.current !== classroomId) {
      matrizCache.current.clear();
      setDays(prev =>
        prev.map(d => ({ ...d, objectives: [], matrizLoading: false, matrizMessage: undefined }))
      );
    }
    prevClassroomIdRef.current = classroomId;
  }, [classroomId]);

  useEffect(() => {
    if (!classroomId || !startDate) return;
    if (numDays > 1) {
      fetchMatrizLote(classroomId, startDate, numDays);
    } else {
      // Usa setDays com callback para acessar o estado mais recente (evita stale closure)
      setDays(prev => {
        for (const day of prev) {
          if (day.objectives.length === 0 && !day.matrizLoading) {
            fetchMatrizForDay(day.date, classroomId);
          }
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length, classroomId, startDate, numDays]);

  // ─── Atualiza campo do professor por dia ─────────────────────────────────
  function updateTeacherField(date: string, field: keyof DayTeacherData, value: string) {
    setDays(prev =>
      prev.map(d =>
        d.date === date ? { ...d, teacher: { ...d.teacher, [field]: value } } : d
      )
    );
  }

  function toggleDay(date: string) {
    setDays(prev =>
      prev.map(d => d.date === date ? { ...d, expanded: !d.expanded } : d)
    );
  }

  // ─── Build do payload para a API ──────────────────────────────────────────
  function buildPayload() {
    const dates = generateDateRange(startDate, numDays);
    const endDate = dates[dates.length - 1];

    const startISO = toPedagogicalISODate(new Date(startDate + 'T12:00:00'));
    const endISO = toPedagogicalISODate(new Date(endDate + 'T12:00:00'));

    const v2: PlanningV2Json = {
      version: 2,
      classroomId,
      range: { start: startDate, end: endDate, days: numDays },
      days: days.map(d => ({
        date: d.date,
        objectives: d.objectives,
        teacher: d.teacher,
      })),
    };

    return {
      title,
      classroomId,
      startDate: startISO,
      endDate: endISO,
      type: inferTipo(numDays),
      description: safeJsonStringify(v2),
      // objectives: serializa objetivos do primeiro dia para compatibilidade legada
      objectives: days[0]?.objectives?.length
        ? safeJsonStringify(days[0].objectives)
        : null,
    };
  }

  // ─── Salvar rascunho ──────────────────────────────────────────────────────
  async function salvarRascunho() {
    if (!classroomId || !startDate) {
      toast.error('Selecione a turma e a data de início');
      return;
    }
    const hasAnyActivity = days.some(d => d.teacher.atividade.trim());
    if (!hasAnyActivity) {
      toast.error('Preencha a atividade de pelo menos um dia');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (planningId) {
        await http.patch(`/plannings/${planningId}`, payload);
        toast.success('Rascunho atualizado');
      } else {
        const res = await http.post('/plannings', payload);
        const newId = res.data?.id ?? res.data?.planning?.id;
        if (newId) {
          setPlanningId(newId);
          navigate(`/app/planejamento/${newId}/editar`, { replace: true });
        }
        toast.success('Rascunho salvo');
      }
    } catch (err: any) {
      toast.error(extractErrorMessage(err, 'Erro ao salvar'));
    } finally {
      setSaving(false);
    }
  }

  // ─── Enviar para revisão ──────────────────────────────────────────────────
  async function enviarParaRevisao() {
    if (!classroomId || !startDate) {
      toast.error('Selecione a turma e a data de início');
      return;
    }
    const hasAnyActivity = days.some(d => d.teacher.atividade.trim());
    if (!hasAnyActivity) {
      toast.error('Preencha a atividade de pelo menos um dia');
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      let currentId = planningId;
      if (currentId) {
        await http.patch(`/plannings/${currentId}`, payload);
      } else {
        const res = await http.post('/plannings', payload);
        currentId = res.data?.id ?? res.data?.planning?.id;
        if (currentId) setPlanningId(currentId);
      }
      if (!currentId) throw new Error('ID do planejamento não encontrado');
      await submitPlanningForReview(currentId);
      setStatus('EM_REVISAO');
      toast.success('Planejamento enviado para revisão!');
      navigate('/app/planejamentos');
    } catch (err: any) {
      toast.error(extractErrorMessage(err, 'Erro ao enviar para revisão'));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Status badge ─────────────────────────────────────────────────────────
  const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    RASCUNHO: { label: 'Rascunho', icon: <Clock className="h-3 w-3" />, className: 'bg-gray-100 text-gray-700' },
    EM_REVISAO: { label: 'Em Revisão', icon: <Clock className="h-3 w-3" />, className: 'bg-amber-100 text-amber-700' },
    APROVADO: { label: 'Aprovado', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-green-100 text-green-700' },
    DEVOLVIDO: { label: 'Devolvido', icon: <AlertCircle className="h-3 w-3" />, className: 'bg-red-100 text-red-700' },
    PUBLICADO: { label: 'Publicado', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-blue-100 text-blue-700' },
    EM_EXECUCAO: { label: 'Em Execução', icon: <BookOpen className="h-3 w-3" />, className: 'bg-indigo-100 text-indigo-700' },
    CONCLUIDO: { label: 'Concluído', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-teal-100 text-teal-700' },
    CANCELADO: { label: 'Cancelado', icon: <AlertCircle className="h-3 w-3" />, className: 'bg-gray-100 text-gray-500' },
  };
  const statusInfo = statusConfig[status] ?? statusConfig.RASCUNHO;
  // Bloqueado: não pode editar quando em revisão, aprovado, em execução ou concluído
  const bloqueado = ['EM_REVISAO', 'APROVADO', 'EM_EXECUCAO', 'CONCLUIDO', 'PUBLICADO', 'CANCELADO'].includes(status);

  if (loading) {
    return (
      <PageShell title={isEditing ? 'Editar Planejamento' : 'Novo Planejamento'}>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={isEditing ? 'Editar Planejamento' : 'Novo Planejamento'}
      subtitle="Planejamento por data com Matriz Pedagógica 2026 automática"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ─── Cabeçalho com status ─── */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/planejamentos')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>

        {/* Aviso quando bloqueado */}
        {bloqueado && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {status === 'EM_REVISAO' && 'Este planejamento está aguardando aprovação da coordenação. Edição bloqueada.'}
              {status === 'APROVADO' && 'Planejamento aprovado. Para editar, solicite devolução à coordenação.'}
              {status === 'EM_EXECUCAO' && 'Planejamento em execução. Edição bloqueada.'}
              {status === 'CONCLUIDO' && 'Planejamento concluído. Visualização somente leitura.'}
              {status === 'PUBLICADO' && 'Planejamento publicado. Edição bloqueada.'}
              {status === 'CANCELADO' && 'Planejamento cancelado.'}
            </span>
          </div>
        )}

        {/* ─── Identificação ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Identificação do Planejamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Turma */}
            <div>
              <Label>
                Turma <span className="text-red-500">*</span>
              </Label>
              <select
                className="w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                value={classroomId}
                onChange={e => {
                  setClassroomId(e.target.value);
                  // Limpa cache ao trocar turma
                  matrizCache.current.clear();
                  setDays(prev => prev.map(d => ({ ...d, objectives: [], matrizLoading: false })));
                }}
                disabled={bloqueado}
              >
                <option value="">Selecione a turma...</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {turmas.length === 1 && classroomId && (
                <p className="text-xs text-green-600 mt-1">Turma selecionada automaticamente</p>
              )}
            </div>

            {/* Data inicial + Quantidade de dias */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Data Inicial <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  disabled={bloqueado}
                  className={occupiedDates.length > 0 ? 'border-amber-400' : ''}
                />
              </div>
              <div>
                <Label>
                  Quantidade de Dias <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={numDays}
                  onChange={e => {
                    const v = Math.max(1, Math.min(31, Number(e.target.value) || 1));
                    setNumDays(v);
                  }}
                  disabled={bloqueado}
                />
                <p className="text-xs text-gray-400 mt-1">Máximo 31 dias</p>
              </div>
            </div>

            {/* Título (auto-gerado, editável como apelido) */}
            <div>
              <Label>Título (gerado automaticamente)</Label>
              <Input
                placeholder="Gerado automaticamente ao selecionar turma e data"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={bloqueado}
              />
              <p className="text-xs text-gray-400 mt-1">
                Você pode personalizar o título se desejar.
              </p>
            </div>

            {/* Aviso de datas ocupadas */}
            {checkingDates && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-gray-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                Verificando disponibilidade das datas...
              </div>
            )}
            {!checkingDates && occupiedDates.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Atenção: datas já possuem planejamento</p>
                  <p className="text-xs mt-0.5">
                    {occupiedDates.map(d => formatDateBR(d)).join(', ')} já têm planejamento cadastrado para esta turma.
                    Salvar irá criar um novo planejamento paralelo.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Cards por dia ─── */}
        {days.length > 0 && classroomId && startDate ? (
          <div className="space-y-4">
            {days.map((day, idx) => (
              <Card key={day.date} className="border-2 border-indigo-100">
                {/* Cabeçalho do dia */}
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => toggleDay(day.date)}
                >
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      Dia {idx + 1} — {formatDateBR(day.date)}
                    </span>
                    <div className="flex items-center gap-2">
                      {day.teacher.atividade.trim() && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                          Preenchido
                        </Badge>
                      )}
                      {day.expanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>

                {day.expanded && (
                  <CardContent className="space-y-4">
                    {/* Objetivos da Matriz (somente leitura) */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <p className="text-sm font-semibold text-gray-700">
                          Objetivos da Matriz Pedagógica 2026
                        </p>
                        <Badge variant="secondary" className="text-xs ml-auto">Automático</Badge>
                      </div>

                      {day.matrizLoading ? (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-gray-500 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                          Carregando Matriz Pedagógica...
                        </div>
                      ) : day.objectives.length > 0 ? (
                        <div className="space-y-2">
                          {day.objectives.map((obj, i) => (
                            <ObjetivoCard
                              key={`${day.date}-${obj.codigoBNCC ?? obj.campoExperiencia}-${i}`}
                              objetivo={obj}
                              index={i}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          {day.matrizMessage ?? 'Sem objetivo cadastrado para este dia na Matriz 2026.'}
                        </div>
                      )}
                    </div>

                    {/* Campos do professor */}
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                        <p className="text-sm font-semibold text-gray-700">
                          Planejamento do Professor
                        </p>
                      </div>
                      <div>
                        <Label>
                          Desenvolvimento da Atividade <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          placeholder="Descreva como você vai desenvolver a atividade em sala..."
                          rows={4}
                          value={day.teacher.atividade}
                          onChange={e => updateTeacherField(day.date, 'atividade', e.target.value)}
                          disabled={bloqueado}
                        />
                      </div>
                      <div>
                        <Label>Recursos e materiais</Label>
                        <Textarea
                          placeholder="Liste os materiais, espaços e recursos necessários..."
                          rows={2}
                          value={day.teacher.recursos}
                          onChange={e => updateTeacherField(day.date, 'recursos', e.target.value)}
                          disabled={bloqueado}
                        />
                      </div>
                      <div>
                        <Label>Observações / Adaptações</Label>
                        <Textarea
                          placeholder="Adaptações para crianças com necessidades específicas..."
                          rows={2}
                          value={day.teacher.observacoes}
                          onChange={e => updateTeacherField(day.date, 'observacoes', e.target.value)}
                          disabled={bloqueado}
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-gray-500 text-sm border">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Selecione a turma e a data de início para ver os cards de planejamento.
            </div>
          )
        )}

        {/* ─── Ações ─── */}
        {!bloqueado && (
          <div className="flex flex-col sm:flex-row gap-3 pb-8">
            <Button
              variant="outline"
              onClick={salvarRascunho}
              disabled={saving || submitting}
              className="flex-1"
            >
              {saving ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Salvar Rascunho</>
              )}
            </Button>
            <Button
              onClick={enviarParaRevisao}
              disabled={saving || submitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {submitting ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Enviar para Revisão</>
              )}
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
