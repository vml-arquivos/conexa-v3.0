/**
 * Dashboard da Nutricionista
 * Acesso: UNIDADE_NUTRICIONISTA
 * Abas: Dietas/Restrições | Pedidos de Alimentação | Resumo por Turma | Cardápio | Nutrição
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  RefreshCw, Plus, ChevronDown, ChevronUp,
  CheckCircle, Clock, XCircle, Printer, BookOpen,
  BarChart2, ChevronLeft, ChevronRight, Save, Trash2,
  Settings, GripVertical, History, Eye, FileEdit, X, FileText, Download,
  Activity, Heart, TrendingDown, TrendingUp, UserCheck, CalendarClock, Clipboard,
} from 'lucide-react';
import {
  listCardapios, createCardapio, updateCardapio, upsertRefeicao, deleteCardapio, calcularNutricao,
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

  const publicarCardapio = async () => {
    if (!cardapio) return;
    const novoStatus = !cardapio.publicado;
    const msg = novoStatus
      ? 'Publicar este cardápio? Ele ficará visível para professores e gestão.'
      : 'Despublicar este cardápio? Ele voltará para rascunho.';
    if (!confirm(msg)) return;
    setSalvando(true);
    setErro('');
    try {
      const atualizado = await updateCardapio(cardapio.id, { publicado: novoStatus });
      setCardapio(atualizado);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao atualizar status do cardápio.');
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
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  cardapio.publicado ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {cardapio.publicado ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {cardapio.publicado ? 'Publicado' : 'Rascunho'}
                </span>
                {' '}— {cardapio.refeicoes?.length ?? 0} refeições cadastradas
              </p>
            </div>
            <div className="flex items-center gap-2 no-print">
              {/* Botão Publicar / Despublicar */}
              <button
                onClick={publicarCardapio}
                disabled={salvando}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
                  cardapio.publicado
                    ? 'border border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title={cardapio.publicado ? 'Voltar para rascunho' : 'Publicar cardápio'}
              >
                {cardapio.publicado
                  ? <><Clock className="w-4 h-4" /> Despublicar</>
                  : <><CheckCircle className="w-4 h-4" /> Publicar</>}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                title="Imprimir ou salvar como PDF"
              >
                <Printer className="w-4 h-4" /> PDF
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
  // PARTE 4+5: alertas de dietas especiais
  const [restricoes, setRestricoes] = useState<DietaryRestriction[]>([]);
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
  // Carrega restrições/alergias para alertas de dietas especiais
  useEffect(() => {
    if (!unitId) return;
    http.get(`/dietary-restrictions/unidade/${unitId}?limit=200`)
      .then((r) => setRestricoes(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setRestricoes([]));
  }, [unitId]);

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
      {/* PARTE 4+5: Alertas de Dietas Especiais */}
      {restricoes.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-800">Alertas de Dietas Especiais</h3>
            <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              {restricoes.length} criança{restricoes.length !== 1 ? 's' : ''} com restrição
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Atenção ao planejar o cardápio: as crianças abaixo possuem restrições alimentares ativas que devem ser consideradas.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {restricoes.map((r) => {
              const sev = SEVERITY_CONFIG[r.severity ?? ''] ?? SEVERITY_CONFIG['leve'];
              const turma = r.child?.enrollments?.[0]?.classroom?.name ?? 'Sem turma';
              return (
                <div key={r.id} className={`flex items-start gap-3 p-3 rounded-lg border ${sev.bg} border-opacity-50`}>
                  <span className="text-lg mt-0.5">{sev.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800 text-sm">
                        {r.child?.firstName} {r.child?.lastName}
                      </span>
                      <span className="text-xs text-gray-500">{turma}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sev.color} ${sev.bg}`}>
                        {sev.label}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {TYPE_LABEL[r.type] ?? r.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 mt-1 font-medium">{r.name}</p>
                    {r.forbiddenFoods && (
                      <p className="text-xs text-red-700 mt-0.5">
                        <span className="font-semibold">Proibido:</span> {r.forbiddenFoods}
                      </p>
                    )}
                    {r.allowedFoods && (
                      <p className="text-xs text-green-700 mt-0.5">
                        <span className="font-semibold">Permitido:</span> {r.allowedFoods}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
// ─── Sub-componente: Aba Configurações de Refeição ──────────────────
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

  // Carregar crianças da unidade via lookup de turmas (garante enrollments + classroomId)
  useEffect(() => {
    if (!unitId) return;
    http.get('/lookup/classrooms/accessible', { params: { unitId } })
      .then(async (r) => {
        const turmasList: { id: string; name: string }[] = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        const resultados = await Promise.allSettled(
          turmasList.map((t) =>
            http.get(`/lookup/classrooms/${t.id}/children`).then((res) => ({
              turmaId: t.id,
              turmaName: t.name,
              children: Array.isArray(res.data) ? res.data : res.data?.data ?? [],
            }))
          )
        );
        const mapa = new Map<string, { id: string; firstName: string; lastName: string; enrollments: { classroom: { id: string; name: string } }[] }>();
        resultados.forEach((res) => {
          if (res.status === 'fulfilled') {
            const { turmaId, turmaName, children } = res.value;
            children.forEach((c: any) => {
              if (!mapa.has(c.id)) {
                mapa.set(c.id, { id: c.id, firstName: c.firstName, lastName: c.lastName, enrollments: [] });
              }
              mapa.get(c.id)!.enrollments.push({ classroom: { id: turmaId, name: turmaName } });
            });
          }
        });
        setCriancas(Array.from(mapa.values()).sort((a, b) => a.firstName.localeCompare(b.firstName)));
      })
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

// ─── AbaAcompanhamentoIndividual ─────────────────────────────────────────────────────────────────────────



// ─── AbaAcompanhamentoIndividual ────────────────────────────────────────────
// ARQUIVO: apps/web/src/pages/DashboardNutricionistaPage.tsx
// SUBSTITUI: do comentário "─── AbaAcompanhamentoIndividual" até o final do componente (função AbaAcompanhamentoIndividual + tipos acima)
//
// CORREÇÕES APLICADAS:
// 1. Adicionado estado formTurmaId para filtrar turma antes de selecionar criança
// 2. abrirFormNovo() reseta formTurmaId ao abrir formulário novo
// 3. Formulário novo exibe select de Turma antes do select de Criança
// 4. Select de Criança só habilita após turma selecionada e lista apenas crianças da turma
// ────────────────────────────────────────────────────────────────────────────

type StatusCasoNutricional = 'MONITORAMENTO' | 'ATENCAO_MODERADA' | 'ATENCAO_ALTA' | 'CRITICO';

interface AcompanhamentoNutricional {
  id: string;
  childId: string;
  statusCaso: StatusCasoNutricional;
  ativo: boolean;
  motivoAcompanhamento: string;
  objetivos?: string;
  condutaAtual?: string;
  restricoesOperacionais?: string;
  substituicoesSeguras?: string;
  orientacoesProfCozinha?: string;
  frequenciaRevisao?: string;
  proximaReavaliacao?: string;
  criadoEm: string;
  atualizadoEm: string;
  child?: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    photoUrl?: string;
    allergies?: string;
    medicalConditions?: string;
    enrollments?: { classroom?: { id: string; name: string } }[];
    dietaryRestrictions?: { id: string; type: string; name: string; severity?: string; forbiddenFoods?: string; allowedFoods?: string }[];
  };
}

const STATUS_CASO_CONFIG: Record<StatusCasoNutricional, { label: string; color: string; bg: string; border: string; icon: string }> = {
  MONITORAMENTO:    { label: 'Monitoramento',    color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: '🔵' },
  ATENCAO_MODERADA: { label: 'Atenção Moderada', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '🟡' },
  ATENCAO_ALTA:     { label: 'Atenção Alta',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: '🟠' },
  CRITICO:          { label: 'Crítico',           color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200',   icon: '🔴' },
};

function calcularIdade(dateOfBirth?: string): string {
  if (!dateOfBirth) return '';
  const nasc = new Date(dateOfBirth);
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const meses = hoje.getMonth() - nasc.getMonth();
  if (meses < 0 || (meses === 0 && hoje.getDate() < nasc.getDate())) anos--;
  const mesesRestantes = ((hoje.getMonth() - nasc.getMonth()) + 12) % 12;
  if (anos === 0) return `${mesesRestantes}m`;
  if (mesesRestantes === 0) return `${anos}a`;
  return `${anos}a ${mesesRestantes}m`;
}

function AbaAcompanhamentoIndividual({ unitId, userId }: { unitId: string; userId: string }) {
  const [lista, setLista] = useState<AcompanhamentoNutricional[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecionado, setSelecionado] = useState<AcompanhamentoNutricional | null>(null);
  const [criancas, setCriancas] = useState<{ id: string; firstName: string; lastName: string; enrollments: { classroom: { id: string; name: string } }[] }[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusCasoNutricional | ''>('');
  const [modoForm, setModoForm] = useState<'novo' | 'editar' | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [resumo, setResumo] = useState<{ total: number; criticos: number; atencaoAlta: number; atencaoModerada: number; monitoramento: number; vencidosReavaliacao: number } | null>(null);

  const [historico, setHistorico] = useState<{ id: string; date: string; dietaryNotes?: string; recommendations?: string; healthNotes?: string }[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [medicoes, setMedicoes] = useState<{ childId: string; peso?: number; altura?: number; data?: string; obs?: string }[]>([]);

  const [form, setForm] = useState({
    childId: '',
    motivoAcompanhamento: '',
    statusCaso: 'MONITORAMENTO' as StatusCasoNutricional,
    objetivos: '',
    condutaAtual: '',
    restricoesOperacionais: '',
    substituicoesSeguras: '',
    orientacoesProfCozinha: '',
    frequenciaRevisao: '',
    proximaReavaliacao: '',
  });

  // ── NOVO: estado para filtro de turma no formulário novo ──────────────────
  const [formTurmaId, setFormTurmaId] = useState('');

  const carregarResumo = useCallback(async () => {
    try {
      const { data } = await http.get('/acompanhamento-nutricional/resumo', { params: { unitId } });
      setResumo(data);
    } catch { setResumo(null); }
  }, [unitId]);

  const carregarLista = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { unitId };
      if (filtroStatus) params.statusCaso = filtroStatus;
      const { data } = await http.get('/acompanhamento-nutricional', { params });
      setLista(Array.isArray(data) ? data : data?.data ?? []);
    } catch { setLista([]); }
    finally { setLoading(false); }
  }, [unitId, filtroStatus]);

  useEffect(() => {
    if (!unitId) return;
    http.get('/lookup/classrooms/accessible', { params: { unitId } })
      .then(async (r) => {
        const turmasList: { id: string; name: string }[] = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        const resultados = await Promise.allSettled(
          turmasList.map((t) =>
            http.get(`/lookup/classrooms/${t.id}/children`).then((res) => ({
              turmaId: t.id,
              turmaName: t.name,
              children: Array.isArray(res.data) ? res.data : res.data?.data ?? [],
            }))
          )
        );
        const mapa = new Map<string, { id: string; firstName: string; lastName: string; enrollments: { classroom: { id: string; name: string } }[] }>();
        resultados.forEach((res) => {
          if (res.status === 'fulfilled') {
            const { turmaId, turmaName, children } = res.value;
            children.forEach((c: any) => {
              if (!mapa.has(c.id)) {
                mapa.set(c.id, { id: c.id, firstName: c.firstName, lastName: c.lastName, enrollments: [] });
              }
              mapa.get(c.id)!.enrollments.push({ classroom: { id: turmaId, name: turmaName } });
            });
          }
        });
        setCriancas(Array.from(mapa.values()).sort((a, b) => a.firstName.localeCompare(b.firstName)));
      })
      .catch(() => setCriancas([]));
  }, [unitId]);

  useEffect(() => { carregarLista(); carregarResumo(); }, [carregarLista, carregarResumo]);

  const carregarHistorico = useCallback(async (childId: string) => {
    setLoadingHistorico(true);
    try {
      const [obsRes, pesoRes] = await Promise.allSettled([
        http.get('/development-observations', { params: { childId, category: 'NUTRICAO', limit: '20' } }),
        http.get('/diary-events', { params: { childId, type: 'SAUDE', limit: '30' } }),
      ]);
      setHistorico(obsRes.status === 'fulfilled' ? (obsRes.value.data?.data ?? obsRes.value.data ?? []) : []);
      if (pesoRes.status === 'fulfilled') {
        const eventos = pesoRes.value.data?.data ?? pesoRes.value.data ?? [];
        const meds = eventos
          .filter((e: any) => e.medicaoAlimentar && (e.medicaoAlimentar.peso || e.medicaoAlimentar.altura))
          .map((e: any) => ({
            childId: e.childId,
            peso: e.medicaoAlimentar?.peso,
            altura: e.medicaoAlimentar?.altura,
            data: e.occurredAt ?? e.eventDate,
            obs: e.description,
          }))
          .slice(0, 10);
        setMedicoes(meds);
      }
    } catch { setHistorico([]); setMedicoes([]); }
    finally { setLoadingHistorico(false); }
  }, []);

  const abrirDetalhe = async (item: AcompanhamentoNutricional) => {
    setSelecionado(item);
    setModoForm(null);
    setErro(''); setSucesso('');
    if (item.childId) carregarHistorico(item.childId);
  };

  const abrirFormNovo = () => {
    setSelecionado(null);
    setModoForm('novo');
    setForm({ childId: '', motivoAcompanhamento: '', statusCaso: 'MONITORAMENTO', objetivos: '', condutaAtual: '', restricoesOperacionais: '', substituicoesSeguras: '', orientacoesProfCozinha: '', frequenciaRevisao: '', proximaReavaliacao: '' });
    setFormTurmaId(''); // ── NOVO: reseta turma ao abrir formulário novo
    setErro(''); setSucesso('');
  };

  const abrirFormEditar = (item: AcompanhamentoNutricional) => {
    setSelecionado(item);
    setModoForm('editar');
    setForm({
      childId: item.childId,
      motivoAcompanhamento: item.motivoAcompanhamento ?? '',
      statusCaso: item.statusCaso,
      objetivos: item.objetivos ?? '',
      condutaAtual: item.condutaAtual ?? '',
      restricoesOperacionais: item.restricoesOperacionais ?? '',
      substituicoesSeguras: item.substituicoesSeguras ?? '',
      orientacoesProfCozinha: item.orientacoesProfCozinha ?? '',
      frequenciaRevisao: item.frequenciaRevisao ?? '',
      proximaReavaliacao: item.proximaReavaliacao ? item.proximaReavaliacao.slice(0, 10) : '',
    });
    setErro(''); setSucesso('');
  };

  const salvar = async () => {
    if (!form.childId || !form.motivoAcompanhamento.trim()) {
      setErro('Selecione uma criança e informe o motivo do acompanhamento.'); return;
    }
    setSalvando(true); setErro(''); setSucesso('');
    try {
      const payload: any = {
        childId: form.childId,
        motivoAcompanhamento: form.motivoAcompanhamento,
        statusCaso: form.statusCaso,
        objetivos: form.objetivos || undefined,
        condutaAtual: form.condutaAtual || undefined,
        restricoesOperacionais: form.restricoesOperacionais || undefined,
        substituicoesSeguras: form.substituicoesSeguras || undefined,
        orientacoesProfCozinha: form.orientacoesProfCozinha || undefined,
        frequenciaRevisao: form.frequenciaRevisao || undefined,
        proximaReavaliacao: form.proximaReavaliacao || undefined,
      };
      const { data } = await http.post('/acompanhamento-nutricional', payload);
      setSucesso('Acompanhamento salvo com sucesso.');
      setModoForm(null);
      setSelecionado(data);
      carregarLista();
      carregarResumo();
      if (data.childId) carregarHistorico(data.childId);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao salvar. Tente novamente.');
    } finally { setSalvando(false); }
  };

  const encerrar = async (childId: string) => {
    if (!confirm('Deseja encerrar este acompanhamento?')) return;
    try {
      await http.delete(`/acompanhamento-nutricional/crianca/${childId}`);
      setSelecionado(null);
      carregarLista();
      carregarResumo();
    } catch { setErro('Erro ao encerrar acompanhamento.'); }
  };

  const listafiltrada = lista.filter((item) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    const nome = `${item.child?.firstName ?? ''} ${item.child?.lastName ?? ''}`.toLowerCase();
    return nome.includes(q) || item.motivoAcompanhamento?.toLowerCase().includes(q);
  });

  // ── NOVO: turmas únicas e crianças filtradas pela turma ───────────────────
  const turmasUnicas = criancas
    .flatMap((c) => c.enrollments.map((e) => e.classroom))
    .filter((cls, idx, arr) => arr.findIndex((x) => x.id === cls.id) === idx)
    .sort((a, b) => a.name.localeCompare(b.name));

  const criancasDaTurma = formTurmaId
    ? criancas.filter((c) => c.enrollments.some((e) => e.classroom.id === formTurmaId))
    : [];

  return (
    <div className="space-y-6">
      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Ativos', value: resumo.total, color: 'text-gray-800', bg: 'bg-white' },
            { label: 'Críticos', value: resumo.criticos, color: 'text-red-700', bg: 'bg-red-50' },
            { label: 'Atenção Alta', value: resumo.atencaoAlta, color: 'text-orange-700', bg: 'bg-orange-50' },
            { label: 'Atenção Moderada', value: resumo.atencaoModerada, color: 'text-yellow-700', bg: 'bg-yellow-50' },
            { label: 'Reavaliação Vencida', value: resumo.vencidosReavaliacao, color: 'text-purple-700', bg: 'bg-purple-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl border p-3 text-center`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar criança ou motivo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as StatusCasoNutricional | '')}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_CASO_CONFIG) as StatusCasoNutricional[]).map((s) => (
              <option key={s} value={s}>{STATUS_CASO_CONFIG[s].label}</option>
            ))}
          </select>
          <button onClick={() => { carregarLista(); carregarResumo(); }} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
        <button
          onClick={abrirFormNovo}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
        >
          <Plus className="w-4 h-4" /> Novo Acompanhamento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3 lg:col-span-1">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : listafiltrada.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhum caso encontrado</p>
              <p className="text-sm mt-1">Clique em "Novo Acompanhamento" para iniciar um caso.</p>
            </div>
          ) : (
            listafiltrada.map((item) => {
              const cfg = STATUS_CASO_CONFIG[item.statusCaso];
              const turma = item.child?.enrollments?.[0]?.classroom?.name;
              const vencido = item.proximaReavaliacao && new Date(item.proximaReavaliacao) < new Date();
              return (
                <button
                  key={item.id}
                  onClick={() => abrirDetalhe(item)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selecionado?.id === item.id
                      ? `${cfg.bg} ${cfg.border} shadow-sm`
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{cfg.icon}</span>
                    <span className="font-semibold text-gray-800 text-sm">
                      {item.child?.firstName} {item.child?.lastName}
                    </span>
                  </div>
                  {turma && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{turma}</span>}
                  <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{item.motivoAcompanhamento}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    {vencido && <span className="text-xs text-purple-600 font-medium">⏰ Reavaliação vencida</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-2">
          {modoForm && (
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Clipboard className="w-4 h-4 text-orange-500" />
                  {modoForm === 'novo' ? 'Novo Acompanhamento Nutricional' : 'Editar Acompanhamento'}
                </h3>
                <button onClick={() => setModoForm(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* ── NOVO: select de turma — só no modo novo ── */}
                {modoForm === 'novo' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Turma *</label>
                    <select
                      value={formTurmaId}
                      onChange={(e) => {
                        setFormTurmaId(e.target.value);
                        setForm((f) => ({ ...f, childId: '' }));
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    >
                      <option value="">Selecione uma turma...</option>
                      {turmasUnicas.map((cls) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ── Select de criança — filtrado pela turma no modo novo ── */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Criança *</label>
                  <select
                    value={form.childId}
                    onChange={(e) => setForm((f) => ({ ...f, childId: e.target.value }))}
                    disabled={modoForm === 'editar' || (modoForm === 'novo' && !formTurmaId)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">
                      {modoForm === 'novo' && !formTurmaId
                        ? 'Selecione uma turma primeiro...'
                        : 'Selecione uma criança...'}
                    </option>
                    {(modoForm === 'editar' ? criancas : criancasDaTurma).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Motivo do Acompanhamento *</label>
                  <textarea
                    rows={2}
                    value={form.motivoAcompanhamento}
                    onChange={(e) => setForm((f) => ({ ...f, motivoAcompanhamento: e.target.value }))}
                    placeholder="Ex: Alergia severa a proteína do leite, obesidade, seletividade alimentar..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status do Caso</label>
                  <select
                    value={form.statusCaso}
                    onChange={(e) => setForm((f) => ({ ...f, statusCaso: e.target.value as StatusCasoNutricional }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    {(Object.keys(STATUS_CASO_CONFIG) as StatusCasoNutricional[]).map((s) => (
                      <option key={s} value={s}>{STATUS_CASO_CONFIG[s].icon} {STATUS_CASO_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Próxima Reavaliação</label>
                  <input
                    type="date"
                    value={form.proximaReavaliacao}
                    onChange={(e) => setForm((f) => ({ ...f, proximaReavaliacao: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Objetivos do Acompanhamento</label>
                  <textarea
                    rows={2}
                    value={form.objetivos}
                    onChange={(e) => setForm((f) => ({ ...f, objetivos: e.target.value }))}
                    placeholder="Ex: Reduzir peso gradualmente, introduzir novos alimentos, controlar reações alérgicas..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Conduta Atual</label>
                  <textarea
                    rows={2}
                    value={form.condutaAtual}
                    onChange={(e) => setForm((f) => ({ ...f, condutaAtual: e.target.value }))}
                    placeholder="Descrição da conduta nutricional atual..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Restrições Operacionais</label>
                  <textarea
                    rows={2}
                    value={form.restricoesOperacionais}
                    onChange={(e) => setForm((f) => ({ ...f, restricoesOperacionais: e.target.value }))}
                    placeholder="O que não pode ser servido a esta criança..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Substituições Seguras</label>
                  <textarea
                    rows={2}
                    value={form.substituicoesSeguras}
                    onChange={(e) => setForm((f) => ({ ...f, substituicoesSeguras: e.target.value }))}
                    placeholder="Alternativas seguras para os alimentos restritos..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Orientações para Professor / Cozinha</label>
                  <textarea
                    rows={2}
                    value={form.orientacoesProfCozinha}
                    onChange={(e) => setForm((f) => ({ ...f, orientacoesProfCozinha: e.target.value }))}
                    placeholder="Instruções práticas para o professor e a cozinha no dia a dia..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Frequência de Revisão</label>
                  <input
                    type="text"
                    value={form.frequenciaRevisao}
                    onChange={(e) => setForm((f) => ({ ...f, frequenciaRevisao: e.target.value }))}
                    placeholder="Ex: Mensal, Quinzenal, Semanal..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              </div>

              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
              {sucesso && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{sucesso}</p>}

              <div className="flex gap-3">
                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {salvando ? 'Salvando...' : 'Salvar Acompanhamento'}
                </button>
                <button
                  onClick={() => setModoForm(null)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!modoForm && selecionado && (() => {
            const cfg = STATUS_CASO_CONFIG[selecionado.statusCaso];
            const child = selecionado.child;
            const turma = child?.enrollments?.[0]?.classroom?.name;
            const idade = calcularIdade(child?.dateOfBirth);
            const vencido = selecionado.proximaReavaliacao && new Date(selecionado.proximaReavaliacao) < new Date();
            const ultimaMedicao = medicoes[0];
            const imc = ultimaMedicao?.peso && ultimaMedicao?.altura
              ? (ultimaMedicao.peso / ((ultimaMedicao.altura / 100) ** 2)).toFixed(1)
              : null;

            return (
              <div className="space-y-4">
                <div className={`bg-white rounded-xl border ${cfg.border} p-5`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {child?.photoUrl ? (
                        <img src={child.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover border" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold text-lg">
                          {child?.firstName?.[0]}{child?.lastName?.[0]}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{child?.firstName} {child?.lastName}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {turma && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{turma}</span>}
                          {idade && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{idade}</span>}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                          {vencido && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">⏰ Reavaliação vencida</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {child?.dietaryRestrictions?.filter((r) => r.severity === 'severa').map((r) => (
                            <span key={r.id} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">🚨 {r.name}</span>
                          ))}
                          {child?.allergies && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">⚠️ Alergia</span>}
                          {child?.medicalConditions && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">🏥 Condição médica</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => abrirFormEditar(selecionado)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                      >
                        <FileEdit className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        onClick={() => encerrar(selecionado.childId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg text-xs text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Encerrar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-orange-500" /> Última Medição
                    </h4>
                    {ultimaMedicao ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Peso</span>
                          <span className="font-semibold">{ultimaMedicao.peso ? `${ultimaMedicao.peso} kg` : '—'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Altura</span>
                          <span className="font-semibold">{ultimaMedicao.altura ? `${ultimaMedicao.altura} cm` : '—'}</span>
                        </div>
                        {imc && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">IMC</span>
                            <span className={`font-semibold ${
                              Number(imc) > 25 ? 'text-orange-600' : Number(imc) < 18.5 ? 'text-blue-600' : 'text-green-600'
                            }`}>{imc}</span>
                          </div>
                        )}
                        {ultimaMedicao.data && (
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(ultimaMedicao.data).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Nenhuma medição registrada.</p>
                    )}
                  </div>

                  <div className={`${cfg.bg} rounded-xl border ${cfg.border} p-4`}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-orange-500" /> Status do Caso
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status</span>
                        <span className={`font-semibold ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                      </div>
                      {selecionado.frequenciaRevisao && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Revisão</span>
                          <span className="font-medium">{selecionado.frequenciaRevisao}</span>
                        </div>
                      )}
                      {selecionado.proximaReavaliacao && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Próx. Reavaliação</span>
                          <span className={`font-medium ${vencido ? 'text-red-600' : 'text-gray-700'}`}>
                            {new Date(selecionado.proximaReavaliacao).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Atualizado em</span>
                        <span className="text-gray-600 text-xs">
                          {new Date(selecionado.atualizadoEm).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-5 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Clipboard className="w-4 h-4 text-orange-500" /> Plano de Cuidado Nutricional
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Motivo do Acompanhamento', value: selecionado.motivoAcompanhamento, full: true },
                      { label: 'Objetivos', value: selecionado.objetivos, full: true },
                      { label: 'Conduta Atual', value: selecionado.condutaAtual, full: true },
                      { label: 'Restrições Operacionais', value: selecionado.restricoesOperacionais },
                      { label: 'Substituições Seguras', value: selecionado.substituicoesSeguras },
                      { label: 'Orientações para Professor / Cozinha', value: selecionado.orientacoesProfCozinha, full: true },
                    ].filter((f) => f.value).map((f) => (
                      <div key={f.label} className={f.full ? 'md:col-span-2' : ''}>
                        <p className="text-xs font-medium text-gray-500 mb-1">{f.label}</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <History className="w-4 h-4 text-orange-500" /> Linha do Tempo Nutricional
                    </h4>
                    <button onClick={() => carregarHistorico(selecionado.childId)}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Atualizar
                    </button>
                  </div>
                  {loadingHistorico ? (
                    <p className="text-center text-sm text-gray-400 py-4">Carregando histórico...</p>
                  ) : historico.length === 0 && medicoes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhum registro nutricional encontrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {medicoes.map((m, idx) => (
                        <div key={idx} className="flex gap-3 items-start">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-sm">⚖️</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-blue-700">Medição Antropométrica</span>
                              {m.data && <span className="text-xs text-gray-400">{new Date(m.data).toLocaleDateString('pt-BR')}</span>}
                            </div>
                            <p className="text-sm text-gray-700 mt-0.5">
                              {m.peso && `Peso: ${m.peso}kg`}{m.peso && m.altura && ' · '}{m.altura && `Altura: ${m.altura}cm`}
                              {m.peso && m.altura && ` · IMC: ${(m.peso / ((m.altura / 100) ** 2)).toFixed(1)}`}
                            </p>
                            {m.obs && <p className="text-xs text-gray-500 mt-0.5">{m.obs}</p>}
                          </div>
                        </div>
                      ))}
                      {historico.map((obs) => (
                        <div key={obs.id} className="flex gap-3 items-start">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-sm">📋</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-orange-700">Anotação Nutricional</span>
                              <span className="text-xs text-gray-400">{new Date(obs.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                            {obs.dietaryNotes && <p className="text-sm text-gray-700 mt-0.5">{obs.dietaryNotes}</p>}
                            {obs.recommendations && <p className="text-xs text-gray-500 mt-0.5"><strong>Rec:</strong> {obs.recommendations}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {!modoForm && !selecionado && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">
              <Activity className="w-16 h-16 mx-auto mb-4 text-gray-200" />
              <p className="font-medium text-gray-500">Selecione um caso ou crie um novo</p>
              <p className="text-sm mt-1">Clique em uma criança na lista ou em "Novo Acompanhamento".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { DashboardNutricionistaPage };
export default DashboardNutricionistaPage;
