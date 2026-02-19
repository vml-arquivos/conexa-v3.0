import { useEffect, useState } from 'react';
import { useAuth } from '../app/AuthProvider';
import { getPlannings, type Planning } from '../api/plannings';
import { getCurriculumEntries, type CurriculumEntry } from '../api/curriculumEntries';
import { getPedagogicalToday } from '../utils/pedagogicalDate';
import { OneTouchDiaryPanel } from '../components/dashboard/OneTouchDiaryPanel';
import { QuickObservationInput } from '../components/dashboard/QuickObservationInput';
import { ClassroomFeedMini } from '../components/dashboard/ClassroomFeedMini';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { PageShell } from '../components/ui/PageShell';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { toast } from 'sonner';
import { BookOpen, Users, CheckCircle, Info } from 'lucide-react';

type DashboardState = 'loading' | 'blocked' | 'ready';

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [state, setState] = useState<DashboardState>('loading');
  const [planning, setPlanning] = useState<Planning | null>(null);
  const [entry, setEntry] = useState<CurriculumEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [classroomId, setClassroomId] = useState<string | null>(null);

  // Mock de alunos para o MVP (Em produção viria de uma API)
  const studentsMock = [
    { id: 'std-1', name: 'Ana Silva' },
    { id: 'std-2', name: 'Bruno Oliveira' },
    { id: 'std-3', name: 'Carla Santos' },
    { id: 'std-4', name: 'Daniel Lima' },
    { id: 'std-5', name: 'Eduarda Costa' },
  ];

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setState('loading');
      setError(null);

      const currentClassroomId = user?.user?.classrooms?.[0]?.id || null;
      setClassroomId(currentClassroomId);
      
      if (!currentClassroomId) {
        setState('blocked');
        setError('Nenhuma turma atribuída ao seu usuário. Entre em contato com a coordenação.');
        return;
      }

      const plannings = await getPlannings({ 
        status: 'EM_EXECUCAO',
        classroomId: currentClassroomId 
      });

      if (!plannings || plannings.length === 0) {
        setState('blocked');
        setError('Nenhum planejamento ativo encontrado para sua turma. Entre em contato com a coordenação.');
        return;
      }

      const activePlanning = plannings[0];
      setPlanning(activePlanning);

      const today = getPedagogicalToday();
      const entries = await getCurriculumEntries({
        matrixId: activePlanning.curriculumMatrixId,
        startDate: today,
        endDate: today,
      });

      if (!entries || entries.length === 0) {
        setState('blocked');
        setError('Não há entrada curricular programada para hoje. Verifique o calendário letivo.');
        return;
      }

      setEntry(entries[0]);
      setState('ready');
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err);
      setState('blocked');
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao carregar informações do dia.';
      setError(errorMessage);
      toast.error("Erro de Carregamento", {
        description: errorMessage,
      });
    }
  }

  return (
    <PageShell 
      title="Dashboard do Professor" 
      description="Gerencie as atividades da sua turma para hoje."
      headerActions={
        <Badge variant={state === 'ready' ? "success" : state === 'loading' ? "secondary" : "warning"} className="px-3 py-1">
          {state === 'ready' ? "Pronto para Registro" : state === 'loading' ? "Carregando..." : "Bloqueado"}
        </Badge>
      }
    >
      {state === 'loading' && <LoadingState />}

      {state === 'blocked' && (
        <div className="space-y-6">
          <ErrorState 
            title="Trava Pedagógica Ativa" 
            message={error || "O registro de diário está bloqueado no momento."}
            onRetry={loadDashboard}
          />
          
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="pt-6 flex gap-4 items-start">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Por que estou bloqueado?</p>
                <p>O registro de diário só é permitido quando:</p>
                <ul className="list-disc list-inside ml-2">
                  <li>Existe um planejamento ativo (EM_EXECUCAO) para sua turma.</li>
                  <li>Existe uma entrada curricular programada para a data de hoje.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {state === 'ready' && planning && entry && classroomId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Status e Objetivo */}
            <Card className="border-primary/10 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Planejamento Ativo: {planning.title}
                  </CardTitle>
                  <Badge variant="secondary" className="uppercase">Em Execução</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-background p-4 rounded-lg border shadow-sm">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5" /> Objetivo do Dia
                    </h3>
                    <p className="text-foreground font-medium leading-relaxed">{entry.objetivoBNCC}</p>
                    <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-muted-foreground">Intencionalidade:</span>
                        <p className="text-foreground mt-1">{entry.intencionalidade}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-muted-foreground">Atividade Sugerida:</span>
                        <p className="text-foreground mt-1">{entry.exemploAtividade}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* One-Touch Panel */}
            <OneTouchDiaryPanel 
              planningId={planning.id}
              curriculumEntryId={entry.id}
              classroomId={classroomId}
              students={studentsMock}
            />

            {/* Quick Observation */}
            <QuickObservationInput 
              planningId={planning.id}
              curriculumEntryId={entry.id}
              classroomId={classroomId}
              students={studentsMock}
            />
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-8">
            {/* Info da Turma */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Sua Turma
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total de Alunos:</span>
                    <Badge variant="outline">{studentsMock.length}</Badge>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-2 border-t">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">ID da Turma</span>
                    <code className="text-[10px] bg-muted p-1.5 rounded block truncate font-mono">
                      {classroomId}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feed de Atividades */}
            <ClassroomFeedMini classroomId={classroomId} />
          </div>
        </div>
      )}
    </PageShell>
  );
}
