/**
 * SecretariaPage — Dashboard Operacional da Secretaria
 *
 * Cockpit administrativo com métricas, gráficos de frequência semanal,
 * distribuição de alunos por turma, alertas e acesso rápido a todos os módulos.
 *
 * Não usa dashboard da coordenação pedagógica e não expõe módulos pedagógicos.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  AlertTriangle, Bell, CheckCircle, ChevronRight, ClipboardList,
  FileArchive, FileWarning, HeartPulse, Loader2, MessageCircle,
  RefreshCw, UserCheck, UserCog, UserPlus, Users, XCircle, Bus,
  TrendingUp, Activity, Calendar,
} from 'lucide-react';
import { useAuth } from '../app/AuthProvider';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { PageShell } from '../components/ui/PageShell';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface TurmaChamadaResumo {
  classroomId: string;
  classroomName: string;
  totalAlunos: number;
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
}

interface AlertaResumo {
  id: string;
  titulo: string;
  severidade: string;
}

interface IndicadoresUnidade {
  totalAlunos: number;
  totalTurmas: number;
  presencaMedia: number;
  faltasHoje: number;
  turmasSemChamada: number;
  atendimentosPendentes: number;
  alertasCriticos: number;
  semTurma: number;
}

const MODULOS_SECRETARIA = [
  { label: 'Matrículas e Fichas', desc: 'Criar matrícula, localizar alunos, conferir dados e documentação.', path: '/app/secretaria/matriculas', icon: <UserCheck className="h-5 w-5" />, accent: 'border-l-emerald-500' },
  { label: 'Nova Matrícula', desc: 'Ficha completa com dados da criança, responsáveis, saúde e documentos.', path: '/app/secretaria/matriculas/nova', icon: <UserPlus className="h-5 w-5" />, accent: 'border-l-blue-500' },
  { label: 'Cancelamentos e Transferências', desc: 'Movimentações administrativas com motivo, data, histórico e rastreabilidade.', path: '/app/secretaria/movimentacoes', icon: <FileArchive className="h-5 w-5" />, accent: 'border-l-amber-500' },
  { label: 'Controle de Faltas', desc: 'Acompanhar faltas, justificativas, atestados e reincidências.', path: '/app/secretaria/faltas', icon: <ClipboardList className="h-5 w-5" />, accent: 'border-l-red-500' },
  { label: 'Atestados e Documentos', desc: 'Receber, conferir e acompanhar documentos de matrícula e atestados médicos.', path: '/app/secretaria/atestados', icon: <FileArchive className="h-5 w-5" />, accent: 'border-l-sky-500' },
  { label: 'Saúde e Ocorrências', desc: 'Crianças passando mal, acidentes, medicação, ligações aos pais e encaminhamentos.', path: '/app/secretaria/ocorrencias', icon: <HeartPulse className="h-5 w-5" />, accent: 'border-l-rose-500' },
  { label: 'Atendimento aos Pais', desc: 'Registro de ligações, atendimentos, retornos e encaminhamentos administrativos.', path: '/app/atendimentos-pais', icon: <MessageCircle className="h-5 w-5" />, accent: 'border-l-teal-500' },
  { label: 'Transporte e Retirada', desc: 'Controle de transporte escolar, autorizados para retirada e contatos de emergência.', path: '/app/secretaria/transporte', icon: <Bus className="h-5 w-5" />, accent: 'border-l-violet-500' },
  { label: 'Funcionários da Unidade', desc: 'Profissionais, contatos, documentação e apoio administrativo da unidade.', path: '/app/secretaria/funcionarios', icon: <UserCog className="h-5 w-5" />, accent: 'border-l-indigo-500' },
];

const CORES_TURMAS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

function hojeISO() { return new Date().toISOString().slice(0, 10); }

export default function SecretariaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [indicadores, setIndicadores] = useState<IndicadoresUnidade>({
    totalAlunos: 0, totalTurmas: 0, presencaMedia: 0, faltasHoje: 0,
    turmasSemChamada: 0, atendimentosPendentes: 0, alertasCriticos: 0, semTurma: 0,
  });
  const [turmas, setTurmas] = useState<TurmaChamadaResumo[]>([]);
  const [atendimentos, setAtendimentos] = useState<AtendimentoResumo[]>([]);
  const [alertas, setAlertas] = useState<AlertaResumo[]>([]);
  const [frequenciaSemanal, setFrequenciaSemanal] = useState<Array<{ dia: string; pct: number }>>([]);

  const unidadeNome = (user as any)?.unit?.name ?? 'Unidade';
  const usuarioNome = (user as any)?.nome ?? (user as any)?.email ?? 'Secretaria';

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const hoje = hojeISO();
      const [summaryRes, chamadaRes, atendRes, alertasRes, semanalRes] = await Promise.allSettled([
        http.get('/children/summary'),
        http.get('/attendance/unit-summary', { params: { date: hoje } }),
        http.get('/atendimentos-pais'),
        http.get('/alertas', { params: { unread: 'true', limit: 20 } }),
        http.get('/attendance/weekly-summary'),
      ]);

      // Indicadores do summary (evita carregar lista completa de alunos)
      let totalAlunos = 0, semTurma = 0;
      if (summaryRes.status === 'fulfilled') {
        const d = summaryRes.value.data;
        totalAlunos = d?.totalAtivos ?? d?.total ?? 0;
        semTurma = d?.semTurma ?? 0;
      } else {
        // Fallback: conta via children com limit menor
        try {
          const r = await http.get('/children', { params: { limit: 500 } });
          const lista = Array.isArray(r.data) ? r.data : r.data?.data ?? r.data?.children ?? [];
          totalAlunos = lista.filter((a: any) => a.enrollments?.some((e: any) => e.status === 'ATIVA') ?? true).length;
          semTurma = lista.filter((a: any) => !a.enrollments?.some((e: any) => e.status === 'ATIVA' && e.classroomId)).length;
        } catch { /* mantém zero */ }
      }

      // Turmas e chamada
      let turmasLista: TurmaChamadaResumo[] = [];
      let faltasHoje = 0, turmasSemChamada = 0, presencaMedia = 0;
      if (chamadaRes.status === 'fulfilled') {
        const d = chamadaRes.value.data;
        turmasLista = Array.isArray(d?.turmas) ? d.turmas : [];
        faltasHoje = turmasLista.reduce((s, t) => s + (t.ausentes ?? 0), 0);
        turmasSemChamada = turmasLista.filter((t) => !t.chamadaFeita).length;
        const pcts = turmasLista.filter((t) => t.chamadaFeita).map((t) => t.taxaPresenca ?? 0);
        presencaMedia = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
      }
      setTurmas(turmasLista);

      // Atendimentos
      if (atendRes.status === 'fulfilled') {
        const d = atendRes.value.data;
        setAtendimentos((Array.isArray(d) ? d : d?.data ?? []).slice(0, 5));
      }
      const atendimentosPendentes = atendimentos.filter(
        (a) => a.status === 'AGENDADO' || a.status === 'PENDENTE_RETORNO',
      ).length;

      // Alertas
      let alertasCriticos = 0;
      if (alertasRes.status === 'fulfilled') {
        const d = alertasRes.value.data;
        const lista = Array.isArray(d?.alertas) ? d.alertas : [];
        setAlertas(lista);
        alertasCriticos = lista.filter((a: any) => a.severidade === 'ALTA' || a.severidade === 'CRITICA').length;
      }

      // Frequência semanal
      if (semanalRes.status === 'fulfilled') {
        const d = semanalRes.value.data;
        const diasLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
        if (Array.isArray(d?.dias)) {
          setFrequenciaSemanal(d.dias.map((d: any, i: number) => ({ dia: diasLabels[i] ?? `Dia ${i + 1}`, pct: d.pct ?? d.taxaPresenca ?? 0 })));
        } else {
          // Fallback estático baseado nos dados de hoje
          setFrequenciaSemanal(diasLabels.map((dia) => ({ dia, pct: 0 })));
        }
      }

      setIndicadores({
        totalAlunos, totalTurmas: turmasLista.length, presencaMedia,
        faltasHoje, turmasSemChamada, atendimentosPendentes, alertasCriticos, semTurma,
      });
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Dados para gráfico de pizza de distribuição por turma
  const dadosPizzaTurmas = useMemo(() =>
    turmas.slice(0, 8).map((t) => ({
      name: t.classroomName.length > 12 ? t.classroomName.slice(0, 12) + '…' : t.classroomName,
      value: t.totalAlunos,
    })), [turmas]);

  const fila = [
    { titulo: 'Turmas sem chamada hoje', valor: indicadores.turmasSemChamada, desc: 'Fechar a frequência com o professor responsável.', path: '/app/secretaria/faltas', urgente: indicadores.turmasSemChamada > 0 },
    { titulo: 'Faltas registradas hoje', valor: indicadores.faltasHoje, desc: 'Conferir justificativas, atestados e contato com responsáveis.', path: '/app/secretaria/faltas', urgente: indicadores.faltasHoje >= 3 },
    { titulo: 'Atendimentos pendentes', valor: indicadores.atendimentosPendentes, desc: 'Retornos, ligações e encaminhamentos ainda em aberto.', path: '/app/atendimentos-pais', urgente: indicadores.atendimentosPendentes > 0 },
    { titulo: 'Alertas críticos', valor: indicadores.alertasCriticos, desc: 'Ocorrências de maior severidade para ação administrativa.', path: '/app/secretaria/ocorrencias', urgente: indicadores.alertasCriticos > 0 },
    { titulo: 'Alunos sem turma ativa', valor: indicadores.semTurma, desc: 'Regularizar matrícula, transferência ou alocação.', path: '/app/secretaria/matriculas', urgente: indicadores.semTurma > 0 },
  ];

  return (
    <PageShell
      title="Secretaria da Unidade"
      description={`${unidadeNome} · administrativo, matrículas, frequência, atendimento e documentação`}
      headerActions={
        <button onClick={carregar} disabled={carregando} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      }
    >
      <div className="space-y-5">
        {erro && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
            <XCircle className="h-4 w-4 flex-shrink-0" />{erro}
          </div>
        )}

        {/* Saudação e ações rápidas */}
        <section className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cockpit operacional</p>
              <h2 className="text-lg font-semibold text-slate-800 mt-1">Olá, {usuarioNome}</h2>
              <p className="text-sm text-slate-500 mt-0.5">Priorize matrícula, frequência, ocorrências de saúde e contato com responsáveis.</p>
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

        {/* KPIs principais */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Alunos ativos" value={indicadores.totalAlunos} icon={<Users className="h-4 w-4 text-blue-500" />} cor="blue" />
          <KpiCard label="Presença hoje" value={`${indicadores.presencaMedia}%`} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} cor="emerald" />
          <KpiCard label="Faltas hoje" value={indicadores.faltasHoje} icon={<AlertTriangle className="h-4 w-4 text-red-500" />} cor="red" />
          <KpiCard label="Turmas ativas" value={indicadores.totalTurmas} icon={<Activity className="h-4 w-4 text-violet-500" />} cor="violet" />
        </section>

        {/* Gráficos */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Frequência semanal */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-indigo-500" />
              <p className="text-sm font-semibold text-slate-800">Frequência da semana</p>
            </div>
            {frequenciaSemanal.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={frequenciaSemanal} barSize={32}>
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Presença']} />
                  <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                    {frequenciaSemanal.map((_, i) => (
                      <Cell key={i} fill={_.pct >= 80 ? '#10b981' : _.pct >= 60 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-300 text-sm">
                {carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sem dados de frequência'}
              </div>
            )}
          </div>

          {/* Distribuição por turma */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-sky-500" />
              <p className="text-sm font-semibold text-slate-800">Alunos por turma</p>
            </div>
            {dadosPizzaTurmas.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={dadosPizzaTurmas} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                    {dadosPizzaTurmas.map((_, i) => (
                      <Cell key={i} fill={CORES_TURMAS[i % CORES_TURMAS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-300 text-sm">
                {carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sem dados de turmas'}
              </div>
            )}
          </div>
        </section>

        {/* Fila + Checklist */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Fila da Secretaria</p>
                <p className="text-xs text-slate-400">O que precisa de ação agora</p>
              </div>
              {carregando && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>
            <div className="divide-y divide-slate-50">
              {fila.map((item) => (
                <button key={item.titulo} onClick={() => navigate(item.path)} className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold ${item.urgente ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
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
            <p className="text-sm font-semibold text-slate-800 mb-3">Checklist diário</p>
            <div className="space-y-2">
              <Checklist ok={indicadores.turmasSemChamada === 0} label="Todas as chamadas conferidas" />
              <Checklist ok={indicadores.atendimentosPendentes === 0} label="Retornos aos pais em dia" />
              <Checklist ok={indicadores.alertasCriticos === 0} label="Sem alerta crítico pendente" />
              <Checklist ok={indicadores.semTurma === 0} label="Matrículas com turma regularizada" />
              <Checklist ok={indicadores.faltasHoje < 5} label="Faltas dentro do esperado" />
            </div>

            {/* Chamada por turma */}
            {turmas.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2">Chamada por turma</p>
                <div className="space-y-1.5">
                  {turmas.slice(0, 5).map((t) => (
                    <div key={t.classroomId} className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-600 truncate flex-1">{t.classroomName}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${t.chamadaFeita ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {t.chamadaFeita ? `${t.taxaPresenca ?? 0}%` : 'Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Módulos */}
        <section>
          <p className="text-xs font-medium text-slate-400 mb-2.5 tracking-wide uppercase">Módulos administrativos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {MODULOS_SECRETARIA.map((modulo) => (
              <button key={modulo.path} onClick={() => navigate(modulo.path)}
                className={`group text-left bg-white border border-slate-100 border-l-4 ${modulo.accent} rounded-2xl p-4 hover:shadow-sm hover:border-slate-200 transition-all`}>
                <div className="text-slate-500 group-hover:text-brand-600 transition-colors">{modulo.icon}</div>
                <p className="text-sm font-medium text-slate-700 group-hover:text-brand-700 mt-2">{modulo.label}</p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{modulo.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Últimos atendimentos */}
        {atendimentos.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Últimos atendimentos aos pais</p>
              <button onClick={() => navigate('/app/atendimentos-pais')} className="text-xs text-brand-600 font-medium">Ver todos</button>
            </div>
            <div className="divide-y divide-slate-50">
              {atendimentos.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-teal-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{a.responsavelNome}</p>
                    <p className="text-xs text-slate-400 truncate">{a.assunto}</p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">{a.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function KpiCard({ label, value, icon, cor }: { label: string; value: number | string; icon: React.ReactNode; cor: string }) {
  const cores: Record<string, string> = {
    blue: 'text-blue-700', emerald: 'text-emerald-700', red: 'text-red-600', violet: 'text-violet-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <p className={`text-2xl font-semibold tabular-nums ${cores[cor] ?? 'text-slate-800'}`}>{value}</p>
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
