import { useState, useEffect, useCallback } from 'react';
import {
  listUnitMaterialRequests,
  getMaterialRequestById,
  reviewMaterialRequest,
  getCategoryLabel,
  getStatusLabel,
  getStatusColor,
  type MaterialRequest,
  type MaterialCategory,
  type RequestStatus,
  type ReviewItemDecision,
} from '../../api/material-request';
import { getAccessibleClassrooms } from '../../api/lookup';
import type { AccessibleClassroom } from '../../types/lookup';
import { X, CheckCircle2, XCircle, ChevronRight, Loader2, CheckSquare, Square } from 'lucide-react';

// ─── Badges ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function UrgenciaBadge({ urgencia }: { urgencia?: string }) {
  if (!urgencia) return null;
  const colors: Record<string, string> = {
    BAIXA: 'bg-green-50 text-green-700 border border-green-200',
    MEDIA: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    ALTA: 'bg-red-50 text-red-700 border border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[urgencia] ?? 'bg-gray-50 text-gray-600'}`}>
      {urgencia.charAt(0) + urgencia.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ParsedItem {
  id?: string;
  item: string;
  quantidade: number;
  unidade?: string;
  observacao?: string;
}

function parseItensDetalhado(req: MaterialRequest): ParsedItem[] {
  // Prioridade 1: itens do banco (MaterialRequestItem)
  if (req.items && req.items.length > 0) {
    return req.items.map(i => ({
      id: i.id,
      item: i.materialName ?? i.materialId,
      quantidade: i.quantity,
      unidade: i.unit,
      observacao: i.observations,
    }));
  }
  // Prioridade 2: itens originais do campo description (retornados pelo getById)
  if (req.originalItens && req.originalItens.length > 0) {
    return req.originalItens.map(i => ({
      item: i.item,
      quantidade: i.quantidade,
      unidade: i.unidade,
    }));
  }
  // Prioridade 3: parsear description diretamente
  if (req.description) {
    try {
      const parsed = JSON.parse(req.description) as {
        itens?: { item: string; quantidade: number; unidade?: string; observacao?: string }[];
        _review?: boolean;
      };
      if (!parsed._review && parsed.itens && parsed.itens.length > 0) {
        return parsed.itens.map(i => ({
          item: i.item,
          quantidade: i.quantidade,
          unidade: i.unidade,
          observacao: i.observacao,
        }));
      }
    } catch { /* ignora */ }
  }
  return [{ item: req.title, quantidade: req.quantity ?? 1 }];
}

function parseItensResumo(req: MaterialRequest): string {
  const itens = parseItensDetalhado(req);
  if (itens.length === 0) return req.title;
  if (itens.length === 1) return `${itens[0].item} x${itens[0].quantidade}`;
  return `${itens.length} itens`;
}

function parseUrgencia(req: MaterialRequest): string | undefined {
  if (req.urgencia) return req.urgencia;
  if (req.description) {
    try {
      const parsed = JSON.parse(req.description) as { urgencia?: string; _review?: boolean };
      if (!parsed._review && parsed.urgencia) return parsed.urgencia;
    } catch { /* ignora */ }
  }
  return undefined;
}

// ─── Estado de revisão por item ───────────────────────────────────────────────

interface ItemReviewState {
  itemId: string;
  approved: boolean;
  qtyApproved: number;
  reason: string;
  qtyMax: number;
}

// ─── Tipos de aba ─────────────────────────────────────────────────────────────

type Tab = 'pendentes' | 'aprovadas' | 'todas';

const TAB_STATUS: Record<Tab, RequestStatus | undefined> = {
  pendentes: 'SOLICITADO',
  aprovadas: 'APROVADO',
  todas: undefined,
};

// ─── Drawer de Detalhe com aprovação por item ─────────────────────────────────

interface DetalheDrawerProps {
  reqId: string | null;
  onClose: () => void;
  onRevisaoSalva: () => void;
  onRejeitar: (id: string, titulo: string) => void;
  processando: string | null;
  setProcessando: (id: string | null) => void;
  setToast: (t: { msg: string; tipo: 'ok' | 'erro' } | null) => void;
}

function DetalheDrawer({
  reqId,
  onClose,
  onRevisaoSalva,
  onRejeitar,
  processando,
  setProcessando,
  setToast,
}: DetalheDrawerProps) {
  const [req, setReq] = useState<MaterialRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estado de revisão por item
  const [itemStates, setItemStates] = useState<ItemReviewState[]>([]);
  const [notaGeral, setNotaGeral] = useState('');
  const [modoRevisao, setModoRevisao] = useState(false);

  useEffect(() => {
    if (!reqId) { setReq(null); setItemStates([]); setModoRevisao(false); return; }
    setLoading(true); setErro(null); setModoRevisao(false);
    getMaterialRequestById(reqId)
      .then(data => {
        setReq(data);
        // Inicializa estados de revisão por item (apenas para itens do banco com ID)
        const itens = parseItensDetalhado(data);
        const states: ItemReviewState[] = itens
          .filter(i => i.id)
          .map(i => ({
            itemId: i.id!,
            approved: true,
            qtyApproved: i.quantidade,
            reason: '',
            qtyMax: i.quantidade,
          }));
        setItemStates(states);
      })
      .catch(() => setErro('Não foi possível carregar os detalhes.'))
      .finally(() => setLoading(false));
  }, [reqId]);

  if (!reqId) return null;

  const isPending = req?.status === 'SOLICITADO';
  const isProcessing = processando === reqId;
  const itens = req ? parseItensDetalhado(req) : [];
  const urgencia = req ? parseUrgencia(req) : undefined;
  const professor = req?.createdByUser
    ? `${req.createdByUser.firstName} ${req.createdByUser.lastName}`
    : '—';

  // Tem itens com ID (podem ser aprovados individualmente)
  const temItensComId = itemStates.length > 0;

  function toggleItemApproved(itemId: string) {
    setItemStates(prev => prev.map(s =>
      s.itemId === itemId
        ? { ...s, approved: !s.approved, qtyApproved: !s.approved ? s.qtyMax : 0 }
        : s
    ));
  }

  function setQtyApproved(itemId: string, qty: number) {
    setItemStates(prev => prev.map(s =>
      s.itemId === itemId
        ? { ...s, qtyApproved: Math.min(Math.max(0, qty), s.qtyMax), approved: qty > 0 }
        : s
    ));
  }

  function setItemReason(itemId: string, reason: string) {
    setItemStates(prev => prev.map(s =>
      s.itemId === itemId ? { ...s, reason } : s
    ));
  }

  function aprovarTodos() {
    setItemStates(prev => prev.map(s => ({ ...s, approved: true, qtyApproved: s.qtyMax })));
  }

  function rejeitarTodos() {
    setItemStates(prev => prev.map(s => ({ ...s, approved: false, qtyApproved: 0 })));
  }

  async function handleSalvarRevisaoPorItem() {
    if (!req) return;
    try {
      setProcessando(req.id);
      const items: ReviewItemDecision[] = itemStates.map(s => ({
        itemId: s.itemId,
        approved: s.approved,
        qtyApproved: s.qtyApproved,
        reason: s.reason || undefined,
      }));
      await reviewMaterialRequest(req.id, {
        decision: 'APPROVE_ITEMS',
        notes: notaGeral || undefined,
        items,
      });
      const allRejected = items.every(i => i.qtyApproved === 0);
      const allApproved = items.every(i => i.approved && i.qtyApproved > 0);
      const msg = allRejected
        ? 'Requisição rejeitada.'
        : allApproved
        ? 'Requisição aprovada com sucesso.'
        : 'Revisão salva: aprovação parcial.';
      setToast({ msg, tipo: 'ok' });
      onClose();
      onRevisaoSalva();
    } catch {
      setToast({ msg: 'Erro ao salvar revisão. Tente novamente.', tipo: 'erro' });
    } finally {
      setProcessando(null);
    }
  }

  async function handleAprovarTudo() {
    if (!req) return;
    try {
      setProcessando(req.id);
      await reviewMaterialRequest(req.id, { decision: 'APPROVED', notes: notaGeral || undefined });
      setToast({ msg: 'Requisição aprovada com sucesso.', tipo: 'ok' });
      onClose();
      onRevisaoSalva();
    } catch {
      setToast({ msg: 'Erro ao aprovar. Tente novamente.', tipo: 'erro' });
    } finally {
      setProcessando(null);
    }
  }

  // Calcula resumo da revisão atual
  const aprovados = itemStates.filter(s => s.approved && s.qtyApproved > 0).length;
  const rejeitados = itemStates.filter(s => !s.approved || s.qtyApproved === 0).length;
  const isParcialPreview = aprovados > 0 && rejeitados > 0;

  // Status virtual para exibir no detalhe
  const statusExibido = req?.statusVirtual ?? req?.status ?? 'SOLICITADO';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Detalhe da Requisição</h2>
            {req && (
              <p className="text-xs text-gray-400 mt-0.5">{req.code}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              Carregando...
            </div>
          )}
          {erro && !loading && (
            <div className="text-red-500 text-sm text-center py-8">{erro}</div>
          )}
          {req && !loading && (
            <>
              {/* Metadados */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Professor</p>
                  <p className="font-medium text-gray-800">{professor}</p>
                  {req.createdByUser?.email && (
                    <p className="text-xs text-gray-400">{req.createdByUser.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Turma</p>
                  <p className="font-medium text-gray-800">{req.classroom?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Categoria</p>
                  <p className="font-medium text-gray-800">{getCategoryLabel(req.type)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Data</p>
                  <p className="font-medium text-gray-800">
                    {new Date(req.requestedDate ?? req.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
                  <StatusBadge status={statusExibido} />
                </div>
                {urgencia && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Urgência</p>
                    <UrgenciaBadge urgencia={urgencia} />
                  </div>
                )}
              </div>

              {/* Justificativa */}
              {req.justificativa && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Justificativa</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2">
                    {req.justificativa}
                  </p>
                </div>
              )}

              {/* Revisão anterior (se já revisada) */}
              {req.reviewData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Revisão anterior</p>
                  <p className="text-sm text-blue-800">
                    {req.reviewData.isParcial ? 'Aprovação parcial' : req.reviewData.decision === 'REJECTED' ? 'Rejeitada' : 'Aprovada'}
                    {req.reviewData.notes && ` — ${req.reviewData.notes}`}
                  </p>
                  {req.reviewData.reviewedAt && (
                    <p className="text-xs text-blue-500 mt-0.5">
                      {new Date(req.reviewData.reviewedAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              )}

              {/* Grade de itens */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    {isPending && modoRevisao ? 'Revisão por Item' : 'Itens Solicitados'}
                  </p>
                  {isPending && temItensComId && !modoRevisao && (
                    <button
                      onClick={() => setModoRevisao(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Revisar por item
                    </button>
                  )}
                  {isPending && modoRevisao && (
                    <div className="flex gap-2">
                      <button
                        onClick={aprovarTodos}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        Aprovar todos
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={rejeitarTodos}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Rejeitar todos
                      </button>
                    </div>
                  )}
                </div>

                {itens.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhum item detalhado.</p>
                ) : modoRevisao && temItensComId ? (
                  /* Modo revisão por item */
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <th className="px-3 py-2 text-left">Produto</th>
                          <th className="px-3 py-2 text-center w-16">Solicit.</th>
                          <th className="px-3 py-2 text-center w-20">Aprovar</th>
                          <th className="px-3 py-2 text-center w-20">Qtd Aprov.</th>
                          <th className="px-3 py-2 text-left">Motivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {itens.map((item) => {
                          const state = item.id ? itemStates.find(s => s.itemId === item.id) : null;
                          return (
                            <tr key={item.id ?? item.item} className={state && !state.approved ? 'bg-red-50' : state?.qtyApproved !== state?.qtyMax ? 'bg-orange-50' : ''}>
                              <td className="px-3 py-2 font-medium text-gray-800">
                                {item.item}
                                {item.unidade && <span className="text-xs text-gray-400 ml-1">({item.unidade})</span>}
                              </td>
                              <td className="px-3 py-2 text-center text-gray-600">{item.quantidade}</td>
                              <td className="px-3 py-2 text-center">
                                {state ? (
                                  <button
                                    onClick={() => toggleItemApproved(state.itemId)}
                                    className={`inline-flex items-center justify-center transition-colors ${state.approved ? 'text-green-600 hover:text-green-800' : 'text-gray-300 hover:text-gray-500'}`}
                                  >
                                    {state.approved
                                      ? <CheckSquare className="h-5 w-5" />
                                      : <Square className="h-5 w-5" />
                                    }
                                  </button>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {state ? (
                                  <input
                                    type="number"
                                    min={0}
                                    max={state.qtyMax}
                                    value={state.qtyApproved}
                                    onChange={e => setQtyApproved(state.itemId, parseInt(e.target.value) || 0)}
                                    className="w-16 text-center text-sm border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {state ? (
                                  <input
                                    type="text"
                                    placeholder="Motivo (opcional)"
                                    value={state.reason}
                                    onChange={e => setItemReason(state.itemId, e.target.value)}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  />
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {/* Resumo da revisão */}
                    {itemStates.length > 0 && (
                      <div className={`px-3 py-2 text-xs font-medium border-t ${isParcialPreview ? 'bg-orange-50 text-orange-700 border-orange-200' : aprovados === itemStates.length ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {isParcialPreview
                          ? `Aprovação parcial: ${aprovados} aprovado(s), ${rejeitados} rejeitado(s)`
                          : aprovados === itemStates.length
                          ? 'Todos os itens serão aprovados'
                          : 'Todos os itens serão rejeitados'
                        }
                      </div>
                    )}
                  </div>
                ) : (
                  /* Modo visualização */
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <th className="px-3 py-2 text-left">Produto</th>
                          <th className="px-3 py-2 text-center">Qtd</th>
                          <th className="px-3 py-2 text-left">Unid.</th>
                          {!isPending && <th className="px-3 py-2 text-center">Aprovado</th>}
                          {!isPending && <th className="px-3 py-2 text-center">Qtd Aprov.</th>}
                          <th className="px-3 py-2 text-left">Obs.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {itens.map((i, idx) => {
                          const dbItem = i.id ? req.items?.find(it => it.id === i.id) : null;
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-800">{i.item}</td>
                              <td className="px-3 py-2 text-center text-gray-700">{i.quantidade}</td>
                              <td className="px-3 py-2 text-gray-500">{i.unidade ?? '—'}</td>
                              {!isPending && (
                                <td className="px-3 py-2 text-center">
                                  {dbItem?.approved === true
                                    ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                    : dbItem?.approved === false
                                    ? <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                                    : <span className="text-gray-300">—</span>
                                  }
                                </td>
                              )}
                              {!isPending && (
                                <td className="px-3 py-2 text-center text-gray-700">
                                  {dbItem?.qtyApproved != null ? dbItem.qtyApproved : '—'}
                                </td>
                              )}
                              <td className="px-3 py-2 text-gray-500 text-xs">
                                {dbItem?.approvalReason ?? i.observacao ?? '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Nota geral (modo revisão) */}
              {isPending && modoRevisao && (
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
                    Nota geral (opcional)
                  </label>
                  <textarea
                    value={notaGeral}
                    onChange={e => setNotaGeral(e.target.value)}
                    placeholder="Observação geral para o professor..."
                    rows={2}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer com ações */}
        {req && isPending && (
          <div className="border-t border-gray-200 px-5 py-4 space-y-3">
            {modoRevisao && temItensComId ? (
              /* Ações do modo revisão por item */
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setModoRevisao(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarRevisaoPorItem}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isProcessing ? 'Salvando...' : 'Salvar Revisão'}
                </button>
              </div>
            ) : (
              /* Ações globais */
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => onRejeitar(req.id, req.title)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Rejeitar
                </button>
                <button
                  onClick={handleAprovarTudo}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isProcessing ? 'Aprovando...' : 'Aprovar Tudo'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function MaterialRequestApprovalTable() {
  const [tab, setTab] = useState<Tab>('pendentes');
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterClassroom, setFilterClassroom] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<MaterialCategory | ''>('');
  const [filterBusca, setFilterBusca] = useState('');
  const [classrooms, setClassrooms] = useState<AccessibleClassroom[]>([]);

  const [processando, setProcessando] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null);

  const [modalRejeitar, setModalRejeitar] = useState<{ id: string; titulo: string } | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  const [detalheId, setDetalheId] = useState<string | null>(null);

  useEffect(() => {
    getAccessibleClassrooms().then(setClassrooms).catch(() => setClassrooms([]));
  }, []);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const statusFiltro = TAB_STATUS[tab];
      const data = await listUnitMaterialRequests({
        ...(statusFiltro ? { status: statusFiltro } : {}),
        ...(filterClassroom ? { classroomId: filterClassroom } : {}),
        ...(filterCategoria ? { categoria: filterCategoria } : {}),
      });
      setRequests(data);
    } catch {
      setError('Não foi possível carregar as requisições.');
    } finally {
      setLoading(false);
    }
  }, [tab, filterClassroom, filterCategoria]);

  useEffect(() => { void carregar(); }, [carregar]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const visiveis = filterBusca.trim()
    ? requests.filter(r => {
        const q = filterBusca.toLowerCase();
        const professor = r.createdByUser
          ? `${r.createdByUser.firstName} ${r.createdByUser.lastName} ${r.createdByUser.email}`.toLowerCase()
          : '';
        return (
          r.title.toLowerCase().includes(q) ||
          professor.includes(q) ||
          (r.classroom?.name ?? '').toLowerCase().includes(q)
        );
      })
    : requests;

  // Contadores por tab
  const pendentes = requests.filter(r => r.status === 'SOLICITADO').length;

  function handleAbrirRejeicao(id: string, titulo: string) {
    setModalRejeitar({ id, titulo });
    setMotivoRejeicao('');
    setDetalheId(null);
  }

  async function handleConfirmarRejeicao() {
    if (!modalRejeitar) return;
    try {
      setProcessando(modalRejeitar.id);
      await reviewMaterialRequest(modalRejeitar.id, {
        decision: 'REJECTED',
        observacao: motivoRejeicao || undefined,
      });
      setToast({ msg: 'Requisição rejeitada.', tipo: 'ok' });
      setModalRejeitar(null);
      setMotivoRejeicao('');
      await carregar();
    } catch {
      setToast({ msg: 'Erro ao rejeitar. Tente novamente.', tipo: 'erro' });
    } finally {
      setProcessando(null);
    }
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'pendentes', label: 'Pendentes', count: pendentes },
    { key: 'aprovadas', label: 'Aprovadas' },
    { key: 'todas', label: 'Todas' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Aprovação de Requisições</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie as solicitações de materiais dos professores da sua unidade.
        </p>
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={filterClassroom}
          onChange={e => setFilterClassroom(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as turmas</option>
          {classrooms.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterCategoria}
          onChange={e => setFilterCategoria(e.target.value as MaterialCategory | '')}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as categorias</option>
          <option value="PEDAGOGICO">Pedagógico</option>
          <option value="HIGIENE">Higiene Pessoal</option>
          <option value="LIMPEZA">Limpeza</option>
          <option value="ALIMENTACAO">Alimentação</option>
          <option value="OUTRO">Outro</option>
        </select>
        <input
          type="text"
          placeholder="Buscar professor, turma ou item..."
          value={filterBusca}
          onChange={e => setFilterBusca(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando requisições...
          </div>
        )}
        {error && !loading && (
          <div className="flex items-center justify-center py-12 text-red-500 text-sm">{error}</div>
        )}
        {!loading && !error && visiveis.length === 0 && (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            Nenhuma requisição encontrada.
          </div>
        )}
        {!loading && !error && visiveis.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Professor</th>
                  <th className="px-4 py-3 text-left">Turma</th>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-left">Itens</th>
                  <th className="px-4 py-3 text-left">Urgência</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visiveis.map(req => {
                  const isPending = req.status === 'SOLICITADO';
                  const isProcessing = processando === req.id;
                  const urgencia = parseUrgencia(req);
                  const itensResumo = parseItensResumo(req);
                  const professor = req.createdByUser
                    ? `${req.createdByUser.firstName} ${req.createdByUser.lastName}`
                    : '—';
                  const email = req.createdByUser?.email ?? '';
                  const data = new Date(req.requestedDate ?? req.createdAt).toLocaleDateString('pt-BR');
                  // Usa statusVirtual se disponível (PARCIAL)
                  const statusExibido = req.statusVirtual ?? req.status;

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setDetalheId(req.id)}
                    >
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{data}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{professor}</div>
                        {email && <div className="text-xs text-gray-400">{email}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {req.classroom?.name ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {getCategoryLabel(req.type)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs">
                        <span className="line-clamp-2">{itensResumo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <UrgenciaBadge urgencia={urgencia} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={statusExibido} />
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-center">
                          <button
                            onClick={() => setDetalheId(req.id)}
                            className="px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors flex items-center gap-1"
                          >
                            Abrir
                            <ChevronRight className="h-3 w-3" />
                          </button>
                          {isPending && (
                            <button
                              onClick={() => handleAbrirRejeicao(req.id, req.title)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                            >
                              Rejeitar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DetalheDrawer
        reqId={detalheId}
        onClose={() => setDetalheId(null)}
        onRevisaoSalva={carregar}
        onRejeitar={handleAbrirRejeicao}
        processando={processando}
        setProcessando={setProcessando}
        setToast={setToast}
      />

      {modalRejeitar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Rejeitar Requisição</h2>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{modalRejeitar.titulo}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo da rejeição <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivoRejeicao}
              onChange={e => setMotivoRejeicao(e.target.value)}
              placeholder="Obrigatório: descreva o motivo para o professor..."
              rows={3}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setModalRejeitar(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRejeicao}
                disabled={!!processando || !motivoRejeicao.trim()}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {processando ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
