import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import http from '../api/http';
import { BookOpen, Activity, FileText, ArrowLeft, AlertTriangle, Clock } from 'lucide-react';
import { ChildQuickActions } from '../components/children/ChildQuickActions';
import { toast } from 'sonner';

type TimelineType = 'DIARIO' | 'OBSERVACAO' | 'RDIC';
type TimelineFilter = 'TODOS' | TimelineType | 'ALERTAS';

type TimelineEvent = {
  id: string;
  type: TimelineType;
  date: string;
  title: string;
  description: string;
  alert?: string;
  recommendation?: string;
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
    child?.turma?.id ??
    child?.classroom?.id ??
    child?.classroomId ??
    child?.activeEnrollment?.classroomId ??
    child?.enrollment?.classroomId ??
    child?.matriculaAtiva?.classroomId
  );
}

/**
 * Timeline da criança.
 *
 * Camada de leitura e diagnóstico visual sobre dados já existentes.
 * Não altera matriz, planejamento, diário, RDIC ou qualquer dado histórico.
 */
export default function TimelineCriancaPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [child, setChild] = useState<any>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filter, setFilter] = useState<TimelineFilter>('TODOS');

  useEffect(() => {
    async function carregar() {
      if (!childId) return;
      setLoading(true);
      try {
        const [diaryRes, obsRes, rdicRes] = await Promise.all([
          http.get('/diary-events', { params: { childId, limit: '200' } }),
          http.get('/development-observations', { params: { childId, limit: '200' } }),
          http.get(`/rdic/child/${childId}/central`),
        ]);

        const diaryData = asArray(diaryRes?.data);
        const obsData = asArray(obsRes?.data);
        const rdicData = Array.isArray(rdicRes?.data?.rdics) ? rdicRes.data.rdics : [];
        const childData = rdicRes?.data?.child ?? rdicRes?.data?.crianca ?? null;
        setChild(childData);

        const nextEvents: TimelineEvent[] = [];

        diaryData.forEach((item) => {
          const date = pickDate(item.eventDate, item.date, item.createdAt, item.updatedAt);
          if (!date) return;
          nextEvents.push({
            id: String(item.id ?? `${date}-diario`),
            type: 'DIARIO',
            date,
            title: DIARY_LABELS[item.type] ?? item.title ?? 'Diário de Bordo',
            description: item.description ?? item.content ?? item.notes ?? '',
          });
        });

        obsData.forEach((item) => {
          const date = pickDate(item.date, item.data, item.createdAt, item.updatedAt);
          if (!date) return;
          const category = String(item.category ?? item.categoria ?? 'GERAL');
          nextEvents.push({
            id: String(item.id ?? `${date}-observacao`),
            type: 'OBSERVACAO',
            date,
            title: OBS_LABELS[category] ?? category.replace(/_/g, ' '),
            description: item.behaviorDescription ?? item.description ?? item.descricao ?? item.learningProgress ?? '',
            alert: item.developmentAlerts ?? '',
            recommendation: item.recommendations ?? '',
          });
        });

        rdicData.forEach((item) => {
          const date = pickDate(item.publicadoEm, item.finalizadoEm, item.reviewedAt, item.submittedAt, item.criadoEm, item.createdAt, item.updatedAt);
          if (!date) return;
          const periodo = item.periodoEnum ?? item.periodo ?? item.period ?? '';
          nextEvents.push({
            id: String(item.id ?? `${date}-rdic`),
            type: 'RDIC',
            date,
            title: periodo ? `RDIC ${periodo}` : 'RDIC',
            description: item.status ? `Status: ${item.status}` : 'Relatório individual da criança',
          });
        });

        nextEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvents(nextEvents);
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
    return {
      total: events.length,
      diario: events.filter((event) => event.type === 'DIARIO').length,
      observacoes: events.filter((event) => event.type === 'OBSERVACAO').length,
      rdic: events.filter((event) => event.type === 'RDIC').length,
      alertas: events.filter((event) => Boolean(event.alert?.trim())).length,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (filter === 'TODOS') return events;
    if (filter === 'ALERTAS') return events.filter((event) => Boolean(event.alert?.trim()));
    return events.filter((event) => event.type === filter);
  }, [events, filter]);

  const childName = child?.name ?? child?.nome ?? child?.fullName ?? 'Criança';
  const classroomId = getClassroomId(child);

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="px-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <div className="text-right">
          <h1 className="text-lg font-semibold text-gray-800">Linha do Tempo</h1>
          <p className="text-xs text-gray-500">{childName}</p>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <Card className="border-slate-200">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-xl font-semibold text-gray-900">{metrics.total}</p>
              </CardContent>
            </Card>
            <Card className="border-indigo-100">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">Diário</p>
                <p className="text-xl font-semibold text-indigo-700">{metrics.diario}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-100">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">Observações</p>
                <p className="text-xl font-semibold text-emerald-700">{metrics.observacoes}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-100">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">RDIC</p>
                <p className="text-xl font-semibold text-amber-700">{metrics.rdic}</p>
              </CardContent>
            </Card>
            <Card className="border-red-100">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">Alertas</p>
                <p className="text-xl font-semibold text-red-700">{metrics.alertas}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {([
              ['TODOS', 'Todos'],
              ['DIARIO', 'Diário'],
              ['OBSERVACAO', 'Observações'],
              ['RDIC', 'RDIC'],
              ['ALERTAS', 'Alertas'],
            ] as Array<[TimelineFilter, string]>).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={filter === value ? 'default' : 'outline'}
                onClick={() => setFilter(value)}
              >
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
                  ) : (
                    <FileText className="h-5 w-5 mt-1 text-amber-500" />
                  )}
                  <CardContent className="p-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {event.title || event.type}
                      </p>
                      {event.alert && (
                        <span className="inline-flex items-center gap-1 text-[11px] rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                          <AlertTriangle className="h-3 w-3" /> Alerta
                        </span>
                      )}
                    </div>
                    <p className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" /> {formatDate(event.date)}
                    </p>
                    {event.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                    )}
                    {event.alert && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1">
                        <strong>Alerta:</strong> {event.alert}
                      </p>
                    )}
                    {event.recommendation && (
                      <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-2 py-1">
                        <strong>Recomendação:</strong> {event.recommendation}
                      </p>
                    )}
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
