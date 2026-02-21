import { useState, useEffect } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  UserCheck,
  UserX,
  Save,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface AlunoPresenca {
  id: string;
  nome: string;
  photoUrl?: string;
  status: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO' | null;
  justification?: string;
  registrado: boolean;
}

interface ChamadaData {
  classroomId: string;
  classroomName: string;
  date: string;
  totalAlunos: number;
  registrados: number;
  presentes: number;
  ausentes: number;
  taxaPresenca: number;
  chamadaCompleta: boolean;
  alunos: AlunoPresenca[];
}

export default function ControleFaltasPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chamada, setChamada] = useState<ChamadaData | null>(null);
  const [registros, setRegistros] = useState<Record<string, { status: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO'; justification?: string }>>({});
  const [showJustificativa, setShowJustificativa] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    loadChamada();
  }, [selectedDate]);

  async function loadChamada() {
    try {
      setLoading(true);
      const res = await http.get('/attendance/today', {
        params: { date: selectedDate },
      });
      const data: ChamadaData = res.data;
      setChamada(data);

      // Inicializar registros com dados existentes
      const initRegistros: typeof registros = {};
      data.alunos.forEach((aluno) => {
        if (aluno.status) {
          initRegistros[aluno.id] = {
            status: aluno.status,
            justification: aluno.justification ?? undefined,
          };
        }
      });
      setRegistros(initRegistros);
    } catch (err: any) {
      console.error('Erro ao carregar chamada:', err);
      toast.error('Erro ao carregar lista de alunos');
    } finally {
      setLoading(false);
    }
  }

  function marcarTodos(status: 'PRESENTE' | 'AUSENTE') {
    if (!chamada) return;
    const novosRegistros: typeof registros = {};
    chamada.alunos.forEach((aluno) => {
      novosRegistros[aluno.id] = { status };
    });
    setRegistros(novosRegistros);
    toast.success(`Todos marcados como ${status === 'PRESENTE' ? 'Presentes' : 'Ausentes'}`);
  }

  function toggleStatus(alunoId: string, status: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO') {
    setRegistros((prev) => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        status,
        justification: status !== 'JUSTIFICADO' ? undefined : prev[alunoId]?.justification,
      },
    }));
    if (status === 'JUSTIFICADO') {
      setShowJustificativa(alunoId);
    }
  }

  function setJustificativa(alunoId: string, justification: string) {
    setRegistros((prev) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], justification },
    }));
  }

  async function salvarChamada() {
    if (!chamada) return;

    const listaRegistros = chamada.alunos
      .filter((a) => registros[a.id]?.status)
      .map((a) => ({
        childId: a.id,
        status: registros[a.id].status,
        justification: registros[a.id].justification ?? null,
      }));

    if (listaRegistros.length === 0) {
      toast.error('Marque pelo menos um aluno antes de salvar');
      return;
    }

    try {
      setSaving(true);
      await http.post('/attendance/register', {
        classroomId: chamada.classroomId,
        date: selectedDate,
        registros: listaRegistros,
      });
      toast.success(`Chamada salva! ${listaRegistros.length} alunos registrados.`);
      loadChamada();
    } catch (err: any) {
      toast.error('Erro ao salvar chamada');
    } finally {
      setSaving(false);
    }
  }

  const totalMarcados = chamada ? chamada.alunos.filter((a) => registros[a.id]?.status).length : 0;
  const totalPresentes = chamada ? chamada.alunos.filter((a) => registros[a.id]?.status === 'PRESENTE').length : 0;
  const totalAusentes = chamada ? chamada.alunos.filter((a) => registros[a.id]?.status === 'AUSENTE').length : 0;
  const totalJustificados = chamada ? chamada.alunos.filter((a) => registros[a.id]?.status === 'JUSTIFICADO').length : 0;

  if (loading) return <LoadingState message="Carregando lista de alunos..." />;

  return (
    <PageShell
      title="Chamada Diária"
      description={chamada ? `${chamada.classroomName} · ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}` : ''}
      headerActions={
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="px-3 py-2 border rounded-md text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={loadChamada}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      {!chamada ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma turma encontrada</p>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{chamada.totalAlunos}</p>
                  </div>
                  <Users className="h-7 w-7 text-blue-500 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Presentes</p>
                    <p className="text-2xl font-bold text-green-600">{totalPresentes}</p>
                  </div>
                  <UserCheck className="h-7 w-7 text-green-500 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Ausentes</p>
                    <p className="text-2xl font-bold text-red-600">{totalAusentes}</p>
                  </div>
                  <UserX className="h-7 w-7 text-red-500 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Justificados</p>
                    <p className="text-2xl font-bold text-yellow-600">{totalJustificados}</p>
                  </div>
                  <AlertCircle className="h-7 w-7 text-yellow-500 opacity-70" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barra de progresso */}
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progresso da Chamada</span>
                <span className="text-sm text-muted-foreground">
                  {totalMarcados}/{chamada.totalAlunos} alunos registrados
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    totalMarcados === chamada.totalAlunos ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${chamada.totalAlunos > 0 ? (totalMarcados / chamada.totalAlunos) * 100 : 0}%` }}
                />
              </div>
              {totalMarcados === chamada.totalAlunos && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Chamada completa!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Ações rápidas */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-300 hover:bg-green-50"
              onClick={() => marcarTodos('PRESENTE')}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Todos Presentes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => marcarTodos('AUSENTE')}
            >
              <UserX className="h-4 w-4 mr-1" />
              Todos Ausentes
            </Button>
          </div>

          {/* Lista de Alunos */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Lista de Alunos — {chamada.classroomName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {chamada.alunos.map((aluno) => {
                  const reg = registros[aluno.id];
                  const status = reg?.status ?? null;

                  return (
                    <div key={aluno.id}>
                      <div
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          status === 'PRESENTE'
                            ? 'bg-green-50 border-green-200'
                            : status === 'AUSENTE'
                            ? 'bg-red-50 border-red-200'
                            : status === 'JUSTIFICADO'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        {/* Foto ou ícone */}
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {aluno.photoUrl ? (
                            <img src={aluno.photoUrl} alt={aluno.nome} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="h-5 w-5 text-gray-400" />
                          )}
                        </div>

                        {/* Nome */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{aluno.nome}</p>
                          {status && (
                            <p className={`text-xs ${
                              status === 'PRESENTE' ? 'text-green-600' :
                              status === 'AUSENTE' ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                              {status === 'PRESENTE' ? 'Presente' : status === 'AUSENTE' ? 'Ausente' : 'Justificado'}
                            </p>
                          )}
                        </div>

                        {/* Botões de status */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleStatus(aluno.id, 'PRESENTE')}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                              status === 'PRESENTE'
                                ? 'bg-green-500 text-white'
                                : 'bg-white border border-gray-300 text-gray-400 hover:bg-green-50 hover:text-green-600 hover:border-green-300'
                            }`}
                            title="Presente"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => toggleStatus(aluno.id, 'AUSENTE')}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                              status === 'AUSENTE'
                                ? 'bg-red-500 text-white'
                                : 'bg-white border border-gray-300 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                            }`}
                            title="Ausente"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => toggleStatus(aluno.id, 'JUSTIFICADO')}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                              status === 'JUSTIFICADO'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-white border border-gray-300 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-300'
                            }`}
                            title="Justificado"
                          >
                            <AlertCircle className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Campo de justificativa */}
                      {status === 'JUSTIFICADO' && (
                        <div className="ml-13 mt-1 pl-13">
                          <input
                            className="w-full px-3 py-1.5 text-sm border border-yellow-300 rounded-md bg-yellow-50"
                            placeholder="Motivo da falta justificada..."
                            value={reg?.justification ?? ''}
                            onChange={(e) => setJustificativa(aluno.id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Botão Salvar */}
          <div className="sticky bottom-4">
            <Button
              onClick={salvarChamada}
              disabled={saving || totalMarcados === 0}
              className="w-full md:w-auto shadow-lg"
              size="lg"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Salvando...' : `Salvar Chamada (${totalMarcados}/${chamada.totalAlunos})`}
            </Button>
          </div>
        </>
      )}
    </PageShell>
  );
}
