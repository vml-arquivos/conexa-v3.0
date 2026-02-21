import { useState, useEffect } from 'react';
import { useAuth } from '../app/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PageShell } from '../components/ui/PageShell';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import {
  Users, BookOpen, FileText, ShoppingCart,
  Camera, ClipboardList, UserCircle, CheckCircle,
  ChevronRight, Bell, Star, Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import http from '../api/http';

interface DashboardData {
  hasClassroom: boolean;
  message?: string;
  classroom?: { id: string; name: string; code: string; capacity: number; unit: { name: string } };
  alunos?: Array<{ id: string; nome: string; firstName: string; lastName: string; idade: number; gender: string; photoUrl?: string }>;
  indicadores?: { totalAlunos: number; diariosEstaSemana: number; requisicoesStatus?: string; planejamentosEstaSemana: number };
}

const ACOES_RAPIDAS = [
  { id: 'chamada', label: 'Fazer Chamada', desc: 'Marcar presenca de hoje', icon: <CheckCircle className="h-7 w-7"/>, cor: 'bg-green-500', rota: '/app/chamada' },
  { id: 'diario', label: 'Diario de Bordo', desc: 'Registrar atividades do dia', icon: <BookOpen className="h-7 w-7"/>, cor: 'bg-blue-500', rota: '/app/diario-de-bordo' },
  { id: 'planejamento', label: 'Planejamento', desc: 'Planejar a semana', icon: <Calendar className="h-7 w-7"/>, cor: 'bg-purple-500', rota: '/app/planejamentos' },
  { id: 'materiais', label: 'Pedir Materiais', desc: 'Solicitar para a turma', icon: <ShoppingCart className="h-7 w-7"/>, cor: 'bg-orange-500', rota: '/app/requisicoes-materiais' },
  { id: 'rdx', label: 'Fotos da Turma', desc: 'Registrar momentos', icon: <Camera className="h-7 w-7"/>, cor: 'bg-pink-500', rota: '/app/rdx' },
  { id: 'relatorio', label: 'Relatorio', desc: 'Ver evolucao das criancas', icon: <FileText className="h-7 w-7"/>, cor: 'bg-teal-500', rota: '/app/relatorios' },
];

export default function TeacherDashboardPage() {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const response = await http.get('/teachers/dashboard');
      setData(response.data);
    } catch {
      toast.error('Nao foi possivel carregar seu painel. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState message="Carregando seu painel..." />;

  const nomeProf = (user?.nome ?? user?.firstName as string ?? 'Professor(a)').split(' ')[0];
  const alunos = data?.alunos ?? [];
  const ind = data?.indicadores;
  const turma = data?.classroom;

  return (
    <PageShell
      title={`Ola, ${nomeProf}!`}
      description={turma ? `${turma.name} · ${turma.unit?.name ?? ''}` : 'Bem-vindo(a) ao seu painel'}
    >
      {/* Sem turma */}
      {!data?.hasClassroom && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="h-10 w-10 text-yellow-500"/>
          </div>
          <p className="text-xl font-bold text-gray-700 mb-2">Voce ainda nao tem turma</p>
          <p className="text-gray-500 text-sm">Aguarde a coordenacao vincular voce a uma turma.</p>
        </div>
      )}

      {data?.hasClassroom && (
        <div className="space-y-6">
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Users className="h-6 w-6 text-blue-600"/>, bg: 'bg-blue-100', val: ind?.totalAlunos ?? alunos.length, label: 'Criancas' },
              { icon: <BookOpen className="h-6 w-6 text-green-600"/>, bg: 'bg-green-100', val: ind?.diariosEstaSemana ?? 0, label: 'Diarios esta semana' },
              { icon: <Calendar className="h-6 w-6 text-purple-600"/>, bg: 'bg-purple-100', val: ind?.planejamentosEstaSemana ?? 0, label: 'Planejamentos' },
              { icon: <Star className="h-6 w-6 text-orange-600"/>, bg: 'bg-orange-100', val: turma?.capacity ?? '--', label: 'Vagas na turma' },
            ].map((c, i) => (
              <Card key={i} className="rounded-2xl border-2 text-center">
                <CardContent className="pt-4 pb-3">
                  <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>{c.icon}</div>
                  <p className="text-2xl font-bold text-gray-800">{c.val}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Acoes rapidas */}
          <div>
            <h2 className="text-base font-bold text-gray-700 mb-3">O que voce quer fazer?</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ACOES_RAPIDAS.map(acao => (
                <button key={acao.id} onClick={() => navigate(acao.rota)}
                  className="p-4 bg-white border-2 border-gray-100 rounded-2xl text-left hover:border-blue-200 hover:shadow-md transition-all active:scale-95">
                  <div className={`w-12 h-12 ${acao.cor} rounded-2xl flex items-center justify-center text-white mb-3`}>
                    {acao.icon}
                  </div>
                  <p className="font-bold text-gray-800 text-sm">{acao.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{acao.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Minhas criancas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-700">Minhas criancas ({alunos.length})</h2>
              <button onClick={() => navigate('/app/chamada')}
                className="flex items-center gap-1 text-blue-500 text-sm font-medium hover:text-blue-700">
                Fazer chamada <ChevronRight className="h-4 w-4"/>
              </button>
            </div>
            {alunos.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300"/>
                <p className="text-gray-400">Nenhuma crianca matriculada ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {alunos.map(aluno => (
                  <div key={aluno.id}
                    className="flex flex-col items-center p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer">
                    {aluno.photoUrl ? (
                      <img src={aluno.photoUrl} alt={aluno.nome}
                        className="w-14 h-14 rounded-full object-cover mb-2 border-2 border-blue-100"/>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-2 border-2 border-blue-100">
                        <UserCircle className="w-9 h-9 text-blue-400"/>
                      </div>
                    )}
                    <p className="font-semibold text-sm text-center text-gray-800 leading-tight">{aluno.firstName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{aluno.idade} meses</p>
                    <span className={`mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${aluno.gender === 'MASCULINO' ? 'bg-blue-100 text-blue-600' : aluno.gender === 'FEMININO' ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-500'}`}>
                      {aluno.gender === 'MASCULINO' ? 'Menino' : aluno.gender === 'FEMININO' ? 'Menina' : '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
