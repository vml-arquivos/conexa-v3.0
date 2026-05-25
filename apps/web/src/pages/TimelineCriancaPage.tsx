import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import http from '../api/http';
import { BookOpen, Activity, FileText, ArrowLeft, AlertTriangle, Clock, HeartPulse, ShieldAlert } from 'lucide-react';
import { ChildQuickActions } from '../components/children/ChildQuickActions';
import { toast } from 'sonner';

type TimelineType = 'DIARIO' | 'OBSERVACAO' | 'RDIC' | 'ALERTA';
type TimelineFilter = 'TODOS' | TimelineType | 'ALERTAS';

type TimelineEvent = {
  id: string;
  type: TimelineType;
  date: string;
  title: string;
  description: string;
  alert?: string;
  recommendation?: string;
  status?: string;
  source?: string;
};

type ChildSummary = {
  child?: any;
  metrics?: any;
  attentionPoints?: Array<{ tipo: string; severidade: string; titulo: string; descricao: string }>;
  timeline?: TimelineEvent[];
};

const DIARY_LABELS: Record<string, string> = {
  ATIVIDADE_PEDAGOGICA: 'Atividade Pedagógica',
  DESENVOLVIMENTO: 'Desenvolvimento',
  COMPORTAMENTO: 'Comportamento',
  SAUDE: 'Saúde',
  REFEICAO: 'Refeição',
  HIGIENE: 'Higiene',
  SONO: 'Sono',
  FAMILIA: 'Família',
  OBSERVACAO: 'Observação',
  AVALIACAO: 'Avaliação',
  OUTRO: 'Outro',
};

const OBS_LABELS: Record<string, string> = {
  COMPORTAMENTO: 'Comportamento',
  SOCIAL: 'Social',
  EMOCIONAL: 'Emocional',
  COGNITIVO: 'Cognitivo',
  MOTOR: 'Motor',
  LINGUAGEM: 'Linguagem',
  APRENDIZAGEM: 'Aprendizagem',
  GERAL: 'Geral',
  PSICOLOGICO: 'Psicológico',
  ALERTA: 'Alerta de Desenvolvimento',
};

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function pickDate(...values: any[]): string | null {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return value;
  }
  return null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function getClassroomId(child: any): string | undefined {
  return (
    child?.classroomId ??
    child?.turma?.id ??
    child?.classroom?.id ??
    child?.activeEnrollment?.classroomId ??
    child?.enrollment?.classroomId ??
    child?.matriculaAtiva?.classroomId
  );
}

function normalizeTimelineEvent(item: any): TimelineEvent | null {
  const type = String(item.type ?? item.tipo ?? '').toUpperCase() as TimelineType;
  const date = pickDate(item.date, item.eventDate, item.criadoEm, item.createdAt, item.updatedAt);
  if (!date) return null;

  if (type === 'DIARIO') {
    return {
      id: String(item.id ?? `${date}-diario`),
      type: 'DIARIO',
      date,
      title: DIARY_LABELS[item.type] ?? item.title ?? 'Diário de Bordo',
      description: item.description ?? item.content ?? item.notes ?? item.observations ?? item.developmentNotes ?? item.behaviorNotes ?? '',
      status: item.status,
      source: item.source,
    };
  }

  if (type === 'OBSERVACAO') {
    const category = String(item.category ?? item.categoria ?? item.title ?? 'GERAL');
    return {
      id: String(item.id ?? `${date}-observacao`),
      type: 'OBSERVACAO',
      date,
      title: OBS_LABELS[category] ?? category.replace(/_/g, ' '),
      description: item.description ?? item.behaviorDescription ?? item.descricao ?? item.learningProgress ?? '',
      alert: item.alert ?? item.developmentAlerts ?? '',
      recommendation: item.recommendation ?? item.recommendations ?? '',
      status: item.status,
      source: item.source,
    };
  }

  if (type === 'RDIC') {
    return {
      id: String(item.id ?? `${date}-rdic`),
      type: 'RDIC',
      date,
      title: item.title ?? 'RDIC',
      description: item.description ?? (item.status ? `Status: ${item.status}` : 'Relatório individual da criança'),
      status: item.status,
      source: item.source,
    };
  }

  if (type === 'ALERTA') {
    return {
      id: String(item.id ?? `${date}-alerta`),
      type: 'ALERTA',
      date,
      title: item.title ?? item.titulo ?? 'Alerta',
      description: item.description ?? item.descricao ?? '',
      alert: item.alert ?? item.description ?? item.descricao ?? '',
      status: item.status ?? item.severidade,
      source: item.source,
    };
  }

  return null;
}

async function loadLegacyTimeline(childId: string): Promise<ChildSummary> {
  const [diaryRes, obsRes, rdicRes] = await Promise.all([
    http.get('/diary-events', { params: { childId, limit: '200' } }),
    http.get('/development-observations', { params: { childId, limit: '200' } }),
    http.get(`/rdic/child/${childId}/central`),
  ]);

  const diaryData = asArray(diaryRes?.data);
  const obsData = asArray(obsRes?.data);
  const rdicData = Array.isArray(rdicRes?.data?.rdics) ? rdicRes.data.rdics : [];
  const childData = rdicRes?.data?.child ?? rdicRes?.data?.crianca ?? null;

  const timeline: TimelineEvent[] = [];

  diaryData.forEach((item) => {
    const date = pickDate(item.eventDate, item.date, item.createdAt, item.updatedAt);
    if (!date) return;
    timeline.push({
      id: String(item.id ?? `${date}-diario`),
      type: 'DIARIO',
      date,
      title: DIARY_LABELS[item.type] ?? item.title ?? 'Diário de Bordo',
      description: item.description ?? item.content ?? item.notes ?? item.observations ?? item.developmentNotes ?? item.behaviorNotes ?? '',
      status: item.status,
      source: 'DiaryEvent',
    });
  });

  obsData.forEach((item) => {
    const date = pickDate(item.date, item.data, item.createdAt, item.updatedAt);
    if (!date) return;
    const category = String(item.category ?? item.categoria ?? 'GERAL');
    timeline.push({
      id: String(item.id ?? `${date}-observacao`),
      type: 'OBSERVACAO',
      date,
      title: OBS_LABELS[category] ?? category.replace(/_/g, ' '),
      description: item.behaviorDescription ?? item.description ?? item.descricao ?? item.learningProgress ?? '',
      alert: item.developmentAlerts ?? '',
      recommendation: item.recommendations ?? '',
      source: 'DevelopmentObservation',
    });
  });

  rdicData.forEach((item) => {
    const date = pickDate(item.publicadoEm, item.finalizadoEm, item.reviewedAt, item.submittedAt, item.criadoEm, item.createdAt, item.updatedAt);
    if (!date) return;
    const periodo = item.periodoEnum ?? item.periodo ?? item.period ?? '';
    timeline.push({
      id: String(item.id ?? `${date}-rdic`),
      type: 'RDIC',
      date,
      title: periodo ? `RDIC ${periodo}` : 'RDIC',
      description: item.status ? `Status: ${item.status}` : 'Relatório individual da criança',
      status: item.status,
      source: 'RDIXInstancia',
    });
  });

  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    child: childData,
    metrics: {
      diary: diaryData.length,
      observations: obsData.length,
      observationsWithAlerts: obsData.filter((item) => Boolean(item.developmentAlerts?.trim?.())).length,
      rdic: rdicData.length,
      openAlerts: 0,
      attendance30: { total: 0, presentes: 0, ausentes: 0, justificados: 0, atrasos: 0, presencaPercentual: null },
    },
    attentionPoints: [],
    timeline,
  };
}

/**
 * Timeline da criança.
 * Camada de leitura e diagnóstico visual sobre dados já existentes.
 * Não altera matriz, planejamento, diário, RDIC ou qualquer dado histórico.
 */
export default function TimelineCriancaPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<ChildSummary>({});
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filter, setFilter] = useState<TimelineFilter>('TODOS');

  useEffect(() => {
    async function carregar() {
      if (!childId) return;
      setLoading(true);
      try {
        try {
          const res = await http.get(`/insights/child/${childId}/summary`);
          const data = res?.data ?? {};
          const timeline = asArray(data.timeline)
            .map(normalizeTimelineEvent)
            .filter(Boolean) as TimelineEvent[];
          timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setSummary(data);
          setEvents(timeline);
        } catch {
          const legacy = await loadLegacyTimeline(childId);
          setSummary(legacy);
          setEvents(legacy.timeline ?? []);
        }
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? 'Erro ao carregar timeline.';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [childId]);

  const metrics = useMemo(() => {
    const apiMetrics = summary.metrics ?? {};
    const attendance = apiMetrics.attendance30 ?? {};
    return {
      total: events.length,
      diario: Number(apiMetrics.diary ?? events.filter((event) => event.type === 'DIARIO').length),
      observacoes: Number(apiMetrics.observations ?? events.filter((event) => event.type === 'OBSERVACAO').length),
      rdic: Number(apiMetrics.rdic ?? events.filter((event) => event.type === 'RDIC').length),
      alertas: Number(apiMetrics.openAlerts ?? events.filter((event) => event.type === 'ALERTA' || Boolean(event.alert?.trim())).length),
      obsAlertas: Number(apiMetrics.observationsWithAlerts ?? events.filter((event) => Boolean(event.alert?.trim())).length),
      restricoes: Number(apiMetrics.dietaryRestrictions ?? 0),
      presenca30: attendance.presencaPercentual as number | null | undefined,
    };
  }, [events, summary.metrics]);

  const filteredEvents = useMemo(() => {
    if (filter === 'TODOS') return events;
    if (filter === 'ALERTAS') return events.filter((event) => event.type === 'ALERTA' || Boolean(event.alert?.trim()));
    return events.filter((event) => event.type === filter);
  }, [events, filter]);

  const child = summary.child ?? {};
  const childName = child?.name ?? child?.nome ?? child?.fullName ?? `${child?.firstName ?? ''} ${child?.lastName ?? ''}`.trim() ?? 'Criança';
  const classroomId = getClassroomId(child);
  const attentionPoints = Array.isArray(summary.attentionPoints) ? summary.attentionPoints : [];

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="px-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <div className="text-right">
          <h1 className="text-lg font-semibold text-gray-800">Linha do Tempo</h1>
          <p className="text-xs text-gray-500">{childName || 'Criança'}</p>
        </div>
      </div>

      <ChildQuickActions
        childId={childId}
        classroomId={classroomId}
        current="timeline"
        className="mb-4"
      />

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
            <Card className="border-slate-200"><CardContent className="p-3"><p className="text-xs text-gray-500">Total</p><p className="text-xl font-semibold text-gray-900">{metrics.total}</p></CardContent></Card>
            <Card className="border-indigo-100"><CardContent className="p-3"><p className="text-xs text-gray-500">Diário</p><p className="text-xl font-semibold text-indigo-700">{metrics.diario}</p></CardContent></Card>
            <Card className="border-emerald-100"><CardContent className="p-3"><p className="text-xs text-gray-500">Observações</p><p className="text-xl font-semibold text-emerald-700">{metrics.observacoes}</p></CardContent></Card>
            <Card className="border-amber-100"><CardContent className="p-3"><p className="text-xs text-gray-500">RDIC</p><p className="text-xl font-semibold text-amber-700">{metrics.rdic}</p></CardContent></Card>
            <Card className="border-red-100"><CardContent className="p-3"><p className="text-xs text-gray-500">Alertas</p><p className="text-xl font-semibold text-red-700">{metrics.alertas + metrics.obsAlertas}</p></CardContent></Card>
            <Card className="border-blue-100"><CardContent className="p-3"><p className="text-xs text-gray-500">Presença 30d</p><p className="text-xl font-semibold text-blue-700">{metrics.presenca30 === null || metrics.presenca30 === undefined ? '—' : `${metrics.presenca30}%`}</p></CardContent></Card>
            <Card className="border-orange-100"><CardContent className="p-3"><p className="text-xs text-gray-500">Saúde/Nutrição</p><p className="text-xl font-semibold text-orange-700">{metrics.restricoes}</p></CardContent></Card>
          </div>

          {attentionPoints.length > 0 && (
            <Card className="mb-4 border-red-100 bg-red-50/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-800 font-semibold">
                  <ShieldAlert className="h-5 w-5" /> Pontos de atenção
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  {attentionPoints.slice(0, 6).map((point, index) => (
                    <div key={`${point.tipo}-${index}`} className="rounded-md border border-red-100 bg-white px-3 py-2">
                      <p className="text-sm font-medium text-red-800">{point.titulo}</p>
                      <p className="text-xs text-red-700 mt-1">{point.descricao}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {([
              ['TODOS', 'Todos'],
              ['DIARIO', 'Diário'],
              ['OBSERVACAO', 'Observações'],
              ['RDIC', 'RDIC'],
              ['ALERTAS', 'Alertas'],
            ] as Array<[TimelineFilter, string]>).map(([value, label]) => (
              <Button key={value} size="sm" variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)}>
                {label}
              </Button>
            ))}
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              Nenhum registro encontrado para o filtro selecionado.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((event) => (
                <Card key={`${event.type}-${event.id}`} className="flex items-start gap-3 p-3 border bg-white">
                  {event.type === 'DIARIO' ? (
                    <BookOpen className="h-5 w-5 mt-1 text-indigo-500" />
                  ) : event.type === 'OBSERVACAO' ? (
                    <Activity className="h-5 w-5 mt-1 text-emerald-500" />
                  ) : event.type === 'ALERTA' ? (
                    <AlertTriangle className="h-5 w-5 mt-1 text-red-500" />
                  ) : event.source === 'DietaryRestriction' ? (
                    <HeartPulse className="h-5 w-5 mt-1 text-orange-500" />
                  ) : (
                    <FileText className="h-5 w-5 mt-1 text-amber-500" />
                  )}
                  <CardContent className="p-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800 truncate">{event.title || event.type}</p>
                      {(event.alert || event.type === 'ALERTA') && (
                        <span className="inline-flex items-center gap-1 text-[11px] rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                          <AlertTriangle className="h-3 w-3" /> Alerta
                        </span>
                      )}
                    </div>
                    <p className="inline-flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" /> {formatDate(event.date)}</p>
                    {event.description && <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>}
                    {event.alert && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1"><strong>Alerta:</strong> {event.alert}</p>}
                    {event.recommendation && <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-2 py-1"><strong>Recomendação:</strong> {event.recommendation}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
