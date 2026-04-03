/**
 * Dashboard da Nutricionista
 * Acesso: UNIDADE_NUTRICIONISTA
 * Abas: Dietas/Restrições | Pedidos de Alimentação | Resumo por Turma | Cardápio | Nutrição
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { listConfiguracoesRefeicao } from '../api/configuracao-refeicao';
import { PageShell } from '@/components/ui/PageShell';
import http from '../api/http';
import { useAuth } from '../app/AuthProvider';
import {
  Apple, AlertTriangle, ShoppingCart, Users, Search,
  RefreshCw, Plus, ChevronDown, ChevronUp, Filter,
  CheckCircle, Clock, XCircle, Printer, BookOpen,
  BarChart2, ChevronLeft, ChevronRight, Save, Trash2,
  Settings, GripVertical, History, Eye, FileEdit, X, FileText, Download,
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

// ─── Sub-componente: Aba Cardápio ─────────────────────────────────────────────────────────────────────────────────
function AbaCardapio({ unitId }: { unitId: string }) {
  const [semana, setSemana] = useState(getSemanaAtual);
  const [cardapio, setCardapio] = useState<Cardapio | null>(null);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [nonSchoolDays, setNonSchoolDays] = useState<string[]>([]);
  // Configurações de refeição da unidade (FASE 7)
  const [configsRefeicao, setConfigsRefeicao] = useState<ConfiguracaoRefeicao[]>([]);
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

  // Carrega dias não letivos da unidade
  useEffect(() => {
    if (!unitId) return;
    http.get(`/units/${unitId}`)
      .then((res) => setNonSchoolDays(res.data?.nonSchoolDays ?? []))
      .catch(() => setNonSchoolDays([]));
  }, [unitId]);

  // Carrega configurações de refeição ativas da unidade (FASE 7)
  useEffect(() => {
    if (!unitId) return;
    listConfiguracoesRefeicao(unitId)
      .then((data) => setConfigsRefeicao(data))
      .catch(() => setConfigsRefeicao([]));
  }, [unitId]);

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
    if (itensFiltrados.length === 0) {
      setErro('Adicione pelo menos um alimento antes de salvar a refeição.');
      return;
    }
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

      {/* Painel de refeições configuradas da unidade (FASE 7) */}
      {configsRefeicao.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-orange-600" />
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Refeições Configuradas da Unidade</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {configsRefeicao.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-orange-200 rounded-full text-xs text-gray-700">
                <span className="font-medium">{c.nome}</span>
                {c.horario && <span className="text-gray-400">&nbsp;{c.horario}</span>}
              </span>
            ))}
          </div>
          <p className="text-xs text-orange-600 mt-2">
            Use as refeições padrão do planejador abaixo. Gerencie horários e nomes em <strong>Configurações</strong>.
          </p>
        </div>
      )}

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
                  {DIAS_SEMANA.map((dia, idx) => {
                    const dataStr = (() => {
                      const d = new Date(semana + 'T12:00:00');
                      d.setDate(d.getDate() + idx);
                      return d.toISOString().slice(0, 10);
                    })();
                    const isNonSchool = nonSchoolDays.includes(dataStr);
                    return (
                      <th key={dia} className={`text-center p-3 font-medium ${
                        isNonSchool ? 'text-gray-400 bg-gray-100' : 'text-gray-600'
                      }`}>
                        <span title={isNonSchool ? 'Dia não letivo' : undefined}>
                          {DIA_SEMANA_LABELS[dia]}
                          {isNonSchool && <span className="ml-1 text-xs text-red-400" title="Dia não letivo">⛔</span>}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {TIPOS_REFEICAO.map((tipo) => (
                  <tr key={tipo} className="border-b last:border-0">
                    <td className="p-3 font-medium text-gray-700 bg-gray-50 text-xs">
                      {TIPO_REFEICAO_LABELS[tipo]}
                    </td>
                    {DIAS_SEMANA.map((dia, diaIdx) => {
                      const ref = cardapio.refeicoes?.find((r) => r.diaSemana === dia && r.tipoRefeicao === tipo);
                      // Calcular data do dia para verificar se é letivo
                      const dataStr = (() => {
                        const d = new Date(semana + 'T12:00:00');
                        d.setDate(d.getDate() + diaIdx);
                        return d.toISOString().slice(0, 10);
                      })();
                      const isNonSchoolCell = nonSchoolDays.includes(dataStr);
                      return (
                        <td key={dia} className={`p-2 align-top border-l ${
                          isNonSchoolCell ? 'bg-gray-50' : ''
                        }`}>
                          {isNonSchoolCell ? (
                            <div className="w-full min-h-[60px] flex items-center justify-center rounded-lg bg-gray-100 border border-dashed border-gray-200">
                              <span className="text-xs text-gray-400 text-center">
                                <span className="block text-base">&#128683;</span>
                                Não letivo
                              </span>
                            </div>
                          ) : (
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
                          )}
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
              {/* ── Erro do modal ── */}
              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">&#9888;</span>
                  <span>{erro}</span>
                </div>
              )}
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
                  <div className="space-y-2">
                    {/* Atalhos rápidos de quantidade */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">3. Peso (gramas) — atalhos rápidos ou digite</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {[1, 5, 10, 20, 50, 100, 150, 200].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setPesoInput(String(Number(pesoInput || 0) + g))}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-200 active:scale-95 transition-all"
                          >+{g}g</button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPesoInput('')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 active:scale-95 transition-all"
                        >Zerar</button>
                      </div>
                    </div>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
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
                <div className="text-center py-8 text-gray-400">
                  <p className="text-4xl mb-2">🥗</p>
                  <p className="text-sm font-medium text-gray-500">Nenhum alimento adicionado ainda</p>
                  <p className="text-xs text-gray-400 mt-1">1. Escolha a categoria &rarr; 2. Selecione o alimento &rarr; 3. Informe o peso &rarr; clique em <strong>Adicionar</strong></p>
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
                disabled={salvando}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {salvando ? 'Salvando...' : itensForm.length === 0 ? 'Salvar Refeição' : `Salvar Refeição (${itensForm.length} item${itensForm.length !== 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componente: Aba Nutrição ─────────────────────────────────────────────
// ─── Metas etárias PNAE/FNDE (por dia, 5 dias úteis) ────────────────────────
// Fonte: Resolução FNDE nº 06/2020 — Programa Nacional de Alimentação Escolar
// Valores representam a ingestão diária recomendada por faixa etária.
const METAS_ETARIAS: Record<string, {
  label: string;
  calorias: number; proteinas: number; carboidratos: number;
  gorduras: number; fibras: number; sodio: number;
}> = {
  '0-3': {
    label: '0 a 3 anos (creche)',
    calorias: 1000, proteinas: 13, carboidratos: 130,
    gorduras: 30, fibras: 19, sodio: 1000,
  },
  '4-6': {
    label: '4 a 6 anos (pré-escola)',
    calorias: 1400, proteinas: 20, carboidratos: 195,
    gorduras: 39, fibras: 20, sodio: 1200,
  },
  '7-10': {
    label: '7 a 10 anos (fundamental I)',
    calorias: 1700, proteinas: 28, carboidratos: 237,
    gorduras: 47, fibras: 25, sodio: 1500,
  },
};

function AbaNutricao({ unitId }: { unitId: string }) {
  const [semana, setSemana] = useState(getSemanaAtual);
  const [cardapioId, setCardapioId] = useState<string | null>(null);
  const [nutricao, setNutricao] = useState<NutricaoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [faixaEtaria, setFaixaEtaria] = useState<string>('4-6');

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
      {/* Navegação de semana + ações */}
      <div className="flex items-center justify-between bg-white rounded-xl border p-4">
        <button onClick={() => setSemana(getSemanaAnterior(semana))} className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <p className="font-semibold text-gray-800">{formatarSemana(semana)}</p>
        <div className="flex items-center gap-2">
          {nutricao && (
            <button
              onClick={() => {
                const metaCSV = METAS_ETARIAS[faixaEtaria];
                const linhas = [
                  ['Semana', semana],
                  ['Faixa Etária de Referência', metaCSV.label],
                  ['Fonte', 'Resolução FNDE nº 06/2020 — PNAE'],
                  [''],
                  ['Dia', 'Refeição', 'Kcal', 'Proteínas (g)', 'Carboidratos (g)', 'Gorduras (g)', 'Fibras (g)', 'Sódio (mg)'],
                  ...nutricao.resumoDiario.flatMap((d) =>
                    d.refeicoes.map((r) => [
                      d.dia, r.refeicao,
                      r.calorias.toFixed(0), r.proteinas.toFixed(1),
                      r.carboidratos.toFixed(1), r.gorduras.toFixed(1),
                      r.fibras.toFixed(1), r.sodio.toFixed(0),
                    ])
                  ),
                  [''],
                  ['TOTAL SEMANAL', '',
                    nutricao.totalSemanal.calorias.toFixed(0),
                    nutricao.totalSemanal.proteinas.toFixed(1),
                    nutricao.totalSemanal.carboidratos.toFixed(1),
                    nutricao.totalSemanal.gorduras.toFixed(1),
                    nutricao.totalSemanal.fibras.toFixed(1),
                    nutricao.totalSemanal.sodio.toFixed(0),
                  ],
                  ['MÉDIA DIÁRIA', '',
                    nutricao.mediadiaria.calorias,
                    nutricao.mediadiaria.proteinas,
                    nutricao.mediadiaria.carboidratos,
                    nutricao.mediadiaria.gorduras,
                    nutricao.mediadiaria.fibras,
                    nutricao.mediadiaria.sodio,
                  ],
                  [''],
                  [`META PNAE (${metaCSV.label})`, '',
                    metaCSV.calorias, metaCSV.proteinas,
                    metaCSV.carboidratos, metaCSV.gorduras,
                    metaCSV.fibras, metaCSV.sodio,
                  ],
                ];
                const csv = linhas.map((l) => l.join(';')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio-nutricional-${semana}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="no-print flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              title="Exportar relatório como CSV"
            >
              ↓ CSV
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            title="Imprimir ou salvar como PDF"
          >
            <Printer className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => setSemana(getProximaSemana(semana))} className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Próxima <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

       {/* Seletor de faixa etária */}
      <div className="bg-white rounded-xl border p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">Faixa etária de referência (PNAE):</span>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(METAS_ETARIAS).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setFaixaEtaria(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                faixaEtaria === key
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50'
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">Fonte: Resolução FNDE nº 06/2020</span>
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

          {/* Média diária + Comparativo com metas etárias PNAE */}
          {(() => {
            const meta = METAS_ETARIAS[faixaEtaria];
            const nutrientes: { key: keyof typeof meta; label: string; unit: string }[] = [
              { key: 'calorias', label: 'Calorias', unit: 'kcal' },
              { key: 'proteinas', label: 'Proteínas', unit: 'g' },
              { key: 'carboidratos', label: 'Carboidratos', unit: 'g' },
              { key: 'gorduras', label: 'Gorduras', unit: 'g' },
              { key: 'fibras', label: 'Fibras', unit: 'g' },
              { key: 'sodio', label: 'Sódio', unit: 'mg' },
            ];
            return (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-5 py-3 bg-orange-50 border-b flex items-center justify-between">
                  <p className="font-semibold text-gray-700 text-sm">Média Diária vs. Meta PNAE</p>
                  <span className="text-xs text-orange-600 font-medium">{meta.label}</span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-3">
                    {nutrientes.map(({ key, label, unit }) => {
                      const valor = Number(nutricao.mediadiaria[key as keyof typeof nutricao.mediadiaria] ?? 0);
                      const alvo = meta[key] as number;
                      const pct = alvo > 0 ? Math.min((valor / alvo) * 100, 150) : 0;
                      const status = valor < alvo * 0.85 ? 'abaixo' : valor > alvo * 1.15 ? 'acima' : 'dentro';
                      const statusConfig = {
                        abaixo: { label: 'Abaixo do recomendado', bar: 'bg-yellow-400', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
                        dentro: { label: 'Dentro do recomendado', bar: 'bg-green-400', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
                        acima:  { label: 'Acima do recomendado',  bar: 'bg-red-400',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700'    },
                      }[status];
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-700">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">{valor.toFixed(key === 'calorias' || key === 'sodio' ? 0 : 1)}{unit} / {alvo}{unit}</span>
                              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${statusConfig.badge}`}>{statusConfig.label}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${statusConfig.bar}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Valores de referência: Resolução FNDE nº 06/2020 — PNAE. Comparativo baseado na média diária calculada do cardápio da semana.</p>
                </div>
              </div>
            );
          })()}

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
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [novoHorario, setNovoHorario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editHorario, setEditHorario] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const mostrarSucesso = (msg: string) => {
    setSucesso(msg);
    setTimeout(() => setSucesso(null), 3000);
  };

  const validarHorario = (h: string) => !h || /^\d{2}:\d{2}$/.test(h);

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
    if (!novoNome.trim()) { setErro('Informe o nome da refeição.'); return; }
    if (!validarHorario(novoHorario.trim())) { setErro('Horário inválido. Use o formato HH:MM (ex: 09:30).'); return; }
    setSalvando(true); setErro(null);
    try {
      await createConfiguracaoRefeicao({
        unitId,
        nome: novoNome.trim(),
        horario: novoHorario.trim() || undefined,
        ordem: configs.filter((c) => c.ativo).length,
      });
      setNovoNome('');
      setNovoHorario('');
      mostrarSucesso('Refeição adicionada com sucesso.');
      await carregar();
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao adicionar refeição.');
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicao = (config: ConfiguracaoRefeicao) => {
    setEditandoId(config.id);
    setEditNome(config.nome);
    setEditHorario(config.horario ?? '');
    setErro(null);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditNome('');
    setEditHorario('');
  };

  const salvarEdicao = async (id: string) => {
    if (!editNome.trim()) { setErro('O nome não pode ser vazio.'); return; }
    if (!validarHorario(editHorario.trim())) { setErro('Horário inválido. Use HH:MM.'); return; }
    setSalvandoEdicao(true); setErro(null);
    try {
      await updateConfiguracaoRefeicao(id, {
        nome: editNome.trim(),
        horario: editHorario.trim() || undefined,
      });
      cancelarEdicao();
      mostrarSucesso('Refeição atualizada com sucesso.');
      await carregar();
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao salvar edição.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleToggleAtivo = async (config: ConfiguracaoRefeicao) => {
    try {
      if (config.ativo) {
        await removeConfiguracaoRefeicao(config.id);
        mostrarSucesso(`Refeição "${config.nome}" desativada.`);
      } else {
        await updateConfiguracaoRefeicao(config.id, { ativo: true });
        mostrarSucesso(`Refeição "${config.nome}" reativada.`);
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
        {sucesso && (
          <p className="mt-3 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {sucesso}
          </p>
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
                className="border border-green-200 rounded-lg bg-green-50 p-3"
              >
                {editandoId === config.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        maxLength={100}
                        placeholder="Nome da refeição"
                      />
                      <input
                        type="text"
                        value={editHorario}
                        onChange={(e) => setEditHorario(e.target.value)}
                        className="w-24 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="HH:MM"
                        maxLength={5}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => salvarEdicao(config.id)}
                        disabled={salvandoEdicao}
                        className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white rounded text-xs font-medium hover:bg-orange-600 disabled:opacity-50"
                      >
                        <Save className="w-3 h-3" /> {salvandoEdicao ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={cancelarEdicao}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
                      >
                        <X className="w-3 h-3" /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{config.nome}</p>
                        {config.horario && (
                          <p className="text-xs text-gray-500">Horário: {config.horario}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => iniciarEdicao(config)}
                        className="text-xs text-orange-600 hover:text-orange-800 px-2 py-1 rounded hover:bg-orange-50 flex items-center gap-1"
                      >
                        <FileEdit className="w-3 h-3" /> Editar
                      </button>
                      <button
                        onClick={() => handleToggleAtivo(config)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Desativar
                      </button>
                    </div>
                  </div>
                )}
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
    </div>  // ← CORREÇÃO 1: fechamento do return de AbaConfiguracoes (estava faltando)
  );
}  // ← CORREÇÃO 1: fechamento da função AbaConfiguracoes (estava faltando)

// ─── AbaObservacoesProfessores ─────────────────────────────────────────────────────────────────────────────────
interface DiaryEventItem {
  id: string;
  type: string;
  title?: string;
  description?: string;
  occurredAt: string;
  createdBy?: string;
  child?: { id: string; firstName: string; lastName: string };
  classroom?: { id: string; name: string };
}

const DIARY_TYPE_LABEL: Record<string, string> = {
  REFEICAO: 'Refeição',
  ALIMENTACAO: 'Alimentação',
  SAUDE: 'Saúde',
  COMPORTAMENTO: 'Comportamento',
  SONO: 'Sono',
  ATIVIDADE: 'Atividade',
  OCORRENCIA: 'Ocorrência',
  OUTRO: 'Outro',
};

function AbaObservacoesProfessores({ unitId }: { unitId: string }) {
  const [eventos, setEventos] = useState<DiaryEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<'REFEICAO' | 'ALIMENTACAO' | ''>('REFEICAO');
  const [busca, setBusca] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [turmas, setTurmas] = useState<{ id: string; name: string }[]>([]);
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));

  // Carregar turmas para o filtro
  useEffect(() => {
    http.get('/lookup/classrooms/accessible', { params: { unitId } })
      .then((r) => setTurmas(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setTurmas([]));
  }, [unitId]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { unitId, limit: '200', startDate: dataInicio, endDate: dataFim };
      if (filtroTipo) params.type = filtroTipo;
      if (filtroTurma) params.classroomId = filtroTurma;
      const res = await http.get('/diary-events', { params });
      setEventos(res.data?.data ?? res.data ?? []);
    } catch {
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, [unitId, filtroTipo, filtroTurma, dataInicio, dataFim]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = eventos.filter((e) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      e.child?.firstName?.toLowerCase().includes(q) ||
      e.child?.lastName?.toLowerCase().includes(q) ||
      e.classroom?.name?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por criança, turma ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <select
          value={filtroTurma}
          onChange={(e) => setFiltroTurma(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">Todas as turmas</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as 'REFEICAO' | 'ALIMENTACAO' | '')}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="REFEICAO">Refeições</option>
          <option value="ALIMENTACAO">Alimentação</option>
          <option value="">Todos os tipos</option>
        </select>
        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        <button onClick={carregar} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* Resumo */}
      <div className="text-sm text-gray-500">{filtrados.length} registro{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}</div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando observações...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
          <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Nenhuma observação encontrada</p>
          <p className="text-sm mt-1">Os professores ainda não registraram observações alimentares no período selecionado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((e) => (
            <div key={e.id} className="bg-white rounded-xl border p-4 flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-lg">
                {e.type === 'REFEICAO' ? '🍽️' : '🥕'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800 text-sm">
                    {e.child ? `${e.child.firstName} ${e.child.lastName}` : 'Criança não identificada'}
                  </span>
                  {e.classroom && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{e.classroom.name}</span>
                  )}
                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                    {DIARY_TYPE_LABEL[e.type] ?? e.type}
                  </span>
                </div>
                {e.title && <p className="text-sm font-medium text-gray-700 mt-1">{e.title}</p>}
                {e.description && <p className="text-sm text-gray-600 mt-0.5">{e.description}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(e.occurredAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {e.createdBy && ` — por ${e.createdBy}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AbaAnotacoesNutricionais ─────────────────────────────────────────────────────────────────────────────────
interface DevObservation {
  id: string;
  childId: string;
  dietaryNotes?: string;
  recommendations?: string;
  healthNotes?: string;
  date: string;
  createdBy: string;
  child?: { id: string; firstName: string; lastName: string };
}

function AbaAnotacoesNutricionais({ unitId, userId }: { unitId: string; userId: string }) {
  const [criancas, setCriancas] = useState<{ id: string; firstName: string; lastName: string; enrollments?: { classroom?: { id: string; name: string } }[] }[]>([]);
  const [criancaSelecionada, setCriancaSelecionada] = useState<string>('');
  const [observacoes, setObservacoes] = useState<DevObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTurmaAnot, setFiltroTurmaAnot] = useState('');
  const [turmasAnot, setTurmasAnot] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ dietaryNotes: '', recommendations: '', healthNotes: '' });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Carregar turmas para filtro
  useEffect(() => {
    http.get('/lookup/classrooms/accessible', { params: { unitId } })
      .then((r) => setTurmasAnot(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setTurmasAnot([]));
  }, [unitId]);

  // Carregar crianças da unidade (com enrollments para filtrar por turma)
  useEffect(() => {
    http.get('/children', { params: { unitId, limit: '500', include: 'enrollments' } })
      .then((r) => setCriancas(r.data?.data ?? r.data ?? []))
      .catch(() => setCriancas([]));
  }, [unitId]);

  // Carregar observações da criança selecionada
  const carregarObs = useCallback(async () => {
    if (!criancaSelecionada) return;
    setLoading(true);
    try {
      const r = await http.get('/development-observations', {
        params: { childId: criancaSelecionada, category: 'NUTRICAO', limit: '50' },
      });
      setObservacoes(r.data?.data ?? r.data ?? []);
    } catch { setObservacoes([]); }
    finally { setLoading(false); }
  }, [criancaSelecionada]);

  useEffect(() => { carregarObs(); }, [carregarObs]);

  const salvar = async () => {
    if (!criancaSelecionada) { setErro('Selecione uma criança.'); return; }
    if (!form.dietaryNotes && !form.recommendations && !form.healthNotes) {
      setErro('Preencha pelo menos um campo.'); return;
    }
    setSalvando(true); setErro(''); setSucesso('');
    try {
      if (editandoId) {
        await http.patch(`/development-observations/${editandoId}`, {
          dietaryNotes: form.dietaryNotes || undefined,
          recommendations: form.recommendations || undefined,
          healthNotes: form.healthNotes || undefined,
        });
      } else {
        await http.post('/development-observations', {
          childId: criancaSelecionada,
          category: 'NUTRICAO',
          createdBy: userId,
          date: new Date().toISOString(),
          dietaryNotes: form.dietaryNotes || undefined,
          recommendations: form.recommendations || undefined,
          healthNotes: form.healthNotes || undefined,
        });
      }
      setSucesso('Anotação salva com sucesso.');
      setForm({ dietaryNotes: '', recommendations: '', healthNotes: '' });
      setEditandoId(null);
      carregarObs();
    } catch { setErro('Erro ao salvar. Tente novamente.'); }
    finally { setSalvando(false); }
  };

  const iniciarEdicao = (obs: DevObservation) => {
    setEditandoId(obs.id);
    setForm({
      dietaryNotes: obs.dietaryNotes ?? '',
      recommendations: obs.recommendations ?? '',
      healthNotes: obs.healthNotes ?? '',
    });
    setSucesso(''); setErro('');
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setForm({ dietaryNotes: '', recommendations: '', healthNotes: '' });
    setErro(''); setSucesso('');
  };

  const criancasFiltradas = criancas.filter((c) => {
    const q = busca.toLowerCase();
    const nomeOk = !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q);
    const turmaOk = !filtroTurmaAnot || c.enrollments?.some((e) => e.classroom?.id === filtroTurmaAnot);
    return nomeOk && turmaOk;
  });

  const criancaAtual = criancas.find((c) => c.id === criancaSelecionada);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna esquerda: seletor de criança */}
      <div className="bg-white rounded-xl border p-4 space-y-3 lg:col-span-1">
        <h3 className="font-semibold text-gray-800 text-sm">Selecionar Criança</h3>
        {turmasAnot.length > 0 && (
          <select
            value={filtroTurmaAnot}
            onChange={(e) => { setFiltroTurmaAnot(e.target.value); setCriancaSelecionada(''); }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="">Todas as turmas</option>
            {turmasAnot.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar criança..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {criancasFiltradas.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCriancaSelecionada(c.id); setEditandoId(null); setForm({ dietaryNotes: '', recommendations: '', healthNotes: '' }); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                criancaSelecionada === c.id
                  ? 'bg-orange-50 text-orange-700 font-medium border border-orange-200'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              {c.firstName} {c.lastName}
              {c.enrollments?.[0]?.classroom?.name && (
                <span className="text-xs text-gray-400 ml-1">({c.enrollments[0].classroom.name})</span>
              )}
            </button>
          ))}
          {criancasFiltradas.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">Nenhuma criança encontrada.</p>
          )}
        </div>
      </div>

      {/* Coluna direita: formulário e histórico */}
      <div className="lg:col-span-2 space-y-4">
        {!criancaSelecionada ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <FileEdit className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Selecione uma criança</p>
            <p className="text-sm mt-1">Escolha uma criança na lista ao lado para ver ou criar anotações nutricionais.</p>
          </div>
        ) : (
          <>
            {/* Formulário */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">
                  {editandoId ? 'Editar Anotação' : 'Nova Anotação'} — {criancaAtual?.firstName} {criancaAtual?.lastName}
                </h3>
                {editandoId && (
                  <button onClick={cancelarEdicao} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                    <X className="w-3 h-3" /> Cancelar edição
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observações Alimentares</label>
                  <textarea
                    rows={3}
                    value={form.dietaryNotes}
                    onChange={(e) => setForm((f) => ({ ...f, dietaryNotes: e.target.value }))}
                    placeholder="Descrição sobre alimentação, aceitação de alimentos, preferências..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Recomendações Nutricionais</label>
                  <textarea
                    rows={2}
                    value={form.recommendations}
                    onChange={(e) => setForm((f) => ({ ...f, recommendations: e.target.value }))}
                    placeholder="Orientações, adaptações, substituições recomendadas..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observações de Saúde Relacionadas</label>
                  <textarea
                    rows={2}
                    value={form.healthNotes}
                    onChange={(e) => setForm((f) => ({ ...f, healthNotes: e.target.value }))}
                    placeholder="Condições de saúde relevantes para a alimentação..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  />
                </div>
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
              {sucesso && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{sucesso}</p>}
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {salvando ? 'Salvando...' : editandoId ? 'Atualizar Anotação' : 'Salvar Anotação'}
              </button>
            </div>

            {/* Histórico */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Histórico de Anotações</h3>
                <button onClick={carregarObs} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Atualizar
                </button>
              </div>
              {loading ? (
                <p className="text-center text-sm text-gray-400 py-6">Carregando...</p>
              ) : observacoes.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">Nenhuma anotação registrada para esta criança.</p>
              ) : (
                <div className="space-y-3">
                  {observacoes.map((obs) => (
                    <div key={obs.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {new Date(obs.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                        <button
                          onClick={() => iniciarEdicao(obs)}
                          className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                        >
                          <FileEdit className="w-3 h-3" /> Editar
                        </button>
                      </div>
                      {obs.dietaryNotes && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">Observações Alimentares</p>
                          <p className="text-sm text-gray-700 mt-0.5">{obs.dietaryNotes}</p>
                        </div>
                      )}
                      {obs.recommendations && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">Recomendações</p>
                          <p className="text-sm text-gray-700 mt-0.5">{obs.recommendations}</p>
                        </div>
                      )}
                      {obs.healthNotes && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">Saúde</p>
                          <p className="text-sm text-gray-700 mt-0.5">{obs.healthNotes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── AbaTurmasNutricional ─────────────────────────────────────────────────────────────────────────────────
function AbaTurmasNutricional({
  turmas,
  dietas,
  healthPorTurma = {},
}: {
  turmas: { id: string; name: string; totalCriancas: number; comRestricao: number }[];
  dietas: DietaryRestriction[];
  healthPorTurma?: Record<string, { children: any[]; stats: any }>;
}) {
  const [expandida, setExpandida] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {turmas.map((t) => {
        const pct = t.totalCriancas > 0 ? Math.round((t.comRestricao / t.totalCriancas) * 100) : 0;
        // Preferir dados ricos do health dashboard; fallback para dietas já carregadas
        const healthData = healthPorTurma[t.id];
        const criancasRicas: any[] = healthData?.children ?? [];
        const stats = healthData?.stats ?? {};
        const dietasDaTurma = dietas.filter((d) =>
          d.isActive && d.child?.enrollments?.some((e) => e.classroom?.id === t.id)
        );
        // Usar crianças do health dashboard se disponível
        const temDadosRicos = criancasRicas.length > 0;
        const aberta = expandida === t.id;
        return (
          <div key={t.id} className="bg-white rounded-xl border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">{t.name}</p>
              {t.comRestricao > 0 && (
                <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  {t.comRestricao} restr.
                </span>
              )}
            </div>
            {/* KPIs da turma */}
            {temDadosRicos && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="font-bold text-gray-800">{stats.total ?? criancasRicas.length}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <p className="text-xs text-red-400">Alergias</p>
                  <p className="font-bold text-red-700">{stats.comAlergia ?? 0}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-2">
                  <p className="text-xs text-orange-400">Dietas</p>
                  <p className="font-bold text-orange-700">{stats.comDieta ?? 0}</p>
                </div>
              </div>
            )}
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
            {(temDadosRicos ? criancasRicas.length > 0 : dietasDaTurma.length > 0) && (
              <button
                onClick={() => setExpandida(aberta ? null : t.id)}
                className="flex items-center gap-1 text-xs text-orange-600 hover:underline mt-1 self-start"
              >
                {aberta ? '▲ Ocultar detalhes' : '▼ Ver crianças com restrições'}
              </button>
            )}
            {aberta && (
              <div className="space-y-2 border-t pt-3 mt-1">
                {temDadosRicos ? (
                  // Dados ricos do health dashboard
                  criancasRicas.map((c: any) => (
                    <div key={c.id} className="bg-gray-50 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                          {c.firstName?.[0]}{c.lastName?.[0]}
                        </div>
                        <p className="font-medium text-gray-800 text-sm">{c.firstName} {c.lastName}</p>
                      </div>
                      {c.allergies && (
                        <p className="text-xs text-red-600">⛔ Alergia: {c.allergies}</p>
                      )}
                      {c.dietaryRestrictions?.map((r: any) => (
                        <div key={r.id} className="text-xs">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-1 ${
                            r.severity === 'severa' ? 'bg-red-100 text-red-700' :
                            r.severity === 'moderada' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{r.severity ?? 'leve'}</span>
                          <span className="text-gray-700">{r.name ?? r.type}</span>
                          {r.forbiddenFoods && (
                            <p className="text-red-500 mt-0.5">⛔ {r.forbiddenFoods}</p>
                          )}
                        </div>
                      ))}
                      {c.medicalConditions && (
                        <p className="text-xs text-blue-600">🏥 {c.medicalConditions}</p>
                      )}
                    </div>
                  ))
                ) : (
                  // Fallback: dados das dietas já carregadas
                  dietasDaTurma.map((d) => (
                    <div key={d.id} className="flex items-start gap-2 text-xs">
                      <span className="mt-0.5">{SEVERITY_CONFIG[d.severity ?? '']?.icon ?? '⚠️'}</span>
                      <div>
                        <p className="font-medium text-gray-800">{d.child.firstName} {d.child.lastName}</p>
                        <p className="text-gray-500">{d.name} — {TYPE_LABEL[d.type] ?? d.type}</p>
                        {d.forbiddenFoods && (
                          <p className="text-red-600 mt-0.5">⛔ {d.forbiddenFoods}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Constantes de cores para gráficos ──────────────────────────────────────
const CORES_RELATORIO = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

// ─── AbaRelatorioConsolidado ─────────────────────────────────────────────────────────────────────────────────
function AbaRelatorioConsolidado({ unitId }: { unitId: string }) {
  const hoje = new Date();
  const printRef = useRef<HTMLDivElement>(null);
  const [dataInicio, setDataInicio] = useState(
    new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(hoje.toISOString().split('T')[0]);
  const [cardapios, setCardapios] = useState<Cardapio[]>([]);
  const [dietas, setDietas] = useState<DietaryRestriction[]>([]);
  const [loading, setLoading] = useState(false);
  const [gerado, setGerado] = useState(false);
  // Filtros adicionais
  const [filtroTurmaRel, setFiltroTurmaRel] = useState('');
  const [filtroTipoRel, setFiltroTipoRel] = useState('');
  const [turmasRel, setTurmasRel] = useState<{ id: string; name: string }[]>([]);

  // Carregar turmas para filtro
  useEffect(() => {
    if (!unitId) return;
    http.get('/lookup/classrooms/accessible', { params: { unitId } })
      .then((r) => setTurmasRel(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setTurmasRel([]));
  }, [unitId]);

  const gerar = async () => {
    setLoading(true); setGerado(false);
    try {
      const [cRes, dRes] = await Promise.all([
        http.get('/cardapios', { params: { unitId, dataInicio, dataFim, limit: '100' } }),
        http.get('/children/dietary-restrictions/unidade', { params: { unitId, limit: '500' } }),
      ]);
      setCardapios(cRes.data?.data ?? cRes.data ?? []);
      setDietas(dRes.data?.data ?? dRes.data ?? []);
      setGerado(true);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  // Dietas filtradas pelos filtros de turma e tipo
  const dietasFiltradas = dietas.filter((d) => {
    const turmaOk = !filtroTurmaRel || d.child?.enrollments?.some((e: any) => e.classroom?.id === filtroTurmaRel);
    const tipoOk = !filtroTipoRel || d.type === filtroTipoRel;
    return turmaOk && tipoOk;
  });

  // Dados para gráfico de pizza: restrições por tipo
  const restricoesPorTipo = dietasFiltradas.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] ?? 0) + 1;
    return acc;
  }, {});
  const dadosPizza = Object.entries(restricoesPorTipo).map(([tipo, qtd]) => ({
    name: TYPE_LABEL[tipo] ?? tipo,
    value: qtd,
  }));

  // Dados para gráfico de barras: cardápios por semana (publicados vs rascunhos)
  const dadosCardapiosPorSemana = cardapios
    .slice(0, 12)
    .map((c) => ({
      semana: c.semana?.slice(5) ?? c.semana, // MM-DD
      publicado: c.publicado ? 1 : 0,
      rascunho: c.publicado ? 0 : 1,
    }))
    .reverse();

  // Dados para gráfico de linha: tendência de itens por semana
  const dadosTendencia = cardapios
    .slice(0, 8)
    .map((c) => ({
      semana: c.semana?.slice(5) ?? c.semana,
      itens: c.refeicoes?.reduce((acc, r) => acc + (r.itens?.length ?? 0), 0) ?? 0,
    }))
    .reverse();

  // Totais
  const totalPublicados = cardapios.filter((c) => c.publicado).length;
  const totalRascunhos = cardapios.filter((c) => !c.publicado).length;

  const exportarCSV = () => {
    const linhas: string[] = [
      `Relatório Nutricional Consolidado`,
      `Período: ${dataInicio} a ${dataFim}`,
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      '',
      '=== CARDÁPIOS PUBLICADOS ===',
      'Semana,Status,Publicado Em,Total Itens',
      ...cardapios.map((c) => {
        const totalItens = c.refeicoes?.reduce((acc, r) => acc + (r.itens?.length ?? 0), 0) ?? 0;
        return `${c.semana},${c.publicado ? 'Publicado' : 'Rascunho'},${c.publicadoEm ? new Date(c.publicadoEm).toLocaleDateString('pt-BR') : '-'},${totalItens}`;
      }),
      '',
      '=== RESTRIÇÕES ALIMENTARES ATIVAS ===',
      'Criança,Tipo,Descrição,Turma',
      ...dietasFiltradas.map((d) => {
        const nome = `${d.child?.firstName ?? ''} ${d.child?.lastName ?? ''}`.trim();
        const turma = d.child?.enrollments?.map((e: any) => e.classroom?.name).filter(Boolean).join('; ') || 'Não atribuída';
        return `${nome},${d.type},"${d.description ?? ''}",${turma}`;
      }),
    ];
    const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-nutricional-${dataInicio}-${dataFim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarPDF = () => {
    const conteudo = printRef.current;
    if (!conteudo) return;
    const win = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes');
    if (!win) { alert('Permita pop-ups para gerar o PDF.'); return; }
    win.document.write(`
      <!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"><title>Relatório Nutricional</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
        h1 { font-size: 18px; color: #f97316; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #374151; margin: 16px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 11px; color: #6b7280; }
        td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
        .pub { background: #d1fae5; color: #065f46; }
        .ras { background: #fef3c7; color: #92400e; }
        .cards { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; min-width: 120px; }
        .card p { margin: 0; font-size: 10px; color: #6b7280; }
        .card strong { font-size: 22px; color: #111827; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h1>Relatório Nutricional Consolidado</h1>
      <p>Período: ${dataInicio} a ${dataFim} &nbsp;|&nbsp; Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
      <div class="cards">
        <div class="card"><p>Cardápios Publicados</p><strong>${totalPublicados}</strong></div>
        <div class="card"><p>Rascunhos</p><strong>${totalRascunhos}</strong></div>
        <div class="card"><p>Restrições Ativas</p><strong>${dietasFiltradas.length}</strong></div>
        <div class="card"><p>Tipos de Restrição</p><strong>${dadosPizza.length}</strong></div>
      </div>
      <h2>Distribuição de Restrições por Tipo</h2>
      <table><thead><tr><th>Tipo</th><th>Quantidade</th></tr></thead><tbody>
        ${dadosPizza.map((r) => `<tr><td>${r.name}</td><td>${r.value}</td></tr>`).join('')}
      </tbody></table>
      <h2>Cardápios no Período (${cardapios.length})</h2>
      <table><thead><tr><th>Semana</th><th>Status</th><th>Publicado Em</th><th>Itens</th></tr></thead><tbody>
        ${cardapios.map((c) => {
          const itens = c.refeicoes?.reduce((acc, r) => acc + (r.itens?.length ?? 0), 0) ?? 0;
          return `<tr><td>${c.semana}</td><td><span class="badge ${c.publicado ? 'pub' : 'ras'}">${c.publicado ? 'Publicado' : 'Rascunho'}</span></td><td>${c.publicadoEm ? new Date(c.publicadoEm).toLocaleDateString('pt-BR') : '—'}</td><td>${itens}</td></tr>`;
        }).join('')}
      </tbody></table>
      <h2>Restrições Alimentares Ativas (${dietasFiltradas.length})</h2>
      <table><thead><tr><th>Criança</th><th>Tipo</th><th>Descrição</th><th>Turma</th></tr></thead><tbody>
        ${dietasFiltradas.map((d) => {
          const nome = `${d.child?.firstName ?? ''} ${d.child?.lastName ?? ''}`.trim();
          const turma = d.child?.enrollments?.map((e: any) => e.classroom?.name).filter(Boolean).join(', ') || 'Não atribuída';
          return `<tr><td>${nome || '—'}</td><td>${TYPE_LABEL[d.type] ?? d.type}</td><td>${d.description ?? '—'}</td><td>${turma}</td></tr>`;
        }).join('')}
      </tbody></table>
      </body></html>
    `);
    win.document.close();
    win.onload = () => { setTimeout(() => { win.focus(); win.print(); }, 300); };
  };

  return (
    <div className="space-y-6" ref={printRef}>
      {/* Filtros */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Parâmetros do Relatório</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          {turmasRel.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Turma</label>
              <select
                value={filtroTurmaRel}
                onChange={(e) => setFiltroTurmaRel(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="">Todas as turmas</option>
                {turmasRel.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Restrição</label>
            <select
              value={filtroTipoRel}
              onChange={(e) => setFiltroTipoRel(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="">Todos os tipos</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button
            onClick={gerar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
          {gerado && (
            <button
              onClick={exportarCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          )}
          {gerado && (
            <button
              onClick={exportarPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
            >
              <Printer className="w-4 h-4" /> Exportar PDF
            </button>
          )}
        </div>
      </div>

      {!gerado && (
        <div className="bg-white rounded-xl border p-10 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">Selecione o período e clique em Gerar Relatório</p>
          <p className="text-xs text-gray-400 mt-1">Os gráficos e dados serão exibidos aqui</p>
        </div>
      )}

      {gerado && (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Cardápios Publicados', value: totalPublicados, color: 'green' },
              { label: 'Rascunhos', value: totalRascunhos, color: 'yellow' },
              { label: 'Restrições Ativas', value: dietasFiltradas.length, color: 'red' },
              { label: 'Tipos de Restrição', value: dadosPizza.length, color: 'blue' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-white rounded-xl border p-4 border-l-4 border-l-${color}-400`}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
              </div>
            ))}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gráfico de pizza: distribuição de restrições por tipo */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Distribuição de Restrições por Tipo
              </h3>
              {dadosPizza.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <AlertTriangle className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma restrição encontrada</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie
                        data={dadosPizza}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {dadosPizza.map((_, i) => (
                          <Cell key={i} fill={CORES_RELATORIO[i % CORES_RELATORIO.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {dadosPizza.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CORES_RELATORIO[i % CORES_RELATORIO.length] }} />
                        <span className="text-gray-600 flex-1 text-xs">{item.name}</span>
                        <span className="font-semibold text-gray-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Gráfico de barras: cardápios por semana */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-orange-500" />
                Cardápios por Semana
              </h3>
              {dadosCardapiosPorSemana.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <BookOpen className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Nenhum cardápio no período</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dadosCardapiosPorSemana} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="publicado" name="Publicado" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rascunho" name="Rascunho" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Gráfico de linha: tendência de itens por semana */}
          {dadosTendencia.length > 1 && (
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-orange-500" />
                Tendência de Itens Planejados por Semana
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dadosTendencia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="itens" name="Itens Planejados" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabela: Cardápios */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Cardápios no Período ({cardapios.length})</h3>
            {cardapios.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum cardápio encontrado no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500 text-xs">
                      <th className="pb-2">Semana</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Publicado Em</th>
                      <th className="pb-2">Itens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cardapios.map((c) => {
                      const totalItens = c.refeicoes?.reduce((acc, r) => acc + (r.itens?.length ?? 0), 0) ?? 0;
                      return (
                        <tr key={c.id}>
                          <td className="py-2 font-medium">{c.semana}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              c.publicado ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {c.publicado ? 'Publicado' : 'Rascunho'}
                            </span>
                          </td>
                          <td className="py-2 text-gray-500">
                            {c.publicadoEm ? new Date(c.publicadoEm).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="py-2 text-gray-600">{totalItens}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabela: Restrições */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Restrições Alimentares ({dietasFiltradas.length})</h3>
            {dietasFiltradas.length === 0 ? (
              <div className="text-center py-6">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">Nenhuma restrição encontrada com os filtros selecionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500 text-xs">
                      <th className="pb-2">Criança</th>
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2">Descrição</th>
                      <th className="pb-2">Turma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dietasFiltradas.map((d) => {
                      const nome = `${d.child?.firstName ?? ''} ${d.child?.lastName ?? ''}`.trim();
                      const turma = d.child?.enrollments?.map((e: any) => e.classroom?.name).filter(Boolean).join(', ') || 'Não atribuída';
                      return (
                        <tr key={d.id}>
                          <td className="py-2 font-medium">{nome || '—'}</td>
                          <td className="py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">{TYPE_LABEL[d.type] ?? d.type}</span>
                          </td>
                          <td className="py-2 text-gray-600 max-w-xs truncate">{d.description ?? '—'}</td>
                          <td className="py-2 text-gray-500">{turma}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── AbaHistorico ─────────────────────────────────────────────────────────────────────────────────
function AbaHistorico({ unitId }: { unitId: string }) {
  const PAGE_SIZE = 10;
  const [cardapios, setCardapios] = useState<Cardapio[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [filtroPublicado, setFiltroPublicado] = useState<'' | 'true' | 'false'>('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCardapios({
        unitId,
        publicado: filtroPublicado === '' ? undefined : filtroPublicado === 'true',
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
        limit: PAGE_SIZE,
        skip: pagina * PAGE_SIZE,
      });
      setCardapios(res.data);
      setTotal(res.total);
    } catch {
      setCardapios([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [unitId, filtroPublicado, dataInicio, dataFim, pagina]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalPaginas = Math.ceil(total / PAGE_SIZE);

  const contarItens = (c: Cardapio) =>
    c.refeicoes.reduce((acc, r) => acc + r.itens.length, 0);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Status</label>
          <select
            value={filtroPublicado}
            onChange={(e) => { setFiltroPublicado(e.target.value as '' | 'true' | 'false'); setPagina(0); }}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="true">Publicados</option>
            <option value="false">Rascunhos</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">De (semana)</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => { setDataInicio(e.target.value); setPagina(0); }}
            className="border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Até (semana)</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => { setDataFim(e.target.value); setPagina(0); }}
            className="border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={() => { setFiltroPublicado(''); setDataInicio(''); setDataFim(''); setPagina(0); }}
          className="ml-auto flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className="w-4 h-4" /> Limpar
        </button>
      </div>

      {/* Contador */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {total} cardápio{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
        </span>
        <span className="text-sm text-gray-400">Página {pagina + 1} de {totalPaginas || 1}</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" /><p>Carregando...</p></div>
      ) : cardapios.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
          <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Nenhum cardápio encontrado</p>
          <p className="text-sm mt-1">Ajuste os filtros ou crie um novo cardápio na aba &ldquo;Cardápio Semanal&rdquo;.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cardapios.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border overflow-hidden">
              <button
                onClick={() => setExpandido(expandido === c.id ? null : c.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.publicado ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {c.publicado ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {c.publicado ? 'Publicado' : 'Rascunho'}
                  </span>
                  <span className="font-medium text-gray-800">{formatarSemana(c.semana)}</span>
                  {c.titulo && <span className="text-sm text-gray-500">— {c.titulo}</span>}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>{c.refeicoes.length} refeições</span>
                  <span>{contarItens(c)} itens</span>
                  {expandido === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {expandido === c.id && (
                <div className="border-t px-4 py-3 space-y-3">
                  {c.refeicoes.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Nenhuma refeição registrada neste cardápio.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {c.refeicoes.map((r) => (
                        <div key={r.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-600">
                              {DIA_SEMANA_LABELS[r.diaSemana]} — {TIPO_REFEICAO_LABELS[r.tipoRefeicao]}
                            </span>
                            <span className="text-xs text-gray-400">{r.itens.length} item{r.itens.length !== 1 ? 's' : ''}</span>
                          </div>
                          <ul className="space-y-0.5">
                            {r.itens.slice(0, 5).map((item, idx) => (
                              <li key={idx} className="text-xs text-gray-700 flex justify-between">
                                <span>{item.nome}</span>
                                {item.quantidade && <span className="text-gray-400">{item.quantidade}{item.unidade ?? 'g'}</span>}
                              </li>
                            ))}
                            {r.itens.length > 5 && (
                              <li className="text-xs text-gray-400 italic">+{r.itens.length - 5} mais...</li>
                            )}
                          </ul>
                          {r.totaisNutricionais && (
                            <div className="mt-2 pt-2 border-t flex gap-2 text-xs text-gray-500">
                              <span>{r.totaisNutricionais.calorias.toFixed(0)} kcal</span>
                              <span>· P: {r.totaisNutricionais.proteinas.toFixed(1)}g</span>
                              <span>· C: {r.totaisNutricionais.carboidratos.toFixed(1)}g</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {c.observacoes && (
                    <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      <strong>Obs:</strong> {c.observacoes}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
            disabled={pagina === 0}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPaginas, 7) }, (_, i) => {
            const p = pagina < 4 ? i : pagina - 3 + i;
            if (p >= totalPaginas) return null;
            return (
              <button
                key={p}
                onClick={() => setPagina(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium ${
                  p === pagina ? 'bg-green-600 text-white' : 'border hover:bg-gray-50'
                }`}
              >
                {p + 1}
              </button>
            );
          })}
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
            disabled={pagina >= totalPaginas - 1}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Módulo Cardápios Unificado ──────────────────────────────────────────────
// Une planejador semanal + histórico em uma única seção com sub-tabs locais
function ModuloCardapios({ unitId }: { unitId: string }) {
  const [subTab, setSubTab] = useState<'planejador' | 'historico'>('planejador');

  return (
    <div className="space-y-4">
      {/* Sub-tabs locais */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setSubTab('planejador')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            subTab === 'planejador'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Planejador Semanal
        </button>
        <button
          onClick={() => setSubTab('historico')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            subTab === 'historico'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <History className="w-4 h-4" />
          Histórico e Filtros
        </button>
      </div>

      {/* Conteúdo da sub-tab */}
      {subTab === 'planejador' && <AbaCardapio unitId={unitId} />}
      {subTab === 'historico' && <AbaHistorico unitId={unitId} />}
    </div>
  );
}

// ─── Tipos de seção da sidebar ──────────────────────────────────────────────
type SecaoNutri =
  | 'visao-geral'
  | 'cardapios'
  | 'cardapios-nutricao'
  | 'turmas'
  | 'observacoes-prof'
  | 'anotacoes-nutri'
  | 'relatorio'
  | 'configuracoes'
  | 'dietas'
  | 'pedidos';

interface NavItem {
  id: SecaoNutri;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'visao-geral',      label: 'Visão Geral',            icon: BarChart2,     group: 'Principal' },
  { id: 'cardapios',        label: 'Cardápios',              icon: BookOpen,      group: 'Cardápios' },
  { id: 'cardapios-nutricao', label: 'Cálculo Nutricional',  icon: Apple,         group: 'Cardápios' },
  { id: 'turmas',           label: 'Turmas e Crianças',      icon: Users,         group: 'Acompanhamento' },
  { id: 'dietas',           label: 'Dietas e Restrições',    icon: AlertTriangle, group: 'Acompanhamento' },
  { id: 'observacoes-prof', label: 'Obs. dos Professores',   icon: Eye,           group: 'Observações' },
  { id: 'anotacoes-nutri',  label: 'Anotações Nutricionais', icon: FileEdit,      group: 'Observações' },
  { id: 'relatorio',        label: 'Relatórios',             icon: FileText,      group: 'Relatórios' },
  { id: 'pedidos',          label: 'Pedidos de Alimentação', icon: ShoppingCart,  group: 'Relatórios' },
  { id: 'configuracoes',    label: 'Configurações',          icon: Settings,      group: 'Configurações' },
];

const NAV_GROUPS = ['Principal', 'Cardápios', 'Acompanhamento', 'Observações', 'Relatórios', 'Configurações'];

// ─── Componente Principal ─────────────────────────────────────────────────────
function DashboardNutricionistaPage() {
  const { user } = useAuth();
  const unitId = (user as any)?.unitId ?? '';
  const [secao, setSecao] = useState<SecaoNutri>('visao-geral');
  const [sidebarAberta, setSidebarAberta] = useState(false);

  // manter compat com código legado que usa 'aba'
  const aba = secao;

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
  // Dados ricos do health dashboard por turma (classroomId -> children)
  const [healthPorTurma, setHealthPorTurma] = useState<Record<string, { children: any[]; stats: any }>>({});

  // Alias para compatibilidade com blocos legados que usam 'aba'
  const _ = aba; void _;

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
    if (!unitId) return;
    setLoadingTurmas(true);
    try {
      // 1. Buscar lista de turmas acessíveis
      const { data: classData } = await http.get('/lookup/classrooms/accessible', {
        params: { unitId },
      });
      const turmasList: { id: string; name: string }[] = Array.isArray(classData)
        ? classData
        : classData?.data ?? [];

      // 2. Para cada turma, buscar health dashboard com dados reais de crianças
      const resultados = await Promise.allSettled(
        turmasList.map((t) =>
          http.get('/children/health/dashboard', {
            params: { unitId, classroomId: t.id },
          }).then((r) => ({ id: t.id, name: t.name, data: r.data }))
        )
      );

      const turmasComInfo: { id: string; name: string; totalCriancas: number; comRestricao: number }[] = [];
      const healthMap: Record<string, { children: any[]; stats: any }> = {};

      resultados.forEach((res, idx) => {
        const t = turmasList[idx];
        if (res.status === 'fulfilled') {
          const { data } = res.value;
          const children: any[] = data?.children ?? [];
          const stats = data?.stats ?? {};
          // total de crianças matriculadas na turma (via lookup)
          // comRestricao = crianças com alguma restrição ativa
          const comRestricao = children.filter(
            (c: any) => c.dietaryRestrictions?.length > 0 || c.allergies
          ).length;
          turmasComInfo.push({
            id: t.id,
            name: t.name,
            totalCriancas: stats.total ?? children.length,
            comRestricao,
          });
          healthMap[t.id] = { children, stats };
        } else {
          // Fallback: usar dados de dietas já carregadas
          const criancasNaTurma = dietas.filter((d) =>
            d.child?.enrollments?.some((e) => e.classroom?.id === t.id),
          );
          const unicas = new Set(criancasNaTurma.map((d) => d.child.id));
          turmasComInfo.push({
            id: t.id,
            name: t.name,
            totalCriancas: unicas.size,
            comRestricao: unicas.size,
          });
          healthMap[t.id] = { children: [], stats: {} };
        }
      });

      setTurmas(turmasComInfo);
      setHealthPorTurma(healthMap);
    } catch {
      setTurmas([]);
      setHealthPorTurma({});
    } finally {
      setLoadingTurmas(false);
    }
  }, [unitId, dietas]);

  useEffect(() => { carregarDietas(); }, [carregarDietas]);
  useEffect(() => { if (secao === 'pedidos') carregarPedidos(); }, [secao, carregarPedidos]);
  useEffect(() => { if (secao === 'turmas') carregarTurmas(); }, [secao, carregarTurmas]);

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
  const nomeUsuario = ((user?.nome as string) || '').split(' ')[0] || 'Nutricionista';

  // ── Título da seção atual ──
  const tituloSecao = NAV_ITEMS.find((n) => n.id === secao)?.label ?? 'Painel da Nutricionista';

  return (
    <PageShell
      title="Painel da Nutricionista"
      subtitle={`Olá, ${nomeUsuario}! Gestão de cardápios, restrições e nutrição.`}
    >
      {/* Layout principal: sidebar + conteúdo */}
      <div className="flex gap-0 -mx-4 md:-mx-6 lg:-mx-8 min-h-[calc(100vh-180px)]">

        {/* ── Overlay mobile ── */}
        {sidebarAberta && (
          <div
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={() => setSidebarAberta(false)}
          />
        )}

        {/* ── Sidebar lateral ── */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-30 lg:z-auto
            w-64 bg-white border-r flex-shrink-0
            flex flex-col
            transform transition-transform duration-200
            ${sidebarAberta ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Header da sidebar */}
          <div className="px-4 py-4 border-b bg-gradient-to-r from-orange-500 to-orange-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">Módulo Nutrição</p>
                <p className="text-orange-100 text-xs mt-0.5">{nomeUsuario}</p>
              </div>
              <button
                onClick={() => setSidebarAberta(false)}
                className="lg:hidden text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* KPIs compactos */}
          <div className="px-3 py-3 border-b bg-orange-50 grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-gray-800">{totalCriancasComRestricao}</p>
              <p className="text-[10px] text-gray-500 leading-tight">c/ restrição</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-red-700">{totalAlergias}</p>
              <p className="text-[10px] text-red-500 leading-tight">alergias</p>
            </div>
          </div>

          {/* Navegação */}
          <nav className="flex-1 overflow-y-auto py-2">
            {NAV_GROUPS.map((grupo) => {
              const itens = NAV_ITEMS.filter((n) => n.group === grupo);
              if (!itens.length) return null;
              return (
                <div key={grupo} className="mb-1">
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {grupo}
                  </p>
                  {itens.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => { setSecao(id); setSidebarAberta(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        secao === id
                          ? 'bg-orange-50 text-orange-700 font-semibold border-r-2 border-orange-500'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ── Área de conteúdo ── */}
        <main className="flex-1 min-w-0 overflow-auto">
          {/* Topbar do conteúdo */}
          <div className="sticky top-0 z-10 bg-white border-b px-4 md:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => setSidebarAberta(true)}
              className="lg:hidden p-1.5 rounded-lg border text-gray-500 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
            </button>
            <h2 className="font-semibold text-gray-800 text-sm">{tituloSecao}</h2>
          </div>

          {/* Conteúdo da seção */}
          <div className="p-4 md:p-6">

      {/* ── Seção: Visão Geral ── */}
      {secao === 'visao-geral' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4 flex flex-col gap-1">
              <span className="text-xs text-gray-500 font-medium">Crianças c/ Restrição</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Acesso Rápido</h3>
              <div className="space-y-2">
                {([
                  { id: 'cardapios' as SecaoNutri, label: 'Planejar cardápio da semana', icon: BookOpen },
                  { id: 'dietas' as SecaoNutri, label: 'Ver restrições alimentares', icon: AlertTriangle },
                  { id: 'turmas' as SecaoNutri, label: 'Resumo por turma', icon: Users },
                  { id: 'configuracoes' as SecaoNutri, label: 'Configurar refeições', icon: Settings },
                ] as { id: SecaoNutri; label: string; icon: React.ComponentType<{className?: string}> }[]).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setSecao(id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border hover:bg-orange-50 hover:border-orange-200 transition-colors text-sm text-gray-700"
                  >
                    <Icon className="w-4 h-4 text-orange-500" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Alertas</h3>
              {totalSeveras > 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">
                    <strong>{totalSeveras}</strong> criança{totalSeveras !== 1 ? 's' : ''} com restrição de severidade alta.
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-700">Nenhum alerta crítico no momento.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Seção: Dietas e Restrições ── */}
      {secao === 'dietas' && (
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
              <p className="font-medium">Nenhuma restrição alimentar cadastrada</p>
              <p className="text-sm mt-1 text-gray-400 max-w-xs mx-auto">
                Cadastre restrições pelo perfil de cada criança para visualizá-las aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dietasFiltradas.map((d) => {
                const sev = SEVERITY_CONFIG[d.severity ?? ''] ?? { label: d.severity ?? '—', color: 'text-gray-600', bg: 'bg-gray-100', icon: '•' };
                const turmasNomes = d.child?.enrollments
                  ?.map((e) => e.classroom?.name)
                  .filter(Boolean) ?? [];
                const turmasCrianca = turmasNomes.length > 0 ? turmasNomes.join(', ') : 'Turma não atribuída';
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

      {/* ── Seção: Pedidos de Alimentação ── */}
      {secao === 'pedidos' && (
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

      {/* ── Seção: Turmas e Crianças ── */}
      {secao === 'turmas' && (
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
            <AbaTurmasNutricional turmas={turmas} dietas={dietas} healthPorTurma={healthPorTurma} />
          )}
        </div>
      )}

      {/* ── Seção: Observações dos Professores ── */}
      {secao === 'observacoes-prof' && (
        unitId
          ? <AbaObservacoesProfessores unitId={unitId} />
          : <div className="text-center py-12 text-gray-400 bg-white rounded-xl border"><p className="font-medium">Unidade não identificada.</p></div>
      )}

      {/* ── Seção: Anotações Nutricionais ── */}
      {secao === 'anotacoes-nutri' && (
        unitId
          ? <AbaAnotacoesNutricionais unitId={unitId} userId={(user as any)?.id ?? ''} />
          : <div className="text-center py-12 text-gray-400 bg-white rounded-xl border"><p className="font-medium">Unidade não identificada.</p></div>
      )}

      {/* ── Seção: Cardápios (planejador semanal + histórico unificados) ── */}
      {secao === 'cardapios' && (
        unitId
          ? <ModuloCardapios unitId={unitId} />
          : <div className="text-center py-12 text-gray-400 bg-white rounded-xl border"><p className="font-medium">Unidade não identificada.</p></div>
      )}

      {/* ── Seção: Cálculo Nutricional ── */}
      {secao === 'cardapios-nutricao' && (
        unitId
          ? <AbaNutricao unitId={unitId} />
          : <div className="text-center py-12 text-gray-400 bg-white rounded-xl border"><p className="font-medium">Unidade não identificada.</p></div>
      )}

      {/* ── Seção: Relatórios ── */}
      {secao === 'relatorio' && (
        unitId
          ? <AbaRelatorioConsolidado unitId={unitId} />
          : <div className="text-center py-12 text-gray-400 bg-white rounded-xl border"><p className="font-medium">Unidade não identificada.</p></div>
      )}

      {/* ── Seção: Configurações de Refeição ── */}
      {secao === 'configuracoes' && (
        unitId
          ? <AbaConfiguracoes unitId={unitId} />
          : <div className="text-center py-12 text-gray-400 bg-white rounded-xl border"><p className="font-medium">Unidade não identificada.</p></div>
      )}

          </div>{/* fim p-4 md:p-6 */}
        </main>{/* fim main */}
      </div>{/* fim flex */}
    </PageShell>
  );
}

export { DashboardNutricionistaPage };
export default DashboardNutricionistaPage;
