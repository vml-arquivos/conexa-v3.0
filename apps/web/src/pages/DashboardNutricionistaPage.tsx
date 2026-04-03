/**
 * Dashboard da Nutricionista
 * Acesso: UNIDADE_NUTRICIONISTA
 * Abas: Dietas/Restrições | Pedidos de Alimentação | Resumo por Turma | Cardápio | Nutrição
 */
import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/ui/PageShell';
import http from '../api/http';
import { useAuth } from '../app/AuthProvider';
import {
  Apple, AlertTriangle, ShoppingCart, Users, Search,
  RefreshCw, Plus, ChevronDown, ChevronUp, Filter,
  CheckCircle, Clock, XCircle, Printer, BookOpen,
  BarChart2, ChevronLeft, ChevronRight, Save, Trash2,
  Settings, GripVertical,
} from 'lucide-react';
import {
  listCardapios, createCardapio, upsertRefeicao, deleteCardapio, calcularNutricao,
  getSemanaAtual, getSemanaAnterior, getProximaSemana, formatarSemana,
  DIAS_SEMANA, TIPOS_REFEICAO, DIA_SEMANA_LABELS, TIPO_REFEICAO_LABELS,
  type Cardapio, type CardapioItem, type DiaSemana, type TipoRefeicao, type NutricaoResponse,
} from '../api/cardapio';
import {
  listAlimentos, agruparPorCategoria, calcularMacrosPorQuantidade,
  type Alimento,
} from '../api/alimentos';
import {
  listTodasConfiguracoesRefeicao, createConfiguracaoRefeicao,
  updateConfiguracaoRefeicao, removeConfiguracaoRefeicao,
  type ConfiguracaoRefeicao,
} from '../api/configuracao-refeicao';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface DietaryRestriction {
  id: string;
  type: string;
  name: string;
  description?: string;
  severity?: string;
  allowedFoods?: string;
  forbiddenFoods?: string;
  isActive: boolean;
  child: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    enrollments: { classroom: { id: string; name: string } }[];
  };
}

interface ItemPedido {
  id: string;
  categoria: string;
  descricao: string;
  quantidade: number;
  unidadeMedida?: string;
  custoEstimado?: number;
}

interface PedidoCompra {
  id: string;
  mesReferencia: string;
  status: string;
  observacoes?: string;
  criadoEm: string;
  unit?: { id: string; name: string };
  itens: ItemPedido[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  severa:   { label: 'Severa',   color: 'text-red-700',    bg: 'bg-red-100',    icon: '🚨' },
  moderada: { label: 'Moderada', color: 'text-orange-700', bg: 'bg-orange-100', icon: '⚠️' },
  leve:     { label: 'Leve',     color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '⚡' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  RASCUNHO:   { label: 'Rascunho',   color: 'text-gray-600',   bg: 'bg-gray-100'   },
  ENVIADO:    { label: 'Enviado',    color: 'text-blue-700',   bg: 'bg-blue-100'   },
  EM_ANALISE: { label: 'Em Análise', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  APROVADO:   { label: 'Aprovado',   color: 'text-green-700',  bg: 'bg-green-100'  },
  COMPRADO:   { label: 'Comprado',   color: 'text-purple-700', bg: 'bg-purple-100' },
  EM_ENTREGA: { label: 'Em Entrega', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  ENTREGUE:   { label: 'Entregue',   color: 'text-green-800',  bg: 'bg-green-200'  },
  CANCELADO:  { label: 'Cancelado',  color: 'text-red-700',    bg: 'bg-red-100'    },
};

const TYPE_LABEL: Record<string, string> = {
  ALERGIA: 'Alergia', INTOLERANCIA: 'Intolerância',
  PREFERENCIA: 'Preferência', RELIGIOSA: 'Religiosa',
  MEDICA: 'Médica', OUTRA: 'Outra',
};

function calcIdade(dob: string): string {
  const hoje = new Date();
  const nasc = new Date(dob);
  const anos = hoje.getFullYear() - nasc.getFullYear();
  const meses = hoje.getMonth() - nasc.getMonth();
  if (anos === 0) return `${meses < 0 ? 0 : meses} meses`;
  return `${anos} ano${anos !== 1 ? 's' : ''}`;
}

// ─── Sub-componente: Aba Cardápio ─────────────────────────────────────────────
function AbaCardapio({ unitId }: { unitId: string }) {
  const [semana, setSemana] = useState(getSemanaAtual);
  const [cardapio, setCardapio] = useState<Cardapio | null>(null);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Estado do formulário de refeição
  const [editando, setEditando] = useState<{ dia: DiaSemana; tipo: TipoRefeicao } | null>(null);
  const [itensForm, setItensForm] = useState<Partial<CardapioItem>[]>([]);
  const [obsForm, setObsForm] = useState('');

  // Seletor duplo encadeado: categoria → alimento
  const [categoriaSel, setCategoriaSel] = useState('');
  const [alimentoSel,  setAlimentoSel]  = useState('');
  const [pesoInput,    setPesoInput]    = useState('');

  // Banco de alimentos
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [loadingAlimentos, setLoadingAlimentos] = useState(false);
  const gruposAlimentos = agruparPorCategoria(alimentos);

  // Alimentos filtrados pela categoria selecionada no seletor
  const alimentosDaCategoria = categoriaSel
    ? alimentos
        .filter((a) => a.categoria === categoriaSel)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    : [];

  // Objeto do alimento selecionado no seletor (preview de macros)
  const alimentoAtual = alimentos.find((a) => a.id === alimentoSel) ?? null;

  // Carrega alimentos ao montar
  useEffect(() => {
    setLoadingAlimentos(true);
    listAlimentos({ limit: 500 })
      .then((res) => setAlimentos(res.data))
      .catch(() => setAlimentos([]))
      .finally(() => setLoadingAlimentos(false));
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const res = await listCardapios({ unitId, semana, limit: 1 });
      setCardapio(res.data[0] ?? null);
    } catch {
      setCardapio(null);
    } finally {
      setLoading(false);
    }
  }, [unitId, semana]);

  useEffect(() => { carregar(); }, [carregar]);

  const criarCardapio = async () => {
    setSalvando(true);
    setErro('');
    try {
      const novo = await createCardapio({ unitId, semana, titulo: `Cardápio ${formatarSemana(semana)}` });
      setCardapio(novo);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao criar cardápio.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirEdicao = (dia: DiaSemana, tipo: TipoRefeicao) => {
    const ref = cardapio?.refeicoes?.find((r) => r.diaSemana === dia && r.tipoRefeicao === tipo);
    setItensForm(ref?.itens?.length ? ref.itens.map((i) => ({ ...i })) : []);
    setObsForm(ref?.observacoes ?? '');
    setEditando({ dia, tipo });
  };

  const salvarRefeicao = async () => {
    if (!cardapio || !editando) return;
    const itensFiltrados = itensForm.filter((i) => i.nome?.trim());
    if (itensFiltrados.length === 0) return;
    setSalvando(true);
    setErro('');
    try {
      const atualizado = await upsertRefeicao(cardapio.id, {
        diaSemana: editando.dia,
        tipoRefeicao: editando.tipo,
        observacoes: obsForm || undefined,
        itens: itensFiltrados.map((i) => ({
          nome: i.nome!,
          quantidade: i.quantidade ?? undefined,
          unidade: i.unidade ?? undefined,
          calorias: i.calorias ?? undefined,
          proteinas: i.proteinas ?? undefined,
          carboidratos: i.carboidratos ?? undefined,
          gorduras: i.gorduras ?? undefined,
          fibras: i.fibras ?? undefined,
          sodio: i.sodio ?? undefined,
        })),
      });
      setCardapio(atualizado);
      setEditando(null);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao salvar refeição.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirCardapio = async () => {
    if (!cardapio) return;
    if (!confirm('Excluir o cardápio desta semana? Esta ação não pode ser desfeita.')) return;
    setSalvando(true);
    try {
      await deleteCardapio(cardapio.id);
      setCardapio(null);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao excluir cardápio.');
    } finally {
      setSalvando(false);
    }
  };

  const removeItem = (idx: number) => setItensForm((prev) => prev.filter((_, i) => i !== idx));

  // Adiciona o alimento selecionado com o peso informado à lista de itens
  const adicionarAlimento = () => {
    if (!alimentoAtual || !pesoInput) return;
    const peso = Number(pesoInput);
    if (peso <= 0) return;
    const macros = calcularMacrosPorQuantidade(alimentoAtual, peso);
    setItensForm((prev) => [
      ...prev,
      {
        nome:         alimentoAtual.nome,
        alimentoId:   alimentoAtual.id,
        quantidade:   peso,
        unidade:      'g',
        calorias:     macros.calorias,
        proteinas:    macros.proteinas,
        carboidratos: macros.carboidratos,
        gorduras:     macros.gorduras,
        fibras:       macros.fibras,
        sodio:        macros.sodio,
      } as Partial<CardapioItem>,
    ]);
    // Reseta o seletor para o próximo alimento
    setAlimentoSel('');
    setPesoInput('');
  };

  // Abre o modal e reseta o seletor
  const abrirEdicaoComReset = (dia: DiaSemana, tipo: TipoRefeicao) => {
    setCategoriaSel('');
    setAlimentoSel('');
    setPesoInput('');
    abrirEdicao(dia, tipo);
  };

  return (
    <div className="space-y-4">
      {/* Navegação de semana */}
      <div className="flex items-center justify-between bg-white rounded-xl border p-4">
        <button
          onClick={() => setSemana(getSemanaAnterior(semana))}
          className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <ChevronLeft className="w-4 h-4" /> Semana anterior
        </button>
        <div className="text-center">
          <p className="font-semibold text-gray-800">{formatarSemana(semana)}</p>
          <p className="text-xs text-gray-500">Semana de {semana}</p>
        </div>
        <button
          onClick={() => setSemana(getProximaSemana(semana))}
          className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          Próxima semana <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{erro}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando cardápio...</div>
      ) : !cardapio ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600 mb-1">Nenhum cardápio para esta semana</p>
          <p className="text-sm text-gray-400 mb-4">Crie o cardápio para começar a preencher as refeições</p>
          <button
            onClick={criarCardapio}
            disabled={salvando}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Criar Cardápio da Semana
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header do cardápio */}
          <div className="flex items-center justify-between bg-white rounded-xl border p-4">
            <div>
              <p className="font-semibold text-gray-800">{cardapio.titulo ?? `Cardápio ${formatarSemana(semana)}`}</p>
              <p className="text-xs text-gray-500">
                {cardapio.publicado ? '✅ Publicado' : '📝 Rascunho'} —{' '}
                {cardapio.refeicoes?.length ?? 0} refeições cadastradas
              </p>
            </div>
            <div className="flex items-center gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                title="Imprimir ou salvar como PDF"
              >
                <Printer className="w-4 h-4" /> Imprimir / PDF
              </button>
              <button
                onClick={excluirCardapio}
                disabled={salvando}
                className="flex items-center gap-1 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          </div>

          {/* Grade semanal */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-xl border overflow-hidden text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-3 font-medium text-gray-600 w-32">Refeição</th>
                  {DIAS_SEMANA.map((dia) => (
                    <th key={dia} className="text-center p-3 font-medium text-gray-600">
                      {DIA_SEMANA_LABELS[dia]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIPOS_REFEICAO.map((tipo) => (
                  <tr key={tipo} className="border-b last:border-0">
                    <td className="p-3 font-medium text-gray-700 bg-gray-50 text-xs">
                      {TIPO_REFEICAO_LABELS[tipo]}
                    </td>
                    {DIAS_SEMANA.map((dia) => {
                      const ref = cardapio.refeicoes?.find((r) => r.diaSemana === dia && r.tipoRefeicao === tipo);
                      return (
                        <td key={dia} className="p-2 align-top border-l">
                          <button
                            onClick={() => abrirEdicaoComReset(dia, tipo)}
                            className="w-full min-h-[60px] text-left rounded-lg p-2 hover:bg-orange-50 border border-dashed border-gray-200 hover:border-orange-300 transition-colors"
                          >
                            {ref?.itens?.length ? (
                              <ul className="space-y-0.5">
                                {ref.itens.map((item, idx) => (
                                  <li key={idx} className="text-xs text-gray-700 truncate">• {item.nome}</li>
                                ))}
                                {ref.totaisNutricionais?.calorias ? (
                                  <li className="text-xs text-orange-600 font-medium mt-1">
                                    {ref.totaisNutricionais.calorias.toFixed(0)} kcal
                                  </li>
                                ) : null}
                              </ul>
                            ) : (
                              <span className="text-xs text-gray-300 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Adicionar
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de edição de refeição — Planejador Moderno */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-400 text-white">
              <div>
                <p className="font-bold text-lg tracking-tight">
                  {DIA_SEMANA_LABELS[editando.dia]} — {TIPO_REFEICAO_LABELS[editando.tipo]}
                </p>
                <p className="text-xs text-orange-100">Planejador de Refeição · valores por peso (g)</p>
              </div>
              <button
                onClick={() => setEditando(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-lg leading-none transition-colors"
              >×</button>
            </div>

            {/* ── Corpo ── */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* ── Seletor duplo encadeado ── */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Adicionar Alimento</p>

                {loadingAlimentos && (
                  <p className="text-xs text-gray-400">Carregando banco de alimentos...</p>
                )}

                {/* Linha 1: Categoria + Alimento */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Select 1 — Categoria */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">1. Categoria</label>
                    <select
                      value={categoriaSel}
                      onChange={(e) => { setCategoriaSel(e.target.value); setAlimentoSel(''); setPesoInput(''); }}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400 transition-colors"
                    >
                      <option value="">— Selecione a categoria —</option>
                      {gruposAlimentos.map((g) => (
                        <option key={g.categoria} value={g.categoria}>{g.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select 2 — Alimento da categoria */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">2. Alimento</label>
                    <select
                      value={alimentoSel}
                      onChange={(e) => { setAlimentoSel(e.target.value); setPesoInput(''); }}
                      disabled={!categoriaSel}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">— Selecione o alimento —</option>
                      {alimentosDaCategoria.map((a) => (
                        <option key={a.id} value={a.id}>{a.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preview nutricional do alimento selecionado (por 100g) */}
                {alimentoAtual && (
                  <div className="bg-white border border-orange-100 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-2 font-medium">
                      Valores nutricionais por 100g — <span className="text-orange-600">{alimentoAtual.nome}</span>
                    </p>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {[
                        { label: 'Kcal',    value: alimentoAtual.nutricaoPor100g.calorias,     color: 'text-orange-600', bg: 'bg-orange-50' },
                        { label: 'Prot(g)', value: alimentoAtual.nutricaoPor100g.proteinas,    color: 'text-blue-600',   bg: 'bg-blue-50'   },
                        { label: 'Carb(g)', value: alimentoAtual.nutricaoPor100g.carboidratos, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                        { label: 'Gord(g)', value: alimentoAtual.nutricaoPor100g.gorduras,     color: 'text-red-500',    bg: 'bg-red-50'    },
                        { label: 'Fibr(g)', value: alimentoAtual.nutricaoPor100g.fibras,       color: 'text-green-600',  bg: 'bg-green-50'  },
                      ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`${bg} rounded-lg py-1.5`}>
                          <p className="text-[10px] text-gray-400">{label}</p>
                          <p className={`text-xs font-bold ${color}`}>{Number(value).toFixed(1)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linha 2: Peso em gramas + botão Adicionar */}
                {alimentoAtual && (
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        3. Peso (gramas)
                      </label>
                      <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden focus-within:border-orange-400 transition-colors bg-white">
                        <input
                          type="number"
                          min="1"
                          placeholder={`Ex: ${alimentoAtual.porcaoPadrao}`}
                          value={pesoInput}
                          onChange={(e) => setPesoInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && adicionarAlimento()}
                          className="flex-1 px-3 py-2 text-sm focus:outline-none"
                        />
                        <span className="px-3 text-xs text-gray-400 border-l bg-gray-50">g</span>
                      </div>
                    </div>
                    {/* Preview ao vivo do peso digitado */}
                    {pesoInput && Number(pesoInput) > 0 && (() => {
                      const p = Number(pesoInput);
                      const m = calcularMacrosPorQuantidade(alimentoAtual, p);
                      return (
                        <div className="text-center bg-orange-100 rounded-lg px-3 py-2 min-w-[80px]">
                          <p className="text-[10px] text-orange-600">= {p}g</p>
                          <p className="text-sm font-bold text-orange-700">{m.calorias.toFixed(0)} kcal</p>
                          <p className="text-[10px] text-gray-500">{m.proteinas.toFixed(1)}p · {m.carboidratos.toFixed(1)}c</p>
                        </div>
                      );
                    })()}
                    <button
                      onClick={adicionarAlimento}
                      disabled={!pesoInput || Number(pesoInput) <= 0}
                      className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Adicionar
                    </button>
                  </div>
                )}
              </div>

              {/* ── Lista de itens adicionados ── */}
              {itensForm.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Itens da Refeição ({itensForm.length})
                  </p>
                  <div className="space-y-2">
                    {itensForm.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-orange-200 transition-colors group"
                      >
                        {/* Ícone */}
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm">🍽</span>
                        </div>

                        {/* Nome + peso */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.nome}</p>
                          <p className="text-xs text-gray-400">{item.quantidade}g</p>
                        </div>

                        {/* Macros inline */}
                        <div className="hidden sm:flex items-center gap-3 text-xs">
                          <span className="text-orange-600 font-bold">{Number(item.calorias ?? 0).toFixed(0)} kcal</span>
                          <span className="text-blue-500">{Number(item.proteinas ?? 0).toFixed(1)}p</span>
                          <span className="text-yellow-500">{Number(item.carboidratos ?? 0).toFixed(1)}c</span>
                          <span className="text-red-400">{Number(item.gorduras ?? 0).toFixed(1)}g</span>
                        </div>

                        {/* Remover */}
                        <button
                          onClick={() => removeItem(idx)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all flex-shrink-0"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {itensForm.length === 0 && (
                <div className="text-center py-8 text-gray-300">
                  <p className="text-4xl mb-2">🥗</p>
                  <p className="text-sm">Selecione a categoria, o alimento e o peso para começar</p>
                </div>
              )}

              {/* ── Total da refeição ── */}
              {itensForm.length > 0 && (() => {
                const tot = itensForm.reduce(
                  (acc, i) => ({
                    calorias:     acc.calorias     + (Number(i.calorias)     || 0),
                    proteinas:    acc.proteinas    + (Number(i.proteinas)    || 0),
                    carboidratos: acc.carboidratos + (Number(i.carboidratos) || 0),
                    gorduras:     acc.gorduras     + (Number(i.gorduras)     || 0),
                    fibras:       acc.fibras       + (Number(i.fibras)       || 0),
                  }),
                  { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 }
                );
                return (
                  <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl p-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-orange-100">Total da Refeição</p>
                    <div className="grid grid-cols-5 gap-3 text-center">
                      {[
                        { label: 'Kcal',    value: tot.calorias.toFixed(0)     },
                        { label: 'Prot(g)', value: tot.proteinas.toFixed(1)    },
                        { label: 'Carb(g)', value: tot.carboidratos.toFixed(1) },
                        { label: 'Gord(g)', value: tot.gorduras.toFixed(1)     },
                        { label: 'Fibr(g)', value: tot.fibras.toFixed(1)       },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white/20 rounded-lg py-2">
                          <p className="text-[10px] text-orange-100">{label}</p>
                          <p className="text-sm font-bold">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── Observações ── */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações (opcional)</label>
                <textarea
                  value={obsForm}
                  onChange={(e) => setObsForm(e.target.value)}
                  placeholder="Ex: Sem glúten, opção vegetariana disponível..."
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
              <button
                onClick={() => setEditando(null)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarRefeicao}
                disabled={salvando || itensForm.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {salvando ? 'Salvando...' : `Salvar Refeição (${itensForm.length} item${itensForm.length !== 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componente: Aba Nutrição ─────────────────────────────────────────────
function AbaNutricao({ unitId }: { unitId: string }) {
  const [semana, setSemana] = useState(getSemanaAtual);
  const [cardapioId, setCardapioId] = useState<string | null>(null);
  const [nutricao, setNutricao] = useState<NutricaoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    setNutricao(null);
    try {
      const res = await listCardapios({ unitId, semana, limit: 1 });
      const card = res.data[0];
      if (!card) { setLoading(false); return; }
      setCardapioId(card.id);
      const nut = await calcularNutricao(card.id);
      setNutricao(nut);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao calcular nutrição.');
    } finally {
      setLoading(false);
    }
  }, [unitId, semana]);

  useEffect(() => { carregar(); }, [carregar]);

  const DIA_LABELS: Record<string, string> = {
    SEGUNDA: 'Segunda', TERCA: 'Terça', QUARTA: 'Quarta', QUINTA: 'Quinta', SEXTA: 'Sexta',
  };
  const REF_LABELS: Record<string, string> = {
    CAFE_MANHA: 'Café', ALMOCO: 'Almoço', LANCHE_TARDE: 'Lanche', JANTAR: 'Jantar',
  };

  return (
    <div className="space-y-4">
      {/* Navegação de semana */}
      <div className="flex items-center justify-between bg-white rounded-xl border p-4">
        <button onClick={() => setSemana(getSemanaAnterior(semana))} className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <p className="font-semibold text-gray-800">{formatarSemana(semana)}</p>
        <button onClick={() => setSemana(getProximaSemana(semana))} className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          Próxima <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{erro}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Calculando valores nutricionais...</div>
      ) : !nutricao ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">Nenhum cardápio encontrado para esta semana</p>
          <p className="text-sm text-gray-400">Crie o cardápio na aba Cardápio para ver os valores nutricionais</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cards de totais semanais */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Calorias', value: nutricao.totalSemanal.calorias.toFixed(0), unit: 'kcal', color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Proteínas', value: nutricao.totalSemanal.proteinas.toFixed(1), unit: 'g', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Carboidratos', value: nutricao.totalSemanal.carboidratos.toFixed(1), unit: 'g', color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'Gorduras', value: nutricao.totalSemanal.gorduras.toFixed(1), unit: 'g', color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Fibras', value: nutricao.totalSemanal.fibras.toFixed(1), unit: 'g', color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Sódio', value: nutricao.totalSemanal.sodio.toFixed(0), unit: 'mg', color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((card) => (
              <div key={card.label} className={`${card.bg} rounded-xl border p-4`}>
                <p className="text-xs text-gray-500 font-medium">{card.label} (semana)</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-400">{card.unit}</p>
              </div>
            ))}
          </div>

          {/* Média diária */}
          <div className="bg-white rounded-xl border p-4">
            <p className="font-semibold text-gray-700 mb-3 text-sm">Média Diária</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
              {[
                { label: 'Kcal', value: nutricao.mediadiaria.calorias },
                { label: 'Prot (g)', value: nutricao.mediadiaria.proteinas },
                { label: 'Carb (g)', value: nutricao.mediadiaria.carboidratos },
                { label: 'Gord (g)', value: nutricao.mediadiaria.gorduras },
                { label: 'Fibras (g)', value: nutricao.mediadiaria.fibras },
                { label: 'Sódio (mg)', value: nutricao.mediadiaria.sodio },
              ].map((m) => (
                <div key={m.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{m.label}</p>
                  <p className="text-lg font-bold text-gray-800">{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detalhamento por dia */}
          <div className="space-y-3">
            {nutricao.resumoDiario.map((dia) => (
              <div key={dia.dia} className="bg-white rounded-xl border overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b">
                  <p className="font-semibold text-gray-700">{DIA_LABELS[dia.dia] ?? dia.dia}</p>
                  <span className="text-sm text-orange-600 font-medium">{dia.totais.calorias.toFixed(0)} kcal</span>
                </div>
                <div className="p-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b">
                        <th className="text-left pb-2">Refeição</th>
                        <th className="text-right pb-2">Kcal</th>
                        <th className="text-right pb-2">Prot</th>
                        <th className="text-right pb-2">Carb</th>
                        <th className="text-right pb-2">Gord</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dia.refeicoes.map((ref, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-1.5 text-gray-700">{REF_LABELS[ref.refeicao] ?? ref.refeicao}</td>
                          <td className="py-1.5 text-right text-gray-600">{ref.calorias.toFixed(0)}</td>
                          <td className="py-1.5 text-right text-gray-600">{ref.proteinas.toFixed(1)}g</td>
                          <td className="py-1.5 text-right text-gray-600">{ref.carboidratos.toFixed(1)}g</td>
                          <td className="py-1.5 text-right text-gray-600">{ref.gorduras.toFixed(1)}g</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componente: Aba Configurações de Refeição ──────────────────────────
function AbaConfiguracoes({ unitId }: { unitId: string }) {
  const [configs, setConfigs] = useState<ConfiguracaoRefeicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [novoHorario, setNovoHorario] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const data = await listTodasConfiguracoesRefeicao(unitId);
      setConfigs(data);
    } catch {
      setErro('Erro ao carregar configurações de refeição.');
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleAdicionar = async () => {
    if (!novoNome.trim()) return;
    setSalvando(true);
    try {
      await createConfiguracaoRefeicao({
        unitId,
        nome: novoNome.trim(),
        horario: novoHorario.trim() || undefined,
        ordem: configs.filter((c) => c.ativo).length,
      });
      setNovoNome('');
      setNovoHorario('');
      await carregar();
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao adicionar refeição.');
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleAtivo = async (config: ConfiguracaoRefeicao) => {
    try {
      if (config.ativo) {
        await removeConfiguracaoRefeicao(config.id);
      } else {
        await updateConfiguracaoRefeicao(config.id, { ativo: true });
      }
      await carregar();
    } catch {
      setErro('Erro ao alterar status da refeição.');
    }
  };

  const ativas = configs.filter((c) => c.ativo);
  const inativas = configs.filter((c) => !c.ativo);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-800">Configurações de Refeição</h2>
        </div>
        <p className="text-sm text-gray-500">
          Personalize os tipos de refeição da sua unidade (ex: Colação, Lanche da Manhã).
          Essas refeições ficarão disponíveis no planejador de cardápio.
        </p>
      </div>

      {/* Formulário de adição */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Adicionar Nova Refeição</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Nome da refeição (ex: Colação)"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            maxLength={100}
          />
          <input
            type="text"
            placeholder="Horário (ex: 09:30)"
            value={novoHorario}
            onChange={(e) => setNovoHorario(e.target.value)}
            className="w-36 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            maxLength={5}
            pattern="\d{2}:\d{2}"
          />
          <button
            onClick={handleAdicionar}
            disabled={salvando || !novoNome.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {salvando ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
        {erro && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
        )}
      </div>

      {/* Lista de refeições ativas */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Refeições Ativas ({ativas.length})</h3>
          <button onClick={carregar} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Carregando...</div>
        ) : ativas.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <GripVertical className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma refeição configurada ainda.</p>
            <p className="text-xs mt-1">Adicione refeições personalizadas acima.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ativas.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{config.nome}</p>
                    {config.horario && (
                      <p className="text-xs text-gray-500">Horário: {config.horario}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleAtivo(config)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                >
                  Desativar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de refeições inativas */}
      {inativas.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-4">Refeições Inativas ({inativas.length})</h3>
          <div className="space-y-2">
            {inativas.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-60"
              >
                <div>
                  <p className="text-sm font-medium text-gray-600 line-through">{config.nome}</p>
                  {config.horario && (
                    <p className="text-xs text-gray-400">Horário: {config.horario}</p>
                  )}
                </div>
                <button
                  onClick={() => handleToggleAtivo(config)}
                  className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50"
                >
                  Reativar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export function DashboardNutricionistaPage() {
  const { user } = useAuth();
  const unitId = (user as any)?.unitId ?? '';
  const [aba, setAba] = useState<'dietas' | 'pedidos' | 'turmas' | 'cardapio' | 'nutricao' | 'configuracoes'>('dietas');

  // ── Estado: Dietas ──
  const [dietas, setDietas] = useState<DietaryRestriction[]>([]);
  const [loadingDietas, setLoadingDietas] = useState(false);
  const [buscaDieta, setBuscaDieta] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroSeveridade, setFiltroSeveridade] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  // ── Estado: Pedidos ──
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [mesRef, setMesRef] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [novoItemForm, setNovoItemForm] = useState(false);
  const [novoItem, setNovoItem] = useState({ descricao: '', quantidade: 1, unidadeMedida: 'unidade', custoEstimado: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // ── Estado: Turmas ──
  const [turmas, setTurmas] = useState<{ id: string; name: string; totalCriancas: number; comRestricao: number }[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  // ── Carregar Dietas ──
  const carregarDietas = useCallback(async () => {
    setLoadingDietas(true);
    try {
      const { data } = await http.get('/children/dietary-restrictions/unidade', {
        params: { unitId, limit: 200 },
      });
      setDietas(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      setDietas([]);
    } finally {
      setLoadingDietas(false);
    }
  }, [unitId]);

  // ── Carregar Pedidos de Alimentação ──
  const carregarPedidos = useCallback(async () => {
    setLoadingPedidos(true);
    try {
      const { data } = await http.get('/pedidos-compra', {
        params: { mesReferencia: mesRef, categoria: 'ALIMENTACAO' },
      });
      const lista = Array.isArray(data) ? data : data?.data ?? [];
      const filtrados = lista.filter((p: PedidoCompra) =>
        p.itens?.some((i) => i.categoria === 'ALIMENTACAO'),
      );
      setPedidos(filtrados);
    } catch {
      setPedidos([]);
    } finally {
      setLoadingPedidos(false);
    }
  }, [mesRef]);

  // ── Carregar Turmas ──
  const carregarTurmas = useCallback(async () => {
    setLoadingTurmas(true);
    try {
      const { data: classData } = await http.get('/lookup/classrooms/accessible');
      const turmasList = Array.isArray(classData) ? classData : classData?.data ?? [];
      const turmasComInfo = turmasList.map((t: { id: string; name: string; _count?: { children: number } }) => {
        const criancasNaTurma = dietas.filter((d) =>
          d.child?.enrollments?.some((e) => e.classroom?.id === t.id),
        );
        const unicas = new Set(criancasNaTurma.map((d) => d.child.id));
        return {
          id: t.id,
          name: t.name,
          totalCriancas: t._count?.children ?? 0,
          comRestricao: unicas.size,
        };
      });
      setTurmas(turmasComInfo);
    } catch {
      setTurmas([]);
    } finally {
      setLoadingTurmas(false);
    }
  }, [dietas]);

  useEffect(() => { carregarDietas(); }, [carregarDietas]);
  useEffect(() => { if (aba === 'pedidos') carregarPedidos(); }, [aba, carregarPedidos]);
  useEffect(() => { if (aba === 'turmas') carregarTurmas(); }, [aba, carregarTurmas]);

  // ── Adicionar Item de Alimentação ao Pedido ──
  const adicionarItemAlimentacao = async () => {
    if (!novoItem.descricao.trim()) return;
    setSalvando(true);
    setErro('');
    try {
      const mesAtual = mesRef;
      let pedidoId: string | null = null;
      const rascunho = pedidos.find((p) => p.mesReferencia === mesAtual && p.status === 'RASCUNHO');
      if (rascunho) {
        pedidoId = rascunho.id;
      } else {
        const { data: novoPedido } = await http.post('/pedidos-compra', {
          mesReferencia: mesAtual,
          itens: [],
        });
        pedidoId = novoPedido.id;
      }
      await http.patch(`/pedidos-compra/${pedidoId}/itens`, {
        itens: [{
          categoria: 'ALIMENTACAO',
          descricao: novoItem.descricao,
          quantidade: Number(novoItem.quantidade),
          unidadeMedida: novoItem.unidadeMedida,
          custoEstimado: novoItem.custoEstimado ? Number(novoItem.custoEstimado) : undefined,
        }],
      });
      setNovoItemForm(false);
      setNovoItem({ descricao: '', quantidade: 1, unidadeMedida: 'unidade', custoEstimado: '' });
      await carregarPedidos();
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao adicionar item.');
    } finally {
      setSalvando(false);
    }
  };

  // ── Filtrar Dietas ──
  const turmasUnicas = Array.from(
    new Set(dietas.flatMap((d) => d.child?.enrollments?.map((e) => e.classroom?.id) ?? [])),
  ).map((id) => {
    const turma = dietas
      .flatMap((d) => d.child?.enrollments ?? [])
      .find((e) => e.classroom?.id === id)?.classroom;
    return { id, name: turma?.name ?? id };
  });

  const dietasFiltradas = dietas.filter((d) => {
    const nome = `${d.child.firstName} ${d.child.lastName}`.toLowerCase();
    const busca = buscaDieta.toLowerCase();
    const matchBusca = !busca || nome.includes(busca) || d.name.toLowerCase().includes(busca);
    const matchTipo = !filtroTipo || d.type === filtroTipo;
    const matchSev = !filtroSeveridade || d.severity === filtroSeveridade;
    const matchTurma = !filtroTurma || d.child?.enrollments?.some((e) => e.classroom?.id === filtroTurma);
    return matchBusca && matchTipo && matchSev && matchTurma && d.isActive;
  });

  // ── Estatísticas ──
  const totalAlergias = dietas.filter((d) => d.type === 'ALERGIA' && d.isActive).length;
  const totalSeveras = dietas.filter((d) => d.severity === 'severa' && d.isActive).length;
  const totalCriancasComRestricao = new Set(dietas.filter((d) => d.isActive).map((d) => d.child.id)).size;

  const ABAS = [
    { id: 'dietas', label: 'Dietas e Restrições', icon: Apple },
    { id: 'pedidos', label: 'Pedidos de Alimentação', icon: ShoppingCart },
    { id: 'turmas', label: 'Resumo por Turma', icon: Users },
    { id: 'cardapio', label: 'Cardápio Semanal', icon: BookOpen },
    { id: 'nutricao', label: 'Cálculo Nutricional', icon: BarChart2 },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ] as const;

  return (
    <PageShell
      title="Painel da Nutricionista"
      subtitle={`Bem-vindo, ${((user?.nome as string) || '').split(' ')[0] || 'Nutricionista'}! Dietas, restrições, cardápio e nutrição.`}
    >
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-500 font-medium">Crianças com Restrição</span>
          <span className="text-2xl font-bold text-gray-800">{totalCriancasComRestricao}</span>
        </div>
        <div className="bg-white rounded-xl border p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-500 font-medium">Total de Restrições</span>
          <span className="text-2xl font-bold text-gray-800">{dietas.filter((d) => d.isActive).length}</span>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 flex flex-col gap-1">
          <span className="text-xs text-red-600 font-medium">Alergias</span>
          <span className="text-2xl font-bold text-red-700">{totalAlergias}</span>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 flex flex-col gap-1">
          <span className="text-xs text-orange-600 font-medium">Severidade Alta</span>
          <span className="text-2xl font-bold text-orange-700">{totalSeveras}</span>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {ABAS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              aba === id
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Aba: Dietas e Restrições ── */}
      {aba === 'dietas' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por criança ou restrição..."
                value={buscaDieta}
                onChange={(e) => setBuscaDieta(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="">Todos os tipos</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={filtroSeveridade}
              onChange={(e) => setFiltroSeveridade(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="">Todas as severidades</option>
              <option value="severa">Severa</option>
              <option value="moderada">Moderada</option>
              <option value="leve">Leve</option>
            </select>
            {turmasUnicas.length > 0 && (
              <select
                value={filtroTurma}
                onChange={(e) => setFiltroTurma(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="">Todas as turmas</option>
                {turmasUnicas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <button
              onClick={carregarDietas}
              disabled={loadingDietas}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDietas ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          <p className="text-sm text-gray-500">
            {dietasFiltradas.length} restrição(ões) encontrada(s)
          </p>

          {loadingDietas ? (
            <div className="text-center py-12 text-gray-500">Carregando restrições...</div>
          ) : dietasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <Apple className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhuma restrição encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dietasFiltradas.map((d) => {
                const sev = SEVERITY_CONFIG[d.severity ?? ''] ?? { label: d.severity ?? '—', color: 'text-gray-600', bg: 'bg-gray-100', icon: '•' };
                const turmasCrianca = d.child?.enrollments?.map((e) => e.classroom?.name).filter(Boolean).join(', ') ?? '—';
                const isExp = expandido === d.id;
                return (
                  <div key={d.id} className="bg-white rounded-xl border overflow-hidden">
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandido(isExp ? null : d.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                          {d.child.firstName[0]}{d.child.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {d.child.firstName} {d.child.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {calcIdade(d.child.dateOfBirth)} • {turmasCrianca}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${sev.bg} ${sev.color}`}>
                          {sev.icon} {sev.label}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {TYPE_LABEL[d.type] ?? d.type}
                        </span>
                        {isExp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                    {isExp && (
                      <div className="px-5 pb-5 border-t bg-gray-50 space-y-3 pt-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Restrição</p>
                          <p className="text-sm font-medium text-gray-800">{d.name}</p>
                          {d.description && <p className="text-sm text-gray-600 mt-1">{d.description}</p>}
                        </div>
                        {d.forbiddenFoods && (
                          <div>
                            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">🚫 Alimentos Proibidos</p>
                            <p className="text-sm text-gray-700">{d.forbiddenFoods}</p>
                          </div>
                        )}
                        {d.allowedFoods && (
                          <div>
                            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">✅ Alimentos Permitidos</p>
                            <p className="text-sm text-gray-700">{d.allowedFoods}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Aba: Pedidos de Alimentação ── */}
      {aba === 'pedidos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium">Mês de referência:</label>
              <input
                type="month"
                value={mesRef}
                onChange={(e) => setMesRef(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={carregarPedidos}
                disabled={loadingPedidos}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPedidos ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                onClick={() => setNovoItemForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
              >
                <Plus className="w-4 h-4" /> Adicionar Item de Alimentação
              </button>
            </div>
          </div>

          {novoItemForm && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 space-y-3">
              <p className="font-semibold text-gray-800">Novo Item de Alimentação</p>
              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Descrição do item *"
                  value={novoItem.descricao}
                  onChange={(e) => setNovoItem((p) => ({ ...p, descricao: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Qtd"
                    value={novoItem.quantidade}
                    onChange={(e) => setNovoItem((p) => ({ ...p, quantidade: Number(e.target.value) }))}
                    className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <select
                    value={novoItem.unidadeMedida}
                    onChange={(e) => setNovoItem((p) => ({ ...p, unidadeMedida: e.target.value }))}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    <option value="unidade">unidade</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="litro">litro</option>
                    <option value="ml">ml</option>
                    <option value="caixa">caixa</option>
                    <option value="pacote">pacote</option>
                  </select>
                  <input
                    type="number"
                    placeholder="R$ custo"
                    value={novoItem.custoEstimado}
                    onChange={(e) => setNovoItem((p) => ({ ...p, custoEstimado: e.target.value }))}
                    className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setNovoItemForm(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarItemAlimentacao}
                  disabled={salvando || !novoItem.descricao.trim()}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          )}

          {loadingPedidos ? (
            <div className="text-center py-12 text-gray-500">Carregando pedidos...</div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhum pedido de alimentação para este mês</p>
              <p className="text-sm mt-1">Clique em "Adicionar Item de Alimentação" para criar o primeiro pedido</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pedidos.map((p) => {
                const st = STATUS_CONFIG[p.status] ?? { label: p.status, color: 'text-gray-600', bg: 'bg-gray-100' };
                const itensFeed = p.itens.filter((i) => i.categoria === 'ALIMENTACAO');
                const totalEst = itensFeed.reduce((acc, i) => acc + (i.custoEstimado ?? 0) * i.quantidade, 0);
                return (
                  <div key={p.id} className="bg-white rounded-xl border overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
                      <div>
                        <p className="font-semibold text-gray-800">Pedido — {p.mesReferencia}</p>
                        <p className="text-xs text-gray-500">Criado em {new Date(p.criadoEm).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="p-5">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b">
                            <th className="text-left pb-2">Descrição</th>
                            <th className="text-center pb-2">Qtd</th>
                            <th className="text-center pb-2">Unid.</th>
                            <th className="text-right pb-2">Custo Est.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itensFeed.map((i) => (
                            <tr key={i.id} className="border-b last:border-0">
                              <td className="py-2 text-gray-700">{i.descricao}</td>
                              <td className="py-2 text-center text-gray-700">{i.quantidade}</td>
                              <td className="py-2 text-center text-gray-500">{i.unidadeMedida ?? '—'}</td>
                              <td className="py-2 text-right text-gray-700">
                                {i.custoEstimado ? `R$ ${(i.custoEstimado * i.quantidade).toFixed(2)}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {totalEst > 0 && (
                          <tfoot>
                            <tr className="border-t font-semibold">
                              <td colSpan={3} className="pt-2 text-gray-600">Total estimado</td>
                              <td className="pt-2 text-right text-green-700">R$ {totalEst.toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Aba: Resumo por Turma ── */}
      {aba === 'turmas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={carregarTurmas}
              disabled={loadingTurmas}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingTurmas ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
          {loadingTurmas ? (
            <div className="text-center py-12 text-gray-500">Carregando turmas...</div>
          ) : turmas.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhuma turma encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {turmas.map((t) => {
                const pct = t.totalCriancas > 0 ? Math.round((t.comRestricao / t.totalCriancas) * 100) : 0;
                return (
                  <div key={t.id} className="bg-white rounded-xl border p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-gray-800">{t.name}</p>
                      {t.comRestricao > 0 && (
                        <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          {t.comRestricao} restr.
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Crianças com restrição</span>
                        <span className="font-medium">{t.comRestricao} / {t.totalCriancas}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${pct > 30 ? 'bg-orange-400' : 'bg-green-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">{pct}% das crianças têm alguma restrição</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Aba: Cardápio Semanal ── */}
      {aba === 'cardapio' && unitId && <AbaCardapio unitId={unitId} />}
      {aba === 'cardapio' && !unitId && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
          <p className="font-medium">Unidade não identificada. Faça login novamente.</p>
        </div>
      )}

      {/* ── Aba: Cálculo Nutricional ── */}
      {aba === 'nutricao' && unitId && <AbaNutricao unitId={unitId} />}
      {aba === 'nutricao' && !unitId && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
          <p className="font-medium">Unidade não identificada. Faça login novamente.</p>
        </div>
      )}
      {/* ── Aba: Configurações de Refeição ── */}
      {aba === 'configuracoes' && unitId && <AbaConfiguracoes unitId={unitId} />}
      {aba === 'configuracoes' && !unitId && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
          <p className="font-medium">Unidade não identificada. Faça login novamente.</p>
        </div>
      )}
    </PageShell>
  );
}
