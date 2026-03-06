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
} from '../../api/material-request';
import { getAccessibleClassrooms } from '../../api/lookup';
import type { AccessibleClassroom } from '../../types/lookup';
import { X, CheckCircle2, XCircle, ChevronRight, Loader2 } from 'lucide-react';

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
  item: string;
  quantidade: number;
  unidade?: string;
  observacao?: string;
}

function parseItensDetalhado(req: MaterialRequest): ParsedItem[] {
  if (req.items && req.items.length > 0) {
    return req.items.map(i => ({
      item: i.materialName ?? i.materialId,
      quantidade: i.quantity,
      unidade: i.unit,
      observacao: i.observations,
    }));
  }
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

// ─── Tipos de aba ─────────────────────────────────────────────────────────────

type Tab = 'pendentes' | 'aprovadas' | 'todas';

const TAB_STATUS: Record<Tab, RequestStatus | undefined> = {
  pendentes: 'SOLICITADO',
  aprovadas: 'APROVADO',
  todas: undefined,
};

// ─── Drawer de Detalhe ────────────────────────────────────────────────────────

interface DetalheDrawerProps {
  reqId: string | null;
  onClose: () => void;
  onAprovar: (id: string) => Promise<void>;
  onRejeitar: (id: string, titulo: string) => void;
  processando: string | null;
}

function DetalheDrawer({ reqId, onClose, onAprovar, onRejeitar, processando }: DetalheDrawerProps) {
  const [req, setReq] = useState<MaterialRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!reqId) { setReq(null); return; }
    setLoading(true); setErro(null);
    getMaterialRequestById(reqId)
      .then(setReq)
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

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Detalhe da Requisição</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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
                  <StatusBadge status={req.status} />
                </div>
                {urgencia && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Urgência</p>
                    <UrgenciaBadge urgencia={urgencia} />
                  </div>
                )}
              </div>

              {req.justificativa && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Justificativa</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2">{req.justificativa}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Itens Solicitados</p>
                {itens.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhum item detalhado.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <th className="px-3 py-2 text-left">Produto</th>
                          <th className="px-3 py-2 text-center">Qtd</th>
                          <th className="px-3 py-2 text-left">Unid.</th>
                          <th className="px-3 py-2 text-left">Observação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {itens.map((i, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-800">{i.item}</td>
                            <td className="px-3 py-2 text-center text-gray-700">{i.quantidade}</td>
                            <td className="px-3 py-2 text-gray-500">{i.unidade ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-500 text-xs">{i.observacao ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer com ações */}
        {req && isPending && (
          <div className="border-t border-gray-200 px-5 py-4 flex gap-3 justify-end">
            <button
              onClick={() => onRejeitar(req.id, req.title)}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Rejeitar
            </button>
            <button
              onClick={() => onAprovar(req.id)}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isProcessing ? 'Aprovando...' : 'Aprovar'}
            </button>
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

  async function handleAprovar(id: string) {
    try {
      setProcessando(id);
      await reviewMaterialRequest(id, { decision: 'APPROVED' });
      setToast({ msg: 'Requisição aprovada com sucesso.', tipo: 'ok' });
      setDetalheId(null);
      await carregar();
    } catch {
      setToast({ msg: 'Erro ao aprovar. Tente novamente.', tipo: 'erro' });
    } finally {
      setProcessando(null);
    }
  }

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pendentes', label: 'Pendentes' },
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
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
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
                        <StatusBadge status={req.status} />
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
                            <>
                              <button
                                onClick={() => handleAprovar(req.id)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                {isProcessing ? '...' : 'Aprovar'}
                              </button>
                              <button
                                onClick={() => handleAbrirRejeicao(req.id, req.title)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                              >
                                Rejeitar
                              </button>
                            </>
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
        onAprovar={handleAprovar}
        onRejeitar={handleAbrirRejeicao}
        processando={processando}
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
