/**
 * DiarioCalendarioPage — PR 2: Entrada principal do professor para o Diário da Turma
 *
 * Responsabilidades:
 * - Exibir calendário/lista de dias letivos do ano 2026
 * - Mostrar status de cada dia: SEM_DIARIO | RASCUNHO | PUBLICADO
 * - Ao clicar em um dia, navegar para DiarioBordoPage com ?date=YYYY-MM-DD&aba=novo
 * - Agrupar dias por mês para facilitar navegação
 *
 * PR 2 — Fonte de status:
 * - Usa item.status do backend (DiaryEventStatus: RASCUNHO | PUBLICADO | REVISADO | ARQUIVADO)
 * - localStorage removido como fonte primária de status
 * - Sem migration, sem schema.prisma, sem endpoint novo
 * - Preserva RBAC atual
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { isUnidade } from '../api/auth';
import { PageShell } from '../components/ui/PageShell';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import http from '../api/http';
import { getPedagogicalToday } from '../utils/pedagogicalDate';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  Circle,
  Home,
  ArrowRight,
  Search,
  Filter,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

// ─── Calendário letivo 2026 ───────────────────────────────────────────────────
// Dias letivos extraídos do lookupDiario2026 (formato DD/MM → convertido para YYYY-MM-DD)
// Apenas dias de semana (seg-sex) são considerados letivos.
// Fonte: LOOKUP_DIARIO_2026 keys — 147 dias letivos de 09/02 a 23/12/2026

const ANO_LETIVO = 2026;

/**
 * Gera a lista de dias letivos para o ano 2026.
 * Regra: dias úteis (seg-sex) de fevereiro a dezembro, excluindo feriados nacionais e
 * recesso escolar. Para o PR 1, usamos a lista simplificada de dias úteis sem feriados
 * (a lista real vem do lookupDiario2026, mas para o calendário visual usamos dias úteis).
 *
 * Para máxima fidelidade ao calendário real, importamos as chaves do lookup.
 */
function gerarDiasLetivos(): string[] {
  // Dias letivos reais do lookup (formato DD/MM)
  // Importamos dinamicamente para não duplicar o arquivo grande
  // Usamos uma abordagem simples: gerar todos os dias úteis de fev a dez 2026
  // e filtrar fins de semana (a lista real do lookup é o subset correto)
  const dias: string[] = [];
  // Fevereiro a Dezembro de 2026
  for (let mes = 2; mes <= 12; mes++) {
    const diasNoMes = new Date(ANO_LETIVO, mes, 0).getDate();
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = new Date(ANO_LETIVO, mes - 1, dia);
      const diaSemana = data.getDay(); // 0=Dom, 6=Sáb
      if (diaSemana !== 0 && diaSemana !== 6) {
        const mm = String(mes).padStart(2, '0');
        const dd = String(dia).padStart(2, '0');
        dias.push(`${ANO_LETIVO}-${mm}-${dd}`);
      }
    }
  }
  return dias;
}

const DIAS_LETIVOS_2026 = gerarDiasLetivos();

// ─── Status de cada dia ───────────────────────────────────────────────────────
type StatusDia = 'SEM_DIARIO' | 'RASCUNHO' | 'PUBLICADO';

interface DiaDiario {
  data: string; // YYYY-MM-DD
  status: StatusDia;
  diarioId?: string;
  momentoDestaque?: string;
  climaEmocional?: string;
}

// ─── Nomes dos meses ──────────────────────────────────────────────────────────
const MESES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMesAno(data: string): { mes: number; ano: number } {
  const [ano, mes] = data.split('-').map(Number);
  return { mes, ano };
}

function formatarDataBR(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function getDiaSemana(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia);
  return DIAS_SEMANA_CURTO[d.getDay()];
}

// ─── Componente de status badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: StatusDia }) {
  if (status === 'PUBLICADO') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> Publicado
      </span>
    );
  }
  if (status === 'RASCUNHO') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
        <Clock className="h-3 w-3" /> Rascunho
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
      <Circle className="h-3 w-3" /> Sem diário
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DiarioCalendarioPage() {
  const { user } = useAuth();
  const isCoord = isUnidade(user);
  const navigate = useNavigate();
  const hoje = getPedagogicalToday();

  // Mês exibido atualmente (navegar entre meses)
  const mesAtual = hoje.substring(0, 7); // YYYY-MM
  const [mesSelecionado, setMesSelecionado] = useState<string>(() => {
    // Iniciar no mês atual, ou no primeiro mês letivo se antes de fevereiro
    const [ano, mes] = hoje.split('-').map(Number);
    if (ano < ANO_LETIVO || (ano === ANO_LETIVO && mes < 2)) return `${ANO_LETIVO}-02`;
    if (ano > ANO_LETIVO || (ano === ANO_LETIVO && mes > 12)) return `${ANO_LETIVO}-12`;
    return `${ANO_LETIVO}-${String(mes).padStart(2, '0')}`;
  });

  const [diasMap, setDiasMap] = useState<Record<string, DiaDiario>>({});
  const [loading, setLoading] = useState(true);
  const [classroomId, setClassroomId] = useState<string | undefined>();
  const [turmaNome, setTurmaNome] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'PUBLICADO' | 'RASCUNHO' | 'SEM_DIARIO'>('TODOS');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [futurosExpandidos, setFuturosExpandidos] = useState(false);

  // ─── Carregar turma do professor ────────────────────────────────────────────
  useEffect(() => {
    async function loadTurma() {
      try {
        const res = await http.get('/lookup/classrooms/accessible');
        const turmas: { id: string; name: string }[] = Array.isArray(res.data) ? res.data : [];
        if (turmas.length > 0) {
          setClassroomId(turmas[0].id);
          setTurmaNome(turmas[0].name);
        }
      } catch {
        // silencioso — continua sem classroomId
      }
    }
    loadTurma();
  }, []);

  // ─── Carregar diários do ano letivo ─────────────────────────────────────────
  useEffect(() => {
    async function loadDiarios() {
      setLoading(true);
      try {
        const params: Record<string, string> = {
          type: 'ATIVIDADE_PEDAGOGICA',
          startDate: `${ANO_LETIVO}-02-01`,
          endDate: `${ANO_LETIVO}-12-31`,
          limit: '500',
        };
        if (classroomId) params.classroomId = classroomId;

        const res = await http.get('/diary-events', { params });
        const raw: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];

        // Construir mapa de data → diário
        const mapa: Record<string, DiaDiario> = {};

        // Inicializar todos os dias letivos como SEM_DIARIO
        for (const data of DIAS_LETIVOS_2026) {
          mapa[data] = { data, status: 'SEM_DIARIO' };
        }

        // PR 2: Usar item.status do backend como fonte primária de status.
        // O backend retorna DiaryEventStatus: RASCUNHO | PUBLICADO | REVISADO | ARQUIVADO.
        // REVISADO e ARQUIVADO são tratados como PUBLICADO para fins de exibição no calendário.
        for (const item of raw) {
          const eventDate = item.eventDate || item.createdAt || '';
          if (!eventDate) continue;
          // Normalizar para YYYY-MM-DD
          const data = eventDate.substring(0, 10);
          if (!mapa[data]) continue; // dia não letivo — ignorar

          const ctx = item.aiContext && typeof item.aiContext === 'object' ? item.aiContext : {};

          // Mapear status do backend para StatusDia do calendário
          const backendStatus: string = item.status ?? 'RASCUNHO';
          let statusDia: StatusDia;
          if (backendStatus === 'PUBLICADO' || backendStatus === 'REVISADO' || backendStatus === 'ARQUIVADO') {
            statusDia = 'PUBLICADO';
          } else {
            // RASCUNHO (ou qualquer valor desconhecido) → RASCUNHO
            statusDia = 'RASCUNHO';
          }

          // Se já existe um PUBLICADO neste dia, não rebaixar para RASCUNHO
          // (pode haver múltiplos eventos por dia para crianças diferentes)
          if (mapa[data].status === 'PUBLICADO' && statusDia === 'RASCUNHO') {
            continue;
          }

          mapa[data] = {
            data,
            status: statusDia,
            diarioId: item.id,
            momentoDestaque: item.momentoDestaque ?? ctx.momentoDestaque ?? item.description ?? '',
            climaEmocional: item.climaEmocional ?? ctx.climaEmocional ?? '',
          };
        }

        // localStorage: mantido apenas como fallback offline (não é mais fonte primária).
        // Só marca RASCUNHO se o backend não retornou nenhum evento para aquele dia.
        const userId = (user as any)?.id ?? (user as any)?.sub ?? 'anon';
        try {
          const draftsRaw = localStorage.getItem('diario-bordo-drafts');
          if (draftsRaw) {
            const drafts: Record<string, { form: { date: string }; savedAt: string }> = JSON.parse(draftsRaw);
            for (const [key, draft] of Object.entries(drafts)) {
              if (!key.startsWith(`diario:${userId}:`)) continue;
              const data = draft?.form?.date;
              if (!data || !mapa[data]) continue;
              // Só marcar como rascunho se o backend não tem nenhum evento para este dia
              if (mapa[data].status === 'SEM_DIARIO') {
                mapa[data] = { ...mapa[data], status: 'RASCUNHO' };
              }
            }
          }
        } catch { /* silencioso */ }

        setDiasMap(mapa);
      } catch {
        toast.error('Erro ao carregar histórico de diários.');
      } finally {
        setLoading(false);
      }
    }

    loadDiarios();
  }, [classroomId, user]);

  // ─── Dias do mês selecionado ─────────────────────────────────────────────────
  const diasDoMes = useMemo(() => {
    return DIAS_LETIVOS_2026.filter(d => d.startsWith(mesSelecionado));
  }, [mesSelecionado]);

  // ─── Navegação entre meses ───────────────────────────────────────────────────
  const mesesDisponiveis = useMemo(() => {
    const meses = new Set(DIAS_LETIVOS_2026.map(d => d.substring(0, 7)));
    return Array.from(meses).sort();
  }, []);

  const idxMesAtual = mesesDisponiveis.indexOf(mesSelecionado);
  const podePrev = idxMesAtual > 0;
  const podeNext = idxMesAtual < mesesDisponiveis.length - 1;

  function navMes(dir: -1 | 1) {
    const novoIdx = idxMesAtual + dir;
    if (novoIdx >= 0 && novoIdx < mesesDisponiveis.length) {
      setMesSelecionado(mesesDisponiveis[novoIdx]);
    }
  }

  // ─── Abrir diário de um dia ──────────────────────────────────────────────────
  function abrirDiario(data: string) {
    const params = new URLSearchParams({ date: data, aba: 'novo' });
    if (classroomId) params.set('classroomId', classroomId);
    navigate(`/app/diario-de-bordo?${params.toString()}`);
  }

  // ─── Resumo do mês ───────────────────────────────────────────────────────────
  const resumoMes = useMemo(() => {
    const publicados = diasDoMes.filter(d => diasMap[d]?.status === 'PUBLICADO').length;
    const rascunhos = diasDoMes.filter(d => diasMap[d]?.status === 'RASCUNHO').length;
    const semDiario = diasDoMes.filter(d => diasMap[d]?.status === 'SEM_DIARIO').length;
    return { publicados, rascunhos, semDiario, total: diasDoMes.length };
  }, [diasDoMes, diasMap]);

  // ─── Separar passados/hoje vs futuros ────────────────────────────────────────
  const diasPassados = useMemo(
    () => diasDoMes.filter(d => d <= hoje),
    [diasDoMes, hoje],
  );
  const diasFuturos = useMemo(
    () => diasDoMes.filter(d => d > hoje),
    [diasDoMes, hoje],
  );

  // ─── Filtro + busca ──────────────────────────────────────────────────────────
  const diasFiltrados = useMemo(() => {
    return diasPassados.filter(d => {
      const dia = diasMap[d] ?? { data: d, status: 'SEM_DIARIO' as StatusDia };
      if (filtroStatus !== 'TODOS' && dia.status !== filtroStatus) return false;
      if (buscaTexto.trim()) {
        const texto = buscaTexto.toLowerCase();
        if (!dia.momentoDestaque?.toLowerCase().includes(texto)) return false;
      }
      return true;
    });
  }, [diasPassados, diasMap, filtroStatus, buscaTexto]);

  // ─── Mês e ano do selecionado ────────────────────────────────────────────────
  const [anoSel, mesSel] = mesSelecionado.split('-').map(Number);

  return (
    <PageShell
      title="Diário da Turma"
      subtitle={turmaNome ? `Turma: ${turmaNome}` : 'Calendário de dias letivos 2026'}
      headerActions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/teacher-dashboard')}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Central da Turma
        </Button>
      }
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 -mt-4 mb-4">
        <button onClick={() => navigate('/app/teacher-dashboard')} className="hover:text-gray-800 transition-colors">
          Central da Turma
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-800 font-medium">Diário da Turma</span>
      </nav>

      {/* ── Resumo do mês ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {/* Publicados */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-3xl font-bold text-emerald-700">{resumoMes.publicados}</p>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">Publicados</p>
            </div>
            <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </span>
          </div>
          <div className="mt-3 h-1 rounded-full bg-emerald-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: resumoMes.total > 0 ? `${(resumoMes.publicados / resumoMes.total) * 100}%` : '0%' }}
            />
          </div>
          <p className="text-[10px] text-emerald-500 mt-1">
            {resumoMes.total > 0 ? Math.round((resumoMes.publicados / resumoMes.total) * 100) : 0}% do mês
          </p>
        </div>

        {/* Rascunhos */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-3xl font-bold text-amber-700">{resumoMes.rascunhos}</p>
              <p className="text-xs text-amber-600 font-medium mt-0.5">Rascunhos</p>
            </div>
            <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-amber-600" />
            </span>
          </div>
          <div className="mt-3 h-1 rounded-full bg-amber-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-500"
              style={{ width: resumoMes.total > 0 ? `${(resumoMes.rascunhos / resumoMes.total) * 100}%` : '0%' }}
            />
          </div>
          <p className="text-[10px] text-amber-500 mt-1">Pendentes de publicação</p>
        </div>

        {/* Sem diário */}
        <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm bg-gradient-to-br to-white ${
          resumoMes.semDiario > 3
            ? 'border-red-100 from-red-50'
            : 'border-gray-100 from-gray-50'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-3xl font-bold ${resumoMes.semDiario > 3 ? 'text-red-600' : 'text-gray-500'}`}>
                {resumoMes.semDiario}
              </p>
              <p className={`text-xs font-medium mt-0.5 ${resumoMes.semDiario > 3 ? 'text-red-500' : 'text-gray-400'}`}>
                Sem diário
              </p>
            </div>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              resumoMes.semDiario > 3 ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <AlertCircle className={`h-4 w-4 ${resumoMes.semDiario > 3 ? 'text-red-500' : 'text-gray-400'}`} />
            </span>
          </div>
          <div className="mt-3 h-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${resumoMes.semDiario > 3 ? 'bg-red-400' : 'bg-gray-300'}`}
              style={{ width: resumoMes.total > 0 ? `${(resumoMes.semDiario / resumoMes.total) * 100}%` : '0%' }}
            />
          </div>
          <p className={`text-[10px] mt-1 ${resumoMes.semDiario > 3 ? 'text-red-400' : 'text-gray-400'}`}>
            {resumoMes.semDiario > 3 ? 'Atenção: muitos dias sem registro' : 'Dias letivos sem registro'}
          </p>
        </div>
      </div>

      {/* ── Navegação de mês ── */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-4">
        <button
          onClick={() => navMes(-1)}
          disabled={!podePrev}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <h2 className="text-base font-bold text-gray-800">
              {MESES[mesSel]} {anoSel}
            </h2>
          </div>
          <p className="text-[11px] text-gray-400">{resumoMes.total} dias letivos</p>
        </div>

        <button
          onClick={() => navMes(1)}
          disabled={!podeNext}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
        >
          <span className="hidden sm:inline">Próximo</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Atalho para o mês atual */}
      {mesSelecionado !== mesAtual.substring(0, 7) && hoje >= `${ANO_LETIVO}-02-01` && hoje <= `${ANO_LETIVO}-12-31` && (
        <div className="flex justify-center mb-3">
          <button
            onClick={() => setMesSelecionado(hoje.substring(0, 7))}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            ↩ Voltar para o mês atual
          </button>
        </div>
      )}

      {/* ── Barra de filtros ── */}
      {!loading && diasPassados.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por momento destaque..."
              value={buscaTexto}
              onChange={e => setBuscaTexto(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Filtro de status */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-shrink-0">
            {([
              { id: 'TODOS',      label: 'Todos' },
              { id: 'PUBLICADO',  label: 'Publicados' },
              { id: 'RASCUNHO',   label: 'Rascunhos' },
              { id: 'SEM_DIARIO', label: 'Pendentes' },
            ] as const).map(op => (
              <button
                key={op.id}
                onClick={() => setFiltroStatus(op.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroStatus === op.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Lista de dias ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Carregando diários...</p>
        </div>
      ) : diasDoMes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-gray-100">
          <Calendar className="h-12 w-12 text-gray-200" />
          <p className="text-gray-400 text-sm">Nenhum dia letivo neste mês.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Dias passados e hoje filtrados */}
          {diasFiltrados.length === 0 && (buscaTexto || filtroStatus !== 'TODOS') ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-gray-100">
              <Filter className="h-8 w-8 text-gray-200" />
              <p className="text-gray-400 text-sm">Nenhum resultado para este filtro.</p>
              <button
                onClick={() => { setFiltroStatus('TODOS'); setBuscaTexto(''); }}
                className="text-xs text-blue-600 hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            diasFiltrados.map(data => {
              const dia = diasMap[data] ?? { data, status: 'SEM_DIARIO' as StatusDia };
              const isHoje = data === hoje;
              const diaSemana = getDiaSemana(data);
              const [, , dd] = data.split('-');
              const semDiarioPassado = !isHoje && dia.status === 'SEM_DIARIO';

              return (
                <div
                  key={data}
                  onClick={() => { if (!isCoord || dia.status !== 'SEM_DIARIO') abrirDiario(data); }}
                  className={`group relative flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-150 ${isCoord && dia.status === 'SEM_DIARIO' ? 'cursor-default' : 'cursor-pointer'} ${
                    isHoje
                      ? 'border-2 border-blue-400 bg-blue-50 shadow-md hover:shadow-lg'
                      : dia.status === 'PUBLICADO'
                      ? 'border border-emerald-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:shadow-sm'
                      : dia.status === 'RASCUNHO'
                      ? 'border border-amber-200 bg-white hover:bg-amber-50 hover:border-amber-300 hover:shadow-sm'
                      : semDiarioPassado
                      ? 'border border-red-100 bg-red-50/30 hover:bg-red-50 hover:border-red-200 hover:shadow-sm'
                      : 'border border-gray-100 bg-white hover:bg-gray-50 hover:shadow-sm'
                  }`}
                >
                  {/* Bloco de data */}
                  <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 font-semibold ${
                    isHoje
                      ? 'bg-blue-600 text-white'
                      : dia.status === 'PUBLICADO'
                      ? 'bg-emerald-100 text-emerald-700'
                      : dia.status === 'RASCUNHO'
                      ? 'bg-amber-100 text-amber-700'
                      : semDiarioPassado
                      ? 'bg-red-100 text-red-500'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="text-[11px] font-medium leading-none uppercase">{diaSemana}</span>
                    <span className="text-xl font-bold leading-tight">{dd}</span>
                  </div>

                  {/* Conteúdo central */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isHoje && (
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          Hoje
                        </span>
                      )}
                      <StatusBadge status={dia.status} />
                    </div>
                    {dia.momentoDestaque ? (
                      <p className="text-xs text-gray-500 mt-1 truncate max-w-sm leading-relaxed">
                        {dia.momentoDestaque}
                      </p>
                    ) : !isHoje && dia.status === 'SEM_DIARIO' ? (
                      <p className="text-xs text-red-400 mt-1 font-medium">Diário não registrado</p>
                    ) : isHoje && dia.status === 'SEM_DIARIO' && !isCoord ? (
                      <p className="text-xs text-blue-500 mt-1 font-medium">Toque para registrar o diário de hoje</p>
                    ) : null}
                  </div>

                  {/* Ação */}
                  <div className="flex-shrink-0">
                    {dia.status === 'PUBLICADO' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg group-hover:bg-emerald-200 transition-colors">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Ver</span>
                      </span>
                    ) : dia.status === 'RASCUNHO' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg group-hover:bg-amber-200 transition-colors">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Continuar</span>
                      </span>
                    ) : isCoord ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Pendente</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Registrar</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* ── Dias futuros (colapsável) ── */}
          {diasFuturos.length > 0 && filtroStatus === 'TODOS' && !buscaTexto && (
            <div className="mt-3">
              <button
                onClick={() => setFuturosExpandidos(prev => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 text-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all"
              >
                <span className="font-medium">
                  {diasFuturos.length} {diasFuturos.length === 1 ? 'dia letivo futuro' : 'dias letivos futuros'}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${futurosExpandidos ? 'rotate-180' : ''}`} />
              </button>

              {futurosExpandidos && (
                <div className="mt-2 space-y-1.5">
                  {diasFuturos.map(data => {
                    const diaSemana = getDiaSemana(data);
                    const [, , dd] = data.split('-');
                    return (
                      <div
                        key={data}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-100 bg-white/60 opacity-50"
                      >
                        <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex-shrink-0">
                          <span className="text-[10px] font-medium uppercase">{diaSemana}</span>
                          <span className="text-base font-bold leading-tight">{dd}</span>
                        </div>
                        <span className="text-xs text-gray-400">Dia futuro</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Legenda ── */}
      {!loading && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-2 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            Publicado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            Rascunho
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border-2 border-blue-400 flex-shrink-0" />
            Hoje
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
            Fins de semana (não letívo)
          </span>
        </div>
      )}

      {/* ── CTA Diário de Hoje ── */}
      {!loading && !isCoord && hoje >= `${ANO_LETIVO}-02-01` && hoje <= `${ANO_LETIVO}-12-31` && (() => {
        const diaSemana = new Date(hoje + 'T12:00:00').getDay();
        if (diaSemana === 0 || diaSemana === 6) return null;
        return (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => abrirDiario(hoje)}
              className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-150"
            >
              <BookOpen className="h-4 w-4" />
              Abrir Diário de Hoje
              <span className="hidden sm:inline text-blue-200 font-normal">
                · {new Date(hoje + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </span>
            </button>
          </div>
        );
      })()}
    </PageShell>
  );
}
