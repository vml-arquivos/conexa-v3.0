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

      const response = await fetch('/api/materials', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Erro ao carregar materiais');

      const data = await response.json();
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
      setCart([...cart, { material, quantity: 1 }]);
    }

    toast.success(`${material.name} adicionado ao carrinho`);
  }

  function updateQuantity(materialId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(materialId);
      return;
    }

    setCart(cart.map(item =>
      item.material.id === materialId
        ? { ...item, quantity }
        : item
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

    try {
      setSubmitting(true);

      const response = await fetch('/api/material-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            materialId: item.material.id,
            quantity: item.quantity,
          })),
          justification,
        }),
      });

      if (!response.ok) throw new Error('Erro ao enviar requisição');

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
            <Button
              variant={filter === 'TODOS' ? 'default' : 'outline'}
              onClick={() => setFilter('TODOS')}
            >
              Todos
            </Button>
            <Button
              variant={filter === 'PEDAGOGICO' ? 'default' : 'outline'}
              onClick={() => setFilter('PEDAGOGICO')}
            >
              Pedagógicos
            </Button>
            <Button
              variant={filter === 'HIGIENE' ? 'default' : 'outline'}
              onClick={() => setFilter('HIGIENE')}
            >
              Higiene
            </Button>
          </div>

          {/* Lista de Materiais */}
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
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.material.id} className="flex items-center gap-2 border-b pb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.material.name}</p>
                          <p className="text-xs text-muted-foreground">{item.material.unit}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.material.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.material.id, parseInt(e.target.value) || 1)}
                            className="w-16 text-center"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.material.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.material.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
