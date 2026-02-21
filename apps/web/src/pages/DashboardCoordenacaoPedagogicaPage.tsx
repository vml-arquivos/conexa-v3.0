import { useState, useEffect } from 'react';
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
  Bell, Star,
} from 'lucide-react';

const URGENCIA_CONFIG: Record<string, { label: string; cor: string; dot: string }> = {
  ALTA: { label: 'Urgente', cor: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' },
  MEDIA: { label: 'Normal', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' },
  BAIXA: { label: 'Sem pressa', cor: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500' },
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface Requisicao {
  id: string; professorNome: string; turmaNome: string;
  itens: Array<{ item: string; quantidade: number }>; urgencia: string;
  justificativa: string; criadoEm: string;
}
interface Planejamento {
  id: string; professorNome: string; turmaNome: string;
  semana: string; objetivos?: string;
}
interface Diario {
  id: string; professorNome: string; turmaNome: string;
  data: string; titulo: string;
}
interface TurmaResumo {
  id: string; nome: string; totalAlunos: number; professor: string; chamadaFeita: boolean;
}
interface DashboardData {
  turmas: number; professores: number; alunosTotal: number;
  requisicoesParaAnalisar: number; planejamentosParaRevisar: number;
  diariosEstaSemana: number; taxaPresencaMedia: number; alertas: string[];
  turmasLista: TurmaResumo[];
}

export default function DashboardCoordenacaoPedagogicaPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [planejamentos, setPlanejamentos] = useState<Planejamento[]>([]);
  const [diarios, setDiarios] = useState<Diario[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'inicio'|'requisicoes'|'planejamentos'|'diarios'>('inicio');
  const [processando, setProcessando] = useState<string|null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [itemParaRejeitar, setItemParaRejeitar] = useState<{id:string;tipo:'req'|'plan'}|null>(null);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [dashRes, reqRes, planRes, diarRes] = await Promise.allSettled([
        http.get('/coordenacao/dashboard/unidade'),
        http.get('/coordenacao/requisicoes'),
        http.get('/coordenacao/planejamentos?status=RASCUNHO'),
        http.get('/coordenacao/diarios'),
      ]);
      if (dashRes.status === 'fulfilled') {
        const raw = dashRes.value.data;
        const ind = raw?.indicadores ?? {};
        const turmasArr: TurmaResumo[] = Array.isArray(raw?.turmas) ? raw.turmas : [];
        const professoresSet = new Set(turmasArr.map((t: TurmaResumo) => t.professor).filter((p: string) => p !== 'Não atribuído'));
        setDashboard({
          turmas: ind.totalTurmas ?? turmasArr.length,
          // ✅ CORRIGIDO: era `professoresSet.size || ind.totalProfessores ?? 0`
          // TS5076: '||' e '??' não podem ser misturados sem parênteses
          professores: (professoresSet.size || ind.totalProfessores) ?? 0,
          alunosTotal: ind.totalAlunos ?? 0,
          requisicoesParaAnalisar: ind.requisicoesPendentes ?? 0,
          planejamentosParaRevisar: ind.planejamentosRascunho ?? 0,
          diariosEstaSemana: ind.diariosHoje ?? 0,
          taxaPresencaMedia: ind.totalTurmas > 0
            ? Math.round((ind.turmasComChamadaHoje / ind.totalTurmas) * 100)
            : 0,
          alertas: [],
          turmasLista: turmasArr,
        });
        if (Array.isArray(raw?.requisicoesPendentesDetalhes) && raw.requisicoesPendentesDetalhes.length > 0) {
          setRequisicoes(raw.requisicoesPendentesDetalhes.map((r: Record<string, unknown>) => {
            let itens: Array<{item: string; quantidade: number}> = [];
            try { const desc = JSON.parse(r.description as string ?? '{}'); itens = desc.itens ?? []; } catch { itens = []; }
            return {
              id: r.id as string,
              professorNome: (r.createdBy as string) ?? 'Professor',
              turmaNome: (r.classroomId as string) ?? '—',
              itens: itens.length > 0 ? itens : [{ item: r.title as string ?? 'Material', quantidade: 1 }],
              urgencia: (r.priority as string)?.toUpperCase() === 'ALTA' ? 'ALTA' : (r.priority as string)?.toUpperCase() === 'BAIXA' ? 'BAIXA' : 'MEDIA',
              justificativa: '',
              criadoEm: (r.requestedDate as string) ?? new Date().toISOString(),
            };
          }));
        }
        if (Array.isArray(raw?.planejamentosParaRevisao) && raw.planejamentosParaRevisao.length > 0) {
          setPlanejamentos(raw.planejamentosParaRevisao.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            professorNome: (p.createdBy as string) ?? 'Professor',
            turmaNome: (p.classroomId as string) ?? '—',
            semana: p.startDate ? new Date(p.startDate as string).toLocaleDateString('pt-BR') : '—',
            objetivos: undefined,
          })));
        }
      }
      if (reqRes.status === 'fulfilled' && Array.isArray(reqRes.value.data) && reqRes.value.data.length > 0) {
        setRequisicoes(reqRes.value.data);
      }
      if (planRes.status === 'fulfilled') setPlanejamentos(planRes.value.data ?? []);
      if (diarRes.status === 'fulfilled') setDiarios(diarRes.value.data ?? []);
    } catch { toast.error('Erro ao carregar painel'); }
    finally { setLoading(false); }
  }

  async function aprovarRequisicao(id: string) {
    try {
      setProcessando(id);
      await http.patch(`/material-requests/${id}/review`, { decision: 'APPROVED' });
      toast.success('Pedido aprovado! ✅');
      setRequisicoes(prev => prev.filter(r => r.id !== id));
    } catch { toast.error('Erro ao aprovar'); }
    finally { setProcessando(null); }
  }

  async function rejeitarRequisicao(id: string, motivo: string) {
    try {
      setProcessando(id);
      await http.patch(`/material-requests/${id}/review`, { decision: 'REJECTED' });
      toast.success('Pedido devolvido ao professor');
      setRequisicoes(prev => prev.filter(r => r.id !== id));
      setItemParaRejeitar(null); setMotivoRejeicao('');
    } catch { toast.error('Erro ao devolver'); }
    finally { setProcessando(null); }
  }

  async function aprovarPlanejamento(id: string) {
    try {
      setProcessando(id);
      await http.patch(`/coordenacao/planejamentos/${id}/aprovar`, { aprovar: true });
      toast.success('Planejamento aprovado! ✅');
      setPlanejamentos(prev => prev.filter(p => p.id !== id));
    } catch { toast.error('Erro ao aprovar'); }
    finally { setProcessando(null); }
  }

  async function devolverPlanejamento(id: string, motivo: string) {
    try {
      setProcessando(id);
      await http.patch(`/coordenacao/planejamentos/${id}/aprovar`, { aprovar: false, observacao: motivo });
      toast.success('Planejamento devolvido com observações');
      setPlanejamentos(prev => prev.filter(p => p.id !== id));
      setItemParaRejeitar(null); setMotivoRejeicao('');
    } catch { toast.error('Erro ao devolver'); }
    finally { setProcessando(null); }
  }

  if (loading) return <LoadingState message="Carregando painel de coordenação..." />;

  const totalPendencias = (dashboard?.requisicoesParaAnalisar ?? 0) + (dashboard?.planejamentosParaRevisar ?? 0);

  const abas = [
    { id: 'inicio', label: 'Início', icon: <Star className="h-4 w-4" /> },
    { id: 'requisicoes', label: 'Pedidos de Material', icon: <ShoppingCart className="h-4 w-4" />, badge: dashboard?.requisicoesParaAnalisar },
    { id: 'planejamentos', label: 'Planejamentos', icon: <BookOpen className="h-4 w-4" />, badge: dashboard?.planejamentosParaRevisar },
    { id: 'diarios', label: 'Diários da Semana', icon: <ClipboardList className="h-4 w-4" /> },
  ] as const;

  return (
    <PageShell title="Coordenação Pedagógica" description="Acompanhe e apoie o trabalho dos professores">
      {/* Modal motivo rejeição */}
      {itemParaRejeitar && (
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
                  if (itemParaRejeitar.tipo === 'req') rejeitarRequisicao(itemParaRejeitar.id, motivoRejeicao);
                  else devolverPlanejamento(itemParaRejeitar.id, motivoRejeicao);
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

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {abas.map(aba => (
          <button key={aba.id} onClick={() => setAbaAtiva(aba.id as any)}
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

      {/* ABA: INÍCIO */}
      {abaAtiva === 'inicio' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Users className="h-6 w-6 text-blue-600"/>, bg: 'bg-blue-100', val: dashboard?.turmas ?? 0, label: 'Turmas' },
              { icon: <Star className="h-6 w-6 text-purple-600"/>, bg: 'bg-purple-100', val: dashboard?.professores ?? 0, label: 'Professores' },
              { icon: <TrendingUp className="h-6 w-6 text-green-600"/>, bg: 'bg-green-100', val: dashboard?.taxaPresencaMedia ? `${dashboard.taxaPresencaMedia}%` : '--', label: 'Presença hoje' },
              { icon: <ClipboardList className="h-6 w-6 text-orange-600"/>, bg: 'bg-orange-100', val: dashboard?.diariosEstaSemana ?? 0, label: 'Diários esta semana' },
            ].map((c, i) => (
              <Card key={i} className="rounded-2xl border-2 text-center">
                <CardContent className="pt-5 pb-4">
                  <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center mx-auto mb-3`}>{c.icon}</div>
                  <p className="text-3xl font-bold text-gray-800">{c.val}</p>
                  <p className="text-sm text-gray-500 mt-1">{c.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(dashboard?.requisicoesParaAnalisar ?? 0) > 0 && (
              <button onClick={() => setAbaAtiva('requisicoes')}
                className="p-5 bg-red-50 border-2 border-red-200 rounded-2xl text-left hover:bg-red-100 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <ShoppingCart className="h-6 w-6 text-red-500"/>
                  <span className="bg-red-500 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">{dashboard?.requisicoesParaAnalisar}</span>
                </div>
                <p className="font-bold text-red-800">Pedidos de material</p>
                <p className="text-sm text-red-600 mt-1">aguardando sua análise</p>
                <div className="flex items-center gap-1 mt-3 text-red-500 text-sm font-medium">Analisar agora <ChevronRight className="h-4 w-4"/></div>
              </button>
            )}
            {(dashboard?.planejamentosParaRevisar ?? 0) > 0 && (
              <button onClick={() => setAbaAtiva('planejamentos')}
                className="p-5 bg-yellow-50 border-2 border-yellow-200 rounded-2xl text-left hover:bg-yellow-100 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <BookOpen className="h-6 w-6 text-yellow-600"/>
                  <span className="bg-yellow-500 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">{dashboard?.planejamentosParaRevisar}</span>
                </div>
                <p className="font-bold text-yellow-800">Planejamentos</p>
                <p className="text-sm text-yellow-600 mt-1">para revisar e aprovar</p>
                <div className="flex items-center gap-1 mt-3 text-yellow-600 text-sm font-medium">Revisar agora <ChevronRight className="h-4 w-4"/></div>
              </button>
            )}
            <button onClick={() => setAbaAtiva('diarios')}
              className="p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl text-left hover:bg-blue-100 transition-all">
              <div className="flex items-center justify-between mb-2">
                <ClipboardList className="h-6 w-6 text-blue-500"/>
                <span className="bg-blue-500 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">{dashboard?.diariosEstaSemana ?? 0}</span>
              </div>
              <p className="font-bold text-blue-800">Diários da semana</p>
              <p className="text-sm text-blue-600 mt-1">registros dos professores</p>
              <div className="flex items-center gap-1 mt-3 text-blue-500 text-sm font-medium">Ver diários <ChevronRight className="h-4 w-4"/></div>
            </button>
          </div>

          {dashboard?.alertas && dashboard.alertas.length > 0 && (
            <Card className="rounded-2xl border-2 border-orange-200 bg-orange-50">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-orange-800"><AlertCircle className="h-5 w-5"/>Atenção</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {dashboard.alertas.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-orange-700">
                    <span className="w-2 h-2 bg-orange-400 rounded-full mt-1.5 flex-shrink-0"/>{a}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ABA: PEDIDOS DE MATERIAL */}
      {abaAtiva === 'requisicoes' && (
        <div className="space-y-4">
          {requisicoes.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300"/>
              <p className="text-xl font-bold text-gray-400">Tudo em dia!</p>
              <p className="text-gray-400 text-sm mt-2">Nenhum pedido aguardando análise</p>
            </div>
          ) : requisicoes.map(req => {
            const urg = URGENCIA_CONFIG[req.urgencia] ?? URGENCIA_CONFIG['MEDIA'];
            const d = new Date(req.criadoEm);
            return (
              <Card key={req.id} className="rounded-2xl border-2 overflow-hidden">
                <div className={`px-4 py-2 flex items-center justify-between ${req.urgencia === 'ALTA' ? 'bg-red-50' : req.urgencia === 'MEDIA' ? 'bg-yellow-50' : 'bg-green-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${urg.dot}`}/>
                    <span className="text-sm font-semibold">{req.professorNome}</span>
                    <span className="text-xs text-gray-500">· {req.turmaNome}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${urg.cor}`}>{urg.label}</span>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">O que está pedindo:</p>
                    <div className="flex flex-wrap gap-2">
                      {req.itens.map((item, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-gray-100 rounded-xl text-sm font-medium">{item.quantidade}x {item.item}</span>
                      ))}
                    </div>
                  </div>
                  {req.justificativa && (
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <p className="text-xs text-blue-600 font-medium mb-1">Por que precisa:</p>
                      <p className="text-sm text-blue-800">{req.justificativa}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">Pedido em {d.getDate()} de {MESES[d.getMonth()]}</p>
                  <div className="flex gap-3 pt-1">
                    <Button onClick={() => aprovarRequisicao(req.id)} disabled={processando === req.id}
                      className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 font-bold">
                      <ThumbsUp className="h-4 w-4 mr-2"/>Aprovar
                    </Button>
                    <Button onClick={() => setItemParaRejeitar({ id: req.id, tipo: 'req' })} disabled={processando === req.id}
                      variant="outline" className="flex-1 h-11 rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50 font-bold">
                      <MessageSquare className="h-4 w-4 mr-2"/>Devolver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ABA: PLANEJAMENTOS */}
      {abaAtiva === 'planejamentos' && (
        <div className="space-y-4">
          {planejamentos.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300"/>
              <p className="text-xl font-bold text-gray-400">Tudo revisado!</p>
            </div>
          ) : planejamentos.map(plan => (
            <Card key={plan.id} className="rounded-2xl border-2">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{plan.professorNome}</p>
                    <p className="text-sm text-gray-500">{plan.turmaNome} · Semana de {plan.semana}</p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Para revisar</span>
                </div>
                {plan.objetivos && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Objetivos da semana:</p>
                    <p className="text-sm text-gray-700 line-clamp-3">{plan.objetivos}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button onClick={() => aprovarPlanejamento(plan.id)} disabled={processando === plan.id}
                    className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 font-bold">
                    <ThumbsUp className="h-4 w-4 mr-2"/>Aprovar
                  </Button>
                  <Button onClick={() => setItemParaRejeitar({ id: plan.id, tipo: 'plan' })} disabled={processando === plan.id}
                    variant="outline" className="flex-1 h-11 rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50 font-bold">
                    <MessageSquare className="h-4 w-4 mr-2"/>Devolver
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ABA: DIÁRIOS */}
      {abaAtiva === 'diarios' && (
        <div className="space-y-3">
          {diarios.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-200"/>
              <p className="text-xl font-bold text-gray-400">Nenhum diário esta semana</p>
            </div>
          ) : diarios.map(diario => {
            const d = new Date(diario.data + 'T12:00:00');
            return (
              <Card key={diario.id} className="rounded-2xl border-2 hover:border-blue-300 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="h-5 w-5 text-blue-600"/>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{diario.titulo}</p>
                        <p className="text-xs text-gray-500">{diario.professorNome} · {diario.turmaNome} · {d.getDate()}/{d.getMonth()+1}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="rounded-xl"><Eye className="h-4 w-4"/></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
