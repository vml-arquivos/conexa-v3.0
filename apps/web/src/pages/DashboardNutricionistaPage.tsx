/**
 * Dashboard da Nutricionista
 * Acesso: UNIDADE_NUTRICIONISTA
 * Abas: Dietas/Restrições | Pedidos de Alimentação | Resumo por Turma
 */
import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/ui/PageShell';
import http from '../api/http';
import { useAuth } from '../app/AuthProvider';
import {
  Apple, AlertTriangle, ShoppingCart, Users, Search,
  RefreshCw, Plus, ChevronDown, ChevronUp, Filter,
  CheckCircle, Clock, XCircle, Printer,
} from 'lucide-react';

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

// ─── Componente Principal ─────────────────────────────────────────────────────
export function DashboardNutricionistaPage() {
  const { user } = useAuth();
  const [aba, setAba] = useState<'dietas' | 'pedidos' | 'turmas'>('dietas');

  // ── Estado: Dietas ──
  const [dietas, setDietas] = useState<DietaryRestriction[]>([]);
  const [loadingDietas, setLoadingDietas] = useState(false);
  const [buscaDieta, setBuscaDieta] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
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
      const { data } = await http.get('/dietary-restrictions', {
        params: { unitId: (user as any)?.unitId, limit: 200 },
      });
      setDietas(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      setDietas([]);
    } finally {
      setLoadingDietas(false);
    }
  }, [user]);

  // ── Carregar Pedidos de Alimentação ──
  const carregarPedidos = useCallback(async () => {
    setLoadingPedidos(true);
    try {
      const { data } = await http.get('/pedidos-compra', {
        params: { mesReferencia: mesRef, categoria: 'ALIMENTACAO' },
      });
      const lista = Array.isArray(data) ? data : data?.data ?? [];
      // Filtrar apenas pedidos com itens de ALIMENTACAO
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
      // Para cada turma, contar crianças com restrição
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
      // Verificar se há pedido RASCUNHO para o mês
      let pedidoId: string | null = null;
      const rascunho = pedidos.find((p) => p.mesReferencia === mesAtual && p.status === 'RASCUNHO');
      if (rascunho) {
        pedidoId = rascunho.id;
      } else {
        // Criar novo pedido
        const { data: novoPedido } = await http.post('/pedidos-compra', {
          mesReferencia: mesAtual,
          itens: [],
        });
        pedidoId = novoPedido.id;
      }
      // Adicionar item ao pedido
      await http.patch(`/pedidos-compra/${pedidoId}/itens`, {
        itens: [
          {
            categoria: 'ALIMENTACAO',
            descricao: novoItem.descricao,
            quantidade: Number(novoItem.quantidade),
            unidadeMedida: novoItem.unidadeMedida,
            custoEstimado: novoItem.custoEstimado ? Number(novoItem.custoEstimado) : undefined,
          },
        ],
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
  const dietasFiltradas = dietas.filter((d) => {
    const nome = `${d.child.firstName} ${d.child.lastName}`.toLowerCase();
    const busca = buscaDieta.toLowerCase();
    const matchBusca = !busca || nome.includes(busca) || d.name.toLowerCase().includes(busca);
    const matchTipo = !filtroTipo || d.type === filtroTipo;
    return matchBusca && matchTipo && d.isActive;
  });

  // ── Estatísticas ──
  const totalAlergias = dietas.filter((d) => d.type === 'ALERGIA' && d.isActive).length;
  const totalSeveras = dietas.filter((d) => d.severity === 'severa' && d.isActive).length;
  const totalCriancasComRestricao = new Set(dietas.filter((d) => d.isActive).map((d) => d.child.id)).size;

  return (
    <PageShell title="Painel da Nutricionista" subtitle="Dietas, restrições alimentares e pedidos de alimentação">
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
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { id: 'dietas', label: 'Dietas e Restrições', icon: AlertTriangle },
          { id: 'pedidos', label: 'Pedidos de Alimentação', icon: ShoppingCart },
          { id: 'turmas', label: 'Resumo por Turma', icon: Users },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              aba === id ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Aba: Dietas ── */}
      {aba === 'dietas' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar criança ou restrição..."
                value={buscaDieta}
                onChange={(e) => setBuscaDieta(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            >
              <option value="">Todos os tipos</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button
              onClick={carregarDietas}
              disabled={loadingDietas}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDietas ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>

          {loadingDietas ? (
            <div className="text-center py-12 text-gray-500">Carregando restrições alimentares...</div>
          ) : dietasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <Apple className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhuma restrição encontrada</p>
              <p className="text-sm mt-1">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dietasFiltradas.map((d) => {
                const sev = SEVERITY_CONFIG[d.severity ?? ''] ?? { label: d.severity ?? '—', color: 'text-gray-600', bg: 'bg-gray-100', icon: '' };
                const turma = d.child.enrollments?.[0]?.classroom?.name ?? '—';
                const isOpen = expandido === d.id;
                return (
                  <div key={d.id} className="bg-white rounded-xl border overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandido(isOpen ? null : d.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${sev.bg}`}>
                          {sev.icon || '🍽️'}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-800">
                            {d.child.firstName} {d.child.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{turma} · {calcIdade(d.child.dateOfBirth)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${sev.bg} ${sev.color}`}>
                          {sev.label}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {TYPE_LABEL[d.type] ?? d.type}
                        </span>
                        <span className="font-medium text-gray-700 text-sm">{d.name}</span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 border-t bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        {d.description && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Descrição</p>
                            <p className="text-sm text-gray-700">{d.description}</p>
                          </div>
                        )}
                        {d.forbiddenFoods && (
                          <div>
                            <p className="text-xs font-semibold text-red-500 mb-1">🚫 Alimentos Proibidos</p>
                            <p className="text-sm text-gray-700">{d.forbiddenFoods}</p>
                          </div>
                        )}
                        {d.allowedFoods && (
                          <div>
                            <p className="text-xs font-semibold text-green-600 mb-1">✅ Alimentos Permitidos</p>
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
          {/* Controles */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-600">Mês de referência:</label>
              <input
                type="month"
                value={mesRef}
                onChange={(e) => setMesRef(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              />
              <button
                onClick={carregarPedidos}
                disabled={loadingPedidos}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPedidos ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <button
              onClick={() => setNovoItemForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              Adicionar Item de Alimentação
            </button>
          </div>

          {/* Formulário de novo item */}
          {novoItemForm && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-green-800">Novo Item de Alimentação — {mesRef}</h3>
              {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descrição do item *</label>
                  <input
                    type="text"
                    placeholder="Ex: Leite integral UHT 1L"
                    value={novoItem.descricao}
                    onChange={(e) => setNovoItem((p) => ({ ...p, descricao: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade *</label>
                  <input
                    type="number"
                    min={1}
                    value={novoItem.quantidade}
                    onChange={(e) => setNovoItem((p) => ({ ...p, quantidade: Number(e.target.value) }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unidade de medida</label>
                  <select
                    value={novoItem.unidadeMedida}
                    onChange={(e) => setNovoItem((p) => ({ ...p, unidadeMedida: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  >
                    {['unidade', 'caixa', 'pacote', 'kg', 'litro', 'fardo', 'saco', 'lata', 'garrafa'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Custo estimado (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0,00"
                    value={novoItem.custoEstimado}
                    onChange={(e) => setNovoItem((p) => ({ ...p, custoEstimado: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setNovoItemForm(false); setErro(''); }}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarItemAlimentacao}
                  disabled={salvando || !novoItem.descricao.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Adicionar ao Pedido'}
                </button>
              </div>
            </div>
          )}

          {loadingPedidos ? (
            <div className="text-center py-12 text-gray-500">Carregando pedidos...</div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhum pedido de alimentação em {mesRef}</p>
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
    </PageShell>
  );
}
