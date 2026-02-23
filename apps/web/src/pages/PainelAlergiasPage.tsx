import { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
  Printer,
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Classroom { id: string; name: string }
interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  enrollments: { classroom: Classroom }[];
}
interface DietaryRestriction {
  id: string;
  type: string;
  name: string;
  description?: string;
  severity?: string;
  allowedFoods?: string;
  forbiddenFoods?: string;
  isActive: boolean;
  createdAt: string;
  child: Child;
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

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  severa:    { label: 'Severa',    color: 'text-red-700',    bg: 'bg-red-100',    icon: '🚨' },
  moderada:  { label: 'Moderada',  color: 'text-orange-700', bg: 'bg-orange-100', icon: '⚠️' },
  leve:      { label: 'Leve',      color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '⚡' },
};

function calcIdade(dateOfBirth: string): string {
  const hoje = new Date();
  const nasc = new Date(dateOfBirth);
  const anos = hoje.getFullYear() - nasc.getFullYear();
  const meses = hoje.getMonth() - nasc.getMonth();
  if (anos === 0) return `${meses < 0 ? 0 : meses} meses`;
  return `${anos} ano${anos !== 1 ? 's' : ''}`;
}

// ─── Componente Card de Restrição ─────────────────────────────────────────────
function RestricaoCard({ r }: { r: DietaryRestriction }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[r.severity ?? 'leve'] ?? SEVERITY_CONFIG['leve'];
  const turma = r.child.enrollments[0]?.classroom?.name ?? '—';

  return (
    <div className={`rounded-xl border-l-4 ${r.severity === 'severa' ? 'border-red-500' : r.severity === 'moderada' ? 'border-orange-400' : 'border-yellow-400'} bg-white shadow-sm p-4`}>
      <div className="flex items-start justify-between gap-3">
        {/* Criança */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {r.child.firstName} {r.child.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {calcIdade(r.child.dateOfBirth)} · Turma: <span className="font-medium text-gray-700">{turma}</span>
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
            {sev.icon} {sev.label}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {TYPE_LABEL[r.type] ?? r.type}
          </span>
        </div>
      </div>

      {/* Restrição principal */}
      <div className="mt-3 flex items-center gap-2">
        <Apple className="h-4 w-4 text-red-500 flex-shrink-0" />
        <p className="text-sm font-medium text-gray-800">{r.name}</p>
      </div>

      {/* Alimentos proibidos — sempre visível se existir */}
      {r.forbiddenFoods && (
        <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold text-red-700 mb-0.5">🚫 Alimentos proibidos:</p>
          <p className="text-xs text-red-800">{r.forbiddenFoods}</p>
        </div>
      )}

      {/* Expandir para mais detalhes */}
      {(r.description || r.allowedFoods) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Menos detalhes' : 'Ver mais detalhes'}
        </button>
      )}

      {expanded && (
        <div className="mt-2 space-y-2">
          {r.description && (
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold text-gray-600 mb-0.5">Observações:</p>
              <p className="text-xs text-gray-700">{r.description}</p>
            </div>
          )}
          {r.allowedFoods && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
              <p className="text-xs font-semibold text-green-700 mb-0.5">✅ Alimentos permitidos:</p>
              <p className="text-xs text-green-800">{r.allowedFoods}</p>
            </div>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-400">
        Registrado em {new Date(r.createdAt).toLocaleDateString('pt-BR')}
      </p>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function PainelAlergiasPage() {
  const [restricoes, setRestricoes] = useState<DietaryRestriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroSeveridade, setFiltroSeveridade] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');

  const carregar = async () => {
    setLoading(true);
    setErro('');
    try {
      const { data } = await http.get('/children/dietary-restrictions/unidade');
      setRestricoes(data);
    } catch (e: any) {
      setErro('Não foi possível carregar as restrições alimentares.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  // ─── Filtros ───────────────────────────────────────────────────────────────
  const turmas = Array.from(
    new Set(restricoes.map((r) => r.child.enrollments[0]?.classroom?.name).filter(Boolean))
  ).sort();

  const filtradas = restricoes.filter((r) => {
    const nome = `${r.child.firstName} ${r.child.lastName}`.toLowerCase();
    const matchBusca = !busca || nome.includes(busca.toLowerCase()) || r.name.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = !filtroTipo || r.type === filtroTipo;
    const matchSev = !filtroSeveridade || r.severity === filtroSeveridade;
    const matchTurma = !filtroTurma || r.child.enrollments[0]?.classroom?.name === filtroTurma;
    return matchBusca && matchTipo && matchSev && matchTurma;
  });

  // ─── Estatísticas ──────────────────────────────────────────────────────────
  const totalSeveras = restricoes.filter((r) => r.severity === 'severa').length;
  const totalAlergias = restricoes.filter((r) => r.type === 'ALERGIA').length;
  const totalCriancas = new Set(restricoes.map((r) => r.child.id)).size;

  return (
    <PageShell
      title="Painel de Alergias e Dietas"
      subtitle="Restrições alimentares ativas por criança na unidade"
      
    >
      {/* ─── Estatísticas ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Crianças com restrições', value: totalCriancas, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total de restrições', value: restricoes.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Alergias', value: totalAlergias, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Casos severos', value: totalSeveras, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl ${s.bg} p-4 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-600 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Filtros ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />
          Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar criança ou restrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filtroSeveridade}
            onChange={(e) => setFiltroSeveridade(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as severidades</option>
            <option value="severa">🚨 Severa</option>
            <option value="moderada">⚠️ Moderada</option>
            <option value="leve">⚡ Leve</option>
          </select>
          <select
            value={filtroTurma}
            onChange={(e) => setFiltroTurma(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Ações ─── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {filtradas.length} restrição{filtradas.length !== 1 ? 'ões' : ''} encontrada{filtradas.length !== 1 ? 's' : ''}
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
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : erro ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">{erro}</p>
          <button onClick={carregar} className="mt-3 text-sm text-red-600 underline">Tentar novamente</button>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-12 text-center">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma restrição alimentar encontrada</p>
          <p className="text-gray-400 text-sm mt-1">
            {restricoes.length > 0
              ? 'Ajuste os filtros para ver mais resultados.'
              : 'Nenhuma restrição ativa registrada para esta unidade.'}
          </p>
        </div>
      ) : (
        <>
          {/* Casos severos primeiro — destaque */}
          {filtradas.some((r) => r.severity === 'severa') && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <h3 className="text-sm font-bold text-red-700 uppercase tracking-wide">
                  Casos Severos — Atenção Imediata
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtradas.filter((r) => r.severity === 'severa').map((r) => (
                  <RestricaoCard key={r.id} r={r} />
                ))}
              </div>
            </div>
          )}

          {/* Demais casos */}
          {filtradas.some((r) => r.severity !== 'severa') && (
            <div>
              {filtradas.some((r) => r.severity === 'severa') && (
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Demais Restrições
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtradas.filter((r) => r.severity !== 'severa').map((r) => (
                  <RestricaoCard key={r.id} r={r} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
