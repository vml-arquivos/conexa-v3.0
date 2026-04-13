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
  const [turmaExpandida, setTurmaExpandida] = useState<string | null>(null);
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
              { icon: <TrendingUp className="h-5 w-5 text-green-600"/>,    bg: 'bg-green-50',  val: dashboard?.taxaPresencaMedia ? `${dashboard.taxaPresencaMedia}%` : '--', label: 'Chamadas hoje' },
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

      {/* ABA: PLANEJAMENTOS — compacto por turma */}
      {abaAtiva === 'planejamentos' && (() => {
        const STATUS_CFG: Record<string, { label: string; cor: string; dot: string }> = {
          RASCUNHO:   { label: 'Rascunho',   cor: 'bg-gray-100 text-gray-600 border-gray-300',      dot: 'bg-gray-400'   },
          EM_REVISAO: { label: 'Em Revisão', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' },
          APROVADO:   { label: 'Aprovado',   cor: 'bg-green-100 text-green-700 border-green-300',   dot: 'bg-green-500'  },
          DEVOLVIDO:  { label: 'Devolvido',  cor: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
          PUBLICADO:  { label: 'Publicado',  cor: 'bg-blue-100 text-blue-700 border-blue-300',      dot: 'bg-blue-500'   },
          CONCLUIDO:  { label: 'Concluído',  cor: 'bg-purple-100 text-purple-700 border-purple-300', dot: 'bg-purple-500' },
        };

        // Agrupar por turma
        const porTurma: Record<string, {
          turmaNome: string; professor: string;
          itens: typeof planejamentos;
        }> = {};
        for (const p of planejamentos) {
          const chave = (p as any).classroom?.id || (p as any).classroomId || p.turmaNome || 'sem-turma';
          const nome  = (p as any).classroom?.name || p.turmaNome || chave;
          const prof  = (p as any).createdByUser
            ? `${(p as any).createdByUser.firstName} ${(p as any).createdByUser.lastName}`.trim()
            : p.professorNome || '—';
          if (!porTurma[chave]) porTurma[chave] = { turmaNome: nome, professor: prof, itens: [] };
          porTurma[chave].itens.push(p);
        }
        const grupos = Object.entries(porTurma);

        // Contadores globais
        const pendentes = planejamentos.filter(p =>
          p.status === 'EM_REVISAO' || p.status === 'RASCUNHO' || p.status === 'DEVOLVIDO'
        ).length;

        return (
          <div className="space-y-3">

            {/* Cabeçalho resumido */}
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-semibold text-gray-800">Planejamentos</p>
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
                <p className="text-sm font-semibold text-gray-400">Nenhum planejamento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {grupos.map(([chave, grupo]) => {
                  const aberto = turmaExpandida === chave;
                  const temPendente = grupo.itens.some(p =>
                    ['EM_REVISAO','RASCUNHO','DEVOLVIDO'].includes(p.status || '')
                  );
                  const countPendente = grupo.itens.filter(p =>
                    ['EM_REVISAO','RASCUNHO','DEVOLVIDO'].includes(p.status || '')
                  ).length;

                  return (
                    <div key={chave} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

                      {/* Header da turma — sempre visível */}
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
                          <span className="text-xs text-gray-400">
                            {grupo.itens.length} plano{grupo.itens.length !== 1 ? 's' : ''}
                          </span>
                          {temPendente && (
                            <span className="text-[11px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                              {countPendente} pendente{countPendente !== 1 ? 's' : ''}
                            </span>
                          )}
                          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${aberto ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {/* Lista de planos — só aparece quando expandido */}
                      {aberto && (
                        <div className="divide-y divide-gray-50 border-t border-gray-100">
                          {grupo.itens.map(plan => {
                            const cfg = STATUS_CFG[(plan.status || '').toUpperCase()] ?? STATUS_CFG.RASCUNHO;
                            const dataRaw = (plan as any).startDate || '';
                            const dataFmt = dataRaw
                              ? new Date(dataRaw.includes('T') ? dataRaw : dataRaw + 'T12:00:00')
                                  .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                              : '—';
                            return (
                              <div key={plan.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                      {plan.title || 'Planejamento'}
                                    </p>
                                    <p className="text-xs text-gray-400">{dataFmt}</p>
                                    {(plan as any).reviewComment && (
                                      <p className="text-xs text-red-500 mt-0.5 truncate">
                                        💬 {(plan as any).reviewComment}
                                      </p>
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
                                          className="text-[11px] bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 rounded-lg font-semibold transition-colors"
                                        >
                                          Devolver
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => navigate(`/app/planejamentos/${plan.id}`)}
                                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline"
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

            {/* Modal devolução */}
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
                      onClick={() => handleRejeitar(itemParaRejeitar.id, 'plan')}
                      disabled={!motivoRejeicao.trim()}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40"
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
              {diarios.map((diario: any) => {
                // Mapeamento robusto: suporta campos da API (title/eventDate/classroom.name)
                // e campos do mapeamento local (titulo/data/turmaNome/professorNome)
                const titulo    = diario.title    || diario.titulo    || '—';
                const turma     = diario.classroom?.name || diario.turmaNome || '—';
                const professor = diario.createdByUser
                  ? `${diario.createdByUser.firstName ?? ''} ${diario.createdByUser.lastName ?? ''}`.trim()
                  : diario.professorNome || '—';
                const dataRaw   = diario.eventDate || diario.data || diario.createdAt || '';
                const dataFmt   = dataRaw
                  ? new Date(dataRaw.includes('T') ? dataRaw : dataRaw + 'T12:00:00')
                      .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                  : '—';
                const status    = (diario.status || '').toUpperCase();
                const ctx       = diario.aiContext && typeof diario.aiContext === 'object'
                  ? diario.aiContext as any : {};
                const climaEmocional = diario.climaEmocional || ctx.climaEmocional;
                const presencas      = diario.presencas ?? ctx.presencas;
                const momentoDest    = diario.momentoDestaque || ctx.momentoDestaque;
                const statusExec     = diario.statusExecucaoPlano || ctx.statusExecucaoPlano;
                const camposBNCC     = (diario.camposBNCC ?? []) as string[];

                const statusPubl = ['PUBLICADO','REVISADO','ARQUIVADO'].includes(status);
                const statusCfg  = statusPubl
                  ? { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Publicado' }
                  : { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: 'Rascunho'  };

                const climaEmoji: Record<string, string> = {
                  OTIMO: '🌟', MUITO_BOM: '🌟', BOM: '😊', REGULAR: '😐', AGITADO: '😬', DIFICIL: '😔',
                };
                const execLabel: Record<string, { label: string; cor: string }> = {
                  CUMPRIDO:      { label: 'Cumprido',     cor: 'bg-emerald-100 text-emerald-700' },
                  PARCIAL:       { label: 'Parcial',      cor: 'bg-amber-100 text-amber-700'    },
                  NAO_REALIZADO: { label: 'Não realizado', cor: 'bg-red-100 text-red-600'        },
                };

                return (
                  <div key={diario.id}
                    className={`rounded-2xl border p-3 bg-white ${statusCfg.border} hover:shadow-sm transition-all`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                            {statusCfg.label}
                          </span>
                          {climaEmocional && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                              {climaEmoji[climaEmocional] ?? ''} {climaEmocional}
                            </span>
                          )}
                          {statusExec && execLabel[statusExec] && (
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${execLabel[statusExec].cor}`}>
                              📋 {execLabel[statusExec].label}
                            </span>
                          )}
                        </div>
                        {/* Turma e professor */}
                        <p className="text-sm font-bold text-gray-800 truncate">{turma}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Prof. {professor}
                          {presencas != null && (
                            <span className="ml-2 text-emerald-600 font-medium">· {presencas} presentes</span>
                          )}
                        </p>
                        {/* Momento de destaque */}
                        {(momentoDest || titulo !== '—') && (
                          <p className="text-xs text-gray-500 mt-1.5 italic line-clamp-2">
                            "{momentoDest || titulo}"
                          </p>
                        )}
                        {camposBNCC.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {camposBNCC.slice(0, 3).map((c: string, i: number) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Data */}
                      <span className="text-xs font-semibold text-gray-400 flex-shrink-0 mt-0.5">
                        {dataFmt}
                      </span>
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
