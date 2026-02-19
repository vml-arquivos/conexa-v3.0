import React, { useState, useEffect } from 'react';
import { Search, Package, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Material {
  id: string;
  name: string;
  category: 'HIGIENE' | 'PEDAGOGICO' | 'LIMPEZA' | 'ALIMENTACAO';
  icon: string;
  unit: string;
  description?: string;
}

interface MaterialSelection {
  materialId: string;
  quantity: number;
}

interface MaterialSelectorProps {
  onSelect: (selections: MaterialSelection[]) => void;
  initialSelections?: MaterialSelection[];
}

const MATERIAL_CATEGORIES = {
  HIGIENE: {
    label: 'Higiene',
    color: 'blue',
    icon: '🧼',
  },
  PEDAGOGICO: {
    label: 'Pedagógico',
    color: 'purple',
    icon: '📚',
  },
  LIMPEZA: {
    label: 'Limpeza',
    color: 'green',
    icon: '🧹',
  },
  ALIMENTACAO: {
    label: 'Alimentação',
    color: 'orange',
    icon: '🍽️',
  },
};

export default function MaterialSelector({ onSelect, initialSelections = [] }: MaterialSelectorProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('HIGIENE');
  const [selections, setSelections] = useState<Map<string, number>>(
    new Map(initialSelections.map((s) => [s.materialId, s.quantity]))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    filterMaterials();
  }, [searchTerm, selectedCategory, materials]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      // TODO: Chamar API real
      const mockMaterials: Material[] = [
        // Higiene
        { id: '1', name: 'Papel Higiênico', category: 'HIGIENE', icon: '🧻', unit: 'rolo', description: 'Papel higiênico folha dupla' },
        { id: '2', name: 'Sabonete Líquido', category: 'HIGIENE', icon: '🧼', unit: 'litro', description: 'Sabonete líquido neutro' },
        { id: '3', name: 'Álcool Gel', category: 'HIGIENE', icon: '🧴', unit: 'litro', description: 'Álcool gel 70%' },
        { id: '4', name: 'Toalha de Papel', category: 'HIGIENE', icon: '📄', unit: 'pacote', description: 'Toalha de papel interfolhada' },
        { id: '5', name: 'Fralda Descartável', category: 'HIGIENE', icon: '🧷', unit: 'pacote', description: 'Fralda descartável tamanho M' },
        { id: '6', name: 'Lenço Umedecido', category: 'HIGIENE', icon: '🧽', unit: 'pacote', description: 'Lenço umedecido sem álcool' },
        
        // Pedagógico
        { id: '7', name: 'Lápis de Cor', category: 'PEDAGOGICO', icon: '✏️', unit: 'caixa', description: 'Caixa com 12 cores' },
        { id: '8', name: 'Tinta Guache', category: 'PEDAGOGICO', icon: '🎨', unit: 'pote', description: 'Tinta guache 250ml' },
        { id: '9', name: 'Papel Sulfite A4', category: 'PEDAGOGICO', icon: '📃', unit: 'resma', description: 'Resma com 500 folhas' },
        { id: '10', name: 'Cola Branca', category: 'PEDAGOGICO', icon: '🧪', unit: 'frasco', description: 'Cola branca 90g' },
        { id: '11', name: 'Massinha de Modelar', category: 'PEDAGOGICO', icon: '🎭', unit: 'caixa', description: 'Caixa com 12 cores' },
        { id: '12', name: 'Pincel', category: 'PEDAGOGICO', icon: '🖌️', unit: 'unidade', description: 'Pincel nº 12' },
        
        // Limpeza
        { id: '13', name: 'Detergente', category: 'LIMPEZA', icon: '🧴', unit: 'litro', description: 'Detergente neutro' },
        { id: '14', name: 'Desinfetante', category: 'LIMPEZA', icon: '🧪', unit: 'litro', description: 'Desinfetante multiuso' },
        { id: '15', name: 'Pano de Limpeza', category: 'LIMPEZA', icon: '🧽', unit: 'unidade', description: 'Pano de microfibra' },
        { id: '16', name: 'Saco de Lixo', category: 'LIMPEZA', icon: '🗑️', unit: 'pacote', description: 'Saco de lixo 100L' },
        { id: '17', name: 'Vassoura', category: 'LIMPEZA', icon: '🧹', unit: 'unidade', description: 'Vassoura de nylon' },
        { id: '18', name: 'Rodo', category: 'LIMPEZA', icon: '🧽', unit: 'unidade', description: 'Rodo 40cm' },
        
        // Alimentação
        { id: '19', name: 'Copo Descartável', category: 'ALIMENTACAO', icon: '🥤', unit: 'pacote', description: 'Copo 200ml - pacote com 100' },
        { id: '20', name: 'Prato Descartável', category: 'ALIMENTACAO', icon: '🍽️', unit: 'pacote', description: 'Prato fundo - pacote com 50' },
        { id: '21', name: 'Guardanapo', category: 'ALIMENTACAO', icon: '🧻', unit: 'pacote', description: 'Guardanapo de papel' },
        { id: '22', name: 'Talher Descartável', category: 'ALIMENTACAO', icon: '🍴', unit: 'pacote', description: 'Kit com 50 unidades' },
        { id: '23', name: 'Touca Descartável', category: 'ALIMENTACAO', icon: '👒', unit: 'pacote', description: 'Touca descartável - pacote com 100' },
        { id: '24', name: 'Luva Descartável', category: 'ALIMENTACAO', icon: '🧤', unit: 'caixa', description: 'Luva descartável tamanho M' },
      ];
      setMaterials(mockMaterials);
      setFilteredMaterials(mockMaterials.filter((m) => m.category === selectedCategory));
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMaterials = () => {
    let filtered = materials.filter((m) => m.category === selectedCategory);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(term));
    }

    setFilteredMaterials(filtered);
  };

  const updateQuantity = (materialId: string, delta: number) => {
    const newSelections = new Map(selections);
    const current = newSelections.get(materialId) || 0;
    const newQuantity = Math.max(0, current + delta);

    if (newQuantity === 0) {
      newSelections.delete(materialId);
    } else {
      newSelections.set(materialId, newQuantity);
    }

    setSelections(newSelections);
    onSelect(
      Array.from(newSelections.entries()).map(([materialId, quantity]) => ({
        materialId,
        quantity,
      }))
    );
  };

  const getTotalItems = () => {
    return Array.from(selections.values()).reduce((sum, qty) => sum + qty, 0);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      HIGIENE: 'blue',
      PEDAGOGICO: 'purple',
      LIMPEZA: 'green',
      ALIMENTACAO: 'orange',
    };
    return colors[category as keyof typeof colors] || 'gray';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Carregando materiais...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com busca e resumo */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg">
          <ShoppingCart className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">{getTotalItems()} itens</span>
        </div>
      </div>

      {/* Tabs de categorias */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid grid-cols-4 bg-gray-800">
          {Object.entries(MATERIAL_CATEGORIES).map(([key, { label, icon }]) => (
            <TabsTrigger key={key} value={key} className="data-[state=active]:bg-gray-700">
              <span className="mr-2">{icon}</span>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.keys(MATERIAL_CATEGORIES).map((category) => (
          <TabsContent key={category} value={category} className="mt-4">
            {filteredMaterials.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Nenhum material encontrado
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMaterials.map((material) => {
                  const quantity = selections.get(material.id) || 0;
                  const isSelected = quantity > 0;
                  const color = getCategoryColor(material.category);

                  return (
                    <Card
                      key={material.id}
                      className={`transition-all duration-200 ${
                        isSelected
                          ? `bg-${color}-900/30 border-${color}-500`
                          : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{material.icon}</span>
                            <div>
                              <CardTitle className="text-sm text-white">{material.name}</CardTitle>
                              <p className="text-xs text-gray-400 mt-1">{material.description}</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {material.unit}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(material.id, -1)}
                              disabled={quantity === 0}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-bold text-white min-w-[2rem] text-center">
                              {quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(material.id, 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
