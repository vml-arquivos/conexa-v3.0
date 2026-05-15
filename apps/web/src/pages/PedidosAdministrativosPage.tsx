/**
 * PedidosAdministrativosPage — Pedidos Administrativos da Secretaria
 *
 * Gerencia pedidos operacionais da secretaria: limpeza, manutenção,
 * suprimentos e apoio. Usa os endpoints existentes de material-requests
 * e pedidos-compra, com foco em itens administrativos (não pedagógicos).
 *
 * RBAC: UNIDADE_ADMINISTRATIVO, UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
 * Usa endpoints existentes:
 *   GET /material-requests
 *   POST /material-requests
 *   PATCH /material-requests/:id/review
 *   GET /pedidos-compra
 *   POST /pedidos-compra
 */

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Button } from '../components/ui/button';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { toast } from 'sonner';
import {
  Plus, RefreshCw, XCircle, Loader2, Inbox,
  CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp,
  Package, Wrench, Sparkles, ShoppingBag,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Pedido {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category?: string;
  createdBy?: string;
  requestedDate?: string;
  createdAt: string;
}

// ─── Categorias administrativas ───────────────────────────────────────────────

const CATEGORIAS = [
  { id: 'limpeza',     label: 'Limpeza e Higiene',      icon: <Sparkles className="h-4 w-4" /> },
  { id: 'manutencao', label: 'Manutenção',               icon: <Wrench className="h-4 w-4" /> },
  { id: 'suprimentos', label: 'Suprimentos de Escritório', icon: <Package className="h-4 w-4" /> },
  { id: 'compras',    label: 'Compras Gerais',           icon: <ShoppingBag className="h-4 w-4" /> },
];

const PRIORIDADES = [
  { id: 'LOW',    label: 'Baixa',  cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  { id: 'MEDIUM', label: 'Média',  cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  { id: 'HIGH',   label: 'Alta',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  { id: 'URGENT', label: 'Urgente', cls: 'bg-red-50 text-red-600 border-red-200' },
];

const STATUS_COR: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  PENDING:   { label: 'Pendente',  cls: 'bg-amber-50 text-amber-600 border-amber-200',   icon: <Clock className="h-3 w-3" /> },
  APPROVED:  { label: 'Aprovado',  cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: <CheckCircle className="h-3 w-3" /> },
  REJECTED:  { label: 'Recusado',  cls: 'bg-red-50 text-red-500 border-red-200',          icon: <XCircle className="h-3 w-3" /> },
  COMPLETED: { label: 'Concluído', cls: 'bg-slate-50 text-slate-500 border-slate-200',    icon: <CheckCircle className="h-3 w-3" /> },
  IN_PROGRESS: { label: 'Em andamento', cls: 'bg-blue-50 text-blue-600 border-blue-200', icon: <Clock className="h-3 w-3" /> },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PedidosAdministrativosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: 'suprimentos',
    requestedDate: new Date().toISOString().split('T')[0],
  });

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await http.get('/material-requests');
      const data = res.data;
      const lista: Pedido[] = Array.isArray(data)
        ? data
        : data?.requests ?? data?.data ?? [];
      setPedidos(lista);
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!form.title.trim()) {
      toast.error('O título do pedido é obrigatório.');
      return;
    }
    setSalvando(true);
    try {
      await http.post('/material-requests', {
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        category: form.category,
        requestedDate: form.requestedDate,
        items: [],
      });
      toast.success('Pedido registrado com sucesso.');
      setModalAberto(false);
      setForm({ title: '', description: '', priority: 'MEDIUM', category: 'suprimentos', requestedDate: new Date().toISOString().split('T')[0] });
      carregar();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const pedidosFiltrados = pedidos.filter((p) => {
    const matchStatus = filtroStatus === '' || p.status === filtroStatus;
    const matchCategoria = filtroCategoria === '' || p.category === filtroCategoria;
    return matchStatus && matchCategoria;
  });

  const pendentes = pedidos.filter(p => p.status === 'PENDING').length;
  const aprovados = pedidos.filter(p => p.status === 'APPROVED').length;
  const concluidos = pedidos.filter(p => p.status === 'COMPLETED').length;

  return (
    <PageShell
      title="Pedidos Administrativos"
      description="Limpeza, manutenção, suprimentos e apoio operacional"
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={carregar}
            disabled={carregando}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <Button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 h-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Pedido
          </Button>
        </div>
      }
    >
      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <Clock className="h-4 w-4 text-amber-500 mb-1" />
          <p className="text-2xl font-semibold text-amber-600 tabular-nums">{pendentes}</p>
          <p className="text-[11px] text-slate-400 font-normal">Pendentes</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <CheckCircle className="h-4 w-4 text-emerald-500 mb-1" />
          <p className="text-2xl font-semibold text-emerald-600 tabular-nums">{aprovados}</p>
          <p className="text-[11px] text-slate-400 font-normal">Aprovados</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <Inbox className="h-4 w-4 text-slate-400 mb-1" />
          <p className="text-2xl font-semibold text-slate-500 tabular-nums">{concluidos}</p>
          <p className="text-[11px] text-slate-400 font-normal">Concluídos</p>
        </div>
      </div>

      {/* ── Categorias rápidas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltroCategoria(filtroCategoria === c.id ? '' : c.id)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all touch-manipulation ${
              filtroCategoria === c.id
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c.icon}
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Filtro de status ── */}
      <div className="flex gap-2">
        {['', 'PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtroStatus === s
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s === '' ? 'Todos' : STATUS_COR[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* ── Erro ── */}
      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {erro}
        </div>
      )}

      {/* ── Lista ── */}
      {carregando ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Carregando pedidos...</span>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum pedido encontrado</p>
          <button onClick={() => setModalAberto(true)} className="text-xs text-brand-600 mt-1 hover:underline">
            Criar o primeiro pedido
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-50">
            <p className="text-xs text-slate-400 font-medium">{pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y divide-slate-50">
            {pedidosFiltrados.map((p) => {
              const isExp = expandido === p.id;
              const statusCfg = STATUS_COR[p.status] ?? { label: p.status, cls: 'bg-slate-50 text-slate-500 border-slate-200', icon: null };
              const prioCfg = PRIORIDADES.find(pr => pr.id === p.priority);
              return (
                <div key={p.id}>
                  <button
                    onClick={() => setExpandido(isExp ? null : p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left touch-manipulation"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.category && (
                          <span className="text-[11px] text-slate-400">
                            {CATEGORIAS.find(c => c.id === p.category)?.label ?? p.category}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-300">·</span>
                        <span className="text-[11px] text-slate-400">
                          {p.requestedDate ? new Date(p.requestedDate).toLocaleDateString('pt-BR') : new Date(p.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {prioCfg && (
                        <span className={`hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${prioCfg.cls}`}>
                          {prioCfg.label}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusCfg.cls}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                      {isExp ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </button>
                  {isExp && p.description && (
                    <div className="px-4 pb-3 bg-slate-50 border-t border-slate-100">
                      <p className="text-sm text-slate-600 mt-3 leading-relaxed">{p.description}</p>
                      {p.createdBy && (
                        <p className="text-[11px] text-slate-400 mt-2">Solicitado por: {p.createdBy}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal de Novo Pedido ── */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Novo Pedido Administrativo</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Título *</label>
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex.: Reposição de papel higiênico"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Prioridade</label>
                <select
                  className={inputCls}
                  value={form.priority}
                  onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                >
                  {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Data necessária</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.requestedDate}
                  onChange={(e) => setForm(f => ({ ...f, requestedDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detalhes adicionais do pedido..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setModalAberto(false)} className="text-xs px-3 py-1.5 h-auto">
                Cancelar
              </Button>
              <Button
                onClick={salvar}
                disabled={salvando || !form.title}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 h-auto"
              >
                {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Registrar Pedido
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors';
