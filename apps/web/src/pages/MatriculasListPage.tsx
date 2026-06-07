/**
 * MatriculasListPage — Lista de Matrículas / Alunos
 *
 * Exibe todos os alunos matriculados na unidade com busca, filtros por turma
 * e status, e ações de edição, cancelamento e transferência.
 *
 * RBAC: UNIDADE_ADMINISTRATIVO, UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
 * Usa endpoints existentes: GET /children, GET /lookup/classrooms/accessible
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Button } from '../components/ui/button';
import { ChildAvatar } from '../components/children/ChildAvatar';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import {
  UserPlus, Search, RefreshCw, Filter, ChevronRight,
  XCircle, Loader2, Users, CheckCircle, AlertTriangle, FileText,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Aluno {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  photoUrl?: string | null;
  isActive: boolean;
  enrollments: {
    id: string;
    status: string;
    classroomId: string;
    classroom?: { name: string };
  }[];
}

interface Turma {
  id: string;
  name: string;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function MatriculasListPage() {
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ATIVA');
  const [alunoSelecionado, setAlunoSelecionado] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [alunosRes, turmasRes] = await Promise.allSettled([
        http.get('/children', { params: { limit: 200 } }),
        http.get('/lookup/classrooms/accessible'),
      ]);
      if (alunosRes.status === 'fulfilled') {
        const data = alunosRes.value.data;
        setAlunos(Array.isArray(data) ? data : data?.data ?? []);
      }
      if (turmasRes.status === 'fulfilled') {
        setTurmas(Array.isArray(turmasRes.value.data) ? turmasRes.value.data : []);
      }
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Filtros
  const alunosFiltrados = alunos.filter((a) => {
    const nome = `${a.firstName} ${a.lastName}`.toLowerCase();
    const matchBusca = nome.includes(busca.toLowerCase());
    const matchStatus = filtroStatus === '' || a.enrollments.some(e => e.status === filtroStatus);
    const matchTurma = filtroTurma === '' || a.enrollments.some(e => e.classroomId === filtroTurma);
    return matchBusca && matchStatus && matchTurma;
  });

  const totalAtivos = alunos.filter(a => a.isActive).length;
  const totalInativos = alunos.filter(a => !a.isActive).length;

  return (
    <PageShell
      title="Matrículas"
      description="Alunos matriculados na unidade"
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
            onClick={() => navigate('/app/secretaria/matriculas/nova')}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 h-auto"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Nova Matrícula
          </Button>
        </div>
      }
    >
      {/* ── Resumo ── */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-semibold text-blue-600 tabular-nums">{alunos.length}</p>
          <p className="text-[11px] text-slate-400 font-normal">Total de alunos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-semibold text-emerald-600 tabular-nums">{totalAtivos}</p>
          <p className="text-[11px] text-slate-400 font-normal">Ativos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-semibold text-slate-500 tabular-nums">{totalInativos}</p>
          <p className="text-[11px] text-slate-400 font-normal">Inativos</p>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <select
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 min-w-[220px]"
            value={alunoSelecionado}
            onChange={(e) => {
              const id = e.target.value;
              setAlunoSelecionado(id);
              if (id) navigate(`/app/secretaria/matriculas/${id}`);
            }}
          >
            <option value="">Selecionar aluno cadastrado...</option>
            {alunos
              .slice()
              .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'pt-BR'))
              .map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
          </select>
          <select
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            value={filtroTurma}
            onChange={(e) => setFiltroTurma(e.target.value)}
          >
            <option value="">Todas as turmas</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="ATIVA">Ativa</option>
            <option value="PAUSADA">Pausada</option>
            <option value="CONCLUIDA">Concluída</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
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
          <span className="text-sm">Carregando alunos...</span>
        </div>
      ) : alunosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum aluno encontrado</p>
          {busca && (
            <button onClick={() => setBusca('')} className="text-xs text-brand-600 mt-1 hover:underline">
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">
              {alunosFiltrados.length} aluno{alunosFiltrados.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {alunosFiltrados.map((aluno) => {
              const enrollment = aluno.enrollments?.[0];
              const turmaNome = enrollment?.classroom?.name
                ?? turmas.find(t => t.id === enrollment?.classroomId)?.name
                ?? 'Sem turma';
              return (
                <div
                  key={aluno.id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <button
                    onClick={() => navigate(`/app/secretaria/matriculas/${aluno.id}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left touch-manipulation"
                  >
                    <ChildAvatar
                      firstName={aluno.firstName}
                      lastName={aluno.lastName}
                      photoUrl={aluno.photoUrl ?? undefined}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {aluno.firstName} {aluno.lastName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{turmaNome}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {enrollment && (
                      <EnrollmentStatusBadge status={enrollment.status} />
                    )}
                    <button
                      onClick={() => navigate(`/app/secretaria/matriculas/${aluno.id}/ficha`)}
                      title="Ver ficha / Imprimir PDF"
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function EnrollmentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ATIVA:     { label: 'Ativa',     cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    PAUSADA:   { label: 'Pausada',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
    CONCLUIDA: { label: 'Concluída', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
    CANCELADA: { label: 'Cancelada', cls: 'bg-red-50 text-red-500 border-red-200' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  );
}
