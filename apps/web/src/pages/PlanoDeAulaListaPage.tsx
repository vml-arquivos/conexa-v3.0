import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { isProfessor } from '../api/auth';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Send,
  BookOpen,
  RefreshCw,
  X,
  ThumbsDown,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../api/http';
import { submitPlanningForReview } from '../api/plannings';
import type { Planning } from '../api/plannings';
import { safeJsonParse } from '../lib/safeJson';
import { startOfPedagogicalMonth, endOfPedagogicalMonth, formatPedagogicalDate } from '../lib/formatDate';

// ─── Helpers de calendário ────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0 = domingo
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── Configuração de status ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string;
  cor: string;
  corBadge: string;
  corPonto: string;
  icon: React.ReactNode;
}> = {
  RASCUNHO: {
    label: 'Rascunho',
    cor: 'bg-gray-100 text-gray-700 border-gray-300',
    corBadge: 'bg-gray-200 text-gray-700',
    corPonto: 'bg-gray-400',
    icon: <FileText className="h-3.5 w-3.5" />,
  },
  EM_REVISAO: {
    label: 'Em Revisão',
    cor: 'bg-orange-100 text-orange-700 border-orange-300',
    corBadge: 'bg-orange-200 text-orange-700',
    corPonto: 'bg-orange-400',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  APROVADO: {
    label: 'Aprovado',
    cor: 'bg-green-100 text-green-700 border-green-300',
    corBadge: 'bg-green-200 text-green-700',
    corPonto: 'bg-green-500',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  DEVOLVIDO: {
    label: 'Devolvido',
    cor: 'bg-red-100 text-red-700 border-red-300',
    corBadge: 'bg-red-200 text-red-700',
    corPonto: 'bg-red-500',
    icon: <ThumbsDown className="h-3.5 w-3.5" />,
  },
  PUBLICADO: {
    label: 'Publicado',
    cor: 'bg-blue-100 text-blue-700 border-blue-300',
    corBadge: 'bg-blue-200 text-blue-700',
    corPonto: 'bg-blue-500',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  // FIX P0.5: status do ciclo pedagógico completo
  EM_EXECUCAO: {
    label: 'Em Execução',
    cor: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    corBadge: 'bg-indigo-200 text-indigo-700',
    corPonto: 'bg-indigo-500',
    icon: <BookOpen className="h-3.5 w-3.5" />,
  },
  CONCLUIDO: {
    label: 'Concluído',
    cor: 'bg-teal-100 text-teal-700 border-teal-300',
    corBadge: 'bg-teal-200 text-teal-700',
    corPonto: 'bg-teal-500',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? {
    label: status,
    cor: 'bg-gray-100 text-gray-700 border-gray-300',
    corBadge: 'bg-gray-200 text-gray-700',
    corPonto: 'bg-gray-400',
    icon: <FileText className="h-3.5 w-3.5" />,
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanoDeAulaListaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = new Date();

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlanning, setSelectedPlanning] = useState<Planning | null>(null);
  const [reenviando, setReenviando] = useState(false);

  // Carrega planejamentos do mês atual
  const loadPlannings = useCallback(async () => {
    setLoading(true);
    try {
      // Usa fuso pedagógico America/Sao_Paulo para evitar drift de data
      const startDate = startOfPedagogicalMonth(currentYear, currentMonth);
      const endDate = endOfPedagogicalMonth(currentYear, currentMonth);

      // Professor usa /plannings (filtra pelo seu próprio createdBy)
      // Coordenação/Unidade usa /coordenacao/planejamentos (filtra por unitId)
      if (isProfessor(user)) {
        const res = await http.get('/plannings', { params: { startDate, endDate } });
        const data = res.data;
        setPlannings(Array.isArray(data) ? data : data?.data ?? data?.plannings ?? []);
      } else {
        const res = await http.get('/coordenacao/planejamentos', { params: { startDate, endDate } });
        const data = res.data;
        if (Array.isArray(data)) {
          setPlannings(data);
        } else if (Array.isArray(data?.planejamentosParaRevisao)) {
          setPlannings(data.planejamentosParaRevisao);
        } else if (Array.isArray(data?.data)) {
          setPlannings(data.data);
        } else {
          setPlannings([]);
        }
      }
    } catch {
      toast.error('Erro ao carregar planejamentos');
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, user]);

  useEffect(() => { loadPlannings(); }, [loadPlannings]);

  // Navega mês
  function mesAnterior() {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
  }
  function proximoMes() {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
  }

  // Mapeia planejamentos por dia (usa startDate)
  function getPlanningsForDay(day: number): Planning[] {
    return plannings.filter(p => {
      const d = p.startDate ? new Date(p.startDate) : null;
      if (!d) return false;
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === day;
    });
  }

  // Verifica se é hoje
  function isToday(day: number): boolean {
    return today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;
  }

  // Reenviar para revisão
  async function reenviarParaRevisao(planning: Planning) {
    setReenviando(true);
    try {
      await submitPlanningForReview(planning.id);
      toast.success('Planejamento reenviado para revisão!');
      setSelectedPlanning(null);
      loadPlannings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao reenviar');
    } finally {
      setReenviando(false);
    }
  }

  // Gera as células do calendário
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Completa para múltiplo de 7
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <PageShell
      title="Torre de Controle"
      subtitle="Visualize e gerencie seus planejamentos no calendário"
    >
      <div className="space-y-6">

        {/* ─── Cabeçalho do calendário ─── */}
        <Card>
          <CardContent className="pt-4">
            {/* Navegação de mês */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={mesAnterior}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">
                  {MESES[currentMonth]} {currentYear}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {plannings.length} planejamento{plannings.length !== 1 ? 's' : ''} no mês
                </p>
              </div>
              <button
                onClick={proximoMes}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Legenda de status */}
            <div className="flex flex-wrap gap-3 mb-4">
              {/* FIX P0.5: remover slice(0,4) para exibir todos os status na legenda */}
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.corPonto}`} />
                  {cfg.label}
                </div>
              ))}
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 mb-2">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Células do calendário */}
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="h-20 rounded-lg" />;
                  }
                  const dayPlannings = getPlanningsForDay(day);
                  const todayCell = isToday(day);
                  return (
                    <div
                      key={day}
                      className={`h-20 rounded-xl border p-1.5 transition-all ${
                        todayCell
                          ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className={`text-xs font-semibold mb-1 ${
                        todayCell ? 'text-indigo-700' : 'text-gray-500'
                      }`}>
                        {day}
                        {todayCell && <span className="ml-1 text-indigo-400">●</span>}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayPlannings.slice(0, 2).map(p => {
                          const cfg = getStatusConfig(p.status);
                          return (
                            <button
                              key={p.id}
                              onClick={() => setSelectedPlanning(p)}
                              className={`w-full text-left text-xs px-1.5 py-0.5 rounded-md truncate flex items-center gap-1 ${cfg.corBadge} hover:opacity-80 transition-opacity`}
                              title={p.title}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.corPonto}`} />
                              <span className="truncate">{p.title}</span>
                            </button>
                          );
                        })}
                        {dayPlannings.length > 2 && (
                          <button
                            onClick={() => setSelectedPlanning(dayPlannings[2])}
                            className="w-full text-left text-xs text-gray-400 px-1.5"
                          >
                            +{dayPlannings.length - 2} mais
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Lista de planejamentos do mês ─── */}
        {plannings.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Planejamentos de {MESES[currentMonth]}
            </h3>
            {plannings.map(p => {
              const cfg = getStatusConfig(p.status);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlanning(p)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-sm ${cfg.cor}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {cfg.icon}
                        <span className="font-semibold text-sm truncate">{p.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs opacity-70">
                        {p.startDate && (
                          <span>{formatPedagogicalDate(p.startDate)}</span>
                        )}
                        {p.type && <span>{p.type}</span>}
                      </div>
                    </div>
                    <Badge className={`text-xs flex-shrink-0 ${cfg.corBadge} border-0`}>
                      {cfg.label}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ─── Botão flutuante ─── */}
        <button
          onClick={() => navigate('/app/planejamento/novo')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-40"
          title="Novo Planejamento"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* ─── Dialog de detalhes ─── */}
      {selectedPlanning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedPlanning(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className={`p-5 rounded-t-2xl border-b ${getStatusConfig(selectedPlanning.status).cor}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusConfig(selectedPlanning.status).icon}
                    <Badge className={`text-xs ${getStatusConfig(selectedPlanning.status).corBadge} border-0`}>
                      {getStatusConfig(selectedPlanning.status).label}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-gray-800 text-base leading-tight">
                    {selectedPlanning.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPlanning(null)}
                  className="p-1.5 rounded-lg hover:bg-black/10 transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Corpo */}
            <div className="p-5 space-y-4">
              {/* Período */}
              {(selectedPlanning.startDate || selectedPlanning.endDate) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Período</p>
                  <p className="text-sm text-gray-700">
                    {selectedPlanning.startDate && formatPedagogicalDate(selectedPlanning.startDate)}
                    {selectedPlanning.endDate && ` — ${formatPedagogicalDate(selectedPlanning.endDate)}`}
                  </p>
                </div>
              )}

              {/* Tipo */}
              {selectedPlanning.type && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Tipo</p>
                  <p className="text-sm text-gray-700">{selectedPlanning.type}</p>
                </div>
              )}

              {/* Conteúdo pedagógico — suporta V2 (por data), V1 (description) e legado (pedagogicalContent) */}
              {(() => {
                // Tenta formato V2 (planejamento por data com lote de dias)
                const rawDesc = (selectedPlanning as any).description;
                const v2 = safeJsonParse<{ version?: number; days?: Array<{ date: string; objectives: any[]; teacher: { atividade: string; recursos: string; observacoes: string } }> }>(rawDesc, {});
                const isV2 = v2?.version === 2 && Array.isArray(v2?.days);

                if (isV2) {
                  return (
                    <div className="space-y-4">
                      {v2.days!.map((day, idx) => (
                        <div key={day.date} className="border border-indigo-100 rounded-xl overflow-hidden">
                          <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-200">
                            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
                              Dia {idx + 1} — {day.date.split('-').reverse().join('/')}
                            </p>
                          </div>
                          <div className="px-4 py-3 space-y-3 bg-white">
                            {day.objectives?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Objetivos da Matriz 2026</p>
                                {day.objectives.map((obj: any, i: number) => (
                                  <div key={i} className="text-xs text-gray-700 border-l-2 border-indigo-300 pl-2 mb-1">
                                    <span className="font-semibold">{obj.campoExperiencia?.replace(/_/g, ' ')}</span>
                                    {obj.codigoBNCC && <span className="ml-1 text-gray-400 font-mono">[{obj.codigoBNCC}]</span>}
                                    <p className="mt-0.5 leading-relaxed">{obj.objetivoBNCC}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {day.teacher?.atividade && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-0.5">Atividade</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{day.teacher.atividade}</p>
                              </div>
                            )}
                            {day.teacher?.recursos && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-0.5">Recursos</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{day.teacher.recursos}</p>
                              </div>
                            )}
                            {day.teacher?.observacoes && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-0.5">Observações</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{day.teacher.observacoes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                // Parse seguro — compatível com dados antigos e novos
                const desc = safeJsonParse<{ activities?: string; resources?: string; notes?: string }>(
                  rawDesc,
                  {}
                );
                // Se description era string simples (dado antigo), tratar como atividades
                const descLegacy = typeof rawDesc === 'string' &&
                  !(rawDesc?.startsWith('{')) ?
                  rawDesc : null;

                // Objetivos da Matriz 2026 (novo formato)
                const objectives = safeJsonParse<any[]>((selectedPlanning as any).objectives, []);

                // Formato antigo (pedagogicalContent)
                const pc = (selectedPlanning as any).pedagogicalContent;

                return (
                  <div className="space-y-3">
                    {/* Objetivos da Matriz 2026 — 4 campos obrigatórios */}
                    {objectives.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Objetivos da Matriz Pedagógica 2026</p>
                        <div className="space-y-2">
                          {objectives.map((obj: any, i: number) => (
                            <div key={i} className="border border-indigo-200 rounded-lg overflow-hidden">
                              {/* Campo 1: Campo de Experiência */}
                              <div className="px-3 py-1.5 bg-indigo-50 border-b border-indigo-200 flex items-center gap-1.5 flex-wrap">
                                {obj.campo_emoji && <span>{obj.campo_emoji}</span>}
                                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
                                  Campo de Experiência: {obj.campo_label}
                                </span>
                                <span className="ml-auto text-xs font-mono text-gray-500">{obj.codigo_bncc}</span>
                              </div>
                              {obj.semana_tema && (
                                <div className="px-3 py-1 bg-gray-50 border-b border-gray-100">
                                  <span className="text-xs text-gray-500 italic">Tema da semana: {obj.semana_tema}</span>
                                </div>
                              )}
                              <div className="px-3 py-2 space-y-2 bg-white">
                                {/* Campo 2: Objetivo BNCC */}
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Objetivo da BNCC (Transcrição Literal)</p>
                                  <p className="text-xs text-gray-700 leading-relaxed">{obj.objetivo_bncc}</p>
                                </div>
                                {/* Campo 3: Objetivo Currículo em Movimento */}
                                {obj.objetivo_curriculo && obj.objetivo_curriculo !== obj.objetivo_bncc && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Objetivo do Currículo em Movimento — DF</p>
                                    <p className="text-xs text-gray-700 leading-relaxed">{obj.objetivo_curriculo}</p>
                                  </div>
                                )}
                                {/* Campo 4: Intencionalidade Pedagógica */}
                                {obj.intencionalidade && (
                                  <div className="bg-indigo-50 rounded px-2 py-1.5">
                                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-0.5">🎯 Intencionalidade Pedagógica</p>
                                    <p className="text-xs text-indigo-800 leading-relaxed">{obj.intencionalidade}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Atividades (novo formato ou legado) */}
                    {(desc?.activities || descLegacy) && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Atividades</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{desc?.activities ?? descLegacy}</p>
                      </div>
                    )}
                    {desc?.resources && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Recursos</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{desc.resources}</p>
                      </div>
                    )}
                    {desc?.notes && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Observações</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{desc.notes}</p>
                      </div>
                    )}

                    {/* Formato antigo (compatibilidade) */}
                    {!desc && pc && (
                      <>
                        {pc.camposSelecionados?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Campos de Experiência</p>
                            <div className="flex flex-wrap gap-1.5">
                              {pc.camposSelecionados.map((c: string) => (
                                <span key={c} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{c}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {pc.metodologia && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Metodologia</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{pc.metodologia}</p>
                          </div>
                        )}
                        {pc.recursos && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Recursos</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{pc.recursos}</p>
                          </div>
                        )}
                        {pc.avaliacao && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Avaliação</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{pc.avaliacao}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* DEVOLVIDO: mostra reviewComment em destaque vermelho */}
              {selectedPlanning.status === 'DEVOLVIDO' && selectedPlanning.reviewComment && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm font-bold text-red-700">Motivo da Devolução</p>
                  </div>
                  <p className="text-sm text-red-800">{selectedPlanning.reviewComment}</p>
                </div>
              )}

              {/* APROVADO hoje: link para Diário de Bordo */}
              {selectedPlanning.status === 'APROVADO' && (() => {
                const startDate = selectedPlanning.startDate ? new Date(selectedPlanning.startDate) : null;
                const isApprovedToday = startDate &&
                  startDate.getFullYear() === today.getFullYear() &&
                  startDate.getMonth() === today.getMonth() &&
                  startDate.getDate() === today.getDate();
                if (!isApprovedToday) return null;
                return (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-800">Este planejamento é para hoje!</p>
                      <button
                        onClick={() => navigate('/app/diario-de-bordo')}
                        className="text-xs text-green-600 underline hover:text-green-800 mt-0.5"
                      >
                        Usar como Diário de Bordo hoje →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Ações */}
            <div className="p-5 pt-0 flex flex-col gap-2">
              {/* DEVOLVIDO: botão Corrigir e Reenviar */}
              {selectedPlanning.status === 'DEVOLVIDO' && (
                <Button
                  onClick={() => reenviarParaRevisao(selectedPlanning)}
                  disabled={reenviando}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  {reenviando
                    ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Reenviando...</>
                    : <><Send className="h-4 w-4 mr-2" /> Corrigir e Reenviar</>
                  }
                </Button>
              )}

              {/* RASCUNHO: botão Editar */}
              {selectedPlanning.status === 'RASCUNHO' && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/app/planejamento/${selectedPlanning.id}/editar`)}
                  className="w-full"
                >
                  Editar Planejamento
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setSelectedPlanning(null)}
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
