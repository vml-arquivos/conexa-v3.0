This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: apps/web/src/pages/DashboardCoordenacaoPedagogicaPage.tsx, apps/web/src/pages/PlanoDeAulaNovoPage.tsx, apps/web/src/pages/TeacherDashboardPage.tsx, apps/web/src/pages/DiarioCalendarioPage.tsx, apps/web/src/components/layout/AppLayout.tsx
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
apps/web/src/components/layout/AppLayout.tsx
apps/web/src/pages/DashboardCoordenacaoPedagogicaPage.tsx
apps/web/src/pages/DiarioCalendarioPage.tsx
apps/web/src/pages/PlanoDeAulaNovoPage.tsx
apps/web/src/pages/TeacherDashboardPage.tsx
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="apps/web/src/components/layout/AppLayout.tsx">
import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from '../ui/sonner';
import { UnitScopeProvider } from '../../contexts/UnitScopeContext';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  return (
    <UnitScopeProvider>
      <div className="flex min-h-screen bg-background">
        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* Sidebar — fixa no desktop, drawer no mobile */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0 md:z-auto md:flex-shrink-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar onClose={closeSidebar} />
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onMenuToggle={toggleSidebar} />
          <main className="flex-1 overflow-x-hidden">
            <Outlet />
          </main>
          <Toaster position="bottom-right" richColors closeButton />
        </div>
      </div>
    </UnitScopeProvider>
  );
}
</file>

<file path="apps/web/src/pages/PlanoDeAulaNovoPage.tsx">
/**
 * PlanoDeAulaNovoPage — Formulário de criação/edição de planejamento por DATA
 *
 * V2 — Planejamento por data com lote de dias e Matriz automática do banco.
 *
 * Regras:
 * - Turma é preenchida automaticamente via GET /teachers/me/default-classroom
 * - Título é gerado automaticamente (não obrigatório manualmente)
 * - Professor escolhe: data inicial + quantidade de dias (1–31)
 * - Sistema renderiza 1 card por dia com objetivos da Matriz (somente leitura)
 * - Professor preenche: atividade, recursos, observações por dia
 * - Dados salvos em JSON no campo description (sem alterar schema Prisma)
 *
 * Endpoint matriz: GET /curriculum-matrix-entries/by-classroom-day?classroomId=&date=YYYY-MM-DD
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Save,
  Send,
  Clock,
  CheckCircle,
  BookOpen,
  Calendar,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../api/http';
import { submitPlanningForReview, getPlanning } from '../api/plannings';
import { safeJsonParse, safeJsonStringify } from '../lib/safeJson';
import { toPedagogicalISODate } from '../lib/formatDate';
import { extractErrorMessage } from '../lib/utils';
// Fallback local: usado SOMENTE quando o backend retornar objectives vazio
import { MATRIZ_2026, type EntradaMatriz, type SegmentoKey } from '../data/matrizCompleta2026';

// ─── Fallback local ───────────────────────────────────────────────────────────
const CAMPO_MAP: Record<string, string> = {
  'eu-outro-nos':   'O_EU_O_OUTRO_E_O_NOS',
  'corpo-gestos':   'CORPO_GESTOS_E_MOVIMENTOS',
  'tracos-sons':    'TRACOS_SONS_CORES_E_FORMAS',
  'escuta-fala':    'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',
  'espacos-tempos': 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',
};
function inferirSegmento(turma: { name?: string; ageGroupMin?: number | null }): SegmentoKey | null {
  const nome = (turma.name ?? '').toUpperCase();
  if (/BERÇ|BERCARIO|BEBE|BEBÊ/.test(nome)) return 'EI01';
  if (/MATERNAL/.test(nome)) return 'EI02';
  if (/PRÉ|PRE|JARDIM/.test(nome)) return 'EI03';
  const min = turma.ageGroupMin ?? null;
  if (min !== null) {
    if (min <= 6)  return 'EI01';
    if (min <= 42) return 'EI02';
    return 'EI03';
  }
  return null;
}
function entradaParaObjetivo(e: EntradaMatriz): MatrizObjective {
  const campoRaw = e.campo_experiencia_id ?? e.campo_id;
  const campoExperiencia = CAMPO_MAP[campoRaw] ?? campoRaw.toUpperCase().replace(/-/g, '_');
  return {
    campoExperiencia,
    codigoBNCC: e.codigo_bncc ?? null,
    objetivoBNCC: e.objetivo_bncc ?? '',
    objetivoCurriculoDF: e.objetivo_curriculo_movimento ?? e.objetivo_curriculo ?? '',
    intencionalidadePedagogica: e.intencionalidade_pedagogica ?? e.intencionalidade ?? null,
    exemploAtividade: undefined,
  };
}
/**
 * Busca intencionalidade pedagógica no fallback local (MATRIZ_2026) por código BNCC.
 *
 * Regras (Opção A blindada):
 * 1. Só é chamada quando intencionalidadePedagogica da API for null/vazio
 * 2. Match ESTRITO por codigo_bncc (campo canônico)
 * 3. Se houver mais de 1 resultado com o mesmo código, usa o primeiro (não há ambiguidade real)
 * 4. Retorna null se não houver match — nunca inventa conteúdo
 * 5. NÃO é persistida no submit — apenas visual
 */
function resolverIntencionalidadeFallback(
  codigoBNCC: string | null,
  segmento: SegmentoKey | null,
): string | null {
  if (!codigoBNCC || !segmento) return null;
  const entradas = MATRIZ_2026[segmento] ?? [];
  const match = entradas.find(
    (e: EntradaMatriz) => e.codigo_bncc === codigoBNCC,
  );
  if (!match) return null;
  // Prefere intencionalidade_pedagogica (campo estendido), depois intencionalidade (canônico)
  const valor = match.intencionalidade_pedagogica ?? match.intencionalidade ?? null;
  // Rejeita strings vazias ou só whitespace
  return valor && valor.trim().length > 0 ? valor.trim() : null;
}

function buildFallback(dateISO: string, turma: { name?: string; ageGroupMin?: number | null }): { objectives: MatrizObjective[]; message: string } | null {
  const segmento = inferirSegmento(turma);
  if (!segmento) return null;
  const [, m, d] = dateISO.split('-');
  const ddmm = `${d}/${m}`;
  const entradas = (MATRIZ_2026[segmento] ?? []).filter((e: EntradaMatriz) => e.data === ddmm);
  if (entradas.length === 0) return null;
  return {
    objectives: entradas.map(entradaParaObjetivo),
    message: 'Objetivos carregados localmente (fallback) — verifique sincronização do banco.',
  };
}

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Turma {
  id: string;
  name: string;
  code?: string;
  ageGroupMin?: number | null;
  ageGroupMax?: number | null;
}

interface DayTeacherData {
  atividade: string;
  recursos: string;
  observacoes: string;
}

interface DayState {
  date: string; // YYYY-MM-DD
  objectives: MatrizObjective[];
  matrizLoading: boolean;
  matrizMessage?: string;
  teacher: DayTeacherData;
  expanded: boolean;
}

/** Contrato de retorno do endpoint by-classroom-day */
interface MatrizObjective {
  campoExperiencia: string;
  codigoBNCC: string | null;
  objetivoBNCC: string;
  objetivoCurriculoDF: string;
  intencionalidadePedagogica: string | null;
  // FIX P3: retornado para UNIDADE/STAFF_CENTRAL/MANTENEDORA/DEVELOPER
  exemploAtividade?: string | null;
}

interface MatrizByDayResponse {
  segment: string | null;
  date: string;
  classroomId: string;
  objectives: MatrizObjective[];
  message?: string;
}

/** Shape do JSON salvo no campo description (versão 2) */
interface PlanningV2Json {
  version: 2;
  classroomId: string;
  range: { start: string; end: string; days: number };
  days: Array<{
    date: string;
    objectives: MatrizObjective[];
    teacher: DayTeacherData;
  }>;
}

const TEACHER_EMPTY: DayTeacherData = { atividade: '', recursos: '', observacoes: '' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Gera lista de datas sequenciais a partir de startDate (YYYY-MM-DD) por N dias.
 * Usa aritmética local para evitar shift de UTC.
 */
function generateDateRange(startDate: string, numDays: number): string[] {
  const dates: string[] = [];
  const [y, m, d] = startDate.split('-').map(Number);
  for (let i = 0; i < numDays; i++) {
    const dt = new Date(y, m - 1, d + i);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    dates.push(`${yy}-${mm}-${dd}`);
  }
  return dates;
}

/** Formata YYYY-MM-DD para dd/mm/aaaa */
function formatDateBR(date: string): string {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

/** Infere o tipo de planejamento pelo número de dias (apenas valores válidos do enum PlanningType) */
function inferTipo(numDays: number): string {
  if (numDays <= 7) return 'SEMANAL';
  if (numDays <= 31) return 'MENSAL';
  return 'TRIMESTRAL';
}

// ─── Componente de Objetivo da Matriz (somente leitura) ──────────────────────
function ObjetivoCard({
  objetivo,
  index,
  segmento,
}: {
  objetivo: MatrizObjective;
  index: number;
  /** Segmento inferido da turma — usado SOMENTE para fallback visual de intencionalidade */
  segmento?: SegmentoKey | null;
}) {
  // Paleta de cores para o cabeçalho do card (rotaciona por índice)
  const headerPalettes = [
    { header: 'bg-blue-600',    badge: 'bg-blue-100 text-blue-700' },
    { header: 'bg-violet-600',  badge: 'bg-violet-100 text-violet-700' },
    { header: 'bg-teal-600',    badge: 'bg-teal-100 text-teal-700' },
    { header: 'bg-rose-600',    badge: 'bg-rose-100 text-rose-700' },
    { header: 'bg-amber-600',   badge: 'bg-amber-100 text-amber-700' },
    { header: 'bg-cyan-600',    badge: 'bg-cyan-100 text-cyan-700' },
  ];
  const palette = headerPalettes[index % headerPalettes.length];

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Cabeçalho colorido com campo de experiência e código BNCC */}
      <div className={`${palette.header} px-4 py-2.5 flex items-center gap-2 flex-wrap`}>
        <span className="text-xs font-bold uppercase tracking-widest text-white/80">
          Campo de Experiência
        </span>
        <span className="text-sm font-semibold text-white flex-1">
          {objetivo.campoExperiencia.replace(/_/g, ' ')}
        </span>
        {objetivo.codigoBNCC && (
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${palette.badge}`}>
            {objetivo.codigoBNCC}
          </span>
        )}
      </div>

      <div className="bg-white divide-y divide-gray-100">
        {/* ── Campo 1: Objetivo da BNCC ── borda lateral azul */}
        <div className="flex">
          <div className="w-1 flex-shrink-0 bg-blue-500" />
          <div className="px-4 py-3 flex-1">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
              📘 Objetivo da BNCC
            </p>
            {objetivo.objetivoBNCC
              ? <p className="text-sm text-gray-800 leading-relaxed">{objetivo.objetivoBNCC}</p>
              : <p className="text-xs text-gray-400 italic">Não cadastrado</p>
            }
          </div>
        </div>

        {/* ── Campo 2: Objetivo do Currículo em Movimento ── borda lateral verde */}
        <div className="flex">
          <div className="w-1 flex-shrink-0 bg-teal-500" />
          <div className="px-4 py-3 flex-1">
            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1">
              🏛️ Objetivo do Currículo em Movimento — DF
            </p>
            {objetivo.objetivoCurriculoDF
              ? <p className="text-sm text-gray-800 leading-relaxed">{objetivo.objetivoCurriculoDF}</p>
              : <p className="text-xs text-gray-400 italic">Não cadastrado</p>
            }
          </div>
        </div>

        {/* ── Campo 3: Intencionalidade Pedagógica ── borda lateral violeta */}
        {/* FIX P0: quando API retorna null, tenta fallback local por codigoBNCC (apenas visual, não persiste) */}
        <div className="flex bg-violet-50/40">
          <div className="w-1 flex-shrink-0 bg-violet-500" />
          <div className="px-4 py-3 flex-1">
            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-1">
              🎯 Intencionalidade Pedagógica
            </p>
            {(() => {
              const apiVal = objetivo.intencionalidadePedagogica?.trim();
              if (apiVal) {
                return <p className="text-sm text-violet-900 leading-relaxed font-medium">{apiVal}</p>;
              }
              const fbVal = resolverIntencionalidadeFallback(
                objetivo.codigoBNCC ?? null,
                segmento ?? null,
              );
              if (fbVal) {
                return (
                  <>
                    <p className="text-sm text-violet-800 leading-relaxed">{fbVal}</p>
                    <p className="text-[10px] text-violet-400 italic mt-1">💡 Sugestão local — aguardando cadastro pela coordenação</p>
                  </>
                );
              }
              return <p className="text-xs text-violet-400 italic">Aguardando preenchimento pela coordenação</p>;
            })()}
          </div>
        </div>

        {/* ── Campo 4: Exemplo de Atividade ── borda lateral esmeralda (só para coordenação) */}
        {objetivo.exemploAtividade !== undefined && (
          <div className="flex bg-emerald-50/40">
            <div className="w-1 flex-shrink-0 bg-emerald-500" />
            <div className="px-4 py-3 flex-1">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                ✨ Exemplo de Atividade
              </p>
              {objetivo.exemploAtividade
                ? <p className="text-sm text-emerald-900 leading-relaxed">{objetivo.exemploAtividade}</p>
                : <p className="text-xs text-emerald-400 italic">Não cadastrado</p>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PlanoDeAulaNovoPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  // ─── Estado principal ─────────────────────────────────────────────────────
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [classroomId, setClassroomId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [numDays, setNumDays] = useState(1);
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<DayState[]>([]);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [planningId, setPlanningId] = useState<string | null>(id ?? null);
  const [status, setStatus] = useState<string>('RASCUNHO');

  // Datas ocupadas (já existem planejamentos nessas datas)
  const [occupiedDates, setOccupiedDates] = useState<string[]>([]);
  const [checkingDates, setCheckingDates] = useState(false);

  // Cache de matriz: chave = "classroomId|YYYY-MM-DD"
  const matrizCache = useRef<Map<string, MatrizByDayResponse>>(new Map());
  // Rastreia a turma anterior para detectar mudança e limpar objetivos
  const prevClassroomIdRef = useRef<string>('');

  // ─── Turma selecionada ────────────────────────────────────────────────────
  const turmaSelecionada = useMemo(
    () => turmas.find(t => t.id === classroomId) ?? null,
    [turmas, classroomId],
  );

  // ─── Auto-gera título ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!turmaSelecionada || !startDate) return;
    const dates = generateDateRange(startDate, numDays);
    const end = dates[dates.length - 1];
    let t: string;
    if (numDays <= 1) {
      t = `Planejamento ${turmaSelecionada.name} — ${formatDateBR(startDate)}`;
    } else {
      t = `Planejamento ${turmaSelecionada.name} — ${formatDateBR(startDate)} a ${formatDateBR(end)}`;
    }
    setTitle(t);
  }, [turmaSelecionada, startDate, numDays]);

  // ─── Carrega turma padrão e planejamento existente ────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // 1) Busca turma padrão do professor
        const defaultRes = await http.get('/teachers/me/default-classroom').catch(() => null);
        const defaultData = defaultRes?.data;

        // 2) Busca todas as turmas acessíveis
        const turmaRes = await http.get('/lookup/classrooms/accessible');
        const d = turmaRes.data;
        let lista: Turma[] = [];
        if (Array.isArray(d)) lista = d;
        else if (d?.classrooms) lista = d.classrooms;
        else if (d?.classroom) lista = [d.classroom];

        // Complementa com turmas do default se não estiver na lista
        if (defaultData?.classrooms?.length) {
          const ids = new Set(lista.map((t: Turma) => t.id));
          for (const c of defaultData.classrooms) {
            if (!ids.has(c.id)) lista.push(c);
          }
        }
        setTurmas(lista);

        // 3) Auto-seleciona turma padrão
        if (defaultData?.classroomId && !id) {
          setClassroomId(defaultData.classroomId);
        }

        // 4) Se editando, carrega planejamento existente
        if (id) {
          const planning = await getPlanning(id);
          setStatus(planning.status ?? 'RASCUNHO');
          setPlanningId(id);

          // Tenta restaurar formato V2
          const v2 = safeJsonParse<PlanningV2Json>(
            (planning as any).description,
            null as unknown as PlanningV2Json,
          );

          if (v2?.version === 2 && Array.isArray(v2.days)) {
            setClassroomId(v2.classroomId ?? planning.classroomId ?? '');
            setStartDate(v2.range?.start ?? '');
            setNumDays(v2.range?.days ?? 1);
            // Restaura dados do professor por dia.
            // Preserva objectives salvos: o useEffect de matriz só recarrega
            // via API quando objectives está vazio, portanto dados salvos
            // não são sobrescritos.
            const restored: DayState[] = v2.days.map(day => ({
              date: day.date,
              objectives: Array.isArray(day.objectives) && day.objectives.length > 0
                ? day.objectives
                : [],
              matrizLoading: false,
              teacher: day.teacher ?? { ...TEACHER_EMPTY },
              expanded: true,
            }));
            setDays(restored);
          } else {
            // Formato legado (V1)
            const desc = safeJsonParse<{ activities?: string; resources?: string; notes?: string }>(
              (planning as any).description,
              {}
            );
            const pc = (planning as any).pedagogicalContent ?? {};
            setClassroomId(planning.classroomId ?? '');
            setStartDate(planning.startDate ? planning.startDate.slice(0, 10) : '');
            setNumDays(1);
            setDays([{
              date: planning.startDate ? planning.startDate.slice(0, 10) : '',
              objectives: [],
              matrizLoading: false,
              teacher: {
                atividade: desc.activities ?? pc.metodologia ?? '',
                recursos: desc.resources ?? pc.recursos ?? '',
                observacoes: desc.notes ?? pc.avaliacao ?? '',
              },
              expanded: true,
            }]);
          }
        }
      } catch {
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ─── Verifica datas ocupadas via API ────────────────────────────────────
  useEffect(() => {
    if (!classroomId || !startDate || numDays < 1 || isEditing) return;
    const timer = setTimeout(async () => {
      setCheckingDates(true);
      try {
        const res = await http.get('/plannings/check-dates', {
          params: { classroomId, startDate, days: numDays },
        });
        setOccupiedDates(res.data?.occupied ?? []);
      } catch {
        setOccupiedDates([]);
      } finally {
        setCheckingDates(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [classroomId, startDate, numDays, isEditing]);

  // ─── Gera/atualiza lista de dias quando startDate ou numDays mudam ────────
  useEffect(() => {
    if (!startDate || numDays < 1) return;
    const dates = generateDateRange(startDate, numDays);
    setDays(prev => {
      const prevMap = new Map(prev.map(d => [d.date, d]));
      return dates.map(date => {
        const existing = prevMap.get(date);
        return {
          date,
          objectives: existing?.objectives ?? [],
          matrizLoading: existing?.matrizLoading ?? false,
          matrizMessage: existing?.matrizMessage,
          teacher: existing?.teacher ?? { ...TEACHER_EMPTY },
          expanded: existing?.expanded ?? true,
        };
      });
    });
  }, [startDate, numDays]);

  // Dados vêm exclusivamente do backend — sem fallback local

  // ─── Busca matriz para cada dia (com cache) ───────────────────────────────
  // Dados vêm exclusivamente do backend — sem fallback local
  const fetchMatrizForDay = useCallback(async (date: string, cid: string) => {
    if (!cid || !date) return;
    const cacheKey = `${cid}|${date}`;
    if (matrizCache.current.has(cacheKey)) {
      const cached = matrizCache.current.get(cacheKey)!;
      setDays(prev =>
        prev.map(d =>
          d.date === date
            ? { ...d, objectives: cached.objectives, matrizLoading: false, matrizMessage: cached.message }
            : d
        )
      );
      return;
    }
    setDays(prev => prev.map(d => d.date === date ? { ...d, matrizLoading: true } : d));
    try {
      const res = await http.get('/curriculum-matrix-entries/by-classroom-day', {
        params: { classroomId: cid, date },
      });
      const data = res.data as MatrizByDayResponse;
      let objectives = data.objectives ?? [];
      let message = data.message;
      // Fallback local: quando o banco não tem dados para a data
      if (objectives.length === 0 && turmaSelecionada) {
        const fb = buildFallback(date, turmaSelecionada);
        if (fb) { objectives = fb.objectives; message = fb.message; }
      }
      matrizCache.current.set(cacheKey, { ...data, objectives, message });
      setDays(prev =>
        prev.map(d =>
          d.date === date
            ? { ...d, objectives, matrizLoading: false, matrizMessage: message }
            : d
        )
      );
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Erro ao carregar Matriz Pedagógica.');
      setDays(prev =>
        prev.map(d =>
          d.date === date
            ? { ...d, objectives: [], matrizLoading: false, matrizMessage: msg }
            : d
        )
      );
    }
  }, [turmaSelecionada]);

  /** Carrega todos os dias em lote usando by-classroom-date (mais eficiente para numDays > 1) */
  const fetchMatrizLote = useCallback(async (cid: string, start: string, n: number) => {
    if (!cid || !start || n < 1) return;
    setDays(prev => prev.map(d => ({ ...d, matrizLoading: true })));
    try {
      const res = await http.get('/curriculum-matrix-entries/by-classroom-date', {
        params: { classroomId: cid, date: start, days: n },
      });
      const data = res.data as { diasLetivos: Array<{ date: string; objectives: MatrizObjective[]; message?: string }> };
      const byDate = new Map(data.diasLetivos.map(d => [d.date, d]));
      setDays(prev =>
        prev.map(d => {
          const found = byDate.get(d.date);
          let objectives = found?.objectives ?? [];
          let message = found?.message;
          // Fallback local: quando o banco não tem dados para a data
          if (objectives.length === 0 && turmaSelecionada) {
            const fb = buildFallback(d.date, turmaSelecionada);
            if (fb) { objectives = fb.objectives; message = fb.message; }
          }
          return { ...d, objectives, matrizLoading: false, matrizMessage: message };
        })
      );
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Erro ao carregar Matriz.');
      setDays(prev => prev.map(d => ({ ...d, objectives: [], matrizLoading: false, matrizMessage: msg })));
    }
  }, [turmaSelecionada]);

  // Quando classroomId muda, limpa cache e objetivos para forçar recarga
  useEffect(() => {
    if (!classroomId) return;
    if (prevClassroomIdRef.current && prevClassroomIdRef.current !== classroomId) {
      matrizCache.current.clear();
      setDays(prev =>
        prev.map(d => ({ ...d, objectives: [], matrizLoading: false, matrizMessage: undefined }))
      );
    }
    prevClassroomIdRef.current = classroomId;
  }, [classroomId]);

  useEffect(() => {
    if (!classroomId || !startDate) return;
    if (numDays > 1) {
      fetchMatrizLote(classroomId, startDate, numDays);
    } else {
      // Usa setDays com callback para acessar o estado mais recente (evita stale closure)
      setDays(prev => {
        for (const day of prev) {
          if (day.objectives.length === 0 && !day.matrizLoading) {
            fetchMatrizForDay(day.date, classroomId);
          }
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length, classroomId, startDate, numDays]);

  // ─── Atualiza campo do professor por dia ─────────────────────────────────
  function updateTeacherField(date: string, field: keyof DayTeacherData, value: string) {
    setDays(prev =>
      prev.map(d =>
        d.date === date ? { ...d, teacher: { ...d.teacher, [field]: value } } : d
      )
    );
  }

  function toggleDay(date: string) {
    setDays(prev =>
      prev.map(d => d.date === date ? { ...d, expanded: !d.expanded } : d)
    );
  }

  // ─── Build do payload para a API ──────────────────────────────────────────
  function buildPayload() {
    const dates = generateDateRange(startDate, numDays);
    const endDate = dates[dates.length - 1];

    const startISO = toPedagogicalISODate(new Date(startDate + 'T12:00:00'));
    const endISO = toPedagogicalISODate(new Date(endDate + 'T12:00:00'));

    const v2: PlanningV2Json = {
      version: 2,
      classroomId,
      range: { start: startDate, end: endDate, days: numDays },
      days: days.map(d => ({
        date: d.date,
        objectives: d.objectives,
        teacher: d.teacher,
      })),
    };

    return {
      title,
      classroomId,
      startDate: startISO,
      endDate: endISO,
      type: inferTipo(numDays),
      description: safeJsonStringify(v2),
      // objectives: serializa objetivos do primeiro dia para compatibilidade legada
      objectives: days[0]?.objectives?.length
        ? safeJsonStringify(days[0].objectives)
        : null,
    };
  }

  // ─── Salvar rascunho ──────────────────────────────────────────────────────
  async function salvarRascunho() {
    if (!classroomId || !startDate) {
      toast.error('Selecione a turma e a data de início');
      return;
    }
    const hasAnyActivity = days.some(d => d.teacher.atividade.trim());
    if (!hasAnyActivity) {
      toast.error('Preencha a atividade de pelo menos um dia');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (planningId) {
        await http.patch(`/plannings/${planningId}`, payload);
        toast.success('Rascunho atualizado');
      } else {
        const res = await http.post('/plannings', payload);
        const newId = res.data?.id ?? res.data?.planning?.id;
        if (newId) {
          setPlanningId(newId);
          navigate(`/app/planejamento/${newId}/editar`, { replace: true });
        }
        toast.success('Rascunho salvo');
      }
    } catch (err: any) {
      toast.error(extractErrorMessage(err, 'Erro ao salvar'));
    } finally {
      setSaving(false);
    }
  }

  // ─── Enviar para revisão ──────────────────────────────────────────────────
  async function enviarParaRevisao() {
    if (!classroomId || !startDate) {
      toast.error('Selecione a turma e a data de início');
      return;
    }
    const hasAnyActivity = days.some(d => d.teacher.atividade.trim());
    if (!hasAnyActivity) {
      toast.error('Preencha a atividade de pelo menos um dia');
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      let currentId = planningId;
      if (currentId) {
        await http.patch(`/plannings/${currentId}`, payload);
      } else {
        const res = await http.post('/plannings', payload);
        currentId = res.data?.id ?? res.data?.planning?.id;
        if (currentId) setPlanningId(currentId);
      }
      if (!currentId) throw new Error('ID do planejamento não encontrado');
      await submitPlanningForReview(currentId);
      setStatus('EM_REVISAO');
      toast.success('Planejamento enviado para revisão!');
      navigate('/app/planejamentos');
    } catch (err: any) {
      toast.error(extractErrorMessage(err, 'Erro ao enviar para revisão'));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Status badge ─────────────────────────────────────────────────────────
  const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    RASCUNHO: { label: 'Rascunho', icon: <Clock className="h-3 w-3" />, className: 'bg-gray-100 text-gray-700' },
    EM_REVISAO: { label: 'Em Revisão', icon: <Clock className="h-3 w-3" />, className: 'bg-amber-100 text-amber-700' },
    APROVADO: { label: 'Aprovado', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-green-100 text-green-700' },
    DEVOLVIDO: { label: 'Devolvido', icon: <AlertCircle className="h-3 w-3" />, className: 'bg-red-100 text-red-700' },
    PUBLICADO: { label: 'Publicado', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-blue-100 text-blue-700' },
    EM_EXECUCAO: { label: 'Em Execução', icon: <BookOpen className="h-3 w-3" />, className: 'bg-indigo-100 text-indigo-700' },
    CONCLUIDO: { label: 'Concluído', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-teal-100 text-teal-700' },
    CANCELADO: { label: 'Cancelado', icon: <AlertCircle className="h-3 w-3" />, className: 'bg-gray-100 text-gray-500' },
  };
  const statusInfo = statusConfig[status] ?? statusConfig.RASCUNHO;
  // Bloqueado: não pode editar quando em revisão, aprovado, em execução ou concluído
  const bloqueado = ['EM_REVISAO', 'APROVADO', 'EM_EXECUCAO', 'CONCLUIDO', 'PUBLICADO', 'CANCELADO'].includes(status);

  if (loading) {
    return (
      <PageShell title={isEditing ? 'Editar Planejamento' : 'Novo Planejamento'}>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={isEditing ? 'Editar Planejamento' : 'Novo Planejamento'}
      subtitle="Planejamento por data com Matriz Pedagógica 2026 automática"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ─── Cabeçalho com status ─── */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/planejamentos')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>

        {/* Aviso quando bloqueado */}
        {bloqueado && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {status === 'EM_REVISAO' && 'Este planejamento está aguardando aprovação da coordenação. Edição bloqueada.'}
              {status === 'APROVADO' && 'Planejamento aprovado. Para editar, solicite devolução à coordenação.'}
              {status === 'EM_EXECUCAO' && 'Planejamento em execução. Edição bloqueada.'}
              {status === 'CONCLUIDO' && 'Planejamento concluído. Visualização somente leitura.'}
              {status === 'PUBLICADO' && 'Planejamento publicado. Edição bloqueada.'}
              {status === 'CANCELADO' && 'Planejamento cancelado.'}
            </span>
          </div>
        )}

        {/* ─── Identificação ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Identificação do Planejamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Turma */}
            <div>
              <Label>
                Turma <span className="text-red-500">*</span>
              </Label>
              <select
                className="w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                value={classroomId}
                onChange={e => {
                  setClassroomId(e.target.value);
                  // Limpa cache ao trocar turma
                  matrizCache.current.clear();
                  setDays(prev => prev.map(d => ({ ...d, objectives: [], matrizLoading: false })));
                }}
                disabled={bloqueado}
              >
                <option value="">Selecione a turma...</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {turmas.length === 1 && classroomId && (
                <p className="text-xs text-green-600 mt-1">Turma selecionada automaticamente</p>
              )}
            </div>

            {/* Data inicial + Quantidade de dias */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Data Inicial <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  disabled={bloqueado}
                  className={occupiedDates.length > 0 ? 'border-amber-400' : ''}
                />
              </div>
              <div>
                <Label>
                  Quantidade de Dias <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={numDays}
                  onChange={e => {
                    // Permitir campo vazio durante a digitação
                    const raw = e.target.value;
                    if (raw === '' || raw === '0') {
                      setNumDays('' as any);
                      return;
                    }
                    const v = Math.min(31, parseInt(raw, 10));
                    if (!isNaN(v) && v >= 1) setNumDays(v);
                  }}
                  onBlur={e => {
                    // Ao sair do campo, garantir valor válido
                    const v = parseInt(e.target.value, 10);
                    setNumDays(isNaN(v) || v < 1 ? 1 : Math.min(31, v));
                  }}
                  disabled={bloqueado}
                />
                <p className="text-xs text-gray-400 mt-1">Máximo 31 dias</p>
              </div>
            </div>

            {/* Título (auto-gerado, editável como apelido) */}
            <div>
              <Label>Título (gerado automaticamente)</Label>
              <Input
                placeholder="Gerado automaticamente ao selecionar turma e data"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={bloqueado}
              />
              <p className="text-xs text-gray-400 mt-1">
                Você pode personalizar o título se desejar.
              </p>
            </div>

            {/* Aviso de datas ocupadas */}
            {checkingDates && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-gray-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                Verificando disponibilidade das datas...
              </div>
            )}
            {!checkingDates && occupiedDates.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Atenção: datas já possuem planejamento</p>
                  <p className="text-xs mt-0.5">
                    {occupiedDates.map(d => formatDateBR(d)).join(', ')} já têm planejamento cadastrado para esta turma.
                    Salvar irá criar um novo planejamento paralelo.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Cards por dia ─── */}
        {days.length > 0 && classroomId && startDate ? (
          <div className="space-y-4">
            {days.map((day, idx) => (
              <Card key={day.date} className="border-2 border-indigo-100">
                {/* Cabeçalho do dia */}
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => toggleDay(day.date)}
                >
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      Dia {idx + 1} — {formatDateBR(day.date)}
                    </span>
                    <div className="flex items-center gap-2">
                      {day.teacher.atividade.trim() && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                          Preenchido
                        </Badge>
                      )}
                      {day.expanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>

                {day.expanded && (
                  <CardContent className="space-y-4">
                    {/* Objetivos da Matriz (somente leitura) */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <p className="text-sm font-semibold text-gray-700">
                          Objetivos da Matriz Pedagógica 2026
                        </p>
                        <Badge variant="secondary" className="text-xs ml-auto">Automático</Badge>
                      </div>

                      {day.matrizLoading ? (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-gray-500 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                          Carregando Matriz Pedagógica...
                        </div>
                      ) : day.objectives.length > 0 ? (
                        <div className="space-y-2">
                          {day.objectives.map((obj, i) => (
                            <ObjetivoCard
                              key={`${day.date}-${obj.codigoBNCC ?? obj.campoExperiencia}-${i}`}
                              objetivo={obj}
                              index={i}
                              segmento={turmaSelecionada ? inferirSegmento(turmaSelecionada) : null}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <div className="flex items-center gap-2 text-amber-700 text-sm">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium">
                              {day.matrizMessage
                                ? day.matrizMessage
                                : 'Nenhum objetivo da Matriz 2026 cadastrado para esta data.'}
                            </span>
                          </div>
                          <p className="text-xs text-amber-600 pl-6">
                            Você pode continuar preenchendo o planejamento normalmente. Os campos de atividade, recursos e observações estão disponíveis abaixo.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Campos do professor */}
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                        <p className="text-sm font-semibold text-gray-700">
                          Planejamento do Professor
                        </p>
                      </div>
                      <div>
                        <Label>
                          Desenvolvimento da Atividade <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          placeholder="Descreva como você vai desenvolver a atividade em sala..."
                          rows={4}
                          value={day.teacher.atividade}
                          onChange={e => updateTeacherField(day.date, 'atividade', e.target.value)}
                          disabled={bloqueado}
                        />
                      </div>
                      <div>
                        <Label>Recursos e materiais</Label>
                        <Textarea
                          placeholder="Liste os materiais, espaços e recursos necessários..."
                          rows={2}
                          value={day.teacher.recursos}
                          onChange={e => updateTeacherField(day.date, 'recursos', e.target.value)}
                          disabled={bloqueado}
                        />
                      </div>
                      <div>
                        <Label>Observações / Adaptações</Label>
                        <Textarea
                          placeholder="Adaptações para crianças com necessidades específicas..."
                          rows={2}
                          value={day.teacher.observacoes}
                          onChange={e => updateTeacherField(day.date, 'observacoes', e.target.value)}
                          disabled={bloqueado}
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-gray-500 text-sm border">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Selecione a turma e a data de início para ver os cards de planejamento.
            </div>
          )
        )}

        {/* ─── Ações ─── */}
        {!bloqueado && (
          <div className="flex flex-col sm:flex-row gap-3 pb-8">
            <Button
              variant="outline"
              onClick={salvarRascunho}
              disabled={saving || submitting}
              className="flex-1"
            >
              {saving ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Salvar Rascunho</>
              )}
            </Button>
            <Button
              onClick={enviarParaRevisao}
              disabled={saving || submitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {submitting ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Enviar para Revisão</>
              )}
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
</file>

<file path="apps/web/src/pages/DiarioCalendarioPage.tsx">
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
                  onClick={() => abrirDiario(data)}
                  className={`group relative flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-150 ${
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
                    ) : isHoje && dia.status === 'SEM_DIARIO' ? (
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

      {/* ── CTA Diário de Hoje ── */}
      {!loading && hoje >= `${ANO_LETIVO}-02-01` && hoje <= `${ANO_LETIVO}-12-31` && (() => {
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
</file>

<file path="apps/web/src/pages/TeacherDashboardPage.tsx">
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../app/AuthProvider';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PageShell } from '../components/ui/PageShell';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import {
  Users, BookOpen, ShoppingCart,
  Camera, UserCircle, CheckCircle, ClipboardList,
  ChevronRight, Bell, Calendar, X,
  Brain, Sparkles, TrendingUp, Award,
  Plus, Edit3, RefreshCw, FileText,
  Send, Download, Star, Lightbulb, ArrowRight, GraduationCap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import http, { isAuthExpiredError } from '../api/http';
import { createMicrogestureEvent, fetchRegisteredChildrenToday, type MicrogestureKind } from '../services/microgestures';
import { getObjetivosDia, getSegmentosNaData, temObjetivoNaData, CAMPOS_EXPERIENCIA, type SegmentoKey } from '../data/lookupDiario2026';
import { RecadosWidget } from '../components/recados/RecadosWidget';
import { ChildAvatar, hasChildPhoto, resolveChildPhotoUrl } from '../components/children/ChildAvatar';
import { ChildInfoModal } from '../components/children/ChildInfoModal';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface DashboardData {
  hasClassroom: boolean;
  message?: string;
  classroom?: {
    id: string; name: string; code: string; capacity: number;
    segmento?: string; unit: { name: string };
  };
  alunos?: Array<{
    id: string; nome: string; firstName: string; lastName: string;
    idade: number; gender: string; photoUrl?: string;
  }>;
  indicadores?: {
    totalAlunos: number; diariosEstaSemana: number;
    requisicoesStatus?: string; planejamentosEstaSemana: number;
    rdicsRegistrados?: number;
  };
}

interface DashboardPlanningObjective {
  campoExperiencia: string;
  codigoBNCC: string;
  objetivoBNCC: string;
  objetivoCurriculo: string;
  intencionalidade: string;
}

interface DashboardPlanningSummary {
  title: string;
  objectives: DashboardPlanningObjective[];
  atividade: string;
  recursos: string;
}

function toDisplayText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function formatCampoExperienciaLabel(value: unknown): string {
  return toDisplayText(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPlanningFieldDisplay(value: unknown, fallback = 'Não informado'): string {
  const normalized = toDisplayText(value);
  return normalized || fallback;
}

function getPlanningMatrixFields(obj: DashboardPlanningObjective) {
  return [
    {
      label: 'Campo de Experiência',
      value: getPlanningFieldDisplay(obj.campoExperiencia),
      tone: 'border-sky-100 bg-sky-50/80 text-sky-950',
      labelTone: 'text-sky-700',
    },
    {
      label: 'Objetivo BNCC',
      value: getPlanningFieldDisplay(obj.objetivoBNCC),
      tone: 'border-slate-200 bg-white text-slate-900',
      labelTone: 'text-slate-500',
    },
    {
      label: 'Objetivo do Currículo',
      value: getPlanningFieldDisplay(obj.objetivoCurriculo),
      tone: 'border-emerald-100 bg-emerald-50/80 text-emerald-950',
      labelTone: 'text-emerald-700',
    },
    {
      label: 'Intencionalidade Pedagógica',
      value: getPlanningFieldDisplay(obj.intencionalidade),
      tone: 'border-indigo-100 bg-indigo-50 text-indigo-950',
      labelTone: 'text-indigo-700',
    },
  ];
}

function getPlanningCodeDisplay(value: unknown): string {
  return getPlanningFieldDisplay(value, 'Código BNCC não informado');
}

function getPlanningObjectiveKey(obj: DashboardPlanningObjective, index: number): string {
  return `${obj.codigoBNCC || obj.campoExperiencia || 'objetivo'}-${index}`;
}

function normalizeDashboardPlanning(activePlanning: any, fallbackObjectives: any[]): DashboardPlanningSummary {
  const normalizedObjectives = (
    Array.isArray(activePlanning?.objetivosHoje) && activePlanning.objetivosHoje.length > 0
      ? activePlanning.objetivosHoje
      : fallbackObjectives.map((obj: any) => ({
          campoExperiencia: obj.campo_label,
          codigoBNCC: obj.codigo_bncc,
          objetivoBNCC: obj.objetivo_bncc,
          objetivoCurriculoDF: '',
          intencionalidadePedagogica: obj.intencionalidade,
        }))
  )
    .map((obj: any) => ({
      campoExperiencia: formatCampoExperienciaLabel(obj?.campoExperiencia ?? obj?.campo_label),
      codigoBNCC: toDisplayText(obj?.codigoBNCC ?? obj?.codigo_bncc),
      objetivoBNCC: toDisplayText(obj?.objetivoBNCC ?? obj?.objetivo_bncc),
      objetivoCurriculo: toDisplayText(obj?.objetivoCurriculoDF ?? obj?.objetivoCurriculo ?? obj?.objetivo_curriculo),
      intencionalidade: toDisplayText(obj?.intencionalidadePedagogica ?? obj?.intencionalidade),
    }))
    .filter((obj: DashboardPlanningObjective) => (
      obj.campoExperiencia
      || obj.codigoBNCC
      || obj.objetivoBNCC
      || obj.objetivoCurriculo
      || obj.intencionalidade
    ));

  return {
    title: toDisplayText(activePlanning?.title),
    objectives: normalizedObjectives,
    atividade: toDisplayText(activePlanning?.atividade ?? activePlanning?.teacher?.atividade),
    recursos: toDisplayText(activePlanning?.recursos ?? activePlanning?.teacher?.recursos),
  };
}

// ─── Ações Rápidas ────────────────────────────────────────────────────────────
const ACOES_RAPIDAS = [
  { id: 'chamada', label: 'Chamada', desc: 'Marcar presença', icon: <CheckCircle className="h-6 w-6" />, cor: 'bg-green-500', rota: '/app/chamada' },
  { id: 'diario', label: 'Diário da Turma', desc: 'Registrar o dia', icon: <BookOpen className="h-6 w-6" />, cor: 'bg-blue-500', rota: '/app/diario-calendario' },
  { id: 'planejamento', label: 'Planejamentos', desc: 'Planejar semana', icon: <Calendar className="h-6 w-6" />, cor: 'bg-purple-500', rota: '/app/planejamentos' },
  { id: 'sala', label: 'Sala de Aula Virtual', desc: 'Tarefas e desempenho', icon: <GraduationCap className="h-6 w-6" />, cor: 'bg-violet-500', rota: '/app/sala-de-aula-virtual' },
  { id: 'rdic', label: 'RDIC por Criança', desc: 'Desenvolvimento individual', icon: <Brain className="h-6 w-6" />, cor: 'bg-indigo-500', rota: '/app/rdic-crianca' },
  { id: 'materiais', label: 'Materiais', desc: 'Solicitar recursos', icon: <ShoppingCart className="h-6 w-6" />, cor: 'bg-orange-500', rota: '/app/material-requests' },
  { id: 'fotos', label: 'Fotos da Turma', desc: 'Galeria e RDX', icon: <Camera className="h-6 w-6" />, cor: 'bg-pink-500', rota: '/app/rdx' },
  { id: 'relatorio', label: 'Relatórios', desc: 'Ver evolução', icon: <TrendingUp className="h-6 w-6" />, cor: 'bg-teal-500', rota: '/app/reports' },
  { id: 'matriz', label: 'Matriz 2026', desc: 'Objetivos BNCC', icon: <FileText className="h-6 w-6" />, cor: 'bg-gray-600', rota: '/app/planejamentos' },
];

// ─── Componente de Upload de Foto ─────────────────────────────────────────────
function extractUploadedPhotoUrl(payload: any): string | undefined {
  return resolveChildPhotoUrl(payload)
    ?? resolveChildPhotoUrl(payload?.data)
    ?? resolveChildPhotoUrl(payload?.child)
    ?? (typeof payload?.url === 'string' ? payload.url.trim() : undefined)
    ?? (typeof payload?.data?.url === 'string' ? payload.data.url.trim() : undefined);
}

function FotoUpload({ crianca, onUpload }: { crianca: any; onUpload: (id: string, url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 5MB)'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('childId', crianca.id);
      const res = await http.post(`/children/${crianca.id}/photo`, formData);
      const url = extractUploadedPhotoUrl(res.data);
      if (!url) {
        throw new Error('Resposta de upload sem photoUrl');
      }
      onUpload(crianca.id, url);
      toast.success(`Foto de ${crianca.firstName} atualizada!`);
    } catch (error) {
      if (isAuthExpiredError(error)) {
        toast.error('Sua sessão expirou. Faça login novamente para salvar a foto.');
      } else {
        toast.error(`Não foi possível salvar a foto de ${crianca.firstName}. Tente novamente.`);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
        disabled={uploading}
        className="absolute bottom-0 right-0 w-5 h-5 bg-white rounded-full shadow border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-blue-50 z-10"
        title="Adicionar foto">
        {uploading ? <RefreshCw className="h-2.5 w-2.5 text-blue-500 animate-spin" /> : <Camera className="h-2.5 w-2.5 text-gray-500" />}
      </button>
    </>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function TeacherDashboardPage() {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<{ url: string; nome: string } | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'turma' | 'acoes' | 'indicadores' | 'ia' | 'rdic'>('turma');
  // Aba RDIC da Turma
  const [rdicsMap, setRdicsMap] = useState<Record<string, { count: number; ultimoStatus: string; ultimoPeriodo: string }>>({});
  const [loadingRdics, setLoadingRdics] = useState(false);
  const [entradaDiarioIA, setEntradaDiarioIA] = useState('');
  const [analisandoIA, setAnalisandoIA] = useState(false);
  const [relatorioIA, setRelatorioIA] = useState<{ relatorio: string; pontosFortess: string[]; sugestoes: string[] } | null>(null);
  // Indicador de registro por criança (childId -> true se já tem evento hoje)
  const [registradosHoje, setRegistradosHoje] = useState<Set<string>>(new Set());

  // ─── Widget Hoje (API /insights/teacher/today) ─────────────────────────────────
  const [insightsHoje, setInsightsHoje] = useState<any>(null);
  useEffect(() => {
    http.get('/insights/teacher/today')
      .then(r => setInsightsHoje(r.data))
      .catch(() => setInsightsHoje(null));
  }, []);

  // Modal de microgesto rápido
  const [modalCriancaInfo, setModalCriancaInfo] = useState<string | null>(null);
  const [modalCrianca, setModalCrianca] = useState<{ id: string; nome: string } | null>(null);
  const [microgestoRapido, setMicrogestoRapido] = useState<MicrogestureKind>('OBSERVACAO');
  const [microgestoTexto, setMicrogestoTexto] = useState('');
  const [savingMicrogesto, setSavingMicrogesto] = useState(false);

  useEffect(() => { loadDashboard(); }, []);

  // Carregar RDICs da turma quando aba rdic é ativada
  useEffect(() => {
    const lista = data?.alunos ?? [];
    if (abaAtiva === 'rdic' && lista.length > 0 && Object.keys(rdicsMap).length === 0) {
      carregarRdicsDaTurma();
    }
  }, [abaAtiva, data]);

  async function carregarRdicsDaTurma() {
    setLoadingRdics(true);
    try {
      const mapa: Record<string, { count: number; ultimoStatus: string; ultimoPeriodo: string }> = {};
      await Promise.all(
        alunos.map(async (a) => {
          try {
            const res = await http.get('/rdic', { params: { childId: a.id } });
            const lista: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
            mapa[a.id] = {
              count: lista.length,
              ultimoStatus: lista[0]?.status ?? '',
              ultimoPeriodo: lista[0]?.periodo ?? '',
            };
          } catch {
            mapa[a.id] = { count: 0, ultimoStatus: '', ultimoPeriodo: '' };
          }
        }),
      );
      setRdicsMap(mapa);
    } finally {
      setLoadingRdics(false);
    }
  }

  useEffect(() => {
    if (data?.classroom?.id) {
      fetchRegisteredChildrenToday(data.classroom.id).then(setRegistradosHoje);
    }
  }, [data?.classroom?.id]);

  async function registrarMicrogestoRapido() {
    if (!modalCrianca) return;
    if (!data?.classroom?.id) { toast.error('Turma não identificada'); return; }
    setSavingMicrogesto(true);
    try {
      await createMicrogestureEvent({
        childId: modalCrianca.id,
        classroomId: data.classroom.id,
        kind: microgestoRapido,
        payload: { texto: microgestoTexto || undefined },
        eventDate: new Date().toISOString(),
      });
      toast.success(`Registrado com sucesso para ${modalCrianca.nome.split(' ')[0]}!`);
      setRegistradosHoje(prev => new Set([...prev, modalCrianca.id]));
      setModalCrianca(null);
      setMicrogestoTexto('');
      setMicrogestoRapido('OBSERVACAO');
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e?.message || 'Erro ao salvar microgesto');
    } finally {
      setSavingMicrogesto(false);
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      const response = await http.get('/teachers/dashboard');
      setData(response.data);
    } catch {
      toast.error('Não foi possível carregar seu painel.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEvidenciaRapidaUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    const classroomId = insightsHoje?.planejamentoAtivo?.classroomId || data?.classroom?.id;
    if (!classroomId) {
      toast.error('Turma não identificada para registrar evidências.');
      return;
    }

    try {
      const res = await http.get('/diary-events', {
        params: {
          classroomId,
          startDate: new Date().toISOString().split('T')[0],
          limit: 1,
        },
      });

      const events = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      const diarioHoje = events[0];

      if (!diarioHoje?.id) {
        toast.info('Crie o diário do dia antes de adicionar evidências.');
        navigate(`/app/diario-de-bordo?classroomId=${encodeURIComponent(classroomId)}`);
        return;
      }

      let sucesso = 0;
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        try {
          await http.post(`/diary-events/${diarioHoje.id}/media`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          sucesso++;
        } catch {
          // continua tentando os demais arquivos
        }
      }

      if (sucesso > 0) {
        toast.success(`${sucesso} evidência${sucesso > 1 ? 's' : ''} registrada${sucesso > 1 ? 's' : ''} com sucesso!`);
      } else {
        toast.error('Não foi possível registrar as evidências. Tente no diário.');
      }
    } catch {
      toast.error('Erro ao registrar evidência. Tente no diário.');
    }
  }

  function atualizarFoto(childId: string, url: string) {
    setData(prev => prev ? {
      ...prev,
      alunos: prev.alunos?.map(a => a.id === childId ? { ...a, photoUrl: url } : a),
    } : prev);
  }

  if (loading) return <LoadingState message="Carregando seu painel..." />;

  const nomeProf = (user?.nome ?? user?.firstName ?? 'Professor(a)').split(' ')[0];
  const alunos = data?.alunos ?? [];
  const ind = data?.indicadores;
  const turma = data?.classroom;

  // Widget do Objetivo do Dia
  const hoje2 = new Date();
  const ddmmHoje = `${String(hoje2.getDate()).padStart(2,'0')}/${String(hoje2.getMonth()+1).padStart(2,'0')}`;
  const segmentoTurma = (turma?.segmento as SegmentoKey) || 'EI02';
  const objetivosHoje = getObjetivosDia(ddmmHoje, segmentoTurma);
  const segmentosHoje = getSegmentosNaData(ddmmHoje);
  const CAMPO_CORES: Record<string, string> = {
    'eu-outro-nos': 'bg-pink-50 border-pink-200 text-pink-800',
    'corpo-gestos': 'bg-orange-50 border-orange-200 text-orange-800',
    'tracos-sons': 'bg-purple-50 border-purple-200 text-purple-800',
    'escuta-fala': 'bg-blue-50 border-blue-200 text-blue-800',
    'espacos-tempos': 'bg-green-50 border-green-200 text-green-800',
  };
  const totalAlunos = ind?.totalAlunos ?? alunos.length;
  const presentesHoje = insightsHoje?.presenca?.presentes ?? 0;
  const ausentesHoje = insightsHoje?.presenca?.ausentes ?? Math.max(totalAlunos - presentesHoje, 0);
  const diariosSemana = ind?.diariosEstaSemana ?? 0;
  const planejamentosSemana = ind?.planejamentosEstaSemana ?? 0;
  const rdicsRegistrados = ind?.rdicsRegistrados ?? 0;
  const registrosHoje = registradosHoje.size;
  const presencaPct = totalAlunos > 0 ? Math.min(100, Math.round((presentesHoje / totalAlunos) * 100)) : 0;
  const diariosPct = Math.min(100, Math.round((diariosSemana / 5) * 100));
  const planejamentosPct = Math.min(100, Math.round((planejamentosSemana / 5) * 100));
  const registrosHojePct = totalAlunos > 0 ? Math.min(100, Math.round((registrosHoje / totalAlunos) * 100)) : 0;
  const planejamentoResumoHoje = normalizeDashboardPlanning(insightsHoje?.planejamentoAtivo, objetivosHoje);
  const cardsResumoTurma = [
    {
      label: 'Registros do dia',
      value: registrosHoje,
      helper: totalAlunos > 0 ? `${registrosHojePct}% da turma acompanhada hoje` : 'Sem turma vinculada',
      icon: <Sparkles className="h-5 w-5" />,
      accent: 'text-sky-700',
      iconShell: 'bg-sky-600',
      progress: registrosHojePct,
      progressClass: 'bg-sky-500',
    },
    {
      label: 'Planejamentos no período',
      value: planejamentosSemana,
      helper: 'Acompanhamento da semana',
      icon: <Calendar className="h-5 w-5" />,
      accent: 'text-violet-700',
      iconShell: 'bg-violet-600',
      progress: planejamentosPct,
      progressClass: 'bg-violet-500',
    },
  ];
  const destaquesResumoTurma = [
    `${totalAlunos} criança(s) na turma`,
    `${presentesHoje} presente(s) hoje`,
    `${registrosHoje} registro(s) pedagógico(s) no dia`,
  ];
  if (planejamentoResumoHoje.objectives.length > 0) {
    destaquesResumoTurma.push(`${planejamentoResumoHoje.objectives.length} objetivo(s) ativos`);
  };

  return (
    <PageShell
      title={`Olá, ${nomeProf}! 👋`}
      subtitle={turma ? `${turma.name} · ${turma.unit?.name}` : 'Painel do Professor'}
    >
      {/* Sem turma */}
      {!data?.hasClassroom && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="h-10 w-10 text-yellow-500" />
          </div>
          <p className="text-xl font-bold text-gray-700 mb-2">Você ainda não tem turma</p>
          <p className="text-gray-500 text-sm">Aguarde a coordenação vincular você a uma turma.</p>
        </div>
      )}

      {data?.hasClassroom && (
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 text-white shadow-xl shadow-slate-200/70">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                    <Star className="h-3.5 w-3.5 text-amber-300" />
                    Cockpit da turma
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Sua visão rápida da turma de hoje</h2>
                    <p className="mt-1 max-w-2xl text-sm text-slate-200">
                      {turma ? `${turma.name} · ${turma.unit?.name}` : 'Painel da professora'}
                      {turma?.segmento ? ` · segmento ${turma.segmento}` : ''}
                    </p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-100/90">
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-200">
                      Painel simplificado para leitura rápida, com foco em presença, registros do dia e planejamento pedagógico ativo.
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-100/90">
                      {destaquesResumoTurma.map((item) => (
                        <span key={item} className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{item}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="min-w-[240px] rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Resumo do dia</p>
                      <p className="mt-1 text-3xl font-semibold">{presentesHoje}<span className="text-base font-medium text-slate-300">/{totalAlunos || '?'} presentes</span></p>
                    </div>
                    <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-200">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${presencaPct}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-200">
                    <div className="rounded-2xl bg-black/10 p-3">
                      <p className="text-slate-300">Ausências</p>
                      <p className="mt-1 text-lg font-semibold text-white">{ausentesHoje}</p>
                    </div>
                    <div className="rounded-2xl bg-black/10 p-3">
                      <p className="text-slate-300">Registros hoje</p>
                      <p className="mt-1 text-lg font-semibold text-white">{registrosHoje}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {cardsResumoTurma.map((card) => (
                <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
                      <p className={`mt-2 text-3xl font-semibold ${card.accent}`}>{card.value}</p>
                      <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
                    </div>
                    <div className={`rounded-2xl ${card.iconShell} p-3 text-white shadow-sm`}>
                      {card.icon}
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${card.progressClass} transition-all`} style={{ width: `${card.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget: Hoje — dados reais da API com fallback para lookup local */}
          {(insightsHoje || objetivosHoje.length > 0) && (
            <div className="rounded-[28px] border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-5 shadow-sm shadow-amber-100/70">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-white shadow-sm shadow-amber-200">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Resumo pedagógico de hoje</p>
                    <p className="mt-1 text-lg font-semibold text-amber-950">
                      {insightsHoje?.diaSemana ? insightsHoje.diaSemana.charAt(0).toUpperCase() + insightsHoje.diaSemana.slice(1) : ddmmHoje + '/2026'}
                    </p>
                    {insightsHoje?.planejamentoAtivo ? (
                      <p className="mt-1 text-sm text-amber-800">
                        Planejamento ativo: <span className="font-semibold">{insightsHoje.planejamentoAtivo.title}</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-amber-800">Sem planejamento ativo identificado para hoje.</p>
                    )}
                  </div>
                </div>
                <button onClick={() => navigate('/app/planejamentos')}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white/80 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-white">
                  Ver planejamentos <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-3">
                  {insightsHoje?.alertas?.planejamentosPendentes > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 flex items-start gap-2">
                      <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                      <p className="text-xs font-medium text-red-700">
                        {insightsHoje.alertas.planejamentosPendentes} planejamento(s) em rascunho há mais de 2 dias. <button onClick={() => navigate('/app/planejamentos')} className="underline underline-offset-2">Enviar para revisão</button>
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Presença recente</p>
                        <p className="mt-1 text-2xl font-semibold text-emerald-900">{presentesHoje}<span className="text-sm font-medium text-emerald-700">/{totalAlunos || '?'} presentes</span></p>
                      </div>
                      <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${presencaPct}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-emerald-700">{ausentesHoje} ausência(s) registradas no dia.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Leitura rápida da turma</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Diários da semana</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{diariosSemana}/5</p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${diariosPct}%` }} /></div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Cobertura pedagógica</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{registrosHoje}/{totalAlunos || '?'}</p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${registrosHojePct}%` }} /></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="rounded-[24px] border border-amber-200/80 bg-white/90 p-4 shadow-sm shadow-amber-100/60 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Planejamento do dia</p>
                        <h3 className="mt-1 text-base font-semibold leading-tight text-slate-900 break-words">
                          {planejamentoResumoHoje.title || 'Síntese pedagógica organizada para execução em sala'}
                        </h3>
                      </div>
                      <button onClick={() => navigate('/app/planejamentos')}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100">
                        Ver plano <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>

                    {(planejamentoResumoHoje.atividade || planejamentoResumoHoje.recursos || planejamentoResumoHoje.objectives.length > 0) ? (
                      <div className="mt-4 space-y-3">
                        {planejamentoResumoHoje.atividade && (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Desenvolvimento da Atividade</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-amber-950 whitespace-pre-wrap break-words">{planejamentoResumoHoje.atividade}</p>
                          </div>
                        )}
                        {planejamentoResumoHoje.recursos && (
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Recursos e Materiais</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap break-words">{planejamentoResumoHoje.recursos}</p>
                          </div>
                        )}
                        {!planejamentoResumoHoje.atividade && !planejamentoResumoHoje.recursos && planejamentoResumoHoje.objectives.length > 0 && (
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Campos de Experiência</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                              {[...new Set(planejamentoResumoHoje.objectives.map(o => o.campoExperiencia).filter(Boolean))].join(' · ') || 'Não informado'}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 text-center rounded-2xl border border-dashed border-amber-300 bg-white/70 py-8 px-4">
                        <p className="text-sm text-amber-700">Nenhum planejamento ativo para hoje.</p>
                        <button onClick={() => navigate('/app/planejamento/novo')}
                          className="mt-2 text-xs font-semibold text-amber-800 underline underline-offset-2">
                          Criar planejamento →
                        </button>
                      </div>
                    )}

                    {insightsHoje?.planejamentoAtivo?.id && (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={() => navigate(`/app/diario-de-bordo?classroomId=${encodeURIComponent(insightsHoje.planejamentoAtivo.classroomId)}`)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          <ClipboardList className="h-4 w-4" />
                          Registrar Diário do Dia
                        </button>
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.multiple = true;
                            input.onchange = async (e) => {
                              const files = (e.target as HTMLInputElement).files;
                              await handleEvidenciaRapidaUpload(files);
                            };
                            input.click();
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
                          title="Registrar evidência fotográfica do dia"
                        >
                          <Camera className="h-4 w-4" />
                          Evidência
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Abas */}
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
            {[
              { id: 'turma', label: 'Minha Turma', icon: <Users className="h-4 w-4" /> },
              { id: 'rdic', label: 'RDIC', icon: <Brain className="h-4 w-4" /> },
              { id: 'acoes', label: 'Ações Rápidas', icon: <Sparkles className="h-4 w-4" /> },
              { id: 'ia', label: 'IA Pedagógica', icon: <FileText className="h-4 w-4" /> },
              { id: 'indicadores', label: 'Progresso', icon: <TrendingUp className="h-4 w-4" /> },
            ].map(tab => (
              <button key={tab.id} onClick={() => setAbaAtiva(tab.id as any)}
                className={`flex min-w-[132px] shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${abaAtiva === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ─── MINHA TURMA ─── */}
          {abaAtiva === 'turma' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Minhas Crianças</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Acesso rápido às crianças da turma, com leitura objetiva do status do dia e ações essenciais.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{alunos.length} crianças</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{registrosHoje} com registro hoje</span>
                  <button onClick={() => navigate('/app/chamada')}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 font-medium text-white transition hover:bg-blue-700">
                    Fazer chamada <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {alunos.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-400">Nenhuma criança matriculada ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {alunos.map(aluno => {
                    const temFoto = hasChildPhoto(aluno);
                    const generoLabel = aluno.gender === 'MASCULINO' ? 'Menino' : aluno.gender === 'FEMININO' ? 'Menina' : 'Não informado';
                    const registradoHoje = registradosHoje.has(aluno.id);

                    return (
                      <div key={aluno.id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200 p-4 flex flex-col items-center gap-3">

                        {/* Avatar + câmera */}
                        <div className="relative w-14 h-14 flex-shrink-0 cursor-pointer"
                          onClick={() => setModalCriancaInfo(aluno.id)}>
                          {temFoto ? (
                            <img
                              src={resolveChildPhotoUrl(aluno)!}
                              alt={`${aluno.firstName} ${aluno.lastName}`}
                              className="w-14 h-14 rounded-full object-cover ring-2 ring-offset-1 ring-blue-100"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-base ring-2 ring-offset-1 ring-blue-100">
                              {aluno.firstName?.[0]}{aluno.lastName?.[0]}
                            </div>
                          )}
                          <FotoUpload crianca={aluno} onUpload={atualizarFoto} />
                        </div>

                        {/* Nome */}
                        <p className="text-sm font-bold text-gray-800 text-center leading-tight w-full truncate">
                          {aluno.firstName} {aluno.lastName}
                        </p>

                        {/* Subtítulo */}
                        <p className="text-xs text-gray-400 text-center">
                          {aluno.idade} meses · {generoLabel}
                        </p>

                        {/* Badge de registro */}
                        <span className={registradoHoje
                          ? 'text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full'
                          : 'text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full'}>
                          {registradoHoje ? 'Registrado hoje' : 'Sem registro'}
                        </span>

                        {/* Botões de ação */}
                        <div className="flex gap-2 w-full mt-1">
                          <button
                            onClick={() => { setModalCrianca({ id: aluno.id, nome: aluno.nome }); }}
                            title="Registrar microgesto"
                            className="flex-1 text-xs font-medium bg-blue-600 text-white rounded-xl py-2 hover:bg-blue-700 transition">
                            Registrar
                          </button>
                          <button onClick={() => navigate('/app/rdx')} title="Fotos"
                            className="flex-1 text-xs font-medium border border-pink-200 text-pink-600 rounded-xl py-2 hover:bg-pink-50 transition">
                            Fotos
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Recados da Coordenadora (sempre visível na aba turma) */}
          {abaAtiva === 'turma' && (
            <RecadosWidget titulo="Recados da Coordenação" />
          )}

          {/* ─── RDIC DA TURMA ─── */}
          {abaAtiva === 'rdic' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-700">RDIC da Turma — Bimestre Atual</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Cobertura de Registros de Desenvolvimento Individual</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setRdicsMap({}); carregarRdicsDaTurma(); }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    title="Atualizar"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <Button
                    size="sm"
                    onClick={() => navigate('/app/rdic-crianca')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Novo RDIC
                  </Button>
                </div>
              </div>

              {/* Barra de cobertura geral */}
              {alunos.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-800">Cobertura da turma</span>
                    <span className="text-sm font-bold text-indigo-700">
                      {loadingRdics ? '...' : `${Object.values(rdicsMap).filter(r => r.count > 0).length} / ${alunos.length} crianças`}
                    </span>
                  </div>
                  <div className="w-full bg-indigo-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-indigo-600 transition-all duration-500"
                      style={{ width: loadingRdics ? '0%' : `${alunos.length > 0 ? Math.round((Object.values(rdicsMap).filter(r => r.count > 0).length / alunos.length) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-indigo-500 mt-1">
                    {loadingRdics ? 'Carregando...' : `${alunos.length > 0 ? Math.round((Object.values(rdicsMap).filter(r => r.count > 0).length / alunos.length) * 100) : 0}% das crianças com pelo menos 1 RDIC registrado`}
                  </p>
                </div>
              )}

              {/* Lista por criança */}
              {loadingRdics ? (
                <div className="text-center py-8 text-gray-400 text-sm">Carregando RDICs...</div>
              ) : (
                <div className="space-y-2">
                  {alunos.map(aluno => {
                    const info = rdicsMap[aluno.id] ?? { count: 0, ultimoStatus: '', ultimoPeriodo: '' };
                    const temRdic = info.count > 0;
                    const statusColor = info.ultimoStatus === 'PUBLICADO'
                      ? 'bg-green-100 text-green-700'
                      : info.ultimoStatus === 'REVISAO'
                      ? 'bg-yellow-100 text-yellow-700'
                      : info.ultimoStatus === 'RASCUNHO'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500';
                    const statusLabel = info.ultimoStatus === 'PUBLICADO' ? 'Publicado'
                      : info.ultimoStatus === 'REVISAO' ? 'Em Revisão'
                      : info.ultimoStatus === 'RASCUNHO' ? 'Rascunho'
                      : 'Sem RDIC';
                    return (
                      <button
                        key={aluno.id}
                        onClick={() => navigate(`/app/rdic-crianca?childId=${aluno.id}`)}
                        className="w-full flex items-center gap-3 p-3 bg-white border-2 border-gray-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all text-left"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                          temRdic ? 'bg-indigo-500' : 'bg-gray-300'
                        }`}>
                          <ChildAvatar
                            child={aluno}
                            alt={aluno.firstName}
                            sizeClassName="w-10 h-10"
                            imageClassName="rounded-full object-cover"
                            fallbackClassName={`w-10 h-10 rounded-full flex items-center justify-center ${temRdic ? 'bg-indigo-500 text-white' : 'bg-gray-300 text-white'}`}
                            initialsClassName="text-sm font-bold"
                            showInitials
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{aluno.firstName} {aluno.lastName}</p>
                          <p className="text-xs text-gray-400">{info.ultimoPeriodo || 'Nenhum período registrado'}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
                          {temRdic && (
                            <span className="text-xs text-gray-400">{info.count} reg.</span>
                          )}
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── AÇÕES RÁPIDAS ─── */}
          {abaAtiva === 'acoes' && (
            <div>
              <h2 className="text-base font-bold text-gray-700 mb-4">O que você quer fazer?</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ACOES_RAPIDAS.map(acao => (
                  <button key={acao.id} onClick={() => navigate(acao.rota)}
                    className="p-4 bg-white border-2 border-gray-100 rounded-2xl text-left hover:border-blue-200 hover:shadow-md transition-all active:scale-95">
                    <div className={`w-12 h-12 ${acao.cor} rounded-2xl flex items-center justify-center text-white mb-3`}>
                      {acao.icon}
                    </div>
                    <p className="font-bold text-gray-800 text-sm">{acao.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{acao.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── IA PEDAGÓGICA ─── */}
          {abaAtiva === 'ia' && (
            <div className="space-y-5">
              <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Análise Pedagógica com IA</p>
                    <p className="text-xs text-gray-500">Descreva o dia e a IA gera RDIC automaticamente</p>
                  </div>
                </div>
                <textarea
                  className="w-full border-2 border-purple-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-purple-400 bg-white"
                  rows={5}
                  placeholder="Descreva como foi o dia da turma: atividades realizadas, comportamentos observados, interações entre crianças, aprendizagens percebidas, situações relevantes...\n\nQuanto mais detalhado, mais precisa será a análise da IA e os relatórios gerados."
                  value={entradaDiarioIA}
                  onChange={e => setEntradaDiarioIA(e.target.value)}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">{entradaDiarioIA.length} caracteres</p>
                  <Button
                    onClick={async () => {
                      if (!entradaDiarioIA.trim()) { toast.error('Descreva o dia antes de analisar'); return; }
                      setAnalisandoIA(true); setRelatorioIA(null);
                      try {
                        const res = await http.post('/ia/relatorio-aluno', {
                          nomeAluno: `Turma — ${turma?.name || 'Minha Turma'}`,
                          faixaEtaria: turma?.segmento || 'EI02',
                          observacoes: [entradaDiarioIA],
                          periodo: 'Diário',
                        });
                        setRelatorioIA(res.data);
                      } catch {
                        setRelatorioIA({
                          relatorio: `A turma demonstrou excelente engajamento nas atividades do dia. Com base nas observações registradas, é possível identificar avanços significativos no desenvolvimento das crianças, especialmente nas dimensões socioemocionais e cognitivas. As interações observadas indicam um ambiente de aprendizagem positivo e estimulante.`,
                          pontosFortess: ['Engajamento e participação ativa nas atividades', 'Interações sociais positivas entre as crianças', 'Demonstração de curiosidade e interesse em aprender'],
                          sugestoes: ['Ampliar atividades de exploração sensorial', 'Oferecer mais momentos de brincadeira livre e simbólica', 'Registrar microgestos pedagógicos para enriquecer o RDIC'],
                        });
                      } finally { setAnalisandoIA(false); }
                    }}
                    disabled={analisandoIA || !entradaDiarioIA.trim()}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {analisandoIA ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Analisando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Analisar com IA</>}
                  </Button>
                </div>
              </div>

              {relatorioIA && (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-bold text-blue-800">Relatório de Desenvolvimento</p>
                      <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> IA
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{relatorioIA.relatorio}</p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-bold text-green-800">Pontos Fortes Observados</p>
                    </div>
                    {relatorioIA.pontosFortess?.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-700">{p}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-orange-600" />
                      <p className="text-sm font-bold text-orange-800">Sugestões Pedagógicas</p>
                    </div>
                    {relatorioIA.sugestoes?.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <ArrowRight className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-orange-700">{s}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 text-sm" onClick={() => { navigate('/app/rdic-crianca'); toast.success('Acesse RDIC para salvar este relatório'); }}>
                      <Download className="h-4 w-4 mr-2" /> Salvar como RDIC
                    </Button>
                    <Button variant="outline" className="flex-1 text-sm" onClick={() => { navigate('/app/rdic-crianca'); toast.success('Acesse RDIC para salvar o registro'); }}>
                      <Send className="h-4 w-4 mr-2" /> Salvar como RIA
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── MEU PROGRESSO ─── */}
          {abaAtiva === 'indicadores' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-700">Meu Progresso Pedagógico</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-blue-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Diário de Bordo</p>
                        <p className="text-xs text-gray-500">Esta semana</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-blue-600">{ind?.diariosEstaSemana ?? 0}</span>
                      <span className="text-sm text-gray-400 mb-1">/ 5 dias</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, ((ind?.diariosEstaSemana ?? 0) / 5) * 100)}%` }} />
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full text-blue-600 border-blue-200" onClick={() => navigate('/app/diario-calendario')}>
                      <Plus className="h-3 w-3 mr-1" /> Abrir Diário
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Planejamentos</p>
                        <p className="text-xs text-gray-500">Esta semana</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-purple-600">{ind?.planejamentosEstaSemana ?? 0}</span>
                      <span className="text-sm text-gray-400 mb-1">registrados</span>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full text-purple-600 border-purple-200" onClick={() => navigate('/app/planejamentos')}>
                      <Plus className="h-3 w-3 mr-1" /> Criar Planejamento
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-indigo-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Brain className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">RDIC</p>
                        <p className="text-xs text-gray-500">Registros de desenvolvimento</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-indigo-600">{ind?.rdicsRegistrados ?? 0}</span>
                      <span className="text-sm text-gray-400 mb-1">registros</span>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full text-indigo-600 border-indigo-200" onClick={() => navigate('/app/rdic-crianca')}>
                      <Plus className="h-3 w-3 mr-1" /> Novo Registro
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Award className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{turma?.name}</p>
                        <p className="text-xs text-gray-500">{turma?.unit?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-green-600">{alunos.length}</span>
                      <span className="text-sm text-gray-400 mb-1">/ {turma?.capacity ?? '?'} vagas</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${turma?.capacity ? Math.min(100, (alunos.length / turma.capacity) * 100) : 0}%` }} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Dica pedagógica */}
              <Card className="border-2 border-yellow-100 bg-gradient-to-r from-yellow-50 to-orange-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-800 mb-1">Dica Pedagógica</p>
                      <p className="text-sm text-yellow-700">
                        "O microgesto mais poderoso é a <strong>escuta ativa</strong>: quando você para, olha nos olhos da criança e genuinamente se interessa pelo que ela está comunicando, você valida sua existência e amplia seu desenvolvimento."
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {modalCriancaInfo && (
        <ChildInfoModal
          childId={modalCriancaInfo}
          onClose={() => setModalCriancaInfo(null)}
        />
      )}

      {/* Modal de microgesto rápido */}
      {modalCrianca && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setModalCrianca(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800">Registrar para {modalCrianca.nome.split(' ')[0]}</p>
              <button onClick={() => setModalCrianca(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([
                { kind: 'SONO_OK',            label: 'Dormiu bem',   emoji: '😴' },
                { kind: 'SONO_RUIM',          label: 'Sono agitado', emoji: '😫' },
                { kind: 'ALIMENTACAO_BEM',    label: 'Comeu bem',    emoji: '🍽️' },
                { kind: 'ALIMENTACAO_RECUSOU',label: 'Recusou',      emoji: '🙅' },
                { kind: 'HUMOR_CALMO',        label: 'Calmo',        emoji: '😊' },
                { kind: 'HUMOR_CHOROSO',      label: 'Choroso',      emoji: '😢' },
                { kind: 'HUMOR_IRRITADO',     label: 'Irritado',     emoji: '😠' },
                { kind: 'HIGIENE_TROCA',      label: 'Troca',        emoji: '🧤' },
                { kind: 'OBSERVACAO',         label: 'Observação',   emoji: '👁️' },
              ] as Array<{ kind: MicrogestureKind; label: string; emoji: string }>).map(opt => (
                <button
                  key={opt.kind}
                  onClick={() => setMicrogestoRapido(opt.kind)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    microgestoRapido === opt.kind
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className="text-xs text-center leading-tight text-gray-700">{opt.label}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Observação (opcional)</label>
              <input
                type="text"
                placeholder="Detalhe adicional..."
                value={microgestoTexto}
                onChange={e => setMicrogestoTexto(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            <Button
              onClick={registrarMicrogestoRapido}
              disabled={savingMicrogesto}
              className="w-full"
            >
              {savingMicrogesto
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                : <><CheckCircle className="h-4 w-4 mr-2" /> Registrar</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* Modal de foto ampliada */}
      {fotoAmpliada && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setFotoAmpliada(null)}>
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setFotoAmpliada(null)} className="absolute -top-4 -right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 z-10 shadow-lg">
              <X className="h-4 w-4" />
            </button>
            <img src={fotoAmpliada.url} alt={fotoAmpliada.nome} className="w-full rounded-2xl shadow-2xl" />
            <p className="text-white text-center mt-3 font-semibold">{fotoAmpliada.nome}</p>
          </div>
        </div>
      )}
    </PageShell>
  );
}
</file>

<file path="apps/web/src/pages/DashboardCoordenacaoPedagogicaPage.tsx">
import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { useApiCache } from '../hooks/useApiCache';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Users, BookOpen, ClipboardList, ShoppingCart,
  CheckCircle, AlertCircle, ChevronRight,
  Eye, ThumbsUp, MessageSquare, TrendingUp,
  Bell, Star, Brain, GraduationCap, Plus, RefreshCw, BarChart2, FileText, ArrowRight,
} from 'lucide-react';
import { RecadosWidget } from '../components/recados/RecadosWidget';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { isCentral as checkIsCentral, isUnidade as checkIsUnidade } from '../api/auth';
import { useUnitScope } from '../contexts/UnitScopeContext';
import { getPedagogicalToday } from '@/utils/pedagogicalDate';
import { OcorrenciasPanel } from '../components/dashboard/OcorrenciasPanel';
import { TriangleAlert } from 'lucide-react';

const URGENCIA_CONFIG: Record<string, { label: string; cor: string; dot: string }> = {
  ALTA: { label: 'Urgente', cor: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' },
  MEDIA: { label: 'Normal', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' },
  BAIXA: { label: 'Sem pressa', cor: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500' },
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface Planejamento {
  id: string;
  title: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
  professorNome: string;
  turmaNome: string;
  templateNome?: string;
  objectives?: string;
  reviewComment?: string;
  createdByUser?: { id: string; firstName: string; lastName: string; email: string };
  classroom?: { id: string; name: string };
  template?: { id: string; name: string; type: string };
}
interface Diario {
  id: string;
  professorNome: string;
  turmaNome: string;
  data: string;
  titulo: string;
  status?: string;
  climaEmocional?: string;
  presencas?: number;
  ausencias?: number;
  momentoDestaque?: string;
  statusExecucaoPlano?: string;
  camposBNCC?: string[];
}
interface TurmaResumo {
  id: string; nome: string; totalAlunos: number; professor: string | null; chamadaFeita: boolean;
}
interface DashboardData {
  turmas: number; professores: number; alunosTotal: number;
  requisicoesParaAnalisar: number; planejamentosParaRevisar: number;
  diariosEstaSemana: number; taxaPresencaMedia: number; alertas: string[];
  turmasLista: TurmaResumo[];
}

// ─── Sub-componente: aba Pedagógico com sub-navegação ────────────────────────
interface PedagogicoSubNavProps {
  diarios: any[];
  turmasLista: any[];
  cobertura: any;
  loadingCobertura: boolean;
  carregarCobertura: () => void;
  setCobertura: (v: any) => void;
  setPendencias: (v: any) => void;
  navigate: (path: string) => void;
}

function PedagogicoSubNav({
  diarios, turmasLista, cobertura, loadingCobertura,
  carregarCobertura, setCobertura, setPendencias, navigate,
}: PedagogicoSubNavProps) {
  const [subAba, setSubAba] = React.useState<'diarios' | 'turmas' | 'cobertura'>('diarios');

  return (
    <div className="space-y-4">
      {/* Sub-navegação */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { id: 'diarios',   label: 'Diários' },
          { id: 'turmas',    label: 'Turmas e Registros' },
          { id: 'cobertura', label: 'Cobertura' },
        ].map(s => (
          <button key={s.id} onClick={() => setSubAba(s.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              subAba === s.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Sub-aba: Diários */}
      {subAba === 'diarios' && (
        <div className="space-y-3">
          {diarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-gray-100 gap-2">
              <p className="text-sm text-gray-400">Nenhum diário registrado neste período.</p>
            </div>
          ) : (
            diarios.map((diario: any) => {
              const legacyTurma = diario['turmaNome'];
              const legacyProfessor = diario['professorNome'];
              const legacyData = diario['data'];
              const turma = diario.classroom?.name || legacyTurma || '—';
              const professor = diario.createdByUser
                ? `${diario.createdByUser.firstName ?? ''} ${diario.createdByUser.lastName ?? ''}`.trim()
                : legacyProfessor || '—';
              const dataRaw = diario.eventDate || legacyData || diario.createdAt || '';
              const dataFmt = dataRaw
                ? new Date(dataRaw.includes('T') ? dataRaw : `${dataRaw}T12:00:00`).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                  })
                : '—';
              const ctx = diario.aiContext && typeof diario.aiContext === 'object' ? diario.aiContext as any : {};
              const statusPubl = ['PUBLICADO','REVISADO','ARQUIVADO'].includes((diario.status || '').toUpperCase());
              const execLabel = ctx.statusExecucaoPlano === 'CUMPRIDO' ? '✅ Cumprido'
                : ctx.statusExecucaoPlano === 'PARCIAL' ? '⚠️ Parcial'
                : ctx.statusExecucaoPlano === 'NAO_REALIZADO' ? '❌ Não realizado' : null;
              const climaLabel = ctx.climaEmocional === 'OTIMO' ? '🌟 Ótimo'
                : ctx.climaEmocional === 'BOM' ? '😊 Bom'
                : ctx.climaEmocional === 'REGULAR' ? '😐 Regular'
                : ctx.climaEmocional === 'AGITADO' ? '😬 Agitado'
                : ctx.climaEmocional === 'DIFICIL' ? '😔 Difícil' : null;
              return (
                <div key={diario.id} className={`rounded-2xl border p-4 bg-white ${statusPubl ? 'border-emerald-100' : 'border-amber-100'}}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${statusPubl ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}}`}>
                          {statusPubl ? 'Publicado' : 'Rascunho'}
                        </span>
                        {execLabel && <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700">{execLabel}</span>}
                        {climaLabel && <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-sky-50 text-sky-700 border border-sky-200">{climaLabel}</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {turma}
                        {professor !== '—' && (
                          <span className="text-xs font-normal text-gray-400 ml-2">
                            · {professor}
                          </span>
                        )}
                      </p>
                      {ctx.presencas != null && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          👥 {ctx.presencas} presentes · {ctx.ausencias ?? 0} ausentes
                        </p>
                      )}
                      {ctx.momentoDestaque && (
                        <p className="text-xs text-gray-500 mt-1.5 italic truncate max-w-md">"{ctx.momentoDestaque}"</p>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-400 flex-shrink-0">
                      {dataFmt}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sub-aba: Turmas */}
      {subAba === 'turmas' && (
        <div className="grid grid-cols-1 gap-3">
          {turmasLista.map((turma: any) => (
            <div key={turma.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{turma.nome}</p>
                  <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor || 'Sem professor'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${turma.chamadaFeita ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {turma.chamadaFeita ? '✅ Chamada' : '⏳ Pendente'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Observações', path: `/app/coordenacao/observacoes?classroomId=${turma.id}`, color: 'purple' },
                  { label: 'Diários', path: `/app/diario-calendario?classroomId=${turma.id}`, color: 'blue' },
                  { label: 'Atividades', path: `/app/sala-de-aula-virtual?classroomId=${turma.id}`, color: 'indigo' },
                  { label: 'RDIC', path: `/app/rdic?classroomId=${turma.id}`, color: 'teal' },
                ].map(item => (
                  <button key={item.label} onClick={() => navigate(item.path)}
                    className={`flex flex-col items-center gap-1 p-2.5 bg-${item.color}-50 rounded-xl hover:bg-${item.color}-100 transition-all`}>
                    <span className={`text-[11px] font-medium text-${item.color}-700`}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-aba: Cobertura */}
      {subAba === 'cobertura' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Cobertura de Registros — Hoje</p>
            <button
              onClick={() => { setCobertura(null); setPendencias(null); carregarCobertura(); }}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Atualizar
            </button>
          </div>
          {loadingCobertura ? (
            <div className="flex items-center justify-center py-10 gap-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Carregando...</p>
            </div>
          ) : !cobertura ? (
            <button onClick={carregarCobertura}
              className="w-full py-8 rounded-2xl border-2 border-dashed border-blue-200 text-sm text-blue-600 hover:bg-blue-50 transition-all">
              Carregar dados de cobertura
            </button>
          ) : (
            <div className="space-y-2">
              {(cobertura.classrooms ?? []).map((cls: any) => (
                <div key={cls.classroomId} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-800">{cls.classroomName}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(cls.coveragePct ?? 0) >= 80 ? 'bg-emerald-100 text-emerald-700' : (cls.coveragePct ?? 0) >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                      {cls.coveragePct ?? 0}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${(cls.coveragePct ?? 0) >= 80 ? 'bg-emerald-500' : (cls.coveragePct ?? 0) >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.max(cls.coveragePct ?? 0, 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardCoordenacaoPedagogicaPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [planejamentos, setPlanejamentos] = useState<Planejamento[]>([]);
  const [diarios, setDiarios] = useState<any[]>([]);
  const [metricasExecucao, setMetricasExecucao] = useState<Record<string, {
    total: number; publicados: number; comMatriz: number; comPlano: number;
  }>>({});
  // Aba Cobertura
  interface CoberturaData {
    unitId: string; startDate: string; endDate: string;
    totalCriancas: number; totalComRegistro: number; percentualGeral: number;
    turmas: Array<{ classroomId: string; classroomName: string; totalCriancas: number; criancasComRegistro: number; percentual: number }>;
  }
  interface PendenciasData {
    totalPendentes: number;
    pendentes: Array<{ childId: string; nome: string; classroomId: string; classroomName: string }>;
  }
  const [cobertura, setCobertura] = useState<CoberturaData | null>(null);
  const [alertasReais, setAlertasReais] = useState<{
    total: number;
    criticos: any[];
    atencao: any[];
    info: any[];
  } | null>(null);
  const [resumoDiarios, setResumoDiarios] = useState<any | null>(null);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [pendencias, setPendencias] = useState<PendenciasData | null>(null);
  const [loadingCobertura, setLoadingCobertura] = useState(false);
  const apiCache = useApiCache(60_000);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaAtiva = (searchParams.get('aba') as any) ?? 'inicio';
  function setAbaAtiva(novaAba: string) {
    const novosParams = new URLSearchParams(searchParams.toString());
    novosParams.set('aba', novaAba);
    setSearchParams(novosParams, { replace: false });
  }
  // FIX P1: usar selectedUnitId do contexto global como fallback para unitIdParam
  // Isso resolve o erro 403 quando STAFF_CENTRAL acessa sem unitId no token
  const { selectedUnitId: ctxUnitId } = useUnitScope();
  const unitIdParam = searchParams.get('unitId') ?? ctxUnitId ?? undefined;
  const { user } = useAuth();
  // Coordenação Geral (STAFF_CENTRAL) = somente leitura/análise. Apenas UNIDADE pode aprovar.
  const isCentralUser = checkIsCentral(user);
  const isUnidadeUser = checkIsUnidade(user);
  const canApprove = isUnidadeUser && !isCentralUser;
  const [processando, setProcessando] = useState<string|null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [itemParaRejeitar, setItemParaRejeitar] = useState<{id:string;tipo:'req'|'plan'}|null>(null);
  const [filtroPlanStatus, setFiltroPlanStatus] = useState<string>('TODOS');
  const [planExpandido, setPlanExpandido] = useState<string|null>(null);
  const [turmaExpandida, setTurmaExpandida] = useState<string | null>(null);
  const [erroPainel, setErroPainel] = useState<string | null>(null);
  // FIX P4-3: filtros operacionais para a aba de diários da coordenação
  const [filtroDiarioTurma, setFiltroDiarioTurma] = useState<string>('');
  const [filtroDiarioStatus, setFiltroDiarioStatus] = useState<string>('TODOS');
  const [filtroDiarioDataInicio, setFiltroDiarioDataInicio] = useState<string>('');
  const [filtroDiarioDataFim, setFiltroDiarioDataFim] = useState<string>('');
  const [filtroDiarioProfessor, setFiltroDiarioProfessor] = useState<string>('');
  const ITENS_POR_PAGINA = 10;
  const [paginaDiarios, setPaginaDiarios] = useState(1);

  async function carregarDiarios() {
    try {
      const params: Record<string, string> = unitIdParam ? { unitId: unitIdParam } : {};
      if (filtroDiarioDataInicio) params.startDate = `${filtroDiarioDataInicio}T00:00:00.000Z`;
      if (filtroDiarioDataFim) params.endDate = `${filtroDiarioDataFim}T23:59:59.999Z`;
      const res = await http.get('/coordenacao/diarios', { params });
      const payload = res.data;
      const listaDiarios = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.diarios) ? payload.diarios : []);
      setDiarios(listaDiarios);
      if (payload?.metricas) setMetricasExecucao(payload.metricas);
    } catch {
      setDiarios([]);
      setMetricasExecucao({});
    }
  }

  // FIX P1: recarregar quando unitIdParam mudar (troca de unidade pelo seletor)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadDashboardCb = useCallback(loadDashboard, [unitIdParam]);
  useEffect(() => { loadDashboardCb(); }, [loadDashboardCb]);

  useEffect(() => {
    carregarDiarios();
  }, [unitIdParam, filtroDiarioDataInicio, filtroDiarioDataFim]);

  useEffect(() => {
    setPaginaDiarios(1);
    if (abaAtiva === 'cobertura' && !cobertura) {
      carregarCobertura();
    }
  }, [abaAtiva]);

  async function carregarCobertura() {
    setLoadingCobertura(true);
    try {
      const hoje = getPedagogicalToday();
      const [covData, pendData] = await Promise.all([
        apiCache.get('/reports/unit/coverage', { startDate: hoje, endDate: hoje }, () =>
          http.get('/reports/unit/coverage', { params: { startDate: hoje, endDate: hoje } }).then(r => r.data)
        ),
        apiCache.get('/reports/unit/pendings', { daysWithout: 1 }, () =>
          http.get('/reports/unit/pendings', { params: { daysWithout: 1 } }).then(r => r.data)
        ),
      ]);
      setCobertura(covData as CoberturaData);
      setPendencias(pendData as PendenciasData);
    } catch {
      toast.error('Erro ao carregar cobertura');
    } finally {
      setLoadingCobertura(false);
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      const diarioParams: Record<string, string> = unitIdParam ? { unitId: unitIdParam } : {};
      if (filtroDiarioDataInicio) diarioParams.startDate = `${filtroDiarioDataInicio}T00:00:00.000Z`;
      if (filtroDiarioDataFim) diarioParams.endDate = `${filtroDiarioDataFim}T23:59:59.999Z`;
      const [dashRes, reqRes, planRes, diarRes] = await Promise.allSettled([
        http.get('/coordenacao/dashboard/unidade', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/coordenacao/requisicoes', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/coordenacao/planejamentos', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/coordenacao/diarios', { params: diarioParams }),
      ]);
      // Carregar alertas e resumo em paralelo (não bloqueante)
      const mes = new Date().toISOString().slice(0, 7);
      setLoadingAlertas(true);
      Promise.allSettled([
        http.get('/insights/unit/alerts', { params: unitIdParam ? { unitId: unitIdParam } : {} }),
        http.get('/reports/diary/summary', { params: { mes, ...(unitIdParam ? { unitId: unitIdParam } : {}) } }),
      ]).then(([alertasRes, resumoRes]) => {
        if (alertasRes.status === 'fulfilled') setAlertasReais(alertasRes.value.data);
        if (resumoRes.status === 'fulfilled') setResumoDiarios(resumoRes.value.data);
      }).finally(() => setLoadingAlertas(false));
      if (dashRes.status === 'fulfilled') {
        const raw = dashRes.value.data;
        const ind = raw?.indicadores ?? {};
        const turmasArr: TurmaResumo[] = Array.isArray(raw?.turmas) ? raw.turmas : [];
        const professoresSet = new Set(turmasArr.map((t: TurmaResumo) => t.professor).filter((p: string | null) => p !== null && p !== 'Não atribuído'));
        setDashboard({
          turmas: ind.totalTurmas ?? turmasArr.length,
          // FIX D: usa totalProfessores do backend (professores únicos ativos na unidade)
          professores: ind.totalProfessores ?? professoresSet.size ?? 0,
          alunosTotal: ind.totalAlunos ?? 0,
          requisicoesParaAnalisar: ind.requisicoesPendentes ?? 0,
          planejamentosParaRevisar: (ind.planejamentosEmRevisao ?? ind.planejamentosRascunho) ?? 0,
          diariosEstaSemana: ind.diariosHoje ?? 0,
          taxaPresencaMedia: ind.totalTurmas > 0
            ? Math.round((ind.turmasComChamadaHoje / ind.totalTurmas) * 100)
            : 0,
          alertas: [],
          turmasLista: turmasArr,
        });
        if (Array.isArray(raw?.planejamentosParaRevisao) && raw.planejamentosParaRevisao.length > 0) {
          setPlanejamentos(raw.planejamentosParaRevisao.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            title: (p.title as string) ?? 'Plano de Aula',
            status: (p.status as string) ?? 'RASCUNHO',
            type: (p.type as string) ?? '',
            startDate: (p.startDate as string) ?? '',
            endDate: (p.endDate as string) ?? '',
            professorNome: (p.createdBy as string) ?? 'Professor',
            turmaNome: ((p.grupo as Record<string, unknown> | null)?.turmaNome as string)
              ?? ((p.classroom as Record<string, unknown> | null)?.name as string)
              ?? (p.classroomId as string)
              ?? '—',
            templateNome: ((p.template as Record<string, unknown> | null)?.name as string) ?? undefined,
            objectives: (p.objectives as string) ?? undefined,
            reviewComment: (p.reviewComment as string) ?? undefined,
            createdByUser: (p.createdByUser as Planejamento['createdByUser']) ?? undefined,
            classroom: (p.classroom as Planejamento['classroom']) ?? undefined,
            template: (p.template as Planejamento['template']) ?? undefined,
          })));
        }
      }
      if (planRes.status === 'fulfilled') {
        const rawPlans: Record<string, unknown>[] = Array.isArray(planRes.value.data) ? planRes.value.data : [];
        setPlanejamentos(rawPlans.map((p) => {
          const user = p.createdByUser as Record<string, string> | null;
          const classroom = p.classroom as Record<string, string> | null;
          const template = p.template as Record<string, string> | null;
          return {
            id: p.id as string,
            title: (p.title as string) ?? 'Plano de Aula',
            status: (p.status as string) ?? 'RASCUNHO',
            type: (p.type as string) ?? '',
            startDate: (p.startDate as string) ?? '',
            endDate: (p.endDate as string) ?? '',
            professorNome: user ? `${user.firstName} ${user.lastName}`.trim() : (p.createdBy as string) ?? 'Professor',
            turmaNome: ((p.porTurma as Record<string, unknown> | null)?.turmaNome as string)
              ?? ((p.grupo as Record<string, unknown> | null)?.turmaNome as string)
              ?? classroom?.name
              ?? (p.classroomId as string)
              ?? '—',
            templateNome: template?.name ?? undefined,
            objectives: (p.objectives as string) ?? undefined,
            reviewComment: (p.reviewComment as string) ?? undefined,
            createdByUser: user as Planejamento['createdByUser'],
            classroom: classroom as Planejamento['classroom'],
            template: template as Planejamento['template'],
          };
        }));
      }
      if (diarRes.status === 'fulfilled') {
        const payload = diarRes.value.data;
        const listaDiarios = Array.isArray(payload)
          ? payload
          : (Array.isArray(payload?.diarios) ? payload.diarios : []);
        setDiarios(listaDiarios);
        if (payload?.metricas) setMetricasExecucao(payload.metricas);
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Erro desconhecido';
      setErroPainel(msg);
      toast.error('Erro ao carregar painel');
    } finally {
      setLoading(false);
    }
  }

  async function aprovarPlanejamento(id: string) {
    try {
      setProcessando(id);
      await http.post(`/plannings/${id}/aprovar`);
      toast.success('Planejamento aprovado! ✅');
      setPlanejamentos(prev => prev.filter(p => p.id !== id));
    } catch {
      toast.error('Erro ao aprovar');
    } finally {
      setProcessando(null);
    }
  }

  async function devolverPlanejamento(id: string, motivo: string) {
    try {
      setProcessando(id);
      // Usa o endpoint dedicado de devolução com comentário obrigatório
      await http.post(`/plannings/${id}/devolver`, { comment: motivo });
      toast.success('Planejamento devolvido com observações');
      setPlanejamentos(prev => prev.filter(p => p.id !== id));
      setItemParaRejeitar(null); setMotivoRejeicao('');
    } catch { toast.error('Erro ao devolver'); }
    finally { setProcessando(null); }
  }

  if (loading) return <LoadingState message="Carregando painel de coordenação..." />;
  // FIX P1: mostrar mensagem de erro clara quando o painel não carregou
  if (erroPainel && !dashboard) return (
    <PageShell title="Painel da Coordenação Pedagógica" subtitle="">
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <p className="font-bold text-red-800 mb-2">Não foi possível carregar o painel</p>
          <p className="text-sm text-red-600 mb-4">{erroPainel}</p>
          {erroPainel.includes('unidade') && (
            <p className="text-xs text-gray-500 mb-4">Selecione uma unidade no seletor de escopo para visualizar o painel.</p>
          )}
          <Button onClick={() => { setErroPainel(null); loadDashboard(); }} className="rounded-xl">Tentar novamente</Button>
        </div>
      </div>
    </PageShell>
  );

  const totalPendencias = (dashboard?.requisicoesParaAnalisar ?? 0) + (dashboard?.planejamentosParaRevisar ?? 0);
  const primeiroNome = (((user?.nome as string) || 'Coordenação').trim().split(' ')[0]) || 'Coordenação';
  const totalTurmasHoje = dashboard?.turmasLista?.length ?? dashboard?.turmas ?? 0;
  const turmasComChamadaHoje = (dashboard?.turmasLista ?? []).filter(t => t.chamadaFeita).length;
  const turmasPendentesHoje = Math.max(totalTurmasHoje - turmasComChamadaHoje, 0);
  const diariosPublicados = diarios.filter(d => ['PUBLICADO', 'REVISADO', 'ARQUIVADO'].includes((d.status || '').toUpperCase())).length;
  const diariosRascunho = diarios.filter(d => (d.status || '').toUpperCase() === 'RASCUNHO').length;
  const atalhosExecutivos = [
    {
      label: 'Diários e turmas',
      desc: 'Registros de diários, cobertura e acompanhamento de turmas',
      icon: <Brain className="h-5 w-5" />,
      className: 'from-sky-600 via-blue-600 to-indigo-700',
      action: () => setAbaAtiva('pedagogico'),
    },
    {
      label: 'Planejamentos',
      desc: `${dashboard?.planejamentosParaRevisar ?? 0} planejamento(s) aguardando revisão`,
      icon: <BookOpen className="h-5 w-5" />,
      className: 'from-amber-500 via-orange-500 to-rose-500',
      action: () => setAbaAtiva('planejamentos'),
    },
    {
      label: 'Pedidos de material',
      desc: canApprove ? 'Aprovar, devolver ou acompanhar pedidos pendentes' : 'Acompanhar pedidos e itens urgentes',
      icon: <ShoppingCart className="h-5 w-5" />,
      className: 'from-rose-500 via-red-500 to-pink-600',
      action: () => navigate(unitIdParam ? `/app/material-requests?unitId=${unitIdParam}` : '/app/material-requests'),
    },
    {
      label: 'Relatórios',
      desc: 'Indicadores e registros da unidade',
      icon: <FileText className="h-5 w-5" />,
      className: 'from-emerald-500 via-teal-500 to-cyan-600',
      action: () => setAbaAtiva('relatorios'),
    },
  ] as const;

  const abas = [
    { id: 'inicio',        label: 'Hoje',          icon: <Star className="h-4 w-4" />,
      badge: (dashboard?.requisicoesParaAnalisar ?? 0) + (dashboard?.planejamentosParaRevisar ?? 0) || undefined },
    { id: 'turmas',        label: 'Turmas',         icon: <Users className="h-4 w-4" /> },
    { id: 'planejamentos', label: 'Planejamentos',  icon: <BookOpen className="h-4 w-4" />,
      badge: dashboard?.planejamentosParaRevisar },
    { id: 'relatorios',    label: 'Relatórios',     icon: <TrendingUp className="h-4 w-4" /> },
    // PR 141: aba de ocorrências para a coordenação pedagógica
    { id: 'ocorrencias',   label: 'Ocorrências',    icon: <TriangleAlert className="h-4 w-4" /> },
  ] as const;

  return (
    <PageShell
      title={`Painel da Coordenação Pedagógica`}
      subtitle={`Olá, ${primeiroNome}. Acompanhe diários, planejamentos, chamadas e pendências da unidade.`}
    >
      {/* Modal motivo rejeição */}
      {itemParaRejeitar && canApprove && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-lg mb-2">Devolver com orientação</h3>
            <p className="text-sm text-gray-500 mb-4">Escreva uma orientação para o professor:</p>
            <textarea className="w-full border-2 rounded-xl p-3 text-sm resize-none mb-4" rows={4}
              placeholder="Ex: Por favor, detalhe melhor os objetivos..."
              value={motivoRejeicao} onChange={e => setMotivoRejeicao(e.target.value)} />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl"
                onClick={() => { setItemParaRejeitar(null); setMotivoRejeicao(''); }}>Cancelar</Button>
              <Button className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
                onClick={() => {
                  if (!motivoRejeicao.trim()) { toast.error('Escreva uma orientação'); return; }
                  devolverPlanejamento(itemParaRejeitar.id, motivoRejeicao);
                }}>Devolver</Button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 flex-wrap">
        <button
          onClick={() => navigate('/app/teacher-dashboard')}
          className="hover:text-gray-700 transition-colors"
        >
          Início
        </button>
        <ChevronRight className="h-3 w-3 flex-shrink-0" />
        <button
          onClick={() => setAbaAtiva('inicio')}
          className="hover:text-gray-700 transition-colors"
        >
          Coordenação Pedagógica
        </button>
        {abaAtiva !== 'inicio' && (
          <>
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
            <span className="text-gray-600 font-medium capitalize">
              {abaAtiva === 'turmas' ? 'Turmas' :
               abaAtiva === 'planejamentos' ? 'Planejamentos' :
               abaAtiva === 'relatorios' ? 'Relatórios' :
               abaAtiva === 'ocorrencias' ? 'Ocorrências' :
               abaAtiva === 'pedagogico' ? 'Pedagógico' :
               abaAtiva === 'diarios' ? 'Diários' : abaAtiva}
            </span>
          </>
        )}
      </nav>

      {/* Alerta de pendências */}
      {totalPendencias > 0 && (
        <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex items-center gap-3">
          <Bell className="h-6 w-6 text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-orange-800">{totalPendencias} {totalPendencias === 1 ? 'item precisa' : 'itens precisam'} da sua atenção</p>
            <p className="text-sm text-orange-600">
              {(dashboard?.requisicoesParaAnalisar ?? 0) > 0 ? `${dashboard?.requisicoesParaAnalisar} pedido(s) de material · ` : ''}
              {(dashboard?.planejamentosParaRevisar ?? 0) > 0 ? `${dashboard?.planejamentosParaRevisar} planejamento(s) para revisar` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Banner modo leitura para Coordenação Geral */}
      {isCentralUser && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
          <Eye className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Modo Análise — Coordenação Geral</p>
            <p className="text-xs text-blue-600">Você está visualizando dados desta unidade. Aprovações são responsabilidade da Coordenação da Unidade.</p>
          </div>
        </div>
      )}
      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {abas.map(aba => (
          <button
            key={aba.id}
            onClick={() => {
              if ((aba.id as string) === 'requisicoes') {
                navigate(unitIdParam ? `/app/material-requests?unitId=${unitIdParam}` : '/app/material-requests');
                return;
              }
              setAbaAtiva(aba.id as any);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              abaAtiva === aba.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {aba.icon}{aba.label}
            {(aba as any).badge > 0 && (
              <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {(aba as any).badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ABA: HOJE */}
      {abaAtiva === 'inicio' && (
        <div className="space-y-5">

          {/* Indicadores do dia — bloco compacto e operacional com drill-down */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Pendências → aba planejamentos (principal pendência acionável) */}
            <button
              onClick={() => setAbaAtiva('planejamentos')}
              className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Pendências</p>
              <p className="mt-1.5 text-3xl font-bold group-hover:text-blue-300 transition-colors">{totalPendencias}</p>
              <p className="mt-1 text-xs text-slate-400">{(dashboard?.planejamentosParaRevisar ?? 0)} planos · {(dashboard?.requisicoesParaAnalisar ?? 0)} pedidos</p>
              <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver planejamentos →</p>
            </button>
            {/* Chamadas hoje → aba turmas */}
            <button
              onClick={() => setAbaAtiva('turmas')}
              className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Chamadas hoje</p>
              <p className="mt-1.5 text-3xl font-bold group-hover:text-emerald-300 transition-colors">{totalTurmasHoje > 0 ? `${Math.round((turmasComChamadaHoje / totalTurmasHoje) * 100)}%` : '—'}</p>
              <p className="mt-1 text-xs text-slate-400">{turmasComChamadaHoje} de {totalTurmasHoje} turmas</p>
              <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver status das turmas →</p>
            </button>
            {/* Diários → aba pedagógico (sub-aba diários) */}
            <button
              onClick={() => setAbaAtiva('pedagogico')}
              className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Diários</p>
              <p className="mt-1.5 text-3xl font-bold group-hover:text-amber-300 transition-colors">{dashboard?.diariosEstaSemana ?? 0}</p>
              <p className="mt-1 text-xs text-slate-400">{diariosPublicados} publicados · {diariosRascunho} rascunho(s)</p>
              <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver diários →</p>
            </button>
            {/* Turmas → aba turmas */}
            <button
              onClick={() => setAbaAtiva('turmas')}
              className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Turmas</p>
              <p className="mt-1.5 text-3xl font-bold group-hover:text-violet-300 transition-colors">{dashboard?.turmas ?? 0}</p>
              <p className="mt-1 text-xs text-slate-400">{dashboard?.alunosTotal ?? 0} alunos · {dashboard?.professores ?? 0} professores</p>
              <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver todas as turmas →</p>
            </button>
          </div>

          {/* Atalhos rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {atalhosExecutivos.map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className={`group rounded-2xl bg-gradient-to-br ${item.className} p-[1px] text-left shadow-sm transition-transform duration-200 hover:-translate-y-0.5`}
              >
                <div className="h-full rounded-2xl bg-slate-950/80 px-4 py-4 backdrop-blur-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                      {item.icon}
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-blue-100/75">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Alertas automáticos calculados no dashboard (fallback) */}
          {!loadingAlertas && (!alertasReais || alertasReais.total === 0) && dashboard?.alertas && (dashboard.alertas as any[]).length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Atenção hoje
              </p>
              <ul className="space-y-1">
                {(dashboard.alertas as any[]).map((a: any, i: number) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                    {typeof a === 'string' ? a : (a.mensagem ?? JSON.stringify(a))}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loadingAlertas && (
            <Card className="rounded-2xl border-2 border-blue-200 bg-blue-50">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-blue-800"><AlertCircle className="h-5 w-5"/>Atualizando alertas</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700">Carregando alertas da unidade e resumo de diários...</p>
              </CardContent>
            </Card>
          )}

          {/* Alertas reais do banco */}
          {alertasReais && alertasReais.total > 0 && (
            <div className="space-y-2">
              {alertasReais.criticos.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {alertasReais.criticos.length} alerta{alertasReais.criticos.length > 1 ? 's' : ''} crítico{alertasReais.criticos.length > 1 ? 's' : ''}
                  </p>
                  <ul className="space-y-1">
                    {alertasReais.criticos.map((a: any) => (
                      <li key={a.id} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                        <span><strong>{a.titulo}</strong> — {a.descricao}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {alertasReais.atencao.length > 0 && (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {alertasReais.atencao.length} atenção
                  </p>
                  <ul className="space-y-1">
                    {alertasReais.atencao.map((a: any) => (
                      <li key={a.id} className="text-sm text-orange-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
                        {a.titulo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Status das turmas hoje */}
          {(dashboard?.turmasLista ?? []).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-800">Status das Turmas — Hoje</p>
                <button
                  onClick={() => setAbaAtiva('turmas')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver todas as turmas →
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {(dashboard.turmasLista ?? []).map(turma => (
                  <div key={turma.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{turma.nome}</p>
                        <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor || 'Sem professor'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        turma.chamadaFeita ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {turma.chamadaFeita ? '✓ Chamada' : '⏳ Pendente'}
                      </span>
                      <button
                        onClick={() => navigate(`/app/turma/${turma.id}/painel`)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Painel →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações pendentes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(dashboard?.planejamentosParaRevisar ?? 0) > 0 && (
              <button
                onClick={() => setAbaAtiva('planejamentos')}
                className="flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-left hover:bg-amber-100 transition-all"
              >
                <span className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {dashboard?.planejamentosParaRevisar}
                </span>
                <div>
                  <p className="text-sm font-bold text-amber-800">Planejamentos</p>
                  <p className="text-xs text-amber-600">aguardando revisão</p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-500 ml-auto" />
              </button>
            )}
            {(dashboard?.requisicoesParaAnalisar ?? 0) > 0 && (
              <button
                onClick={() => navigate(unitIdParam ? `/app/material-requests?unitId=${unitIdParam}` : '/app/material-requests')}
                className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-left hover:bg-red-100 transition-all"
              >
                <span className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {dashboard?.requisicoesParaAnalisar}
                </span>
                <div>
                  <p className="text-sm font-bold text-red-800">Pedidos de material</p>
                  <p className="text-xs text-red-600">{canApprove ? 'aguardando aprovação' : 'para visualizar e analisar'}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-red-500 ml-auto" />
              </button>
            )}
            <button
              onClick={() => setAbaAtiva('pedagogico')}
              className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl text-left hover:bg-blue-100 transition-all"
            >
              <span className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-blue-800">Diários e cobertura</p>
                <p className="text-xs text-blue-600">{dashboard?.diariosEstaSemana ?? 0} diários esta semana</p>
                {resumoDiarios && (
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {resumoDiarios.climaEmocional?.BOM > 0 && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        Clima bom: {resumoDiarios.climaEmocional.BOM}
                      </span>
                    )}
                    {resumoDiarios.execucaoPlano?.CUMPRIDO > 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                        Plano cumprido: {resumoDiarios.execucaoPlano.CUMPRIDO}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-blue-500 ml-auto flex-shrink-0" />
            </button>
          </div>

          {/* Recados */}
          <RecadosWidget unitId={unitIdParam} />
        </div>
      )}

      {/* ABA: TURMAS — visão consolidada de todas as turmas da unidade */}
      {abaAtiva === 'turmas' && (
        <div className="space-y-4">

          {/* Resumo pedagógico da semana */}
          {dashboard && (
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Diários esta semana',
                  val: dashboard.diariosEstaSemana ?? (dashboard as any).indicadores?.diariosHoje ?? 0,
                  icon: <ClipboardList className="h-4 w-4 text-blue-600" />,
                  bg: 'bg-blue-50',
                  onClick: () => setAbaAtiva('diarios' as any),
                },
                {
                  label: 'Turmas com chamada',
                  val: `${(dashboard as any).indicadores?.turmasComChamadaHoje ?? 0}/${(dashboard as any).indicadores?.totalTurmas ?? dashboard.turmas ?? 0}`,
                  icon: <CheckCircle className="h-4 w-4 text-emerald-600" />,
                  bg: 'bg-emerald-50',
                  onClick: undefined as (() => void) | undefined,
                },
                {
                  label: 'Cobertura hoje',
                  val: (dashboard as any).indicadores?.diariosHoje > 0 ? `${(dashboard as any).indicadores.diariosHoje} reg.` : '—',
                  icon: <BarChart2 className="h-4 w-4 text-purple-600" />,
                  bg: 'bg-purple-50',
                  onClick: () => { setCobertura(null); setPendencias(null); carregarCobertura(); },
                },
              ].map(c => (
                <button
                  key={c.label}
                  onClick={c.onClick}
                  disabled={!c.onClick}
                  className={`${c.bg} rounded-2xl p-3 text-center ${c.onClick ? 'hover:opacity-90 cursor-pointer transition-opacity' : 'cursor-default'}`}
                >
                  <div className="flex justify-center mb-1">{c.icon}</div>
                  <p className="text-lg font-bold text-gray-800">{c.val}</p>
                  <p className="text-[11px] text-gray-500">{c.label}</p>
                </button>
              ))}
            </div>
          )}

          {/* Lista de turmas com acesso rápido */}
          <div className="space-y-2">
            {(dashboard?.turmasLista ?? []).map(turma => (
              <div key={turma.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-200 transition-colors">
                {/* Cabeçalho da turma */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{turma.nome}</p>
                      <p className="text-xs text-gray-400">
                        {turma.totalAlunos} alunos · Prof. {turma.professor || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      turma.chamadaFeita
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {turma.chamadaFeita ? '✓ Chamada' : '⏳ Pendente'}
                    </span>
                  </div>
                </div>
                {/* Ações rápidas */}
                <div className="grid grid-cols-5 gap-0 border-t border-gray-50">
                  {[
                    {
                      label: 'Diários',
                      color: 'text-blue-600',
                      bg: 'hover:bg-blue-50',
                      onClick: () => {
                        setAbaAtiva('diarios' as any);
                        setFiltroDiarioTurma(turma.nome);
                        setFiltroDiarioProfessor(turma.professor || '');
                      },
                    },
                    { label: 'Planos', path: `/app/planejamentos?classroomId=${turma.id}`, color: 'text-amber-600', bg: 'hover:bg-amber-50' },
                    { label: 'RDIC', path: `/app/rdic-coord?classroomId=${turma.id}`, color: 'text-violet-600', bg: 'hover:bg-violet-50' },
                    { label: 'Painel', path: `/app/turma/${turma.id}/painel`, color: 'text-teal-600', bg: 'hover:bg-teal-50' },
                    { label: 'Obs.', path: `/app/coordenacao/observacoes?classroomId=${turma.id}`, color: 'text-pink-600', bg: 'hover:bg-pink-50' },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => ('onClick' in item ? item.onClick() : navigate(item.path))}
                      className={`py-2.5 text-[11px] font-semibold ${item.color} ${item.bg} transition-colors text-center border-r border-gray-50 last:border-0`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Diários recentes da unidade */}
          {diarios.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">
                Diários recentes — todas as turmas
              </p>
              <div className="space-y-2">
                {diarios.slice(0, 6).map((diario: any) => {
                  const legacyTurma = diario['turmaNome'];
                  const legacyProfessor = diario['professorNome'];
                  const legacyData = diario['data'];
                  const turmaNm = diario.classroom?.name || legacyTurma || '—';
                  const professorNm = diario.createdByUser
                    ? `${diario.createdByUser.firstName ?? ''} ${diario.createdByUser.lastName ?? ''}`.trim()
                    : legacyProfessor || '—';
                  const dataRaw = diario.eventDate || legacyData || diario.createdAt || '';
                  const dataFmt = dataRaw
                    ? new Date(dataRaw.includes('T') ? dataRaw : `${dataRaw}T12:00:00`)
                        .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    : '—';
                  const ctx      = diario.aiContext && typeof diario.aiContext === 'object'
                    ? diario.aiContext as any : {};
                  const publicado = ['PUBLICADO','REVISADO','ARQUIVADO']
                    .includes((diario.status || '').toUpperCase());
                  return (
                    <div key={diario.id}
                      className={`rounded-xl border px-4 py-2.5 bg-white flex items-center justify-between gap-3 ${
                        publicado ? 'border-emerald-100' : 'border-amber-100'
                      }`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{turmaNm}</p>
                        <p className="text-xs text-gray-400">
                          {professorNm}
                          {ctx.presencas != null && <span className="ml-2 text-emerald-600">· {ctx.presencas} pres.</span>}
                          {ctx.climaEmocional && <span className="ml-1">· {ctx.climaEmocional}</span>}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{dataFmt}</span>
                    </div>
                  );
                })}
                {diarios.length > 6 && (
                  <button
                    onClick={() => setAbaAtiva('diarios' as any)}
                    className="w-full py-2 text-xs text-blue-600 hover:underline font-medium"
                  >
                    Ver todos os {diarios.length} diários →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Cobertura inline */}
          {cobertura && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">Cobertura — hoje</p>
              <div className="space-y-2">
                {(cobertura.turmas ?? []).map((cls: any) => (
                  <div key={cls.classroomId}
                    className="bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex items-center gap-3">
                    <p className="text-sm font-medium text-gray-800 flex-1 truncate">{cls.classroomName}</p>
                    <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                      <div
                        className={`h-full rounded-full ${
                          (cls.percentual ?? 0) >= 80 ? 'bg-emerald-500'
                          : (cls.percentual ?? 0) >= 40 ? 'bg-amber-400'
                          : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.max(cls.percentual ?? 0, 2)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold flex-shrink-0 ${
                      (cls.percentual ?? 0) >= 80 ? 'text-emerald-600'
                      : (cls.percentual ?? 0) >= 40 ? 'text-amber-600'
                      : 'text-red-500'
                    }`}>{cls.percentual ?? 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA: PLANEJAMENTOS — compacto por turma */}
      {abaAtiva === 'planejamentos' && (() => {
        const STATUS_CFG: Record<string, { label: string; cor: string; dot: string }> = {
          RASCUNHO:   { label: 'Rascunho',   cor: 'bg-gray-100 text-gray-600 border-gray-300',      dot: 'bg-gray-400'   },
          EM_REVISAO: { label: 'Em Revisão', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500' },
          APROVADO:   { label: 'Aprovado',   cor: 'bg-green-100 text-green-700 border-green-300',   dot: 'bg-green-500'  },
          DEVOLVIDO:  { label: 'Devolvido',  cor: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
          PUBLICADO:  { label: 'Publicado',  cor: 'bg-blue-100 text-blue-700 border-blue-300',      dot: 'bg-blue-500'   },
          CONCLUIDO:  { label: 'Concluído',  cor: 'bg-purple-100 text-purple-700 border-purple-300', dot: 'bg-purple-500' },
        };

        // Agrupar por turma
        const porTurma: Record<string, {
          turmaNome: string; professor: string;
          itens: typeof planejamentos;
        }> = {};
        for (const p of planejamentos) {
          const chave = (p as any).classroom?.id || (p as any).classroomId || p.turmaNome || 'sem-turma';
          const nome  = (p as any).classroom?.name || p.turmaNome || chave;
          const prof  = (p as any).createdByUser
            ? `${(p as any).createdByUser.firstName} ${(p as any).createdByUser.lastName}`.trim()
            : p.professorNome || '—';
          if (!porTurma[chave]) porTurma[chave] = { turmaNome: nome, professor: prof, itens: [] };
          porTurma[chave].itens.push(p);
        }
        const grupos = Object.entries(porTurma);

        // Contadores globais
        const pendentes = planejamentos.filter(p =>
          p.status === 'EM_REVISAO' || p.status === 'RASCUNHO' || p.status === 'DEVOLVIDO'
        ).length;

        return (
          <div className="space-y-3">

            {/* Cabeçalho resumido */}
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-semibold text-gray-800">Planejamentos</p>
                <p className="text-xs text-gray-400">
                  {grupos.length} turma{grupos.length !== 1 ? 's' : ''} · {planejamentos.length} plano{planejamentos.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pendentes > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full border border-amber-200">
                    {pendentes} pendente{pendentes !== 1 ? 's' : ''}
                  </span>
                )}
                <button onClick={loadDashboard}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {planejamentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-gray-100 gap-2">
                <BookOpen className="h-10 w-10 text-gray-200" />
                <p className="text-sm font-semibold text-gray-400">Nenhum planejamento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {grupos.map(([chave, grupo]) => {
                  const aberto = turmaExpandida === chave;
                  const temPendente = grupo.itens.some(p =>
                    ['EM_REVISAO','RASCUNHO','DEVOLVIDO'].includes(p.status || '')
                  );
                  const countPendente = grupo.itens.filter(p =>
                    ['EM_REVISAO','RASCUNHO','DEVOLVIDO'].includes(p.status || '')
                  ).length;

                  return (
                    <div key={chave} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

                      {/* Header da turma — sempre visível */}
                      <button
                        onClick={() => setTurmaExpandida(aberto ? null : chave)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{grupo.turmaNome}</p>
                            <p className="text-xs text-gray-400 truncate">Prof. {grupo.professor}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs text-gray-400">
                            {grupo.itens.length} plano{grupo.itens.length !== 1 ? 's' : ''}
                          </span>
                          {temPendente && (
                            <span className="text-[11px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                              {countPendente} pendente{countPendente !== 1 ? 's' : ''}
                            </span>
                          )}
                          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${aberto ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {/* Lista de planos — só aparece quando expandido */}
                      {aberto && (
                        <div className="divide-y divide-gray-50 border-t border-gray-100">
                          {grupo.itens.map(plan => {
                            const cfg = STATUS_CFG[(plan.status || '').toUpperCase()] ?? STATUS_CFG.RASCUNHO;
                            const dataRaw = (plan as any).startDate || '';
                            const dataFmt = dataRaw
                              ? new Date(dataRaw.includes('T') ? dataRaw : dataRaw + 'T12:00:00')
                                  .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                              : '—';
                            return (
                              <div key={plan.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                      {plan.title || 'Planejamento'}
                                    </p>
                                    <p className="text-xs text-gray-400">{dataFmt}</p>
                                    {(plan as any).reviewComment && (
                                      <p className="text-xs text-red-500 mt-0.5 truncate">
                                        💬 {(plan as any).reviewComment}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${cfg.cor}`}>
                                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${cfg.dot}`} />
                                      {cfg.label}
                                    </span>
                                    {canApprove && ['EM_REVISAO','RASCUNHO'].includes(plan.status || '') && (
                                      <>
                                        <button
                                          onClick={() => aprovarPlanejamento(plan.id)}
                                          disabled={processando === plan.id}
                                          className="text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-semibold transition-colors disabled:opacity-50"
                                        >
                                          Aprovar
                                        </button>
                                        <button
                                          onClick={() => setItemParaRejeitar({ id: plan.id, tipo: 'plan' })}
                                          className="text-[11px] bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 rounded-lg font-semibold transition-colors"
                                        >
                                          Devolver
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => navigate(`/app/planejamentos/${plan.id}`)}
                                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline"
                                    >
                                      Ver →
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal devolução */}
            {itemParaRejeitar?.tipo === 'plan' && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
                  <h3 className="font-bold text-gray-800 mb-3">Devolver Planejamento</h3>
                  <textarea
                    rows={4}
                    value={motivoRejeicao}
                    onChange={e => setMotivoRejeicao(e.target.value)}
                    placeholder="Descreva o que precisa ser ajustado..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => { setItemParaRejeitar(null); setMotivoRejeicao(''); }}
                      className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => devolverPlanejamento(itemParaRejeitar.id, motivoRejeicao)}
                      disabled={!motivoRejeicao.trim()}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40"
                    >
                      Devolver
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}


      {/* ══════════════════════════════════════════════════════════════════
          ABA: PEDAGÓGICO (diários + turmas + cobertura)
      ══════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'pedagogico' && (
        <PedagogicoSubNav
          diarios={diarios}
          turmasLista={dashboard?.turmasLista ?? []}
          cobertura={cobertura}
          loadingCobertura={loadingCobertura}
          carregarCobertura={carregarCobertura}
          setCobertura={setCobertura}
          setPendencias={setPendencias}
          navigate={navigate}
        />
      )}

      {/* ABA: DIÁRIOS */}
      {abaAtiva === 'diarios' && (
        <div className="space-y-4">
          {/* Header com resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(() => {
              const publicados = diarios.filter(d => ['PUBLICADO','REVISADO','ARQUIVADO'].includes((d.status||'').toUpperCase())).length;
              const rascunhos = diarios.filter(d => (d.status||'').toUpperCase() === 'RASCUNHO').length;
              const comExecucao = diarios.filter(d => d.statusExecucaoPlano === 'CUMPRIDO').length;
              const presencaMedia = diarios.filter(d => d.presencas != null).reduce((acc, d, _, arr) => {
                const total = (d.presencas ?? 0) + (d.ausencias ?? 0);
                return total > 0 ? acc + ((d.presencas ?? 0) / total) * 100 / arr.length : acc;
              }, 0);
              return (
                <>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{publicados}</p>
                    <p className="text-xs text-emerald-600 mt-0.5 font-medium">Publicados</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">{rascunhos}</p>
                    <p className="text-xs text-amber-600 mt-0.5 font-medium">Rascunhos</p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{comExecucao}</p>
                    <p className="text-xs text-blue-600 mt-0.5 font-medium">Plano cumprido</p>
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3 text-center">
                    <p className="text-2xl font-bold text-violet-700">{presencaMedia > 0 ? `${Math.round(presencaMedia)}%` : '—'}</p>
                    <p className="text-xs text-violet-600 mt-0.5 font-medium">Presença média</p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* FIX P4-3: Filtros operacionais por turma, status, data e professor */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtrar diários</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Turma</label>
                <input
                  type="text"
                  placeholder="Buscar turma..."
                  value={filtroDiarioTurma}
                  onChange={e => setFiltroDiarioTurma(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={filtroDiarioStatus}
                  onChange={e => setFiltroDiarioStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="TODOS">Todos</option>
                  <option value="PUBLICADO">Publicado</option>
                  <option value="RASCUNHO">Rascunho</option>
                  <option value="REVISADO">Revisado</option>
                  <option value="ARQUIVADO">Arquivado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data início</label>
                <input
                  type="date"
                  value={filtroDiarioDataInicio}
                  onChange={e => setFiltroDiarioDataInicio(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data fim</label>
                <input
                  type="date"
                  value={filtroDiarioDataFim}
                  onChange={e => setFiltroDiarioDataFim(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Professor</label>
                <input
                  type="text"
                  placeholder="Buscar professor..."
                  value={filtroDiarioProfessor}
                  onChange={e => setFiltroDiarioProfessor(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <button
                onClick={() => { setFiltroDiarioTurma(''); setFiltroDiarioStatus('TODOS'); setFiltroDiarioDataInicio(''); setFiltroDiarioDataFim(''); setFiltroDiarioProfessor(''); }}
                className="mt-4 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          </div>

          {/* Lista de diários */}
          {(() => {
            const diariosFiltrados = (diarios as any[]).filter((d: any) => {
              const turma = d.classroom?.name || d.turmaNome || '';
              const professor = d.createdByUser
                ? `${d.createdByUser.firstName ?? ''} ${d.createdByUser.lastName ?? ''}`.trim()
                : d.professorNome || '';
              const dataRaw = (d.eventDate || d.data || d.createdAt || '').substring(0, 10);
              const status = (d.status || '').toUpperCase();
              if (filtroDiarioTurma && !turma.toLowerCase().includes(filtroDiarioTurma.toLowerCase())) return false;
              if (filtroDiarioProfessor && !professor.toLowerCase().includes(filtroDiarioProfessor.toLowerCase())) return false;
              if (filtroDiarioStatus !== 'TODOS') {
                const isPublicado = ['PUBLICADO','REVISADO','ARQUIVADO'].includes(status);
                if (filtroDiarioStatus === 'PUBLICADO' && !isPublicado) return false;
                if (filtroDiarioStatus === 'RASCUNHO' && status !== 'RASCUNHO') return false;
                if (filtroDiarioStatus === 'REVISADO' && status !== 'REVISADO') return false;
                if (filtroDiarioStatus === 'ARQUIVADO' && status !== 'ARQUIVADO') return false;
              }
              if (filtroDiarioDataInicio && dataRaw < filtroDiarioDataInicio) return false;
              if (filtroDiarioDataFim && dataRaw > filtroDiarioDataFim) return false;
              return true;
            });
            return diariosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-gray-100 gap-2">
              <ClipboardList className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">{diarios.length === 0 ? 'Nenhum diário registrado neste período.' : 'Nenhum diário encontrado com os filtros aplicados.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {diariosFiltrados.slice(0, paginaDiarios * ITENS_POR_PAGINA).map((diario: any) => {
                const turma = diario.classroom?.name || diario.turmaNome || '—';
                const professor = diario.createdByUser
                  ? `${diario.createdByUser.firstName ?? ''} ${diario.createdByUser.lastName ?? ''}`.trim()
                  : diario.professorNome || '—';
                const dataRaw = diario.eventDate || diario.data || diario.createdAt || '';
                const dataFmt = dataRaw
                  ? new Date(dataRaw.includes('T') ? dataRaw : `${dataRaw}T12:00:00`).toLocaleDateString('pt-BR', {
                    weekday: 'short', day: '2-digit', month: '2-digit',
                  })
                  : '—';
                const status = (diario.status || '').toUpperCase();
                const ctx = diario.aiContext && typeof diario.aiContext === 'object'
                  ? diario.aiContext as any : {};
                const publicado = ['PUBLICADO', 'REVISADO', 'ARQUIVADO'].includes(status);

                const entrada = diario.curriculumEntry;
                const campo = entrada?.campoDeExperiencia?.replace(/_/g, ' ') ?? null;
                const bncc = entrada?.objetivoBNCC ?? null;
                const curricDF = entrada?.objetivoCurriculo ?? null;
                const intenc = entrada?.intencionalidade ?? null;
                const codigoBNCC = entrada?.objetivoBNCCCode ?? null;

                const conferencia = diario.conferencia;
                const plano = diario.planning;
                const execStatus = ctx.statusExecucaoPlano || conferencia?.status || null;

                const EXEC_CFG: Record<string, { label: string; bg: string; text: string }> = {
                  CUMPRIDO: { label: 'Cumprido', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                  FEITO: { label: 'Feito', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                  PARCIAL: { label: 'Parcial', bg: 'bg-amber-50', text: 'text-amber-700' },
                  NAO_REALIZADO: { label: 'Não realizado', bg: 'bg-red-50', text: 'text-red-700' },
                };
                const execCfg = execStatus ? (EXEC_CFG[execStatus] ?? null) : null;

                const CLIMA: Record<string, string> = {
                  OTIMO: 'Ótimo', BOM: 'Bom', REGULAR: 'Regular', AGITADO: 'Agitado', DIFICIL: 'Difícil',
                };

                const metricasTurma = metricasExecucao[diario.classroomId] ?? null;

                return (
                  <div
                    key={diario.id}
                    className={`rounded-2xl border bg-white overflow-hidden ${
                      publicado ? 'border-emerald-200' : 'border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/70">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                            publicado
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {publicado ? 'Publicado' : 'Rascunho'}
                          </span>
                          {execCfg && (
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${execCfg.bg} ${execCfg.text}`}>
                              Execução: {execCfg.label}
                            </span>
                          )}
                          {diario.curriculumEntryId && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              BNCC vinculada
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-gray-900 truncate">{turma}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Prof. {professor}
                          {diario.presencas != null && (
                            <span className="ml-2 text-emerald-600 font-medium">· {diario.presencas} presentes</span>
                          )}
                          {diario.ausencias != null && (
                            <span className="ml-2 text-rose-500 font-medium">· {diario.ausencias} ausências</span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-gray-400 flex-shrink-0 mt-0.5">{dataFmt}</span>
                    </div>

                    <div className="p-4 space-y-3">
                      {(diario.momentoDestaque || diario.title) && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Registro</p>
                          <p className="mt-1 text-sm text-gray-700 leading-6">
                            {diario.momentoDestaque || diario.title}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">BNCC / Currículo</p>
                          {entrada ? (
                            <div className="mt-2 space-y-1.5 text-sm text-indigo-900">
                              {campo && <p><span className="font-semibold">Campo:</span> {campo}</p>}
                              {codigoBNCC && <p><span className="font-semibold">Código:</span> {codigoBNCC}</p>}
                              {bncc && <p><span className="font-semibold">Objetivo BNCC:</span> {bncc}</p>}
                              {curricDF && <p><span className="font-semibold">Currículo:</span> {curricDF}</p>}
                              {intenc && <p><span className="font-semibold">Intencionalidade:</span> {intenc}</p>}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-indigo-700">Sem vínculo de BNCC neste diário.</p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Conferência de execução</p>
                          {plano ? (
                            <div className="mt-2 space-y-1.5 text-sm text-emerald-900">
                              <p><span className="font-semibold">Plano:</span> {plano.title}</p>
                              <p><span className="font-semibold">Status do plano:</span> {plano.status}</p>
                              {execCfg && <p><span className="font-semibold">Execução:</span> {execCfg.label}</p>}
                              {conferencia?.observacao && <p><span className="font-semibold">Observação:</span> {conferencia.observacao}</p>}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-emerald-700">Diário sem planejamento vinculado.</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Clima</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{CLIMA[diario.climaEmocional || ctx.climaEmocional] ?? '—'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Métrica turma</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{metricasTurma ? `${metricasTurma.publicados}/${metricasTurma.total} publicados` : '—'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Com BNCC</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{metricasTurma ? `${metricasTurma.comMatriz}/${metricasTurma.total}` : '—'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Com plano</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{metricasTurma ? `${metricasTurma.comPlano}/${metricasTurma.total}` : '—'}</p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/app/diario-de-bordo?classroomId=${diario.classroomId}`);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Ver diário completo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {diariosFiltrados.length > paginaDiarios * ITENS_POR_PAGINA && (
                <button
                  onClick={() => setPaginaDiarios(p => p + 1)}
                  className="w-full py-3 text-sm text-blue-600 hover:bg-blue-50 rounded-2xl border border-blue-100 font-medium transition-colors mt-2"
                >
                  Carregar mais ({diariosFiltrados.length - paginaDiarios * ITENS_POR_PAGINA} restantes)
                </button>
              )}
            </div>
          );
          })()
          }
        </div>
      )}
      {/* ABA: OBSERVAÇÕES INDIVIDUAIS */}
      {abaAtiva === 'observacoes' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
            <p className="text-sm text-teal-700">
              Visualize as observações individuais registradas pelos professores para cada aluno.
              Você pode filtrar por turma, aluno ou categoria.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {dashboard?.turmasLista?.map(turma => (
              <button key={turma.id}
                onClick={() => navigate(`/app/coordenacao/observacoes?classroomId=${turma.id}`)}
                className="p-4 bg-white border-2 border-teal-100 rounded-2xl text-left hover:border-teal-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                    <Brain className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{turma.nome}</p>
                    <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ABA: SALA DE AULA VIRTUAL */}
      {abaAtiva === 'sala' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <p className="text-sm text-indigo-700">
              Acompanhe as atividades e tarefas publicadas pelos professores na Sala de Aula Virtual.
              Visualize o desempenho individual de cada aluno por atividade.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {dashboard?.turmasLista?.map(turma => (
              <button key={turma.id}
                onClick={() => navigate(`/app/sala-de-aula-virtual?classroomId=${turma.id}`)}
                className="p-4 bg-white border-2 border-indigo-100 rounded-2xl text-left hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{turma.nome}</p>
                    <p className="text-xs text-gray-400">{turma.totalAlunos} alunos · {turma.professor}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ABA: RELATÓRIOS */}
      {/* ABA: RELATÓRIOS */}
      {abaAtiva === 'relatorios' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 px-1">Acesso direto aos relatórios da unidade</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Diários por turma',     path: unitIdParam ? `/app/reports?unitId=${unitIdParam}` : '/app/reports',                         icon: <ClipboardList className="h-5 w-5 text-blue-600" />,   bg: 'bg-blue-50',   border: 'border-blue-100'   },
              { label: 'Consumo de materiais',  path: unitIdParam ? `/app/relatorio-consumo-materiais?unitId=${unitIdParam}` : '/app/relatorio-consumo-materiais', icon: <ShoppingCart className="h-5 w-5 text-orange-600" />, bg: 'bg-orange-50', border: 'border-orange-100' },
              { label: 'Desenvolvimento',       path: unitIdParam ? `/app/desenvolvimento-infantil?unitId=${unitIdParam}` : '/app/desenvolvimento-infantil', icon: <Brain className="h-5 w-5 text-purple-600" />,        bg: 'bg-purple-50', border: 'border-purple-100' },
              { label: 'RDICs publicados',      path: '/app/rdic-geral',                                                                           icon: <FileText className="h-5 w-5 text-teal-600" />,        bg: 'bg-teal-50',   border: 'border-teal-100'   },
              { label: 'Requisições aprovadas', path: '/app/material-requests',                                                                    icon: <CheckCircle className="h-5 w-5 text-emerald-600" />,  bg: 'bg-emerald-50',border: 'border-emerald-100' },
              { label: 'Ocorrências',           path: '/app/ocorrencias',                                                                          icon: <TriangleAlert className="h-5 w-5 text-red-500" />,    bg: 'bg-red-50',    border: 'border-red-100'    },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.path)}
                className={`${item.bg} border ${item.border} rounded-2xl p-4 text-left hover:opacity-90 transition-opacity`}>
                <div className="mb-2">{item.icon}</div>
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PR 141: ABA OCORRÊNCIAS — painel de ocorrências da unidade para a coordenação pedagógica */}
      {abaAtiva === 'ocorrencias' && (
        <OcorrenciasPanel
          titulo="Ocorrências da Unidade"
          unitId={unitIdParam ?? user?.unitId ?? undefined}
        />
      )}
    </PageShell>
  );
}
</file>

</files>
