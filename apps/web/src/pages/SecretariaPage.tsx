/**
 * SecretariaPage — Cockpit Administrativo da Unidade
 *
 * Identidade exclusiva da Secretaria: matrículas, fichas, faltas, atestados,
 * ocorrências de saúde, atendimento aos pais, documentos e pedidos administrativos.
 *
 * Não usa dashboard da coordenação e não expõe módulos pedagógicos como menu/atalho.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  FileArchive,
  FileWarning,
  HeartPulse,
  Inbox,
  Loader2,
  MessageCircle,
  RefreshCw,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../app/AuthProvider';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { PageShell } from '../components/ui/PageShell';

interface AlunoResumo {
  id: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
  enrollments?: Array<{
    status?: string;
    classroomId?: string;
    classroom?: { name?: string };
  }>;
  allergies?: string | null;
  medicalConditions?: string | null;
  medicationNeeds?: string | null;
  laudado?: boolean | null;
}

interface TurmaChamadaResumo {
  classroomId: string;
  classroomName: string;
  professor?: string;
  totalAlunos: number;
  registrados: number;
  presentes: number;
  ausentes: number;
  chamadaFeita: boolean;
  taxaPresenca: number;
}

interface AtendimentoResumo {
  id: string;
  responsavelNome: string;
  assunto: string;
  status: string;
  dataAtendimento?: string;
}

interface AlertaResumo {
  id: string;
  titulo: string;
  descricao: string;
  severidade: string;
  tipo: string;
  criadoEm?: string;
}

const MODULOS_SECRETARIA = [
  {
    label: 'Matrículas e Fichas',
    desc: 'Criar matrícula, localizar alunos, conferir dados e documentação.',
    path: '/app/secretaria/matriculas',
    icon: <UserCheck className="h-5 w-5" />,
    accent: 'border-l-emerald-500',
  },
  {
    label: 'Nova Matrícula',
    desc: 'Ficha completa baseada nos dados exigidos pela unidade.',
    path: '/app/secretaria/matriculas/nova',
    icon: <UserPlus className="h-5 w-5" />,
    accent: 'border-l-blue-500',
  },
  {
    label: 'Cancelamentos e Transferências',
    desc: 'Movimentações administrativas com histórico e rastreabilidade.',
    path: '/app/secretaria/movimentacoes',
    icon: <FileArchive className="h-5 w-5" />,
    accent: 'border-l-amber-500',
  },
  {
    label: 'Controle de Faltas',
    desc: 'Acompanhar faltas, justificativas, atestados e reincidências.',
    path: '/app/secretaria/faltas',
    icon: <ClipboardList className="h-5 w-5" />,
    accent: 'border-l-red-500',
  },
  {
    label: 'Saúde e Ocorrências',
    desc: 'Crianças passando mal, acidentes, ligações aos pais e atestados.',
    path: '/app/secretaria/ocorrencias',
    icon: <HeartPulse className="h-5 w-5" />,
    accent: 'border-l-rose-500',
  },
  {
    label: 'Atendimento aos Pais',
    desc: 'Registro de ligações, atendimentos, retornos e encaminhamentos.',
    path: '/app/atendimentos-pais',
    icon: <MessageCircle className="h-5 w-5" />,
    accent: 'border-l-teal-500',
  },
  {
    label: 'Pedidos Administrativos',
    desc: 'Demandas de limpeza, manutenção, material e apoio operacional.',
    path: '/app/secretaria/pedidos',
    icon: <Inbox className="h-5 w-5" />,
    accent: 'border-l-slate-500',
  },
  {
    label: 'Funcionários da Unidade',
    desc: 'Profissionais, contatos e apoio administrativo da unidade.',
    path: '/app/secretaria/funcionarios',
    icon: <UserCog className="h-5 w-5" />,
    accent: 'border-l-indigo-500',
  },
];

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function getStatusAtivo(aluno: AlunoResumo) {
  return aluno.enrollments?.some((e) => e.status === 'ATIVA') ?? aluno.isActive !== false;
}

export default function SecretariaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [alunos, setAlunos] = useState<AlunoResumo[]>([]);
  const [turmas, setTurmas] = useState<TurmaChamadaResumo[]>([]);
  const [atendimentos, setAtendimentos] = useState<AtendimentoResumo[]>([]);
  const [alertas, setAlertas] = useState<AlertaResumo[]>([]);

  const unidadeNome = (user as any)?.unit?.name ?? (user as any)?.unitName ?? 'Unidade';
  const usuarioNome = (user as any)?.nome ?? (user as any)?.email ?? 'Secretaria';

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const [alunosRes, chamadaRes, atendRes, alertasRes] = await Promise.allSettled([
        http.get('/children', { params: { limit: 300 } }),
        http.get('/attendance/unit-summary', { params: { date: hojeISO() } }),
        http.get('/atendimentos-pais'),
        http.get('/alertas', { params: { unread: 'true', limit: 20 } }),
      ]);

      if (alunosRes.status === 'fulfilled') {
        const data = alunosRes.value.data;
        setAlunos(Array.isArray(data) ? data : data?.data ?? []);
      }

      if (chamadaRes.status === 'fulfilled') {
        const data = chamadaRes.value.data;
        setTurmas(Array.isArray(data?.turmas) ? data.turmas : []);
      }

      if (atendRes.status === 'fulfilled') {
        const data = atendRes.value.data;
        const lista = Array.isArray(data) ? data : data?.data ?? [];
        setAtendimentos(lista.slice(0, 8));
      }

      if (alertasRes.status === 'fulfilled') {
        const data = alertasRes.value.data;
        setAlertas(Array.isArray(data?.alertas) ? data.alertas : []);
      }
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const indicadores = useMemo(() => {
    const alunosAtivos = alunos.filter(getStatusAtivo).length;
    const semTurma = alunos.filter((a) => !a.enrollments?.some((e) => e.status === 'ATIVA' && e.classroomId)).length;
    const laudos = alunos.filter((a) => Boolean(a.laudado)).length;
    const saudeAtencao = alunos.filter(
      (a) => Boolean(a.allergies || a.medicalConditions || a.medicationNeeds || a.laudado),
    ).length;
    const turmasSemChamada = turmas.filter((t) => !t.chamadaFeita).length;
    const faltasHoje = turmas.reduce((total, turma) => total + (turma.ausentes ?? 0), 0);
    const atendimentosPendentes = atendimentos.filter((a) => a.status === 'AGENDADO' || a.status === 'PENDENTE_RETORNO').length;
    const alertasCriticos = alertas.filter((a) => a.severidade === 'ALTA' || a.severidade === 'CRITICA').length;

    return {
      alunosAtivos,
      semTurma,
      laudos,
      saudeAtencao,
      turmasSemChamada,
      faltasHoje,
      atendimentosPendentes,
      alertasCriticos,
    };
  }, [alunos, turmas, atendimentos, alertas]);

  const fila = [
    {
      titulo: 'Turmas sem chamada hoje',
      valor: indicadores.turmasSemChamada,
      desc: 'Acompanhar com professor/coordenação para fechar frequência.',
      path: '/app/secretaria/faltas',
      urgente: indicadores.turmasSemChamada > 0,
    },
    {
      titulo: 'Faltas registradas hoje',
      valor: indicadores.faltasHoje,
      desc: 'Conferir justificativas, atestados e contato com responsáveis.',
      path: '/app/secretaria/faltas',
      urgente: indicadores.faltasHoje >= 3,
    },
    {
      titulo: 'Atendimentos pendentes',
      valor: indicadores.atendimentosPendentes,
      desc: 'Retornos, ligações e encaminhamentos ainda em aberto.',
      path: '/app/atendimentos-pais',
      urgente: indicadores.atendimentosPendentes > 0,
    },
    {
      titulo: 'Alertas críticos',
      valor: indicadores.alertasCriticos,
      desc: 'Ocorrências de maior severidade para ação administrativa.',
      path: '/app/secretaria/ocorrencias',
      urgente: indicadores.alertasCriticos > 0,
    },
    {
      titulo: 'Alunos sem turma ativa',
      valor: indicadores.semTurma,
      desc: 'Regularizar matrícula, transferência ou alocação.',
      path: '/app/secretaria/matriculas',
      urgente: indicadores.semTurma > 0,
    },
  ];

  return (
    <PageShell
      title="Secretaria da Unidade"
      description={`${unidadeNome} · administrativo, matrículas, frequência, atendimento e documentação`}
      headerActions={
        <button
          onClick={carregar}
          disabled={carregando}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      }
    >
      <div className="space-y-6">
        {erro && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            {erro}
          </div>
        )}

        <section className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cockpit operacional</p>
              <h2 className="text-lg font-semibold text-slate-800 mt-1">Olá, {usuarioNome}</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Priorize matrícula, frequência, ocorrências de saúde e contato com responsáveis.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <button onClick={() => navigate('/app/secretaria/matriculas/nova')} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                <UserPlus className="h-4 w-4" /> Nova matrícula
              </button>
              <button onClick={() => navigate('/app/secretaria/faltas')} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium bg-red-50 text-red-700 border-red-200 hover:bg-red-100">
                <ClipboardList className="h-4 w-4" /> Faltas
              </button>
              <button onClick={() => navigate('/app/secretaria/ocorrencias')} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100">
                <HeartPulse className="h-4 w-4" /> Ocorrência
              </button>
              <button onClick={() => navigate('/app/atendimentos-pais')} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100">
                <MessageCircle className="h-4 w-4" /> Pais
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Alunos ativos" value={indicadores.alunosAtivos} icon={<Users className="h-4 w-4 text-blue-500" />} />
          <KpiCard label="Faltas hoje" value={indicadores.faltasHoje} icon={<AlertTriangle className="h-4 w-4 text-red-500" />} />
          <KpiCard label="Atenção saúde" value={indicadores.saudeAtencao} icon={<HeartPulse className="h-4 w-4 text-rose-500" />} />
          <KpiCard label="Atend. pendentes" value={indicadores.atendimentosPendentes} icon={<MessageCircle className="h-4 w-4 text-teal-500" />} />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Fila da Secretaria</p>
                <p className="text-xs text-slate-400">O que precisa de ação administrativa agora</p>
              </div>
              {carregando && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>
            <div className="divide-y divide-slate-50">
              {fila.map((item) => (
                <button
                  key={item.titulo}
                  onClick={() => navigate(item.path)}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold ${
                    item.urgente ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {item.valor}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{item.titulo}</p>
                    <p className="text-xs text-slate-400 line-clamp-1">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-800">Checklist diário</p>
            <div className="mt-3 space-y-2">
              <Checklist ok={indicadores.turmasSemChamada === 0} label="Todas as chamadas conferidas" />
              <Checklist ok={indicadores.atendimentosPendentes === 0} label="Retornos aos pais em dia" />
              <Checklist ok={indicadores.alertasCriticos === 0} label="Sem alerta crítico pendente" />
              <Checklist ok={indicadores.semTurma === 0} label="Matrículas com turma regularizada" />
              <Checklist ok={indicadores.laudos >= 0} label="Atenção a laudos/atestados monitorada" />
            </div>
          </div>
        </section>

        <section>
          <p className="text-xs font-medium text-slate-400 mb-2.5 tracking-wide">Módulos administrativos da Secretaria</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {MODULOS_SECRETARIA.map((modulo) => (
              <button
                key={modulo.path}
                onClick={() => navigate(modulo.path)}
                className={`group text-left bg-white border border-slate-100 border-l-4 ${modulo.accent} rounded-2xl p-4 hover:shadow-sm hover:border-slate-200 transition-all`}
              >
                <div className="text-slate-500 group-hover:text-brand-600 transition-colors">
                  {modulo.icon}
                </div>
                <p className="text-sm font-medium text-slate-700 group-hover:text-brand-700 mt-2">{modulo.label}</p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{modulo.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {atendimentos.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Últimos atendimentos aos pais</p>
              <button onClick={() => navigate('/app/atendimentos-pais')} className="text-xs text-brand-600 font-medium">
                Ver todos
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {atendimentos.slice(0, 5).map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-teal-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{a.responsavelNome}</p>
                    <p className="text-xs text-slate-400 truncate">{a.assunto}</p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <p className="text-2xl font-semibold text-slate-800 tabular-nums">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function Checklist({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
      <span className={ok ? 'text-slate-600' : 'text-amber-700'}>{label}</span>
    </div>
  );
}
