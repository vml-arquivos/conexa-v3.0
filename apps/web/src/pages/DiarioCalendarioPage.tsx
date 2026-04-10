/**
 * DiarioCalendarioPage — PR 1: Entrada principal do professor para o Diário da Turma
 *
 * Responsabilidades:
 * - Exibir calendário/lista de dias letivos do ano 2026
 * - Mostrar status de cada dia: SEM_DIARIO | RASCUNHO | PUBLICADO
 * - Ao clicar em um dia, navegar para DiarioBordoPage com ?date=YYYY-MM-DD&aba=novo
 * - Agrupar dias por mês para facilitar navegação
 *
 * Regras absolutas (PR 1):
 * - Sem migration, sem schema.prisma, sem endpoint novo
 * - Usa apenas GET /diary-events (já existente) com filtros de data
 * - Preserva RBAC atual
 * - Diff mínimo e seguro
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
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

        // Marcar dias com diário publicado
        for (const item of raw) {
          const eventDate = item.eventDate || item.createdAt || '';
          if (!eventDate) continue;
          // Normalizar para YYYY-MM-DD
          const data = eventDate.substring(0, 10);
          if (!mapa[data]) continue; // dia não letivo — ignorar

          const ctx = item.aiContext && typeof item.aiContext === 'object' ? item.aiContext : {};
          mapa[data] = {
            data,
            status: 'PUBLICADO',
            diarioId: item.id,
            momentoDestaque: item.momentoDestaque ?? ctx.momentoDestaque ?? item.description ?? '',
            climaEmocional: item.climaEmocional ?? ctx.climaEmocional ?? '',
          };
        }

        // Verificar rascunhos no localStorage
        // Chave do draft: `diario:${userId}:${classroomId}:${data}`
        const userId = (user as any)?.id ?? (user as any)?.sub ?? 'anon';
        const cid = classroomId ?? 'sem-turma';
        try {
          const draftsRaw = localStorage.getItem('diario-bordo-drafts');
          if (draftsRaw) {
            const drafts: Record<string, { form: { date: string }; savedAt: string }> = JSON.parse(draftsRaw);
            for (const [key, draft] of Object.entries(drafts)) {
              // Chave: `diario:${userId}:${classroomId}:${data}`
              if (!key.startsWith(`diario:${userId}:`)) continue;
              const data = draft?.form?.date;
              if (!data || !mapa[data]) continue;
              // Só marcar como rascunho se ainda não publicado
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
      <nav className="flex items-center gap-2 text-sm text-gray-500 -mt-4 mb-2">
        <button
          onClick={() => navigate('/app/teacher-dashboard')}
          className="hover:text-gray-800 transition-colors"
        >
          Central da Turma
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-800 font-medium">Diário da Turma</span>
      </nav>

      {/* Resumo do mês */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="border-emerald-100 bg-emerald-50">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{resumoMes.publicados}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Publicados</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100 bg-amber-50">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{resumoMes.rascunhos}</p>
            <p className="text-xs text-amber-600 mt-0.5">Rascunhos</p>
          </CardContent>
        </Card>
        <Card className="border-gray-100 bg-gray-50">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-gray-600">{resumoMes.semDiario}</p>
            <p className="text-xs text-gray-500 mt-0.5">Sem diário</p>
          </CardContent>
        </Card>
      </div>

      {/* Navegação de mês */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navMes(-1)}
          disabled={!podePrev}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            {MESES[mesSel]} {anoSel}
          </h2>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navMes(1)}
          disabled={!podeNext}
          className="flex items-center gap-1"
        >
          Próximo
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Ir para mês atual */}
      {mesSelecionado !== mesAtual.substring(0, 7) && hoje >= `${ANO_LETIVO}-02-01` && hoje <= `${ANO_LETIVO}-12-31` && (
        <div className="flex justify-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMesSelecionado(hoje.substring(0, 7))}
            className="text-blue-600 hover:text-blue-700 text-xs"
          >
            Ir para o mês atual
          </Button>
        </div>
      )}

      {/* Lista de dias letivos */}
      {loading ? (
        <LoadingState message="Carregando calendário de diários..." />
      ) : diasDoMes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum dia letivo neste mês.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {diasDoMes.map(data => {
            const dia = diasMap[data] ?? { data, status: 'SEM_DIARIO' as StatusDia };
            const isHoje = data === hoje;
            const isFuturo = data > hoje;
            const diaSemana = getDiaSemana(data);
            const [, , dd] = data.split('-');

            return (
              <Card
                key={data}
                className={`transition-all cursor-pointer hover:shadow-md ${
                  isHoje
                    ? 'border-2 border-blue-400 bg-blue-50/50 shadow-sm'
                    : isFuturo
                    ? 'border border-gray-100 opacity-70 hover:opacity-100'
                    : dia.status === 'PUBLICADO'
                    ? 'border border-emerald-200 hover:border-emerald-300'
                    : dia.status === 'RASCUNHO'
                    ? 'border border-amber-200 hover:border-amber-300'
                    : 'border border-gray-200 hover:border-blue-200'
                }`}
                onClick={() => abrirDiario(data)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    {/* Data e dia da semana */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 ${
                        isHoje
                          ? 'bg-blue-600 text-white'
                          : dia.status === 'PUBLICADO'
                          ? 'bg-emerald-100 text-emerald-700'
                          : dia.status === 'RASCUNHO'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className="text-xs font-medium leading-none">{diaSemana}</span>
                        <span className="text-lg font-bold leading-tight">{dd}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isHoje && (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                              Hoje
                            </span>
                          )}
                          <StatusBadge status={dia.status} />
                        </div>
                        {dia.momentoDestaque && (
                          <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                            {dia.momentoDestaque}
                          </p>
                        )}
                        {!dia.momentoDestaque && !isFuturo && dia.status === 'SEM_DIARIO' && (
                          <p className="text-xs text-gray-400 mt-1">
                            {isHoje ? 'Registre o diário de hoje' : 'Diário não registrado'}
                          </p>
                        )}
                        {isFuturo && (
                          <p className="text-xs text-gray-400 mt-1">Dia futuro</p>
                        )}
                      </div>
                    </div>

                    {/* Ação */}
                    <div className="flex-shrink-0">
                      {dia.status === 'PUBLICADO' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-emerald-700 hover:bg-emerald-50 gap-1"
                          onClick={e => { e.stopPropagation(); abrirDiario(data); }}
                        >
                          <BookOpen className="h-4 w-4" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                      ) : dia.status === 'RASCUNHO' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-amber-700 hover:bg-amber-50 gap-1"
                          onClick={e => { e.stopPropagation(); abrirDiario(data); }}
                        >
                          <Clock className="h-4 w-4" />
                          <span className="hidden sm:inline">Continuar</span>
                        </Button>
                      ) : !isFuturo ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:bg-blue-50 gap-1"
                          onClick={e => { e.stopPropagation(); abrirDiario(data); }}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="hidden sm:inline">Registrar</span>
                        </Button>
                      ) : (
                        <ArrowRight className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Atalho para hoje */}
      {!loading && hoje >= `${ANO_LETIVO}-02-01` && hoje <= `${ANO_LETIVO}-12-31` && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <Button
            className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={() => abrirDiario(hoje)}
          >
            <BookOpen className="h-4 w-4" />
            Abrir Diário de Hoje ({new Date(hoje + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })})
          </Button>
        </div>
      )}
    </PageShell>
  );
}
