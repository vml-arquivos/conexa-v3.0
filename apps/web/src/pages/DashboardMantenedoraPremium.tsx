import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  School,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
} from 'lucide-react';

// Cores vibrantes para gráficos
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
  orange: '#F97316',
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.purple,
  COLORS.pink,
  COLORS.cyan,
];

export default function DashboardMantenedoraPremium() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Buscar dados reais da API
    const mockData = {
      totalUnits: 7,
      totalStudents: 450,
      totalTeachers: 85,
      activeEnrollments: 432,
      monthlyRevenue: 125000,
      pendingRequests: 12,
      completedActivities: 1250,
      avgAttendance: 94.5,
    };
    setStats(mockData);
    setLoading(false);
  }, []);

  // Dados para gráfico de evolução mensal
  const monthlyData = [
    { month: 'Jan', students: 380, revenue: 95000, activities: 980 },
    { month: 'Fev', students: 400, revenue: 105000, activities: 1050 },
    { month: 'Mar', students: 420, revenue: 115000, activities: 1150 },
    { month: 'Abr', students: 435, revenue: 120000, activities: 1200 },
    { month: 'Mai', students: 450, revenue: 125000, activities: 1250 },
  ];

  // Dados para gráfico de distribuição por unidade
  const unitsData = [
    { name: 'Arara Canindé', students: 85, color: COLORS.primary },
    { name: 'Beija-Flor', students: 72, color: COLORS.success },
    { name: 'Colibri', students: 68, color: COLORS.warning },
    { name: 'Sabiá', students: 65, color: COLORS.purple },
    { name: 'Tucano', students: 60, color: COLORS.pink },
    { name: 'Papagaio', students: 55, color: COLORS.cyan },
    { name: 'Maritaca', students: 45, color: COLORS.orange },
  ];

  // Dados para gráfico de atividades pedagógicas
  const activitiesData = [
    { type: 'Atividades Pedagógicas', count: 450, color: COLORS.primary },
    { type: 'Refeições', count: 1350, color: COLORS.success },
    { type: 'Higiene', count: 900, color: COLORS.cyan },
    { type: 'Sono', count: 450, color: COLORS.purple },
    { type: 'Desenvolvimento', count: 320, color: COLORS.warning },
    { type: 'Saúde', count: 80, color: COLORS.danger },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-white">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard Mantenedora</h1>
        <p className="text-gray-400">Visão geral de todas as unidades</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total de Unidades</CardTitle>
            <School className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.totalUnits}</div>
            <p className="text-xs text-white/70 mt-1">Todas ativas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total de Alunos</CardTitle>
            <Users className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.totalStudents}</div>
            <p className="text-xs text-white/70 mt-1">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +5.2% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Professores</CardTitle>
            <Users className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.totalTeachers}</div>
            <p className="text-xs text-white/70 mt-1">Equipe completa</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Receita Mensal</CardTitle>
            <DollarSign className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              R$ {(stats.monthlyRevenue / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-white/70 mt-1">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +8.7% vs mês anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Evolução Mensal */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Evolução Mensal</CardTitle>
            <CardDescription className="text-gray-400">
              Crescimento de alunos e receita
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis yAxisId="left" stroke="#9CA3AF" />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="students"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  name="Alunos"
                  dot={{ fill: COLORS.primary, r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.success}
                  strokeWidth={3}
                  name="Receita (R$)"
                  dot={{ fill: COLORS.success, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Unidade */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Distribuição por Unidade</CardTitle>
            <CardDescription className="text-gray-400">
              Número de alunos por unidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={unitsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="students" name="Alunos" radius={[8, 8, 0, 0]}>
                  {unitsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Atividades Pedagógicas */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Atividades Pedagógicas</CardTitle>
            <CardDescription className="text-gray-400">
              Distribuição de atividades registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={activitiesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {activitiesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Indicadores de Performance */}
        <Card className="bg-gray-900/50 border-gray-800 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Indicadores de Performance</CardTitle>
            <CardDescription className="text-gray-400">
              Métricas operacionais em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="text-sm text-gray-400">Taxa de Presença</p>
                  <p className="text-2xl font-bold text-white">{stats.avgAttendance}%</p>
                </div>
              </div>
              <Badge className="bg-green-600 text-white">Excelente</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-400">Atividades Concluídas</p>
                  <p className="text-2xl font-bold text-white">{stats.completedActivities}</p>
                </div>
              </div>
              <Badge className="bg-blue-600 text-white">Este mês</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-400">Requisições Pendentes</p>
                  <p className="text-2xl font-bold text-white">{stats.pendingRequests}</p>
                </div>
              </div>
              <Badge className="bg-orange-600 text-white">Ação necessária</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-400">Matrículas Ativas</p>
                  <p className="text-2xl font-bold text-white">{stats.activeEnrollments}</p>
                </div>
              </div>
              <Badge className="bg-purple-600 text-white">96% ocupação</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gray-900/50 border-gray-800 shadow-xl backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Ações Rápidas</CardTitle>
          <CardDescription className="text-gray-400">
            Acesso rápido às funcionalidades principais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white h-20">
              <School className="mr-2 h-5 w-5" />
              Gerenciar Unidades
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white h-20">
              <Users className="mr-2 h-5 w-5" />
              Gerenciar Usuários
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white h-20">
              <FileText className="mr-2 h-5 w-5" />
              Relatórios
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white h-20">
              <DollarSign className="mr-2 h-5 w-5" />
              Financeiro
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
