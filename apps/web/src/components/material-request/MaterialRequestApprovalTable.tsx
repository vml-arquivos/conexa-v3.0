import { useState, useEffect, useCallback } from 'react';
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
import { getAccessibleClassrooms } from '../../api/lookup';
import type { AccessibleClassroom } from '../../types/lookup';

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

function parseItens(req: MaterialRequest): string {
  // Tenta ler do campo items (relação)
  if (req.items && req.items.length > 0) {
    return req.items
      .map(i => `${i.materialName ?? i.materialId} x${i.quantity}`)
      .join('; ');
  }
  // Tenta ler do description (JSON serializado pelo service)
  if (req.description) {
    try {
      const parsed = JSON.parse(req.description) as {
        itens?: { item: string; quantidade: number }[];
        _review?: boolean;
      };
      if (!parsed._review && parsed.itens && parsed.itens.length > 0) {
        return parsed.itens.map(i => `${i.item} x${i.quantidade}`).join('; ');
      }
    } catch {
      // não é JSON — usa o title
    }
  }
  return req.title;
}

function parseUrgencia(req: MaterialRequest): string | undefined {
  if (req.urgencia) return req.urgencia;
  if (req.description) {
    try {
      const parsed = JSON.parse(req.description) as { urgencia?: string; _review?: boolean };
      if (!parsed._review && parsed.urgencia) return parsed.urgencia;
    } catch {
      // ignora
    }
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

// ─── Componente principal ─────────────────────────────────────────────────────

export function MaterialRequestApprovalTable() {
  const [tab, setTab] = useState<Tab>('pendentes');
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filterClassroom, setFilterClassroom] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<MaterialCategory | ''>('');
  const [filterBusca, setFilterBusca] = useState('');

  // Classrooms para o select
  const [classrooms, setClassrooms] = useState<AccessibleClassroom[]>([]);

  // Processamento de ações
  const [processando, setProcessando] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null);

  // Modal de rejeição
  const [modalRejeitar, setModalRejeitar] = useState<{ id: string; titulo: string } | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  // ── Carregar turmas ──
  useEffect(() => {
    getAccessibleClassrooms().then(setClassrooms).catch(() => setClassrooms([]));
  }, []);

  // ── Carregar requisições ──
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

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // ── Toast auto-dismiss ──
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Filtro de busca local ──
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

  // ── Ações ──
  async function handleAprovar(id: string) {
    try {
      setProcessando(id);
      await reviewMaterialRequest(id, { decision: 'APPROVED' });
      setToast({ msg: 'Requisição aprovada.', tipo: 'ok' });
      await carregar();
    } catch {
      setToast({ msg: 'Erro ao aprovar. Tente novamente.', tipo: 'erro' });
    } finally {
      setProcessando(null);
    }
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

  // ── Render ──
  const tabs: { key: Tab; label: string }[] = [
    { key: 'pendentes', label: 'Pendentes' },
    { key: 'aprovadas', label: 'Aprovadas' },
    { key: 'todas', label: 'Todas' },
  ];

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Aprovação de Requisições</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie as solicitações de materiais dos professores da sua unidade.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Abas */}
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

      {/* Filtros */}
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

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
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
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Turma</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Professor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Itens</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Urgência</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visiveis.map(req => {
                  const isPending = req.status === 'SOLICITADO';
                  const isProcessing = processando === req.id;
                  const urgencia = parseUrgencia(req);
                  const itensResumo = parseItens(req);
                  const professor = req.createdByUser
                    ? `${req.createdByUser.firstName} ${req.createdByUser.lastName}`
                    : '—';
                  const email = req.createdByUser?.email ?? '';
                  const data = new Date(req.requestedDate ?? req.createdAt).toLocaleDateString('pt-BR');

                  return (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{data}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {req.classroom?.name ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{professor}</div>
                        {email && <div className="text-xs text-gray-400">{email}</div>}
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
                      <td className="px-4 py-3">
                        {isPending ? (
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => handleAprovar(req.id)}
                              disabled={isProcessing}
                              className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {isProcessing ? '...' : 'Aprovar'}
                            </button>
                            <button
                              onClick={() => {
                                setModalRejeitar({ id: req.id, titulo: req.title });
                                setMotivoRejeicao('');
                              }}
                              disabled={isProcessing}
                              className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                            >
                              Rejeitar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 block text-center">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de rejeição */}
      {modalRejeitar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Rejeitar Requisição</h2>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{modalRejeitar.titulo}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo da rejeição <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={motivoRejeicao}
              onChange={e => setMotivoRejeicao(e.target.value)}
              placeholder="Descreva o motivo para o professor..."
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
                disabled={!!processando}
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
