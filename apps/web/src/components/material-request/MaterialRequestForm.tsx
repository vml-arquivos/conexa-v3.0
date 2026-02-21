import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Trash2, Send, CheckCircle } from 'lucide-react';
import { createMaterialRequest, type MaterialCategory, type MaterialRequestItem } from '../../api/material-request';
import { getErrorMessage } from '../../utils/errorMessage';

interface MaterialRequestFormProps {
  classroomId?: string;
  classroomName?: string;
  onSuccess?: () => void;
}

const CATEGORIAS = [
  { value: 'PEDAGOGICO' as MaterialCategory, label: 'Material de Aula', icon: '📚', cor: 'border-blue-300 bg-blue-50',
    itensComuns: ['Papel sulfite', 'Tinta guache', 'Tesoura sem ponta', 'Cola bastao', 'Massinha de modelar', 'Giz de cera', 'Pincel', 'EVA colorido'] },
  { value: 'HIGIENE' as MaterialCategory, label: 'Higiene', icon: '🧴', cor: 'border-green-300 bg-green-50',
    itensComuns: ['Sabonete liquido', 'Shampoo', 'Fralda descartavel', 'Lenco umedecido', 'Creme hidratante', 'Escova de dente', 'Pasta de dente'] },
  { value: 'LIMPEZA' as MaterialCategory, label: 'Limpeza', icon: '🧹', cor: 'border-yellow-300 bg-yellow-50',
    itensComuns: ['Desinfetante', 'Pano de chao', 'Esponja', 'Detergente', 'Papel toalha', 'Saco de lixo', 'Alcool gel'] },
  { value: 'ALIMENTACAO' as MaterialCategory, label: 'Alimentacao', icon: '🍎', cor: 'border-orange-300 bg-orange-50',
    itensComuns: ['Copo descartavel', 'Prato descartavel', 'Garfo plastico', 'Colher plastica', 'Guardanapo', 'Pote com tampa'] },
  { value: 'OUTRO' as MaterialCategory, label: 'Outro', icon: '📦', cor: 'border-gray-300 bg-gray-50',
    itensComuns: [] },
];

const URGENCIAS = [
  { value: 'BAIXA' as const, label: 'Sem pressa', desc: 'Pode esperar alguns dias', cor: 'border-green-300 bg-green-50 text-green-700' },
  { value: 'MEDIA' as const, label: 'Esta semana', desc: 'Preciso em breve', cor: 'border-yellow-300 bg-yellow-50 text-yellow-700' },
  { value: 'ALTA' as const, label: 'Urgente', desc: 'Preciso hoje ou amanha', cor: 'border-red-300 bg-red-50 text-red-700' },
];

const JUSTIFICATIVAS_PRONTAS = [
  'Para as atividades pedagogicas da semana',
  'Estoque acabou na sala',
  'Atividade especial planejada',
  'Reposicao de rotina mensal',
  'Necessidade identificada nas criancas',
  'Projeto tematico em andamento',
];

export function MaterialRequestForm({ classroomId, classroomName, onSuccess }: MaterialRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [etapa, setEtapa] = useState<1|2|3>(1);
  const [categoria, setCategoria] = useState<MaterialCategory>('PEDAGOGICO');
  const [urgencia, setUrgencia] = useState<'BAIXA'|'MEDIA'|'ALTA'>('BAIXA');
  const [justificativa, setJustificativa] = useState('');
  const [justificativaCustom, setJustificativaCustom] = useState('');
  const [itens, setItens] = useState<MaterialRequestItem[]>([{ item: '', quantidade: 1, unidade: 'unidade(s)' }]);

  const categoriaAtual = CATEGORIAS.find(c => c.value === categoria)!;

  function adicionarItemPreset(nome: string) {
    const jaExiste = itens.some(i => i.item.toLowerCase() === nome.toLowerCase());
    if (jaExiste) { toast.error('Este item ja foi adicionado'); return; }
    const vazio = itens.findIndex(i => !i.item.trim());
    if (vazio >= 0) {
      const updated = [...itens];
      updated[vazio] = { ...updated[vazio], item: nome };
      setItens(updated);
    } else {
      setItens([...itens, { item: nome, quantidade: 1, unidade: 'unidade(s)' }]);
    }
  }

  function addItem() { setItens([...itens, { item: '', quantidade: 1, unidade: 'unidade(s)' }]); }
  function removeItem(idx: number) { if (itens.length > 1) setItens(itens.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: keyof MaterialRequestItem, val: string | number) {
    const u = [...itens]; u[idx] = { ...u[idx], [field]: val }; setItens(u);
  }

  async function handleSubmit() {
    const itensValidos = itens.filter(i => i.item.trim());
    if (itensValidos.length === 0) { toast.error('Adicione pelo menos um item'); return; }
    const motivo = justificativa || justificativaCustom;
    if (!motivo.trim()) { toast.error('Informe o motivo do pedido'); return; }
    try {
      setLoading(true);
      await createMaterialRequest({
        classroomId,
        categoria,
        titulo: `${categoriaAtual.label} - ${new Date().toLocaleDateString('pt-BR')}`,
        descricao: '',
        itens: itensValidos,
        justificativa: motivo,
        urgencia,
      });
      setEnviado(true);
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Erro ao enviar pedido. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  if (enviado) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-500"/>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Pedido enviado!</h3>
        <p className="text-gray-500 text-sm mb-6">A coordenacao vai analisar e te dar um retorno em breve.</p>
        <Button onClick={() => { setEnviado(false); setEtapa(1); setItens([{ item: '', quantidade: 1, unidade: 'unidade(s)' }]); setJustificativa(''); setJustificativaCustom(''); }}
          className="rounded-xl bg-blue-500 hover:bg-blue-600">
          Fazer outro pedido
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Indicador de etapas */}
      <div className="flex items-center gap-2">
        {[1,2,3].map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${etapa >= n ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{n}</div>
            {n < 3 && <div className={`h-1 w-8 rounded-full ${etapa > n ? 'bg-blue-500' : 'bg-gray-100'}`}/>}
          </div>
        ))}
        <span className="text-sm text-gray-500 ml-2">
          {etapa === 1 ? 'Que tipo de material?' : etapa === 2 ? 'Quais itens?' : 'Qual a urgencia?'}
        </span>
      </div>

      {/* ETAPA 1: Categoria */}
      {etapa === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Toque na categoria do material que voce precisa:</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIAS.map(cat => (
              <button key={cat.value} onClick={() => { setCategoria(cat.value); setEtapa(2); }}
                className={`p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-95 ${categoria === cat.value ? cat.cor + ' border-opacity-100' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                <span className="text-3xl block mb-2">{cat.icon}</span>
                <p className="font-bold text-sm text-gray-800">{cat.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ETAPA 2: Itens */}
      {etapa === 2 && (
        <div className="space-y-4">
          <button onClick={() => setEtapa(1)} className="text-sm text-blue-500 hover:text-blue-700">
            Voltar
          </button>

          {/* Itens comuns para clique rapido */}
          {categoriaAtual.itensComuns.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Toque para adicionar rapidamente:</p>
              <div className="flex flex-wrap gap-2">
                {categoriaAtual.itensComuns.map(nome => {
                  const jaAdicionado = itens.some(i => i.item.toLowerCase() === nome.toLowerCase() && i.item.trim());
                  return (
                    <button key={nome} onClick={() => adicionarItemPreset(nome)}
                      className={`px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-all ${jaAdicionado ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                      {jaAdicionado ? '✓ ' : '+ '}{nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista de itens */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-600">Itens do pedido:</p>
            {itens.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border-2 border-gray-100">
                <input
                  type="text"
                  placeholder="Nome do item"
                  value={item.item}
                  onChange={e => updateItem(idx, 'item', e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                  <button onClick={() => updateItem(idx, 'quantidade', Math.max(1, Number(item.quantidade) - 1))}
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-blue-500 font-bold">-</button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantidade}</span>
                  <button onClick={() => updateItem(idx, 'quantidade', Number(item.quantidade) + 1)}
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-blue-500 font-bold">+</button>
                </div>
                {itens.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4"/>
                  </button>
                )}
              </div>
            ))}
            <button onClick={addItem}
              className="w-full p-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2">
              <Plus className="h-4 w-4"/> Adicionar outro item
            </button>
          </div>

          <Button onClick={() => { if (itens.some(i => i.item.trim())) setEtapa(3); else toast.error('Adicione pelo menos um item'); }}
            className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-600 font-bold">
            Continuar
          </Button>
        </div>
      )}

      {/* ETAPA 3: Urgencia + Motivo */}
      {etapa === 3 && (
        <div className="space-y-4">
          <button onClick={() => setEtapa(2)} className="text-sm text-blue-500 hover:text-blue-700">
            Voltar
          </button>

          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Qual a urgencia?</p>
            <div className="grid grid-cols-3 gap-3">
              {URGENCIAS.map(u => (
                <button key={u.value} onClick={() => setUrgencia(u.value)}
                  className={`p-3 rounded-2xl border-2 text-center transition-all ${urgencia === u.value ? u.cor : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                  <p className="font-bold text-sm">{u.label}</p>
                  <p className="text-xs mt-0.5 opacity-70">{u.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Por que voce precisa?</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {JUSTIFICATIVAS_PRONTAS.map(j => (
                <button key={j} onClick={() => { setJustificativa(j); setJustificativaCustom(''); }}
                  className={`px-3 py-1.5 rounded-full border-2 text-sm transition-all ${justificativa === j ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                  {j}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Ou escreva o motivo aqui..."
              value={justificativaCustom}
              onChange={e => { setJustificativaCustom(e.target.value); setJustificativa(''); }}
              className="w-full border-2 rounded-xl p-3 text-sm resize-none"
              rows={3}
            />
          </div>

          {/* Resumo */}
          <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-100">
            <p className="text-xs font-semibold text-blue-600 mb-2">Resumo do pedido:</p>
            <p className="text-sm font-bold">{categoriaAtual.icon} {categoriaAtual.label}</p>
            <p className="text-xs text-gray-500 mt-1">{itens.filter(i=>i.item.trim()).length} item(ns) · {URGENCIAS.find(u=>u.value===urgencia)?.label}</p>
            {classroomName && <p className="text-xs text-gray-500">Turma: {classroomName}</p>}
          </div>

          <Button onClick={handleSubmit} disabled={loading}
            className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 font-bold text-base">
            <Send className="h-5 w-5 mr-2"/>
            {loading ? 'Enviando...' : 'Enviar pedido'}
          </Button>
        </div>
      )}
    </div>
  );
}
