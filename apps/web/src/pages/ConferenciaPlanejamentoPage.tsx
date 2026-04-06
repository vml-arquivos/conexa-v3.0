/**
 * ConferenciaPlanejamentoPage.tsx
 * Professor marca FEITO / PARCIAL / NAO_REALIZADO por dia de um planejamento.
 * Acesso: PROFESSOR | PROFESSOR_AUXILIAR | DEVELOPER
 * Rota: /app/planejamento/:planningId/conferir
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  CheckCircle, AlertCircle, XCircle, ArrowLeft,
  RefreshCw, Save, Calendar, ClipboardCheck,
} from 'lucide-react';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface Planning {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  pedagogicalContent?: Record<string, {
    experience?: string;
    materials?: string[];
    strategy?: string;
  }>;
}

interface Conferencia {
  id?: string;
  dataConferencia: string;
  status: 'FEITO' | 'PARCIAL' | 'NAO_REALIZADO' | '';
  observacao: string;
  justificativa: string;
}

// ─── Configuração visual dos status ─────────────────────────────────────────────
const STATUS_CFG = {
  FEITO: {
    label: 'Feito',
    cor: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    corBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  PARCIAL: {
    label: 'Parcial',
    cor: 'bg-amber-100 text-amber-700 border-amber-300',
    corBtn: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  NAO_REALIZADO: {
    label: 'Não Realizado',
    cor: 'bg-red-100 text-red-700 border-red-300',
    corBtn: 'bg-red-500 hover:bg-red-600 text-white border-red-500',
    icon: <XCircle className="h-4 w-4" />,
  },
} as const;

// ─── Gerar array de datas entre startDate e endDate ─────────────────────────────
function gerarDatas(startDate: string, endDate: string): string[] {
  const datas: string[] = [];
  const inicio = new Date(startDate + 'T12:00:00Z');
  const fim = new Date(endDate + 'T12:00:00Z');
  const atual = new Date(inicio);
  while (atual <= fim) {
    const dow = atual.getUTCDay();
    if (dow !== 0 && dow !== 6) { // apenas dias úteis
      datas.push(atual.toISOString().slice(0, 10));
    }
    atual.setUTCDate(atual.getUTCDate() + 1);
  }
  return datas;
}

function fmtDia(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function ConferenciaPlanejamentoPage() {
  const { planningId } = useParams<{ planningId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [planning, setPlanning] = useState<Planning | null>(null);
  const [conferencias, setConferencias] = useState<Record<string, Conferencia>>({});

  const carregar = useCallback(async () => {
    if (!planningId) return;
    setLoading(true);
    try {
      const [planRes, confRes] = await Promise.allSettled([
        http.get(`/plannings/${planningId}`),
        http.get('/planning-conferencia', { params: { planningId } }),
      ]);

      if (planRes.status === 'fulfilled') {
        setPlanning(planRes.value?.data ?? null);
      }

      if (confRes.status === 'fulfilled') {
        const lista: any[] = Array.isArray(confRes.value?.data)
          ? confRes.value.data
          : [];
        const mapa: Record<string, Conferencia> = {};
        for (const c of lista) {
          const dia = c.dataConferencia?.slice(0, 10);
          if (dia) {
            mapa[dia] = {
              id: c.id,
              dataConferencia: dia,
              status: c.status,
              observacao: c.observacao ?? '',
              justificativa: c.justificativa ?? '',
            };
          }
        }
        setConferencias(mapa);
      }
    } catch {
      toast.error('Erro ao carregar planejamento.');
    } finally {
      setLoading(false);
    }
  }, [planningId]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = useCallback(async (dia: string) => {
    const conf = conferencias[dia];
    if (!conf?.status) {
      toast.error('Seleccione um status antes de guardar.');
      return;
    }
    setSaving(dia);
    try {
      await http.post('/planning-conferencia', {
        planningId,
        dataConferencia: dia,
        status: conf.status,
        observacao: conf.observacao || undefined,
        justificativa: conf.justificativa || undefined,
      });
      toast.success(`Conferência de ${fmtDia(dia)} guardada.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao guardar conferência.');
    } finally {
      setSaving(null);
    }
  }, [conferencias, planningId]);

  const updateConf = (dia: string, campo: keyof Conferencia, valor: string) => {
    setConferencias(prev => ({
      ...prev,
      [dia]: { ...(prev[dia] ?? { dataConferencia: dia, status: '', observacao: '', justificativa: '' }), [campo]: valor },
    }));
  };

  if (loading) return <LoadingState message="Carregando planejamento..." />;

  if (!planning) {
    return (
      <PageShell title="Conferência" subtitle="Planejamento não encontrado">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </PageShell>
    );
  }

  const datas = gerarDatas(
    planning.startDate?.slice(0, 10) ?? '',
    planning.endDate?.slice(0, 10) ?? '',
  );
  const pc = planning.pedagogicalContent ?? {};

  const totalDias = datas.length;
  const conferido = Object.values(conferencias).filter(c => c.status).length;

  return (
    <PageShell
      title="Conferência do Planejamento"
      subtitle={planning.title}
    >
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button variant="outline" onClick={carregar} className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
        </div>

        {/* Progresso */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700">Progresso da Conferência</span>
              </div>
              <span className="text-sm font-bold text-indigo-600">{conferido}/{totalDias} dias</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-indigo-500 transition-all"
                style={{ width: totalDias > 0 ? `${Math.round((conferido / totalDias) * 100)}%` : '0%' }}
              />
            </div>
            <div className="flex gap-4 mt-3">
              {(['FEITO', 'PARCIAL', 'NAO_REALIZADO'] as const).map(s => {
                const cnt = Object.values(conferencias).filter(c => c.status === s).length;
                const cfg = STATUS_CFG[s];
                return (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.corBtn.split(' ')[0]}`} />
                    <span className="text-xs text-gray-500">{cfg.label}: <strong>{cnt}</strong></span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Dias */}
        {datas.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">Nenhum dia útil neste planejamento.</p>
            </CardContent>
          </Card>
        )}

        {datas.map((dia) => {
          const conf = conferencias[dia] ?? { status: '', observacao: '', justificativa: '', dataConferencia: dia };
          const conteudo = pc[dia] ?? null;
          const isSaving = saving === dia;
          const jaConferido = !!conf.status;

          return (
            <Card key={dia} className={`border-2 ${jaConferido ? 'border-opacity-60 ' + (STATUS_CFG[conf.status as keyof typeof STATUS_CFG]?.cor.split(' ').find(c => c.startsWith('border-')) ?? 'border-gray-100') : 'border-gray-100'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {fmtDia(dia)}
                  </div>
                  {jaConferido && (
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_CFG[conf.status as keyof typeof STATUS_CFG]?.cor}`}>
                      {STATUS_CFG[conf.status as keyof typeof STATUS_CFG]?.icon}
                      {STATUS_CFG[conf.status as keyof typeof STATUS_CFG]?.label}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Conteúdo planeado (se existir) */}
                {conteudo?.experience && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">📋 Planeado</p>
                    <p className="text-xs text-blue-800">{conteudo.experience}</p>
                    {conteudo.materials && conteudo.materials.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        🧰 {conteudo.materials.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {/* Selector de status */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Como foi a execução?</p>
                  <div className="flex flex-wrap gap-2">
                    {(['FEITO', 'PARCIAL', 'NAO_REALIZADO'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => updateConf(dia, 'status', s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          conf.status === s
                            ? STATUS_CFG[s].corBtn
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {STATUS_CFG[s].icon}
                        {STATUS_CFG[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Observação */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Observação <span className="font-normal text-gray-400">(opcional)</span>
                  </label>
                  <textarea
                    value={conf.observacao}
                    onChange={e => updateConf(dia, 'observacao', e.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder="Como correu a actividade..."
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                {/* Justificativa — só para PARCIAL e NAO_REALIZADO */}
                {(conf.status === 'PARCIAL' || conf.status === 'NAO_REALIZADO') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Justificativa <span className="font-normal text-gray-400">(opcional)</span>
                    </label>
                    <textarea
                      value={conf.justificativa}
                      onChange={e => updateConf(dia, 'justificativa', e.target.value)}
                      maxLength={1000}
                      rows={2}
                      placeholder="Motivo pelo qual não foi realizado ou foi parcial..."
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                )}

                {/* Botão guardar */}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => salvar(dia)}
                    disabled={!conf.status || isSaving}
                    className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isSaving ? 'Guardando...' : 'Guardar conferência'}
                  </Button>
                </div>

              </CardContent>
            </Card>
          );
        })}

      </div>
    </PageShell>
  );
}
