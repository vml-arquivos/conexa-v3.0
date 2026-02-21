import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Users,
  BookOpen,
  ShoppingCart,
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Eye,
  Check,
  X,
} from 'lucide-react';

interface DashboardUnidade {
  unitId: string;
  data: string;
  indicadores: {
    totalTurmas: number;
    totalAlunos: number;
    requisicoesPendentes: number;
    planejamentosRascunho: number;
    planejamentosPublicados: number;
    diariosHoje: number;
    turmasComChamadaHoje: number;
    reunioesAgendadas: number;
  };
  turmas: Array<{
    id: string;
    nome: string;
    totalAlunos: number;
    professor: string;
    chamadaFeita: boolean;
  }>;
  requisicoesPendentesDetalhes: Array<{
    id: string;
    title: string;
    createdBy: string;
    requestedDate: string;
    classroomId: string;
    priority: string;
  }>;
  planejamentosParaRevisao: Array<{
    id: string;
    title: string;
    createdBy: string;
    startDate: string;
    endDate: string;
    classroomId: string;
  }>;
  proximasReunioes: Array<{
    id: string;
    titulo: string;
    dataRealizacao: string;
    tipo: string;
    status: string;
  }>;
}

export default function DashboardCoordenacaoPedagogicaPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardUnidade | null>(null);
  const [aprovando, setAprovando] = useState<string | null>(null);
  const [aprovandoReq, setAprovandoReq] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'requisicoes' | 'planejamentos' | 'diarios' | 'reunioes'>('visao-geral');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await http.get('/coordenacao/dashboard/unidade');
      setData(res.data);
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err);
      toast.error('Erro ao carregar dashboard da coordenação');
    } finally {
      setLoading(false);
    }
  }

  async function aprovarPlanejamento(id: string, aprovar: boolean) {
    try {
      setAprovando(id);
      await http.patch(`/coordenacao/planejamentos/${id}/aprovar`, { aprovar });
      toast.success(aprovar ? 'Planejamento aprovado!' : 'Planejamento devolvido para revisão');
      loadDashboard();
    } catch (err: any) {
      toast.error('Erro ao processar planejamento');
    } finally {
      setAprovando(null);
    }
  }

  async function aprovarRequisicao(id: string, aprovar: boolean) {
    try {
      setAprovandoReq(id);
      await http.patch(`/material-requests/${id}/review`, {
        decision: aprovar ? 'APPROVED' : 'REJECTED',
        notes: aprovar ? 'Aprovado pela coordenação' : 'Rejeitado pela coordenação',
      });
      toast.success(aprovar ? 'Requisição aprovada!' : 'Requisição rejeitada');
      loadDashboard();
    } catch (err: any) {
      toast.error('Erro ao processar requisição');
    } finally {
      setAprovandoReq(null);
    }
  }

  if (loading) return <LoadingState message="Carregando dashboard da coordenação..." />;
  if (!data) return (
    <PageShell title="Dashboard Coordenação Pedagógica">
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Erro ao carregar dados. Tente novamente.</p>
        <Button onClick={loadDashboard} className="mt-4">Recarregar</Button>
      </div>
    </PageShell>
  );

  const { indicadores, turmas, requisicoesPendentesDetalhes, planejamentosParaRevisao, proximasReunioes } = data;

  const tabs = [
    { id: 'visao-geral', label: 'Visão Geral' },
    { id: 'requisicoes', label: `Requisições (${indicadores.requisicoesPendentes})` },
    { id: 'planejamentos', label: `Planejamentos (${indicadores.planejamentosRascunho})` },
    { id: 'diarios', label: 'Diários' },
    { id: 'reunioes', label: `Reuniões (${indicadores.reunioesAgendadas})` },
  ] as const;

  return (
    <PageShell
      title="Coordenação Pedagógica"
      description={`Unidade · ${new Date(data.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}`}
      headerActions={
        <Button onClick={loadDashboard} variant="outline" size="sm">
          Atualizar
        </Button>
      }
    >
      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Turmas</p>
                <p className="text-2xl font-bold">{indicadores.totalTurmas}</p>
                <p className="text-xs text-muted-foreground">{indicadores.turmasComChamadaHoje} com chamada hoje</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${indicadores.requisicoesPendentes > 0 ? 'border-l-orange-500' : 'border-l-green-500'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Requisições Pendentes</p>
                <p className="text-2xl font-bold">{indicadores.requisicoesPendentes}</p>
                <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
              </div>
              <ShoppingCart className={`h-8 w-8 opacity-70 ${indicadores.requisicoesPendentes > 0 ? 'text-orange-500' : 'text-green-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${indicadores.planejamentosRascunho > 0 ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Planejamentos para Revisar</p>
                <p className="text-2xl font-bold">{indicadores.planejamentosRascunho}</p>
                <p className="text-xs text-muted-foreground">{indicadores.planejamentosPublicados} publicados</p>
              </div>
              <BookOpen className={`h-8 w-8 opacity-70 ${indicadores.planejamentosRascunho > 0 ? 'text-yellow-500' : 'text-green-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Diários Hoje</p>
                <p className="text-2xl font-bold">{indicadores.diariosHoje}</p>
                <p className="text-xs text-muted-foreground">{indicadores.totalAlunos} alunos total</p>
              </div>
              <ClipboardList className="h-8 w-8 text-purple-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Visão Geral */}
      {activeTab === 'visao-geral' && (
        <div className="space-y-6">
          {/* Status das Turmas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status das Turmas Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {turmas.map((turma) => (
                  <div
                    key={turma.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      turma.chamadaFeita ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {turma.chamadaFeita ? (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{turma.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{turma.professor}</p>
                      <p className="text-xs text-muted-foreground">{turma.totalAlunos} alunos</p>
                    </div>
                    <Badge variant={turma.chamadaFeita ? 'default' : 'secondary'} className="text-xs">
                      {turma.chamadaFeita ? 'Chamada OK' : 'Pendente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Próximas Reuniões */}
          {proximasReunioes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Próximas Reuniões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {proximasReunioes.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{r.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.dataRealizacao).toLocaleDateString('pt-BR', {
                            weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Badge variant="outline">{r.tipo}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Requisições */}
      {activeTab === 'requisicoes' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requisições Pendentes de Aprovação</CardTitle>
          </CardHeader>
          <CardContent>
            {requisicoesPendentesDetalhes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p>Nenhuma requisição pendente!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requisicoesPendentesDetalhes.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{req.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(req.requestedDate).toLocaleDateString('pt-BR')}
                      </p>
                      {req.priority && (
                        <Badge
                          variant={req.priority === 'alta' ? 'destructive' : 'secondary'}
                          className="text-xs mt-1"
                        >
                          {req.priority === 'alta' ? 'Urgente' : req.priority === 'normal' ? 'Normal' : 'Baixa'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => aprovarRequisicao(req.id, true)}
                        disabled={aprovandoReq === req.id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => aprovarRequisicao(req.id, false)}
                        disabled={aprovandoReq === req.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Planejamentos */}
      {activeTab === 'planejamentos' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planejamentos para Revisão</CardTitle>
          </CardHeader>
          <CardContent>
            {planejamentosParaRevisao.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p>Nenhum planejamento aguardando revisão!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {planejamentosParaRevisao.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{plan.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(plan.startDate).toLocaleDateString('pt-BR')} —{' '}
                        {new Date(plan.endDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => aprovarPlanejamento(plan.id, true)}
                        disabled={aprovando === plan.id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                        onClick={() => aprovarPlanejamento(plan.id, false)}
                        disabled={aprovando === plan.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Devolver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Diários */}
      {activeTab === 'diarios' && (
        <DiariosCoordenacaoTab unitId={data.unitId} />
      )}

      {/* Tab: Reuniões */}
      {activeTab === 'reunioes' && (
        <ReunioesCoordenacaoTab mantenedoraId="" unitId={data.unitId} onRefresh={loadDashboard} />
      )}
    </PageShell>
  );
}

// ─── Sub-componente: Diários ──────────────────────────────────────────────────

function DiariosCoordenacaoTab({ unitId }: { unitId: string }) {
  const [diarios, setDiarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiarios();
  }, []);

  async function loadDiarios() {
    try {
      setLoading(true);
      const res = await http.get('/coordenacao/diarios');
      setDiarios(res.data);
    } catch {
      toast.error('Erro ao carregar diários');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState message="Carregando diários..." />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Diários de Bordo — Última Semana
        </CardTitle>
      </CardHeader>
      <CardContent>
        {diarios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Nenhum diário registrado esta semana</p>
          </div>
        ) : (
          <div className="space-y-3">
            {diarios.map((d: any) => (
              <div key={d.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm">{d.classroom?.name ?? 'Turma'}</p>
                  <span className="text-xs text-muted-foreground">
                    {d.eventDate ? new Date(d.eventDate).toLocaleDateString('pt-BR') : ''}
                  </span>
                </div>
                {d.child && (
                  <p className="text-xs text-muted-foreground">
                    Aluno: {d.child.firstName} {d.child.lastName}
                  </p>
                )}
                {d.description && (
                  <p className="text-sm mt-1 text-gray-700 line-clamp-2">{d.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-componente: Reuniões ─────────────────────────────────────────────────

function ReunioesCoordenacaoTab({ unitId, onRefresh }: { mantenedoraId: string; unitId: string; onRefresh: () => void }) {
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState({ titulo: '', dataRealizacao: '', localOuLink: '', tipo: 'UNIDADE', descricao: '' });

  useEffect(() => {
    loadReunioes();
  }, []);

  async function loadReunioes() {
    try {
      setLoading(true);
      const res = await http.get('/coordenacao/reunioes');
      setReunioes(res.data);
    } catch {
      toast.error('Erro ao carregar reuniões');
    } finally {
      setLoading(false);
    }
  }

  async function criarReuniao() {
    if (!form.titulo || !form.dataRealizacao) {
      toast.error('Título e data são obrigatórios');
      return;
    }
    try {
      setCriando(true);
      await http.post('/coordenacao/reunioes', form);
      toast.success('Reunião criada!');
      setForm({ titulo: '', dataRealizacao: '', localOuLink: '', tipo: 'UNIDADE', descricao: '' });
      loadReunioes();
      onRefresh();
    } catch {
      toast.error('Erro ao criar reunião');
    } finally {
      setCriando(false);
    }
  }

  async function publicarReuniao(id: string) {
    try {
      await http.patch(`/coordenacao/reunioes/${id}/status`, { status: 'PUBLICADA' });
      toast.success('Reunião publicada!');
      loadReunioes();
    } catch {
      toast.error('Erro ao publicar reunião');
    }
  }

  if (loading) return <LoadingState message="Carregando reuniões..." />;

  return (
    <div className="space-y-6">
      {/* Criar nova reunião */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Nova Pauta / Reunião
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Título *</label>
              <input
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                placeholder="Ex: Reunião de Coordenação Pedagógica"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data e Hora *</label>
              <input
                type="datetime-local"
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                value={form.dataRealizacao}
                onChange={(e) => setForm({ ...form, dataRealizacao: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Local ou Link</label>
              <input
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                placeholder="Sala de reuniões ou link do Meet"
                value={form.localOuLink}
                onChange={(e) => setForm({ ...form, localOuLink: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="UNIDADE">Unidade</option>
                <option value="REDE">Rede</option>
                <option value="FORMACAO">Formação</option>
                <option value="EMERGENCIAL">Emergencial</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Pauta / Descrição</label>
              <textarea
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                rows={3}
                placeholder="Descreva os pontos da pauta..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={criarReuniao} disabled={criando} className="mt-4">
            {criando ? 'Criando...' : 'Criar Reunião'}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de reuniões */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reuniões Agendadas</CardTitle>
        </CardHeader>
        <CardContent>
          {reunioes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhuma reunião cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reunioes.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{r.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.dataRealizacao).toLocaleDateString('pt-BR', {
                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                      {r.localOuLink && ` · ${r.localOuLink}`}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{r.tipo}</Badge>
                      <Badge
                        variant={r.status === 'PUBLICADA' ? 'default' : r.status === 'REALIZADA' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {r.status}
                      </Badge>
                    </div>
                  </div>
                  {r.status === 'RASCUNHO' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => publicarReuniao(r.id)}
                      className="ml-4"
                    >
                      Publicar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
