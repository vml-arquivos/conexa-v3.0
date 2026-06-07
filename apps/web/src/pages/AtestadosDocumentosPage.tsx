/**
 * AtestadosDocumentosPage
 *
 * Gestão de documentação de matrícula e atestados médicos.
 * Exibe status de documentos entregues por aluno (documentosMatricula JSON).
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, RefreshCw, CheckCircle2,
  XCircle, ChevronRight, Loader2, ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { ChildAvatar } from '../components/children/ChildAvatar';
import { PageShell } from '../components/ui/PageShell';

interface DocumentosMatricula {
  certidaoNascimento?: boolean;
  cpfCrianca?: boolean;
  rgCpfResponsavel?: boolean;
  comprovanteResidencia?: boolean;
  cartaoVacina?: boolean;
  cartaoSUS?: boolean;
  nis?: boolean;
  laudoMedico?: boolean;
  foto?: boolean;
  termoImagem?: boolean;
  declaracaoEscolar?: boolean;
}

interface Aluno {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  documentosMatricula?: DocumentosMatricula;
  laudado?: boolean;
  enrollments?: Array<{ status: string; classroom?: { name?: string } }>;
}

const DOCS_LABELS: Record<keyof DocumentosMatricula, string> = {
  certidaoNascimento: 'Certidão de nascimento',
  cpfCrianca: 'CPF da criança',
  rgCpfResponsavel: 'RG/CPF do responsável',
  comprovanteResidencia: 'Comprovante de residência',
  cartaoVacina: 'Cartão de vacina',
  cartaoSUS: 'Cartão SUS',
  nis: 'NIS',
  laudoMedico: 'Laudo médico',
  foto: 'Foto',
  termoImagem: 'Termo de uso de imagem',
  declaracaoEscolar: 'Declaração escolar',
};

function contarDocs(docs?: DocumentosMatricula) {
  if (!docs) return { entregues: 0, total: 0 };
  const vals = Object.values(docs);
  return { entregues: vals.filter(Boolean).length, total: vals.length };
}

export default function AtestadosDocumentosPage() {
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'incompletos' | 'laudos'>('todos');
  const [expandido, setExpandido] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await http.get('/children', { params: { limit: 500 } });
      const data = res.data;
      setAlunos(Array.isArray(data) ? data : data?.data ?? []);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = alunos.filter(a => {
    const nome = `${a.firstName} ${a.lastName}`.toLowerCase();
    if (busca && !nome.includes(busca.toLowerCase())) return false;
    if (filtro === 'incompletos') {
      const { entregues, total } = contarDocs(a.documentosMatricula);
      return total === 0 || entregues < total;
    }
    if (filtro === 'laudos') return a.laudado === true;
    return true;
  });

  const totalIncompletos = alunos.filter(a => {
    const { entregues, total } = contarDocs(a.documentosMatricula);
    return total === 0 || entregues < total;
  }).length;

  const totalLaudos = alunos.filter(a => a.laudado).length;

  return (
    <PageShell
      title="Atestados e Documentos"
      description="Controle de documentação de matrícula e atestados médicos"
      headerActions={
        <button
          onClick={carregar}
          disabled={carregando}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-5 w-5 text-slate-500" />
            <span className="text-sm text-slate-600">Total de alunos</span>
          </div>
          <p className="text-3xl font-semibold text-slate-800">{alunos.length}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-amber-700">Doc. incompleta</span>
          </div>
          <p className="text-3xl font-semibold text-amber-900">{totalIncompletos}</p>
        </div>
        <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-violet-500" />
            <span className="text-sm text-violet-700">Com laudo</span>
          </div>
          <p className="text-3xl font-semibold text-violet-900">{totalLaudos}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          ['todos', 'Todos'],
          ['incompletos', `Incompletos (${totalIncompletos})`],
          ['laudos', `Com laudo (${totalLaudos})`],
        ] as [string, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFiltro(val as typeof filtro)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filtro === val
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar aluno..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nenhum aluno encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {filtrados.map(aluno => {
            const turma = aluno.enrollments?.find(e => e.status === 'ATIVA')?.classroom?.name;
            const { entregues, total } = contarDocs(aluno.documentosMatricula);
            const pct = total > 0 ? Math.round((entregues / total) * 100) : 0;
            const aberto = expandido === aluno.id;

            return (
              <div key={aluno.id}>
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandido(aberto ? null : aluno.id)}
                >
                  <ChildAvatar
                    firstName={aluno.firstName}
                    lastName={aluno.lastName}
                    photoUrl={aluno.photoUrl}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {aluno.firstName} {aluno.lastName}
                      </p>
                      {aluno.laudado && (
                        <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          Laudado
                        </span>
                      )}
                    </div>
                    {turma && <p className="text-xs text-slate-400 truncate">{turma}</p>}
                    {total > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-24">
                          <div
                            className={`h-1.5 rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{entregues}/{total} docs</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className={`h-4 w-4 text-slate-300 flex-shrink-0 transition-transform ${aberto ? 'rotate-90' : ''}`} />
                </div>

                {/* Documentos expandidos */}
                {aberto && (
                  <div className="px-4 pb-4 bg-slate-50">
                    <div className="grid grid-cols-1 gap-1.5 mb-3">
                      {Object.entries(DOCS_LABELS).map(([key, label]) => {
                        const entregue = aluno.documentosMatricula?.[key as keyof DocumentosMatricula];
                        return (
                          <div key={key} className="flex items-center gap-2">
                            {entregue ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-slate-300 flex-shrink-0" />
                            )}
                            <span className={`text-xs ${entregue ? 'text-slate-700' : 'text-slate-400'}`}>
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => navigate(`/app/secretaria/matriculas/${aluno.id}`)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Editar ficha do aluno →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
