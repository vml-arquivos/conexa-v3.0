import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles } from '../app/RoleProtectedRoute';
import { getPlannings } from '../api/plannings';
import { getCurriculumEntries, type CurriculumEntry } from '../api/curriculumEntries';
import { getPedagogicalToday } from '../utils/pedagogicalDate';
import { OneTouchDiaryPanel } from '../components/dashboard/OneTouchDiaryPanel';
import { QuickObservationInput } from '../components/dashboard/QuickObservationInput';
import { ClassroomFeedMini } from '../components/dashboard/ClassroomFeedMini';
import { StudentDevelopmentPanel } from '../components/dashboard/StudentDevelopmentPanel';
import { PendenciasPanel } from '../components/dashboard/PendenciasPanel';
import { PlanoDoDia } from '../components/dashboard/PlanoDodia';
import { MaterialRequestForm } from '../components/material-request/MaterialRequestForm';
import { MaterialRequestList } from '../components/material-request/MaterialRequestList';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { UnitSelect } from '../components/select/UnitSelect';
import { ClassroomSelect } from '../components/select/ClassroomSelect';
import { useToast } from '../hooks/use-toast';
import {
  BookOpen, Calendar, Users, AlertTriangle, CheckCircle,
  ShoppingCart, Star, LayoutDashboard, ClipboardList,
  ChevronRight, RefreshCw, GraduationCap
} from 'lucide-react';
import { getErrorMessage } from '../utils/errorMessage';
import http from '../api/http';

type DashboardState = 'idle' | 'loading' | 'select-required' | 'blocked' | 'ready';
type ActiveTab = 'dashboard' | 'desenvolvimento' | 'requisicoes' | 'curriculo';

// Extensão local do tipo Planning para campos adicionais
interface PlanningExtended {
  id: string;
  title: string;
  description?: string;
  status: string;
  type: string;
  classroomId: string;
  curriculumMatrixId: string;
  startDate?: string;
  endDate?: string;
  pedagogicalContent?: string;
  [key: string]: unknown;
}

interface StudentRef {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const userRoles = normalizeRoles(user);
  const { toast } = useToast();

  const [state, setState] = useState<DashboardState>('idle');
  const [planning, setPlanning] = useState<PlanningExtended | null>(null);
  const [entry, setEntry] = useState<CurriculumEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [classroomId, setClassroomId] = useState<string>('');
  const [classroomName, setClassroomName] = useState<string>('');
  const [unitId, setUnitId] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [students, setStudents] = useState<StudentRef[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [materialRefreshTrigger, setMaterialRefreshTrigger] = useState(0);

  // Roles
  const isProfessor = userRoles.some((role) => role.startsWith('PROFESSOR'));
  const isGlobalLevel = userRoles.some((role) =>
    ['MANTENEDORA', 'DEVELOPER'].includes(role)
  );

  // Carregar alunos da turma
  const loadStudents = useCallback(async (targetClassroomId: string) => {
    if (!targetClassroomId) return;
    try {
      setLoadingStudents(true);
      const response = await http.get('/lookup/children/accessible', {
        params: { classroomId: targetClassroomId }
      });
      const data = response.data;
      if (Array.isArray(data) && data.length > 0) {
        setStudents(data);
      } else {
        const response2 = await http.get(`/classrooms/${targetClassroomId}/children`);
        setStudents(response2.data || []);
      }
    } catch {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  const loadDashboard = useCallback(async (targetId?: string) => {
    const effectiveClassroomId = targetId || classroomId;
    if (!effectiveClassroomId && !isProfessor) {
      setState('select-required');
      return;
    }
    try {
      setState('loading');
      setError(null);
      if (!effectiveClassroomId && !isProfessor) {
        setState('select-required');
        setError('Selecione uma turma para visualizar o dashboard.');
        return;
      }
      const plannings = await getPlannings({
        status: 'EM_EXECUCAO',
        ...(effectiveClassroomId && { classroomId: effectiveClassroomId }),
      });
      if (!plannings || plannings.length === 0) {
        setState('blocked');
        setError('Nenhum planejamento ativo encontrado para esta turma. Entre em contato com a coordenação.');
        return;
      }
      const activePlanning = plannings[0] as PlanningExtended;
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
      if (effectiveClassroomId) {
        loadStudents(effectiveClassroomId);
      }
    } catch (err: unknown) {
      console.error('Erro ao carregar dashboard:', err);
      setState('blocked');
      const errorMessage = getErrorMessage(err, 'Erro ao carregar informações do dia.');
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Erro de Carregamento',
        description: errorMessage,
      });
    }
  }, [classroomId, isProfessor, loadStudents, toast]);

  useEffect(() => {
    if (isProfessor && state === 'idle') {
      loadDashboard();
    }
  }, [isProfessor, state, loadDashboard]);

  const handleClassroomChange = (newClassroomId: string, name?: string) => {
    setClassroomId(newClassroomId);
    if (name) setClassroomName(name);
    if (newClassroomId) {
      loadDashboard(newClassroomId);
    }
  };

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Painel Principal', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'desenvolvimento', label: 'Desenvolvimento', icon: <Star className="h-4 w-4" /> },
    { id: 'curriculo', label: 'Currículo', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'requisicoes', label: 'Requisições', icon: <ShoppingCart className="h-4 w-4" /> },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Dashboard do Professor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as atividades, registros e requisições da sua turma.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-primary font-medium text-sm">
            <Calendar className="h-4 w-4" />
            <span className="capitalize">{today}</span>
          </div>
          {state === 'ready' && (
            <button
              onClick={() => loadDashboard()}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Atualizar
            </button>
          )}
        </div>
      </header>

      {/* Seleção de Unidade e Turma */}
      {(isGlobalLevel || !isProfessor) && (
        <Card className="border-gray-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {isGlobalLevel && (
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Unidade</label>
                  <UnitSelect
                    value={unitId}
                    onChange={(id) => { setUnitId(id); setClassroomId(''); setState('idle'); }}
                  />
                </div>
              )}
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Turma</label>
                <ClassroomSelect
                  value={classroomId}
                  unitId={unitId || undefined}
                  onChange={(id) => handleClassroomChange(id)}
                />
              </div>
              {classroomId && (
                <div className="flex items-end">
                  <button
                    onClick={() => loadDashboard()}
                    className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    <ChevronRight className="h-4 w-4" /> Carregar
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Professor: select de turma */}
      {isProfessor && (
        <Card className="border-gray-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Sua Turma</label>
                <ClassroomSelect
                  value={classroomId}
                  onChange={(id) => handleClassroomChange(id)}
                  autoSelectSingle
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de navegação */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Estado: Carregando */}
      {state === 'loading' && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mr-3" />
          <span>Carregando informações do dia...</span>
        </div>
      )}

      {/* Estado: Selecionar turma */}
      {(state === 'idle' || state === 'select-required') && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Users className="h-5 w-5" />
              {isProfessor ? 'Aguardando Turma' : 'Selecione uma Turma'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700">
              {isProfessor
                ? 'Sua turma será carregada automaticamente. Se tiver mais de uma, selecione acima.'
                : isGlobalLevel
                  ? 'Selecione uma unidade e uma turma acima para visualizar o dashboard pedagógico.'
                  : 'Selecione uma turma acima para visualizar o dashboard pedagógico.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Estado: Bloqueado */}
      {state === 'blocked' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Trava Pedagógica Ativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">{error}</p>
            <p className="text-sm text-yellow-600 mt-4">
              O registro de diário só é permitido quando há um planejamento ativo e uma entrada curricular programada para o dia.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo Principal — Tabs */}
      {state === 'ready' && (
        <>
          {/* ===== TAB: PAINEL PRINCIPAL ===== */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* KPIs Rápidos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{students.length || '—'}</p>
                    <p className="text-xs text-blue-600 font-medium mt-0.5">Crianças</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{planning ? '✓' : '—'}</p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">Planejamento</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{entry ? '✓' : '—'}</p>
                    <p className="text-xs text-purple-600 font-medium mt-0.5">Currículo Hoje</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-700">0</p>
                    <p className="text-xs text-orange-600 font-medium mt-0.5">Pendências</p>
                  </div>
                </div>

                {/* Plano do Dia */}
                <PlanoDoDia planning={planning} entry={entry} />

                {/* Microgestos One-Touch */}
                {planning && entry && classroomId && (
                  <>
                    <OneTouchDiaryPanel
                      planningId={planning.id}
                      curriculumEntryId={entry.id}
                      classroomId={classroomId}
                      students={students}
                    />
                    <QuickObservationInput
                      planningId={planning.id}
                      curriculumEntryId={entry.id}
                      classroomId={classroomId}
                      students={students}
                    />
                  </>
                )}
              </div>

              <div className="space-y-6">
                {/* Info da Turma */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      {classroomName || 'Turma Selecionada'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total de Crianças:</span>
                        <span className="font-bold">
                          {loadingStudents ? '...' : students.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Ativo
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pendências */}
                <PendenciasPanel classroomId={classroomId || undefined} />

                {/* Feed de Atividades */}
                {classroomId && <ClassroomFeedMini classroomId={classroomId} />}

                {/* Acesso Rápido às Requisições */}
                <Card className="border-blue-100 bg-blue-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                      Requisições de Materiais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-blue-700 mb-3">
                      Solicite materiais pedagógicos, de higiene, limpeza ou alimentação para sua turma.
                    </p>
                    <button
                      onClick={() => setActiveTab('requisicoes')}
                      className="w-full text-sm bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Gerenciar Requisições
                    </button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ===== TAB: DESENVOLVIMENTO INDIVIDUAL ===== */}
          {activeTab === 'desenvolvimento' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {planning && entry && classroomId ? (
                  <StudentDevelopmentPanel
                    planningId={planning.id}
                    curriculumEntryId={entry.id}
                    classroomId={classroomId}
                    students={students}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-10 text-center text-gray-400">
                      <Star className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Selecione uma turma com planejamento ativo para registrar o desenvolvimento das crianças.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
              <div className="space-y-6">
                <PendenciasPanel classroomId={classroomId || undefined} />
                {classroomId && <ClassroomFeedMini classroomId={classroomId} />}
              </div>
            </div>
          )}

          {/* ===== TAB: CURRÍCULO E MATRIZ PEDAGÓGICA ===== */}
          {activeTab === 'curriculo' && (
            <div className="space-y-6">
              <PlanoDoDia planning={planning} entry={entry} />
              {planning && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Detalhes do Planejamento Ativo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Título</p>
                        <p className="font-medium text-gray-900">{planning.title}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-medium">
                          <CheckCircle className="h-3 w-3" />
                          {planning.status === 'EM_EXECUCAO' ? 'Em Execução' : planning.status}
                        </span>
                      </div>
                      {planning.startDate && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Período</p>
                          <p className="text-gray-700">
                            {new Date(planning.startDate).toLocaleDateString('pt-BR')}
                            {planning.endDate && ` — ${new Date(planning.endDate).toLocaleDateString('pt-BR')}`}
                          </p>
                        </div>
                      )}
                    </div>
                    {planning.pedagogicalContent && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Conteúdo Pedagógico</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{planning.pedagogicalContent}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ===== TAB: REQUISIÇÕES DE MATERIAIS ===== */}
          {activeTab === 'requisicoes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <MaterialRequestForm
                  classroomId={classroomId || undefined}
                  classroomName={classroomName || undefined}
                  onSuccess={() => setMaterialRefreshTrigger(prev => prev + 1)}
                />
              </div>
              <div>
                <MaterialRequestList refreshTrigger={materialRefreshTrigger} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Aba de Requisições disponível mesmo sem turma carregada */}
      {state !== 'ready' && state !== 'loading' && activeTab === 'requisicoes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <MaterialRequestForm
              classroomId={classroomId || undefined}
              classroomName={classroomName || undefined}
              onSuccess={() => setMaterialRefreshTrigger(prev => prev + 1)}
            />
          </div>
          <div>
            <MaterialRequestList refreshTrigger={materialRefreshTrigger} />
          </div>
        </div>
      )}
    </div>
  );
}
