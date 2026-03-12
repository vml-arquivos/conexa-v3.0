import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, Edit3, ChevronDown, ChevronUp, X } from 'lucide-react';
import {
  listUnitMaterialRequests,
  reviewMaterialRequest,
  getCategoryLabel,
  getStatusLabel,
  getStatusColor,
  type MaterialRequest,
  type MaterialCategory,
  type RequestStatus,
} from '../../api/material-request';
import { getAccessibleClassrooms, getAccessibleTeachers } from '../../api/lookup';
import type { AccessibleClassroom, AccessibleTeacher } from '../../types/lookup';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface ItemAjuste {
  id: string;
  nome: string;
  qtdSolicitada: number;
  qtdAprovada: number;
}

interface ModalAjusteState {
  req: MaterialRequest;
  itens: ItemAjuste[];
  observacao: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function parseItens(req: MaterialRequest): { nome: string; qtd: number }[] {
  // Tenta ler do campo description (JSON com itens)
  if (req.description) {
    try {
      const parsed = JSON.parse(req.description);
      if (parsed._review) return []; // metadado de revisão, não itens
      if (Array.isArray(parsed.itens)) {
        return parsed.itens.map((i: { item?: string; quantidade?: number }) => ({
          nome: i.item ?? '—',
          qtd: i.quantidade ?? 1,
        }));
      }
    } catch {
      // não é JSON
    }
  }
  // Tenta ler do campo items (MaterialRequestItemRecord)
  if (req.items && req.items.length > 0) {
    return req.items.map(i => ({ nome: i.productName || i.materialName || i.materialId || '—', qtd: i.quantity }));
  }
  // Tenta ler do campo originalItens (itens armazenados no description)
  if (req.originalItens && req.originalItens.length > 0) {
    return req.originalItens.map(i => ({ nome: i.item ?? '—', qtd: i.quantidade ?? 1 }));
  }
  // Fallback: título como item único
  return [{ nome: req.title, qtd: req.quantity }];
}

function ResumoItens({ req }: { req: MaterialRequest }) {
  const itens = parseItens(req);
  if (itens.length === 0) return <span className="text-gray-400 text-xs">—</span>;
  const primeiro = itens[0];
  return (
    <span className="text-xs">
      {primeiro.nome} x{primeiro.qtd}
      {itens.length > 1 && (
        <span className="ml-1 text-gray-400">(+{itens.length - 1})</span>
      )}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function PrioridadeBadge({ prioridade }: { prioridade?: string }) {
  if (!prioridade || prioridade === 'normal') return <span className="text-gray-400 text-xs">—</span>;
  const cores: Record<string, string> = {
    baixa: 'bg-green-50 text-green-700',
    alta: 'bg-red-50 text-red-700',
    urgente: 'bg-red-100 text-red-800 font-semibold',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${cores[prioridade] ?? 'bg-gray-50 text-gray-600'}`}>
      {prioridade.charAt(0).toUpperCase() + prioridade.slice(1)}
    </span>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export function CoordApprovalGrid() {
  // Dados
  const [requisicoes, setRequisicoes] = useState<MaterialRequest[]>([]);
  const [turmas, setTurmas] = useState<AccessibleClassroom[]>([]);
  const [professores, setProfessores] = useState<AccessibleTeacher[]>([]);

  // Filtros
  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroProfessor, setFiltroProfessor] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<MaterialCategory | ''>('');
  const [filtroStatus, setFiltroStatus] = useState<RequestStatus | 'PENDENTES' | ''>('PENDENTES');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  // UI
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  // Modal ajuste
  const [modalAjuste, setModalAjuste] = useState<ModalAjusteState | null>(null);

  const mostrarMensagem = (msg: string) => {
    setMensagem(msg);
    setTimeout(() => setMensagem(null), 4000);
  };

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);
      const [reqs, cls, profs] = await Promise.all([
        listUnitMaterialRequests(),
        getAccessibleClassrooms().catch(() => []),
        getAccessibleTeachers().catch(() => []),
      ]);
      // Filtra apenas categorias do escopo da coordenadora
      const filtradas = reqs.filter(r =>
        r.type === 'PEDAGOGICO' || r.type === 'HIGIENE'
      );
      setRequisicoes(filtradas);
      setTurmas(cls);
      setProfessores(profs);
    } catch {
      setErro('Não foi possível carregar as requisições. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Filtros client-side ──────────────────────────────────────────────────
  const filtradas = requisicoes.filter(r => {
    if (filtroTurma && r.classroomId !== filtroTurma) return false;
    if (filtroProfessor) {
      const prof = r.createdByUser;
      if (!prof) return false;
      const nome = `${prof.firstName} ${prof.lastName} ${prof.email}`.toLowerCase();
      if (!nome.includes(filtroProfessor.toLowerCase())) return false;
    }
    if (filtroCategoria && r.type !== filtroCategoria) return false;
    if (filtroStatus) {
      if (filtroStatus === 'PENDENTES') {
        if (r.status !== 'SOLICITADO' && r.status !== 'RASCUNHO') return false;
      } else {
        if (r.status !== filtroStatus) return false;
      }
    }
    if (filtroDataInicio) {
      const data = new Date(r.requestedDate || r.createdAt);
      if (data < new Date(filtroDataInicio)) return false;
    }
    if (filtroDataFim) {
      const data = new Date(r.requestedDate || r.createdAt);
      if (data > new Date(filtroDataFim + 'T23:59:59')) return false;
    }
    return true;
  });

  // ── Ações ────────────────────────────────────────────────────────────────
  async function handleAprovar(id: string) {
    try {
      setProcessando(id);
      await reviewMaterialRequest(id, { decision: 'APPROVED' });
      mostrarMensagem('Requisição aprovada com sucesso.');
      await carregar();
    } catch {
      setErro('Erro ao aprovar requisição.');
    } finally {
      setProcessando(null);
    }
  }

  async function handleRejeitar(id: string) {
    const motivo = window.prompt('Motivo da rejeição (opcional):') ?? '';
    try {
      setProcessando(id);
      await reviewMaterialRequest(id, { decision: 'REJECTED', observacao: motivo || undefined });
      mostrarMensagem('Requisição rejeitada.');
      await carregar();
    } catch {
      setErro('Erro ao rejeitar requisição.');
    } finally {
      setProcessando(null);
    }
  }

  function abrirModalAjuste(req: MaterialRequest) {
    // Prioridade: itens do banco (com IDs reais) > itens parseados do description
    let itens: ItemAjuste[];
    if (req.items && req.items.length > 0) {
      itens = req.items.map(i => ({
        id: i.id,
        nome: i.productName || i.materialName || i.materialId || '—',
        qtdSolicitada: i.quantity,
        qtdAprovada: i.quantity,
      }));
    } else {
      itens = parseItens(req).map((i, idx) => ({
        id: req.items?.[idx]?.id ?? `item-${idx}`,
        nome: i.nome,
        qtdSolicitada: i.qtd,
        qtdAprovada: i.qtd,
      }));
    }
    setModalAjuste({ req, itens, observacao: '' });
  }

  async function handleSalvarAjuste() {
    if (!modalAjuste) return;
    try {
      setProcessando(modalAjuste.req.id);
      // Verificar se os itens têm IDs reais do banco (não são IDs temporários "item-N")
      const temIdsReais = modalAjuste.itens.length > 0 &&
        modalAjuste.itens.every(i => i.id && !i.id.startsWith('item-'));

      if (temIdsReais) {
        // Usa APPROVE_ITEMS com decisão por item (backend salva qtyApproved por item)
        await reviewMaterialRequest(modalAjuste.req.id, {
          decision: 'APPROVE_ITEMS',
          notes: modalAjuste.observacao || undefined,
          items: modalAjuste.itens.map(i => ({
            itemId: i.id,
            approved: i.qtdAprovada > 0,
            qtyApproved: i.qtdAprovada,
          })),
        });
      } else {
        // Fallback: usa ADJUSTED com itemsApproved (legado)
        await reviewMaterialRequest(modalAjuste.req.id, {
          decision: 'ADJUSTED',
          observacao: modalAjuste.observacao || undefined,
          ...(modalAjuste.itens.length > 0
            ? {
                itemsApproved: modalAjuste.itens.map(i => ({
                  id: i.id,
                  quantidadeAprovada: i.qtdAprovada,
                })),
              }
            : {}),
        });
      }
      setModalAjuste(null);
      mostrarMensagem('Requisição ajustada e aprovada.');
      await carregar();
    } catch {
      setErro('Erro ao salvar ajuste.');
    } finally {
      setProcessando(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Aprovação de Requisições
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Aprove ou rejeite solicitações de materiais feitas pelos professores (somente Pedagógico e Higiene Pessoal).
        </p>
      </header>

      {/* Mensagem de feedback */}
      {mensagem && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {mensagem}
        </div>
      )}
      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {erro}
          <button onClick={() => setErro(null)} className="ml-auto text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Turma */}
          <div className="min-w-36">
            <label className="block text-xs font-medium text-gray-600 mb-1">Turma</label>
            <select
              value={filtroTurma}
              onChange={e => setFiltroTurma(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Todas</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Professor */}
          <div className="min-w-44">
            <label className="block text-xs font-medium text-gray-600 mb-1">Professor</label>
            <input
              type="text"
              value={filtroProfessor}
              onChange={e => setFiltroProfessor(e.target.value)}
              placeholder="Nome ou e-mail…"
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Categoria */}
          <div className="min-w-36">
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value as MaterialCategory | '')}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Todas</option>
              <option value="PEDAGOGICO">Pedagógico</option>
              <option value="HIGIENE">Higiene Pessoal</option>
            </select>
          </div>

          {/* Status */}
          <div className="min-w-36">
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value as RequestStatus | 'PENDENTES' | '')}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="PENDENTES">Pendentes</option>
              <option value="APROVADO">Aprovadas</option>
              <option value="REJEITADO">Rejeitadas</option>
              <option value="">Todas</option>
            </select>
          </div>

          {/* Período */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data início</label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={e => setFiltroDataInicio(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data fim</label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={e => setFiltroDataFim(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Atualizar */}
          <button
            onClick={carregar}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Carregando requisições…
          </div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="font-medium">Nenhuma requisição encontrada</p>
            <p className="text-xs mt-1">Ajuste os filtros ou aguarde novas solicitações dos professores.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3 text-left w-28">Data</th>
                  <th className="px-4 py-3 text-left">Professor</th>
                  <th className="px-4 py-3 text-left w-32">Turma</th>
                  <th className="px-4 py-3 text-left w-28">Categoria</th>
                  <th className="px-4 py-3 text-left">Itens</th>
                  <th className="px-4 py-3 text-right w-20">Qtd Total</th>
                  <th className="px-4 py-3 text-left w-24">Prioridade</th>
                  <th className="px-4 py-3 text-left w-28">Status</th>
                  <th className="px-4 py-3 text-center w-36">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map(req => {
                  const isExpanded = expandido === req.id;
                  const isPending = req.status === 'SOLICITADO' || req.status === 'RASCUNHO';
                  const isProcessing = processando === req.id;
                  const itens = parseItens(req);

                  return (
                    <>
                      <tr
                        key={req.id}
                        className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}
                      >
                        {/* Data */}
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {new Date(req.requestedDate || req.createdAt).toLocaleDateString('pt-BR')}
                        </td>

                        {/* Professor */}
                        <td className="px-4 py-3">
                          {req.createdByUser ? (
                            <div>
                              <p className="font-medium text-gray-800 text-xs">
                                {req.createdByUser.firstName} {req.createdByUser.lastName}
                              </p>
                              <p className="text-gray-400 text-xs">{req.createdByUser.email}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Turma */}
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {req.classroom?.name ?? <span className="text-gray-400">—</span>}
                        </td>

                        {/* Categoria */}
                        <td className="px-4 py-3">
                          <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                            {getCategoryLabel(req.type)}
                          </span>
                        </td>

                        {/* Itens */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <ResumoItens req={req} />
                            {itens.length > 1 && (
                              <button
                                onClick={() => setExpandido(isExpanded ? null : req.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Qtd Total */}
                        <td className="px-4 py-3 text-right text-xs font-medium text-gray-700">
                          {req.quantity}
                        </td>

                        {/* Prioridade */}
                        <td className="px-4 py-3">
                          <PrioridadeBadge prioridade={req.urgencia} />
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={req.status} />
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3">
                          {isPending ? (
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                onClick={() => handleAprovar(req.id)}
                                disabled={isProcessing}
                                title="Aprovar"
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                              >
                                {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => handleRejeitar(req.id)}
                                disabled={isProcessing}
                                title="Rejeitar"
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => abrirModalAjuste(req)}
                                disabled={isProcessing}
                                title="Ajustar"
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded disabled:opacity-50"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 text-center block">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Linha expandida: lista completa de itens */}
                      {isExpanded && itens.length > 1 && (
                        <tr key={`${req.id}-expand`} className="bg-blue-50/20">
                          <td colSpan={9} className="px-8 py-2">
                            <ul className="space-y-0.5">
                              {itens.map((item, idx) => (
                                <li key={idx} className="text-xs text-gray-600 flex items-baseline gap-1">
                                  <span className="text-gray-400">•</span>
                                  <span>{item.nome}</span>
                                  <span className="text-gray-400">x{item.qtd}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rodapé com contagem */}
      {!loading && filtradas.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {filtradas.length} requisição{filtradas.length !== 1 ? 'ões' : ''} exibida{filtradas.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Modal Ajustar */}
      {modalAjuste && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Ajustar Requisição</h2>
              <button onClick={() => setModalAjuste(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-600">
                Ajuste as quantidades aprovadas para cada item:
              </p>
              <table className="min-w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right w-24">Solicitado</th>
                    <th className="px-3 py-2 text-right w-28">Aprovado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {modalAjuste.itens.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-xs text-gray-700">{item.nome}</td>
                      <td className="px-3 py-2 text-right text-xs text-gray-500">{item.qtdSolicitada}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={item.qtdSolicitada}
                          value={item.qtdAprovada}
                          onChange={e => {
                            const novos = [...modalAjuste.itens];
                            novos[idx] = { ...item, qtdAprovada: Number(e.target.value) };
                            setModalAjuste({ ...modalAjuste, itens: novos });
                          }}
                          className="w-20 border border-gray-200 rounded px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
                <textarea
                  value={modalAjuste.observacao}
                  onChange={e => setModalAjuste({ ...modalAjuste, observacao: e.target.value })}
                  rows={2}
                  placeholder="Motivo do ajuste (opcional)…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setModalAjuste(null)}
                className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarAjuste}
                disabled={processando === modalAjuste.req.id}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {processando === modalAjuste.req.id ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Salvar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
