/**
 * DashboardCoordenacaoPedagogicaPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SUPER DASHBOARD — Coordenação Pedagógica · Conexa V3
 * Refatorado com arquitetura "Gestão por Exceção":
 *   · Cockpit executivo dark no topo
 *   · Grid 4-colunas de KPIs clicáveis
 *   · Layout 2/3 + 1/3 para conteúdo principal e painel lateral
 *   · Todos os dados de API preservados com RBAC intacto
 *   · Mock data com TODO: Integrar com API claramente marcado
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { useApiCache } from '../hooks/useApiCache';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Users, BookOpen, ClipboardList, ShoppingCart,
  CheckCircle, AlertCircle, ChevronRight,
  MessageCircle, TrendingUp, Bell, Brain,
  RefreshCw, BarChart2, FileText, ArrowRight,
  Shield, Zap, Activity, Clock, CheckCircle2,
  XCircle, Star,
  GraduationCap, MessageSquare,
} from 'lucide-react';
import { RecadosWidget } from '../components/recados/RecadosWidget';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { isCentral as checkIsCentral, isUnidade as checkIsUnidade } from '../api/auth';
import { useUnitScope } from '../contexts/UnitScopeContext';
import { getPedagogicalToday } from '@/utils/pedagogicalDate';
import { OcorrenciasPanel } from '../components/dashboard/OcorrenciasPanel';
import { TriangleAlert } from 'lucide-react';
import { KPIGrid } from '../components/dashboard/KPIGrid';
import { ActionRequiredBlock } from '../components/dashboard/ActionRequiredBlock';
import { WorkQueueBlock } from '../components/dashboard/WorkQueueBlock';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

interface Planejamento {
  id: string;
  title: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
  professorNome: string;
  turmaNome: string;
  templateNome?: string;
  objectives?: string;
  reviewComment?: string;
  createdByUser?: { id: string; firstName: string; lastName: string; email: string };
  classroom?: { id: string; name: string };
  template?: { id: string; name: string; type: string };
}

interface Diario {
  id: string;
  professorNome: string;
  turmaNome: string;
  data: string;
  titulo: string;
  status?: string;
  climaEmocional?: string;
  presencas?: number;
  ausencias?: number;
  momentoDestaque?: string;
  statusExecucaoPlano?: string;
  camposBNCC?: string[];
}

interface TurmaResumo {
  id: string;
  nome: string;
  totalAlunos: number;
  professor: string | null;
  chamadaFeita: boolean;
}

interface DashboardData {
  turmas: number;
  professores: number;
  alunosTotal: number;
  requisicoesParaAnalisar: number;
  planejamentosParaRevisar: number;
  diariosEstaSemana: number;
  taxaPresencaMedia: number;
  alertas: string[];
  turmasLista: TurmaResumo[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — TODO: Integrar com API (endpoints especificados em cada bloco)
// ─────────────────────────────────────────────────────────────────────────────

/** TODO: Integrar com GET /insights/classroom/score — score por turma 0-100 */
const MOCK_CLASSROOM_SCORES = [
  { id: 'mock-1', name: 'Maternal I A',   score: 87, trend: +3 },
  { id: 'mock-2', name: 'Maternal I B',   score: 74, trend: -2 },
  { id: 'mock-3', name: 'Maternal II A',  score: 91, trend: +5 },
  { id: 'mock-4', name: 'Berçário I',     score: 62, trend: -8 },
  { id: 'mock-5', name: 'Berçário II',    score: 78, trend: +1 },
];

/** TODO: Integrar com GET /insights/governance/funnel — funil de planejamentos */
const MOCK_PLANNING_FUNNEL = [
  { label: 'Aprovados',    value: 14, color: '#10b981', pct: 58 },
  { label: 'Em Revisão',   value:  6, color: '#f59e0b', pct: 25 },
  { label: 'Devolvidos',   value:  2, color: '#ef4444', pct:  8 },
  { label: 'Rascunho',     value:  2, color: '#94a3b8', pct:  8 },
];

/** TODO: Integrar com GET /reports/diary/summary?mes=YYYY-MM */
const MOCK_CLIMATE_DISTRIBUTION = [
  { label: 'Ótimo',    count: 8,  color: '#10b981' },
  { label: 'Bom',      count: 12, color: '#3b82f6' },
  { label: 'Regular',  count: 3,  color: '#f59e0b' },
  { label: 'Agitado',  count: 2,  color: '#f97316' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTES INLINE (premium, sem dependências externas)
// ─────────────────────────────────────────────────────────────────────────────

/** KPI card escuro para o cockpit executivo */
function CockpitKPI({
  label, value, sub, accent, icon, onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'blue' | 'emerald' | 'amber' | 'rose';
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  const accentMap = {
    blue:    'group-hover:text-blue-300',
    emerald: 'group-hover:text-emerald-300',
    amber:   'group-hover:text-amber-300',
    rose:    'group-hover:text-rose-300',
  };
  const dotMap = {
    blue:    'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber:   'bg-amber-500',
    rose:    'bg-rose-500',
  };
  const a = accent ?? 'blue';

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`group relative rounded-2xl border border-white/10 bg-slate-900 p-5 text-left
        transition-all duration-200 hover:border-white/20 hover:bg-slate-800
        ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* Dot de status */}
      <span className={`absolute top-4 right-4 w-2 h-2 rounded-full ${dotMap[a]} opacity-60`} />

      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2 flex items-center gap-1.5">
        {icon && <span className="opacity-50">{icon}</span>}
        {label}
      </p>
      <p className={`text-3xl font-bold text-white transition-colors ${accentMap[a]}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      {onClick && (
        <p className="mt-3 text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors flex items-center gap-1">
          Ver detalhes <ArrowRight className="h-3 w-3" />
        </p>
      )}
    </button>
  );
}

/** Barra de progresso inline com label e percentual */
function ProgressBar({
  label, value, total, color = 'bg-blue-500', showCount = true,
}: {
  label: string; value: number; total: number; color?: string; showCount?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 truncate max-w-[60%]">{label}</span>
        <span className="text-xs font-bold text-gray-700">
          {showCount ? `${value}/${total}` : `${pct}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

/** Badge de status para planejamentos */
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    EM_REVISAO: { label: 'Em Revisão', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    APROVADO:   { label: 'Aprovado',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    DEVOLVIDO:  { label: 'Devolvido',  cls: 'bg-rose-100 text-rose-700 border-rose-200' },
    PUBLICADO:  { label: 'Publicado',  cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    RASCUNHO:   { label: 'Rascunho',   cls: 'bg-gray-100 text-gray-600 border-gray-200' },
    CONCLUIDO:  { label: 'Concluído',  cls: 'bg-teal-100 text-teal-700 border-teal-200' },
  };
  const c = cfg[(status || '').toUpperCase()] ?? cfg.RASCUNHO;
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

/** Mini gráfico de barras em CSS puro */
function MiniBarChart({
  data, height = 32,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  height?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div
            className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-90"
            style={{
              height: `${Math.max((d.value / max) * height, 3)}px`,
              backgroundColor: d.color,
            }}
            title={`${d.label}: ${d.value}`}
          />
        </div>
      ))}
    </div>
  );
}

/** Card de seção com header e conteúdo */
function SectionCard({
  title, subtitle, icon, action, children, className = '',
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-gray-400">{icon}</span>}
          <div>
            <p className="text-sm font-bold text-gray-800 leading-none">{title}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            {action.label} <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** Atalho rápido (quick action button) */
function QuickAction({
  label, icon, badge, onClick, variant = 'default',
}: {
  label: string;
  icon: React.ReactNode;
  badge?: number;
  onClick: () => void;
  variant?: 'default' | 'urgent' | 'success';
}) {
  const variantCls = {
    default: 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700',
    urgent:  'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-700',
    success: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700',
  };
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${variantCls[variant]}`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 text-left leading-snug">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex-shrink-0 min-w-[20px] h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <ChevronRight className="h-3.5 w-3.5 opacity-40 flex-shrink-0" />
    </button>
  );
}

/** Linha de turma na lista de turmas do dia */
function TurmaRow({
  turma, onPainelClick,
}: {
  turma: TurmaResumo;
  onPainelClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors group">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        turma.chamadaFeita ? 'bg-emerald-100' : 'bg-amber-100'
      }`}>
        {turma.chamadaFeita
          ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          : <Clock className="h-4 w-4 text-amber-600" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{turma.nome}</p>
        <p className="text-xs text-gray-400 truncate">
          {turma.totalAlunos} alunos · {turma.professor || 'Sem professor'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
          turma.chamadaFeita
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-amber-100 text-amber-700'
        }`}>
          {turma.chamadaFeita ? '✓ Chamada' : '⏳ Pendente'}
        </span>
        <button
          onClick={onPainelClick}
          className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
        >
          Painel →
        </button>
      </div>
    </div>
  );
}

/** Skeleton de loading para KPIs */
function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-2xl bg-slate-800 p-5 animate-pulse">
          <div className="h-3 bg-slate-700 rounded w-2/3 mb-4" />
          <div className="h-8 bg-slate-700 rounded w-1/2 mb-2" />
          <div className="h-2 bg-slate-700 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** Sub-componente PedagogicoSubNav — preservado do original */
interface PedagogicoSubNavProps {
  diarios: any[];
  turmasLista: any[];
  cobertura: any;
  loadingCobertura: boolean;
  carregarCobertura: () => void;
  setCobertura: (v: any) => void;
  setPendencias: (v: any) => void;
  navigate: (path: string) => void;
}

function PedagogicoSubNav({
  diarios, turmasLista, cobertura, loadingCobertura,
  carregarCobertura, setCobertura, setPendencias, navigate,
}: PedagogicoSubNavProps) {
  const [subAba, setSubAba] = React.useState<'diarios' | 'turmas' | 'cobertura'>('diarios');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { id: 'diarios',   label: 'Diários' },
          { id: 'turmas',    label: 'Turmas e Registros' },
          { id: 'cobertura', label: 'Cobertura' },
        ].map(s => (
          <button key={s.id} onClick={() => setSubAba(s.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              subAba === s.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {subAba === 'diarios' && (
        <div className="space-y-2">
          {diarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-gray-100 gap-2">
              <ClipboardList className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhum diário registrado nesta semana.</p>
            </div>
          ) : (
            diarios.slice(0, 8).map((d: any) => {
              const turma     = d.classroom?.name || d.turmaNome || '—';
              const professor = d.createdByUser
                ? `${d.createdByUser.firstName ?? ''} ${d.createdByUser.lastName ?? ''}`.trim()
                : d.professorNome || '—';
              const dataRaw  = d.eventDate || d.data || '';
              const dataFmt  = dataRaw
                ? new Date(dataRaw.includes('T') ? dataRaw : `${dataRaw}T12:00:00`)
                    .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                : '—';
              const ctx      = d.aiContext && typeof d.aiContext === 'object' ? d.aiContext as any : {};
              const publicado = ['PUBLICADO','REVISADO','ARQUIVADO']
                .includes((d.status || '').toUpperCase());
              return (
                <div key={d.id} className={`rounded-xl border px-4 py-3 bg-white flex items-center justify-between gap-3 ${
                  publicado ? 'border-emerald-100' : 'border-amber-100'
                }`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{turma}</p>
                    <p className="text-xs text-gray-400">
                      {professor}
                      {ctx.presencas != null && <span className="ml-2 text-emerald-600">· {ctx.presencas} pres.</span>}
                      {ctx.climaEmocional && <span className="ml-1">· {ctx.climaEmocional}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={d.status || 'RASCUNHO'} />
                    <span className="text-xs text-gray-400">{dataFmt}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {subAba === 'turmas' && (
        <div className="space-y-2">
          {turmasLista.map((turma: any) => (
            <div key={turma.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{turma.nome}</p>
                  <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor || 'Sem professor'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${turma.chamadaFeita ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {turma.chamadaFeita ? '✅ Chamada' : '⏳ Pendente'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Observações', path: `/app/coordenacao/observacoes?classroomId=${turma.id}` },
                  { label: 'Diários',     path: `/app/diario-calendario?classroomId=${turma.id}` },
                  { label: 'Atividades',  path: `/app/sala-de-aula-virtual?classroomId=${turma.id}` },
                  { label: 'RDIC',        path: `/app/rdic?classroomId=${turma.id}` },
                ].map(item => (
                  <button key={item.label} onClick={() => navigate(item.path)}
                    className="flex flex-col items-center gap-1 p-2.5 bg-gray-50 rounded-xl hover:bg-blue-50 transition-all text-xs font-medium text-gray-600 hover:text-blue-700">
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {subAba === 'cobertura' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Cobertura de Registros — Hoje</p>
            <button onClick={() => { setCobertura(null); setPendencias(null); carregarCobertura(); }}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </button>
          </div>
          {loadingCobertura ? (
            <div className="flex items-center justify-center py-10 gap-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Carregando...</p>
            </div>
          ) : !cobertura ? (
            <button onClick={carregarCobertura}
              className="w-full py-8 rounded-2xl border-2 border-dashed border-blue-200 text-sm text-blue-600 hover:bg-blue-50 transition-all">
              Carregar dados de cobertura
            </button>
          ) : (
            <div className="space-y-2">
              {(cobertura.classrooms ?? []).map((cls: any) => (
                <div key={cls.classroomId} className="bg-white rounded-xl border border-gray-100 p-3">
                  <ProgressBar
                    label={cls.classroomName}
                    value={cls.coveragePct ?? 0}
                    total={100}
                    color={(cls.coveragePct ?? 0) >= 80 ? 'bg-emerald-500' : (cls.coveragePct ?? 0) >= 40 ? 'bg-amber-400' : 'bg-red-400'}
                    showCount={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardCoordenacaoPedagogicaPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [planejamentos, setPlanejamentos] = useState<Planejamento[]>([]);
  const [diarios, setDiarios] = useState<any[]>([]);
  const [metricasExecucao, setMetricasExecucao] = useState<Record<string, {
    total: number; publicados: number; comMatriz: number; comPlano: number;
  }>>({});

  interface CoberturaData {
    unitId: string; startDate: string; endDate: string;
    totalCriancas: number; totalComRegistro: number; percentualGeral: number;
    classrooms: Array<{ classroomId: string; classroomName: string; coveragePct: number }>;
    turmas: Array<{ classroomId: string; classroomName: string; totalCriancas: number; criancasComRegistro: number; percentual: number }>;
  }
  interface PendenciasData {
    totalPendentes: number;
    pendentes: Array<{ childId: string; nome: string; classroomId: string; classroomName: string }>;
  }

  const [cobertura, setCobertura] = useState<CoberturaData | null>(null);
  const [alertasReais, setAlertasReais] = useState<{
    total: number; criticos: any[]; atencao: any[]; info: any[];
  } | null>(null);
  const [resumoDiarios, setResumoDiarios] = useState<any | null>(null);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [pendencias, setPendencias] = useState<PendenciasData | null>(null);
  const [loadingCobertura, setLoadingCobertura] = useState(false);
  const apiCache = useApiCache(60_000);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaAtiva = (searchParams.get('aba') as any) ?? 'inicio';

  function setAbaAtiva(novaAba: string) {
    const novosParams = new URLSearchParams(searchParams.toString());
    novosParams.set('aba', novaAba);
    setSearchParams(novosParams, { replace: false });
  }

  // RBAC — preservado integralmente
  const { selectedUnitId: ctxUnitId } = useUnitScope();
  const unitIdParam = searchParams.get('unitId') ?? ctxUnitId ?? undefined;
  const { user } = useAuth();
  const isCentralUser = checkIsCentral(user);
  const isUnidadeUser = checkIsUnidade(user);
  const canApprove = isUnidadeUser && !isCentralUser;

  const [processando, setProcessando] = useState<string | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [itemParaRejeitar, setItemParaRejeitar] = useState<{ id: string; tipo: 'req' | 'plan' } | null>(null);
  const [planExpandido, setPlanExpandido] = useState<string | null>(null);
  const [turmaExpandida, setTurmaExpandida] = useState<string | null>(null);
  const [erroPainel, setErroPainel] = useState<string | null>(null);
  const [filtroDiarioTurma, setFiltroDiarioTurma] = useState('');
  const [filtroDiarioStatus, setFiltroDiarioStatus] = useState('TODOS');
  const [filtroDiarioDataInicio, setFiltroDiarioDataInicio] = useState('');
  const [filtroDiarioDataFim, setFiltroDiarioDataFim] = useState('');
  const [filtroDiarioProfessor, setFiltroDiarioProfessor] = useState('');
  const ITENS_POR_PAGINA = 10;
  const [paginaDiarios, setPaginaDiarios] = useState(1);

  // ── Funções de API ─────────────────────────────────────────────────────────

  async function carregarDiarios() {
    try {
      const params: Record<string, string> = unitIdParam ? { unitId: unitIdParam } : {};
      if (filtroDiarioDataInicio) params.startDate = `${filtroDiarioDataInicio}T00:00:00.000Z`;
      if (filtroDiarioDataFim) params.endDate = `${filtroDiarioDataFim}T23:59:59.999Z`;
      const res = await http.get('/coordenacao/diarios', { params });
      const payload = res.data;
      const listaDiarios = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.diarios) ? payload.diarios : []);
      setDiarios(listaDiarios);
      if (payload?.metricas) setMetricasExecucao(payload.metricas);
    } catch {
      setDiarios([]);
      setMetricasExecucao({});
    }
  }

  async function carregarCobertura() {
    setLoadingCobertura(true);
    try {
      const hoje = getPedagogicalToday();
      const [covData, pendData] = await Promise.all([
        apiCache.get('/reports/unit/coverage', { startDate: hoje, endDate: hoje }, () =>
          http.get('/reports/unit/coverage', { params: { startDate: hoje, endDate: hoje } }).then(r => r.data)
        ),
        apiCache.get('/reports/unit/pendings', { daysWithout: 1 }, () =>
          http.get('/reports/unit/pendings', { params: { daysWithout: 1 } }).then(r => r.data)
        ),
      ]);
      setCobertura(covData as CoberturaData);
      setPendencias(pendData as PendenciasData);
    } catch {
      toast.error('Erro ao carregar cobertura');
    } finally {
      setLoadingCobertura(false);
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      const diarioParams: Record<string, string> = unitIdParam ? { unitId: unitIdParam } : {};
      if (filtroDiarioDataInicio) diarioParams.startDate = `${filtroDiarioDataInicio}T00:00:00.000Z`;
      if (filtroDiarioDataFim) diarioParams.endDate = `${filtroDiarioDataFim}T23:59:59.999Z`;
      const [dashRes, reqRes, planRes, diarRes] = await Promise.allSettled([
        http.get('/coordenacao/dashboard/unidade', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/coordenacao/requisicoes', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/coordenacao/planejamentos', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/coordenacao/diarios', { params: diarioParams }),
      ]);
      const mes = new Date().toISOString().slice(0, 7);
      setLoadingAlertas(true);
      Promise.allSettled([
        http.get('/insights/unit/alerts', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/reports/diary/summary', { params: { mes, ...(unitIdParam ? { unitId: unitIdParam } : {}) } }),
      ]).then(([alertasRes, resumoRes]) => {
        if (alertasRes.status === 'fulfilled') setAlertasReais(alertasRes.value.data);
        if (resumoRes.status === 'fulfilled') setResumoDiarios(resumoRes.value.data);
      }).finally(() => setLoadingAlertas(false));

      if (dashRes.status === 'fulfilled') {
        const raw = dashRes.value.data;
        const ind = raw?.indicadores ?? {};
        const turmasArr: TurmaResumo[] = Array.isArray(raw?.turmas) ? raw.turmas : [];
        const professoresSet = new Set(turmasArr.map((t: TurmaResumo) => t.professor).filter((p: string | null) => p !== null && p !== 'Não atribuído'));
        setDashboard({
          turmas: ind.totalTurmas ?? turmasArr.length,
          professores: ind.totalProfessores ?? professoresSet.size ?? 0,
          alunosTotal: ind.totalAlunos ?? 0,
          requisicoesParaAnalisar: ind.requisicoesPendentes ?? 0,
          planejamentosParaRevisar: (ind.planejamentosEmRevisao ?? ind.planejamentosRascunho) ?? 0,
          diariosEstaSemana: ind.diariosHoje ?? 0,
          taxaPresencaMedia: ind.totalTurmas > 0
            ? Math.round((ind.turmasComChamadaHoje / ind.totalTurmas) * 100) : 0,
          alertas: [],
          turmasLista: turmasArr,
        });
        if (Array.isArray(raw?.planejamentosParaRevisao) && raw.planejamentosParaRevisao.length > 0) {
          setPlanejamentos(raw.planejamentosParaRevisao.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            title: (p.title as string) ?? 'Plano de Aula',
            status: (p.status as string) ?? 'RASCUNHO',
            type: (p.type as string) ?? '',
            startDate: (p.startDate as string) ?? '',
            endDate: (p.endDate as string) ?? '',
            professorNome: (p.createdBy as string) ?? 'Professor',
            turmaNome: ((p.grupo as Record<string, unknown> | null)?.turmaNome as string)
              ?? ((p.classroom as Record<string, unknown> | null)?.name as string)
              ?? (p.classroomId as string) ?? '—',
          })));
        }
      }
      if (planRes.status === 'fulfilled') {
        const rawPlans: Record<string, unknown>[] = Array.isArray(planRes.value.data) ? planRes.value.data : [];
        setPlanejamentos(rawPlans.map((p) => {
          const u = p.createdByUser as Record<string, string> | null;
          const classroom = p.classroom as Record<string, string> | null;
          const template = p.template as Record<string, string> | null;
          return {
            id: p.id as string,
            title: (p.title as string) ?? 'Plano de Aula',
            status: (p.status as string) ?? 'RASCUNHO',
            type: (p.type as string) ?? '',
            startDate: (p.startDate as string) ?? '',
            endDate: (p.endDate as string) ?? '',
            professorNome: u ? `${u.firstName} ${u.lastName}`.trim() : 'Professor',
            turmaNome: ((p.porTurma as Record<string, unknown> | null)?.turmaNome as string)
              ?? ((p.grupo as Record<string, unknown> | null)?.turmaNome as string)
              ?? classroom?.name ?? (p.classroomId as string) ?? '—',
            templateNome: template?.name ?? undefined,
            objectives: (p.objectives as string) ?? undefined,
            reviewComment: (p.reviewComment as string) ?? undefined,
            createdByUser: u as Planejamento['createdByUser'],
            classroom: classroom as Planejamento['classroom'],
            template: template as Planejamento['template'],
          };
        }));
      }
      if (diarRes.status === 'fulfilled') {
        const payload = diarRes.value.data;
        const listaDiarios = Array.isArray(payload)
          ? payload : (Array.isArray(payload?.diarios) ? payload.diarios : []);
        setDiarios(listaDiarios);
        if (payload?.metricas) setMetricasExecucao(payload.metricas);
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (e as { message?: string })?.message ?? 'Erro desconhecido';
      setErroPainel(msg);
      toast.error('Erro ao carregar painel');
    } finally {
      setLoading(false);
    }
  }

  async function aprovarPlanejamento(id: string) {
    try {
      setProcessando(id);
      await http.post(`/plannings/${id}/aprovar`);
      toast.success('Planejamento aprovado! ✅');
      setPlanejamentos(prev => prev.filter(p => p.id !== id));
    } catch {
      toast.error('Erro ao aprovar');
    } finally {
      setProcessando(null);
    }
  }

  async function devolverPlanejamento(id: string, motivo: string) {
    try {
      setProcessando(id);
      await http.post(`/plannings/${id}/devolver`, { comment: motivo });
      toast.success('Planejamento devolvido com observações');
      setPlanejamentos(prev => prev.filter(p => p.id !== id));
      setItemParaRejeitar(null);
      setMotivoRejeicao('');
    } catch {
      toast.error('Erro ao devolver');
    } finally {
      setProcessando(null);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadDashboardCb = useCallback(loadDashboard, [unitIdParam]);
  useEffect(() => { loadDashboardCb(); }, [loadDashboardCb]);
  useEffect(() => { carregarDiarios(); }, [unitIdParam, filtroDiarioDataInicio, filtroDiarioDataFim]);
  useEffect(() => {
    setPaginaDiarios(1);
    if (abaAtiva === 'cobertura' && !cobertura) carregarCobertura();
  }, [abaAtiva]);

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading) return <LoadingState message="Carregando painel de coordenação..." />;
  if (erroPainel && !dashboard) return (
    <PageShell title="Painel da Coordenação Pedagógica" subtitle="">
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="font-bold text-red-800 mb-2">Não foi possível carregar o painel</p>
          <p className="text-sm text-red-600 mb-4">{erroPainel}</p>
          {erroPainel.includes('unidade') && (
            <p className="text-xs text-gray-500 mb-4">Selecione uma unidade no seletor de escopo para visualizar o painel.</p>
          )}
          <Button onClick={() => { setErroPainel(null); loadDashboard(); }} className="rounded-xl">Tentar novamente</Button>
        </div>
      </div>
    </PageShell>
  );

  // ── Valores computados ─────────────────────────────────────────────────────
  const planejamentosEmRevisao  = planejamentos.filter(p => (p.status || '').toUpperCase() === 'EM_REVISAO').length;
  const planejamentosDevolvidos = planejamentos.filter(p => (p.status || '').toUpperCase() === 'DEVOLVIDO').length;
  const planejamentosAprovados  = planejamentos.filter(p => ['APROVADO','PUBLICADO','CONCLUIDO'].includes((p.status || '').toUpperCase())).length;
  const planejamentosRascunho   = planejamentos.filter(p => (p.status || '').toUpperCase() === 'RASCUNHO').length;
  const totalPendencias         = (dashboard?.requisicoesParaAnalisar ?? 0) + planejamentosEmRevisao;

  // Funil real de planejamentos (substitui MOCK_PLANNING_FUNNEL quando há dados)
  const totalPlanejamentos = planejamentos.length;
  const FUNIL_REAL = totalPlanejamentos > 0 ? [
    { label: 'Aprovados',  value: planejamentosAprovados,  color: '#10b981', pct: Math.round((planejamentosAprovados / totalPlanejamentos) * 100) },
    { label: 'Em Revisão', value: planejamentosEmRevisao,  color: '#f59e0b', pct: Math.round((planejamentosEmRevisao / totalPlanejamentos) * 100) },
    { label: 'Devolvidos', value: planejamentosDevolvidos, color: '#ef4444', pct: Math.round((planejamentosDevolvidos / totalPlanejamentos) * 100) },
    { label: 'Rascunho',   value: planejamentosRascunho,   color: '#94a3b8', pct: Math.round((planejamentosRascunho / totalPlanejamentos) * 100) },
  ] : null;
  const primeiroNome            = (((user?.nome as string) || 'Coordenação').trim().split(' ')[0]) || 'Coordenação';
  const totalTurmasHoje         = dashboard?.turmasLista?.length ?? dashboard?.turmas ?? 0;
  const turmasComChamadaHoje    = (dashboard?.turmasLista ?? []).filter(t => t.chamadaFeita).length;
  const turmasPendentesHoje     = Math.max(totalTurmasHoje - turmasComChamadaHoje, 0);
  const diariosPublicados       = diarios.filter(d => ['PUBLICADO','REVISADO','ARQUIVADO'].includes((d.status || '').toUpperCase())).length;
  const diariosRascunho         = diarios.filter(d => (d.status || '').toUpperCase() === 'RASCUNHO').length;
  const taxaChamada             = totalTurmasHoje > 0 ? Math.round((turmasComChamadaHoje / totalTurmasHoje) * 100) : 0;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PageShell
      title="Coordenação Pedagógica"
      subtitle={`Olá, ${primeiroNome}. Acompanhe a operação pedagógica com leitura rápida, decisões seguras e navegação fluida em qualquer tela.`}
    >
      {/* ── MODAL: Devolução de planejamento ─────────────────────────────── */}
      {itemParaRejeitar && canApprove && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Devolver com orientação</h3>
                <p className="text-xs text-gray-400">O professor receberá seu comentário</p>
              </div>
            </div>
            <textarea
              className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm resize-none mb-4 focus:outline-none focus:border-blue-400 transition-colors"
              rows={4}
              placeholder="Ex: Por favor, detalhe melhor os objetivos de aprendizagem..."
              value={motivoRejeicao}
              onChange={e => setMotivoRejeicao(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl"
                onClick={() => { setItemParaRejeitar(null); setMotivoRejeicao(''); }}>
                Cancelar
              </Button>
              <Button
                className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600"
                disabled={!motivoRejeicao.trim()}
                onClick={() => {
                  if (!motivoRejeicao.trim()) { toast.error('Escreva uma orientação'); return; }
                  devolverPlanejamento(itemParaRejeitar.id, motivoRejeicao);
                }}>
                Devolver
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          COCKPIT EXECUTIVO — hero dark com KPIs e atalhos estratégicos
          ════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl bg-slate-900 p-5 mb-5 overflow-hidden relative">
        {/* Textura de fundo sutil */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8b5cf6 0%, transparent 40%)' }} />

        <div className="relative z-10 space-y-4">
          {/* Header do cockpit */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
                  <Shield className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Cockpit Executivo da Unidade
                </span>
              </div>
              <h2 className="text-xl font-bold text-white leading-snug">
                Operação pedagógica com visão premium e resposta rápida
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-xl">
                Consolide pendências, cobertura, diários e movimentação das turmas em um único fluxo,
                com leitura clara no desktop e navegação simplificada no mobile.
              </p>
            </div>

            {/* Métricas de destaque no cockpit */}
            <div className="flex gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Pendências vivas</p>
                <p className="text-2xl font-bold text-white">{totalPendencias}</p>
                <p className="text-xs text-slate-500">{planejamentosEmRevisao} planos · {dashboard?.requisicoesParaAnalisar ?? 0} pedidos</p>
              </div>
              <div className="w-px bg-white/10 self-stretch" />
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Cobertura de hoje</p>
                <p className="text-2xl font-bold text-white">{taxaChamada}%</p>
                <p className="text-xs text-slate-500">{turmasComChamadaHoje} de {totalTurmasHoje} turmas com chamada</p>
              </div>
            </div>
          </div>

          {/* Atalhos estratégicos no cockpit */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                label: 'Diários das turmas',
                sub: 'Cobertura, registros e status das turmas',
                icon: <ClipboardList className="h-4 w-4" />,
                action: () => setAbaAtiva('diarios'),
                cls: 'border-white/10 bg-white/5 hover:bg-white/10',
              },
              {
                label: 'Revisar planejamentos',
                sub: `${planejamentosEmRevisao} item(ns) aguardando retorno`,
                icon: <BookOpen className="h-4 w-4" />,
                action: () => setAbaAtiva('planejamentos'),
                cls: totalPendencias > 0 ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10',
                badge: planejamentosEmRevisao,
              },
              {
                label: 'Pedidos de material',
                sub: 'Aprove, devolva ou acompanhe prioridades',
                icon: <ShoppingCart className="h-4 w-4" />,
                action: () => navigate(unitIdParam ? `/app/material-requests?unitId=${unitIdParam}` : '/app/material-requests'),
                cls: (dashboard?.requisicoesParaAnalisar ?? 0) > 0 ? 'border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10',
                badge: dashboard?.requisicoesParaAnalisar,
              },
              {
                label: 'Relatórios da unidade',
                sub: 'Acesse indicadores e leitura rápida dos registros',
                icon: <TrendingUp className="h-4 w-4" />,
                action: () => setAbaAtiva('relatorios'),
                cls: 'border-white/10 bg-white/5 hover:bg-white/10',
              },
            ].map((item, i) => (
              <button key={i} onClick={item.action}
                className={`relative text-left p-3 rounded-xl border transition-all ${item.cls}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-300">{item.icon}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{item.sub}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          GRID KPI — 4 cards clicáveis com drill-down
          ════════════════════════════════════════════════════════════════════ */}
      <KPIGrid
        totalPendencias={totalPendencias}
        turmasComChamadaHoje={turmasComChamadaHoje}
        totalTurmasHoje={totalTurmasHoje}
        diariosEstaSemana={diarios.length}
        diariosPublicados={diariosPublicados}
        diariosRascunho={diariosRascunho}
        totalTurmas={dashboard?.turmas ?? 0}
        totalAlunos={dashboard?.alunosTotal ?? 0}
        totalProfessores={dashboard?.professores ?? 0}
        onPendenciasClick={() => setAbaAtiva('planejamentos')}
        onChamadasClick={() => setAbaAtiva('turmas')}
        onDiariosClick={() => navigate('/app/diario-calendario')}
        onTurmasClick={() => setAbaAtiva('turmas')}
      />

      {/* ════════════════════════════════════════════════════════════════════
          TABS DE NAVEGAÇÃO
          ════════════════════════════════════════════════════════════════════ */}
      <div className="mt-5 mb-4 flex gap-1 bg-gray-100 rounded-2xl p-1 overflow-x-auto scrollbar-none">
        {([
          { id: 'inicio',        label: 'Hoje',          icon: <Star className="h-4 w-4" />,          badge: totalPendencias || undefined },
          { id: 'turmas',        label: 'Turmas',         icon: <Users className="h-4 w-4" /> },
          { id: 'planejamentos', label: 'Planejamentos',  icon: <BookOpen className="h-4 w-4" />,      badge: planejamentosEmRevisao || undefined },
          { id: 'diarios',       label: 'Diários',        icon: <ClipboardList className="h-4 w-4" /> },
          { id: 'relatorios',    label: 'Relatórios',     icon: <TrendingUp className="h-4 w-4" /> },
          { id: 'ocorrencias',   label: 'Ocorrências',    icon: <TriangleAlert className="h-4 w-4" />, badge: alertasReais?.total || undefined },
        ] as const).map(aba => (
          <button
            key={aba.id}
            onClick={() => { setAbaAtiva(aba.id); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              abaAtiva === aba.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {aba.icon}
            {aba.label}
            {(aba as any).badge > 0 && (
              <span className="bg-rose-500 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold px-1">
                {(aba as any).badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ABA: HOJE — layout 2/3 + 1/3
          ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'inicio' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Coluna principal (2/3) ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* BLOCO 1: Ação Exigida */}
            <ActionRequiredBlock
              items={[
                {
                  id: 'requisicoes',
                  type: 'requisicao',
                  title: 'Requisições Pendentes',
                  count: dashboard?.requisicoesParaAnalisar ?? 0,
                  subtitle: 'Aguardando análise',
                  color: 'bg-rose-600',
                  bgColor: 'bg-rose-50',
                  icon: <ShoppingCart className="h-5 w-5 text-rose-600" />,
                  action: () => navigate(unitIdParam ? `/app/material-requests?unitId=${unitIdParam}` : '/app/material-requests'),
                  actionLabel: 'Analisar',
                },
                {
                  id: 'planejamentos',
                  type: 'planejamento',
                  title: 'Planejamentos',
                  count: planejamentosEmRevisao,
                  subtitle: 'Aguardando revisão',
                  color: 'bg-blue-600',
                  bgColor: 'bg-blue-50',
                  icon: <ClipboardList className="h-5 w-5 text-blue-600" />,
                  action: () => setAbaAtiva('planejamentos'),
                  actionLabel: 'Revisar',
                },
                {
                  id: 'alertas',
                  type: 'faltas',
                  title: 'Alertas Ativos',
                  count: alertasReais?.total ?? 0,
                  subtitle: 'Ocorrências críticas',
                  color: 'bg-amber-600',
                  bgColor: 'bg-amber-50',
                  icon: <Bell className="h-5 w-5 text-amber-600" />,
                  action: () => setAbaAtiva('ocorrencias'),
                  actionLabel: 'Ver alertas',
                },
                {
                  id: 'chamadas',
                  type: 'atendimento',
                  title: 'Chamadas Pendentes',
                  count: turmasPendentesHoje,
                  subtitle: `de ${totalTurmasHoje} turmas`,
                  color: 'bg-violet-600',
                  bgColor: 'bg-violet-50',
                  icon: <Users className="h-5 w-5 text-violet-600" />,
                  action: () => setAbaAtiva('turmas'),
                  actionLabel: 'Ver turmas',
                },
              ]}
            />

            {/* BLOCO 2: Status das turmas hoje */}
            <SectionCard
              title="Status das Turmas — Hoje"
              subtitle={`${turmasComChamadaHoje} de ${totalTurmasHoje} turmas com chamada`}
              icon={<Activity className="h-4 w-4" />}
              action={{
                label: 'Ver todas',
                onClick: () => setAbaAtiva('turmas'),
              }}
            >
              {/* Barra de progresso geral */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-500">Cobertura de chamadas</span>
                  <span className={`text-sm font-bold ${taxaChamada >= 70 ? 'text-emerald-600' : taxaChamada >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {taxaChamada}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${taxaChamada >= 70 ? 'bg-emerald-500' : taxaChamada >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
                    style={{ width: `${taxaChamada}%` }}
                  />
                </div>
              </div>

              {/* Lista de turmas */}
              <div className="space-y-0.5">
                {(dashboard?.turmasLista ?? []).slice(0, 6).map(turma => (
                  <TurmaRow
                    key={turma.id}
                    turma={turma}
                    onPainelClick={() => navigate(`/app/turma/${turma.id}/painel`)}
                  />
                ))}
                {(dashboard?.turmasLista?.length ?? 0) > 6 && (
                  <button
                    onClick={() => setAbaAtiva('turmas')}
                    className="w-full py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 text-center transition-colors mt-1"
                  >
                    + {(dashboard?.turmasLista?.length ?? 0) - 6} turmas adicionais
                  </button>
                )}
              </div>
            </SectionCard>

            {/* BLOCO 3: Fila de revisão de planejamentos */}
            {planejamentos.filter(p => ['EM_REVISAO','DEVOLVIDO'].includes((p.status || '').toUpperCase())).length > 0 && (
              <SectionCard
                title="Fila de Revisão"
                subtitle={`${planejamentosEmRevisao} planejamentos aguardando`}
                icon={<ClipboardList className="h-4 w-4" />}
                action={{ label: 'Ver todos', onClick: () => setAbaAtiva('planejamentos') }}
              >
                <div className="space-y-3">
                  {planejamentos
                    .filter(p => ['EM_REVISAO', 'DEVOLVIDO'].includes((p.status || '').toUpperCase()))
                    .slice(0, 4)
                    .map(plan => (
                      <div key={plan.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{plan.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {plan.turmaNome || plan.classroom?.name || '—'} · Prof. {plan.professorNome}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={plan.status} />
                          {canApprove && (plan.status || '').toUpperCase() === 'EM_REVISAO' && (
                            <>
                              <button
                                onClick={() => aprovarPlanejamento(plan.id)}
                                disabled={processando === plan.id}
                                className="text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => setItemParaRejeitar({ id: plan.id, tipo: 'plan' })}
                                className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-lg border border-amber-200 transition-colors"
                              >
                                Devolver
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </SectionCard>
            )}

            {/* BLOCO 4: Diários recentes */}
            <SectionCard
              title="Diários desta semana"
              subtitle={`${diariosPublicados} publicados · ${diariosRascunho} rascunho(s)`}
              icon={<BookOpen className="h-4 w-4" />}
              action={{ label: 'Ver todos', onClick: () => setAbaAtiva('diarios') }}
            >
              {diarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <ClipboardList className="h-8 w-8 text-gray-200" />
                  <p className="text-sm text-gray-400">Nenhum diário registrado neste período.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {diarios.slice(0, 5).map((d: any) => {
                    const turma     = d.classroom?.name || d.turmaNome || '—';
                    const professor = d.createdByUser
                      ? `${d.createdByUser.firstName ?? ''} ${d.createdByUser.lastName ?? ''}`.trim()
                      : d.professorNome || '—';
                    const dataRaw   = d.eventDate || d.data || d.createdAt || '';
                    const dataFmt   = dataRaw
                      ? new Date(dataRaw.includes('T') ? dataRaw : `${dataRaw}T12:00:00`)
                          .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                      : '—';
                    const ctx       = d.aiContext && typeof d.aiContext === 'object' ? d.aiContext as any : {};
                    const publicado = ['PUBLICADO','REVISADO','ARQUIVADO'].includes((d.status || '').toUpperCase());
                    return (
                      <div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                        publicado ? 'border-emerald-100 bg-emerald-50/40' : 'border-amber-100 bg-amber-50/40'
                      }`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{turma}</p>
                          <p className="text-xs text-gray-400">
                            Prof. {professor}
                            {ctx.presencas != null && <span className="ml-2 text-emerald-600 font-medium">· {ctx.presencas} pres.</span>}
                            {ctx.climaEmocional && <span className="ml-1">· {ctx.climaEmocional}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={d.status || 'RASCUNHO'} />
                          <span className="text-xs text-gray-400 font-medium">{dataFmt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Coluna lateral (1/3) ────────────────────────────────────── */}
          <div className="space-y-5">

            {/* PAINEL: Ações rápidas — atalhos para funcionalidades não cobertas pelo cockpit */}
            <SectionCard
              title="Ações Rápidas"
              icon={<Zap className="h-4 w-4" />}
            >
              <div className="space-y-2">
                {/* Diários: não está no cockpit estratégico */}
                <QuickAction
                  label="Diários das turmas"
                  icon={<ClipboardList className="h-4 w-4 text-indigo-500" />}
                  onClick={() => navigate('/app/diario-calendario')}
                />
                {/* RDIC: não está no cockpit estratégico */}
                <QuickAction
                  label="RDIC — Revisão"
                  icon={<Brain className="h-4 w-4 text-teal-500" />}
                  onClick={() => navigate('/app/rdic-coord')}
                />
                {/* Turmas & Reuniões */}
                <QuickAction
                  label="Turmas & Reuniões"
                  icon={<Users className="h-4 w-4 text-violet-500" />}
                  onClick={() => navigate('/app/coordenacao')}
                />
                {/* Matriz Pedagógica 2026 */}
                <QuickAction
                  label="Matriz Pedagógica 2026"
                  icon={<GraduationCap className="h-4 w-4 text-emerald-500" />}
                  onClick={() => navigate('/app/matriz-pedagogica')}
                />
                {/* Atendimentos aos Pais */}
                <QuickAction
                  label="Atendimentos aos Pais"
                  icon={<MessageCircle className="h-4 w-4 text-emerald-500" />}
                  onClick={() => navigate('/app/atendimentos-pais')}
                />
                {/* Ocorrências: com badge de alertas */}
                <QuickAction
                  label="Ocorrências"
                  icon={<TriangleAlert className="h-4 w-4 text-amber-500" />}
                  badge={alertasReais?.total}
                  onClick={() => setAbaAtiva('ocorrencias')}
                  variant={(alertasReais?.total ?? 0) > 0 ? 'urgent' : 'default'}
                />
              </div>
            </SectionCard>

            {/* PAINEL: Funil de planejamentos — dados reais quando disponíveis */}
            <SectionCard
              title="Planejamentos"
              subtitle={totalPlanejamentos > 0 ? `${totalPlanejamentos} plano(s) carregados` : 'Distribuição por status'}
              icon={<BarChart2 className="h-4 w-4" />}
              action={totalPlanejamentos > 0 ? { label: 'Ver todos', onClick: () => setAbaAtiva('planejamentos') } : undefined}
            >
              {(() => {
                const funil = FUNIL_REAL ?? MOCK_PLANNING_FUNNEL;
                const isMock = !FUNIL_REAL;
                return (
                  <>
                    <div className="mb-3">
                      <MiniBarChart
                        data={funil.map(f => ({ label: f.label, value: f.value, color: f.color }))}
                        height={40}
                      />
                    </div>
                    <div className="space-y-2">
                      {funil.map(f => (
                        <div key={f.label} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                          <span className="text-xs text-gray-600 flex-1">{f.label}</span>
                          <span className="text-xs font-bold text-gray-700">{f.value}</span>
                          <span className="text-[10px] text-gray-400 w-8 text-right">{f.pct}%</span>
                        </div>
                      ))}
                    </div>
                    {isMock && (
                      <p className="text-[10px] text-gray-400 mt-3 border-t border-gray-50 pt-2">
                        * Dados ilustrativos — carregue planejamentos para ver dados reais
                      </p>
                    )}
                  </>
                );
              })()}
            </SectionCard>

            {/* PAINEL: Clima emocional da semana
                TODO: Integrar com GET /reports/diary/summary */}
            <SectionCard
              title="Clima Emocional"
              subtitle="Registro semanal das turmas"
              icon={<Activity className="h-4 w-4" />}
            >
              {resumoDiarios?.climatologia ? (
                <div className="space-y-2">
                  {Object.entries(resumoDiarios.climatologia).map(([clima, count]) => (
                    <ProgressBar
                      key={clima}
                      label={clima}
                      value={count as number}
                      total={diarios.length || 1}
                      color="bg-blue-400"
                      showCount={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {MOCK_CLIMATE_DISTRIBUTION.map(c => (
                    <ProgressBar
                      key={c.label}
                      label={c.label}
                      value={c.count}
                      total={MOCK_CLIMATE_DISTRIBUTION.reduce((a, b) => a + b.count, 0)}
                      color={`bg-[${c.color}]`}
                    />
                  ))}
                  {/* Legenda inline */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {MOCK_CLIMATE_DISTRIBUTION.map(c => (
                      <span key={c.label} className="flex items-center gap-1 text-[10px] text-gray-500">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.label}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 border-t border-gray-50 pt-2">
                    * Dados ilustrativos — integrar com GET /reports/diary/summary
                  </p>
                </div>
              )}
            </SectionCard>

            {/* PAINEL: Alertas reais */}
            {(alertasReais?.total ?? 0) > 0 && (
              <SectionCard
                title="Alertas da Unidade"
                subtitle={`${alertasReais!.total} alerta(s) ativo(s)`}
                icon={<Bell className="h-4 w-4 text-rose-500" />}
                action={{ label: 'Ver todos', onClick: () => setAbaAtiva('ocorrencias') }}
              >
                <div className="space-y-2">
                  {[...(alertasReais?.criticos ?? []), ...(alertasReais?.atencao ?? [])].slice(0, 4).map((a: any) => (
                    <div key={a.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                      <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-rose-800 truncate">{a.titulo}</p>
                        {a.descricao && <p className="text-[11px] text-rose-600 truncate">{a.descricao}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* PAINEL: Recados */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
                <MessageCircle className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-bold text-gray-800">Recados</p>
              </div>
              <div className="p-2">
                <RecadosWidget
                  tipo="COORDENACAO"
                  unitId={unitIdParam ?? user?.unitId ?? undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ABA: TURMAS
          ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'turmas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            {/* Resumo em 3 KPIs */}
            <div className="grid grid-cols-3 gap-3 mb-2">
              {[
                { label: 'Com chamada',    val: `${turmasComChamadaHoje}/${totalTurmasHoje}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Alunos totais',  val: dashboard?.alunosTotal ?? 0,                 color: 'text-blue-600',    bg: 'bg-blue-50' },
                { label: 'Professores',    val: dashboard?.professores ?? 0,                  color: 'text-violet-600',  bg: 'bg-violet-50' },
              ].map(k => (
                <div key={k.label} className={`${k.bg} rounded-2xl p-4 text-center`}>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Lista de turmas expandida */}
            <div className="space-y-2">
              {(dashboard?.turmasLista ?? []).map(turma => (
                <div key={turma.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-200 transition-colors">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${turma.chamadaFeita ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                        {turma.chamadaFeita
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          : <Clock className="h-4 w-4 text-amber-600" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{turma.nome}</p>
                        <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · Prof. {turma.professor || '—'}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                      turma.chamadaFeita ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {turma.chamadaFeita ? '✓ Chamada' : '⏳ Pendente'}
                    </span>
                  </div>
                  {/* Atalhos da turma */}
                  <div className="grid grid-cols-5 border-t border-gray-50">
                    {[
                      { label: 'Diários',  path: `/app/diario-calendario?classroomId=${turma.id}`, color: 'text-blue-600',   bg: 'hover:bg-blue-50'   },
                      { label: 'Planos',   path: `/app/planejamentos?classroomId=${turma.id}`,     color: 'text-amber-600',  bg: 'hover:bg-amber-50'  },
                      { label: 'RDIC',     path: `/app/rdic?classroomId=${turma.id}`,              color: 'text-teal-600',   bg: 'hover:bg-teal-50'   },
                      { label: 'Painel',   path: `/app/turma/${turma.id}/painel`,                  color: 'text-violet-600', bg: 'hover:bg-violet-50' },
                      { label: 'Obs.',     path: `/app/coordenacao/observacoes?classroomId=${turma.id}`, color: 'text-rose-600', bg: 'hover:bg-rose-50' },
                    ].map(item => (
                      <button key={item.label} onClick={() => navigate(item.path)}
                        className={`py-2.5 text-[11px] font-semibold ${item.color} ${item.bg} transition-colors border-r border-gray-50 last:border-0`}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar de turmas */}
          <div className="space-y-5">
            {/* Score por turma — TODO: Integrar com GET /insights/classroom/score */}
            <SectionCard
              title="Score por Turma"
              subtitle="Índice pedagógico 0-100"
              icon={<Star className="h-4 w-4" />}
            >
              <div className="space-y-2.5">
                {MOCK_CLASSROOM_SCORES.map(c => (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600 truncate max-w-[55%]">{c.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold ${c.trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {c.trend > 0 ? `↑${c.trend}` : `↓${Math.abs(c.trend)}`}
                        </span>
                        <span className={`text-xs font-bold ${c.score >= 80 ? 'text-emerald-600' : c.score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {c.score}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${c.score >= 80 ? 'bg-emerald-500' : c.score >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-3 border-t border-gray-50 pt-2">
                * TODO: integrar com GET /insights/classroom/score
              </p>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ABA: PLANEJAMENTOS — accordion por turma
          ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'planejamentos' && (() => {
        const STATUS_CFG: Record<string, { label: string; cor: string; dot: string }> = {
          RASCUNHO:   { label: 'Rascunho',   cor: 'bg-gray-100 text-gray-600 border-gray-300',     dot: 'bg-gray-400'   },
          EM_REVISAO: { label: 'Em Revisão', cor: 'bg-amber-100 text-amber-700 border-amber-300',  dot: 'bg-amber-500'  },
          APROVADO:   { label: 'Aprovado',   cor: 'bg-emerald-100 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' },
          DEVOLVIDO:  { label: 'Devolvido',  cor: 'bg-rose-100 text-rose-700 border-rose-300',     dot: 'bg-rose-500'   },
          PUBLICADO:  { label: 'Publicado',  cor: 'bg-blue-100 text-blue-700 border-blue-300',     dot: 'bg-blue-500'   },
          CONCLUIDO:  { label: 'Concluído',  cor: 'bg-teal-100 text-teal-700 border-teal-300',     dot: 'bg-teal-500'   },
        };

        // Agrupar por turma
        const porTurma: Record<string, { turmaNome: string; professor: string; itens: Planejamento[] }> = {};
        for (const p of planejamentos) {
          const chave = (p as any).classroom?.id || (p as any).classroomId || p.turmaNome || 'sem-turma';
          const nome  = (p as any).classroom?.name || p.turmaNome || chave;
          const prof  = p.createdByUser
            ? `${p.createdByUser.firstName} ${p.createdByUser.lastName}`.trim()
            : p.professorNome || '—';
          if (!porTurma[chave]) porTurma[chave] = { turmaNome: nome, professor: prof, itens: [] };
          porTurma[chave].itens.push(p);
        }
        const grupos = Object.entries(porTurma);
        const pendentes = planejamentos.filter(p => ['EM_REVISAO','RASCUNHO','DEVOLVIDO'].includes(p.status || '')).length;

        return (
          <div className="space-y-3">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-bold text-gray-800">Planejamentos</p>
                <p className="text-xs text-gray-400">
                  {grupos.length} turma{grupos.length !== 1 ? 's' : ''} · {planejamentos.length} plano{planejamentos.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pendentes > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full border border-amber-200">
                    {pendentes} pendente{pendentes !== 1 ? 's' : ''}
                  </span>
                )}
                <button onClick={loadDashboard}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {planejamentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-gray-100 gap-2">
                <BookOpen className="h-10 w-10 text-gray-200" />
                <p className="text-sm text-gray-400">Nenhum planejamento encontrado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {grupos.map(([chave, grupo]) => {
                  const aberto = turmaExpandida === chave;
                  const temPendente = grupo.itens.some(p => ['EM_REVISAO','RASCUNHO','DEVOLVIDO'].includes(p.status || ''));
                  const countPendente = grupo.itens.filter(p => ['EM_REVISAO','RASCUNHO','DEVOLVIDO'].includes(p.status || '')).length;

                  return (
                    <div key={chave} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                      {/* Header */}
                      <button
                        onClick={() => setTurmaExpandida(aberto ? null : chave)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{grupo.turmaNome}</p>
                            <p className="text-xs text-gray-400 truncate">Prof. {grupo.professor}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs text-gray-400">{grupo.itens.length} plano{grupo.itens.length !== 1 ? 's' : ''}</span>
                          {temPendente && (
                            <span className="text-[11px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                              {countPendente} pendente{countPendente !== 1 ? 's' : ''}
                            </span>
                          )}
                          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${aberto ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {aberto && (
                        <div className="divide-y divide-gray-50 border-t border-gray-100">
                          {grupo.itens.map(plan => {
                            const cfg = STATUS_CFG[(plan.status || '').toUpperCase()] ?? STATUS_CFG.RASCUNHO;
                            const dataRaw = (plan as any).startDate || '';
                            const dataFmt = dataRaw
                              ? new Date(dataRaw.includes('T') ? dataRaw : `${dataRaw}T12:00:00`)
                                  .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                              : '—';
                            return (
                              <div key={plan.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{plan.title || 'Planejamento'}</p>
                                    <p className="text-xs text-gray-400">{dataFmt}</p>
                                    {plan.reviewComment && (
                                      <p className="text-xs text-rose-500 mt-0.5 truncate">💬 {plan.reviewComment}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${cfg.cor}`}>
                                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${cfg.dot}`} />
                                      {cfg.label}
                                    </span>
                                    {canApprove && ['EM_REVISAO','RASCUNHO'].includes(plan.status || '') && (
                                      <>
                                        <button
                                          onClick={() => aprovarPlanejamento(plan.id)}
                                          disabled={processando === plan.id}
                                          className="text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-semibold transition-colors disabled:opacity-50"
                                        >
                                          Aprovar
                                        </button>
                                        <button
                                          onClick={() => setItemParaRejeitar({ id: plan.id, tipo: 'plan' })}
                                          className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg font-semibold transition-colors border border-amber-200"
                                        >
                                          Devolver
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => navigate(`/app/planejamento/${plan.id}/editar`)}
                                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                                    >
                                      Ver →
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal devolução — dentro da aba planejamentos */}
            {itemParaRejeitar?.tipo === 'plan' && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
                  <h3 className="font-bold text-gray-800 mb-3">Devolver Planejamento</h3>
                  <textarea
                    rows={4}
                    value={motivoRejeicao}
                    onChange={e => setMotivoRejeicao(e.target.value)}
                    placeholder="Descreva o que precisa ser ajustado..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => { setItemParaRejeitar(null); setMotivoRejeicao(''); }}
                      className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => devolverPlanejamento(itemParaRejeitar.id, 'plan')}
                      disabled={!motivoRejeicao.trim()}
                      className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-40"
                    >
                      Devolver
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════════
          ABA: DIÁRIOS — feed de fiscalização com BNCC
          ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'diarios' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Turma</label>
                <input
                  type="text"
                  placeholder="Buscar turma..."
                  value={filtroDiarioTurma}
                  onChange={e => setFiltroDiarioTurma(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                <select
                  value={filtroDiarioStatus}
                  onChange={e => setFiltroDiarioStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="TODOS">Todos</option>
                  <option value="PUBLICADO">Publicados</option>
                  <option value="RASCUNHO">Rascunhos</option>
                  <option value="REVISADO">Revisados</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">De</label>
                <input
                  type="date"
                  value={filtroDiarioDataInicio}
                  onChange={e => setFiltroDiarioDataInicio(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Até</label>
                <input
                  type="date"
                  value={filtroDiarioDataFim}
                  onChange={e => setFiltroDiarioDataFim(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            {(filtroDiarioTurma || filtroDiarioStatus !== 'TODOS' || filtroDiarioDataInicio || filtroDiarioDataFim) && (
              <button
                onClick={() => { setFiltroDiarioTurma(''); setFiltroDiarioStatus('TODOS'); setFiltroDiarioDataInicio(''); setFiltroDiarioDataFim(''); setPaginaDiarios(1); }}
                className="mt-2 text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors"
              >
                ✕ Limpar filtros
              </button>
            )}
          </div>

          {/* Feed de diários */}
          {(() => {
            const diariosFiltrados = (diarios as any[]).filter((d: any) => {
              const turma = d.classroom?.name || d.turmaNome || '';
              const dataRaw = (d.eventDate || d.data || d.createdAt || '').substring(0, 10);
              const status = (d.status || '').toUpperCase();
              if (filtroDiarioTurma && !turma.toLowerCase().includes(filtroDiarioTurma.toLowerCase())) return false;
              if (filtroDiarioStatus !== 'TODOS') {
                const isPublicado = ['PUBLICADO','REVISADO','ARQUIVADO'].includes(status);
                if (filtroDiarioStatus === 'PUBLICADO' && !isPublicado) return false;
                if (filtroDiarioStatus === 'RASCUNHO' && status !== 'RASCUNHO') return false;
                if (filtroDiarioStatus === 'REVISADO' && status !== 'REVISADO') return false;
              }
              if (filtroDiarioDataInicio && dataRaw < filtroDiarioDataInicio) return false;
              if (filtroDiarioDataFim && dataRaw > filtroDiarioDataFim) return false;
              return true;
            });

            return diariosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-gray-100 gap-2">
                <ClipboardList className="h-10 w-10 text-gray-200" />
                <p className="text-sm text-gray-400">
                  {diarios.length === 0
                    ? 'Nenhum diário registrado neste período.'
                    : 'Nenhum diário encontrado com os filtros aplicados.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {diariosFiltrados.slice(0, paginaDiarios * ITENS_POR_PAGINA).map((diario: any) => {
                  const turma = diario.classroom?.name || diario.turmaNome || '—';
                  const professor = diario.createdByUser
                    ? `${diario.createdByUser.firstName ?? ''} ${diario.createdByUser.lastName ?? ''}`.trim()
                    : diario.professorNome || '—';
                  const dataRaw = diario.eventDate || diario.data || diario.createdAt || '';
                  const dataFmt = dataRaw
                    ? new Date(dataRaw.includes('T') ? dataRaw : `${dataRaw}T12:00:00`).toLocaleDateString('pt-BR', {
                        weekday: 'short', day: '2-digit', month: '2-digit',
                      })
                    : '—';
                  const status = (diario.status || '').toUpperCase();
                  const ctx = diario.aiContext && typeof diario.aiContext === 'object' ? diario.aiContext as any : {};
                  const publicado = ['PUBLICADO','REVISADO','ARQUIVADO'].includes(status);
                  const entrada = diario.curriculumEntry;
                  const campo = entrada?.campoDeExperiencia?.replace(/_/g, ' ') ?? null;
                  const bncc = entrada?.objetivoBNCC ?? null;
                  const curricDF = entrada?.objetivoCurriculo ?? null;
                  const intenc = entrada?.intencionalidade ?? null;
                  const codigoBNCC = entrada?.objetivoBNCCCode ?? null;
                  const conferencia = diario.conferencia;
                  const plano = diario.planning;
                  const execStatus = ctx.statusExecucaoPlano || conferencia?.status || null;
                  const EXEC_CFG: Record<string, { label: string; bg: string; text: string }> = {
                    CUMPRIDO:      { label: 'Cumprido',      bg: 'bg-emerald-50', text: 'text-emerald-700' },
                    FEITO:         { label: 'Feito',          bg: 'bg-emerald-50', text: 'text-emerald-700' },
                    PARCIAL:       { label: 'Parcial',        bg: 'bg-amber-50',   text: 'text-amber-700'   },
                    NAO_REALIZADO: { label: 'Não realizado',  bg: 'bg-rose-50',    text: 'text-rose-700'    },
                  };
                  const execCfg = execStatus ? (EXEC_CFG[execStatus] ?? null) : null;
                  const CLIMA: Record<string, string> = { OTIMO: 'Ótimo', BOM: 'Bom', REGULAR: 'Regular', AGITADO: 'Agitado', DIFICIL: 'Difícil' };
                  const metricasTurma = metricasExecucao[diario.classroomId] ?? null;
                  const [expandidoDiario, setExpandidoDiario] = React.useState(false);

                  return (
                    <div key={diario.id} className={`rounded-2xl border bg-white overflow-hidden ${publicado ? 'border-emerald-200' : 'border-amber-200'}`}>
                      {/* Cabeçalho clicável */}
                      <button
                        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50/70 transition-colors"
                        onClick={() => setExpandidoDiario(v => !v)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <StatusBadge status={diario.status || 'RASCUNHO'} />
                            {execCfg && (
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${execCfg.bg} ${execCfg.text}`}>
                                {execCfg.label}
                              </span>
                            )}
                            {campo && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                                📚 {campo}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-gray-900 truncate">{turma}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Prof. {professor}
                            {ctx.presencas != null && <span className="ml-2 text-emerald-600 font-medium">· {ctx.presencas} presentes</span>}
                            {ctx.ausencias != null && <span className="ml-1 text-rose-500 font-medium">· {ctx.ausencias} ausências</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-semibold text-gray-400">{dataFmt}</span>
                          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${expandidoDiario ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {/* Detalhe expandido */}
                      {expandidoDiario && (
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                          {ctx.momentoDestaque && (
                            <div className="bg-indigo-50 rounded-xl p-3">
                              <p className="text-[11px] font-semibold text-indigo-500 uppercase mb-1">Avaliação da prática docente</p>
                              <p className="text-sm text-indigo-800 italic">"{ctx.momentoDestaque}"</p>
                            </div>
                          )}
                          {(bncc || curricDF || intenc) && (
                            <div className="bg-violet-50 rounded-xl p-3 space-y-2">
                              <p className="text-[11px] font-bold text-violet-600 uppercase flex items-center gap-1.5">
                                📋 Matriz Curricular
                                {codigoBNCC && <span className="text-[11px] bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded font-bold">{codigoBNCC}</span>}
                              </p>
                              {campo && <p className="text-xs font-semibold text-violet-700">🎯 Campo: {campo}</p>}
                              {bncc && <p className="text-xs text-violet-800"><span className="font-semibold">BNCC:</span> {bncc}</p>}
                              {curricDF && curricDF !== bncc && <p className="text-xs text-violet-800"><span className="font-semibold">Currículo DF:</span> {curricDF}</p>}
                              {intenc && <p className="text-xs text-violet-800 italic"><span className="font-semibold not-italic">Intencionalidade:</span> {intenc}</p>}
                            </div>
                          )}
                          {plano && (
                            <div className={`rounded-xl p-3 ${execCfg ? execCfg.bg : 'bg-gray-50'}`}>
                              <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Conferência do Plano</p>
                              <p className="text-xs text-gray-700">
                                <span className="font-semibold">{plano.title}</span>
                                {execCfg && <span className={`ml-2 font-bold ${execCfg.text}`}>{execCfg.label}</span>}
                              </p>
                              {conferencia?.observacao && <p className="text-xs text-gray-500 mt-0.5">"{conferencia.observacao}"</p>}
                            </div>
                          )}
                          {metricasTurma && (
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: 'Publicados', val: `${metricasTurma.publicados}/${metricasTurma.total}` },
                                { label: 'Com BNCC', val: `${metricasTurma.comMatriz}/${metricasTurma.total}` },
                              ].map(m => (
                                <div key={m.label} className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-center">
                                  <p className="text-[10px] text-slate-400 uppercase font-semibold">{m.label}</p>
                                  <p className="text-sm font-bold text-slate-700 mt-0.5">{m.val}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => navigate(`/app/diario-calendario?classroomId=${diario.classroomId ?? diario.classroom?.id ?? ''}`)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
                            >
                              <BookOpen className="h-3.5 w-3.5" /> Ver diário completo
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {diariosFiltrados.length > paginaDiarios * ITENS_POR_PAGINA && (
                  <button
                    onClick={() => setPaginaDiarios(p => p + 1)}
                    className="w-full py-3 text-sm text-blue-600 hover:bg-blue-50 rounded-2xl border border-blue-100 font-semibold transition-colors"
                  >
                    Carregar mais ({diariosFiltrados.length - paginaDiarios * ITENS_POR_PAGINA} restantes)
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ABA: PEDAGÓGICO — sub-nav preservado do original
          ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'pedagogico' && (
        <PedagogicoSubNav
          diarios={diarios}
          turmasLista={dashboard?.turmasLista ?? []}
          cobertura={cobertura}
          loadingCobertura={loadingCobertura}
          carregarCobertura={carregarCobertura}
          setCobertura={setCobertura}
          setPendencias={setPendencias}
          navigate={navigate}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ABA: RELATÓRIOS
          ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'relatorios' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400 px-1 font-semibold uppercase tracking-wider">
            Acesso direto aos relatórios da unidade
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Diários por turma',     path: unitIdParam ? `/app/reports?unitId=${unitIdParam}` : '/app/reports',               icon: <ClipboardList className="h-5 w-5 text-blue-600" />,    bg: 'bg-blue-50',    border: 'border-blue-100'    },
              { label: 'Consumo de materiais',  path: unitIdParam ? `/app/relatorio-consumo-materiais?unitId=${unitIdParam}` : '/app/relatorio-consumo-materiais', icon: <ShoppingCart className="h-5 w-5 text-orange-600" />, bg: 'bg-orange-50',  border: 'border-orange-100'  },
              { label: 'Desenvolvimento',       path: unitIdParam ? `/app/desenvolvimento-infantil?unitId=${unitIdParam}` : '/app/desenvolvimento-infantil', icon: <Brain className="h-5 w-5 text-purple-600" />,         bg: 'bg-purple-50',  border: 'border-purple-100'  },
              { label: 'RDICs publicados',      path: '/app/rdic-geral',                                                                 icon: <FileText className="h-5 w-5 text-teal-600" />,         bg: 'bg-teal-50',    border: 'border-teal-100'    },
              { label: 'Requisições aprovadas', path: '/app/material-requests',                                                          icon: <CheckCircle className="h-5 w-5 text-emerald-600" />,   bg: 'bg-emerald-50', border: 'border-emerald-100'  },
              { label: 'Ocorrências',           path: '/app/coordenacao-pedagogica?aba=ocorrencias',                                  icon: <TriangleAlert className="h-5 w-5 text-rose-500" />,    bg: 'bg-rose-50',    border: 'border-rose-100'    },
              { label: 'Inteligência',          path: '/app/inteligencia',                                                               icon: <Brain className="h-5 w-5 text-indigo-600" />,          bg: 'bg-indigo-50',  border: 'border-indigo-100'  },
              { label: 'Alergias e Dietas',     path: '/app/painel-alergias',                                                           icon: <AlertCircle className="h-5 w-5 text-amber-600" />,     bg: 'bg-amber-50',   border: 'border-amber-100'   },
              { label: 'Atendimentos Pais',     path: '/app/atendimentos-pais',                                                         icon: <MessageCircle className="h-5 w-5 text-sky-600" />,     bg: 'bg-sky-50',     border: 'border-sky-100'     },
              { label: 'Matriz Pedagógica 2026', path: '/app/matriz-pedagogica',                                                          icon: <GraduationCap className="h-5 w-5 text-green-600" />,   bg: 'bg-green-50',   border: 'border-green-100'   },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.path)}
                className={`${item.bg} border ${item.border} rounded-2xl p-4 text-left hover:opacity-90 hover:shadow-sm transition-all group`}>
                <div className="mb-2">{item.icon}</div>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">{item.label}</p>
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 mt-1 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ABA: OCORRÊNCIAS
          ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'ocorrencias' && (
        <OcorrenciasPanel
          titulo="Ocorrências da Unidade"
          unitId={unitIdParam ?? (user as any)?.unitId ?? undefined}
        />
      )}
    </PageShell>
  );
}
