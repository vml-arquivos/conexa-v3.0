/**
 * PainelInteligenciaPage.tsx
 * Painel de Inteligência — Visão analítica consolidada para Coordenação
 *
 * Filtros encadeados:
 *   1. Turma
 *   2. Criança (habilitado após turma seleccionada)
 *   3. Tipo de análise
 *
 * Acesso: UNIDADE | STAFF_CENTRAL | MANTENEDORA | DEVELOPER
 * Rota: /app/inteligencia
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import http from '../api/http';
import { getAccessibleClassrooms } from '../api/lookup';
import {
  Brain, Users, BarChart2, Heart, Shield,
  ChevronRight, TrendingUp, BookOpen, Activity,
  Sparkles, AlertCircle,
} from 'lucide-react';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface Turma { id: string; name: string; code?: string }
interface Crianca { id: string; name: string; firstName: string; lastName: string }

type TipoAnalise =
  | ''
  | 'visao-geral-turma'
  | 'evolucao-pedagogica'
  | 'saude-nutricao'
  | 'auditoria-docente';

const TIPOS_ANALISE: Array<{ value: TipoAnalise; label: string; icon: React.ReactNode; desc: string }> = [
  {
    value: 'visao-geral-turma',
    label: 'Visão Geral da Turma',
    icon: <Users className="h-5 w-5 text-indigo-500" />,
    desc: 'Completude RDIC, distribuição de status e actividade docente por trimestre.',
  },
  {
    value: 'evolucao-pedagogica',
    label: 'Evolução Pedagógica / BNCC Individual',
    icon: <Brain className="h-5 w-5 text-purple-500" />,
    desc: 'Perfil BNCC da criança seleccionada, evolução trimestral e distribuição de níveis.',
  },
  {
    value: 'saude-nutricao',
    label: 'Saúde e Nutrição',
    icon: <Heart className="h-5 w-5 text-rose-500" />,
    desc: 'Alertas alimentares, restrições, condições médicas e acompanhamento nutricional.',
  },
  {
    value: 'auditoria-docente',
    label: 'Auditoria de Execução Docente',
    icon: <Shield className="h-5 w-5 text-amber-500" />,
    desc: 'Cobertura de observações, taxa de devolução de RDICs e actividade semanal do Diário.',
  },
];

// ─── Componente de card de tipo de análise ─────────────────────────────────────
function CardTipo({
  tipo,
  activo,
  onClick,
}: {
  tipo: typeof TIPOS_ANALISE[0];
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        activo
          ? 'border-indigo-500 bg-indigo-50/60 shadow-md'
          : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{tipo.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${activo ? 'text-indigo-700' : 'text-gray-800'}`}>
            {tipo.label}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{tipo.desc}</p>
        </div>
        {activo && <ChevronRight className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />}
      </div>
    </button>
  );
}

// ─── Painéis de resultado ──────────────────────────────────────────────────────
function PainelVisaoGeralTurma({ turmaId, turmaNome }: { turmaId: string; turmaNome: string }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-500" /> Visão Geral — {turmaNome}
        </h3>
        <Button
          size="sm"
          onClick={() => navigate(`/app/turma/${turmaId}/painel`)}
          className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <BarChart2 className="h-3.5 w-3.5" /> Abrir Painel da Turma
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Completude RDIC', desc: '3 trimestres · progresso geral', cor: 'indigo', icon: <TrendingUp className="h-5 w-5 text-indigo-400" /> },
          { label: 'Status por Trimestre', desc: 'Aprovados / Em Revisão / Pendentes', cor: 'emerald', icon: <Activity className="h-5 w-5 text-emerald-400" /> },
          { label: 'Actividade Semanal', desc: 'Observações do Diário (8 semanas)', cor: 'blue', icon: <BookOpen className="h-5 w-5 text-blue-400" /> },
        ].map((c, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/app/turma/${turmaId}/painel`)}>
            <CardContent className="p-4">
              {c.icon}
              <p className="text-sm font-semibold text-gray-800 mt-2">{c.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
              <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                Ver Painel <ChevronRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700">
          Para ver os dados completos com gráficos interactivos, clique em <strong>"Abrir Painel da Turma"</strong>.
        </p>
      </div>
    </div>
  );
}

function PainelEvolucaoPedagogica({ criancaId, criancaNome }: { criancaId: string; criancaNome: string }) {
  const navigate = useNavigate();
  if (!criancaId) {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <p className="text-sm text-amber-700">Seleccione uma criança no filtro acima para ver a evolução pedagógica.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-500" /> Evolução BNCC — {criancaNome}
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/app/crianca/${criancaId}/rdic-central`)} className="text-xs flex items-center gap-1">
            Central RDIC
          </Button>
          <Button size="sm" onClick={() => navigate(`/app/crianca/${criancaId}/painel-analitico`)} className="text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Painel Analítico
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Perfil BNCC — 5 Campos', desc: 'RadarChart · % Consolidado por dimensão', icon: <Brain className="h-5 w-5 text-purple-400" /> },
          { label: 'Evolução Trimestral', desc: 'Comparação 1T / 2T / 3T por dimensão', icon: <TrendingUp className="h-5 w-5 text-blue-400" /> },
          { label: 'Distribuição de Níveis', desc: 'N/O · Em Dev. · Consolidado · Ampliado', icon: <BarChart2 className="h-5 w-5 text-emerald-400" /> },
          { label: 'Observações do Diário', desc: 'Distribuição por tipo (últimos 180 dias)', icon: <BookOpen className="h-5 w-5 text-indigo-400" /> },
        ].map((c, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/app/crianca/${criancaId}/painel-analitico`)}>
            <CardContent className="p-4">
              {c.icon}
              <p className="text-sm font-semibold text-gray-800 mt-2">{c.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PainelSaudeNutricao({ criancaId, criancaNome, turmaId }: { criancaId: string; criancaNome: string; turmaId: string }) {
  const navigate = useNavigate();
  const label = criancaId ? criancaNome : 'turma seleccionada';
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-500" /> Saúde e Nutrição — {label}
        </h3>
        {criancaId && (
          <Button size="sm" variant="outline" onClick={() => navigate(`/app/crianca/${criancaId}/rdic-central`)} className="text-xs">
            Central RDIC
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Alertas Alimentares', desc: 'Alergias · Dietas restritivas · Alimentos proibidos', icon: <AlertCircle className="h-5 w-5 text-red-400" /> },
          { label: 'Condições Médicas', desc: 'Laudos · Medicações · Contacto de emergência', icon: <Heart className="h-5 w-5 text-blue-400" /> },
          { label: 'Acompanhamento Nutricional', desc: 'Plano de cuidado · Orientações para a cozinha', icon: <Activity className="h-5 w-5 text-amber-400" /> },
          { label: 'Substituições Seguras', desc: 'Alternativas alimentares aprovadas pela nutricionista', icon: <BookOpen className="h-5 w-5 text-emerald-400" /> },
        ].map((c, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/app/painel-alergias`)}>
            <CardContent className="p-4">
              {c.icon}
              <p className="text-sm font-semibold text-gray-800 mt-2">{c.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {criancaId && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">
            Para ver os alertas activos e o plano nutricional completo desta criança, aceda à <strong>Central RDIC</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

function PainelAuditoriaDocente({ turmaId, turmaNome }: { turmaId: string; turmaNome: string }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-500" /> Auditoria Docente — {turmaNome}
        </h3>
        <Button size="sm" onClick={() => navigate(`/app/turma/${turmaId}/painel`)} className="text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1">
          <BarChart2 className="h-3.5 w-3.5" /> Ver Painel
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Cobertura de Observações', desc: '% crianças com diário nos últimos 30 dias', icon: <BookOpen className="h-5 w-5 text-indigo-400" /> },
          { label: 'Taxa de Devolução de RDICs', desc: 'RDICs devolvidos vs enviados para revisão', icon: <AlertCircle className="h-5 w-5 text-amber-400" /> },
          { label: 'Completude por Trimestre', desc: 'Evolução mensal da execução docente', icon: <TrendingUp className="h-5 w-5 text-emerald-400" /> },
        ].map((c, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/app/turma/${turmaId}/painel`)}>
            <CardContent className="p-4">
              {c.icon}
              <p className="text-sm font-semibold text-gray-800 mt-2">{c.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
        <Shield className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          A auditoria completa com gráficos semanais está disponível no <strong>Painel da Turma</strong>.
        </p>
      </div>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────────────────
export default function PainelInteligenciaPage() {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [turmaId, setTurmaId] = useState('');
  const [criancaId, setCriancaId] = useState('');
  const [tipoAnalise, setTipoAnalise] = useState<TipoAnalise>('');
  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [loadingCriancas, setLoadingCriancas] = useState(false);

  // Carregar turmas acessíveis
  const carregarTurmas = useCallback(async () => {
    setLoadingTurmas(true);
    try {
      const data = await getAccessibleClassrooms();
      setTurmas(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Não foi possível carregar as turmas.');
    } finally {
      setLoadingTurmas(false);
    }
  }, []);

  // Carregar crianças da turma
  const carregarCriancas = useCallback(async (classroomId: string) => {
    if (!classroomId) { setCriancas([]); return; }
    setLoadingCriancas(true);
    try {
      const res = await http.get(`/lookup/classrooms/${classroomId}/children`);
      const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setCriancas(raw.map((c: any) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        name: `${c.firstName} ${c.lastName}`.trim(),
      })));
    } catch {
      toast.error('Não foi possível carregar as crianças.');
    } finally {
      setLoadingCriancas(false);
    }
  }, []);

  useEffect(() => { carregarTurmas(); }, [carregarTurmas]);

  const handleTurmaChange = (id: string) => {
    setTurmaId(id);
    setCriancaId('');
    setCriancas([]);
    setTipoAnalise('');
    if (id) carregarCriancas(id);
  };

  const turmaSel = turmas.find(t => t.id === turmaId);
  const criancaSel = criancas.find(c => c.id === criancaId);

  const precisaCrianca = tipoAnalise === 'evolucao-pedagogica';
  const podeExibir = tipoAnalise && turmaId;

  return (
    <PageShell
      title="Painel de Inteligência"
      subtitle="Análise pedagógica, nutricional e docente consolidada"
    >
      <div className="space-y-6">

        {/* ── Filtros encadeados ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Filtros de Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Filtro 1: Turma */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  1. Turma *
                </label>
                {loadingTurmas ? (
                  <div className="text-xs text-gray-400 py-2">Carregando turmas...</div>
                ) : (
                  <select
                    value={turmaId}
                    onChange={e => handleTurmaChange(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                  >
                    <option value="">Seleccionar turma...</option>
                    {turmas.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Filtro 2: Criança */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  2. Criança
                  <span className="font-normal text-gray-400 ml-1">(opcional)</span>
                </label>
                <select
                  value={criancaId}
                  onChange={e => setCriancaId(e.target.value)}
                  disabled={!turmaId || loadingCriancas}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingCriancas ? 'Carregando...' : !turmaId ? 'Seleccione a turma primeiro' : 'Todas as crianças'}
                  </option>
                  {criancas.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Filtro 3: Tipo */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  3. Tipo de Análise *
                </label>
                <select
                  value={tipoAnalise}
                  onChange={e => setTipoAnalise(e.target.value as TipoAnalise)}
                  disabled={!turmaId}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="">Seleccionar tipo...</option>
                  {TIPOS_ANALISE.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Aviso quando análise individual precisa de criança */}
            {precisaCrianca && !criancaId && turmaId && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Este tipo de análise requer uma criança seleccionada no filtro 2.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Cards de tipo (visual) ── */}
        {!tipoAnalise && turmaId && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Seleccione o tipo de análise
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIPOS_ANALISE.map(t => (
                <CardTipo
                  key={t.value}
                  tipo={t}
                  activo={tipoAnalise === t.value}
                  onClick={() => setTipoAnalise(t.value)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Estado inicial ── */}
        {!turmaId && !loadingTurmas && (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 mx-auto mb-3 text-indigo-200" />
            <p className="text-sm font-semibold text-gray-600">Painel de Inteligência Pedagógica</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Seleccione uma turma para começar a análise. Os dados são actualizados em tempo real.
            </p>
          </div>
        )}

        {/* ── Renderização do painel seleccionado ── */}
        {podeExibir && (
          <Card>
            <CardContent className="p-5">
              {tipoAnalise === 'visao-geral-turma' && (
                <PainelVisaoGeralTurma turmaId={turmaId} turmaNome={turmaSel?.name ?? '—'} />
              )}
              {tipoAnalise === 'evolucao-pedagogica' && (
                <PainelEvolucaoPedagogica
                  criancaId={criancaId}
                  criancaNome={criancaSel?.name ?? '—'}
                />
              )}
              {tipoAnalise === 'saude-nutricao' && (
                <PainelSaudeNutricao
                  criancaId={criancaId}
                  criancaNome={criancaSel?.name ?? '—'}
                  turmaId={turmaId}
                />
              )}
              {tipoAnalise === 'auditoria-docente' && (
                <PainelAuditoriaDocente turmaId={turmaId} turmaNome={turmaSel?.name ?? '—'} />
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </PageShell>
  );
}
