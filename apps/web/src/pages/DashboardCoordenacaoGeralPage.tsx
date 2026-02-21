import { useState, useEffect } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Building2,
  Users,
  BookOpen,
  ShoppingCart,
  ClipboardList,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart2,
} from 'lucide-react';

interface ConsolidadoUnidade {
  id: string;
  nome: string;
  totalTurmas: number;
  totalAlunos: number;
  totalProfessores: number;
  requisicoesPendentes: number;
  planejamentosRascunho: number;
  diariosHoje: number;
  turmasComChamada: number;
  coberturaChamada: number;
}

interface DashboardGeral {
  mantenedoraId: string;
  data: string;
  indicadoresGerais: {
    totalUnidades: number;
    totalAlunos: number;
    totalProfessores: number;
    requisicoesPendentes: number;
    planejamentosRascunho: number;
    diariosHoje: number;
    reunioesAgendadas: number;
  };
  consolidadoUnidades: ConsolidadoUnidade[];
  ultimasReunioes: Array<{
    id: string;
    titulo: string;
    dataRealizacao: string;
    tipo: string;
    status: string;
  }>;
  proximasReunioes: Array<{
    id: string;
    titulo: string;
    dataRealizacao: string;
    tipo: string;
    status: string;
  }>;
}

export default function DashboardCoordenacaoGeralPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardGeral | null>(null);
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'unidades' | 'reunioes' | 'relatorios'>('visao-geral');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await http.get('/coordenacao/dashboard/geral');
      setData(res.data);
    } catch (err: any) {
      console.error('Erro ao carregar dashboard geral:', err);
      toast.error('Erro ao carregar dashboard da coordenação geral');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState message="Carregando dashboard da coordenação geral..." />;
  if (!data) return (
    <PageShell title="Coordenação Geral">
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Erro ao carregar dados. Tente novamente.</p>
        <Button onClick={loadDashboard} className="mt-4">Recarregar</Button>
      </div>
    </PageShell>
  );

  const { indicadoresGerais, consolidadoUnidades, ultimasReunioes, proximasReunioes } = data;

  const tabs = [
    { id: 'visao-geral', label: 'Visão Geral' },
    { id: 'unidades', label: `Unidades (${indicadoresGerais.totalUnidades})` },
    { id: 'reunioes', label: `Reuniões de Rede` },
    { id: 'relatorios', label: 'Relatórios' },
  ] as const;

  return (
    <PageShell
      title="Coordenação Geral"
      description={`Mantenedora · ${new Date(data.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`}
      headerActions={
        <Button onClick={loadDashboard} variant="outline" size="sm">
          Atualizar
        </Button>
      }
    >
      {/* Indicadores Gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Unidades</p>
                <p className="text-2xl font-bold">{indicadoresGerais.totalUnidades}</p>
                <p className="text-xs text-muted-foreground">{indicadoresGerais.totalProfessores} professores</p>
              </div>
              <Building2 className="h-8 w-8 text-indigo-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total de Alunos</p>
                <p className="text-2xl font-bold">{indicadoresGerais.totalAlunos}</p>
                <p className="text-xs text-muted-foreground">Matriculados</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${indicadoresGerais.requisicoesPendentes > 0 ? 'border-l-orange-500' : 'border-l-green-500'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Requisições Pendentes</p>
                <p className="text-2xl font-bold">{indicadoresGerais.requisicoesPendentes}</p>
                <p className="text-xs text-muted-foreground">Na rede toda</p>
              </div>
              <ShoppingCart className={`h-8 w-8 opacity-70 ${indicadoresGerais.requisicoesPendentes > 0 ? 'text-orange-500' : 'text-green-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Diários Hoje</p>
                <p className="text-2xl font-bold">{indicadoresGerais.diariosHoje}</p>
                <p className="text-xs text-muted-foreground">{indicadoresGerais.planejamentosRascunho} plan. para revisar</p>
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
                ? 'border-indigo-600 text-indigo-600'
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
          {/* Resumo por Unidade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                Resumo por Unidade — Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase">
                      <th className="text-left py-2 px-3">Unidade</th>
                      <th className="text-center py-2 px-3">Turmas</th>
                      <th className="text-center py-2 px-3">Alunos</th>
                      <th className="text-center py-2 px-3">Chamada</th>
                      <th className="text-center py-2 px-3">Diários</th>
                      <th className="text-center py-2 px-3">Requisições</th>
                      <th className="text-center py-2 px-3">Planejamentos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {consolidadoUnidades.map((u) => (
                      <tr key={u.id} className="hover:bg-accent transition-colors">
                        <td className="py-3 px-3 font-medium">{u.nome}</td>
                        <td className="py-3 px-3 text-center">{u.totalTurmas}</td>
                        <td className="py-3 px-3 text-center">{u.totalAlunos}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${u.coberturaChamada >= 80 ? 'bg-green-500' : u.coberturaChamada >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${u.coberturaChamada}%` }}
                              />
                            </div>
                            <span className="text-xs">{u.coberturaChamada}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant={u.diariosHoje > 0 ? 'default' : 'secondary'} className="text-xs">
                            {u.diariosHoje}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {u.requisicoesPendentes > 0 ? (
                            <Badge variant="destructive" className="text-xs">{u.requisicoesPendentes}</Badge>
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {u.planejamentosRascunho > 0 ? (
                            <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">
                              {u.planejamentosRascunho} para revisar
                            </Badge>
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Próximas Reuniões de Rede */}
          {proximasReunioes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Próximas Reuniões de Rede
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {proximasReunioes.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
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

      {/* Tab: Unidades */}
      {activeTab === 'unidades' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {consolidadoUnidades.map((u) => (
            <Card key={u.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  {u.nome}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">{u.totalAlunos}</p>
                    <p className="text-xs text-muted-foreground">Alunos</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">{u.totalProfessores}</p>
                    <p className="text-xs text-muted-foreground">Professores</p>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded-lg">
                    <p className="text-lg font-bold text-purple-600">{u.totalTurmas}</p>
                    <p className="text-xs text-muted-foreground">Turmas</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cobertura de Chamada</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${u.coberturaChamada >= 80 ? 'bg-green-500' : u.coberturaChamada >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${u.coberturaChamada}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{u.coberturaChamada}%</span>
                    </div>
                  </div>

                  {u.requisicoesPendentes > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Requisições Pendentes</span>
                      <Badge variant="destructive" className="text-xs">{u.requisicoesPendentes}</Badge>
                    </div>
                  )}

                  {u.planejamentosRascunho > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Planejamentos para Revisar</span>
                      <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">
                        {u.planejamentosRascunho}
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Diários Hoje</span>
                    <Badge variant={u.diariosHoje > 0 ? 'default' : 'secondary'} className="text-xs">
                      {u.diariosHoje}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab: Reuniões de Rede */}
      {activeTab === 'reunioes' && (
        <ReunioesDaRedeTab onRefresh={loadDashboard} />
      )}

      {/* Tab: Relatórios */}
      {activeTab === 'relatorios' && (
        <RelatoriosGeralTab consolidado={consolidadoUnidades} indicadores={indicadoresGerais} />
      )}
    </PageShell>
  );
}

// ─── Sub-componente: Reuniões de Rede ────────────────────────────────────────

function ReunioesDaRedeTab({ onRefresh }: { onRefresh: () => void }) {
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    dataRealizacao: '',
    localOuLink: '',
    tipo: 'REDE',
    descricao: '',
  });

  useEffect(() => {
    loadReunioes();
  }, []);

  async function loadReunioes() {
    try {
      setLoading(true);
      const res = await http.get('/coordenacao/reunioes?tipo=REDE');
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
      await http.post('/coordenacao/reunioes', { ...form, tipo: 'REDE' });
      toast.success('Reunião de rede criada!');
      setForm({ titulo: '', dataRealizacao: '', localOuLink: '', tipo: 'REDE', descricao: '' });
      loadReunioes();
      onRefresh();
    } catch {
      toast.error('Erro ao criar reunião');
    } finally {
      setCriando(false);
    }
  }

  if (loading) return <LoadingState message="Carregando reuniões..." />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova Reunião de Rede</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Título *</label>
              <input
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                placeholder="Ex: Reunião de Coordenação Pedagógica da Rede"
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
                placeholder="Endereço ou link do Meet/Zoom"
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
                <option value="REDE">Rede</option>
                <option value="FORMACAO">Formação</option>
                <option value="EMERGENCIAL">Emergencial</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Pauta</label>
              <textarea
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                rows={3}
                placeholder="Pontos da pauta da reunião..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={criarReuniao} disabled={criando} className="mt-4">
            {criando ? 'Criando...' : 'Criar Reunião de Rede'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reuniões de Rede</CardTitle>
        </CardHeader>
        <CardContent>
          {reunioes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhuma reunião de rede cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reunioes.map((r: any) => (
                <div key={r.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{r.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(r.dataRealizacao).toLocaleDateString('pt-BR', {
                          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {r.localOuLink && (
                        <p className="text-xs text-blue-600 mt-1">{r.localOuLink}</p>
                      )}
                    </div>
                    <Badge
                      variant={r.status === 'PUBLICADA' ? 'default' : r.status === 'REALIZADA' ? 'secondary' : 'outline'}
                    >
                      {r.status}
                    </Badge>
                  </div>
                  {r.descricao && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.descricao}</p>
                  )}
                  <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{r.atas?.length ?? 0} ata(s)</span>
                    <span>·</span>
                    <span>{r.participantes?.length ?? 0} participante(s)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-componente: Relatórios Gerenciais ────────────────────────────────────

function RelatoriosGeralTab({ consolidado, indicadores }: { consolidado: ConsolidadoUnidade[]; indicadores: any }) {
  const totalAlunos = consolidado.reduce((s, u) => s + u.totalAlunos, 0);
  const totalProfessores = consolidado.reduce((s, u) => s + u.totalProfessores, 0);
  const totalTurmas = consolidado.reduce((s, u) => s + u.totalTurmas, 0);
  const mediaCobertura = consolidado.length > 0
    ? Math.round(consolidado.reduce((s, u) => s + u.coberturaChamada, 0) / consolidado.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Resumo Executivo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Resumo Executivo da Rede
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-indigo-50 rounded-xl">
              <p className="text-3xl font-bold text-indigo-600">{indicadores.totalUnidades}</p>
              <p className="text-sm text-muted-foreground mt-1">Unidades</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <p className="text-3xl font-bold text-blue-600">{totalAlunos}</p>
              <p className="text-sm text-muted-foreground mt-1">Alunos</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <p className="text-3xl font-bold text-green-600">{totalProfessores}</p>
              <p className="text-sm text-muted-foreground mt-1">Professores</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <p className="text-3xl font-bold text-purple-600">{totalTurmas}</p>
              <p className="text-sm text-muted-foreground mt-1">Turmas</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Cobertura Média de Chamada</p>
              <span className={`text-lg font-bold ${mediaCobertura >= 80 ? 'text-green-600' : mediaCobertura >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {mediaCobertura}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${mediaCobertura >= 80 ? 'bg-green-500' : mediaCobertura >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${mediaCobertura}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {(indicadores.requisicoesPendentes > 0 || indicadores.planejamentosRascunho > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              Itens que Requerem Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {indicadores.requisicoesPendentes > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <ShoppingCart className="h-4 w-4" />
                  <span><strong>{indicadores.requisicoesPendentes}</strong> requisições de materiais aguardando aprovação na rede</span>
                </div>
              )}
              {indicadores.planejamentosRascunho > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <BookOpen className="h-4 w-4" />
                  <span><strong>{indicadores.planejamentosRascunho}</strong> planejamentos aguardando revisão na rede</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking de Unidades por Cobertura */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking de Cobertura de Chamada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...consolidado]
              .sort((a, b) => b.coberturaChamada - a.coberturaChamada)
              .map((u, index) => (
                <div key={u.id} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-6">{index + 1}º</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{u.nome}</span>
                      <span className={`text-sm font-bold ${u.coberturaChamada >= 80 ? 'text-green-600' : u.coberturaChamada >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {u.coberturaChamada}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${u.coberturaChamada >= 80 ? 'bg-green-500' : u.coberturaChamada >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${u.coberturaChamada}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
