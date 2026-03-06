import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  PackageCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Truck,
  XCircle,
  Clock,
  Send,
  Plus,
  Trash2,
  Download,
  Save,
  ChevronDown,
  ChevronUp,
  Edit3,
} from 'lucide-react';
import {
  listarPedidosCompra,
  criarPedido,
  atualizarItensPedido,
  atualizarStatusPedido,
  exportarPedidoCSV,
  getStatusPedidoLabel,
  getStatusPedidoCor,
  getProximosStatusUnidade,
  getProximosStatusMantenedora,
  type PedidoCompra,
  type ItemPedidoDto,
  type StatusPedidoCompra,
} from '../api/pedido-compra';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles, normalizeRoleTypes } from '../app/RoleProtectedRoute';
import { useUnitScope } from '../contexts/UnitScopeContext';
import { UnitScopeSelector } from '../components/select/UnitScopeSelector';

const ICONES_STATUS: Record<string, React.ReactNode> = {
  RASCUNHO: <Clock className="h-4 w-4" />,
  ENVIADO: <Send className="h-4 w-4" />,
  EM_ANALISE: <RefreshCw className="h-4 w-4" />,
  COMPRADO: <CheckCircle2 className="h-4 w-4" />,
  EM_ENTREGA: <Truck className="h-4 w-4" />,
  ENTREGUE: <PackageCheck className="h-4 w-4" />,
  CANCELADO: <XCircle className="h-4 w-4" />,
};

const CATEGORIAS = [
  'Alimento', 'Higiene', 'Limpeza', 'Material Pedagógico',
  'Material de Escritório', 'Equipamento', 'Manutenção', 'Outros',
];

interface LinhaEdicao extends ItemPedidoDto {
  _key: string;
  _id?: string;
}

function gerarKey() { return Math.random().toString(36).slice(2, 10); }
function mesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

export function PedidosCompraPage() {
  const { user } = useAuth();
  const roles = normalizeRoles(user);
  const types = normalizeRoleTypes(user);
  const isUnidade = roles.includes('UNIDADE');
  const isMantenedora = roles.includes('MANTENEDORA') || roles.includes('DEVELOPER');
  const isCentral = roles.includes('STAFF_CENTRAL');
  const isDiretor = types.includes('UNIDADE_DIRETOR');
  const { selectedUnitId: ctxUnitId } = useUnitScope();

  const [filtroMes, setFiltroMes] = useState(mesAtual());
  const [filtroStatus, setFiltroStatus] = useState<StatusPedidoCompra | ''>('');
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);
  const [modoEdicao, setModoEdicao] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<LinhaEdicao[]>([]);
  const [observacoesEdicao, setObservacoesEdicao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [novoMes, setNovoMes] = useState(mesAtual());
  const [novasLinhas, setNovasLinhas] = useState<LinhaEdicao[]>([
    { _key: gerarKey(), categoria: 'Alimento', descricao: '', quantidade: 1 },
  ]);
  const [novasObs, setNovasObs] = useState('');
  const [criando, setCriando] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState<string | null>(null);

  const mostrarMensagem = (msg: string) => {
    setMensagem(msg);
    setTimeout(() => setMensagem(null), 4000);
  };

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const dados = await listarPedidosCompra({
        mesReferencia: filtroMes || undefined,
        status: filtroStatus || undefined,
        unitId: (isMantenedora || isCentral) ? (ctxUnitId || undefined) : undefined,
      });
      setPedidos(dados);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar pedidos.');
    } finally { setCarregando(false); }
  }, [filtroMes, filtroStatus, ctxUnitId]);

  useEffect(() => { carregar(); }, [carregar]);

  const iniciarEdicao = (pedido: PedidoCompra) => {
    setModoEdicao(pedido.id);
    setPedidoExpandido(pedido.id);
    setObservacoesEdicao(pedido.observacoes ?? '');
    setLinhas(
      pedido.itens.length > 0
        ? pedido.itens.map(i => ({ _key: gerarKey(), _id: i.id, categoria: i.categoria, descricao: i.descricao, quantidade: i.quantidade, unidadeMedida: i.unidadeMedida, custoEstimado: i.custoEstimado }))
        : [{ _key: gerarKey(), categoria: 'Alimento', descricao: '', quantidade: 1 }],
    );
  };

  const salvarEdicao = async (pedidoId: string) => {
    setSalvando(true);
    try {
      const itensValidos = linhas.filter(l => l.descricao.trim() !== '');
      const atualizado = await atualizarItensPedido(pedidoId, {
        observacoes: observacoesEdicao || undefined,
        itens: itensValidos.map(({ categoria, descricao, quantidade, unidadeMedida, custoEstimado }) => ({ categoria, descricao, quantidade, unidadeMedida, custoEstimado })),
      });
      setPedidos(prev => prev.map(p => p.id === pedidoId ? atualizado : p));
      setModoEdicao(null);
      mostrarMensagem('Pedido salvo com sucesso.');
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar pedido.');
    } finally { setSalvando(false); }
  };

  const handleCriarPedido = async () => {
    const itensValidos = novasLinhas.filter(l => l.descricao.trim() !== '');
    if (itensValidos.length === 0) { setErro('Adicione pelo menos um item com descrição.'); return; }
    setCriando(true); setErro(null);
    try {
      const novo = await criarPedido({
        mesReferencia: novoMes,
        observacoes: novasObs || undefined,
        itens: itensValidos.map(({ categoria, descricao, quantidade, unidadeMedida, custoEstimado }) => ({ categoria, descricao, quantidade, unidadeMedida, custoEstimado })),
      });
      setPedidos(prev => [novo, ...prev]);
      setCriandoNovo(false);
      setNovasLinhas([{ _key: gerarKey(), categoria: 'Alimento', descricao: '', quantidade: 1 }]);
      setNovasObs('');
      mostrarMensagem('Pedido criado com sucesso.');
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar pedido.');
    } finally { setCriando(false); }
  };

  const handleAtualizarStatus = async (pedidoId: string, novoStatus: StatusPedidoCompra) => {
    setAtualizandoStatus(pedidoId);
    try {
      const atualizado = await atualizarStatusPedido(pedidoId, { status: novoStatus });
      setPedidos(prev => prev.map(p => p.id === pedidoId ? atualizado : p));
      mostrarMensagem(`Status: "${getStatusPedidoLabel(novoStatus)}".`);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao atualizar status.');
    } finally { setAtualizandoStatus(null); }
  };

  const atualizarLinha = (
    linhasState: LinhaEdicao[],
    setLinhasState: React.Dispatch<React.SetStateAction<LinhaEdicao[]>>,
    key: string,
    campo: keyof ItemPedidoDto,
    valor: string | number,
  ) => setLinhasState(linhasState.map(l => l._key === key ? { ...l, [campo]: valor } : l));

  const adicionarLinha = (setLinhasState: React.Dispatch<React.SetStateAction<LinhaEdicao[]>>) =>
    setLinhasState(prev => [...prev, { _key: gerarKey(), categoria: 'Alimento', descricao: '', quantidade: 1 }]);

  const removerLinha = (setLinhasState: React.Dispatch<React.SetStateAction<LinhaEdicao[]>>, key: string) =>
    setLinhasState(prev => prev.filter(l => l._key !== key));

  const renderTabela = (
    itens: LinhaEdicao[],
    setItens: React.Dispatch<React.SetStateAction<LinhaEdicao[]>>,
    editavel: boolean,
    pedido?: PedidoCompra,
  ) => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <th className="px-3 py-2 text-left w-36">Categoria</th>
            <th className="px-3 py-2 text-left">Descrição</th>
            <th className="px-3 py-2 text-right w-20">Qtd.</th>
            <th className="px-3 py-2 text-left w-28">Unid.</th>
            <th className="px-3 py-2 text-right w-28">Custo Est.</th>
            {editavel && <th className="px-3 py-2 w-10"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {itens.length === 0 && (
            <tr><td colSpan={editavel ? 6 : 5} className="px-3 py-4 text-center text-gray-400 italic text-xs">Nenhum item.</td></tr>
          )}
          {itens.map(l => (
            <tr key={l._key} className="hover:bg-gray-50">
              <td className="px-3 py-1.5">
                {editavel
                  ? <select value={l.categoria} onChange={e => atualizarLinha(itens, setItens, l._key, 'categoria', e.target.value)} className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  : <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{l.categoria}</span>}
              </td>
              <td className="px-3 py-1.5">
                {editavel
                  ? <input type="text" value={l.descricao} onChange={e => atualizarLinha(itens, setItens, l._key, 'descricao', e.target.value)} placeholder="Descrição" className="w-full border border-gray-200 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  : l.descricao}
              </td>
              <td className="px-3 py-1.5 text-right">
                {editavel
                  ? <input type="number" min={1} value={l.quantidade} onChange={e => atualizarLinha(itens, setItens, l._key, 'quantidade', Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  : l.quantidade}
              </td>
              <td className="px-3 py-1.5">
                {editavel
                  ? <input type="text" value={l.unidadeMedida ?? ''} onChange={e => atualizarLinha(itens, setItens, l._key, 'unidadeMedida', e.target.value)} placeholder="kg, un…" className="w-full border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  : (l.unidadeMedida ?? '—')}
              </td>
              <td className="px-3 py-1.5 text-right">
                {editavel
                  ? <input type="number" min={0} step={0.01} value={l.custoEstimado ?? ''} onChange={e => atualizarLinha(itens, setItens, l._key, 'custoEstimado', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0,00" className="w-24 border border-gray-200 rounded px-1 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  : l.custoEstimado != null ? `R$ ${l.custoEstimado.toFixed(2)}` : '—'}
              </td>
              {editavel && (
                <td className="px-3 py-1.5 text-center">
                  <button onClick={() => removerLinha(setItens, l._key)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {!editavel && pedido && pedido.itens.length > 0 && (
          <tfoot>
            <tr className="bg-gray-50 font-semibold text-sm">
              <td colSpan={2} className="px-3 py-2 text-right text-gray-500 text-xs">Total estimado:</td>
              <td className="px-3 py-2 text-right">{pedido.itens.reduce((s, i) => s + i.quantidade, 0)}</td>
              <td></td>
              <td className="px-3 py-2 text-right">R$ {pedido.itens.reduce((s, i) => s + (i.custoEstimado ?? 0) * i.quantidade, 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {editavel && (
        <div className="px-3 py-2 border-t border-gray-100">
          <button onClick={() => adicionarLinha(setItens)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <Plus className="h-4 w-4" /> Adicionar linha
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><ShoppingBag className="h-6 w-6 text-blue-600" /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pedidos de Compra</h1>
            <p className="text-sm text-gray-500">Planilha de pedidos por unidade e mês</p>
          </div>
        </div>
        {(isUnidade || isMantenedora) && (
          <button onClick={() => { setCriandoNovo(true); setErro(null); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="h-4 w-4" /> Novo Pedido
          </button>
        )}
      </div>

      {mensagem && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle2 className="h-4 w-4" />{mensagem}
        </div>
      )}
      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4" />{erro}
          <button onClick={() => setErro(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Novo pedido */}
      {criandoNovo && (
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <h2 className="font-semibold text-blue-800">Novo Pedido de Compra</h2>
            <button onClick={() => setCriandoNovo(false)} className="text-blue-400 hover:text-blue-600 text-lg">✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mês de Referência</label>
                <input type="month" value={novoMes} onChange={e => setNovoMes(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="flex-1 min-w-48">
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações (opcional)</label>
                <input type="text" value={novasObs} onChange={e => setNovasObs(e.target.value)} placeholder="Observações gerais…" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {renderTabela(novasLinhas, setNovasLinhas, true)}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCriandoNovo(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCriarPedido} disabled={criando} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {criando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {criando ? 'Criando…' : 'Criar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 flex-wrap items-end">
        {(isMantenedora || isCentral) && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
            <UnitScopeSelector compact showNetworkOption />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mês</label>
          <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as StatusPedidoCompra | '')} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">Todos</option>
            {(['RASCUNHO','ENVIADO','EM_ANALISE','COMPRADO','EM_ENTREGA','ENTREGUE','CANCELADO'] as StatusPedidoCompra[]).map(s => (
              <option key={s} value={s}>{getStatusPedidoLabel(s)}</option>
            ))}
          </select>
        </div>
        <button onClick={carregar} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Carregando…
        </div>
      ) : pedidos.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
          <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum pedido encontrado</p>
          <p className="text-sm mt-1">Ajuste os filtros ou crie um novo pedido.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map(pedido => {
            const expandido = pedidoExpandido === pedido.id;
            const emEdicao = modoEdicao === pedido.id;
            const proximosUnidade = getProximosStatusUnidade(pedido.status);
            const proximosMantenedora = getProximosStatusMantenedora(pedido.status);
            const itensView: LinhaEdicao[] = pedido.itens.map(i => ({ _key: i.id, _id: i.id, categoria: i.categoria, descricao: i.descricao, quantidade: i.quantidade, unidadeMedida: i.unidadeMedida, custoEstimado: i.custoEstimado }));

            return (
              <div key={pedido.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setPedidoExpandido(expandido ? null : pedido.id)}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusPedidoCor(pedido.status)}`}>
                      {ICONES_STATUS[pedido.status]}{getStatusPedidoLabel(pedido.status)}
                    </span>
                    <span className="font-semibold text-gray-800">{pedido.unit?.name ?? '—'}</span>
                    <span className="text-sm text-gray-500">{pedido.mesReferencia}</span>
                    <span className="text-xs text-gray-400">{pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); exportarPedidoCSV(pedido); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="Exportar CSV">
                      <Download className="h-4 w-4" />
                    </button>
                    {pedido.status === 'RASCUNHO' && (isUnidade || isMantenedora) && !emEdicao && (
                      <button onClick={e => { e.stopPropagation(); iniciarEdicao(pedido); }} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Editar itens">
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    {expandido ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {expandido && (
                  <div className="border-t border-gray-100">
                    {emEdicao ? (
                      <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
                        <label className="block text-xs font-medium text-blue-700 mb-1">Observações</label>
                        <input type="text" value={observacoesEdicao} onChange={e => setObservacoesEdicao(e.target.value)} placeholder="Observações gerais…" className="w-full border border-blue-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                      </div>
                    ) : pedido.observacoes ? (
                      <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 text-sm text-gray-600">
                        <span className="font-medium">Obs:</span> {pedido.observacoes}
                      </div>
                    ) : null}

                    {emEdicao
                      ? renderTabela(linhas, setLinhas, true, pedido)
                      : renderTabela(itensView, () => {}, false, pedido)}

                    {emEdicao && (
                      <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex justify-end gap-3">
                        <button onClick={() => setModoEdicao(null)} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                        <button onClick={() => salvarEdicao(pedido.id)} disabled={salvando} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
                          {salvando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {salvando ? 'Salvando…' : 'Salvar'}
                        </button>
                      </div>
                    )}

                    {!emEdicao && (
                      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                        {isUnidade && proximosUnidade.map(s => (
                          <button key={s} onClick={() => handleAtualizarStatus(pedido.id, s)} disabled={atualizandoStatus === pedido.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-60 ${s === 'CANCELADO' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-blue-200 text-blue-600 hover:bg-blue-50'}`}>
                            {ICONES_STATUS[s]}{getStatusPedidoLabel(s)}
                          </button>
                        ))}
                        {isMantenedora && proximosMantenedora.map(s => (
                          <button key={s} onClick={() => handleAtualizarStatus(pedido.id, s)} disabled={atualizandoStatus === pedido.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-60 ${s === 'CANCELADO' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
                            {ICONES_STATUS[s]}{getStatusPedidoLabel(s)}
                          </button>
                        ))}
                        {atualizandoStatus === pedido.id && <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />}
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
  );
}

export default PedidosCompraPage;
