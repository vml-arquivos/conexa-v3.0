import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { ShoppingCart, Plus, Trash2, Send, AlertTriangle, Package } from 'lucide-react';
import { createMaterialRequest, type MaterialCategory, type MaterialRequestItem } from '../../api/material-request';
import { getErrorMessage } from '../../utils/errorMessage';

interface MaterialRequestFormProps {
  classroomId?: string;
  classroomName?: string;
  onSuccess?: () => void;
}

const CATEGORIAS: { value: MaterialCategory; label: string; icon: string; descricao: string }[] = [
  { value: 'HIGIENE', label: 'Higiene Pessoal', icon: '🧴', descricao: 'Sabonete, shampoo, fraldas, lenços umedecidos, etc.' },
  { value: 'LIMPEZA', label: 'Limpeza', icon: '🧹', descricao: 'Desinfetante, pano de chão, esponja, detergente, etc.' },
  { value: 'ALIMENTACAO', label: 'Alimentação', icon: '🍎', descricao: 'Itens alimentares, utensílios, potes, etc.' },
  { value: 'PEDAGOGICO', label: 'Pedagógico', icon: '📚', descricao: 'Papel, tinta, tesoura, cola, massinha, livros, etc.' },
  { value: 'OUTRO', label: 'Outro', icon: '📦', descricao: 'Outros materiais não categorizados acima.' },
];

const URGENCIAS = [
  { value: 'BAIXA', label: 'Baixa', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'MEDIA', label: 'Média', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'ALTA', label: 'Alta', color: 'bg-red-100 text-red-800 border-red-200' },
];

export function MaterialRequestForm({ classroomId, classroomName, onSuccess }: MaterialRequestFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categoria, setCategoria] = useState<MaterialCategory>('PEDAGOGICO');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [urgencia, setUrgencia] = useState<'BAIXA' | 'MEDIA' | 'ALTA'>('BAIXA');
  const [itens, setItens] = useState<MaterialRequestItem[]>([{ item: '', quantidade: 1, unidade: 'unidade(s)' }]);

  const addItem = () => {
    setItens([...itens, { item: '', quantidade: 1, unidade: 'unidade(s)' }]);
  };

  const removeItem = (index: number) => {
    if (itens.length === 1) return;
    setItens(itens.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof MaterialRequestItem, value: string | number) => {
    const updated = [...itens];
    updated[index] = { ...updated[index], [field]: value };
    setItens(updated);
  };

  const handleSubmit = async () => {
    if (!titulo.trim()) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Informe o título da requisição.' });
      return;
    }
    if (!justificativa.trim()) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Informe a justificativa da requisição.' });
      return;
    }
    const itensValidos = itens.filter(i => i.item.trim());
    if (itensValidos.length === 0) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Adicione pelo menos um item à requisição.' });
      return;
    }

    try {
      setLoading(true);
      await createMaterialRequest({
        classroomId,
        categoria,
        titulo,
        descricao,
        itens: itensValidos,
        justificativa,
        urgencia,
      });
      toast({
        title: 'Requisição enviada com sucesso!',
        description: 'Sua solicitação foi encaminhada para a Coordenação Pedagógica da unidade.',
      });
      // Resetar formulário
      setTitulo('');
      setDescricao('');
      setJustificativa('');
      setUrgencia('BAIXA');
      setItens([{ item: '', quantidade: 1, unidade: 'unidade(s)' }]);
      onSuccess?.();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar requisição',
        description: getErrorMessage(error, 'Não foi possível enviar a requisição. Tente novamente.'),
      });
    } finally {
      setLoading(false);
    }
  };

  const categoriaAtual = CATEGORIAS.find(c => c.value === categoria);

  return (
    <Card className="border-blue-100">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
          <ShoppingCart className="h-5 w-5 text-blue-600" />
          Nova Requisição de Material
        </CardTitle>
        <CardDescription>
          {classroomName
            ? `Solicitação para a turma: ${classroomName}. Será encaminhada à Coordenadora Pedagógica.`
            : 'Sua solicitação será encaminhada à Coordenadora Pedagógica da unidade.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Seleção de Categoria */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Categoria do Material *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {CATEGORIAS.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategoria(cat.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs font-medium transition-all ${
                  categoria === cat.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
          {categoriaAtual && (
            <p className="text-xs text-gray-500 mt-2 italic">{categoriaAtual.descricao}</p>
          )}
        </div>

        {/* Título */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Título da Requisição *</label>
          <input
            type="text"
            placeholder="Ex: Materiais de higiene para o berçário"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Itens */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">Itens Solicitados *</label>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Adicionar Item
            </Button>
          </div>
          <div className="space-y-2">
            {itens.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Nome do item"
                  value={item.item}
                  onChange={e => updateItem(index, 'item', e.target.value)}
                  className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <input
                  type="number"
                  min="1"
                  value={item.quantidade}
                  onChange={e => updateItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                  className="w-20 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-center"
                />
                <input
                  type="text"
                  placeholder="Unidade"
                  value={item.unidade || ''}
                  onChange={e => updateItem(index, 'unidade', e.target.value)}
                  className="w-28 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  disabled={itens.length === 1}
                  className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Justificativa */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Justificativa *</label>
          <textarea
            placeholder="Explique a necessidade dos materiais e como serão utilizados..."
            value={justificativa}
            onChange={e => setJustificativa(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Descrição adicional */}
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">Observações Adicionais (opcional)</label>
          <textarea
            placeholder="Informações complementares, marca preferida, especificações técnicas..."
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={2}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Urgência */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Nível de Urgência</label>
          <div className="flex gap-2">
            {URGENCIAS.map(urg => (
              <button
                key={urg.value}
                type="button"
                onClick={() => setUrgencia(urg.value as 'BAIXA' | 'MEDIA' | 'ALTA')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  urgencia === urg.value
                    ? urg.color + ' border-current ring-2 ring-offset-1 ring-current'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {urg.value === 'ALTA' && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                {urg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aviso sobre destinatário */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <Package className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            <strong>Destinatário:</strong> Esta requisição será enviada preferencialmente à{' '}
            <strong>Coordenadora Pedagógica</strong> da unidade, que poderá aprovar, ajustar ou encaminhar
            para a Direção e Administrativo conforme necessário.
          </p>
        </div>

        {/* Botão de envio */}
        <Button
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          onClick={handleSubmit}
          disabled={loading}
        >
          <Send className="h-4 w-4" />
          {loading ? 'Enviando...' : 'Enviar Requisição para Coordenação'}
        </Button>
      </CardContent>
    </Card>
  );
}
