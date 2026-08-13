import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import { useAuth } from '../app/AuthProvider';
import { isUnidade, isCentral } from '../api/auth';
import { ChildAvatar } from '../components/children/ChildAvatar';
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
  CalendarDays,
  BarChart2,
  RefreshCw,
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
  registrados: number;
  chamadaCompleta: boolean;
  alunos: Aluno[];
}

// FIX P5: shape do retorno do endpoint /attendance/unit-summary
interface TurmaResumo {
  classroomId: string;
  classroomName: string;
  professor: string;
  totalAlunos: number;
  registrados: number;
  presentes: number;
  ausentes: number;
  chamadaFeita: boolean;
  taxaPresenca: number;
}

interface UnitSummaryData {
  date: string;
  unitId: string;
  totalTurmas: number;
  turmasComChamada: number;
  totalAlunos: number;
  totalPresentes: number;
  taxaPresencaGeral: number;
  turmas: TurmaResumo[];
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

/** Retorna a data local no formato YYYY-MM-DD sem conversão de timezone */
function getLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Máximo de dias retroativos permitidos — 30 dias para permitir registro de chamadas em atraso */
const MAX_RETROATIVO = 30;

// ─── Visão da Coordenação (UNIDADE / STAFF_CENTRAL) ──────────────────────────
function ChamadaCoordenacaoView() {
  const hoje = getLocalDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(hoje);
  const [summary, setSummary] = useState<UnitSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  // Turma selecionada para detalhe
  const [turmaSelecionada, setTurmaSelecionada] = useState<TurmaResumo | null>(null);

  const loadSummary = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await http.get('/attendance/unit-summary', { params: { date } });
      setSummary(res.data);
    } catch {
      toast.error('Não foi possível carregar o resumo de chamadas');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSummary(selectedDate); }, [selectedDate, loadSummary]);

  const isHoje = selectedDate === hoje;

  function navegarData(delta: number) {
    const atual = new Date(selectedDate + 'T12:00:00');
    atual.setDate(atual.getDate() + delta);
    const nova = getLocalDateStr(atual);
    const hojeDate = new Date(hoje + 'T12:00:00');
    const minDate = new Date(hoje + 'T12:00:00');
    minDate.setDate(hojeDate.getDate() - MAX_RETROATIVO);
    const novaDate = new Date(nova + 'T12:00:00');
    if (novaDate > hojeDate || novaDate < minDate) return;
    const diaSemana = novaDate.getDay();
    if (diaSemana === 0 || diaSemana === 6) return;
    setSelectedDate(nova);
  }

  return (
    <PageShell
      title="Chamada do Dia — Coordenação"
      subtitle="Visão analítica de presença por turma"
    >
      {/* Navegação de data */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-2xl border shadow-sm p-3">
        <button
          onClick={() => navegarData(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          <span className="font-semibold text-gray-700 text-sm">{formatarData(selectedDate)}</span>
          {isHoje && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Hoje</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navegarData(+1)}
            disabled={isHoje}
            className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={() => loadSummary(selectedDate)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && <LoadingState message="Carregando resumo de chamadas..." />}

      {!loading && summary && (
        <>
          {/* Indicadores gerais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{summary.totalTurmas}</p>
              <p className="text-xs text-blue-600 mt-1 font-medium">Turmas</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{summary.turmasComChamada}</p>
              <p className="text-xs text-green-600 mt-1 font-medium">Com chamada feita</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-indigo-700">{summary.totalPresentes}</p>
              <p className="text-xs text-indigo-600 mt-1 font-medium">Presentes hoje</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-purple-700">{summary.taxaPresencaGeral}%</p>
              <p className="text-xs text-purple-600 mt-1 font-medium">Taxa de presença</p>
            </div>
          </div>

          {/* Tabela de turmas */}
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-4 py-3 border-b">
                <BarChart2 className="h-4 w-4 text-indigo-600" />
                <p className="font-semibold text-gray-700 text-sm">Chamada por Turma</p>
              </div>
              {summary.turmas.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Nenhuma turma encontrada para esta unidade.</div>
              ) : (
                <div className="divide-y">
                  {summary.turmas.map((turma) => (
                    <div
                      key={turma.classroomId}
                      className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        turmaSelecionada?.classroomId === turma.classroomId ? 'bg-indigo-50' : ''
                      }`}
                      onClick={() => setTurmaSelecionada(prev =>
                        prev?.classroomId === turma.classroomId ? null : turma
                      )}
                    >
                      {/* Status da chamada */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        turma.chamadaFeita ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{turma.classroomName}</p>
                        <p className="text-xs text-gray-500 truncate">{turma.professor}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 flex-shrink-0">
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <UserCheck className="h-3.5 w-3.5" />{turma.presentes}
                        </span>
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <UserX className="h-3.5 w-3.5" />{turma.ausentes}
                        </span>
                        <span className="text-gray-400">/ {turma.totalAlunos}</span>
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          turma.chamadaFeita
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {turma.chamadaFeita ? `${turma.taxaPresenca}%` : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalhe da turma selecionada */}
          {turmaSelecionada && (
            <Card className="mt-4 border-indigo-200">
              <CardContent className="p-4">
                <p className="font-bold text-gray-800 mb-1">{turmaSelecionada.classroomName}</p>
                <p className="text-xs text-gray-500 mb-3">Professor: {turmaSelecionada.professor}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-2xl font-bold text-green-700">{turmaSelecionada.presentes}</p>
                    <p className="text-xs text-green-600 mt-0.5">Presentes</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-2xl font-bold text-red-700">{turmaSelecionada.ausentes}</p>
                    <p className="text-xs text-red-600 mt-0.5">Ausentes</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-2xl font-bold text-blue-700">{turmaSelecionada.taxaPresenca}%</p>
                    <p className="text-xs text-blue-600 mt-0.5">Presença</p>
                  </div>
                </div>
                {!turmaSelecionada.chamadaFeita && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    Chamada ainda não realizada para esta turma nesta data.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!loading && !summary && (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg text-gray-500">Nenhuma informação disponível</p>
          <Button onClick={() => loadSummary(selectedDate)} variant="outline" className="mt-4">
            Tentar novamente
          </Button>
        </div>
      )}
    </PageShell>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function ControleFaltasPage() {
  const { user } = useAuth();

  // FIX P5: coordenação (UNIDADE/STAFF_CENTRAL) vê visão analítica por turma
  if (isUnidade(user) || isCentral(user)) {
    return <ChamadaCoordenacaoView />;
  }

  // ─── Visão do Professor ───────────────────────────────────────────────────
  return <ControleFaltasProfessorView />;
}

// ─── Visão do Professor (extraída para componente separado) ───────────────────
function ControleFaltasProfessorView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chamada, setChamada] = useState<ChamadaData | null>(null);
  const [registros, setRegistros] = useState<Record<string, { status: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO'; motivo?: string }>>({});
  const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<'chamada' | 'resumo'>('chamada');

  // Data local do dispositivo — evita bug de timezone servidor UTC vs cliente GMT-3
  const hoje = getLocalDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(hoje);

  const loadChamada = useCallback(async (date: string) => {
    try {
      setLoading(true);
      // Passa a data local para o backend para evitar divergência de timezone
      const res = await http.get('/attendance/today', { params: { date } });
      const data: ChamadaData = res.data;
      setChamada(data);

      // Carregar registros já existentes
      const init: typeof registros = {};
      data.alunos.forEach((a) => {
        if (a.status) init[a.id] = { status: a.status, motivo: a.justification ?? undefined };
      });
      setRegistros(init);

      // BUG A FIX: Se a chamada já foi completamente registrada, restaurar etapa de resumo.
      // Não forçar 'chamada' quando chamadaCompleta === true — evita reabrir em branco.
      // Critério: chamadaCompleta=true OU todos os alunos já têm status registrado.
      const todosRegistrados = data.alunos.length > 0 && data.alunos.every(a => a.status !== null);
      if (data.chamadaCompleta === true || todosRegistrados) {
        setEtapa('resumo');
      } else {
        setEtapa('chamada');
      }
    } catch {
      toast.error('Não foi possível carregar a lista de alunos');
      setChamada(null);
      setEtapa('chamada');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChamada(selectedDate);
  }, [selectedDate, loadChamada]);

  function navegarData(delta: number) {
    const atual = new Date(selectedDate + 'T12:00:00');
    atual.setDate(atual.getDate() + delta);
    const nova = getLocalDateStr(atual);
    // Não permite datas futuras nem mais de MAX_RETROATIVO dias atrás
    const hojeDate = new Date(hoje + 'T12:00:00');
    const minDate = new Date(hoje + 'T12:00:00');
    minDate.setDate(hojeDate.getDate() - MAX_RETROATIVO);
    const novaDate = new Date(nova + 'T12:00:00');
    if (novaDate > hojeDate || novaDate < minDate) return;
    // BUG F FIX: Não permite navegar para fins de semana (dia letivo obrigatório)
    const diaSemana = novaDate.getDay(); // 0=Dom, 6=Sáb
    if (diaSemana === 0 || diaSemana === 6) return;
    setSelectedDate(nova);
  }

  const isHoje = selectedDate === hoje;
  const isMinDate = (() => {
    const minDate = new Date(hoje + 'T12:00:00');
    minDate.setDate(minDate.getDate() - MAX_RETROATIVO);
    return new Date(selectedDate + 'T12:00:00') <= minDate;
  })();
  // BUG F FIX: Detectar se a data selecionada é fim de semana (não letivo)
  const isFimDeSemana = (() => {
    const d = new Date(selectedDate + 'T12:00:00').getDay();
    return d === 0 || d === 6;
  })();

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
      // Correção 2: se veio do diário (?from=diario), retornar direto para o diário
      if (searchParams.get('from') === 'diario') {
        navigate(`/app/diario-de-bordo?date=${encodeURIComponent(selectedDate)}&aba=novo&classroomId=${encodeURIComponent(chamada.classroomId)}`);
      } else {
        navigate(`/app/diario-de-bordo?classroomId=${encodeURIComponent(chamada.classroomId)}&date=${encodeURIComponent(selectedDate)}`);
      }
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

  // ─── Tela de Resumo (Correção 7 — layout clean + ChildAvatar) ──────────────
  if (etapa === 'resumo') {
    const taxaPresenca = chamada.totalAlunos > 0
      ? Math.round((totalPresentes / chamada.totalAlunos) * 100)
      : 0;
    const ausentesEJustificados = chamada.alunos.filter(
      (a) => registros[a.id]?.status === 'AUSENTE' || registros[a.id]?.status === 'JUSTIFICADO'
    );
    const presentesLista = chamada.alunos.filter((a) => registros[a.id]?.status === 'PRESENTE');

    return (
      <PageShell
        title="Chamada registrada"
        description={`${chamada.classroomName} · ${formatarData(selectedDate)}`}
      >
        <div className="max-w-lg mx-auto space-y-4">

          {/* ─ Confirmação visual ─ */}
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800 text-sm">Chamada salva com sucesso</p>
              <p className="text-xs text-emerald-600 mt-0.5">{formatarData(selectedDate)} · {chamada.classroomName}</p>
            </div>
          </div>

          {/* ─ Cards de contagem compactos ─ */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center py-4 px-2 bg-green-50 rounded-xl border border-green-200">
              <p className="text-2xl font-semibold text-green-600 tabular-nums">{totalPresentes}</p>
              <p className="text-xs text-green-600 mt-1 font-medium">Presentes</p>
            </div>
            <div className="text-center py-4 px-2 bg-red-50 rounded-xl border border-red-200">
              <p className="text-2xl font-semibold text-red-500 tabular-nums">{totalAusentes}</p>
              <p className="text-xs text-red-500 mt-1 font-medium">Ausentes</p>
            </div>
            <div className="text-center py-4 px-2 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-2xl font-semibold text-amber-500 tabular-nums">{totalJustificados}</p>
              <p className="text-xs text-amber-500 mt-1 font-medium">Justificados</p>
            </div>
          </div>

          {/* ─ Barra de taxa de presença ─ */}
          <div className="p-4 bg-white border border-gray-100 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Taxa de presença</span>
              <span className="text-lg font-bold text-blue-700">{taxaPresenca}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  taxaPresenca >= 80 ? 'bg-emerald-500' : taxaPresenca >= 60 ? 'bg-amber-400' : 'bg-red-500'
                }`}
                style={{ width: `${taxaPresenca}%` }}
              />
            </div>
          </div>

          {/* ─ Avatares dos presentes (grid compacto com ChildAvatar) ─ */}
          {presentesLista.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2 tracking-wide">Presentes</p>
              <div className="flex flex-wrap gap-2">
                {presentesLista.map((a) => (
                  <div key={a.id} className="flex flex-col items-center gap-1" title={a.nome}>
                    <ChildAvatar
                      child={{ nome: a.nome, photoUrl: a.photoUrl }}
                      sizeClassName="w-10 h-10"
                      imageClassName="rounded-full object-cover ring-2 ring-emerald-400"
                      fallbackClassName="rounded-full bg-emerald-50 ring-2 ring-emerald-300 flex items-center justify-center"
                      showInitials
                      initialsClassName="text-xs font-medium text-emerald-700"
                    />
                    <span className="text-[10px] text-gray-500 truncate max-w-[44px] text-center leading-tight">
                      {a.nome.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─ Lista de ausentes/justificados com ChildAvatar ─ */}
          {ausentesEJustificados.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2 tracking-wide">Faltaram</p>
              <div className="space-y-2">
                {ausentesEJustificados.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                    <ChildAvatar
                      child={{ nome: a.nome, photoUrl: a.photoUrl }}
                      sizeClassName="w-9 h-9"
                      imageClassName="rounded-full object-cover"
                      fallbackClassName="rounded-full bg-gray-100 flex items-center justify-center"
                      showInitials
                      initialsClassName="text-xs font-medium text-slate-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.nome}</p>
                      {registros[a.id]?.motivo && (
                        <p className="text-xs text-gray-400 truncate">{registros[a.id].motivo}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      registros[a.id]?.status === 'JUSTIFICADO'
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'bg-red-50 text-red-500 border border-red-200'
                    }`}>
                      {registros[a.id]?.status === 'JUSTIFICADO' ? 'Justificado' : 'Ausente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─ Botões de ação ─ */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={() => setEtapa('chamada')}
              variant="outline"
              className="flex-1"
            >
              Editar chamada
            </Button>
            <Button
              onClick={() => navigate(`/app/diario-de-bordo?classroomId=${encodeURIComponent(chamada.classroomId)}&date=${encodeURIComponent(selectedDate)}`)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Voltar ao Diário
            </Button>
          </div>
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
      {/* Navegação de data com retroativo controlado */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-2xl border shadow-sm p-3">
        <button
          onClick={() => navegarData(-1)}
          disabled={isMinDate}
          className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Dia anterior"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          <input
            type="date"
            value={selectedDate}
            max={hoje}
            min={(() => {
              const m = new Date(hoje + 'T12:00:00');
              m.setDate(m.getDate() - MAX_RETROATIVO);
              return getLocalDateStr(m);
            })()}
            onChange={e => {
              const val = e.target.value;
              if (!val) return;
              const d = new Date(val + 'T12:00:00').getDay();
              if (d === 0 || d === 6) {
                toast.error('Fins de semana não são dias letivos.');
                return;
              }
              setSelectedDate(val);
            }}
            className="border-0 bg-transparent font-semibold text-gray-700 text-sm focus:outline-none cursor-pointer"
            title="Clique para escolher a data"
          />
          {isHoje && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Hoje</span>
          )}
          {!isHoje && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Retroativo</span>
          )}
        </div>
        <button
          onClick={() => navegarData(+1)}
          disabled={isHoje}
          className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Próximo dia"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* BUG F FIX: Aviso e bloqueio de fim de semana */}
      {isFimDeSemana && (
        <div className="mb-4 p-4 bg-gray-50 border-2 border-gray-300 rounded-xl text-sm text-gray-600 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-gray-400" />
          <div>
            <p className="font-semibold text-gray-700">Dia não letivo</p>
            <p>Fins de semana não permitem registro de chamada. Navegue para um dia útil.</p>
          </div>
        </div>
      )}

      {/* Aviso de retroativo */}
      {!isHoje && !isFimDeSemana && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Você está registrando a chamada de um dia anterior. Máximo de {MAX_RETROATIVO} dias retroativos permitido.</span>
        </div>
      )}

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

      {/* Cards dos alunos — grid responsivo mobile-first */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2.5 mb-6">
        {chamada.alunos.map((aluno) => {
          const reg = registros[aluno.id];
          const status = reg?.status ?? null;
          const isExpanded = alunoSelecionado === aluno.id;

          return (
            <div key={aluno.id} className="flex flex-col gap-1.5">
              {/* Card compacto do aluno */}
              <div
                className={`relative rounded-2xl border overflow-hidden transition-all shadow-sm ${
                  status === 'PRESENTE'
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : status === 'AUSENTE'
                    ? 'border-red-300 bg-red-50/60'
                    : status === 'JUSTIFICADO'
                    ? 'border-amber-300 bg-amber-50/60'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Avatar + badge de status */}
                <div className="flex justify-center pt-2 pb-1 relative">
                  <ChildAvatar
                    child={{
                      photoUrl: aluno.photoUrl,
                      firstName: aluno.nome.split(' ')[0],
                      lastName: aluno.nome.split(' ').slice(1).join(' ') || undefined,
                    }}
                    sizeClassName="w-13 h-13"
                    imageClassName="rounded-full object-cover ring-2 ring-white"
                    fallbackClassName="rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-sm"
                    showInitials
                    initialsClassName="text-xs font-medium text-indigo-600"
                  />
                  {status && (
                    <div className={`absolute top-1 right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm ${
                      status === 'PRESENTE' ? 'bg-emerald-500' :
                      status === 'AUSENTE' ? 'bg-red-400' : 'bg-amber-400'
                    }`}>
                      {status === 'PRESENTE' && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                      {status === 'AUSENTE' && <XCircle className="h-3.5 w-3.5 text-white" />}
                      {status === 'JUSTIFICADO' && <AlertCircle className="h-3.5 w-3.5 text-white" />}
                    </div>
                  )}
                </div>

                {/* Nome truncado em 1 linha */}
                <div className="px-1 pb-1.5 text-center">
                  <p className="text-[10px] font-medium text-slate-600 leading-tight truncate">
                    {aluno.nome.split(' ')[0]}
                  </p>
                </div>

                {/* Botões de marcação menores */}
                <div className="flex border-t">
                  <button
                    onClick={() => marcar(aluno.id, 'PRESENTE')}
                    className={`flex-1 py-1.5 flex items-center justify-center transition-colors ${
                      status === 'PRESENTE'
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-400 hover:bg-green-50 hover:text-green-600'
                    }`}
                    title="Presente"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => marcar(aluno.id, 'AUSENTE')}
                    className={`flex-1 py-1.5 flex items-center justify-center border-l transition-colors ${
                      status === 'AUSENTE'
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-gray-400 hover:bg-red-50 hover:text-red-600'
                    }`}
                    title="Ausente"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => marcar(aluno.id, 'JUSTIFICADO')}
                    className={`flex-1 py-1.5 flex items-center justify-center border-l transition-colors ${
                      status === 'JUSTIFICADO'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-white text-gray-400 hover:bg-yellow-50 hover:text-yellow-600'
                    }`}
                    title="Falta justificada"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
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
          disabled={saving || totalMarcados === 0 || isFimDeSemana}
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
