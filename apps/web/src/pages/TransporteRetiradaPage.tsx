/**
 * TransporteRetiradaPage
 *
 * Gestão de transporte escolar e autorizados para retirada.
 * Dados vêm de Child.transporteEscolar (JSON) e Child.autorizadosRetirada (JSON).
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bus, UserCheck, Search, RefreshCw,
  ChevronRight, Phone, AlertCircle, Loader2, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { ChildAvatar } from '../components/children/ChildAvatar';
import { PageShell } from '../components/ui/PageShell';

interface Autorizado {
  nome?: string;
  parentesco?: string;
  telefone?: string;
}

interface Aluno {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  transporteEscolar?: { utiliza?: boolean; nomeTransporte?: string };
  autorizadosRetirada?: Autorizado[];
  enrollments?: Array<{ status: string; classroom?: { name?: string } }>;
}

export default function TransporteRetiradaPage() {
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<'transporte' | 'autorizados'>('transporte');

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
    if (aba === 'transporte') return a.transporteEscolar?.utiliza === true;
    if (aba === 'autorizados') return (a.autorizadosRetirada?.length ?? 0) > 0;
    return true;
  });

  const totalTransporte = alunos.filter(a => a.transporteEscolar?.utiliza).length;
  const totalAutorizados = alunos.filter(a => (a.autorizadosRetirada?.length ?? 0) > 0).length;

  return (
    <PageShell
      title="Transporte e Retirada"
      description="Controle de transporte escolar e pessoas autorizadas para retirada"
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
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Bus className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Usam transporte</span>
          </div>
          <p className="text-3xl font-semibold text-blue-900">{totalTransporte}</p>
          <p className="text-xs text-blue-600 mt-0.5">de {alunos.length} alunos</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Com autorizados</span>
          </div>
          <p className="text-3xl font-semibold text-emerald-900">{totalAutorizados}</p>
          <p className="text-xs text-emerald-600 mt-0.5">de {alunos.length} alunos</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setAba('transporte')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            aba === 'transporte'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Bus className="h-4 w-4" />
          Transporte escolar
          <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
            {totalTransporte}
          </span>
        </button>
        <button
          onClick={() => setAba('autorizados')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            aba === 'autorizados'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Autorizados para retirada
          <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full">
            {totalAutorizados}
          </span>
        </button>
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
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            {busca ? 'Nenhum aluno encontrado.' : aba === 'transporte'
              ? 'Nenhum aluno utiliza transporte escolar.'
              : 'Nenhum aluno tem autorizados para retirada cadastrados.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {filtrados.map(aluno => {
            const turma = aluno.enrollments?.find(e => e.status === 'ATIVA')?.classroom?.name;
            return (
              <div key={aluno.id} className="px-4 py-3">
                {/* Cabeçalho do aluno */}
                <button
                  onClick={() => navigate(`/app/secretaria/matriculas/${aluno.id}`)}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <ChildAvatar
                    firstName={aluno.firstName}
                    lastName={aluno.lastName}
                    photoUrl={aluno.photoUrl}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {aluno.firstName} {aluno.lastName}
                    </p>
                    {turma && (
                      <p className="text-xs text-slate-400 truncate">{turma}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                </button>

                {/* Dados de transporte */}
                {aba === 'transporte' && aluno.transporteEscolar?.utiliza && (
                  <div className="mt-2 ml-10 flex items-center gap-2">
                    <Bus className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      {aluno.transporteEscolar.nomeTransporte ?? 'Transporte escolar'}
                    </span>
                  </div>
                )}

                {/* Autorizados */}
                {aba === 'autorizados' && (aluno.autorizadosRetirada?.length ?? 0) > 0 && (
                  <div className="mt-2 ml-10 space-y-1.5">
                    {aluno.autorizadosRetirada!.map((aut, i) => (
                      <div key={i} className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-slate-700">{aut.nome}</span>
                        {aut.parentesco && (
                          <span className="text-xs text-slate-400">· {aut.parentesco}</span>
                        )}
                        {aut.telefone && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <Phone className="h-3 w-3" />
                            {aut.telefone}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Alerta alunos sem info */}
      {aba === 'transporte' && !carregando && (
        <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            {alunos.filter(a => a.transporteEscolar === null || a.transporteEscolar === undefined).length} alunos sem informação de transporte cadastrada.
            Atualize na ficha de matrícula de cada aluno.
          </p>
        </div>
      )}
    </PageShell>
  );
}
