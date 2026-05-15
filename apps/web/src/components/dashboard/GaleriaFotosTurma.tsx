/**
 * GaleriaFotosTurma — Exibe miniaturas de fotos dos diários por turma/data.
 *
 * Carrega fotos via GET /rdx/uploads?classroomId=&startDate=&endDate=
 * Fallback: se o endpoint não existir, exibe estado vazio com link para o DiarioBordo.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Download, ExternalLink, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import http from '../../api/http';
import { AppErrorBoundary } from '../ErrorBoundary';

export interface FotoTurma {
  id: string;
  url: string;
  thumbnailUrl?: string;
  descricao?: string;
  campoExperiencia?: string;
  eventDate: string;
  classroomId?: string;
  classroomName?: string;
  uploadedByName?: string;
}

interface GaleriaFotosTurmaProps {
  classroomId?: string;
  startDate?: string;
  endDate?: string;
  turmasDisponiveis?: { id: string; name: string }[];
}

function GaleriaFotosTurmaInner({
  classroomId,
  startDate,
  endDate,
  turmasDisponiveis = [],
}: GaleriaFotosTurmaProps) {
  const navigate = useNavigate();
  const [fotos, setFotos] = useState<FotoTurma[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [fotoAberta, setFotoAberta] = useState<FotoTurma | null>(null);
  const [idxAberto, setIdxAberto] = useState(0);
  const [turmaSel, setTurmaSel] = useState(classroomId ?? '');

  // Datas padrão: mês atual
  const hoje = new Date();
  const primeiroDia = startDate ?? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
  const ultimoDia = endDate ?? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()}`;

  useEffect(() => {
    async function loadFotos() {
      setLoading(true);
      setErro(null);
      try {
        const params: Record<string, string> = {
          startDate: primeiroDia,
          endDate: ultimoDia,
          limit: '200',
        };
        if (turmaSel) params.classroomId = turmaSel;

        const res = await http.get('/rdx/uploads', { params });
        const raw: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setFotos(
          raw.map(f => ({
            id: f.id ?? f._id ?? Math.random().toString(),
            url: f.url ?? f.fileUrl ?? f.path ?? '',
            thumbnailUrl: f.thumbnailUrl ?? f.url ?? f.fileUrl ?? '',
            descricao: f.description ?? f.descricao ?? '',
            campoExperiencia: f.campoExperiencia ?? f.campo ?? '',
            eventDate: (f.eventDate ?? f.createdAt ?? '').substring(0, 10),
            classroomId: f.classroomId ?? '',
            classroomName: f.classroom?.name ?? f.classroomName ?? '',
            uploadedByName: f.uploadedBy?.firstName
              ? `${f.uploadedBy.firstName} ${f.uploadedBy.lastName ?? ''}`.trim()
              : f.uploadedByName ?? '',
          }))
        );
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404 || status === 405) {
          // Endpoint ainda não existe — estado vazio informativo
          setFotos([]);
          setErro('endpoint_nao_disponivel');
        } else {
          setErro('Erro ao carregar fotos. Tente novamente.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadFotos();
  }, [turmaSel, primeiroDia, ultimoDia]);

  // Agrupar por data
  const porData: Record<string, FotoTurma[]> = {};
  for (const f of fotos) {
    if (!porData[f.eventDate]) porData[f.eventDate] = [];
    porData[f.eventDate].push(f);
  }
  const datas = Object.keys(porData).sort((a, b) => b.localeCompare(a));

  function formatDateBR(iso: string) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function abrirFoto(foto: FotoTurma, idx: number) {
    setFotoAberta(foto);
    setIdxAberto(idx);
  }

  function navLightbox(dir: -1 | 1) {
    const novoIdx = idxAberto + dir;
    if (novoIdx >= 0 && novoIdx < fotos.length) {
      setFotoAberta(fotos[novoIdx]);
      setIdxAberto(novoIdx);
    }
  }

  function downloadFoto(foto: FotoTurma) {
    const a = document.createElement('a');
    a.href = foto.url;
    a.download = `foto-${foto.eventDate}-${foto.id}.jpg`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho com filtro de turma */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-gray-800">Galeria de Fotos das Turmas</h3>
          {fotos.length > 0 && (
            <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
              {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {turmasDisponiveis.length > 0 && (
            <select
              value={turmaSel}
              onChange={e => setTurmaSel(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="">Todas as turmas</option>
              {turmasDisponiveis.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setLoading(l => { if (!l) { setFotos([]); setErro(null); } return l; })}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            title="Recarregar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Estados */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
          <span className="ml-2 text-sm text-gray-400">Carregando fotos...</span>
        </div>
      )}

      {!loading && erro === 'endpoint_nao_disponivel' && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center space-y-3">
          <Camera className="h-10 w-10 text-blue-300 mx-auto" />
          <p className="text-sm font-semibold text-blue-700">Galeria de fotos em implantação</p>
          <p className="text-xs text-blue-500 max-w-sm mx-auto">
            As fotos são enviadas pelos professores no Diário de Bordo de cada turma.
            O endpoint de listagem centralizada será disponibilizado em breve.
          </p>
          <button
            onClick={() => navigate('/app/diario-calendario')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Acessar Diário de Bordo
          </button>
        </div>
      )}

      {!loading && erro && erro !== 'endpoint_nao_disponivel' && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-center">
          <p className="text-sm text-rose-600">{erro}</p>
        </div>
      )}

      {!loading && !erro && fotos.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center space-y-2">
          <Camera className="h-10 w-10 text-gray-200 mx-auto" />
          <p className="text-sm text-gray-400">Nenhuma foto encontrada para o período selecionado.</p>
          <p className="text-xs text-gray-300">
            {primeiroDia && `De ${formatDateBR(primeiroDia)} até ${formatDateBR(ultimoDia)}`}
          </p>
        </div>
      )}

      {/* Grade de fotos agrupadas por data */}
      {!loading && !erro && fotos.length > 0 && (
        <div className="space-y-5">
          {datas.map(data => (
            <div key={data}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                {formatDateBR(data)}
                {porData[data][0]?.classroomName && (
                  <span className="ml-2 text-gray-400 normal-case font-normal">
                    — {porData[data][0].classroomName}
                  </span>
                )}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {porData[data].map((foto, idx) => {
                  const globalIdx = fotos.indexOf(foto);
                  return (
                    <button
                      key={foto.id}
                      onClick={() => abrirFoto(foto, globalIdx)}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all hover:scale-105"
                      title={foto.descricao || 'Ver foto'}
                    >
                      <img
                        src={foto.thumbnailUrl || foto.url}
                        alt={foto.descricao || `Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={e => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f3f4f6"/%3E%3Ctext x="50" y="55" text-anchor="middle" font-size="30" fill="%23d1d5db"%3E📷%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink className="h-5 w-5 text-white" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {fotoAberta && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFotoAberta(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-800 truncate max-w-xs">
                  {fotoAberta.descricao || 'Foto da turma'}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDateBR(fotoAberta.eventDate)}
                  {fotoAberta.classroomName && ` — ${fotoAberta.classroomName}`}
                  {fotoAberta.uploadedByName && ` · ${fotoAberta.uploadedByName}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFoto(fotoAberta)}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                  title="Baixar foto"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFotoAberta(null)}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Imagem */}
            <div className="relative bg-gray-50 flex items-center justify-center" style={{ minHeight: 320 }}>
              <img
                src={fotoAberta.url}
                alt={fotoAberta.descricao || 'Foto'}
                className="max-h-[60vh] max-w-full object-contain"
              />
              {/* Navegação */}
              {idxAberto > 0 && (
                <button
                  onClick={() => navLightbox(-1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-700" />
                </button>
              )}
              {idxAberto < fotos.length - 1 && (
                <button
                  onClick={() => navLightbox(1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-gray-700" />
                </button>
              )}
            </div>

            {/* Rodapé */}
            {fotoAberta.campoExperiencia && (
              <div className="px-4 py-2 border-t border-gray-100 bg-indigo-50">
                <p className="text-xs text-indigo-600 font-medium">
                  Campo de Experiência: {fotoAberta.campoExperiencia}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function GaleriaFotosTurma(props: GaleriaFotosTurmaProps) {
  return (
    <AppErrorBoundary>
      <GaleriaFotosTurmaInner {...props} />
    </AppErrorBoundary>
  );
}
