/**
 * SecretariaPage — Painel Operacional da Secretaria
 *
 * Central operacional da instituição: matrículas, alunos, atendimentos,
 * comunicação, faltas, ocorrências, funcionários e pedidos administrativos.
 *
 * RBAC: UNIDADE_ADMINISTRATIVO, UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
 * Sem alteração de backend, APIs, RBAC ou funcionalidades existentes.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { PageShell } from '../components/ui/PageShell';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import {
  UserPlus, Users, AlertTriangle, MessageCircle, FileWarning,
  UserCog, Inbox, Bell, ClipboardCheck, RefreshCw, ChevronRight,
  CheckCircle, Clock, XCircle, TrendingUp, Calendar,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SecretariaKPIs {
  totalAlunos: number;
  alunosAtivos: number;
  matriculasPendentes: number;
  turmasAtivas: number;
  atendimentosPendentes: number;
  faltasCriticas: number;
  ocorrenciasAbertas: number;
  funcionariosAtivos: number;
}

interface TurmaResumo {
  id: string;
  name: string;
  totalAlunos: number;
  chamadaFeita: boolean;
  professor: string | null;
}

interface AtendimentoRecente {
  id: string;
  responsavelNome: string;
  assunto: string;
  status: string;
  dataAtendimento: string;
}

// ─── Atalhos de ação rápida ───────────────────────────────────────────────────

const ACOES_RAPIDAS = [
  {
    id: 'nova-matricula',
    label: 'Nova Matrícula',
    icon: <UserPlus className="h-5 w-5" />,
    path: '/app/secretaria/matriculas/nova',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  },
  {
    id: 'atendimento',
    label: 'Registrar Atendimento',
    icon: <MessageCircle className="h-5 w-5" />,
    path: '/app/atendimentos-pais',
    color: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
  },
  {
    id: 'ocorrencia',
    label: 'Nova Ocorrência',
    icon: <FileWarning className="h-5 w-5" />,
    path: '/app/secretaria/ocorrencias/nova',
    color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  },
  {
    id: 'comunicado',
    label: 'Enviar Comunicado',
    icon: <Bell className="h-5 w-5" />,
    path: '/app/secretaria/comunicacao',
    color: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  },
];

// ─── Módulos da Secretaria ────────────────────────────────────────────────────

const MODULOS = [
  {
    id: 'matriculas',
    label: 'Matrículas',
    desc: 'Novas matrículas, cadastro de alunos e responsáveis',
    icon: <UserPlus className="h-5 w-5" />,
    path: '/app/secretaria/matriculas',
    accent: 'border-l-emerald-500',
    badge: null as string | null,
  },
  {
    id: 'movimentacoes',
    label: 'Cancelamentos e Transferências',
    desc: 'Movimentações, histórico e rastreabilidade',
    icon: <ClipboardCheck className="h-5 w-5" />,
    path: '/app/secretaria/movimentacoes',
    accent: 'border-l-amber-500',
    badge: null as string | null,
  },
  {
    id: 'atendimentos',
    label: 'Atendimento aos Pais',
    desc: 'Histórico de contatos, ligações e encaminhamentos',
    icon: <MessageCircle className="h-5 w-5" />,
    path: '/app/atendimentos-pais',
    accent: 'border-l-teal-500',
    badge: null as string | null,
  },
  {
    id: 'comunicacao',
    label: 'Comunicação',
    desc: 'Recados, avisos e comunicados institucionais',
    icon: <Bell className="h-5 w-5" />,
    path: '/app/secretaria/comunicacao',
    accent: 'border-l-violet-500',
    badge: 'Novo',
  },
  {
    id: 'faltas',
    label: 'Controle de Faltas',
    desc: 'Alertas de reincidência, justificativas e histórico',
    icon: <AlertTriangle className="h-5 w-5" />,
    path: '/app/secretaria/faltas',
    accent: 'border-l-red-500',
    badge: null as string | null,
  },
  {
    id: 'ocorrencias',
    label: 'Ocorrências',
    desc: 'Ocorrências administrativas e pedagógicas',
    icon: <FileWarning className="h-5 w-5" />,
    path: '/app/secretaria/ocorrencias',
    accent: 'border-l-orange-500',
    badge: null as string | null,
  },
  {
    id: 'funcionarios',
    label: 'Funcionários',
    desc: 'Cadastro, status, vínculo e permissões',
    icon: <UserCog className="h-5 w-5" />,
    path: '/app/secretaria/funcionarios',
    accent: 'border-l-indigo-500',
    badge: null as string | null,
  },
  {
    id: 'pedidos',
    label: 'Pedidos Administrativos',
    desc: 'Limpeza, manutenção, suprimentos e apoio',
    icon: <Inbox className="h-5 w-5" />,
    path: '/app/secretaria/pedidos',
    accent: 'border-l-slate-500',
    badge: null as string | null,
  },
];

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function SecretariaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<SecretariaKPIs | null>(null);
  const [turmas, setTurmas] = useState<TurmaResumo[]>([]);
  const [atendimentos, setAtendimentos] = useState<AtendimentoRecente[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const unitName = (user as any)?.unit?.name ?? '';
  const userName = (user as any)?.nome || (user as any)?.email || 'Secretaria';

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      // Dados do dashboard de unidade (endpoint existente)
      const [dashRes, atendRes] = await Promise.allSettled([
        http.get('/coordenacao/dashboard/unidade'),
        http.get('/atendimento-pais?limit=5'),
      ]);

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        setTurmas(
          Array.isArray(d.turmas)
            ? d.turmas.map((t: any) => ({
                id: t.id,
                name: t.nome || t.name,
                totalAlunos: t.totalAlunos ?? 0,
                chamadaFeita: t.chamadaFeita ?? false,
                professor: t.professor ?? null,
              }))
            : [],
        );
        // Montar KPIs a partir dos dados disponíveis
        const totalAlunos = Array.isArray(d.turmas)
          ? d.turmas.reduce((s: number, t: any) => s + (t.totalAlunos ?? 0), 0)
          : 0;
        setKpis({
          totalAlunos,
          alunosAtivos: totalAlunos,
          matriculasPendentes: d.matriculasPendentes ?? 0,
          turmasAtivas: Array.isArray(d.turmas) ? d.turmas.length : 0,
          atendimentosPendentes: d.atendimentosPendentes ?? 0,
          faltasCriticas: d.faltasCriticas ?? 0,
          ocorrenciasAbertas: d.ocorrenciasAbertas ?? 0,
          funcionariosAtivos: d.funcionariosAtivos ?? 0,
        });
      }

      if (atendRes.status === 'fulfilled') {
        const lista = Array.isArray(atendRes.value.data)
          ? atendRes.value.data
          : atendRes.value.data?.data ?? [];
        setAtendimentos(
          lista.slice(0, 5).map((a: any) => ({
            id: a.id,
            responsavelNome: a.responsavelNome ?? '—',
            assunto: a.assunto ?? '—',
            status: a.status ?? 'AGENDADO',
            dataAtendimento: a.dataAtendimento ?? '',
          })),
        );
      }
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ─── KPI Cards ─────────────────────────────────────────────────────────────

  const kpiCards = kpis
    ? [
        { label: 'Alunos Ativos', value: kpis.alunosAtivos, icon: <Users className="h-4 w-4 text-blue-500" />, color: 'text-blue-600' },
        { label: 'Turmas', value: kpis.turmasAtivas, icon: <Calendar className="h-4 w-4 text-emerald-500" />, color: 'text-emerald-600' },
        { label: 'Atend. Pendentes', value: kpis.atendimentosPendentes, icon: <Clock className="h-4 w-4 text-amber-500" />, color: 'text-amber-600' },
        { label: 'Faltas Críticas', value: kpis.faltasCriticas, icon: <AlertTriangle className="h-4 w-4 text-red-500" />, color: 'text-red-600' },
        { label: 'Ocorrências', value: kpis.ocorrenciasAbertas, icon: <FileWarning className="h-4 w-4 text-orange-500" />, color: 'text-orange-600' },
        { label: 'Funcionários', value: kpis.funcionariosAtivos, icon: <UserCog className="h-4 w-4 text-indigo-500" />, color: 'text-indigo-600' },
      ]
    : [];

  const turmasSemChamada = turmas.filter((t) => !t.chamadaFeita);
  const turmasComChamada = turmas.filter((t) => t.chamadaFeita);

  return (
    <PageShell
      title="Secretaria"
      description={unitName ? `${unitName} · Central operacional` : 'Central operacional da instituição'}
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
      {/* ── Erro ── */}
      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {erro}
        </div>
      )}

      {/* ── Ações Rápidas ── */}
      <section>
        <p className="text-xs font-medium text-slate-400 mb-2.5 tracking-wide">Ações rápidas</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ACOES_RAPIDAS.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(a.path)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all touch-manipulation ${a.color}`}
            >
              {a.icon}
              <span className="text-left leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── KPIs ── */}
      {kpis && (
        <section>
          <p className="text-xs font-medium text-slate-400 mb-2.5 tracking-wide">Indicadores do dia</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {kpiCards.map((k) => (
              <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  {k.icon}
                </div>
                <p className={`text-2xl font-semibold tabular-nums ${k.color}`}>{k.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-normal">{k.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Status das Chamadas ── */}
      {turmas.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-medium text-slate-400 tracking-wide">Chamadas hoje</p>
            <span className="text-[11px] text-slate-400">
              {turmasComChamada.length}/{turmas.length} turmas
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            {/* Barra de progresso */}
            <div className="px-4 pt-3 pb-2">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-1.5 bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${turmas.length > 0 ? (turmasComChamada.length / turmas.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {turmas.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {t.chamadaFeita
                      ? <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      : <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{t.name}</p>
                      {t.professor && (
                        <p className="text-[11px] text-slate-400 truncate">{t.professor}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-slate-400 tabular-nums">{t.totalAlunos} alunos</span>
                    {!t.chamadaFeita && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {turmas.length > 6 && (
                <div className="px-4 py-2 text-center">
                  <button
                    onClick={() => navigate('/app/coordenacao')}
                    className="text-[11px] text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Ver todas as {turmas.length} turmas →
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Atendimentos Recentes ── */}
      {atendimentos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-medium text-slate-400 tracking-wide">Atendimentos recentes</p>
            <button
              onClick={() => navigate('/app/atendimentos-pais')}
              className="text-[11px] text-brand-600 hover:text-brand-700 font-medium flex items-center gap-0.5"
            >
              Ver todos <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 shadow-sm overflow-hidden">
            {atendimentos.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 truncate">{a.responsavelNome}</p>
                  <p className="text-[11px] text-slate-400 truncate">{a.assunto}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Módulos ── */}
      <section>
        <p className="text-xs font-medium text-slate-400 mb-2.5 tracking-wide">Módulos da secretaria</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {MODULOS.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(m.path)}
              className={`group relative text-left bg-white border border-slate-100 border-l-4 ${m.accent} rounded-2xl p-4 hover:shadow-sm hover:border-slate-200 transition-all`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-slate-500 group-hover:text-brand-600 transition-colors">
                  {m.icon}
                </div>
                {m.badge && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">
                    {m.badge}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-700 group-hover:text-brand-700 transition-colors leading-snug">
                {m.label}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-normal line-clamp-2">
                {m.desc}
              </p>
              <div className="flex items-center gap-1 mt-2.5 text-[11px] font-medium text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Acessar</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </button>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

// ─── Badge de status de atendimento ──────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    AGENDADO:         { label: 'Agendado',        cls: 'bg-blue-50 text-blue-600 border-blue-200' },
    REALIZADO:        { label: 'Realizado',        cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    CANCELADO:        { label: 'Cancelado',        cls: 'bg-slate-50 text-slate-500 border-slate-200' },
    PENDENTE_RETORNO: { label: 'Ret. Pendente',    cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${s.cls}`}>
      {s.label}
    </span>
  );
}
