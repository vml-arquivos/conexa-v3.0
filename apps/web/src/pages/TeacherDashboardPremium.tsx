import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Users, Calendar, TrendingUp, AlertCircle, CheckCircle2,
  Clock, Heart, Utensils, Activity, Star, ArrowRight, Wifi, WifiOff,
  RefreshCw, PlusCircle, FileText, Smile, BarChart2, GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '@/api/http';
import { getAccessibleClassrooms } from '@/api/lookup';
import { flushOfflineQueue } from '@/api/diary.api';
import { useAuth } from '../app/AuthProvider';
import { getPedagogicalToday } from '@/utils/pedagogicalDate';

interface ClassroomChild {
  id: string;
  firstName: string;
  lastName: string;
  dietaryRestrictions?: Array<{ type: string; severity: string; description: string }>;
}

interface DashboardStats {
  totalAlunos: number;
  presentesToday: number;
  atividadesPendentes: number;
  planejamentosConcluidos: number;
}

interface EngajamentoStats {
  presencaMedia: number;       // % média dos últimos 30 dias
  diariosUltimos7: number;     // diários registrados nos últimos 7 dias
  planosUltimos30: number;     // planos criados nos últimos 30 dias
  atividadesFavoritas: string[]; // top 3 campos de experiência mais usados
}

/**
 * Dashboard Premium para Professor — conectado à API real
 * Missão 03 — UX 2 Segundos com optimistic UI e suporte offline (IndexedDB)
 */
export default function TeacherDashboardPremium() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [classroomName, setClassroomName] = useState('');
  const [children, setChildren] = useState<ClassroomChild[]>([]);
  const [hasPlanToday, setHasPlanToday] = useState<boolean | null>(null); // null = ainda carregando
  const [hasDiaryToday, setHasDiaryToday] = useState<boolean | null>(null);
  const [engajamento, setEngajamento] = useState<EngajamentoStats | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalAlunos: 0, presentesToday: 0, atividadesPendentes: 0, planejamentosConcluidos: 0,
  });
  const [alertasAlergias, setAlertasAlergias] = useState<
    Array<{ id: string; message: string; priority: 'high' | 'medium'; time: string }>
  >([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor de conectividade + flush da fila offline ao reconectar
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const flushed = await flushOfflineQueue();
      if (flushed > 0) toast.success(`${flushed} registro(s) offline sincronizados!`);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const classrooms = await getAccessibleClassrooms();
      if (!classrooms.length) { setLoading(false); return; }
      const primary = classrooms[0];
      setClassroomId(primary.id);
      setClassroomName(primary.name);

      const today = getPedagogicalToday();
      const [childrenRes, attendanceRes, planRes, diaryRes] = await Promise.allSettled([
        http.get(`/classrooms/${primary.id}/children`),
        http.get('/attendance/today', { params: { classroomId: primary.id, date: today } }),
        http.get('/lesson-plans', { params: { classroomId: primary.id, date: today } }),
        http.get('/diary-entries', { params: { classroomId: primary.id, date: today } }),
      ]);

      const kids: ClassroomChild[] = childrenRes.status === 'fulfilled' ? (childrenRes.value.data ?? []) : [];
      const attendance = attendanceRes.status === 'fulfilled' ? (attendanceRes.value.data ?? []) : [];
      const presentCount = Array.isArray(attendance)
        ? attendance.filter((a: { present?: boolean }) => a.present).length
        : kids.length;

      setChildren(kids);
      setStats({
        totalAlunos: kids.length,
        presentesToday: presentCount || kids.length,
        atividadesPendentes: 0,
        planejamentosConcluidos: 0,
      });

      // Verificar se há plano e diário para hoje
      if (planRes.status === 'fulfilled') {
        const plans = Array.isArray(planRes.value.data) ? planRes.value.data : [];
        setHasPlanToday(plans.length > 0);
      } else {
        setHasPlanToday(false);
      }
      if (diaryRes.status === 'fulfilled') {
        const diaries = Array.isArray(diaryRes.value.data) ? diaryRes.value.data : [];
        setHasDiaryToday(diaries.length > 0);
      } else {
        setHasDiaryToday(false);
      }

      // Alertas de alergias
      const alertas: typeof alertasAlergias = [];
      for (const child of kids) {
        if (child.dietaryRestrictions?.length) {
          for (const r of child.dietaryRestrictions) {
            alertas.push({
              id: `${child.id}-${r.type}`,
              message: `${child.firstName} ${child.lastName} — ${r.description || r.type}`,
              priority: ['SEVERA', 'GRAVE'].includes(r.severity) ? 'high' : 'medium',
              time: 'Ativo',
            });
          }
        }
      }
      setAlertasAlergias(alertas.slice(0, 5));

      // Carregar estatísticas de engajamento (últimos 30 dias)
      try {
        const [diariesHistRes, plansHistRes] = await Promise.allSettled([
          http.get('/diary-entries', { params: { classroomId: primary.id, limit: 100 } }),
          http.get('/lesson-plans', { params: { classroomId: primary.id, limit: 100 } }),
        ]);

        const allDiaries = diariesHistRes.status === 'fulfilled'
          ? (Array.isArray(diariesHistRes.value.data) ? diariesHistRes.value.data : [])
          : [];
        const allPlans = plansHistRes.status === 'fulfilled'
          ? (Array.isArray(plansHistRes.value.data) ? plansHistRes.value.data : [])
          : [];

        const cutoff7 = new Date(); cutoff7.setDate(cutoff7.getDate() - 7);
        const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30);

        const diariosUltimos7 = allDiaries.filter((d: any) => {
          const dt = d.date || d.createdAt;
          return dt && new Date(dt) >= cutoff7;
        }).length;

        const planosUltimos30 = allPlans.filter((p: any) => {
          const dt = p.date || p.createdAt;
          return dt && new Date(dt) >= cutoff30;
        }).length;

        // Campos de experiência mais usados
        const campoCount: Record<string, number> = {};
        for (const d of allDiaries) {
          const campo = d.campoExperiencia || d.campo_experiencia || d.field;
          if (campo) campoCount[campo] = (campoCount[campo] ?? 0) + 1;
        }
        const atividadesFavoritas = Object.entries(campoCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([k]) => k);

        // Presença média (aproximação: presentes hoje / total)
        const presencaMedia = kids.length > 0
          ? Math.round((presentCount / kids.length) * 100)
          : 0;

        setEngajamento({ presencaMedia, diariosUltimos7, planosUltimos30, atividadesFavoritas });
      } catch {
        // engajamento não crítico — ignora silenciosamente
      }
    } catch (err) {
      console.error('[TeacherDashboardPremium]', err);
      toast.error('Erro ao carregar dados da turma');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const nomeProfessora = ((user?.nome as string) || (user as any)?.firstName || 'Professora').split(' ')[0];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#FAFAFA] p-4 sm:p-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-[#3B82F6] to-[#A855F7] bg-clip-text text-transparent">
              Olá, {nomeProfessora}! 👋
            </h1>
            <p className="text-[#A1A1AA] mt-1 sm:mt-2 text-sm sm:text-base">
              {classroomName
                ? `Turma: ${classroomName}`
                : loading
                  ? 'Carregando turma...'
                  : 'Nenhuma turma atribuída'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-2xl sm:text-3xl font-bold text-[#3B82F6]">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[#A1A1AA] text-xs sm:text-sm text-right">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge className="bg-green-600/20 text-green-400 border-green-600/30 flex items-center gap-1 text-xs">
                  <Wifi className="h-3 w-3" /> Online
                </Badge>
              ) : (
                <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 flex items-center gap-1 text-xs">
                  <WifiOff className="h-3 w-3" /> Offline
                </Badge>
              )}
              <Button size="sm" variant="ghost" onClick={loadDashboardData} className="text-[#A1A1AA] hover:text-white h-7 w-7 p-0" disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA de hoje: plano e diário ────────────────────────────────────── */}
      {!loading && (hasPlanToday === false || hasDiaryToday === false) && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300 mb-2">Pendências para hoje</p>
              <div className="flex flex-wrap gap-2">
                {hasPlanToday === false && (
                  <Button
                    size="sm"
                    onClick={() => navigate('/app/plano-de-aula')}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs h-8 flex items-center gap-1.5"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Criar plano de hoje
                  </Button>
                )}
                {hasDiaryToday === false && (
                  <Button
                    size="sm"
                    onClick={() => navigate('/app/diario-de-bordo')}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs h-8 flex items-center gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Registrar diário de hoje
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Total de Alunos', value: stats.totalAlunos, icon: <Users className="h-5 w-5 sm:h-6 sm:w-6" />, color: '#3B82F6' },
          { label: 'Presentes Hoje', value: stats.presentesToday, icon: <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />, color: '#22C55E' },
          { label: 'Diários (7 dias)', value: engajamento?.diariosUltimos7 ?? '—', icon: <FileText className="h-5 w-5 sm:h-6 sm:w-6" />, color: '#F59E0B' },
          { label: 'Planos (30 dias)', value: engajamento?.planosUltimos30 ?? '—', icon: <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />, color: '#A855F7' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-[#111113] border-[#27272A]">
            <CardContent className="p-3 sm:p-4">
              <div style={{ color: stat.color }} className="mb-1.5 sm:mb-2">{stat.icon}</div>
              <div className="text-2xl sm:text-3xl font-bold" style={{ color: stat.color }}>
                {loading ? '—' : stat.value}
              </div>
              <div className="text-[#A1A1AA] text-xs sm:text-sm mt-0.5 sm:mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* ── Coluna principal ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">

          {/* Ações Rápidas */}
          <Card className="bg-[#111113] border-[#27272A]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl font-bold text-[#FAFAFA] flex items-center">
                <Activity className="h-5 w-5 mr-2 text-[#3B82F6]" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Button
                  onClick={() => navigate('/app/diario-de-bordo')}
                  className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white h-20 sm:h-24 flex flex-col items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(59,130,246,0.3)] min-h-[44px]"
                >
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm">Diário de Bordo</span>
                </Button>
                <Button
                  onClick={() => navigate('/app/plano-de-aula')}
                  className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white h-20 sm:h-24 flex flex-col items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.3)] min-h-[44px]"
                >
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm">Plano de Aula</span>
                </Button>
                <Button
                  onClick={() => navigate('/app/rdic-crianca')}
                  className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D] text-white h-20 sm:h-24 flex flex-col items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(34,197,94,0.3)] min-h-[44px]"
                >
                  <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm">RDIC por Criança</span>
                </Button>
                <Button
                  onClick={() => navigate('/app/rdic-ria')}
                  className="bg-gradient-to-r from-[#A855F7] to-[#9333EA] hover:from-[#9333EA] hover:to-[#7E22CE] text-white h-20 sm:h-24 flex flex-col items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(168,85,247,0.3)] min-h-[44px]"
                >
                  <Star className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm">RDIC / RIA</span>
                </Button>
                <Button
                  onClick={() => navigate('/app/matriz-pedagogica')}
                  className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0369A1] text-white h-20 sm:h-24 flex flex-col items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(14,165,233,0.3)] min-h-[44px]"
                >
                  <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm">Matriz 2026</span>
                </Button>
                <Button
                  onClick={() => navigate('/app/diario-calendario')}
                  className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] hover:from-[#DB2777] hover:to-[#BE185D] text-white h-20 sm:h-24 flex flex-col items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(236,72,153,0.3)] min-h-[44px]"
                >
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm">Calendário</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resumo de Engajamento da Turma */}
          <Card className="bg-[#111113] border-[#27272A]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl font-bold text-[#FAFAFA] flex items-center">
                <BarChart2 className="h-5 w-5 mr-2 text-[#A855F7]" />
                Engajamento da Turma
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !engajamento ? (
                <div className="flex items-center justify-center py-6">
                  <RefreshCw className="h-5 w-5 animate-spin text-[#3B82F6]" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Presença média */}
                  <div className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-xl">
                    <div className="flex items-center gap-2">
                      <Smile className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-[#FAFAFA]">Presença hoje</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-[#27272A] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                          style={{ width: `${engajamento.presencaMedia}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-green-400 w-10 text-right">
                        {engajamento.presencaMedia}%
                      </span>
                    </div>
                  </div>

                  {/* Diários recentes */}
                  <div className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-xl">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#F59E0B]" />
                      <span className="text-sm text-[#FAFAFA]">Diários nos últimos 7 dias</span>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold">
                      {engajamento.diariosUltimos7}
                    </Badge>
                  </div>

                  {/* Planos recentes */}
                  <div className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-xl">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#A855F7]" />
                      <span className="text-sm text-[#FAFAFA]">Planos nos últimos 30 dias</span>
                    </div>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 font-bold">
                      {engajamento.planosUltimos30}
                    </Badge>
                  </div>

                  {/* Campos de experiência favoritos */}
                  {engajamento.atividadesFavoritas.length > 0 && (
                    <div className="p-3 bg-[#1A1A1D] rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-4 w-4 text-[#3B82F6]" />
                        <span className="text-sm text-[#FAFAFA]">Campos mais trabalhados</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {engajamento.atividadesFavoritas.map((campo) => (
                          <Badge
                            key={campo}
                            className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs"
                          >
                            {campo}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/app/diario-calendario')}
                    className="w-full text-[#A1A1AA] hover:text-white hover:bg-[#27272A] flex items-center gap-1.5 mt-1"
                  >
                    Ver histórico completo <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de Alunos */}
          <Card className="bg-[#111113] border-[#27272A]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl font-bold text-[#FAFAFA] flex items-center">
                <Users className="h-5 w-5 mr-2 text-[#22C55E]" />
                Alunos da Turma ({stats.totalAlunos})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-[#3B82F6]" />
                </div>
              ) : children.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => navigate('/app/rdic-crianca')}
                      className="flex items-center gap-2 p-2.5 bg-[#1A1A1D] rounded-xl hover:bg-[#27272A] transition-colors text-left min-h-[44px]"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#A855F7] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {child.firstName[0]}{child.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#FAFAFA] truncate">
                          {child.firstName} {child.lastName}
                        </p>
                        {child.dietaryRestrictions?.length ? (
                          <p className="text-xs text-yellow-400">⚠ Restrição alimentar</p>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="h-10 w-10 mx-auto mb-2 text-[#3F3F46]" />
                  <p className="text-[#A1A1AA] text-sm">Nenhum aluno encontrado</p>
                  {classroomId && (
                    <p className="text-[#71717A] text-xs mt-1">
                      Verifique se a turma possui crianças cadastradas.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar lateral ──────────────────────────────────────────────── */}
        <div className="space-y-4 sm:space-y-6">
          {/* Alertas de Saúde */}
          <Card className="bg-[#111113] border-[#27272A]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl font-bold text-[#FAFAFA] flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-[#EF4444]" />
                Alertas de Saúde
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alertasAlergias.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-green-600/10 rounded-xl border-l-4 border-green-500">
                  <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-400">Nenhum alerta ativo</p>
                </div>
              ) : (
                alertasAlergias.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl border-l-4 ${alert.priority === 'high' ? 'bg-[#EF4444]/10 border-[#EF4444]' : 'bg-[#F59E0B]/10 border-[#F59E0B]'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#FAFAFA] truncate">{alert.message}</p>
                        <p className="text-xs text-[#71717A] mt-0.5">{alert.time}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate('/app/painel-alergias')}
                        className="text-[#3B82F6] hover:text-[#2563EB] h-7 w-7 p-0 flex-shrink-0"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Cuidados do Dia */}
          <Card className="bg-[#111113] border-[#27272A]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl font-bold text-[#FAFAFA] flex items-center">
                <Heart className="h-5 w-5 mr-2 text-[#EF4444]" />
                Cuidados do Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Lanche da Manhã', time: '09:30', icon: <Utensils className="h-4 w-4" /> },
                { label: 'Almoço', time: '11:30', icon: <Utensils className="h-4 w-4" /> },
                { label: 'Hora do Sono', time: '12:30', icon: <Clock className="h-4 w-4" /> },
                { label: 'Lanche da Tarde', time: '15:00', icon: <Utensils className="h-4 w-4" /> },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-xl min-h-[44px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#A1A1AA]">{item.icon}</span>
                    <p className="text-sm font-medium text-[#FAFAFA]">{item.label}</p>
                  </div>
                  <Badge className="bg-[#27272A] text-[#A1A1AA] border-[#3F3F46]">{item.time}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Status do dia */}
          {!loading && (
            <Card className="bg-[#111113] border-[#27272A]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-[#FAFAFA] flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-[#22C55E]" />
                  Status do Dia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className={`flex items-center justify-between p-2.5 rounded-xl ${hasPlanToday ? 'bg-green-600/10' : 'bg-red-600/10'}`}>
                  <span className="text-sm text-[#FAFAFA]">Plano de aula</span>
                  {hasPlanToday ? (
                    <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">✓ Criado</Badge>
                  ) : (
                    <button
                      onClick={() => navigate('/app/plano-de-aula')}
                      className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
                    >
                      Criar agora
                    </button>
                  )}
                </div>
                <div className={`flex items-center justify-between p-2.5 rounded-xl ${hasDiaryToday ? 'bg-green-600/10' : 'bg-red-600/10'}`}>
                  <span className="text-sm text-[#FAFAFA]">Diário de bordo</span>
                  {hasDiaryToday ? (
                    <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">✓ Registrado</Badge>
                  ) : (
                    <button
                      onClick={() => navigate('/app/diario-de-bordo')}
                      className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
                    >
                      Registrar
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
