import { useState } from 'react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Plus, Trash2, Send, CheckCircle } from 'lucide-react';
import { createMaterialRequest, type MaterialCategory, type MaterialRequestItem } from '../../api/material-request';
import { getErrorMessage } from '../../utils/errorMessage';

interface MaterialRequestFormProps {
  classroomId?: string;
  classroomName?: string;
  onSuccess?: () => void;
  /** Se true, exibe apenas categorias de Higiene Pessoal e Pedagógico */
  isProfessor?: boolean;
}

// ─── Categorias disponíveis para PROFESSOR: Pedagógico, Higiene e Outros ────────────────
const CATEGORIAS_PROFESSOR = [
  {
    value: 'PEDAGOGICO' as MaterialCategory,
    label: 'Material Pedagógico',
    icon: '📚',
    cor: 'border-blue-300 bg-blue-50',
    itensComuns: [
      'Papel sulfite', 'Tinta guache', 'Pincel', 'Tesoura sem ponta',
      'Cola bastão', 'EVA colorido', 'Cartolina', 'Canetinha',
      'Lápis de cor', 'Massa de modelar', 'Giz de cera', 'Papel crepom',
    ],
  },
  {
    value: 'HIGIENE' as MaterialCategory,
    label: 'Higiene Pessoal',
    icon: '🧴',
    cor: 'border-green-300 bg-green-50',
    itensComuns: [
      'Fraldas', 'Lenço umedecido', 'Sabonete líquido', 'Shampoo',
      'Creme dental', 'Escova de dente', 'Toalha de papel', 'Álcool gel',
      'Creme hidratante', 'Protetor solar',
    ],
  },
  {
    value: 'OUTRO' as MaterialCategory,
    label: 'Outros',
    icon: '📦',
    cor: 'border-gray-300 bg-gray-50',
    itensComuns: [],
  },
];

// ─── Categorias completas para coordenação/gestão ─────────────────────────────
const CATEGORIAS_GESTAO = [
  ...CATEGORIAS_PROFESSOR,
  {
    value: 'LIMPEZA' as MaterialCategory,
    label: 'Limpeza',
    icon: '🧹',
    cor: 'border-yellow-300 bg-yellow-50',
    itensComuns: ['Desinfetante', 'Pano de chão', 'Esponja', 'Detergente', 'Papel toalha', 'Saco de lixo', 'Álcool gel'],
  },
  {
    value: 'ALIMENTACAO' as MaterialCategory,
    label: 'Alimentação',
    icon: '🍎',
    cor: 'border-orange-300 bg-orange-50',
    itensComuns: ['Copo descartável', 'Prato descartável', 'Garfo plástico', 'Colher plástica', 'Guardanapo', 'Pote com tampa'],
  },
  {
    value: 'OUTRO' as MaterialCategory,
    label: 'Outro',
    icon: '📦',
    cor: 'border-gray-300 bg-gray-50',
    itensComuns: [],
  },
];

const URGENCIAS = [
  { value: 'BAIXA' as const, label: 'Sem pressa', desc: 'Pode esperar alguns dias', cor: 'border-green-300 bg-green-50 text-green-700' },
  { value: 'MEDIA' as const, label: 'Esta semana', desc: 'Preciso em breve', cor: 'border-yellow-300 bg-yellow-50 text-yellow-700' },
  { value: 'ALTA' as const, label: 'Urgente', desc: 'Preciso hoje ou amanhã', cor: 'border-red-300 bg-red-50 text-red-700' },
];

const JUSTIFICATIVAS_PRONTAS = [
  'Para as atividades pedagógicas da semana',
  'Estoque acabou na sala',
  'Atividade especial planejada',
  'Reposição de rotina mensal',
  'Necessidade identificada nas crianças',
  'Projeto temático em andamento',
];

export function MaterialRequestForm({ classroomId, classroomName, onSuccess, isProfessor = false }: MaterialRequestFormProps) {
  const CATEGORIAS = isProfessor ? CATEGORIAS_PROFESSOR : CATEGORIAS_GESTAO;

  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [categoria, setCategoria] = useState<MaterialCategory>('PEDAGOGICO');
  const [urgencia, setUrgencia] = useState<'BAIXA' | 'MEDIA' | 'ALTA'>('BAIXA');
  const [justificativa, setJustificativa] = useState('');
  const [justificativaCustom, setJustificativaCustom] = useState('');
  const [itens, setItens] = useState<MaterialRequestItem[]>([{ item: '', quantidade: 1, unidade: 'unidade(s)' }]);

  const categoriaAtual = CATEGORIAS.find(c => c.value === categoria) ?? CATEGORIAS[0];

  function adicionarItemPreset(nome: string) {
    const jaExiste = itens.some(i => i.item.toLowerCase() === nome.toLowerCase());
    if (jaExiste) { toast.error('Este item já foi adicionado'); return; }
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
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Pedido enviado!</h3>
        <p className="text-gray-500 text-sm mb-6">A coordenação vai analisar e te dar um retorno em breve.</p>
        {isProfessor && (
          <p className="text-xs text-blue-600 bg-blue-50 rounded-xl px-4 py-2 inline-block mb-4">
            📋 Lembrete: requisições são para <strong>Material Pedagógico</strong>, <strong>Higiene Pessoal</strong> e <strong>Outros</strong>
          </p>
        )}
        <Button
          onClick={() => { setEnviado(false); setEtapa(1); setItens([{ item: '', quantidade: 1, unidade: 'unidade(s)' }]); setJustificativa(''); setJustificativaCustom(''); }}
          className="rounded-xl bg-blue-500 hover:bg-blue-600"
        >
          Fazer outro pedido
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Banner informativo para professor */}
      {isProfessor && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <span className="text-lg">ℹ️</span>
          <p>Como professor(a), você pode solicitar <strong>Material Pedagógico</strong>, <strong>Higiene Pessoal</strong> e <strong>Outros</strong> para a sua turma.</p>
        </div>
      )}

      {/* Indicador de etapas */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${etapa >= n ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{n}</div>
            {n < 3 && <div className={`h-1 w-8 rounded-full ${etapa > n ? 'bg-blue-500' : 'bg-gray-100'}`} />}
          </div>
        ))}
        <span className="text-sm text-gray-500 ml-2">
          {etapa === 1 ? 'Que tipo de material?' : etapa === 2 ? 'Quais itens?' : 'Qual a urgência?'}
        </span>
      </div>

      {/* ETAPA 1: Categoria */}
      {etapa === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Toque na categoria do material que você precisa:</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIAS.map(cat => (
              <button
                key={cat.value}
                onClick={() => { setCategoria(cat.value); setEtapa(2); }}
                className={`p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-95 ${categoria === cat.value ? cat.cor + ' border-opacity-100' : 'bg-white border-gray-100 hover:border-blue-200'}`}
              >
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
          <button onClick={() => setEtapa(1)} className="text-sm text-blue-500 hover:text-blue-700">← Voltar</button>

          {/* Itens comuns para clique rápido */}
          {categoriaAtual.itensComuns.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Toque para adicionar rapidamente:</p>
              <div className="flex flex-wrap gap-2">
                {categoriaAtual.itensComuns.map(nome => {
                  const jaAdicionado = itens.some(i => i.item.toLowerCase() === nome.toLowerCase() && i.item.trim());
                  return (
                    <button
                      key={nome}
                      onClick={() => adicionarItemPreset(nome)}
                      className={`px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-all ${jaAdicionado ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                    >
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
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addItem}
              className="w-full p-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Adicionar outro item
            </button>
          </div>

          <Button
            onClick={() => { if (itens.some(i => i.item.trim())) setEtapa(3); else toast.error('Adicione pelo menos um item'); }}
            className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-600 font-bold"
          >
            Continuar
          </Button>
        </div>
      )}

      {/* ETAPA 3: Urgência + Motivo */}
      {etapa === 3 && (
        <div className="space-y-4">
          <button onClick={() => setEtapa(2)} className="text-sm text-blue-500 hover:text-blue-700">← Voltar</button>

          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Qual a urgência?</p>
            <div className="grid grid-cols-3 gap-3">
              {URGENCIAS.map(u => (
                <button
                  key={u.value}
                  onClick={() => setUrgencia(u.value)}
                  className={`p-3 rounded-2xl border-2 text-center transition-all ${urgencia === u.value ? u.cor : 'bg-white border-gray-100 hover:border-gray-300'}`}
                >
                  <p className="font-bold text-sm">{u.label}</p>
                  <p className="text-xs mt-0.5 opacity-70">{u.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Por que você precisa?</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {JUSTIFICATIVAS_PRONTAS.map(j => (
                <button
                  key={j}
                  onClick={() => { setJustificativa(j); setJustificativaCustom(''); }}
                  className={`px-3 py-1.5 rounded-full border-2 text-sm transition-all ${justificativa === j ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                >
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
            <p className="text-xs text-gray-500 mt-1">
              {itens.filter(i => i.item.trim()).length} item(ns) · {URGENCIAS.find(u => u.value === urgencia)?.label}
            </p>
            {classroomName && <p className="text-xs text-gray-500">Turma: {classroomName}</p>}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 font-bold text-base"
          >
            <Send className="h-5 w-5 mr-2" />
            {loading ? 'Enviando...' : 'Enviar pedido'}
          </Button>
        </div>
      )}
    </div>
  );
}
