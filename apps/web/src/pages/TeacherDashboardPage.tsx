import { useState, useEffect } from 'react';
import { useAuth } from '../app/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageShell } from '../components/ui/PageShell';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { toast } from 'sonner';
import { 
  Users, 
  BookOpen, 
  FileText, 
  ShoppingCart, 
  Calendar,
  UserCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardData {
  hasClassroom: boolean;
  message?: string;
  classroom?: {
    id: string;
    name: string;
    code: string;
    capacity: number;
    unit: {
      name: string;
    };
  };
  alunos?: Array<{
    id: string;
    nome: string;
    firstName: string;
    lastName: string;
    idade: number;
    gender: string;
    photoUrl?: string;
  }>;
  indicadores?: {
    totalAlunos: number;
    diariosEstaSemana: number;
    requisiçõesPendentes: number;
    planejamentosEstaSemana: number;
  };
}

export default function TeacherDashboardPage() {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/teachers/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar dashboard');
      }

      const dashboardData = await response.json();
      setData(dashboardData);

      if (!dashboardData.hasClassroom) {
        toast.error(dashboardData.message || 'Nenhuma turma encontrada');
      }
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err);
      setError(err.message || 'Erro ao carregar dados');
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PageShell title="Painel do Professor">
        <LoadingState message="Carregando seus dados..." />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell title="Painel do Professor">
        <ErrorState 
          message={error || 'Erro ao carregar dados'} 
          onRetry={loadDashboard}
        />
      </PageShell>
    );
  }

  if (!data.hasClassroom) {
    return (
      <PageShell title="Painel do Professor">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma turma encontrada</h3>
              <p className="text-muted-foreground">
                {data.message || 'Entre em contato com a coordenação para atribuir uma turma.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const { classroom, alunos = [], indicadores } = data;

  return (
    <PageShell 
      title={`Painel do Professor - ${classroom?.name}`}
      subtitle={`${classroom?.unit.name} • Código: ${classroom?.code}`}
    >
      {/* Indicadores do Dia */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{indicadores?.totalAlunos || 0}</div>
            <p className="text-xs text-muted-foreground">
              Capacidade: {classroom?.capacity}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diários Esta Semana</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{indicadores?.diariosEstaSemana || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registros de atividades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requisições Pendentes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{indicadores?.requisiçõesPendentes || 0}</div>
            <p className="text-xs text-muted-foreground">
              Materiais solicitados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planejamentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{indicadores?.planejamentosEstaSemana || 0}</div>
            <p className="text-xs text-muted-foreground">
              Desta semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/diario-de-bordo')}
            >
              <BookOpen className="h-6 w-6" />
              <span className="text-sm">Diário de Bordo</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/planejamentos')}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">Planejamentos</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/requisicoes-materiais')}
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="text-sm">Requisitar Materiais</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/atendimentos-pais')}
            >
              <Users className="h-6 w-6" />
              <span className="text-sm">Atendimento Pais</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alunos */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Alunos ({alunos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alunos.map((aluno) => (
              <div 
                key={aluno.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                {aluno.photoUrl ? (
                  <img 
                    src={aluno.photoUrl} 
                    alt={aluno.nome}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="w-8 h-8 text-primary" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{aluno.nome}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{aluno.idade} meses</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      {aluno.gender === 'MASCULINO' ? 'M' : aluno.gender === 'FEMININO' ? 'F' : '-'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {alunos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum aluno matriculado nesta turma</p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
