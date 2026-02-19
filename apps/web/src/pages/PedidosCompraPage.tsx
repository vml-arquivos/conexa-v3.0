import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  PackageCheck,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Truck,
  XCircle,
  Clock,
  Send,
  Plus,
} from 'lucide-react';
import {
  listarPedidosCompra,
  consolidarPedido,
  atualizarStatusPedido,
  getStatusPedidoLabel,
  getStatusPedidoCor,
  getProximosStatusUnidade,
  getProximosStatusMantenedora,
  type PedidoCompra,
  type StatusPedidoCompra,
} from '../api/pedido-compra';
import { useAuth } from '../app/AuthProvider';

const ICONES_STATUS: Record<string, React.ReactNode> = {
  RASCUNHO: <Clock className="h-4 w-4" />,
  ENVIADO: <Send className="h-4 w-4" />,
  EM_ANALISE: <RefreshCw className="h-4 w-4" />,
  COMPRADO: <CheckCircle2 className="h-4 w-4" />,
  EM_ENTREGA: <Truck className="h-4 w-4" />,
  ENTREGUE: <PackageCheck className="h-4 w-4" />,
  CANCELADO: <XCircle className="h-4 w-4" />,
};

export function PedidosCompraPage() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);

  // Estado do formulário de consolidação
  const [mesConsolidacao, setMesConsolidacao] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });
  const [observacoesConsolidacao, setObservacoesConsolidacao] = useState('');
  const [consolidando, setConsolidando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Estado de atualização de status
  const [atualizandoStatus, setAtualizandoStatus] = useState<string | null>(null);

  const isUnidade = user?.roles?.includes('UNIDADE');
  const isMantenedora =
    user?.roles?.includes('MANTENEDORA') || user?.roles?.includes('DEVELOPER');
  const isCentral = user?.roles?.includes('STAFF_CENTRAL');

  const carregarPedidos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await listarPedidosCompra();
      setPedidos(dados);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar pedidos.';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarPedidos();
  }, [carregarPedidos]);

  const handleConsolidar = async () => {
    if (!mesConsolidacao) return;
    setConsolidando(true);
    setErro(null);
    setMensagemSucesso(null);
    try {
      const resultado = await consolidarPedido({
        mesReferencia: mesConsolidacao,
        observacoes: observacoesConsolidacao || undefined,
      });
      setMensagemSucesso(resultado.mensagem);
      setObservacoesConsolidacao('');
      await carregarPedidos();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Erro ao consolidar pedido.';
      setErro(msg);
    } finally {
      setConsolidando(false);
    }
  };

  const handleAtualizarStatus = async (
    pedidoId: string,
    novoStatus: StatusPedidoCompra,
  ) => {
    setAtualizandoStatus(pedidoId);
    setErro(null);
    try {
      await atualizarStatusPedido(pedidoId, { status: novoStatus });
      await carregarPedidos();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Erro ao atualizar status.';
      setErro(msg);
    } finally {
      setAtualizandoStatus(null);
    }
  };

  const getProximosStatus = (pedido: PedidoCompra): StatusPedidoCompra[] => {
    if (isMantenedora)
      return getProximosStatusMantenedora(pedido.status);
    if (isUnidade) return getProximosStatusUnidade(pedido.status);
    return [];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-emerald-600" />
          Pedidos de Compra
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isUnidade &&
            'Consolide as requisições aprovadas do mês e envie para a Mantenedora.'}
          {isMantenedora &&
            'Visualize e gerencie os pedidos de compra de todas as unidades.'}
          {isCentral &&
            'Visualização dos pedidos de compra consolidados pelas unidades.'}
        </p>
      </header>

      {/* Mensagens de feedback */}
      {mensagemSucesso && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800 font-medium">{mensagemSucesso}</p>
          <button
            onClick={() => setMensagemSucesso(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </div>
      )}
      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{erro}</p>
          <button
            onClick={() => setErro(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Formulário de consolidação — apenas para UNIDADE */}
      {isUnidade && (
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" />
            Consolidar Pedido do Mês
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Esta ação agrupa todas as requisições de materiais{' '}
            <strong>aprovadas</strong> do mês selecionado em um único Pedido de
            Compra para envio à Mantenedora. A operação é idempotente — se já
            existir um pedido para o mês, ele será atualizado.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mês de Referência
              </label>
              <input
                type="month"
                value={mesConsolidacao}
                onChange={(e) => setMesConsolidacao(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações (opcional)
              </label>
              <input
                type="text"
                value={observacoesConsolidacao}
                onChange={(e) => setObservacoesConsolidacao(e.target.value)}
                placeholder="Observações para a Mantenedora..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleConsolidar}
              disabled={consolidando || !mesConsolidacao}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {consolidando ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <PackageCheck className="h-4 w-4" />
              )}
              {consolidando ? 'Consolidando...' : 'Consolidar Pedido'}
            </button>
          </div>
        </section>
      )}

      {/* Lista de pedidos */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">
            Pedidos de Compra
          </h2>
          <button
            onClick={carregarPedidos}
            disabled={carregando}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`}
            />
            Atualizar
          </button>
        </div>

        {carregando ? (
          <div className="text-center py-12 text-gray-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Carregando pedidos...</p>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Nenhum pedido de compra encontrado.
            </p>
            {isUnidade && (
              <p className="text-xs text-gray-400 mt-1">
                Consolide as requisições aprovadas para criar o primeiro pedido.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.map((pedido) => {
              const proximosStatus = getProximosStatus(pedido);
              const expandido = pedidoExpandido === pedido.id;

              return (
                <div
                  key={pedido.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
                >
                  {/* Cabeçalho do pedido */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      setPedidoExpandido(expandido ? null : pedido.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusPedidoCor(pedido.status)}`}
                      >
                        {ICONES_STATUS[pedido.status]}
                        {getStatusPedidoLabel(pedido.status)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          Pedido — {pedido.mesReferencia}
                        </p>
                        <p className="text-xs text-gray-500">
                          {pedido.unit.name} · {pedido.itens.length} item(ns)
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform ${expandido ? 'rotate-180' : ''}`}
                    />
                  </div>

                  {/* Conteúdo expandido */}
                  {expandido && (
                    <div className="border-t border-gray-100 p-4 space-y-4">
                      {/* Itens do pedido */}
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Itens do Pedido
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100">
                                <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">
                                  Categoria
                                </th>
                                <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">
                                  Descrição
                                </th>
                                <th className="text-right py-2 text-xs font-medium text-gray-500">
                                  Qtd.
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {pedido.itens.map((item) => (
                                <tr
                                  key={item.id}
                                  className="border-b border-gray-50 last:border-0"
                                >
                                  <td className="py-2 pr-4 text-gray-600 text-xs">
                                    {item.categoria}
                                  </td>
                                  <td className="py-2 pr-4 text-gray-800">
                                    {item.descricao}
                                  </td>
                                  <td className="py-2 text-right font-medium text-gray-800">
                                    {item.quantidade}
                                    {item.unidadeMedida
                                      ? ` ${item.unidadeMedida}`
                                      : ''}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Observações */}
                      {pedido.observacoes && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Observações
                          </p>
                          <p className="text-sm text-gray-700">
                            {pedido.observacoes}
                          </p>
                        </div>
                      )}

                      {/* Ações de status */}
                      {proximosStatus.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 w-full mb-1">
                            Alterar status:
                          </p>
                          {proximosStatus.map((status) => (
                            <button
                              key={status}
                              onClick={() =>
                                handleAtualizarStatus(pedido.id, status)
                              }
                              disabled={atualizandoStatus === pedido.id}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${getStatusPedidoCor(status)} border-current hover:opacity-80`}
                            >
                              {atualizandoStatus === pedido.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                ICONES_STATUS[status]
                              )}
                              {getStatusPedidoLabel(status)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
