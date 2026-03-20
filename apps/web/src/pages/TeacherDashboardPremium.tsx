import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Heart,
  Utensils,
  Activity,
  Star,
  ArrowRight,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '@/api/http';
import { getAccessibleClassrooms } from '@/api/lookup';
import { flushOfflineQueue } from '@/api/diary.api';
import { useAuth } from '../app/AuthProvider';

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
  const [classroomName, setClassroomName] = useState('');
  const [children, setChildren] = useState<ClassroomChild[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalAlunos: 0,
    presentesToday: 0,
    atividadesPendentes: 0,
    planejamentosConcluidos: 0,
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
      setClassroomName(primary.name);

      const [childrenRes, attendanceRes] = await Promise.allSettled([
        http.get(`/classrooms/${primary.id}/children`),
        http.get('/attendance', { params: { classroomId: primary.id, date: getPedagogicalToday() } }),
      ]);

      const kids: ClassroomChild[] = childrenRes.status === 'fulfilled' ? childrenRes.value.data ?? [] : [];
      const attendance = attendanceRes.status === 'fulfilled' ? attendanceRes.value.data ?? [] : [];
      const presentCount = Array.isArray(attendance) ? attendance.filter((a: { present?: boolean }) => a.present).length : kids.length;

      setChildren(kids);
      setStats({ totalAlunos: kids.length, presentesToday: presentCount || kids.length, atividadesPendentes: 0, planejamentosConcluidos: 0 });

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
    <div className="min-h-screen bg-[#0A0A0B] text-[#FAFAFA] p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#3B82F6] to-[#A855F7] bg-clip-text text-transparent">
              Olá, {nomeProfessora}! 👋
            </h1>
            <p className="text-[#A1A1AA] mt-2">
              {classroomName ? `Turma: ${classroomName}` : loading ? 'Carregando turma...' : 'Nenhuma turma atribuída'}
            </p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="text-3xl font-bold text-[#3B82F6]">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[#A1A1AA] text-sm">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge className="bg-green-600/20 text-green-400 border-green-600/30 flex items-center gap-1">
                  <Wifi className="h-3 w-3" /> Online
                </Badge>
              ) : (
                <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 flex items-center gap-1">
                  <WifiOff className="h-3 w-3" /> Offline — registros em fila
                </Badge>
              )}
              <Button size="sm" variant="ghost" onClick={loadDashboardData} className="text-[#A1A1AA] hover:text-white" disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total de Alunos', value: stats.totalAlunos, icon: <Users className="h-6 w-6" />, color: '#3B82F6' },
          { label: 'Presentes Hoje', value: stats.presentesToday, icon: <CheckCircle2 className="h-6 w-6" />, color: '#22C55E' },
          { label: 'Atividades Pendentes', value: stats.atividadesPendentes, icon: <Clock className="h-6 w-6" />, color: '#F59E0B' },
          { label: 'Planejamentos', value: stats.planejamentosConcluidos, icon: <TrendingUp className="h-6 w-6" />, color: '#A855F7' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-[#111113] border-[#27272A]">
            <CardContent className="p-4">
              <div style={{ color: stat.color }} className="mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold" style={{ color: stat.color }}>
                {loading ? '—' : stat.value}
              </div>
              <div className="text-[#A1A1AA] text-sm mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ações Rápidas + Lista de Alunos */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-[#111113] border-[#27272A]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#FAFAFA] flex items-center">
                <Activity className="h-5 w-5 mr-2 text-[#3B82F6]" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => navigate('/app/diario-de-bordo')} className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white h-24 flex flex-col items-center justify-center space-y-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <BookOpen className="h-6 w-6" />
                  <span className="text-sm">Diário de Bordo</span>
                </Button>
                <Button onClick={() => navigate('/app/rdic-crianca')} className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D] text-white h-24 flex flex-col items-center justify-center space-y-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                  <Users className="h-6 w-6" />
                  <span className="text-sm">RDIC por Criança</span>
                </Button>
                <Button onClick={() => navigate('/app/plano-de-aula')} className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white h-24 flex flex-col items-center justify-center space-y-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Calendar className="h-6 w-6" />
                  <span className="text-sm">Plano de Aula</span>
                </Button>
                <Button onClick={() => navigate('/app/rdic-ria')} className="bg-gradient-to-r from-[#A855F7] to-[#9333EA] hover:from-[#9333EA] hover:to-[#7E22CE] text-white h-24 flex flex-col items-center justify-center space-y-2 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  <Star className="h-6 w-6" />
                  <span className="text-sm">RDIC / RIA</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Alunos */}
          <Card className="bg-[#111113] border-[#27272A]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#FAFAFA] flex items-center">
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                  {children.map((child) => (
                    <button key={child.id} onClick={() => navigate('/app/rdic-crianca')} className="flex items-center gap-2 p-2 bg-[#1A1A1D] rounded-lg hover:bg-[#27272A] transition-colors text-left">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#A855F7] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {child.firstName[0]}{child.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#FAFAFA] truncate">{child.firstName} {child.lastName}</p>
                        {child.dietaryRestrictions?.length ? <p className="text-xs text-yellow-400">⚠ Restrição alimentar</p> : null}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[#A1A1AA] text-center py-4">Nenhum aluno encontrado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — Alertas + Cuidados */}
        <div className="space-y-6">
          <Card className="bg-[#111113] border-[#27272A]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#FAFAFA] flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-[#EF4444]" />
                Alertas de Saúde
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alertasAlergias.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-green-600/10 rounded-lg border-l-4 border-green-500">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <p className="text-sm text-green-400">Nenhum alerta ativo</p>
                </div>
              ) : (
                alertasAlergias.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${alert.priority === 'high' ? 'bg-[#EF4444]/10 border-[#EF4444]' : 'bg-[#F59E0B]/10 border-[#F59E0B]'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#FAFAFA]">{alert.message}</p>
                        <p className="text-xs text-[#71717A] mt-1">{alert.time}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => navigate('/app/painel-alergias')} className="text-[#3B82F6] hover:text-[#2563EB]">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#111113] border-[#27272A]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#FAFAFA] flex items-center">
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
                <div key={item.label} className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-[#A1A1AA]">{item.icon}</span>
                    <p className="text-sm font-medium text-[#FAFAFA]">{item.label}</p>
                  </div>
                  <Badge className="bg-[#27272A] text-[#A1A1AA] border-[#3F3F46]">{item.time}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
