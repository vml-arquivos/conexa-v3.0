/**
 * SecretariaPage — Dashboard Operacional da Secretaria
 * Gráficos em SVG puro (sem recharts) para evitar dependência de react-is.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle, ChevronRight, ClipboardList,
  FileArchive, HeartPulse, Loader2, MessageCircle,
  RefreshCw, UserCheck, UserCog, UserPlus, Users, XCircle, Bus,
  TrendingUp, Activity, Calendar,
} from 'lucide-react';
import { useAuth } from '../app/AuthProvider';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { PageShell } from '../components/ui/PageShell';

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

const CORES = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16'];

function hojeISO() { return new Date().toISOString().slice(0, 10); }

// ── Gráfico de barras SVG puro ────────────────────────────────────────────────
function BarrasSVG({ dados }: { dados: Array<{ dia: string; pct: number }> }) {
  const H = 120, W = 280, pad = 28, barW = 32, gap = (W - pad * 2 - barW * dados.length) / Math.max(dados.length - 1, 1);
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" style={{ maxHeight: 160 }}>
      {dados.map((d, i) => {
        const x = pad + i * (barW + gap);
        const h = Math.max(2, (d.pct / 100) * H);
        const cor = d.pct >= 80 ? '#10b981' : d.pct >= 60 ? '#f59e0b' : d.pct > 0 ? '#ef4444' : '#e2e8f0';
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={barW} height={h} rx={4} fill={cor} />
            <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">{d.dia}</text>
            {d.pct > 0 && <text x={x + barW / 2} y={H - h - 4} textAnchor="middle" fontSize={9} fill={cor}>{d.pct}%</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ── Gráfico de pizza SVG puro ─────────────────────────────────────────────────
function PizzaSVG({ dados }: { dados: Array<{ name: string; value: number }> }) {
  const total = dados.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="text-xs text-slate-300 text-center py-6">Sem dados</p>;
  let angulo = -Math.PI / 2;
  const r = 52, cx = 70, cy = 65;
  return (
    <svg viewBox="0 0 220 130" className="w-full" style={{ maxHeight: 140 }}>
      {dados.slice(0, 8).map((d, i) => {
        const a = (d.value / total) * 2 * Math.PI;
        const x1 = cx + r * Math.cos(angulo), y1 = cy + r * Math.sin(angulo);
        angulo += a;
        const x2 = cx + r * Math.cos(angulo), y2 = cy + r * Math.sin(angulo);
        const lg = a > Math.PI ? 1 : 0;
        return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} Z`} fill={CORES[i % CORES.length]} />;
      })}
      {dados.slice(0, 5).map((d, i) => (
        <g key={i}>
          <rect x={140} y={10 + i * 22} width={10} height={10} rx={2} fill={CORES[i % CORES.length]} />
          <text x={154} y={19 + i * 22} fontSize={9} fill="#64748b">{d.name.slice(0, 12)} ({d.value})</text>
        </g>
      ))}
    </svg>
  );
}

export default function SecretariaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [semTurma, setSemTurma] = useState(0);
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
      const [summaryRes, chamadaRes, atendRes, alertasRes, semanalRes] = await Promise.allSettled([
        http.get('/children/summary'),
        http.get('/attendance/unit-summary', { params: { date: hojeISO() } }),
        http.get('/atendimentos-pais'),
        http.get('/alertas', { params: { unread: 'true', limit: 20 } }),
        http.get('/attendance/weekly-summary'),
      ]);

      if (summaryRes.status === 'fulfilled') {
        const d = summaryRes.value.data;
        setTotalAlunos(d?.totalAtivos ?? d?.total ?? 0);
        setSemTurma(d?.semTurma ?? 0);
      } else {
        try {
          const r = await http.get('/children', { params: { limit: 500 } });
          const lista = Array.isArray(r.data) ? r.data : r.data?.data ?? r.data?.children ?? [];
          setTotalAlunos(lista.filter((a: any) => a.enrollments?.some((e: any) => e.status === 'ATIVA') ?? true).length);
          setSemTurma(lista.filter((a: any) => !a.enrollments?.some((e: any) => e.status === 'ATIVA' && e.classroomId)).length);
        } catch { /* mantém zero */ }
      }

      if (chamadaRes.status === 'fulfilled') {
        const d = chamadaRes.value.data;
        setTurmas(Array.isArray(d?.turmas) ? d.turmas : []);
      }

      if (atendRes.status === 'fulfilled') {
        const d = atendRes.value.data;
        setAtendimentos((Array.isArray(d) ? d : d?.data ?? []).slice(0, 5));
      }

      if (alertasRes.status === 'fulfilled') {
        const d = alertasRes.value.data;
        setAlertas(Array.isArray(d?.alertas) ? d.alertas : []);
      }

      const diasLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
      if (semanalRes.status === 'fulfilled') {
        const d = semanalRes.value.data;
        if (Array.isArray(d?.dias)) {
          setFrequenciaSemanal(d.dias.map((x: any, i: number) => ({ dia: diasLabels[i] ?? `D${i+1}`, pct: x.pct ?? x.taxaPresenca ?? 0 })));
        } else {
          setFrequenciaSemanal(diasLabels.map((dia) => ({ dia, pct: 0 })));
        }
      } else {
        setFrequenciaSemanal(diasLabels.map((dia) => ({ dia, pct: 0 })));
      }
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const faltasHoje = turmas.reduce((s, t) => s + (t.ausentes ?? 0), 0);
  const turmasSemChamada = turmas.filter((t) => !t.chamadaFeita).length;
  const presencaMedia = (() => {
    const com = turmas.filter((t) => t.chamadaFeita);
    return com.length ? Math.round(com.reduce((s, t) => s + (t.taxaPresenca ?? 0), 0) / com.length) : 0;
  })();
  const atendimentosPendentes = atendimentos.filter((a) => a.status === 'AGENDADO' || a.status === 'PENDENTE_RETORNO').length;
  const alertasCriticos = alertas.filter((a) => a.severidade === 'ALTA' || a.severidade === 'CRITICA').length;

  const dadosPizza = useMemo(() =>
    turmas.slice(0, 8).map((t) => ({
      name: t.classroomName.length > 14 ? t.classroomName.slice(0, 14) + '…' : t.classroomName,
      value: t.totalAlunos,
    })), [turmas]);

  const fila = [
    { titulo: 'Turmas sem chamada hoje', valor: turmasSemChamada, desc: 'Fechar a frequência com o professor responsável.', path: '/app/secretaria/faltas', urgente: turmasSemChamada > 0 },
    { titulo: 'Faltas registradas hoje', valor: faltasHoje, desc: 'Conferir justificativas, atestados e contato com responsáveis.', path: '/app/secretaria/faltas', urgente: faltasHoje >= 3 },
    { titulo: 'Atendimentos pendentes', valor: atendimentosPendentes, desc: 'Retornos, ligações e encaminhamentos ainda em aberto.', path: '/app/atendimentos-pais', urgente: atendimentosPendentes > 0 },
    { titulo: 'Alertas críticos', valor: alertasCriticos, desc: 'Ocorrências de maior severidade para ação administrativa.', path: '/app/secretaria/ocorrencias', urgente: alertasCriticos > 0 },
    { titulo: 'Alunos sem turma ativa', valor: semTurma, desc: 'Regularizar matrícula, transferência ou alocação.', path: '/app/secretaria/matriculas', urgente: semTurma > 0 },
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
        {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2"><XCircle className="h-4 w-4 flex-shrink-0" />{erro}</div>}

        {/* Saudação */}
        <section className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cockpit operacional</p>
              <h2 className="text-lg font-semibold text-slate-800 mt-1">Olá, {usuarioNome}</h2>
              <p className="text-sm text-slate-500 mt-0.5">Priorize matrícula, frequência, ocorrências de saúde e contato com responsáveis.</p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <button onClick={() => navigate('/app/secretaria/matriculas/nova')} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"><UserPlus className="h-4 w-4" /> Nova matrícula</button>
              <button onClick={() => navigate('/app/secretaria/faltas')} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium bg-red-50 text-red-700 border-red-200 hover:bg-red-100"><ClipboardList className="h-4 w-4" /> Faltas</button>
              <button onClick={() => navigate('/app/secretaria/ocorrencias')} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"><HeartPulse className="h-4 w-4" /> Ocorrência</button>
              <button onClick={() => navigate('/app/atendimentos-pais')} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100"><MessageCircle className="h-4 w-4" /> Pais</button>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Alunos ativos" value={totalAlunos} icon={<Users className="h-4 w-4 text-blue-500" />} cor="text-blue-700" />
          <KpiCard label={`Presença hoje`} value={`${presencaMedia}%`} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} cor="text-emerald-700" />
          <KpiCard label="Faltas hoje" value={faltasHoje} icon={<AlertTriangle className="h-4 w-4 text-red-500" />} cor="text-red-600" />
          <KpiCard label="Turmas ativas" value={turmas.length} icon={<Activity className="h-4 w-4 text-violet-500" />} cor="text-violet-700" />
        </section>

        {/* Gráficos SVG */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-indigo-500" />
              <p className="text-sm font-semibold text-slate-800">Frequência da semana</p>
            </div>
            {carregando ? <div className="h-36 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
              : <BarrasSVG dados={frequenciaSemanal} />}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-sky-500" />
              <p className="text-sm font-semibold text-slate-800">Alunos por turma</p>
            </div>
            {carregando ? <div className="h-36 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
              : dadosPizza.length > 0 ? <PizzaSVG dados={dadosPizza} /> : <p className="text-xs text-slate-300 text-center py-8">Sem dados de turmas</p>}
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
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold ${item.urgente ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{item.valor}</div>
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
              <Checklist ok={turmasSemChamada === 0} label="Todas as chamadas conferidas" />
              <Checklist ok={atendimentosPendentes === 0} label="Retornos aos pais em dia" />
              <Checklist ok={alertasCriticos === 0} label="Sem alerta crítico pendente" />
              <Checklist ok={semTurma === 0} label="Matrículas com turma regularizada" />
              <Checklist ok={faltasHoje < 5} label="Faltas dentro do esperado" />
            </div>
            {turmas.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2">Chamada por turma</p>
                <div className="space-y-1.5">
                  {turmas.slice(0, 6).map((t) => (
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
            {MODULOS_SECRETARIA.map((m) => (
              <button key={m.path} onClick={() => navigate(m.path)} className={`group text-left bg-white border border-slate-100 border-l-4 ${m.accent} rounded-2xl p-4 hover:shadow-sm hover:border-slate-200 transition-all`}>
                <div className="text-slate-500 group-hover:text-brand-600 transition-colors">{m.icon}</div>
                <p className="text-sm font-medium text-slate-700 group-hover:text-brand-700 mt-2">{m.label}</p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Atendimentos */}
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

function KpiCard({ label, value, icon, cor }: { label: string; value: number | string; icon: React.ReactNode; cor: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <p className={`text-2xl font-semibold tabular-nums ${cor}`}>{value}</p>
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
