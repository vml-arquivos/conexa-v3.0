import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from 'sonner';
import http from '../api/http';
import { useAuth } from '../app/AuthProvider';
import { hasRole } from '../api/auth';
import {
  Brain, Heart, AlertTriangle, CheckCircle, Clock,
  RotateCcw, Globe, FileText, BookOpen, ArrowLeft,
  RefreshCw, Utensils, Activity, Calendar, User,
} from 'lucide-react';

interface RdicHistorico {
  id: string;
  periodo: string;
  periodoEnum?: string | null;
  anoLetivo: number;
  status: string;
  reviewComment?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  finalizadoEm?: string | null;
  publicadoEm?: string | null;
  criadoEm: string;
}

interface CentralData {
  child: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    gender: string | null;
    photoUrl: string | null;
    allergies: string | null;
    medicalConditions: string | null;
    medicationNeeds: string | null;
    turma: { id: string; name: string } | null;
    restricoesAlimentares: Array<{
      id: string; type: string; name: string;
      severity?: string | null; forbiddenFoods?: string | null;
    }>;
    acompanhamentoNutricional: {
      statusCaso: string;
      orientacoesProfCozinha?: string | null;
      restricoesOperacionais?: string | null;
      substituicoesSeguras?: string | null;
      proximaReavaliacao?: string | null;
    } | null;
  };
  rdics: RdicHistorico[];
  rdicAtual: RdicHistorico | null;
  totalDiario90dias: number;
}

function calcularIdade(dob: string | null | undefined): string {
  if (!dob) return '—';
  try {
    const hoje = new Date();
    const nasc = new Date(dob);
    if (isNaN(nasc.getTime())) return '—';
    let anos = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
    if (anos < 1) {
      const meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + hoje.getMonth() - nasc.getMonth();
      return `${Math.max(0, meses)} meses`;
    }
    return `${anos} anos`;
  } catch { return '—'; }
}

function fmtData(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

const STATUS_CFG: Record<string, { label: string; cor: string }> = {
  RASCUNHO:   { label: 'Rascunho',    cor: 'bg-gray-100 text-gray-600' },
  EM_REVISAO: { label: 'Em Revisão',  cor: 'bg-yellow-100 text-yellow-700' },
  DEVOLVIDO:  { label: 'Devolvido',   cor: 'bg-orange-100 text-orange-700' },
  APROVADO:   { label: '✓ Aprovado',  cor: 'bg-emerald-100 text-emerald-700' },
  FINALIZADO: { label: 'Finalizado',  cor: 'bg-blue-100 text-blue-700' },
  PUBLICADO:  { label: 'Publicado',   cor: 'bg-green-100 text-green-700' },
  PENDENTE:   { label: 'Sem RDIC',    cor: 'bg-slate-100 text-slate-500' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.PENDENTE;
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cor}`}>{cfg.label}</span>;
}

export default function CentralRdicCriancaPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CentralData | null>(null);
  const { user } = useAuth();
  const podeCriar = hasRole(user, 'PROFESSOR') || hasRole(user, 'PROFESSOR_AUXILIAR');

  const carregar = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const res = await http.get(`/rdic/child/${childId}/central`);
      setData(res?.data ?? null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao carregar dados da criança.');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading) return <LoadingState message="Carregando central da criança..." />;

  if (!data) {
    return (
      <PageShell title="Central do RDIC" subtitle="Dados não encontrados">
        <EmptyState icon={<Brain className="h-12 w-12 text-gray-300" />} title="Dados não encontrados" description="Não foi possível carregar os dados desta criança." />
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </PageShell>
    );
  }

  const { child, rdics, rdicAtual, totalDiario90dias } = data;
  const nome = `${child?.firstName ?? ''} ${child?.lastName ?? ''}`.trim();
  const temAlertas = (child?.restricoesAlimentares?.length ?? 0) > 0 || !!child?.allergies || !!child?.medicalConditions || !!child?.medicationNeeds;

  return (
    <PageShell title={`Central RDIC — ${nome}`} subtitle={`${child?.turma?.name ?? '—'} · ${calcularIdade(child?.dateOfBirth)}`}>
      <div className="space-y-5">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={carregar} className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/app/crianca/${childId}/painel-analitico`)}
              className="flex items-center gap-2 text-sm border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Activity className="h-4 w-4" /> Painel Analítico
            </Button>
            {podeCriar && (
              <Button
                onClick={() => navigate(`/app/rdic-crianca?childId=${childId}&classroomId=${child?.turma?.id ?? ''}`)}
                className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Brain className="h-4 w-4" />
                {rdicAtual ? 'Editar RDIC' : 'Criar RDIC'}
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              {child?.photoUrl ? (
                <img src={child.photoUrl} alt={nome} className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {(child?.firstName?.[0] ?? '') + (child?.lastName?.[0] ?? '')}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-800">{nome}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {calcularIdade(child?.dateOfBirth)}
                  </span>
                  {child?.turma && <span className="text-sm text-indigo-600 font-medium">{child.turma.name}</span>}
                  {child?.gender && child.gender !== 'NAO_INFORMADO' && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {child.gender === 'FEMININO' ? 'Menina' : child.gender === 'MASCULINO' ? 'Menino' : child.gender}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400 mb-1">RDIC actual</p>
                <StatusBadge status={rdicAtual?.status ?? 'PENDENTE'} />
                {rdicAtual && <p className="text-xs text-gray-400 mt-1">{rdicAtual.periodo}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {temAlertas && (
          <Card className="border-red-100 bg-red-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Alertas de Saúde
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {child?.allergies && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-red-700 mb-0.5">⚠️ Alergias</p>
                  <p className="text-xs text-red-600">{child.allergies}</p>
                </div>
              )}
              {child?.medicalConditions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">🏥 Condição Médica</p>
                  <p className="text-xs text-blue-600">{child.medicalConditions}</p>
                </div>
              )}
              {child?.medicationNeeds && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-purple-700 mb-0.5">💊 Medicação</p>
                  <p className="text-xs text-purple-600">{child.medicationNeeds}</p>
                </div>
              )}
              {(child?.restricoesAlimentares?.length ?? 0) > 0 && child.restricoesAlimentares.map(r => (
                <div key={r.id} className="bg-orange-50 border border-orange-200 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-orange-700">
                    🚫 {r.name}{r.severity && <span className="font-normal opacity-70"> · {r.severity}</span>}
                  </p>
                  {r.forbiddenFoods && <p className="text-xs text-orange-600 mt-0.5">Evitar: {r.forbiddenFoods}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-500" /> RDIC Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!rdicAtual ? (
                <div className="text-center py-6">
                  <Brain className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">Nenhum RDIC criado ainda.</p>
                  {podeCriar && (
                    <Button size="sm" onClick={() => navigate(`/app/rdic-crianca?childId=${childId}`)} className="mt-3 bg-indigo-600 text-white text-xs">
                      Criar Primeiro RDIC
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{rdicAtual.periodo}</p>
                      <p className="text-xs text-gray-500">{rdicAtual.anoLetivo}</p>
                    </div>
                    <StatusBadge status={rdicAtual.status} />
                  </div>
                  {rdicAtual.status === 'DEVOLVIDO' && rdicAtual.reviewComment && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 flex gap-2">
                      <RotateCcw className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-700">{rdicAtual.reviewComment}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    {rdicAtual.submittedAt && <div><p className="font-medium text-gray-600">Enviado</p><p>{fmtData(rdicAtual.submittedAt)}</p></div>}
                    {rdicAtual.reviewedAt && <div><p className="font-medium text-gray-600">Revisado</p><p>{fmtData(rdicAtual.reviewedAt)}</p></div>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="h-6 w-6 mx-auto mb-1 text-indigo-400" />
                <p className="text-2xl font-bold text-gray-800">{rdics.length}</p>
                <p className="text-xs text-gray-500">RDICs registados</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/app/diario-de-bordo?childId=${childId}`)}>
              <CardContent className="p-4 text-center">
                <Activity className="h-6 w-6 mx-auto mb-1 text-emerald-400" />
                <p className="text-2xl font-bold text-gray-800">{totalDiario90dias}</p>
                <p className="text-xs text-gray-500">obs. (90 dias)</p>
                <p className="text-xs text-emerald-600 mt-1">Ver diário →</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {child?.acompanhamentoNutricional && (
          <Card className="border-amber-100 bg-amber-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                <Utensils className="h-4 w-4" /> Orientações Nutricionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {child.acompanhamentoNutricional.restricoesOperacionais && (
                <div><p className="text-xs font-semibold text-gray-600 mb-0.5">Restrições operacionais:</p><p className="text-xs text-gray-700">{child.acompanhamentoNutricional.restricoesOperacionais}</p></div>
              )}
              {child.acompanhamentoNutricional.orientacoesProfCozinha && (
                <div><p className="text-xs font-semibold text-gray-600 mb-0.5">Orientações para a cozinha:</p><p className="text-xs text-gray-700">{child.acompanhamentoNutricional.orientacoesProfCozinha}</p></div>
              )}
              {child.acompanhamentoNutricional.proximaReavaliacao && (
                <p className="text-xs text-amber-600">📅 Próxima reavaliação: {fmtData(child.acompanhamentoNutricional.proximaReavaliacao)}</p>
              )}
            </CardContent>
          </Card>
        )}

        {rdics.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" /> Histórico de RDICs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rdics.map((rdic, i) => (
                  <div key={rdic.id} className={`flex items-center justify-between p-3 rounded-xl border ${i === 0 ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rdic.status === 'PUBLICADO' || rdic.status === 'APROVADO' ? 'bg-green-400' : rdic.status === 'EM_REVISAO' ? 'bg-yellow-400' : rdic.status === 'DEVOLVIDO' ? 'bg-orange-400' : 'bg-gray-300'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{rdic.periodo} {i === 0 && <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">actual</span>}</p>
                        <p className="text-xs text-gray-400">{fmtData(rdic.criadoEm)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={rdic.status} />
                      <Button size="sm" variant="outline" onClick={() => navigate(`/app/rdic-crianca?childId=${childId}&classroomId=${child?.turma?.id ?? ''}`)}
                        className="text-xs h-7 px-2">
                        {podeCriar && (rdic.status === 'RASCUNHO' || rdic.status === 'DEVOLVIDO') ? 'Editar' : 'Ver'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </PageShell>
  );
}
