import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../app/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { PageShell } from '../components/ui/PageShell';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import {
  ShoppingCart, Plus, Minus, Trash2, Send,
  CheckCircle, XCircle, Clock, RefreshCw,
  BarChart2, Package, AlertCircle,
} from 'lucide-react';
import http from '../api/http';
import { createMaterialRequest } from '../api/material-request';
import { normalizeRoles } from '../app/RoleProtectedRoute';

// ─── Constantes ──────────────────────────────────────────────────────────────
const TAMANHOS_FRALDA = ['RN', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
const FRALDA_KEYWORDS = ['fralda', 'fraldas'];

function isFraldaMaterial(name: string): boolean {
  return FRALDA_KEYWORDS.some(k => name.toLowerCase().includes(k));
}

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Material {
  id: string;
  name: string;
  category: 'PEDAGOGICO' | 'HIGIENE';
  unit: string;
  description?: string;
}

interface CartItem {
  material: Material;
  quantity: number;
  fraldaTamanho?: string;
}

interface RequisicaoItem {
  id: string;
  productName?: string;
  materialName?: string;
  quantity: number;
  unit?: string | null;
  observations?: string | null;
}

interface Requisicao {
  id: string;
  code?: string;
  title?: string;
  status: string;
  urgencia?: string;
  justificativa?: string;
  requestedDate?: string;
  approvedDate?: string | null;
  items?: RequisicaoItem[];
  originalItens?: Array<{ item: string; quantidade: number; unidade?: string }>;
  classroom?: { name: string } | null;
}

// ─── Helpers de status ────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  SOLICITADO: 'Aguardando',
  EM_ANALISE: 'Em análise',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  ENTREGUE: 'Entregue',
  RASCUNHO: 'Rascunho',
};

const STATUS_COLOR: Record<string, string> = {
  SOLICITADO: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  EM_ANALISE: 'bg-blue-50 text-blue-700 border border-blue-200',
  APROVADO: 'bg-green-50 text-green-700 border border-green-200',
  REJEITADO: 'bg-red-50 text-red-700 border border-red-200',
  ENTREGUE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  RASCUNHO: 'bg-gray-50 text-gray-600 border border-gray-200',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  SOLICITADO: <Clock className="h-3 w-3" />,
  EM_ANALISE: <RefreshCw className="h-3 w-3" />,
  APROVADO: <CheckCircle className="h-3 w-3" />,
  REJEITADO: <XCircle className="h-3 w-3" />,
  ENTREGUE: <CheckCircle className="h-3 w-3" />,
  RASCUNHO: <AlertCircle className="h-3 w-3" />,
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[status] ?? 'bg-gray-50 text-gray-600'}`}>
      {STATUS_ICON[status]}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function RequisicaoMateriaisPage() {
  const { user } = useAuth() as any;
  const isDeveloper = normalizeRoles(user).includes('DEVELOPER');

  // Estado: catálogo e carrinho
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filter, setFilter] = useState<'TODOS' | 'PEDAGOGICO' | 'HIGIENE'>('TODOS');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado: histórico de consumo
  const [historico, setHistorico] = useState<Requisicao[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'catalogo' | 'historico'>('catalogo');

  useEffect(() => {
    loadMaterials();
    loadHistorico();
  }, []);

  // ─── Carregamento do catálogo ─────────────────────────────────────────────
  async function loadMaterials() {
    try {
      setLoading(true);
      const res = await http.get('/materials/catalog');
      const rawData: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const data: Material[] = rawData.map((m: any) => ({
        id: m.id,
        name: m.name,
        category: (m.category === 'PEDAGOGICO' ? 'PEDAGOGICO' : 'HIGIENE') as 'PEDAGOGICO' | 'HIGIENE',
        unit: m.unit ?? 'un',
        description: m.description ?? undefined,
      }));
      setMaterials(data);
    } catch (err) {
      console.error('Erro ao carregar materiais:', err);
      toast.error('Erro ao carregar catálogo de materiais');
    } finally {
      setLoading(false);
    }
  }

  // ─── Carregamento do histórico ────────────────────────────────────────────
  const loadHistorico = useCallback(async () => {
    try {
      setLoadingHistorico(true);
      const res = await http.get('/material-requests/minhas');
      setHistorico(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistorico(false);
    }
  }, []);

  // ─── Métricas de consumo ──────────────────────────────────────────────────
  const metricas = {
    total: historico.length,
    aprovados: historico.filter(r => r.status === 'APROVADO' || r.status === 'ENTREGUE').length,
    rejeitados: historico.filter(r => r.status === 'REJEITADO').length,
    pendentes: historico.filter(r => r.status === 'SOLICITADO' || r.status === 'EM_ANALISE').length,
  };

  // ─── Carrinho: operações ──────────────────────────────────────────────────
  function addToCart(material: Material) {
    const existing = cart.find(item => item.material.id === material.id);
    if (existing) {
      setCart(cart.map(item =>
        item.material.id === material.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { material, quantity: 1, fraldaTamanho: undefined }]);
    }
    toast.success(`${material.name} adicionado ao carrinho`);
  }

  function updateQuantity(materialId: string, quantity: number) {
    if (quantity <= 0) { removeFromCart(materialId); return; }
    setCart(cart.map(item =>
      item.material.id === materialId ? { ...item, quantity } : item
    ));
  }

  function updateFraldaTamanho(materialId: string, tamanho: string) {
    setCart(cart.map(item =>
      item.material.id === materialId ? { ...item, fraldaTamanho: tamanho } : item
    ));
  }

  function removeFromCart(materialId: string) {
    setCart(cart.filter(item => item.material.id !== materialId));
  }

  // ─── Envio da requisição ──────────────────────────────────────────────────
  async function handleSubmit() {
    if (cart.length === 0) { toast.error('Adicione pelo menos um material ao carrinho'); return; }
    if (!justification.trim()) { toast.error('Informe a justificativa da requisição'); return; }
    const fraldaSemTamanho = cart.find(item => isFraldaMaterial(item.material.name) && !item.fraldaTamanho);
    if (fraldaSemTamanho) {
      toast.error(`Selecione o tamanho da fralda para "${fraldaSemTamanho.material.name}"`);
      return;
    }
    try {
      setSubmitting(true);
      await createMaterialRequest({
        categoria: 'HIGIENE',
        titulo: `Requisição — ${new Date().toLocaleDateString('pt-BR')}`,
        justificativa: justification,
        urgencia: 'MEDIA',
        itens: cart.map(item => ({
          item: item.material.name,
          quantidade: item.quantity,
          unidade: item.material.unit,
          ...(item.fraldaTamanho ? { observacoes: `Tamanho: ${item.fraldaTamanho}` } : {}),
        })),
      });
      toast.success('Requisição enviada com sucesso!');
      setCart([]);
      setJustification('');
      // Recarregar histórico após envio
      loadHistorico();
      setAbaAtiva('historico');
    } catch (err) {
      console.error('Erro ao enviar requisição:', err);
      toast.error('Erro ao enviar requisição');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredMaterials = materials.filter(m => filter === 'TODOS' || m.category === filter);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) return <LoadingState message="Carregando materiais..." />;

  return (
    <PageShell
      title="Requisição de Materiais"
      subtitle="Solicite materiais e acompanhe seu histórico de consumo"
    >
      {/* ─── Painel de métricas de consumo ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Solicitado', value: metricas.total, icon: <Package className="h-4 w-4 text-blue-500" />, bg: 'bg-blue-50' },
          { label: 'Aprovados', value: metricas.aprovados, icon: <CheckCircle className="h-4 w-4 text-green-500" />, bg: 'bg-green-50' },
          { label: 'Pendentes', value: metricas.pendentes, icon: <Clock className="h-4 w-4 text-yellow-500" />, bg: 'bg-yellow-50' },
          { label: 'Rejeitados', value: metricas.rejeitados, icon: <XCircle className="h-4 w-4 text-red-500" />, bg: 'bg-red-50' },
        ].map(m => (
          <div key={m.label} className={`${m.bg} rounded-xl p-4 flex items-center gap-3`}>
            {m.icon}
            <div>
              <p className="text-xs text-gray-500">{m.label}</p>
              <p className="text-2xl font-bold text-gray-800">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Abas ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          { id: 'catalogo', label: 'Novo Pedido', icon: <ShoppingCart className="h-4 w-4" /> },
          { id: 'historico', label: `Meu Histórico${historico.length > 0 ? ` (${historico.length})` : ''}`, icon: <BarChart2 className="h-4 w-4" /> },
        ] as const).map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === aba.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {aba.icon}
            {aba.label}
          </button>
        ))}
      </div>

      {/* ─── Aba: Catálogo + Carrinho ───────────────────────────────────────── */}
      {abaAtiva === 'catalogo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catálogo */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2">
              {(['TODOS', 'PEDAGOGICO', 'HIGIENE'] as const).map(f => (
                <Button key={f} variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
                  {f === 'TODOS' ? 'Todos' : f === 'PEDAGOGICO' ? 'Pedagógicos' : 'Higiene'}
                </Button>
              ))}
            </div>
            {filteredMaterials.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum material encontrado nesta categoria.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMaterials.map(material => (
                  <Card key={material.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{material.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {material.category === 'PEDAGOGICO' ? 'Pedagógico' : 'Higiene'} • {material.unit}
                          </p>
                        </div>
                      </div>
                      {material.description && (
                        <p className="text-sm text-muted-foreground mb-3">{material.description}</p>
                      )}
                      <Button size="sm" onClick={() => addToCart(material)} className="w-full flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Carrinho */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrinho ({totalItems} {totalItems === 1 ? 'item' : 'itens'})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum material selecionado
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.material.id} className="border-b pb-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.material.name}</p>
                              <p className="text-xs text-muted-foreground">{item.material.unit}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(item.material.id, item.quantity - 1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input type="number" min="1" value={item.quantity} onChange={(e) => updateQuantity(item.material.id, parseInt(e.target.value) || 1)} className="w-14 text-center h-7 text-sm" />
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(item.material.id, item.quantity + 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeFromCart(item.material.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          {isFraldaMaterial(item.material.name) && (
                            <div>
                              <Label className="text-xs text-gray-600 mb-1 block">
                                Tamanho da fralda <span className="text-red-500">*</span>
                              </Label>
                              <div className="flex flex-wrap gap-1">
                                {TAMANHOS_FRALDA.map(t => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => updateFraldaTamanho(item.material.id, t)}
                                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${
                                      item.fraldaTamanho === t
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                    }`}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                              {!item.fraldaTamanho && (
                                <p className="text-xs text-amber-600 mt-1">Selecione o tamanho</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label htmlFor="justification">Justificativa *</Label>
                      <Textarea
                        id="justification"
                        placeholder="Explique para que você precisa desses materiais..."
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button className="w-full flex items-center gap-2" onClick={handleSubmit} disabled={submitting}>
                      <Send className="h-4 w-4" />
                      {submitting ? 'Enviando...' : 'Enviar Requisição'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── Aba: Histórico de consumo ──────────────────────────────────────── */}
      {abaAtiva === 'historico' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Minhas Requisições ({historico.length})
            </h3>
            <Button variant="outline" size="sm" onClick={loadHistorico} disabled={loadingHistorico} className="flex items-center gap-1">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingHistorico ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {loadingHistorico ? (
            <div className="flex justify-center py-10 text-gray-400">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma requisição encontrada.</p>
              <p className="text-xs mt-1">Suas solicitações aparecerão aqui após o envio.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historico.map(req => {
                // Resolver itens: rawItems > originalItens > fallback do title
                const itens: Array<{ nome: string; qtd: number; unidade?: string | null; obs?: string | null }> =
                  req.items && req.items.length > 0
                    ? req.items.map(i => ({
                        nome: i.productName || i.materialName || '—',
                        qtd: i.quantity,
                        unidade: i.unit,
                        obs: i.observations,
                      }))
                    : req.originalItens && req.originalItens.length > 0
                    ? req.originalItens.map(i => ({ nome: i.item, qtd: i.quantidade, unidade: i.unidade }))
                    : [{ nome: req.title || 'Material', qtd: 1 }];

                return (
                  <Card key={req.id} className="border border-gray-100 hover:border-gray-200 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800 truncate">
                              {req.title || `Requisição #${req.code || req.id.slice(-6)}`}
                            </span>
                            {req.code && (
                              <span className="text-xs text-gray-400 font-mono">{req.code}</span>
                            )}
                          </div>
                          {req.classroom?.name && (
                            <p className="text-xs text-gray-500 mt-0.5">Turma: {req.classroom.name}</p>
                          )}
                        </div>
                        <StatusBadge status={req.status} />
                      </div>

                      {/* Itens da requisição */}
                      {itens.length > 0 && (
                        <div className="mb-3 space-y-0.5">
                          {itens.slice(0, 4).map((it, i) => (
                            <div key={i} className="text-xs text-gray-600 flex items-baseline gap-1">
                              <span className="text-gray-400">•</span>
                              <span className="font-medium">{it.nome}</span>
                              <span className="text-gray-400">× {it.qtd}{it.unidade ? ` ${it.unidade}` : ''}</span>
                              {it.obs && <span className="text-gray-400 italic">({it.obs})</span>}
                            </div>
                          ))}
                          {itens.length > 4 && (
                            <p className="text-xs text-gray-400">+{itens.length - 4} item(ns)...</p>
                          )}
                        </div>
                      )}

                      {/* Justificativa */}
                      {req.justificativa && (
                        <p className="text-xs text-gray-500 italic mb-2 line-clamp-2">
                          "{req.justificativa}"
                        </p>
                      )}

                      {/* Datas */}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        {req.requestedDate && (
                          <span>Solicitado em {new Date(req.requestedDate).toLocaleDateString('pt-BR')}</span>
                        )}
                        {req.approvedDate && (req.status === 'APROVADO' || req.status === 'ENTREGUE') && (
                          <span className="text-green-600">
                            Aprovado em {new Date(req.approvedDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      {isDeveloper && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Apagar requisição "${req.title || req.code}"? Esta ação não pode ser desfeita.`)) return;
                              try {
                                await http.delete(`/material-requests/${req.id}`);
                                toast.success('Requisição apagada.');
                                setHistorico(prev => prev.filter(r => r.id !== req.id));
                              } catch (err: any) {
                                toast.error(err?.response?.data?.message || 'Erro ao apagar requisição.');
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                            Apagar (Dev)
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
