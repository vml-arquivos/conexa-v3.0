import { useState, useEffect } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  UserCheck,
  UserX,
  Save,
  ChevronLeft,
  ChevronRight,
  Sun,
} from 'lucide-react';

interface Aluno {
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
  presentes: number;
  ausentes: number;
  alunos: Aluno[];
}

// Motivos de falta pré-definidos (sem digitação)
const MOTIVOS_FALTA = [
  'Doença',
  'Consulta médica',
  'Viagem',
  'Problema familiar',
  'Outro motivo',
];

// Dias da semana em português
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatarData(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export default function ControleFaltasPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chamada, setChamada] = useState<ChamadaData | null>(null);
  const [registros, setRegistros] = useState<Record<string, { status: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO'; motivo?: string }>>({});
  const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<'chamada' | 'resumo'>('chamada');

  // Data de hoje
  const hoje = new Date().toISOString().split('T')[0];
  const [selectedDate] = useState(hoje);

  useEffect(() => {
    loadChamada();
  }, []);

  async function loadChamada() {
    try {
      setLoading(true);
      const res = await http.get('/attendance/today');
      const data: ChamadaData = res.data;
      setChamada(data);

      // Carregar registros já existentes
      const init: typeof registros = {};
      data.alunos.forEach((a) => {
        if (a.status) init[a.id] = { status: a.status, motivo: a.justification ?? undefined };
      });
      setRegistros(init);
    } catch {
      toast.error('Não foi possível carregar a lista de alunos');
    } finally {
      setLoading(false);
    }
  }

  function marcar(alunoId: string, status: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO') {
    setRegistros((prev) => ({
      ...prev,
      [alunoId]: { status, motivo: status !== 'AUSENTE' && status !== 'JUSTIFICADO' ? undefined : prev[alunoId]?.motivo },
    }));

    if (status === 'AUSENTE' || status === 'JUSTIFICADO') {
      setAlunoSelecionado(alunoId);
    } else {
      setAlunoSelecionado(null);
    }
  }

  function selecionarMotivo(alunoId: string, motivo: string) {
    setRegistros((prev) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], motivo },
    }));
    setAlunoSelecionado(null);
  }

  function marcarTodosPresentes() {
    if (!chamada) return;
    const novos: typeof registros = {};
    chamada.alunos.forEach((a) => { novos[a.id] = { status: 'PRESENTE' }; });
    setRegistros(novos);
    setAlunoSelecionado(null);
    toast.success('Todos marcados como presentes! 🎉');
  }

  async function salvar() {
    if (!chamada) return;

    const lista = chamada.alunos
      .filter((a) => registros[a.id]?.status)
      .map((a) => ({
        childId: a.id,
        status: registros[a.id].status,
        justification: registros[a.id].motivo ?? null,
      }));

    if (lista.length === 0) {
      toast.error('Marque pelo menos um aluno antes de salvar');
      return;
    }

    try {
      setSaving(true);
      await http.post('/attendance/register', {
        classroomId: chamada.classroomId,
        date: selectedDate,
        registros: lista,
      });
      toast.success('Chamada salva com sucesso! ✅');
      setEtapa('resumo');
    } catch {
      toast.error('Erro ao salvar a chamada. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState message="Carregando lista de alunos..." />;

  if (!chamada) return (
    <PageShell title="Chamada do Dia">
      <div className="text-center py-16">
        <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg text-gray-500">Nenhuma turma encontrada</p>
      </div>
    </PageShell>
  );

  const totalMarcados = chamada.alunos.filter((a) => registros[a.id]?.status).length;
  const totalPresentes = chamada.alunos.filter((a) => registros[a.id]?.status === 'PRESENTE').length;
  const totalAusentes = chamada.alunos.filter((a) => registros[a.id]?.status === 'AUSENTE').length;
  const totalJustificados = chamada.alunos.filter((a) => registros[a.id]?.status === 'JUSTIFICADO').length;
  const chamadaCompleta = totalMarcados === chamada.totalAlunos;

  // ─── Tela de Resumo ──────────────────────────────────────────────────────────
  if (etapa === 'resumo') {
    return (
      <PageShell title="Chamada Salva! ✅" description={`${chamada.classroomName} · ${formatarData(selectedDate)}`}>
        <div className="max-w-md mx-auto space-y-6">
          {/* Resumo visual */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-6 bg-green-50 rounded-2xl border-2 border-green-200">
              <p className="text-4xl font-bold text-green-600">{totalPresentes}</p>
              <p className="text-sm text-green-700 mt-1 font-medium">Presentes</p>
            </div>
            <div className="text-center p-6 bg-red-50 rounded-2xl border-2 border-red-200">
              <p className="text-4xl font-bold text-red-600">{totalAusentes}</p>
              <p className="text-sm text-red-700 mt-1 font-medium">Ausentes</p>
            </div>
            <div className="text-center p-6 bg-yellow-50 rounded-2xl border-2 border-yellow-200">
              <p className="text-4xl font-bold text-yellow-600">{totalJustificados}</p>
              <p className="text-sm text-yellow-700 mt-1 font-medium">Justificados</p>
            </div>
          </div>

          {/* Taxa de presença */}
          <div className="p-5 bg-blue-50 rounded-2xl text-center">
            <p className="text-sm text-blue-600 font-medium mb-1">Taxa de presença hoje</p>
            <p className="text-5xl font-bold text-blue-700">
              {chamada.totalAlunos > 0 ? Math.round((totalPresentes / chamada.totalAlunos) * 100) : 0}%
            </p>
          </div>

          {/* Lista de ausentes */}
          {totalAusentes + totalJustificados > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-600">Crianças que faltaram:</p>
              {chamada.alunos
                .filter((a) => registros[a.id]?.status === 'AUSENTE' || registros[a.id]?.status === 'JUSTIFICADO')
                .map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {a.photoUrl ? (
                        <img src={a.photoUrl} alt={a.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-gray-400">{a.nome[0]}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{a.nome}</p>
                      {registros[a.id]?.motivo && (
                        <p className="text-xs text-gray-500">{registros[a.id].motivo}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      registros[a.id]?.status === 'JUSTIFICADO'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {registros[a.id]?.status === 'JUSTIFICADO' ? 'Justificado' : 'Ausente'}
                    </span>
                  </div>
                ))}
            </div>
          )}

          <Button
            onClick={() => setEtapa('chamada')}
            variant="outline"
            className="w-full"
          >
            Editar Chamada
          </Button>
        </div>
      </PageShell>
    );
  }

  // ─── Tela Principal de Chamada ────────────────────────────────────────────────
  return (
    <PageShell
      title="Chamada do Dia"
      description={`${chamada.classroomName} · ${formatarData(selectedDate)}`}
    >
      {/* Barra de progresso */}
      <div className="mb-6 p-4 bg-white rounded-2xl border shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold text-gray-700">
              {chamadaCompleta ? '🎉 Chamada completa!' : `${totalMarcados} de ${chamada.totalAlunos} crianças`}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {chamada.totalAlunos - totalMarcados > 0
              ? `Faltam ${chamada.totalAlunos - totalMarcados}`
              : 'Todas marcadas'}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all duration-500 ${chamadaCompleta ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${chamada.totalAlunos > 0 ? (totalMarcados / chamada.totalAlunos) * 100 : 0}%` }}
          />
        </div>

        {/* Contadores rápidos */}
        <div className="flex gap-3 mt-3">
          <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
            <UserCheck className="h-4 w-4" /> {totalPresentes} presentes
          </span>
          <span className="flex items-center gap-1 text-sm text-red-500 font-medium">
            <UserX className="h-4 w-4" /> {totalAusentes} ausentes
          </span>
          {totalJustificados > 0 && (
            <span className="flex items-center gap-1 text-sm text-yellow-600 font-medium">
              <AlertCircle className="h-4 w-4" /> {totalJustificados} justificados
            </span>
          )}
        </div>
      </div>

      {/* Botão marcar todos presentes */}
      <Button
        onClick={marcarTodosPresentes}
        variant="outline"
        className="w-full mb-4 h-12 text-green-700 border-green-300 bg-green-50 hover:bg-green-100 font-semibold text-base"
      >
        <UserCheck className="h-5 w-5 mr-2" />
        Todos estão presentes hoje
      </Button>

      {/* Cards dos alunos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {chamada.alunos.map((aluno) => {
          const reg = registros[aluno.id];
          const status = reg?.status ?? null;
          const isExpanded = alunoSelecionado === aluno.id;

          return (
            <div key={aluno.id} className="flex flex-col gap-2">
              {/* Card do aluno */}
              <div
                className={`relative rounded-2xl border-2 overflow-hidden transition-all ${
                  status === 'PRESENTE'
                    ? 'border-green-400 bg-green-50'
                    : status === 'AUSENTE'
                    ? 'border-red-400 bg-red-50'
                    : status === 'JUSTIFICADO'
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Foto */}
                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                  {aluno.photoUrl ? (
                    <img src={aluno.photoUrl} alt={aluno.nome} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-gray-300">{aluno.nome[0]}</span>
                  )}
                  {/* Badge de status */}
                  {status && (
                    <div className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center ${
                      status === 'PRESENTE' ? 'bg-green-500' :
                      status === 'AUSENTE' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}>
                      {status === 'PRESENTE' && <CheckCircle className="h-5 w-5 text-white" />}
                      {status === 'AUSENTE' && <XCircle className="h-5 w-5 text-white" />}
                      {status === 'JUSTIFICADO' && <AlertCircle className="h-5 w-5 text-white" />}
                    </div>
                  )}
                </div>

                {/* Nome */}
                <div className="p-2 text-center">
                  <p className="text-xs font-semibold text-gray-700 leading-tight line-clamp-2">
                    {aluno.nome.split(' ')[0]}
                  </p>
                  {reg?.motivo && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{reg.motivo}</p>
                  )}
                </div>

                {/* Botões de marcação */}
                <div className="flex border-t">
                  <button
                    onClick={() => marcar(aluno.id, 'PRESENTE')}
                    className={`flex-1 py-2.5 flex items-center justify-center transition-colors ${
                      status === 'PRESENTE'
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-400 hover:bg-green-50 hover:text-green-600'
                    }`}
                    title="Presente"
                  >
                    <CheckCircle className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => marcar(aluno.id, 'AUSENTE')}
                    className={`flex-1 py-2.5 flex items-center justify-center border-l transition-colors ${
                      status === 'AUSENTE'
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-gray-400 hover:bg-red-50 hover:text-red-600'
                    }`}
                    title="Ausente"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => marcar(aluno.id, 'JUSTIFICADO')}
                    className={`flex-1 py-2.5 flex items-center justify-center border-l transition-colors ${
                      status === 'JUSTIFICADO'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-white text-gray-400 hover:bg-yellow-50 hover:text-yellow-600'
                    }`}
                    title="Falta justificada"
                  >
                    <AlertCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Seleção de motivo (aparece ao clicar em ausente/justificado) */}
              {isExpanded && (
                <div className="bg-white rounded-xl border-2 border-blue-200 p-2 shadow-lg">
                  <p className="text-xs font-semibold text-gray-600 mb-2 text-center">Por que faltou?</p>
                  <div className="space-y-1">
                    {MOTIVOS_FALTA.map((motivo) => (
                      <button
                        key={motivo}
                        onClick={() => selecionarMotivo(aluno.id, motivo)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          reg?.motivo === motivo
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        {motivo}
                      </button>
                    ))}
                    <button
                      onClick={() => setAlunoSelecionado(null)}
                      className="w-full text-center px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botão salvar fixo */}
      <div className="sticky bottom-4 flex justify-center">
        <Button
          onClick={salvar}
          disabled={saving || totalMarcados === 0}
          size="lg"
          className={`shadow-xl px-8 h-14 text-base font-bold rounded-2xl transition-all ${
            chamadaCompleta
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Salvando...' : chamadaCompleta ? 'Salvar Chamada Completa ✅' : `Salvar (${totalMarcados}/${chamada.totalAlunos})`}
        </Button>
      </div>
    </PageShell>
  );
}
