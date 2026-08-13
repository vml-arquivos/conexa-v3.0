/**
 * FaltasSecretariaPage — Controle de Faltas da Secretaria
 *
 * Visão consolidada de faltas por turma e aluno, com alertas de reincidência
 * (≥3 faltas no mês) e histórico por período.
 *
 * RBAC: UNIDADE_ADMINISTRATIVO, UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
 * Usa endpoints existentes:
 *   GET /attendance/unit-summary?date=YYYY-MM-DD
 *   GET /attendance/summary?classroomId=&startDate=&endDate=
 */

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { ChildAvatar } from '../components/children/ChildAvatar';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import {
  AlertTriangle, RefreshCw, XCircle, Loader2, Users,
  Calendar, TrendingDown, CheckCircle, ChevronDown, ChevronUp,
  Filter,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TurmaFaltas {
  classroomId: string;
  classroomName: string;
  totalAlunos: number;
  presentes: number;
  ausentes: number;
  justificados: number;
  taxaPresenca: number;
}

interface AlunoFaltas {
  childId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  classroomName: string;
  totalFaltas: number;
  faltasNoMes: number;
  alertaReincidencia: boolean;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function FaltasSecretariaPage() {
  const [turmas, setTurmas] = useState<TurmaFaltas[]>([]);
  const [alunos, setAlunos] = useState<AlunoFaltas[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dataRef, setDataRef] = useState(() => new Date().toISOString().split('T')[0]);
  const [aba, setAba] = useState<'turmas' | 'alertas' | 'historico'>('turmas');
  const [expandida, setExpandida] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [unitRes, summaryRes] = await Promise.allSettled([
        http.get('/attendance/unit-summary', { params: { date: dataRef } }),
        http.get('/attendance/summary', {
          params: {
            startDate: dataRef.slice(0, 7) + '-01',
            endDate: dataRef,
          },
        }),
      ]);

      if (unitRes.status === 'fulfilled') {
        const data = unitRes.value.data;
        // Normalizar resposta do unit-summary
        const lista: TurmaFaltas[] = Array.isArray(data?.turmas)
          ? data.turmas.map((t: any) => ({
              classroomId: t.classroomId ?? t.id,
              classroomName: t.classroomName ?? t.name ?? t.nome,
              totalAlunos: t.totalAlunos ?? t.total ?? 0,
              presentes: t.presentes ?? t.present ?? 0,
              ausentes: t.ausentes ?? t.absent ?? 0,
              justificados: t.justificados ?? t.justified ?? 0,
              taxaPresenca: t.taxaPresenca ?? (t.totalAlunos > 0 ? Math.round((t.presentes / t.totalAlunos) * 100) : 0),
            }))
          : Array.isArray(data)
          ? data.map((t: any) => ({
              classroomId: t.classroomId ?? t.id,
              classroomName: t.classroomName ?? t.name ?? t.nome,
              totalAlunos: t.totalAlunos ?? 0,
              presentes: t.presentes ?? 0,
              ausentes: t.ausentes ?? 0,
              justificados: t.justificados ?? 0,
              taxaPresenca: t.taxaPresenca ?? 0,
            }))
          : [];
        setTurmas(lista);
      }

      if (summaryRes.status === 'fulfilled') {
        const data = summaryRes.value.data;
        // Construir lista de alunos com faltas do mês
        const alunosData: AlunoFaltas[] = Array.isArray(data?.children)
          ? data.children.map((c: any) => ({
              childId: c.childId ?? c.id,
              firstName: c.firstName ?? c.nome?.split(' ')[0] ?? '',
              lastName: c.lastName ?? c.nome?.split(' ').slice(1).join(' ') ?? '',
              photoUrl: c.photoUrl ?? null,
              classroomName: c.classroomName ?? '',
              totalFaltas: c.totalFaltas ?? c.absences ?? 0,
              faltasNoMes: c.faltasNoMes ?? c.absencesThisMonth ?? c.totalFaltas ?? 0,
              alertaReincidencia: (c.faltasNoMes ?? c.absencesThisMonth ?? c.totalFaltas ?? 0) >= 3,
            }))
          : [];
        setAlunos(alunosData);
      }
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, [dataRef]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalAusentes = turmas.reduce((s, t) => s + t.ausentes, 0);
  const totalPresentes = turmas.reduce((s, t) => s + t.presentes, 0);
  const totalAlunos = turmas.reduce((s, t) => s + t.totalAlunos, 0);
  const alertas = alunos.filter(a => a.alertaReincidencia);
  const taxaGeral = totalAlunos > 0 ? Math.round((totalPresentes / totalAlunos) * 100) : 0;

  return (
    <PageShell
      title="Controle de Faltas"
      description="Frequência, alertas de reincidência e histórico"
      headerActions={
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            value={dataRef}
            onChange={(e) => setDataRef(e.target.value)}
          />
          <button
            onClick={carregar}
            disabled={carregando}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      }
    >
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <Users className="h-4 w-4 text-blue-500 mb-1" />
          <p className="text-2xl font-semibold text-blue-600 tabular-nums">{totalAlunos}</p>
          <p className="text-[11px] text-slate-400 font-normal">Total de alunos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <CheckCircle className="h-4 w-4 text-emerald-500 mb-1" />
          <p className="text-2xl font-semibold text-emerald-600 tabular-nums">{taxaGeral}%</p>
          <p className="text-[11px] text-slate-400 font-normal">Taxa de presença</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <TrendingDown className="h-4 w-4 text-red-500 mb-1" />
          <p className="text-2xl font-semibold text-red-600 tabular-nums">{totalAusentes}</p>
          <p className="text-[11px] text-slate-400 font-normal">Ausentes hoje</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mb-1" />
          <p className="text-2xl font-semibold text-amber-600 tabular-nums">{alertas.length}</p>
          <p className="text-[11px] text-slate-400 font-normal">Alertas de reincid.</p>
        </div>
      </div>

      {/* ── Abas ── */}
      <div className="flex gap-1 border-b border-slate-100">
        {[
          { id: 'turmas', label: 'Por Turma' },
          { id: 'alertas', label: `Alertas (${alertas.length})` },
          { id: 'historico', label: 'Histórico' },
        ].map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id as typeof aba)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              aba === a.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* ── Erro ── */}
      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Carregando dados de frequência...</span>
        </div>
      ) : (
        <>
          {/* ── Aba: Por Turma ── */}
          {aba === 'turmas' && (
            turmas.length === 0 ? (
              <EmptyState icon={<Users className="h-8 w-8" />} msg="Nenhum dado de frequência disponível para esta data." />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-50">
                  {turmas.map((t) => {
                    const isExp = expandida === t.classroomId;
                    return (
                      <div key={t.classroomId}>
                        <button
                          onClick={() => setExpandida(isExp ? null : t.classroomId)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left touch-manipulation"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700">{t.classroomName}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[11px] text-emerald-600">{t.presentes} presentes</span>
                              <span className="text-[11px] text-red-500">{t.ausentes} ausentes</span>
                              {t.justificados > 0 && (
                                <span className="text-[11px] text-amber-600">{t.justificados} justif.</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <TaxaPresencaBadge taxa={t.taxaPresenca} />
                            {isExp ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                          </div>
                        </button>
                        {isExp && (
                          <div className="px-4 pb-3 bg-slate-50 border-t border-slate-100">
                            <div className="pt-3">
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-2 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${t.taxaPresenca}%`,
                                    backgroundColor: t.taxaPresenca >= 80 ? '#10b981' : t.taxaPresenca >= 60 ? '#f59e0b' : '#ef4444',
                                  }}
                                />
                              </div>
                              <p className="text-[11px] text-slate-400 mt-1.5">
                                {t.totalAlunos} alunos · {t.taxaPresenca}% de presença
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {/* ── Aba: Alertas ── */}
          {aba === 'alertas' && (
            alertas.length === 0 ? (
              <EmptyState
                icon={<CheckCircle className="h-8 w-8 text-emerald-400" />}
                msg="Nenhum aluno com reincidência de faltas neste período."
              />
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Alunos com 3 ou mais faltas no mês corrente. Considere contatar os responsáveis.
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <div className="divide-y divide-slate-50">
                    {alertas.map((a) => (
                      <div key={a.childId} className="flex items-center gap-3 px-4 py-3">
                        <ChildAvatar
                          firstName={a.firstName}
                          lastName={a.lastName}
                          photoUrl={a.photoUrl ?? undefined}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {a.firstName} {a.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{a.classroomName}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-semibold text-red-600 tabular-nums">{a.faltasNoMes}</p>
                          <p className="text-[10px] text-slate-400">faltas/mês</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}

          {/* ── Aba: Histórico ── */}
          {aba === 'historico' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                Histórico detalhado de faltas por aluno. Selecione uma turma no painel "Por Turma" para ver o histórico individual.
              </div>
              {alunos.length === 0 ? (
                <EmptyState icon={<Calendar className="h-8 w-8" />} msg="Nenhum dado histórico disponível para o período selecionado." />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <div className="px-4 py-2.5 border-b border-slate-50">
                    <p className="text-xs text-slate-400 font-medium">{alunos.length} alunos no período</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {alunos
                      .sort((a, b) => b.faltasNoMes - a.faltasNoMes)
                      .map((a) => (
                        <div key={a.childId} className="flex items-center gap-3 px-4 py-2.5">
                          <ChildAvatar
                            firstName={a.firstName}
                            lastName={a.lastName}
                            photoUrl={a.photoUrl ?? undefined}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {a.firstName} {a.lastName}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">{a.classroomName}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {a.alertaReincidencia && (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            )}
                            <div className="text-right">
                              <p className={`text-sm font-semibold tabular-nums ${a.alertaReincidencia ? 'text-red-600' : 'text-slate-600'}`}>
                                {a.faltasNoMes}
                              </p>
                              <p className="text-[10px] text-slate-400">faltas</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

function TaxaPresencaBadge({ taxa }: { taxa: number }) {
  const cls = taxa >= 80
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : taxa >= 60
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border tabular-nums ${cls}`}>
      {taxa}%
    </span>
  );
}

function EmptyState({ icon, msg }: { icon: React.ReactNode; msg: string }) {
  return (
    <div className="text-center py-12 text-slate-400">
      <div className="flex justify-center mb-2 opacity-40">{icon}</div>
      <p className="text-sm">{msg}</p>
    </div>
  );
}
