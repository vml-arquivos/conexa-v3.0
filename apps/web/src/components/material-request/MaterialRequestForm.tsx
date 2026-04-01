/**
 * MaterialRequestForm — redesign
 *
 * UX:
 * - Uma única página, sem etapas/navegação
 * - Cada linha de item tem: select de categoria + select de produto + quantidade
 * - Produtos filtrados pela categoria selecionada na mesma linha
 * - Possível pedir de múltiplas categorias no mesmo pedido
 * - Catálogo carregado uma única vez (GET /materials/catalog sem filtro)
 * - Fallback para input manual quando catálogo vazio ou erro
 * - Lógica de fralda preservada
 */
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Plus, Trash2, Send, CheckCircle, Loader2 } from 'lucide-react';
import { createMaterialRequest, type MaterialCategory, type MaterialRequestItem } from '../../api/material-request';
import { getErrorMessage } from '../../utils/errorMessage';
import http from '../../api/http';

interface MaterialRequestFormProps {
  classroomId?: string;
  classroomName?: string;
  onSuccess?: () => void;
  /** Se true, exibe apenas categorias de Higiene Pessoal e Pedagógico */
  isProfessor?: boolean;
}

export interface CatalogMaterial {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string | null;
  referencePrice: number | null;
}

// ─── Categorias ───────────────────────────────────────────────────────────────
const CATEGORIAS_PROFESSOR: { value: MaterialCategory; label: string }[] = [
  { value: 'PEDAGOGICO', label: 'Material Pedagógico' },
  { value: 'HIGIENE',    label: 'Higiene Pessoal' },
  { value: 'OUTRO',      label: 'Outros' },
];

const CATEGORIAS_GESTAO: { value: MaterialCategory; label: string }[] = [
  ...CATEGORIAS_PROFESSOR,
  { value: 'LIMPEZA',     label: 'Limpeza' },
  { value: 'ALIMENTACAO', label: 'Alimentação' },
];

const URGENCIAS = [
  { value: 'BAIXA' as const, label: 'Sem pressa' },
  { value: 'MEDIA' as const, label: 'Esta semana' },
  { value: 'ALTA'  as const, label: 'Urgente' },
];

const JUSTIFICATIVAS_PRONTAS = [
  'Para as atividades pedagógicas da semana',
  'Estoque acabou na sala',
  'Atividade especial planejada',
  'Reposição de rotina mensal',
  'Necessidade identificada nas crianças',
  'Projeto temático em andamento',
];

// ─── Tipo de item ─────────────────────────────────────────────────────────────
interface RequisicaoItem extends MaterialRequestItem {
  categoria: MaterialCategory;
  materialId?: string | null;
}

function itemVazio(categoria: MaterialCategory = 'PEDAGOGICO'): RequisicaoItem {
  return { categoria, item: '', quantidade: 1, unidade: 'unidade(s)', materialId: null };
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function MaterialRequestForm({ classroomId, classroomName, onSuccess, isProfessor = false }: MaterialRequestFormProps) {
  const CATEGORIAS = isProfessor ? CATEGORIAS_PROFESSOR : CATEGORIAS_GESTAO;

  // Catálogo completo carregado uma única vez
  const [catalog, setCatalog] = useState<CatalogMaterial[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    http.get('/materials/catalog')
      .then(res => {
        if (!cancelled) setCatalog(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setCatalogError('Catálogo indisponível — você pode digitar o nome do item.');
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const [loading, setLoading]               = useState(false);
  const [enviado, setEnviado]               = useState(false);
  const [urgencia, setUrgencia]             = useState<'BAIXA' | 'MEDIA' | 'ALTA'>('BAIXA');
  const [justificativa, setJustificativa]   = useState('');
  const [justificativaCustom, setJustificativaCustom] = useState('');
  const [itens, setItens]                   = useState<RequisicaoItem[]>([itemVazio('PEDAGOGICO')]);

  // ─── Helpers de item ───────────────────────────────────────────────────────
  function addItem() {
    // Sugere a mesma categoria do último item
    const ultima = itens[itens.length - 1]?.categoria ?? 'PEDAGOGICO';
    setItens(prev => [...prev, itemVazio(ultima)]);
  }

  function removeItem(idx: number) {
    if (itens.length > 1) setItens(prev => prev.filter((_, i) => i !== idx));
  }

  function updateCategoria(idx: number, cat: MaterialCategory) {
    setItens(prev => {
      const u = [...prev];
      // Ao trocar categoria, limpa produto e materialId mas mantém quantidade
      u[idx] = { ...u[idx], categoria: cat, item: '', materialId: null, unidade: 'unidade(s)' };
      return u;
    });
  }

  function updateProduto(idx: number, materialId: string) {
    const mat = catalog.find(m => m.id === materialId);
    if (!mat) return;
    setItens(prev => {
      const u = [...prev];
      u[idx] = {
        ...u[idx],
        item: mat.name,
        materialId: mat.id,
        unidade: mat.unit ?? 'unidade(s)',
      };
      return u;
    });
  }

  function updateItemManual(idx: number, nome: string) {
    setItens(prev => {
      const u = [...prev];
      u[idx] = { ...u[idx], item: nome, materialId: null };
      return u;
    });
  }

  function updateQtd(idx: number, delta: number) {
    setItens(prev => {
      const u = [...prev];
      u[idx] = { ...u[idx], quantidade: Math.max(1, (u[idx].quantidade ?? 1) + delta) };
      return u;
    });
  }

  function updateUnidade(idx: number, unidade: string) {
    setItens(prev => {
      const u = [...prev];
      u[idx] = { ...u[idx], unidade };
      return u;
    });
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const itensValidos = itens.filter(i => i.item.trim());
    if (itensValidos.length === 0) { toast.error('Adicione pelo menos um item'); return; }
    const motivo = justificativa || justificativaCustom;
    if (!motivo.trim()) { toast.error('Informe o motivo do pedido'); return; }

    // Agrupa por categoria e cria uma requisição por categoria
    // (o backend aceita uma categoria por requisição)
    const porCategoria = new Map<MaterialCategory, RequisicaoItem[]>();
    for (const it of itensValidos) {
      const arr = porCategoria.get(it.categoria) ?? [];
      arr.push(it);
      porCategoria.set(it.categoria, arr);
    }

    try {
      setLoading(true);
      for (const [cat, its] of porCategoria) {
        const catLabel = CATEGORIAS.find(c => c.value === cat)?.label ?? cat;
        await createMaterialRequest({
          classroomId,
          categoria: cat,
          titulo: `${catLabel} - ${new Date().toLocaleDateString('pt-BR')}`,
          descricao: '',
          itens: its.map(i => ({ item: i.item, quantidade: i.quantidade, unidade: i.unidade, materialId: i.materialId })),
          justificativa: motivo,
          urgencia,
        });
      }
      setEnviado(true);
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Erro ao enviar pedido. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  // ─── Tela de sucesso ───────────────────────────────────────────────────────
  if (enviado) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Pedido enviado!</h3>
        <p className="text-gray-500 text-sm mb-6">A coordenação vai analisar e te dar um retorno em breve.</p>
        <Button
          onClick={() => {
            setEnviado(false);
            setItens([itemVazio('PEDAGOGICO')]);
            setJustificativa('');
            setJustificativaCustom('');
          }}
          className="rounded-xl bg-blue-500 hover:bg-blue-600"
        >
          Fazer outro pedido
        </Button>
      </div>
    );
  }

  // ─── Formulário principal ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Banner informativo */}
      {isProfessor && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <span className="text-lg">ℹ️</span>
          <p>Solicite <strong>Material Pedagógico</strong>, <strong>Higiene Pessoal</strong> e <strong>Outros</strong> para a sua turma. Você pode misturar categorias no mesmo pedido.</p>
        </div>
      )}

      {/* Status do catálogo */}
      {catalogLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Carregando catálogo de materiais...
        </div>
      )}
      {!catalogLoading && catalog.length > 0 && (
        <p className="text-xs text-green-600 font-medium">
          ✓ {catalog.length} produtos disponíveis no catálogo
        </p>
      )}
      {catalogError && (
        <p className="text-xs text-amber-600">{catalogError}</p>
      )}

      {/* ── Lista de itens ── */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">Itens do pedido:</p>

        {itens.map((item, idx) => {
          const produtosDaCategoria = catalog.filter(m => m.category === item.categoria);
          const isFralda = /fralda/i.test(item.item);

          return (
            <div
              key={idx}
              className={`p-3 rounded-xl border-2 space-y-3 ${item.materialId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}
            >
              {/* Linha 1: Categoria + Produto + Qtd + Remover */}
              <div className="flex flex-wrap items-center gap-2">

                {/* Select de Categoria */}
                <select
                  value={item.categoria}
                  onChange={e => updateCategoria(idx, e.target.value as MaterialCategory)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 shrink-0"
                >
                  {CATEGORIAS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>

                {/* Select de Produto (ou input manual se catálogo vazio) */}
                {!catalogLoading && produtosDaCategoria.length > 0 ? (
                  <select
                    value={item.materialId ?? ''}
                    onChange={e => {
                      if (e.target.value === '') {
                        updateItemManual(idx, '');
                      } else {
                        updateProduto(idx, e.target.value);
                      }
                    }}
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">— Selecione o produto —</option>
                    {produtosDaCategoria.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  /* Fallback: input manual */
                  <input
                    type="text"
                    placeholder={catalogLoading ? 'Carregando...' : 'Nome do item'}
                    value={item.item}
                    onChange={e => updateItemManual(idx, e.target.value)}
                    disabled={catalogLoading}
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                )}

                {/* Quantidade */}
                <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2 py-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQtd(idx, -1)}
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-blue-500 font-bold text-lg leading-none"
                  >−</button>
                  <span className="w-7 text-center text-sm font-bold">{item.quantidade}</span>
                  <button
                    type="button"
                    onClick={() => updateQtd(idx, +1)}
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-blue-500 font-bold text-lg leading-none"
                  >+</button>
                </div>

                {/* Remover */}
                {itens.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-red-400 hover:text-red-600 shrink-0"
                    title="Remover item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Unidade do catálogo */}
              {item.materialId && item.unidade && item.unidade !== 'unidade(s)' && (
                <p className="text-xs text-blue-600 pl-1">Unidade: {item.unidade}</p>
              )}

              {/* Seletor de tamanho de fralda */}
              {isFralda && (
                <div className="flex items-center gap-2 flex-wrap pl-1">
                  <span className="text-xs text-green-700 font-semibold">🧷 Tamanho:</span>
                  {['RN', 'P', 'M', 'G', 'XG', 'XXG', 'XXXG'].map(tam => (
                    <button
                      key={tam}
                      type="button"
                      onClick={() => updateUnidade(idx, tam)}
                      className={`px-2 py-0.5 rounded-full text-xs font-bold border-2 transition-all ${
                        item.unidade === tam
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {tam}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Botão adicionar item */}
        <button
          type="button"
          onClick={addItem}
          className="w-full p-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> Adicionar outro item
        </button>
      </div>

      {/* ── Urgência ── */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Urgência:</p>
        <div className="flex gap-2">
          {URGENCIAS.map(u => (
            <button
              key={u.value}
              type="button"
              onClick={() => setUrgencia(u.value)}
              className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                urgencia === u.value
                  ? u.value === 'BAIXA'
                    ? 'bg-green-100 border-green-400 text-green-700'
                    : u.value === 'MEDIA'
                    ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                    : 'bg-red-100 border-red-400 text-red-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Motivo ── */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Por que você precisa?</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {JUSTIFICATIVAS_PRONTAS.map(j => (
            <button
              key={j}
              type="button"
              onClick={() => { setJustificativa(j); setJustificativaCustom(''); }}
              className={`px-3 py-1.5 rounded-full border-2 text-sm transition-all ${
                justificativa === j
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {j}
            </button>
          ))}
        </div>
        <textarea
          placeholder="Ou escreva o motivo aqui..."
          value={justificativaCustom}
          onChange={e => { setJustificativaCustom(e.target.value); setJustificativa(''); }}
          className="w-full border-2 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          rows={3}
        />
      </div>

      {/* ── Resumo ── */}
      {itens.some(i => i.item.trim()) && (
        <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-100">
          <p className="text-xs font-semibold text-blue-600 mb-2">Resumo do pedido:</p>
          {Array.from(new Set(itens.filter(i => i.item.trim()).map(i => i.categoria))).map(cat => {
            const catLabel = CATEGORIAS.find(c => c.value === cat)?.label ?? cat;
            const catItens = itens.filter(i => i.categoria === cat && i.item.trim());
            return (
              <div key={cat} className="mb-1">
                <p className="text-sm font-bold text-gray-700">{catLabel}</p>
                {catItens.map((it, i) => (
                  <p key={i} className="text-xs text-gray-500 pl-2">· {it.item} × {it.quantidade}</p>
                ))}
              </div>
            );
          })}
          <p className="text-xs text-gray-500 mt-2">
            {itens.filter(i => i.item.trim()).length} item(ns) · {URGENCIAS.find(u => u.value === urgencia)?.label}
          </p>
          {classroomName && <p className="text-xs text-gray-500">Turma: {classroomName}</p>}
        </div>
      )}

      {/* ── Botão enviar ── */}
      <Button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 font-bold text-base"
      >
        <Send className="h-5 w-5 mr-2" />
        {loading ? 'Enviando...' : 'Enviar pedido'}
      </Button>
    </div>
  );
}
