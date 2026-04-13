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
  Eye, ThumbsUp, MessageSquare, TrendingUp,
  Bell, Star, Brain, GraduationCap, Plus, RefreshCw, BarChart2,
} from 'lucide-react';
import { RecadosWidget } from '../components/recados/RecadosWidget';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { isCentral as checkIsCentral, isUnidade as checkIsUnidade } from '../api/auth';
import { useUnitScope } from '../contexts/UnitScopeContext';
import { getPedagogicalToday } from '@/utils/pedagogicalDate';
import { OcorrenciasPanel } from '../components/dashboard/OcorrenciasPanel';
import { TriangleAlert } from 'lucide-react';

const URGENCIA_CONFIG: Record<string, { label: string; cor: string; dot: string }> = {
  ALTA: { label: 'Urgente', cor: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' },
  MEDIA: { label: 'Normal', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' },
  BAIXA: { label: 'Sem pressa', cor: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500' },
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

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
  id: string; nome: string; totalAlunos: number; professor: string | null; chamadaFeita: boolean;
}
interface DashboardData {
  turmas: number; professores: number; alunosTotal: number;
  requisicoesParaAnalisar: number; planejamentosParaRevisar: number;
  diariosEstaSemana: number; taxaPresencaMedia: number; alertas: string[];
  turmasLista: TurmaResumo[];
}

// ─── Sub-componente: aba Pedagógico com sub-navegação ────────────────────────
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
      {/* Sub-navegação */}
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

      {/* Sub-aba: Diários */}
      {subAba === 'diarios' && (
        <div className="space-y-3">
          {diarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-gray-100 gap-2">
              <p className="text-sm text-gray-400">Nenhum diário registrado neste período.</p>
            </div>
          ) : (
            diarios.map((diario: any) => {
              const ctx = diario.aiContext && typeof diario.aiContext === 'object' ? diario.aiContext as any : {};
              const statusPubl = ['PUBLICADO','REVISADO','ARQUIVADO'].includes((diario.status || '').toUpperCase());
              const execLabel = ctx.statusExecucaoPlano === 'CUMPRIDO' ? '✅ Cumprido'
                : ctx.statusExecucaoPlano === 'PARCIAL' ? '⚠️ Parcial'
                : ctx.statusExecucaoPlano === 'NAO_REALIZADO' ? '❌ Não realizado' : null;
              const climaLabel = ctx.climaEmocional === 'OTIMO' ? '🌟 Ótimo'
                : ctx.climaEmocional === 'BOM' ? '😊 Bom'
                : ctx.climaEmocional === 'REGULAR' ? '😐 Regular'
                : ctx.climaEmocional === 'AGITADO' ? '😬 Agitado'
                : ctx.climaEmocional === 'DIFICIL' ? '😔 Difícil' : null;
              return (
                <div key={diario.id} className={`rounded-2xl border p-4 bg-white ${statusPubl ? 'border-emerald-100' : 'border-amber-100'}}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${statusPubl ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}}`}>
                          {statusPubl ? 'Publicado' : 'Rascunho'}
                        </span>
                        {execLabel && <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700">{execLabel}</span>}
                        {climaLabel && <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-sky-50 text-sky-700 border border-sky-200">{climaLabel}</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {diario.classroom?.name || '—'}
                        {diario.createdByUser && (
                          <span className="text-xs font-normal text-gray-400 ml-2">
                            · {diario.createdByUser.firstName} {diario.createdByUser.lastName}
                          </span>
                        )}
                      </p>
                      {ctx.presencas != null && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          👥 {ctx.presencas} presentes · {ctx.ausencias ?? 0} ausentes
                        </p>
                      )}
                      {ctx.momentoDestaque && (
                        <p className="text-xs text-gray-500 mt-1.5 italic truncate max-w-md">"{ctx.momentoDestaque}"</p>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-400 flex-shrink-0">
                      {diario.eventDate
                        ? new Date(diario.eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                        : '—'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sub-aba: Turmas */}
      {subAba === 'turmas' && (
        <div className="grid grid-cols-1 gap-3">
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
                  { label: 'Observações', path: `/app/coordenacao/observacoes?classroomId=${turma.id}`, color: 'purple' },
                  { label: 'Diários', path: `/app/diario-calendario?classroomId=${turma.id}`, color: 'blue' },
                  { label: 'Atividades', path: `/app/sala-de-aula-virtual?classroomId=${turma.id}`, color: 'indigo' },
                  { label: 'RDIC', path: `/app/rdic?classroomId=${turma.id}`, color: 'teal' },
                ].map(item => (
                  <button key={item.label} onClick={() => navigate(item.path)}
                    className={`flex flex-col items-center gap-1 p-2.5 bg-${item.color}-50 rounded-xl hover:bg-${item.color}-100 transition-all`}>
                    <span className={`text-[11px] font-medium text-${item.color}-700`}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-aba: Cobertura */}
      {subAba === 'cobertura' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Cobertura de Registros — Hoje</p>
            <button
              onClick={() => { setCobertura(null); setPendencias(null); carregarCobertura(); }}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Atualizar
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
                <div key={cls.classroomId} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-800">{cls.classroomName}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(cls.coveragePct ?? 0) >= 80 ? 'bg-emerald-100 text-emerald-700' : (cls.coveragePct ?? 0) >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                      {cls.coveragePct ?? 0}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${(cls.coveragePct ?? 0) >= 80 ? 'bg-emerald-500' : (cls.coveragePct ?? 0) >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.max(cls.coveragePct ?? 0, 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardCoordenacaoPedagogicaPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [planejamentos, setPlanejamentos] = useState<Planejamento[]>([]);
  const [diarios, setDiarios] = useState<Diario[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'inicio'|'planejamentos'|'diarios'|'observacoes'|'sala'|'relatorios'|'cobertura'|'ocorrencias'|'pedagogico'>('inicio');
  // Aba Cobertura
  interface CoberturaData {
    unitId: string; startDate: string; endDate: string;
    totalCriancas: number; totalComRegistro: number; percentualGeral: number;
    turmas: Array<{ classroomId: string; classroomName: string; totalCriancas: number; criancasComRegistro: number; percentual: number }>;
  }
  interface PendenciasData {
    totalPendentes: number;
    pendentes: Array<{ childId: string; nome: string; classroomId: string; classroomName: string }>;
  }
  const [cobertura, setCobertura] = useState<CoberturaData | null>(null);
  const [alertasReais, setAlertasReais] = useState<{
    total: number;
    criticos: any[];
    atencao: any[];
    info: any[];
  } | null>(null);
  const [resumoDiarios, setResumoDiarios] = useState<any | null>(null);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [pendencias, setPendencias] = useState<PendenciasData | null>(null);
  const [loadingCobertura, setLoadingCobertura] = useState(false);
  const apiCache = useApiCache(60_000);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // FIX P1: usar selectedUnitId do contexto global como fallback para unitIdParam
  // Isso resolve o erro 403 quando STAFF_CENTRAL acessa sem unitId no token
  const { selectedUnitId: ctxUnitId } = useUnitScope();
  const unitIdParam = searchParams.get('unitId') ?? ctxUnitId ?? undefined;
  const { user } = useAuth();
  // Coordenação Geral (STAFF_CENTRAL) = somente leitura/análise. Apenas UNIDADE pode aprovar.
  const isCentralUser = checkIsCentral(user);
  const isUnidadeUser = checkIsUnidade(user);
  const canApprove = isUnidadeUser && !isCentralUser;
  const [processando, setProcessando] = useState<string|null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [itemParaRejeitar, setItemParaRejeitar] = useState<{id:string;tipo:'req'|'plan'}|null>(null);
  const [filtroPlanStatus, setFiltroPlanStatus] = useState<string>('TODOS');
  const [planExpandido, setPlanExpandido] = useState<string|null>(null);
  const [erroPainel, setErroPainel] = useState<string | null>(null);

  // FIX P1: recarregar quando unitIdParam mudar (troca de unidade pelo seletor)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadDashboardCb = useCallback(loadDashboard, [unitIdParam]);
  useEffect(() => { loadDashboardCb(); }, [loadDashboardCb]);

  useEffect(() => {
    if (abaAtiva === 'cobertura' && !cobertura) {
      carregarCobertura();
    }
  }, [abaAtiva]);

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
      const [dashRes, reqRes, planRes, diarRes] = await Promise.allSettled([
        http.get('/coordenacao/dashboard/unidade', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/coordenacao/requisicoes', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/coordenacao/planejamentos', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/coordenacao/diarios', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
      ]);
      // Carregar alertas e resumo em paralelo (não bloqueante)
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
          // FIX D: usa totalProfessores do backend (professores únicos ativos na unidade)
          professores: ind.totalProfessores ?? professoresSet.size ?? 0,
          alunosTotal: ind.totalAlunos ?? 0,
          requisicoesParaAnalisar: ind.requisicoesPendentes ?? 0,
          planejamentosParaRevisar: (ind.planejamentosEmRevisao ?? ind.planejamentosRascunho) ?? 0,
          diariosEstaSemana: ind.diariosHoje ?? 0,
          taxaPresencaMedia: ind.totalTurmas > 0
            ? Math.round((ind.turmasComChamadaHoje / ind.totalTurmas) * 100)
            : 0,
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
              ?? (p.classroomId as string)
              ?? '—',
            templateNome: ((p.template as Record<string, unknown> | null)?.name as string) ?? undefined,
            objectives: (p.objectives as string) ?? undefined,
            reviewComment: (p.reviewComment as string) ?? undefined,
            createdByUser: (p.createdByUser as Planejamento['createdByUser']) ?? undefined,
            classroom: (p.classroom as Planejamento['classroom']) ?? undefined,
            template: (p.template as Planejamento['template']) ?? undefined,
          })));
        }
      }
      if (planRes.status === 'fulfilled') {
        const rawPlans: Record<string, unknown>[] = Array.isArray(planRes.value.data) ? planRes.value.data : [];
        setPlanejamentos(rawPlans.map((p) => {
          const user = p.createdByUser as Record<string, string> | null;
          const classroom = p.classroom as Record<string, string> | null;
          const template = p.template as Record<string, string> | null;
          return {
            id: p.id as string,
            title: (p.title as string) ?? 'Plano de Aula',
            status: (p.status as string) ?? 'RASCUNHO',
            type: (p.type as string) ?? '',
            startDate: (p.startDate as string) ?? '',
            endDate: (p.endDate as string) ?? '',
            professorNome: user ? `${user.firstName} ${user.lastName}`.trim() : (p.createdBy as string) ?? 'Professor',
            turmaNome: ((p.porTurma as Record<string, unknown> | null)?.turmaNome as string)
              ?? ((p.grupo as Record<string, unknown> | null)?.turmaNome as string)
              ?? classroom?.name
              ?? (p.classroomId as string)
              ?? '—',
            templateNome: template?.name ?? undefined,
            objectives: (p.objectives as string) ?? undefined,
            reviewComment: (p.reviewComment as string) ?? undefined,
            createdByUser: user as Planejamento['createdByUser'],
            classroom: classroom as Planejamento['classroom'],
            template: template as Planejamento['template'],
          };
        }));
      }
      if (diarRes.status === 'fulfilled') {
        const rawDiarios: any[] = Array.isArray(diarRes.value.data) ? diarRes.value.data : [];
        setDiarios(rawDiarios.map((d: any) => ({
          id: d.id,
          titulo: d.title ?? 'Diário de Bordo',
          status: d.status ?? 'RASCUNHO',
          climaEmocional: d.climaEmocional ?? d.aiContext?.climaEmocional ?? null,
          presencas: d.presencas ?? d.aiContext?.presencas ?? null,
          ausencias: d.ausencias ?? d.aiContext?.ausencias ?? null,
          momentoDestaque: d.momentoDestaque ?? d.aiContext?.momentoDestaque ?? null,
          statusExecucaoPlano: d.aiContext?.statusExecucaoPlano ?? null,
          camposBNCC: d.aiContext?.planejamentoObjetivos
            ? (d.aiContext.planejamentoObjetivos as any[]).map((o: any) => o.campoExperiencia).filter(Boolean)
            : [],
          data: d.eventDate ? d.eventDate.slice(0, 10) : d.createdAt?.slice(0, 10) ?? '',
          professorNome: d.createdByUser
            ? `${d.createdByUser.firstName} ${d.createdByUser.lastName}`.trim()
            : d.createdBy ?? 'Professor',
          turmaNome: d.classroom?.name ?? d.classroomId ?? '—',
        })));
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Erro desconhecido';
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
      // Usa o endpoint dedicado de devolução com comentário obrigatório
      await http.post(`/plannings/${id}/devolver`, { comment: motivo });
      toast.success('Planejamento devolvido com observações');
      setPlanejamentos(prev => prev.filter(p => p.id !== id));
      setItemParaRejeitar(null); setMotivoRejeicao('');
    } catch { toast.error('Erro ao devolver'); }
    finally { setProcessando(null); }
  }

  if (loading) return <LoadingState message="Carregando painel de coordenação..." />;
  // FIX P1: mostrar mensagem de erro clara quando o painel não carregou
  if (erroPainel && !dashboard) return (
    <PageShell title="Painel da Coordenação Pedagógica" subtitle="">
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center">
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

  const totalPendencias = (dashboard?.requisicoesParaAnalisar ?? 0) + (dashboard?.planejamentosParaRevisar ?? 0);

  const abas = [
    { id: 'inicio',        label: 'Início',       icon: <Star className="h-4 w-4" /> },
    { id: 'pedagogico',    label: 'Pedagógico',   icon: <Brain className="h-4 w-4" />, badge: dashboard?.diariosEstaSemana },
    { id: 'planejamentos', label: 'Planejamentos', icon: <BookOpen className="h-4 w-4" />, badge: dashboard?.planejamentosParaRevisar },
    { id: 'relatorios',    label: 'Relatórios',   icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'ocorrencias',   label: 'Ocorrências',  icon: <TriangleAlert className="h-4 w-4" /> },
  ] as const;

  return (
    <PageShell
      title={`Painel da Coordenação Pedagógica`}
      subtitle={`Bem-vindo, ${((user?.nome as string) || '').split(' ')[0] || 'Coordenador(a)'}! Acompanhe e apoie o trabalho dos professores.`}
    >
      {/* Modal motivo rejeição */}
      {itemParaRejeitar && canApprove && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-lg mb-2">Devolver com orientação</h3>
            <p className="text-sm text-gray-500 mb-4">Escreva uma orientação para o professor:</p>
            <textarea className="w-full border-2 rounded-xl p-3 text-sm resize-none mb-4" rows={4}
              placeholder="Ex: Por favor, detalhe melhor os objetivos..."
              value={motivoRejeicao} onChange={e => setMotivoRejeicao(e.target.value)} />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl"
                onClick={() => { setItemParaRejeitar(null); setMotivoRejeicao(''); }}>Cancelar</Button>
              <Button className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
                onClick={() => {
                  if (!motivoRejeicao.trim()) { toast.error('Escreva uma orientação'); return; }
                  devolverPlanejamento(itemParaRejeitar.id, motivoRejeicao);
                }}>Devolver</Button>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de pendências */}
      {totalPendencias > 0 && (
        <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex items-center gap-3">
          <Bell className="h-6 w-6 text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-orange-800">{totalPendencias} {totalPendencias === 1 ? 'item precisa' : 'itens precisam'} da sua atenção</p>
            <p className="text-sm text-orange-600">
              {(dashboard?.requisicoesParaAnalisar ?? 0) > 0 ? `${dashboard?.requisicoesParaAnalisar} pedido(s) de material · ` : ''}
              {(dashboard?.planejamentosParaRevisar ?? 0) > 0 ? `${dashboard?.planejamentosParaRevisar} planejamento(s) para revisar` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Banner modo leitura para Coordenação Geral */}
      {isCentralUser && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
          <Eye className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Modo Análise — Coordenação Geral</p>
            <p className="text-xs text-blue-600">Você está visualizando dados desta unidade. Aprovações são responsabilidade da Coordenação da Unidade.</p>
          </div>
        </div>
      )}
      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {abas.map(aba => (
          <button
            key={aba.id}
            onClick={() => {
              if ((aba.id as string) === 'requisicoes') {
                navigate(unitIdParam ? `/app/material-requests?unitId=${unitIdParam}` : '/app/material-requests');
                return;
              }
              setAbaAtiva(aba.id as any);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              abaAtiva === aba.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {aba.icon}{aba.label}
            {(aba as any).badge > 0 && (
              <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {(aba as any).badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ABA: HOJE */}
      {abaAtiva === 'inicio' && (
        <div className="space-y-5">

          {/* Alertas automáticos calculados no dashboard (fallback) */}
          {!loadingAlertas && (!alertasReais || alertasReais.total === 0) && dashboard?.alertas && (dashboard.alertas as any[]).length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Atenção hoje
              </p>
              <ul className="space-y-1">
                {(dashboard.alertas as any[]).map((a: any, i: number) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                    {typeof a === 'string' ? a : (a.mensagem ?? JSON.stringify(a))}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* KPIs do dia */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Users className="h-5 w-5 text-blue-600"/>,          bg: 'bg-blue-50',   val: dashboard?.turmas ?? 0,                                          label: 'Turmas' },
              { icon: <Star className="h-5 w-5 text-purple-600"/>,         bg: 'bg-purple-50', val: dashboard?.professores ?? 0,                                     label: 'Professores' },
              { icon: <TrendingUp className="h-5 w-5 text-green-600"/>,    bg: 'bg-green-50',  val: dashboard?.taxaPresencaMedia ? `${dashboard.taxaPresencaMedia}%` : '--', label: 'Presença hoje' },
              { icon: <ClipboardList className="h-5 w-5 text-orange-600"/>,bg: 'bg-orange-50', val: dashboard?.diariosEstaSemana ?? 0,                               label: 'Diários esta semana' },
            ].map((c, i) => (
              <div key={i} className={`${c.bg} rounded-2xl border p-4 text-center`}>
                <div className="flex justify-center mb-2">{c.icon}</div>
                <p className="text-2xl font-bold text-gray-800">{c.val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          {loadingAlertas && (
            <Card className="rounded-2xl border-2 border-blue-200 bg-blue-50">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-blue-800"><AlertCircle className="h-5 w-5"/>Atualizando alertas</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700">Carregando alertas da unidade e resumo de diários...</p>
              </CardContent>
            </Card>
          )}

          {/* Alertas reais do banco */}
          {alertasReais && alertasReais.total > 0 && (
            <div className="space-y-2">
              {alertasReais.criticos.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {alertasReais.criticos.length} alerta{alertasReais.criticos.length > 1 ? 's' : ''} crítico{alertasReais.criticos.length > 1 ? 's' : ''}
                  </p>
                  <ul className="space-y-1">
                    {alertasReais.criticos.map((a: any) => (
                      <li key={a.id} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                        <span><strong>{a.titulo}</strong> — {a.descricao}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {alertasReais.atencao.length > 0 && (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {alertasReais.atencao.length} atenção
                  </p>
                  <ul className="space-y-1">
                    {alertasReais.atencao.map((a: any) => (
                      <li key={a.id} className="text-sm text-orange-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
                        {a.titulo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Status das turmas hoje */}
          {(dashboard?.turmasLista ?? []).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-800">Status das Turmas — Hoje</p>
                <button
                  onClick={() => setAbaAtiva('pedagogico')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver pedagógico →
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {(dashboard.turmasLista ?? []).map(turma => (
                  <div key={turma.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{turma.nome}</p>
                        <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor || 'Sem professor'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        turma.chamadaFeita ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {turma.chamadaFeita ? '✓ Chamada' : '⏳ Pendente'}
                      </span>
                      <button
                        onClick={() => navigate(`/app/turma/${turma.id}/painel`)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Painel →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações pendentes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(dashboard?.planejamentosParaRevisar ?? 0) > 0 && (
              <button
                onClick={() => setAbaAtiva('planejamentos')}
                className="flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-left hover:bg-amber-100 transition-all"
              >
                <span className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {dashboard?.planejamentosParaRevisar}
                </span>
                <div>
                  <p className="text-sm font-bold text-amber-800">Planejamentos</p>
                  <p className="text-xs text-amber-600">aguardando revisão</p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-500 ml-auto" />
              </button>
            )}
            {(dashboard?.requisicoesParaAnalisar ?? 0) > 0 && (
              <button
                onClick={() => navigate(unitIdParam ? `/app/material-requests?unitId=${unitIdParam}` : '/app/material-requests')}
                className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-left hover:bg-red-100 transition-all"
              >
                <span className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {dashboard?.requisicoesParaAnalisar}
                </span>
                <div>
                  <p className="text-sm font-bold text-red-800">Pedidos de material</p>
                  <p className="text-xs text-red-600">{canApprove ? 'aguardando aprovação' : 'para visualizar e analisar'}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-red-500 ml-auto" />
              </button>
            )}
            <button
              onClick={() => setAbaAtiva('pedagogico')}
              className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl text-left hover:bg-blue-100 transition-all"
            >
              <span className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-blue-800">Pedagógico</p>
                <p className="text-xs text-blue-600">{dashboard?.diariosEstaSemana ?? 0} diários esta semana</p>
                {resumoDiarios && (
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {resumoDiarios.climaEmocional?.BOM > 0 && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        Bom: {resumoDiarios.climaEmocional.BOM}
                      </span>
                    )}
                    {resumoDiarios.execucaoPlano?.CUMPRIDO > 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                        Cumpridos: {resumoDiarios.execucaoPlano.CUMPRIDO}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-blue-500 ml-auto flex-shrink-0" />
            </button>
          </div>

          {/* Recados */}
          <RecadosWidget unitId={unitIdParam} />
        </div>
      )}

      {/* ABA: PLANEJAMENTOS */}
      {abaAtiva === 'planejamentos' && (() => {
        const STATUS_PLAN_CONFIG: Record<string, { label: string; cor: string; dot: string }> = {
          RASCUNHO:   { label: 'Rascunho',    cor: 'bg-gray-100 text-gray-600 border-gray-300',    dot: 'bg-gray-400' },
          EM_REVISAO: { label: 'Em Revisão', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' },
          APROVADO:   { label: 'Aprovado',    cor: 'bg-green-100 text-green-700 border-green-300',  dot: 'bg-green-500' },
          DEVOLVIDO:  { label: 'Devolvido',   cor: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
          PUBLICADO:  { label: 'Publicado',   cor: 'bg-blue-100 text-blue-700 border-blue-300',     dot: 'bg-blue-500' },
          CONCLUIDO:  { label: 'Concluído',   cor: 'bg-purple-100 text-purple-700 border-purple-300', dot: 'bg-purple-500' },
        };
        const TIPO_PLAN: Record<string, string> = {
          SEMANAL: 'Semanal', QUINZENAL: 'Quinzenal', MENSAL: 'Mensal', ANUAL: 'Anual',
        };
        const plansFiltrados = filtroPlanStatus === 'TODOS'
          ? planejamentos
          : planejamentos.filter(p => p.status === filtroPlanStatus);
        const countPorStatus = planejamentos.reduce<Record<string, number>>((acc, p) => {
          acc[p.status] = (acc[p.status] ?? 0) + 1;
          return acc;
        }, {});
        const ordemStatus: Record<string, number> = {
          EM_REVISAO: 0,
          DEVOLVIDO: 1,
          RASCUNHO: 2,
          APROVADO: 3,
          PUBLICADO: 4,
          CONCLUIDO: 5,
        };
        const gruposPlanejamento = Object.values(
          plansFiltrados.reduce<Record<string, {
            turmaNome: string;
            professores: string[];
            itens: Planejamento[];
            statusResumo: Record<string, number>;
          }>>((acc, plan) => {
            const turmaNome = plan.turmaNome?.trim() || 'Sem turma';
            const professorNome = plan.professorNome?.trim() || 'Professor não informado';
            const chaveGrupo = turmaNome.toLocaleLowerCase('pt-BR');

            if (!acc[chaveGrupo]) {
              acc[chaveGrupo] = {
                turmaNome,
                professores: [],
                itens: [],
                statusResumo: {},
              };
            }

            if (!acc[chaveGrupo].professores.includes(professorNome)) {
              acc[chaveGrupo].professores.push(professorNome);
            }

            acc[chaveGrupo].itens.push(plan);
            acc[chaveGrupo].statusResumo[plan.status] = (acc[chaveGrupo].statusResumo[plan.status] ?? 0) + 1;
            return acc;
          }, {})
        )
          .map(grupo => ({
            ...grupo,
            professores: [...grupo.professores].sort((a, b) => a.localeCompare(b, 'pt-BR')),
            itens: [...grupo.itens].sort((a, b) => {
              const diffStatus = (ordemStatus[a.status] ?? 99) - (ordemStatus[b.status] ?? 99);
              if (diffStatus !== 0) return diffStatus;

              const dataA = a.startDate ? new Date(a.startDate).getTime() : 0;
              const dataB = b.startDate ? new Date(b.startDate).getTime() : 0;
              if (dataA !== dataB) return dataB - dataA;

              return a.title.localeCompare(b.title, 'pt-BR');
            }),
          }))
          .sort((a, b) => a.turmaNome.localeCompare(b.turmaNome, 'pt-BR'));
        return (
          <div className="space-y-4">
            {/* Filtros por status */}
            <div className="flex flex-wrap gap-2">
              {(['TODOS', 'EM_REVISAO', 'RASCUNHO', 'DEVOLVIDO', 'APROVADO'] as const).map(s => (
                <button key={s} onClick={() => setFiltroPlanStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    filtroPlanStatus === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}>
                  {s === 'TODOS' ? `Todos (${planejamentos.length})` : `${STATUS_PLAN_CONFIG[s]?.label ?? s} (${countPorStatus[s] ?? 0})`}
                </button>
              ))}
              <button onClick={() => loadDashboard()}
                className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-300 bg-white text-gray-600 hover:border-blue-400 flex items-center gap-1">
                <RefreshCw className="h-3 w-3"/>Atualizar
              </button>
            </div>

            {plansFiltrados.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-200"/>
                <p className="text-xl font-bold text-gray-400">Nenhum planejamento encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Os planejamentos criados pelos professores aparecerão aqui</p>
              </div>
            ) : gruposPlanejamento.map(grupo => (
              <div key={grupo.turmaNome} className="space-y-3 rounded-3xl border border-blue-100 bg-gradient-to-br from-slate-50 via-white to-blue-50/70 p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-gray-800 truncate">{grupo.turmaNome}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {grupo.professores.length === 1
                          ? `Prof. ${grupo.professores[0]}`
                          : grupo.professores.length > 1
                            ? `${grupo.professores.length} professores vinculados`
                            : 'Professor não informado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {grupo.itens.length} planejamento{grupo.itens.length !== 1 ? 's' : ''}
                    </span>
                    {Object.entries(grupo.statusResumo)
                      .sort(([statusA], [statusB]) => (ordemStatus[statusA] ?? 99) - (ordemStatus[statusB] ?? 99))
                      .map(([status, quantidade]) => {
                        const statusConfig = STATUS_PLAN_CONFIG[status] ?? STATUS_PLAN_CONFIG.RASCUNHO;
                        return (
                          <span key={status} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusConfig.cor}`}>
                            {quantidade} {statusConfig.label}
                          </span>
                        );
                      })}
                  </div>
                </div>
                {grupo.itens.map(plan => {
                  const cfg = STATUS_PLAN_CONFIG[plan.status] ?? STATUS_PLAN_CONFIG.RASCUNHO;
                  const dataInicio = plan.startDate ? new Date(plan.startDate).toLocaleDateString('pt-BR') : '—';
                  const dataFim = plan.endDate ? new Date(plan.endDate).toLocaleDateString('pt-BR') : '—';
                  const expandido = planExpandido === plan.id;

                  return (
                    <Card key={plan.id} className={`rounded-2xl border-2 transition-all ${
                      plan.status === 'EM_REVISAO' ? 'border-yellow-300 shadow-yellow-100 shadow-md' :
                      plan.status === 'DEVOLVIDO' ? 'border-orange-300' :
                      plan.status === 'APROVADO' ? 'border-green-300' : 'border-gray-200'
                    }`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800 truncate">{plan.title}</p>
                            <p className="text-sm text-gray-600 font-medium">{plan.professorNome}</p>
                            <p className="text-xs text-gray-500">
                              {plan.templateNome ? <span className="text-blue-600">{plan.templateNome}</span> : 'Planejamento da turma'}
                              {plan.type && <span className="ml-1">· {TIPO_PLAN[plan.type] ?? plan.type}</span>}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{dataInicio} → {dataFim}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className={`px-2 py-1 text-xs rounded-full font-semibold border ${cfg.cor}`}>
                              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${cfg.dot}`}/>{cfg.label}
                            </span>
                            <button
                              onClick={() => setPlanExpandido(expandido ? null : plan.id)}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3"/>{expandido ? 'Fechar' : 'Ver detalhes'}
                            </button>
                          </div>
                        </div>

                        {expandido && (
                          <div className="space-y-2 border-t pt-3">
                            {plan.objectives && (() => {
                              let objetivos: any[] = [];
                              try {
                                const parsed = JSON.parse(plan.objectives as string);
                                objetivos = Array.isArray(parsed) ? parsed : [];
                              } catch {
                                objetivos = [];
                              }

                              if (objetivos.length === 0) {
                                return (
                                  <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-500 font-medium mb-1">Objetivos:</p>
                                    <p className="text-sm text-gray-700">{plan.objectives}</p>
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-2">
                                  <p className="text-xs text-gray-500 font-medium">Objetivos da Matriz:</p>
                                  {objetivos.map((obj: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                      {obj.codigoBNCC && (
                                        <span className="inline-block text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded mb-1">
                                          {obj.codigoBNCC}
                                        </span>
                                      )}
                                      {obj.objetivoBNCC && (
                                        <p className="text-sm text-gray-700">{obj.objetivoBNCC}</p>
                                      )}
                                      {obj.objetivoCurriculoDF && obj.objetivoCurriculoDF !== obj.objetivoBNCC && (
                                        <div className="mt-1">
                                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Objetivo do Currículo — DF</p>
                                          <p className="text-xs text-gray-600">{obj.objetivoCurriculoDF}</p>
                                        </div>
                                      )}
                                      {obj.intencionalidadePedagogica && (
                                        <div className="mt-1.5 bg-indigo-50 border border-indigo-100 rounded p-1.5">
                                          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-0.5">🎯 Intencionalidade Pedagógica</p>
                                          <p className="text-xs text-indigo-800">{obj.intencionalidadePedagogica}</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                            {plan.reviewComment && (
                              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                                <p className="text-xs text-orange-600 font-medium mb-1">Observação de devolução:</p>
                                <p className="text-sm text-orange-800">{plan.reviewComment}</p>
                              </div>
                            )}
                            <button
                              onClick={() => navigate(`/app/planejamentos/${plan.id}`)}
                              className="w-full py-2 text-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 font-medium flex items-center justify-center gap-2"
                            >
                              <Eye className="h-4 w-4"/>Abrir plano de aula completo
                            </button>
                          </div>
                        )}

                        {plan.status === 'EM_REVISAO' && canApprove && (
                          <div className="flex gap-3 pt-1">
                            <Button
                              onClick={() => aprovarPlanejamento(plan.id)}
                              disabled={processando === plan.id}
                              className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 font-bold text-sm"
                            >
                              <ThumbsUp className="h-4 w-4 mr-1.5"/>Aprovar
                            </Button>
                            <Button
                              onClick={() => setItemParaRejeitar({ id: plan.id, tipo: 'plan' })}
                              disabled={processando === plan.id}
                              variant="outline"
                              className="flex-1 h-10 rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50 font-bold text-sm"
                            >
                              <MessageSquare className="h-4 w-4 mr-1.5"/>Devolver
                            </Button>
                          </div>
                        )}
                        {plan.status === 'EM_REVISAO' && !canApprove && (
                          <div className="pt-1 p-2 bg-blue-50 rounded-xl">
                            <p className="text-xs text-blue-600 text-center">Aguardando aprovação da Coordenação da Unidade</p>
                          </div>
                        )}
                        {plan.status === 'DEVOLVIDO' && (
                          <div className="p-2 bg-orange-50 rounded-xl">
                            <p className="text-xs text-orange-600 font-medium text-center">Aguardando correções do professor</p>
                          </div>
                        )}
                        {plan.status === 'APROVADO' && (
                          <div className="p-2 bg-green-50 rounded-xl">
                            <p className="text-xs text-green-600 font-medium text-center flex items-center justify-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5"/>Planejamento aprovado
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })()}


      {/* ══════════════════════════════════════════════════════════════════
          ABA: PEDAGÓGICO (diários + turmas + cobertura)
      ══════════════════════════════════════════════════════════════════ */}
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

      {/* ABA: DIÁRIOS */}
      {abaAtiva === 'diarios' && (
        <div className="space-y-4">
          {/* Header com resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(() => {
              const publicados = diarios.filter(d => ['PUBLICADO','REVISADO','ARQUIVADO'].includes((d.status||'').toUpperCase())).length;
              const rascunhos = diarios.filter(d => (d.status||'').toUpperCase() === 'RASCUNHO').length;
              const comExecucao = diarios.filter(d => d.statusExecucaoPlano === 'CUMPRIDO').length;
              const presencaMedia = diarios.filter(d => d.presencas != null).reduce((acc, d, _, arr) => {
                const total = (d.presencas ?? 0) + (d.ausencias ?? 0);
                return total > 0 ? acc + ((d.presencas ?? 0) / total) * 100 / arr.length : acc;
              }, 0);
              return (
                <>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{publicados}</p>
                    <p className="text-xs text-emerald-600 mt-0.5 font-medium">Publicados</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">{rascunhos}</p>
                    <p className="text-xs text-amber-600 mt-0.5 font-medium">Rascunhos</p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{comExecucao}</p>
                    <p className="text-xs text-blue-600 mt-0.5 font-medium">Plano cumprido</p>
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3 text-center">
                    <p className="text-2xl font-bold text-violet-700">{presencaMedia > 0 ? `${Math.round(presencaMedia)}%` : '—'}</p>
                    <p className="text-xs text-violet-600 mt-0.5 font-medium">Presença média</p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Lista de diários */}
          {diarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-gray-100 gap-2">
              <ClipboardList className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400 font-medium">Nenhum diário registrado neste período.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {diarios.map(diario => {
                const statusExec = diario.statusExecucaoPlano;
                const execLabel = statusExec === 'CUMPRIDO' ? 'Cumprido'
                  : statusExec === 'PARCIAL' ? 'Parcial'
                  : statusExec === 'NAO_REALIZADO' ? 'Não realizado'
                  : null;
                const execCor = statusExec === 'CUMPRIDO' ? 'bg-emerald-100 text-emerald-700'
                  : statusExec === 'PARCIAL' ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-600';
                const statusPubl = ['PUBLICADO','REVISADO','ARQUIVADO'].includes((diario.status||'').toUpperCase());

                return (
                  <div
                    key={diario.id}
                    className={`rounded-2xl border p-4 bg-white transition-all ${statusPubl ? 'border-emerald-100 hover:border-emerald-200' : 'border-amber-100 hover:border-amber-200'}`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${statusPubl ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {statusPubl ? 'Publicado' : 'Rascunho'}
                          </span>
                          {execLabel && (
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${execCor}`}>
                              📋 {execLabel}
                            </span>
                          )}
                          {diario.climaEmocional && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                              {diario.climaEmocional === 'OTIMO' ? '🌟 Ótimo' : diario.climaEmocional === 'BOM' ? '😊 Bom' : diario.climaEmocional === 'REGULAR' ? '😐 Regular' : diario.climaEmocional === 'AGITADO' ? '😬 Agitado' : '😔 Difícil'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-800 truncate">{diario.titulo || diario.turmaNome}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {diario.professorNome} · {diario.turmaNome}
                          {diario.presencas != null && (
                            <span className="ml-2 text-emerald-600 font-medium">👥 {diario.presencas} presentes</span>
                          )}
                        </p>
                        {diario.momentoDestaque && (
                          <p className="text-xs text-gray-500 mt-1.5 italic truncate max-w-md">"{diario.momentoDestaque}"</p>
                        )}
                        {(diario.camposBNCC ?? []).length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {(diario.camposBNCC ?? []).slice(0, 3).map((c, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-600">
                          {diario.data ? new Date(diario.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* ABA: OBSERVAÇÕES INDIVIDUAIS */}
      {abaAtiva === 'observacoes' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
            <p className="text-sm text-teal-700">
              Visualize as observações individuais registradas pelos professores para cada aluno.
              Você pode filtrar por turma, aluno ou categoria.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {dashboard?.turmasLista?.map(turma => (
              <button key={turma.id}
                onClick={() => navigate(`/app/coordenacao/observacoes?classroomId=${turma.id}`)}
                className="p-4 bg-white border-2 border-teal-100 rounded-2xl text-left hover:border-teal-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                    <Brain className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{turma.nome}</p>
                    <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ABA: SALA DE AULA VIRTUAL */}
      {abaAtiva === 'sala' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <p className="text-sm text-indigo-700">
              Acompanhe as atividades e tarefas publicadas pelos professores na Sala de Aula Virtual.
              Visualize o desempenho individual de cada aluno por atividade.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {dashboard?.turmasLista?.map(turma => (
              <button key={turma.id}
                onClick={() => navigate(`/app/sala-de-aula-virtual?classroomId=${turma.id}`)}
                className="p-4 bg-white border-2 border-indigo-100 rounded-2xl text-left hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{turma.nome}</p>
                    <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ABA: RELATÓRIOS */}
      {abaAtiva === 'relatorios' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-teal-800 mb-1">Relatórios de Desenvolvimento por Turma</p>
            <p className="text-sm text-teal-700">
              Selecione uma turma para visualizar o relatório consolidado de desenvolvimento, evolução e observações individuais de cada aluno.
            </p>
          </div>

          {/* Acesso rápido por turma */}
          <div className="grid grid-cols-1 gap-3">
            {dashboard?.turmasLista?.map(turma => (
              <div key={turma.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-teal-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                      <Users className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{turma.nome}</p>
                      <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    turma.chamadaFeita ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {turma.chamadaFeita ? '✅ Chamada feita' : '⏳ Chamada pendente'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => navigate(`/app/coordenacao/observacoes?classroomId=${turma.id}`)}
                    className="flex flex-col items-center gap-1 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-all">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">Observações</span>
                  </button>
                  <button
                    onClick={() => navigate(`/app/sala-de-aula-virtual?classroomId=${turma.id}`)}
                    className="flex flex-col items-center gap-1 p-3 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all">
                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-700">Atividades</span>
                  </button>
                  <button
                    onClick={() => navigate(`/app/rdic?classroomId=${turma.id}`)}
                    className="flex flex-col items-center gap-1 p-3 bg-teal-50 rounded-xl hover:bg-teal-100 transition-all">
                    <ClipboardList className="h-5 w-5 text-teal-600" />
                    <span className="text-xs font-medium text-teal-700">RDICs</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Atalhos de relatórios gerais */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate(unitIdParam ? `/app/reports?unitId=${unitIdParam}` : '/app/reports')}
              className="p-4 bg-white border-2 border-blue-100 rounded-2xl text-left hover:border-blue-300 hover:shadow-sm transition-all">
              <TrendingUp className="h-6 w-6 text-blue-600 mb-2" />
              <p className="font-semibold text-sm text-gray-800">Relatório de Diários</p>
              <p className="text-xs text-gray-400">Por turma e período</p>
            </button>
            <button
              onClick={() => navigate(unitIdParam ? `/app/relatorio-consumo-materiais?unitId=${unitIdParam}` : '/app/relatorio-consumo-materiais')}
              className="p-4 bg-white border-2 border-orange-100 rounded-2xl text-left hover:border-orange-300 hover:shadow-sm transition-all">
              <ShoppingCart className="h-6 w-6 text-orange-600 mb-2" />
              <p className="font-semibold text-sm text-gray-800">Consumo de Materiais</p>
              <p className="text-xs text-gray-400">Pedidos e gastos</p>
            </button>
            <button
              onClick={() => navigate(unitIdParam ? `/app/desenvolvimento-infantil?unitId=${unitIdParam}` : '/app/desenvolvimento-infantil')}
              className="p-4 bg-white border-2 border-purple-100 rounded-2xl text-left hover:border-purple-300 hover:shadow-sm transition-all">
              <Brain className="h-6 w-6 text-purple-600 mb-2" />
              <p className="font-semibold text-sm text-gray-800">Desenvolvimento Infantil</p>
              <p className="text-xs text-gray-400">Observações individuais</p>
            </button>
            <button
              onClick={() => navigate('/app/rdic-geral')}
              className="p-4 bg-white border-2 border-teal-100 rounded-2xl text-left hover:border-teal-300 hover:shadow-sm transition-all">
              <ClipboardList className="h-6 w-6 text-teal-600 mb-2" />
              <p className="font-semibold text-sm text-gray-800">RDICs Publicados</p>
              <p className="text-xs text-gray-400">Relatórios individuais</p>
            </button>
          </div>
        </div>
      )}

      {/* ABA: COBERTURA DE REGISTROS */}
      {abaAtiva === 'cobertura' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-700">Cobertura de Registros — Hoje</h2>
              <p className="text-xs text-gray-400 mt-0.5">Crianças com pelo menos 1 DiaryEvent registrado hoje</p>
            </div>
            <button
              onClick={() => { setCobertura(null); setPendencias(null); carregarCobertura(); }}
              className="text-gray-400 hover:text-gray-600 p-1 rounded" title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loadingCobertura ? (
            <div className="text-center py-10 text-gray-400 text-sm">Carregando cobertura...</div>
          ) : (
            <>
              {/* Indicadores da Unidade */}
              {cobertura && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{cobertura.totalComRegistro}</p>
                    <p className="text-xs text-blue-500 mt-1">Com registro hoje</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-700">{cobertura.totalCriancas}</p>
                    <p className="text-xs text-gray-500 mt-1">Total de crianças</p>
                  </div>
                  <div className={`border rounded-xl p-4 text-center ${
                    cobertura.percentualGeral >= 80 ? 'bg-green-50 border-green-200' :
                    cobertura.percentualGeral >= 50 ? 'bg-yellow-50 border-yellow-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <p className={`text-2xl font-bold ${
                      cobertura.percentualGeral >= 80 ? 'text-green-700' :
                      cobertura.percentualGeral >= 50 ? 'text-yellow-700' : 'text-red-700'
                    }`}>{cobertura.percentualGeral}%</p>
                    <p className="text-xs text-gray-500 mt-1">Cobertura geral</p>
                  </div>
                </div>
              )}

              {/* Barra de cobertura global */}
              {cobertura && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Cobertura da unidade hoje</span>
                    <span className="text-sm font-bold text-gray-600">{cobertura.percentualGeral}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ${
                        cobertura.percentualGeral >= 80 ? 'bg-green-500' :
                        cobertura.percentualGeral >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${cobertura.percentualGeral}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Por turma */}
              {cobertura && cobertura.turmas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Por turma</p>
                  {cobertura.turmas.map(t => (
                    <div key={t.classroomId} className="bg-white border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-gray-800">{t.classroomName}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          t.percentual >= 80 ? 'bg-green-100 text-green-700' :
                          t.percentual >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{t.criancasComRegistro}/{t.totalCriancas} · {t.percentual}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            t.percentual >= 80 ? 'bg-green-500' :
                            t.percentual >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${t.percentual}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pendências */}
              {pendencias && pendencias.totalPendentes > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <p className="text-sm font-semibold text-orange-700">
                      {pendencias.totalPendentes} {pendencias.totalPendentes === 1 ? 'criança sem' : 'crianças sem'} registro hoje
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {pendencias.pendentes.map(p => (
                      <div key={p.childId} className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                        <div className="w-7 h-7 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 text-xs font-bold flex-shrink-0">
                          {p.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{p.nome}</p>
                          <p className="text-xs text-gray-400">{p.classroomName}</p>
                        </div>
                        <span className="text-xs text-orange-500 font-medium">Sem registro</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendencias && pendencias.totalPendentes === 0 && (
                <div className="text-center py-8 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-green-700">Todas as crianças têm registro hoje!</p>
                  <p className="text-xs text-green-500 mt-1">Cobertura completa</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Aba Ocorrências */}
      {abaAtiva === 'ocorrencias' && (
        <div className="space-y-4">
          <OcorrenciasPanel titulo="Ocorrências da Unidade" unitId={unitIdParam} />
        </div>
      )}

      {/* Widget de Recados */}
      {abaAtiva === 'inicio' && (
        <RecadosWidget
          titulo="Recados para Professoras"
          podeEnviar={true}
          unitId={undefined}
          turmas={dashboard?.turmasLista?.map(t => ({ id: t.id, name: t.nome })) ?? []}
        />
      )}
    </PageShell>
  );
}
