import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/ui/PageShell';
import http from '../api/http';
import {
  AlertTriangle,
  Apple,
  Search,
  Filter,
  RefreshCw,
  User,
  BookOpen,
  Printer,
  Heart,
  Pill,
  Phone,
  Droplets,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Utensils,
  Activity,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Classroom { id: string; name: string }

interface DietaryRestriction {
  id: string;
  type: string;
  name: string;
  description?: string;
  severity?: string;
  allowedFoods?: string;
  forbiddenFoods?: string;
}

interface ChildHealth {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  photoUrl?: string;
  bloodType?: string;
  allergies?: string;
  medicalConditions?: string;
  medicationNeeds?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  enrollments: { classroom: Classroom }[];
  dietaryRestrictions: DietaryRestriction[];
}

interface HealthStats {
  total: number;
  comAlergia: number;
  comDieta: number;
  comCondicaoMedica: number;
  comMedicamento: number;
  casosCriticos: number;
}

interface DashboardData {
  children: ChildHealth[];
  stats: HealthStats;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = {
  ALERGIA: 'Alergia',
  INTOLERANCIA: 'Intolerância',
  PREFERENCIA: 'Preferência',
  RELIGIOSA: 'Religiosa',
  MEDICA: 'Médica',
  OUTRA: 'Outra',
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  severa:   { label: 'SEVERA',   color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-500',    icon: '🚨' },
  moderada: { label: 'MODERADA', color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-400', icon: '⚠️' },
  leve:     { label: 'LEVE',     color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-400', icon: '⚡' },
};

function calcIdade(dateOfBirth: string): string {
  const hoje = new Date();
  const nasc = new Date(dateOfBirth);
  const anos = hoje.getFullYear() - nasc.getFullYear();
  const meses = hoje.getMonth() - nasc.getMonth();
  if (anos === 0) return `${meses < 0 ? 0 : meses} meses`;
  return `${anos} ano${anos !== 1 ? 's' : ''}`;
}

function isCritico(child: ChildHealth): boolean {
  return child.dietaryRestrictions.some(r => r.severity === 'severa');
}

// ─── Componente: Card de Criança ──────────────────────────────────────────────
function ChildHealthCard({ child, critico }: { child: ChildHealth; critico: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const turma = child.enrollments[0]?.classroom?.name ?? '—';

  const temAlergiasDiretas = !!child.allergies;
  const temCondicaoMedica = !!child.medicalConditions;
  const temMedicamento = !!child.medicationNeeds;
  const temRestricoes = child.dietaryRestrictions.length > 0;
  const temContato = !!child.emergencyContactName;

  const restricoesSeveras = child.dietaryRestrictions.filter(r => r.severity === 'severa');
  const restricoesDemais = child.dietaryRestrictions.filter(r => r.severity !== 'severa');

  return (
    <div className={`rounded-xl border-2 ${critico ? 'border-red-500 shadow-red-100 shadow-lg' : 'border-gray-200'} bg-white overflow-hidden`}>
      {/* Cabeçalho do card */}
      <div className={`px-4 py-3 flex items-center justify-between gap-3 ${critico ? 'bg-red-50' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${critico ? 'bg-red-200' : 'bg-indigo-100'}`}>
            {child.photoUrl ? (
              <img src={child.photoUrl} alt={child.firstName} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <User className={`h-5 w-5 ${critico ? 'text-red-600' : 'text-indigo-600'}`} />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 truncate text-base">
              {child.firstName} {child.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {calcIdade(child.dateOfBirth)} · <span className="font-medium text-gray-700">{turma}</span>
              {child.bloodType && <span className="ml-2 font-semibold text-red-600">Tipo {child.bloodType}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {critico && (
            <span className="text-xs font-black px-2 py-1 rounded-full bg-red-600 text-white animate-pulse">
              🚨 CRÍTICO
            </span>
          )}
          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
            {child.dietaryRestrictions.length} restrição{child.dietaryRestrictions.length !== 1 ? 'ões' : ''}
          </span>
        </div>
      </div>

      {/* Corpo: informações críticas sempre visíveis */}
      <div className="px-4 py-3 space-y-2">

        {/* Alergias diretas (campo allergies do Child) */}
        {temAlergiasDiretas && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-red-700 uppercase tracking-wide">⚠️ Alergias</p>
              <p className="text-sm text-red-800 font-medium">{child.allergies}</p>
            </div>
          </div>
        )}

        {/* Restrições severas — sempre visíveis */}
        {restricoesSeveras.map(r => (
          <div key={r.id} className="rounded-lg bg-red-50 border-l-4 border-red-500 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Apple className="h-4 w-4 text-red-600 flex-shrink-0" />
                <p className="text-sm font-bold text-red-800">{r.name}</p>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-red-600 text-white">🚨 SEVERA</span>
            </div>
            <p className="text-xs text-red-600 mt-0.5">{TYPE_LABEL[r.type] ?? r.type}</p>
            {r.forbiddenFoods && (
              <p className="text-xs text-red-700 mt-1">
                <span className="font-semibold">🚫 Proibido:</span> {r.forbiddenFoods}
              </p>
            )}
            {r.allowedFoods && (
              <p className="text-xs text-green-700 mt-0.5">
                <span className="font-semibold">✅ Permitido:</span> {r.allowedFoods}
              </p>
            )}
          </div>
        ))}

        {/* Condição médica — sempre visível */}
        {temCondicaoMedica && (
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
            <Activity className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Condição Médica / Laudo</p>
              <p className="text-sm text-blue-800">{child.medicalConditions}</p>
            </div>
          </div>
        )}

        {/* Medicamentos — sempre visível */}
        {temMedicamento && (
          <div className="flex items-start gap-2 rounded-lg bg-purple-50 border border-purple-200 px-3 py-2">
            <Pill className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Medicação / Plano de Ação</p>
              <p className="text-sm text-purple-800">{child.medicationNeeds}</p>
            </div>
          </div>
        )}

        {/* Contato de emergência — sempre visível */}
        {temContato && (
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
            <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Contato de Emergência</p>
              <p className="text-sm text-gray-700">
                {child.emergencyContactName}
                {child.emergencyContactPhone && <span className="ml-2 font-semibold text-indigo-600">{child.emergencyContactPhone}</span>}
              </p>
            </div>
          </div>
        )}

        {/* Demais restrições (não severas) — expansível */}
        {restricoesDemais.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Ocultar' : 'Ver'} {restricoesDemais.length} restrição{restricoesDemais.length !== 1 ? 'ões' : ''} adicional{restricoesDemais.length !== 1 ? 'is' : ''}
            </button>
            {expanded && (
              <div className="mt-2 space-y-2">
                {restricoesDemais.map(r => {
                  const sev = SEVERITY_CONFIG[r.severity ?? 'leve'] ?? SEVERITY_CONFIG['leve'];
                  return (
                    <div key={r.id} className={`rounded-lg border-l-4 ${sev.border} ${sev.bg} px-3 py-2`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Apple className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
                          <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
                          {sev.icon} {sev.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{TYPE_LABEL[r.type] ?? r.type}</p>
                      {r.forbiddenFoods && (
                        <p className="text-xs text-red-700 mt-1">
                          <span className="font-semibold">🚫 Proibido:</span> {r.forbiddenFoods}
                        </p>
                      )}
                      {r.allowedFoods && (
                        <p className="text-xs text-green-700 mt-0.5">
                          <span className="font-semibold">✅ Permitido:</span> {r.allowedFoods}
                        </p>
                      )}
                      {r.description && (
                        <p className="text-xs text-gray-600 mt-0.5 italic">{r.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sem nenhuma informação expandida */}
        {!temAlergiasDiretas && !temCondicaoMedica && !temMedicamento && !temRestricoes && (
          <p className="text-xs text-gray-400 italic">Sem informações de saúde cadastradas.</p>
        )}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function PainelAlergiasPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroSeveridade, setFiltroSeveridade] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const params: Record<string, string> = {};
      if (filtroTurma) params.classroomId = filtroTurma;
      const { data: resp } = await http.get('/children/health/dashboard', { params });
      setData(resp);
    } catch {
      // fallback: tentar endpoint legado
      try {
        const { data: legado } = await http.get('/children/dietary-restrictions/unidade');
        const childMap = new Map<string, ChildHealth>();
        for (const r of legado) {
          const c = r.child;
          if (!childMap.has(c.id)) {
            childMap.set(c.id, {
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
              dateOfBirth: c.dateOfBirth,
              enrollments: c.enrollments ?? [],
              dietaryRestrictions: [],
            });
          }
          childMap.get(c.id)!.dietaryRestrictions.push({
            id: r.id,
            type: r.type,
            name: r.name,
            description: r.description,
            severity: r.severity,
            allowedFoods: r.allowedFoods,
            forbiddenFoods: r.forbiddenFoods,
          });
        }
        const children = Array.from(childMap.values());
        setData({
          children,
          stats: {
            total: children.length,
            comAlergia: children.filter(c => c.dietaryRestrictions.some(r => r.type === 'ALERGIA')).length,
            comDieta: children.filter(c => c.dietaryRestrictions.some(r => r.type !== 'ALERGIA')).length,
            comCondicaoMedica: 0,
            comMedicamento: 0,
            casosCriticos: children.filter(c => c.dietaryRestrictions.some(r => r.severity === 'severa')).length,
          },
        });
      } catch {
        setErro('Não foi possível carregar as informações de saúde.');
      }
    } finally {
      setLoading(false);
    }
  }, [filtroTurma]);

  useEffect(() => { carregar(); }, [carregar]);

  // ─── Listas derivadas ─────────────────────────────────────────────────────
  const children = data?.children ?? [];
  const stats = data?.stats;

  // Turmas únicas para o filtro
  const turmas = Array.from(
    new Map(
      children.flatMap(c => c.enrollments.map(e => [e.classroom.id, e.classroom]))
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Filtros aplicados no frontend
  const filtrados = children.filter(c => {
    const nome = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchBusca = !busca || nome.includes(busca.toLowerCase()) ||
      c.allergies?.toLowerCase().includes(busca.toLowerCase()) ||
      c.medicalConditions?.toLowerCase().includes(busca.toLowerCase()) ||
      c.dietaryRestrictions.some(r => r.name.toLowerCase().includes(busca.toLowerCase()));

    const matchTurma = !filtroTurma || c.enrollments[0]?.classroom?.id === filtroTurma;

    const matchSev = !filtroSeveridade || (
      filtroSeveridade === 'severa' ? isCritico(c) :
      c.dietaryRestrictions.some(r => r.severity === filtroSeveridade)
    );

    const matchTipo = !filtroTipo || c.dietaryRestrictions.some(r => r.type === filtroTipo);

    const matchCategoria = !filtroCategoria || (
      filtroCategoria === 'alergia' ? (c.allergies || c.dietaryRestrictions.some(r => r.type === 'ALERGIA')) :
      filtroCategoria === 'dieta' ? c.dietaryRestrictions.some(r => r.type !== 'ALERGIA') :
      filtroCategoria === 'medica' ? !!c.medicalConditions :
      filtroCategoria === 'medicamento' ? !!c.medicationNeeds :
      true
    );

    return matchBusca && matchTurma && matchSev && matchTipo && matchCategoria;
  });

  const criticos = filtrados.filter(isCritico);
  const demais = filtrados.filter(c => !isCritico(c));

  return (
    <PageShell
      title="Painel de Saúde — Alergias e Dietas"
      subtitle="Informações críticas de saúde por criança · Atualização em tempo real"
    >
      {/* ─── Alerta de casos críticos no topo ─── */}
      {!loading && criticos.length > 0 && (
        <div className="mb-5 rounded-xl bg-red-600 text-white px-5 py-4 flex items-center gap-4 shadow-lg">
          <ShieldAlert className="h-7 w-7 flex-shrink-0" />
          <div>
            <p className="font-black text-base uppercase tracking-wide">
              🚨 {criticos.length} criança{criticos.length !== 1 ? 's' : ''} com restrição SEVERA
            </p>
            <p className="text-sm opacity-90 mt-0.5">
              {criticos.map(c => `${c.firstName} ${c.lastName}`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* ─── KPIs ─── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Crianças com info de saúde', value: stats.total,            color: 'text-indigo-600', bg: 'bg-indigo-50',  icon: <User className="h-4 w-4" /> },
            { label: 'Com alergias',               value: stats.comAlergia,        color: 'text-red-600',    bg: 'bg-red-50',     icon: <AlertTriangle className="h-4 w-4" /> },
            { label: 'Com dieta especial',          value: stats.comDieta,          color: 'text-orange-600', bg: 'bg-orange-50',  icon: <Utensils className="h-4 w-4" /> },
            { label: 'Com condição médica',         value: stats.comCondicaoMedica, color: 'text-blue-600',   bg: 'bg-blue-50',    icon: <Activity className="h-4 w-4" /> },
            { label: 'Com medicamento',             value: stats.comMedicamento,    color: 'text-purple-600', bg: 'bg-purple-50',  icon: <Pill className="h-4 w-4" /> },
            { label: 'Casos críticos',              value: stats.casosCriticos,     color: 'text-red-700',    bg: 'bg-red-100',    icon: <ShieldAlert className="h-4 w-4" /> },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl ${s.bg} p-3 text-center`}>
              <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-600 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Filtros ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
          <Filter className="h-4 w-4" />
          Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Busca */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar criança, alergia, condição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Turma */}
          <select
            value={filtroTurma}
            onChange={(e) => setFiltroTurma(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Categoria */}
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as categorias</option>
            <option value="alergia">🚨 Alergias</option>
            <option value="dieta">🥗 Dietas especiais</option>
            <option value="medica">🏥 Condição médica</option>
            <option value="medicamento">💊 Medicamentos</option>
          </select>

          {/* Severidade */}
          <select
            value={filtroSeveridade}
            onChange={(e) => setFiltroSeveridade(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as severidades</option>
            <option value="severa">🚨 Severa (crítico)</option>
            <option value="moderada">⚠️ Moderada</option>
            <option value="leve">⚡ Leve</option>
          </select>
        </div>
      </div>

      {/* ─── Ações ─── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {filtrados.length} criança{filtrados.length !== 1 ? 's' : ''} encontrada{filtrados.length !== 1 ? 's' : ''}
          {criticos.length > 0 && (
            <span className="ml-2 font-semibold text-red-600">· {criticos.length} crítica{criticos.length !== 1 ? 's' : ''}</span>
          )}
        </p>
        <div className="flex gap-2">
          <button
            onClick={carregar}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Imprimir lista
          </button>
        </div>
      </div>

      {/* ─── Conteúdo ─── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <p className="text-sm text-gray-500">Carregando informações de saúde...</p>
        </div>
      ) : erro ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">{erro}</p>
          <button onClick={carregar} className="mt-3 text-sm text-red-600 underline">Tentar novamente</button>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-12 text-center">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma informação de saúde encontrada</p>
          <p className="text-gray-400 text-sm mt-1">
            {children.length > 0
              ? 'Ajuste os filtros para ver mais resultados.'
              : 'Nenhuma informação de saúde registrada para esta unidade.'}
          </p>
        </div>
      ) : (
        <>
          {/* ─── Casos Críticos primeiro ─── */}
          {criticos.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-200">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <h2 className="text-sm font-black text-red-700 uppercase tracking-wider">
                  Atenção Imediata — Casos Críticos ({criticos.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {criticos.map(c => (
                  <ChildHealthCard key={c.id} child={c} critico={true} />
                ))}
              </div>
            </section>
          )}

          {/* ─── Demais crianças ─── */}
          {demais.length > 0 && (
            <section>
              {criticos.length > 0 && (
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                  <Heart className="h-4 w-4 text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                    Demais Restrições ({demais.length})
                  </h2>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {demais.map(c => (
                  <ChildHealthCard key={c.id} child={c} critico={false} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </PageShell>
  );
}
