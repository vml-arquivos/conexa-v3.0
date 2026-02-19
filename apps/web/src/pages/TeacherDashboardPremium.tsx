import { useState, useEffect } from 'react';
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
} from 'lucide-react';

/**
 * Dashboard Premium para Professor
 * Tema escuro com cores vibrantes e harmoniosas
 */
export default function TeacherDashboardPremium() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Dados mockados (serão substituídos por dados reais da API)
  const stats = {
    totalAlunos: 24,
    presentesToday: 22,
    atividadesPendentes: 3,
    planejamentosConcluidos: 12,
  };

  const recentActivities = [
    {
      id: 1,
      type: 'pedagogical',
      title: 'Roda de Conversa - Emoções',
      campo: 'O eu, o outro e o nós',
      time: '09:30',
      status: 'completed',
      color: '#FF6B9D',
    },
    {
      id: 2,
      type: 'meal',
      title: 'Lanche da Manhã',
      campo: 'Corpo, gestos e movimentos',
      time: '10:00',
      status: 'completed',
      color: '#4ADE80',
    },
    {
      id: 3,
      type: 'activity',
      title: 'Pintura com Tinta Guache',
      campo: 'Traços, sons, cores e formas',
      time: '10:30',
      status: 'in-progress',
      color: '#F59E0B',
    },
    {
      id: 4,
      type: 'reading',
      title: 'Contação de História',
      campo: 'Escuta, fala, pensamento e imaginação',
      time: '14:00',
      status: 'pending',
      color: '#3B82F6',
    },
  ];

  const alerts = [
    {
      id: 1,
      type: 'health',
      message: 'Maria Silva - Febre leve (37.8°C)',
      priority: 'high',
      time: '11:45',
    },
    {
      id: 2,
      type: 'behavior',
      message: 'João Pedro - Comportamento agitado',
      priority: 'medium',
      time: '10:20',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#FAFAFA] p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#3B82F6] to-[#A855F7] bg-clip-text text-transparent">
              Olá, Professora Ana! 👋
            </h1>
            <p className="text-[#A1A1AA] mt-2">
              Turma: Maternal II - Arara Canindé
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#3B82F6]">
              {currentTime.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="text-[#A1A1AA]">
              {currentTime.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-[#111113] border-[#27272A] hover:border-[#3B82F6] transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#A1A1AA]">
              Total de Alunos
            </CardTitle>
            <Users className="h-5 w-5 text-[#3B82F6]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#FAFAFA]">
              {stats.totalAlunos}
            </div>
            <p className="text-xs text-[#22C55E] mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              100% matriculados
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111113] border-[#27272A] hover:border-[#22C55E] transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#A1A1AA]">
              Presentes Hoje
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#FAFAFA]">
              {stats.presentesToday}
            </div>
            <p className="text-xs text-[#A1A1AA] mt-2">
              {Math.round((stats.presentesToday / stats.totalAlunos) * 100)}% de
              presença
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111113] border-[#27272A] hover:border-[#F59E0B] transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#A1A1AA]">
              Atividades Pendentes
            </CardTitle>
            <Clock className="h-5 w-5 text-[#F59E0B]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#FAFAFA]">
              {stats.atividadesPendentes}
            </div>
            <p className="text-xs text-[#F59E0B] mt-2">Para hoje</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111113] border-[#27272A] hover:border-[#A855F7] transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#A1A1AA]">
              Planejamentos
            </CardTitle>
            <BookOpen className="h-5 w-5 text-[#A855F7]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#FAFAFA]">
              {stats.planejamentosConcluidos}
            </div>
            <p className="text-xs text-[#A1A1AA] mt-2">Concluídos este mês</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atividades do Dia */}
        <div className="lg:col-span-2">
          <Card className="bg-[#111113] border-[#27272A]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#FAFAFA] flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-[#3B82F6]" />
                Atividades do Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 bg-[#1A1A1D] rounded-lg border border-[#27272A] hover:border-[#3F3F46] transition-all duration-300"
                  style={{
                    borderLeft: `4px solid ${activity.color}`,
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: `${activity.color}20`,
                      }}
                    >
                      {activity.type === 'pedagogical' && (
                        <BookOpen
                          className="h-6 w-6"
                          style={{ color: activity.color }}
                        />
                      )}
                      {activity.type === 'meal' && (
                        <Utensils
                          className="h-6 w-6"
                          style={{ color: activity.color }}
                        />
                      )}
                      {activity.type === 'activity' && (
                        <Activity
                          className="h-6 w-6"
                          style={{ color: activity.color }}
                        />
                      )}
                      {activity.type === 'reading' && (
                        <BookOpen
                          className="h-6 w-6"
                          style={{ color: activity.color }}
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#FAFAFA]">
                        {activity.title}
                      </h3>
                      <p className="text-sm text-[#A1A1AA]">{activity.campo}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-[#71717A]">
                      {activity.time}
                    </span>
                    <Badge
                      variant={
                        activity.status === 'completed'
                          ? 'default'
                          : activity.status === 'in-progress'
                          ? 'secondary'
                          : 'outline'
                      }
                      className={
                        activity.status === 'completed'
                          ? 'bg-[#22C55E] text-white'
                          : activity.status === 'in-progress'
                          ? 'bg-[#F59E0B] text-white'
                          : 'bg-[#3B82F6] text-white'
                      }
                    >
                      {activity.status === 'completed'
                        ? 'Concluída'
                        : activity.status === 'in-progress'
                        ? 'Em Andamento'
                        : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card className="bg-[#111113] border-[#27272A] mt-6">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#FAFAFA]">
                Ações Rápidas - One Touch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white h-24 flex flex-col items-center justify-center space-y-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <BookOpen className="h-6 w-6" />
                  <span className="text-sm">Registrar Atividade</span>
                </Button>
                <Button className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D] text-white h-24 flex flex-col items-center justify-center space-y-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                  <Utensils className="h-6 w-6" />
                  <span className="text-sm">Registrar Refeição</span>
                </Button>
                <Button className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white h-24 flex flex-col items-center justify-center space-y-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Heart className="h-6 w-6" />
                  <span className="text-sm">Registrar Saúde</span>
                </Button>
                <Button className="bg-gradient-to-r from-[#A855F7] to-[#9333EA] hover:from-[#9333EA] hover:to-[#7E22CE] text-white h-24 flex flex-col items-center justify-center space-y-2 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  <Star className="h-6 w-6" />
                  <span className="text-sm">Ver Planejamento</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Alertas e Próximas Atividades */}
        <div className="space-y-6">
          {/* Alertas */}
          <Card className="bg-[#111113] border-[#27272A]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#FAFAFA] flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-[#EF4444]" />
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.priority === 'high'
                      ? 'bg-[#EF4444]/10 border-[#EF4444]'
                      : 'bg-[#F59E0B]/10 border-[#F59E0B]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#FAFAFA]">
                        {alert.message}
                      </p>
                      <p className="text-xs text-[#71717A] mt-1">
                        {alert.time}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#3B82F6] hover:text-[#2563EB]"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Próximas Atividades */}
          <Card className="bg-[#111113] border-[#27272A]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#FAFAFA] flex items-center">
                <Clock className="h-5 w-5 mr-2 text-[#06B6D4]" />
                Próximas Atividades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[#FAFAFA]">
                    Almoço
                  </p>
                  <p className="text-xs text-[#A1A1AA]">11:30 - 12:00</p>
                </div>
                <Badge className="bg-[#22C55E] text-white">Em 15 min</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[#FAFAFA]">
                    Hora do Sono
                  </p>
                  <p className="text-xs text-[#A1A1AA]">12:30 - 14:00</p>
                </div>
                <Badge className="bg-[#3B82F6] text-white">Em 1h</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[#FAFAFA]">
                    Contação de História
                  </p>
                  <p className="text-xs text-[#A1A1AA]">14:00 - 14:30</p>
                </div>
                <Badge className="bg-[#A855F7] text-white">Em 2h30</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
