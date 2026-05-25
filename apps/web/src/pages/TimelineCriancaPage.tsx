import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import http from '../api/http';
import { BookOpen, Activity, FileText, ArrowLeft } from 'lucide-react';
import { ChildQuickActions } from '../components/children/ChildQuickActions';
import { toast } from 'sonner';

/**
 * Tela de timeline da criança
 *
 * Esta página unifica eventos de diferentes módulos (Diário de Bordo,
 * Observação de Desenvolvimento e RDIC) em uma linha do tempo única.
 * O objetivo é fornecer uma visão cronológica e consolidada do
 * desenvolvimento da criança, permitindo que professores, coordenadores
 * e demais perfis acompanhem rapidamente o histórico recente.
 */
export default function TimelineCriancaPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [child, setChild] = useState<any>(null);
  const [events, setEvents] = useState<Array<{
    id: string;
    type: 'DIARIO' | 'OBSERVACAO' | 'RDIC';
    date: string;
    title: string;
    description: string;
  }>>([]);

  // Mapeia tipos do Diário de Bordo para títulos amigáveis
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

  useEffect(() => {
    async function carregar() {
      if (!childId) return;
      setLoading(true);
      try {
        // Busca em paralelo os diferentes tipos de registro
        const [diaryRes, obsRes, rdicRes] = await Promise.all([
          http.get('/diary-events', { params: { childId, limit: '200' } }),
          http.get('/development-observations', { params: { childId, limit: '200' } }),
          http.get(`/rdic/child/${childId}/central`),
        ]);

        // Normaliza retorno do diário de bordo
        const diaryData: any[] = Array.isArray(diaryRes?.data)
          ? diaryRes.data
          : Array.isArray(diaryRes?.data?.data)
          ? diaryRes.data.data
          : [];
        // Normaliza retorno das observações de desenvolvimento
        const obsData: any[] = Array.isArray(obsRes?.data)
          ? obsRes.data
          : Array.isArray(obsRes?.data?.data)
          ? obsRes.data.data
          : [];
        // RDICs vêm no campo rdics do central
        const rdicData: any[] = Array.isArray(rdicRes?.data?.rdics)
          ? rdicRes.data.rdics
          : [];
        setChild(rdicRes?.data?.child ?? null);

        const evts: Array<{
          id: string;
          type: 'DIARIO' | 'OBSERVACAO' | 'RDIC';
          date: string;
          title: string;
          description: string;
        }> = [];

        // Processa eventos do diário
        diaryData.forEach((item) => {
          const data = item.eventDate ?? item.date ?? item.createdAt;
          if (!data) return;
          evts.push({
            id: item.id,
            type: 'DIARIO',
            date: data,
            title: DIARY_LABELS[item.type] ?? item.title ?? 'Diário de Bordo',
            description: item.description ?? item.content ?? '',
          });
        });

        // Processa observações de desenvolvimento
        obsData.forEach((item) => {
          const data = item.date ?? item.createdAt;
          if (!data) return;
          evts.push({
            id: item.id,
            type: 'OBSERVACAO',
            date: data,
            title: String(item.category ?? item.categoria ?? 'Observação').replace(/_/g, ' '),
            description: item.behaviorDescription ?? item.descricao ?? item.description ?? '',
          });
        });

        // Processa RDICs
        rdicData.forEach((item) => {
          const data = item.criadoEm ?? item.createdAt ?? item.submittedAt ?? null;
          if (!data) return;
          const periodo = item.periodoEnum ?? item.periodo ?? '';
          evts.push({
            id: item.id,
            type: 'RDIC',
            date: data,
            title: periodo ? `RDIC ${periodo}` : 'RDIC',
            description: `Status: ${item.status}`,
          });
        });

        // Ordena por data (mais recentes primeiro)
        evts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvents(evts);
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? 'Erro ao carregar timeline.';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [childId]);

  return (
    <PageShell>
      {/* Cabeçalho com botão de voltar e título */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="px-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-lg font-semibold text-gray-800">Linha do Tempo</h1>
      </div>

      <ChildQuickActions
        childId={childId}
        classroomId={child?.turma?.id}
        current="timeline"
        className="mb-4"
      />
      {loading ? (
        <LoadingState />
      ) : events.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">Nenhum registro encontrado.</div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <Card
              key={`${ev.type}-${ev.id}`}
              className="flex items-start gap-3 p-3 border bg-white"
            >
              {/* Ícone por tipo de evento */}
              {ev.type === 'DIARIO' ? (
                <BookOpen className="h-5 w-5 mt-1 text-indigo-500" />
              ) : ev.type === 'OBSERVACAO' ? (
                <Activity className="h-5 w-5 mt-1 text-emerald-500" />
              ) : (
                <FileText className="h-5 w-5 mt-1 text-amber-500" />
              )}
              <CardContent className="p-0 flex-1 space-y-0.5">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {ev.title || ev.type}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(ev.date).toLocaleDateString('pt-BR')} {' '}
                  {new Date(ev.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {ev.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {ev.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}