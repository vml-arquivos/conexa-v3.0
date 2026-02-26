import { useState, useEffect } from 'react';
import { useAuth } from '../app/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { PageShell } from '../components/ui/PageShell';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, Trash2, Send } from 'lucide-react';
import http from '../api/http';
import { createMaterialRequest } from '../api/material-request';

// Tamanhos de fralda disponíveis
const TAMANHOS_FRALDA = ['RN', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];

// Materiais de higiene que requerem seleção de tamanho de fralda
const FRALDA_KEYWORDS = ['fralda', 'fraldas'];

function isFraldaMaterial(name: string): boolean {
  return FRALDA_KEYWORDS.some(k => name.toLowerCase().includes(k));
}

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
  /** Para fraldas: tamanho selecionado (ex: "GG"). Armazenado em observations. */
  fraldaTamanho?: string;
}

export default function RequisicaoMateriaisPage() {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filter, setFilter] = useState<'TODOS' | 'PEDAGOGICO' | 'HIGIENE'>('TODOS');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  async function loadMaterials() {
    try {
      setLoading(true);
      // Endpoint correto via http client (com token automático)
      const res = await http.get('/materials');
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setMaterials(data);
    } catch (err) {
      console.error('Erro ao carregar materiais:', err);
      toast.error('Erro ao carregar catálogo de materiais');
    } finally {
      setLoading(false);
    }
  }

  function addToCart(material: Material) {
    const existing = cart.find(item => item.material.id === material.id);
    if (existing) {
      setCart(cart.map(item =>
        item.material.id === material.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { material, quantity: 1, fraldaTamanho: undefined }]);
    }
    toast.success(`${material.name} adicionado ao carrinho`);
  }

  function updateQuantity(materialId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(materialId);
      return;
    }
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

  async function handleSubmit() {
    if (cart.length === 0) {
      toast.error('Adicione pelo menos um material ao carrinho');
      return;
    }
    if (!justification.trim()) {
      toast.error('Informe a justificativa da requisição');
      return;
    }
    // Validar tamanho de fralda obrigatório
    const fraldaSemTamanho = cart.find(
      item => isFraldaMaterial(item.material.name) && !item.fraldaTamanho
    );
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
          // Tamanho de fralda vai em observations via campo extra
          ...(item.fraldaTamanho ? { observacoes: `Tamanho: ${item.fraldaTamanho}` } : {}),
        })),
      });
      toast.success('Requisição enviada com sucesso!');
      setCart([]);
      setJustification('');
    } catch (err) {
      console.error('Erro ao enviar requisição:', err);
      toast.error('Erro ao enviar requisição');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredMaterials = materials.filter(m =>
    filter === 'TODOS' || m.category === filter
  );

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) return <LoadingState message="Carregando materiais..." />;

  return (
    <PageShell
      title="Requisição de Materiais"
      subtitle="Selecione os materiais que você precisa para suas atividades"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catálogo de Materiais */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filtros */}
          <div className="flex gap-2">
            {(['TODOS', 'PEDAGOGICO', 'HIGIENE'] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
              >
                {f === 'TODOS' ? 'Todos' : f === 'PEDAGOGICO' ? 'Pedagógicos' : 'Higiene'}
              </Button>
            ))}
          </div>

          {/* Lista de Materiais */}
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
                      <p className="text-sm text-muted-foreground mb-3">
                        {material.description}
                      </p>
                    )}
                    <Button
                      size="sm"
                      onClick={() => addToCart(material)}
                      className="w-full flex items-center gap-2"
                    >
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
                  {/* Itens do Carrinho */}
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.material.id} className="border-b pb-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.material.name}</p>
                            <p className="text-xs text-muted-foreground">{item.material.unit}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => updateQuantity(item.material.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.material.id, parseInt(e.target.value) || 1)}
                              className="w-14 text-center h-7 text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => updateQuantity(item.material.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => removeFromCart(item.material.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {/* Seletor de tamanho de fralda */}
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

                  {/* Justificativa */}
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

                  {/* Botão Enviar */}
                  <Button
                    className="w-full flex items-center gap-2"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? 'Enviando...' : 'Enviar Requisição'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
