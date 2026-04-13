/**
 * DesenvolvimentoInfantilPage — Área de Desenvolvimento Infantil
 * Perfis: STAFF_CENTRAL (Coordenação Geral e Psicóloga), MANTENEDORA, DEVELOPER
 *
 * Funcionalidades:
 *  - Filtros em cascata: Unidade → Turma → Criança → Período → Categoria
 *  - Listagem de observações de desenvolvimento com detalhes
 *  - Gráficos de distribuição por categoria
 *  - Resumo de desenvolvimento por aluno (via /development-observations/resumo/:childId)
 *  - Alertas de desenvolvimento e recomendações
 */
import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles } from '../app/RoleProtectedRoute';
import { getAccessibleUnits, getAccessibleClassrooms } from '../api/lookup';
import http from '../api/http';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Brain,
  Users,
  Search,
  Filter,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Heart,
  Activity,
  BookOpen,
  Eye,
  ArrowRight,
  Building2,
  GraduationCap,
  Sparkles,
  ClipboardList,
  Calendar,
  TrendingUp,
  X,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Unidade {
  id: string;
  name: string;
}

interface Turma {
  id: string;
  name: string;
  unitId?: string;
}

interface Crianca {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
}

interface Observacao {
  id: string;
  category: string;
  date: string;
  behaviorDescription?: string;
  socialInteraction?: string;
  emotionalState?: string;
  motorSkills?: string;
  cognitiveSkills?: string;
  languageSkills?: string;
  learningProgress?: string;
  psychologicalNotes?: string;
  developmentAlerts?: string;
  recommendations?: string;
  nextSteps?: string;
  createdAt: string;
  child?: { id: string; firstName: string; lastName: string; photoUrl?: string };
}

interface ResumoAluno {
  total: number;
  porCategoria: Record<string, number>;
  ultimas: Observacao[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const CATEGORIAS: Record<string, { label: string; cor: string; icon: ReactNode }> = {
  GERAL: {
    label: 'Geral',
    cor: 'blue',
    icon: <ClipboardList className="h-3.5 w-3.5" />,
  },
  COMPORTAMENTO: {
    label: 'Comportamento',
    cor: 'orange',
    icon: <Activity className="h-3.5 w-3.5" />,
  },
  SOCIAL: {
    label: 'Social',
    cor: 'green',
    icon: <Users className="h-3.5 w-3.5" />,
  },
  EMOCIONAL: {
    label: 'Emocional',
    cor: 'pink',
    icon: <Heart className="h-3.5 w-3.5" />,
  },
  COGNITIVO: {
    label: 'Cognitivo',
    cor: 'purple',
    icon: <Brain className="h-3.5 w-3.5" />,
  },
  MOTOR: {
    label: 'Motor',
    cor: 'teal',
    icon: <Activity className="h-3.5 w-3.5" />,
  },
  LINGUAGEM: {
    label: 'Linguagem',
    cor: 'indigo',
    icon: <BookOpen className="h-3.5 w-3.5" />,
  },
  APRENDIZAGEM: {
    label: 'Aprendizagem',
    cor: 'cyan',
    icon: <GraduationCap className="h-3.5 w-3.5" />,
  },
  PSICOLOGICO: {
    label: 'Psicológico',
    cor: 'violet',
    icon: <Brain className="h-3.5 w-3.5" />,
  },
  ALERTA: {
    label: 'Alerta de Desenvolvimento',
    cor: 'red',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
};

const COR_CATEGORIA: Record<string, string> = {
  GERAL: 'bg-blue-100 text-blue-700 border-blue-200',
  COMPORTAMENTO: 'bg-orange-100 text-orange-700 border-orange-200',
  SOCIAL: 'bg-green-100 text-green-700 border-green-200',
  EMOCIONAL: 'bg-pink-100 text-pink-700 border-pink-200',
  COGNITIVO: 'bg-purple-100 text-purple-700 border-purple-200',
  MOTOR: 'bg-teal-100 text-teal-700 border-teal-200',
  LINGUAGEM: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  APRENDIZAGEM: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  PSICOLOGICO: 'bg-violet-100 text-violet-700 border-violet-200',
  ALERTA: 'bg-red-100 text-red-700 border-red-200',
};

const CHART_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#84cc16',
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function nomeCrianca(c?: { firstName: string; lastName: string }) {
  if (!c) return 'Criança não identificada';
  return `${c.firstName} ${c.lastName}`.trim();
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone?: string;
}) {
  const tones: Record<string, string> = {
    default: 'bg-white border-gray-200',
    purple: 'bg-purple-50 border-purple-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
  };

  const iconTones: Record<string, string> = {
    default: 'bg-gray-100 text-gray-600',
    purple: 'bg-purple-100 text-purple-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${tones[tone] ?? tones.default}`}>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          iconTones[tone] ?? iconTones.default
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 leading-none mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
      </div>
    </div>
  );
}

function ObservacaoCard({
  obs,
  onVerResumo,
}: {
  obs: Observacao;
  onVerResumo?: (childId: string) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const cat = CATEGORIAS[obs.category] ?? CATEGORIAS.GERAL;
  const corCat = COR_CATEGORIA[obs.category] ?? COR_CATEGORIA.GERAL;

  const campos = [
    { label: 'Comportamento', val: obs.behaviorDescription },
    { label: 'Interação Social', val: obs.socialInteraction },
    { label: 'Estado Emocional', val: obs.emotionalState },
    { label: 'Habilidades Motoras', val: obs.motorSkills },
    { label: 'Habilidades Cognitivas', val: obs.cognitiveSkills },
    { label: 'Linguagem', val: obs.languageSkills },
    { label: 'Progresso de Aprendizagem', val: obs.learningProgress },
    { label: 'Notas Psicológicas', val: obs.psychologicalNotes },
    { label: 'Alertas de Desenvolvimento', val: obs.developmentAlerts },
    { label: 'Recomendações', val: obs.recommendations },
    { label: 'Próximos Passos', val: obs.nextSteps },
  ].filter((c) => c.val);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-purple-200 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-purple-700 font-bold text-sm">{obs.child?.firstName?.[0] ?? '?'}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-800 text-sm">{nomeCrianca(obs.child)}</p>

              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${corCat}`}
              >
                {cat.icon} {cat.label}
              </span>

              {obs.developmentAlerts && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                  <AlertTriangle className="h-3 w-3" />
                  Alerta
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-0.5">{formatDate(obs.date || obs.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {obs.child?.id && onVerResumo && (
            <button
              onClick={() => onVerResumo(obs.child!.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
              title="Ver resumo do aluno"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}

          {campos.length > 0 && (
            <button
              onClick={() => setExpandido((e) => !e)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${expandido ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {expandido && campos.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          {campos.map((c, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-gray-500 mb-0.5">{c.label}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{c.val}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModalResumoAluno({
  childId,
  childName,
  onClose,
}: {
  childId: string;
  childName: string;
  onClose: () => void;
}) {
  const [resumo, setResumo] = useState<ResumoAluno | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    http
      .get(`/development-observations/resumo/${childId}`)
      .then((r) => setResumo(r.data))
      .catch(() => setResumo(null))
      .finally(() => setLoading(false));
  }, [childId]);

  const chartData = resumo
    ? Object.entries(resumo.porCategoria).map(([cat, count]) => ({
        name: CATEGORIAS[cat]?.label ?? cat,
        value: count,
      }))
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{childName}</h2>
            <p className="text-sm text-gray-500">Resumo de Desenvolvimento</p>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-all">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : resumo ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-purple-700">{resumo.total}</p>
                  <p className="text-xs text-gray-500 mt-1">Total de Observações</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-700">{Object.keys(resumo.porCategoria).length}</p>
                  <p className="text-xs text-gray-500 mt-1">Categorias Registradas</p>
                </div>
              </div>

              {chartData.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Categoria</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {resumo.ultimas.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Últimas Observações</p>
                  <div className="space-y-2">
                    {resumo.ultimas.slice(0, 5).map((obs) => (
                      <div key={obs.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${
                            COR_CATEGORIA[obs.category] ?? COR_CATEGORIA.GERAL
                          }`}
                        >
                          {CATEGORIAS[obs.category]?.label ?? obs.category}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500">{formatDate(obs.date || obs.createdAt)}</p>

                          {obs.behaviorDescription && (
                            <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{obs.behaviorDescription}</p>
                          )}

                          {obs.developmentAlerts && (
                            <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {obs.developmentAlerts}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10">
              <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Nenhum dado de desenvolvimento encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Painel de Visão Consolidada da Turma ────────────────────────────────────
interface ResumoTurma {
  classroomId: string;
  totalObs: number;
  totalAlertas: number;
  totalRecomendacoes: number;
  totalCriancas: number;
  porCategoria: Record<string, number>;
  criancas: Array<{
    id: string;
    nome: string;
    total: number;
    alertas: number;
    recomendacoes: number;
    categorias: Record<string, number>;
  }>;
}

function VisaoTurmaPanel({ classroomId }: { classroomId: string }) {
  const [resumo, setResumo] = useState<ResumoTurma | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!classroomId) {
      setResumo(null);
      return;
    }

    setLoading(true);
    setErro(null);

    http
      .get(`/development-observations/resumo-turma/${classroomId}`)
      .then((r) => setResumo(r.data))
      .catch(() => setErro('Erro ao carregar resumo da turma'))
      .finally(() => setLoading(false));
  }, [classroomId]);

  if (!classroomId) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        <Users className="h-14 w-14 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 font-medium">Selecione uma turma</p>
        <p className="text-gray-400 text-sm mt-1">
          Escolha uma turma nos filtros acima para ver a visão consolidada
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse bg-gray-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (erro || !resumo) {
    return (
      <div className="text-center py-10 text-red-500 text-sm bg-red-50 rounded-2xl border border-red-200">
        {erro ?? 'Sem dados disponíveis para esta turma'}
      </div>
    );
  }

  const chartData = Object.entries(resumo.porCategoria)
    .map(([cat, count]) => ({
      name: CATEGORIAS[cat]?.label ?? cat,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Total de Observações"
          value={resumo.totalObs}
          tone="purple"
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Crianças com Obs."
          value={resumo.totalCriancas}
          tone="blue"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Alertas"
          value={resumo.totalAlertas}
          tone={resumo.totalAlertas > 0 ? 'red' : 'default'}
        />
        <KpiCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Recomendações"
          value={resumo.totalRecomendacoes}
          tone="green"
        />
      </div>

      {chartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Categoria</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Crianças — Resumo Individual</p>
        </div>

        <div className="divide-y divide-gray-50">
          {resumo.criancas.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-700 font-bold text-sm">{c.nome[0]}</span>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-800">{c.nome}</p>
                  <p className="text-xs text-gray-400">{c.total} observações</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {c.alertas > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                    {c.alertas} alerta{c.alertas > 1 ? 's' : ''}
                  </span>
                )}

                {c.recomendacoes > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                    {c.recomendacoes} rec.
                  </span>
                )}

                <div className="flex gap-1">
                  {Object.entries(c.categorias)
                    .slice(0, 3)
                    .map(([cat], j) => (
                      <span
                        key={j}
                        className={`text-xs px-1.5 py-0.5 rounded-full border ${
                          COR_CATEGORIA[cat] ?? COR_CATEGORIA.GERAL
                        }`}
                      >
                        {CATEGORIAS[cat]?.label?.slice(0, 3) ?? cat.slice(0, 3)}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          ))}

          {resumo.criancas.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nenhuma observação registrada para esta turma
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function DesenvolvimentoInfantilPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const unitIdParam = searchParams.get('unitId') ?? '';
  const roles = normalizeRoles(user);
  const isPsicologa = roles.some((r) => r === 'STAFF_CENTRAL_PSICOLOGIA');

  // ─── Estado de filtros ─────────────────────────────────────────────────────
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState(unitIdParam);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [busca, setBusca] = useState('');

  // ─── Estado de dados ───────────────────────────────────────────────────────
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [loadingCriancas, setLoadingCriancas] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'lista' | 'graficos' | 'visao-turma'>('lista');
  const [resumoChildId, setResumoChildId] = useState<string | null>(null);
  const [resumoChildName, setResumoChildName] = useState('');

  // ─── Carregar unidades ─────────────────────────────────────────────────────
  useEffect(() => {
    getAccessibleUnits()
      .then((data) => {
        setUnidades(data);
        if (unitIdParam) {
          const valido = data.some((u: any) => u.id === unitIdParam);
          setSelectedUnitId(valido ? unitIdParam : '');
        }
      })
      .catch(() => {
        setUnidades([]);
        if (unitIdParam) setSelectedUnitId('');
      });
  }, [unitIdParam]);

  // ─── Carregar turmas quando unidade muda ──────────────────────────────────
  useEffect(() => {
    setSelectedClassroomId('');
    setSelectedChildId('');
    setTurmas([]);
    setCriancas([]);

    if (!selectedUnitId) return;

    setLoadingTurmas(true);
    getAccessibleClassrooms(selectedUnitId)
      .then((data) => setTurmas(data))
      .catch(() => setTurmas([]))
      .finally(() => setLoadingTurmas(false));
  }, [selectedUnitId]);

  // ─── Carregar crianças quando turma muda ──────────────────────────────────
  useEffect(() => {
    setSelectedChildId('');
    setCriancas([]);

    if (!selectedClassroomId) return;

    setLoadingCriancas(true);
    http
      .get('/lookup/children/accessible', { params: { classroomId: selectedClassroomId } })
      .then((r) => setCriancas(r.data ?? []))
      .catch(() => setCriancas([]))
      .finally(() => setLoadingCriancas(false));
  }, [selectedClassroomId]);

  // ─── Buscar observações ────────────────────────────────────────────────────
  const buscarObservacoes = useCallback(async () => {
    setLoading(true);
    setErro(null);

    try {
      const params: Record<string, string> = { limit: '200' };

      if (selectedClassroomId) params.classroomId = selectedClassroomId;
      if (selectedChildId) params.childId = selectedChildId;
      if (selectedCategory) params.category = selectedCategory;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const r = await http.get('/development-observations', { params });
      setObservacoes(r.data ?? []);
    } catch {
      setErro('Erro ao carregar observações. Verifique os filtros e tente novamente.');
      setObservacoes([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClassroomId, selectedChildId, selectedCategory, startDate, endDate]);

  useEffect(() => {
    buscarObservacoes();
  }, [buscarObservacoes]);

  // ─── Filtro local por busca ────────────────────────────────────────────────
  const observacoesFiltradas = useMemo(() => {
    if (!busca.trim()) return observacoes;

    const q = busca.toLowerCase();

    return observacoes.filter(
      (o) =>
        nomeCrianca(o.child).toLowerCase().includes(q) ||
        (o.behaviorDescription ?? '').toLowerCase().includes(q) ||
        (o.recommendations ?? '').toLowerCase().includes(q) ||
        (o.developmentAlerts ?? '').toLowerCase().includes(q),
    );
  }, [observacoes, busca]);

  // ─── Estatísticas ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = observacoesFiltradas.length;
    const alertas = observacoesFiltradas.filter((o) => o.developmentAlerts).length;
    const comRecomendacoes = observacoesFiltradas.filter((o) => o.recommendations).length;

    const porCategoria = observacoesFiltradas.reduce((acc, o) => {
      acc[o.category] = (acc[o.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const criancasUnicas = new Set(observacoesFiltradas.map((o) => o.child?.id).filter(Boolean)).size;

    return { total, alertas, comRecomendacoes, porCategoria, criancasUnicas };
  }, [observacoesFiltradas]);

  const chartDataCategoria = Object.entries(stats.porCategoria)
    .map(([cat, count]) => ({
      name: CATEGORIAS[cat]?.label ?? cat,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  const limparFiltros = () => {
    setSelectedUnitId('');
    setSelectedClassroomId('');
    setSelectedChildId('');
    setSelectedCategory('');
    setStartDate('');
    setEndDate('');
    setBusca('');
  };

  const temFiltros =
    !!selectedUnitId ||
    !!selectedClassroomId ||
    !!selectedChildId ||
    !!selectedCategory ||
    !!startDate ||
    !!endDate;

  return (
    <PageShell
      title="Desenvolvimento Infantil"
      subtitle="Acompanhamento das observações de desenvolvimento da rede"
    >
      <div className="flex items-center gap-2 mb-5">
        {isPsicologa ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
            <Brain className="h-3.5 w-3.5" />
            Psicóloga Central — Acompanhamento Psicológico e de Desenvolvimento
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
            <Sparkles className="h-3.5 w-3.5" />
            Coordenação Geral — Visão Consolidada de Todas as Unidades
          </span>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Filter className="h-4 w-4 text-gray-500" />
            Filtros
          </div>

          {temFiltros && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <Building2 className="h-3 w-3 inline mr-1" />
              Unidade
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              <option value="">Todas as unidades</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <GraduationCap className="h-3 w-3 inline mr-1" />
              Turma
            </label>
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              disabled={!selectedUnitId || loadingTurmas}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50"
            >
              <option value="">
                {loadingTurmas ? 'Carregando...' : !selectedUnitId ? 'Selecione uma unidade' : 'Todas as turmas'}
              </option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <Users className="h-3 w-3 inline mr-1" />
              Criança
            </label>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              disabled={!selectedClassroomId || loadingCriancas}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50"
            >
              <option value="">
                {loadingCriancas
                  ? 'Carregando...'
                  : !selectedClassroomId
                    ? 'Selecione uma turma'
                    : 'Todas as crianças'}
              </option>
              {criancas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <Brain className="h-3 w-3 inline mr-1" />
              Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              <option value="">Todas as categorias</option>
              {Object.entries(CATEGORIAS).map(([key, cat]) => (
                <option key={key} value={key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Data início
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Data fim
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome da criança, comportamento, recomendação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Total de Observações"
          value={stats.total}
          tone="purple"
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Crianças Acompanhadas"
          value={stats.criancasUnicas}
          tone="blue"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Com Alertas"
          value={stats.alertas}
          tone={stats.alertas > 0 ? 'red' : 'default'}
        />
        <KpiCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Com Recomendações"
          value={stats.comRecomendacoes}
          tone="green"
        />
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5">
        {[
          {
            id: 'lista',
            label: `Observações${observacoesFiltradas.length > 0 ? ` (${observacoesFiltradas.length})` : ''}`,
            icon: <ClipboardList className="h-3.5 w-3.5" />,
          },
          {
            id: 'graficos',
            label: 'Gráficos',
            icon: <TrendingUp className="h-3.5 w-3.5" />,
          },
          {
            id: 'visao-turma',
            label: 'Visão da Turma',
            icon: <Users className="h-3.5 w-3.5" />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAbaAtiva(tab.id as 'lista' | 'graficos' | 'visao-turma')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              abaAtiva === tab.id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {erro && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {erro}
        </div>
      )}

      {abaAtiva === 'lista' && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 animate-pulse bg-gray-100 rounded-2xl" />
              ))}
            </div>
          ) : observacoesFiltradas.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Brain className="h-14 w-14 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">Nenhuma observação encontrada</p>
              <p className="text-gray-400 text-sm mt-1">
                {temFiltros ? 'Tente ajustar os filtros' : 'Selecione uma unidade ou turma para começar'}
              </p>
            </div>
          ) : (
            <>
              {observacoesFiltradas.filter((o) => o.developmentAlerts).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-sm font-semibold text-red-700">
                      {observacoesFiltradas.filter((o) => o.developmentAlerts).length} observação(ões) com alertas
                      de desenvolvimento
                    </p>
                  </div>

                  <div className="space-y-2">
                    {observacoesFiltradas
                      .filter((o) => o.developmentAlerts)
                      .slice(0, 3)
                      .map((obs) => (
                        <div key={obs.id} className="flex items-start gap-2 text-sm">
                          <span className="font-medium text-red-800">{nomeCrianca(obs.child)}:</span>
                          <span className="text-red-700">{obs.developmentAlerts}</span>
                        </div>
                      ))}

                    {observacoesFiltradas.filter((o) => o.developmentAlerts).length > 3 && (
                      <p className="text-xs text-red-500">
                        +{observacoesFiltradas.filter((o) => o.developmentAlerts).length - 3} alertas adicionais
                        abaixo
                      </p>
                    )}
                  </div>
                </div>
              )}

              {observacoesFiltradas.map((obs) => (
                <ObservacaoCard
                  key={obs.id}
                  obs={obs}
                  onVerResumo={(childId) => {
                    setResumoChildId(childId);
                    setResumoChildName(nomeCrianca(obs.child));
                  }}
                />
              ))}
            </>
          )}
        </div>
      )}

      {abaAtiva === 'graficos' && (
        <div className="space-y-5">
          {loading ? (
            <div className="h-64 animate-pulse bg-gray-100 rounded-2xl" />
          ) : chartDataCategoria.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <TrendingUp className="h-14 w-14 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">Sem dados para exibir</p>
              <p className="text-gray-400 text-sm mt-1">Aplique filtros para visualizar os gráficos</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">Observações por Categoria</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartDataCategoria} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartDataCategoria.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">Distribuição por Categoria</p>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={chartDataCategoria} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                        {chartDataCategoria.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="flex-1 grid grid-cols-2 gap-2">
                    {chartDataCategoria.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="text-xs text-gray-600">{item.name}</span>
                        <span className="text-xs font-semibold text-gray-800 ml-auto">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">Resumo por Categoria</p>
                </div>

                <div className="divide-y divide-gray-50">
                  {chartDataCategoria.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="text-sm text-gray-700">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-purple-500 h-1.5 rounded-full"
                            style={{ width: `${Math.round((item.value / stats.total) * 100)}%` }}
                          />
                        </div>

                        <span className="text-sm font-semibold text-gray-800 w-8 text-right">{item.value}</span>
                        <span className="text-xs text-gray-400 w-10 text-right">
                          {Math.round((item.value / stats.total) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {abaAtiva === 'visao-turma' && <VisaoTurmaPanel classroomId={selectedClassroomId} />}

      <div className="mt-6 border-t border-gray-100 pt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Acesso Rápido</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'RDICs Publicados', path: '/app/rdic-geral', desc: 'Relatórios individuais' },
            { label: 'Coordenação Geral', path: '/app/coordenacao-geral', desc: 'Visão da rede' },
            { label: 'Análises Centrais', path: '/app/central', desc: 'Indicadores gerais' },
            { label: 'Relatórios', path: '/app/reports', desc: 'Exportar dados' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className="flex items-center justify-between p-3 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-200 rounded-xl transition-all text-left"
            >
              <div>
                <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {resumoChildId && (
        <ModalResumoAluno
          childId={resumoChildId}
          childName={resumoChildName}
          onClose={() => {
            setResumoChildId(null);
            setResumoChildName('');
          }}
        />
      )}
    </PageShell>
  );
}
