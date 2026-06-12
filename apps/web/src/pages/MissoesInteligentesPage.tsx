/**
 * MissoesInteligentesPage.tsx
 * Centro de Missões Inteligentes — /app/inteligencia/missoes
 *
 * Acesso: todos os perfis com acesso ao sistema
 * Cada perfil vê apenas missões relevantes (filtrado pelo backend via JWT)
 */

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { MissionCard, MissionPanel, type Mission, type MissionPriority } from '../components/insights/MissionCard';
import { RefreshCw, Filter, Zap, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';

const PRIORITY_LABELS: Record<string, string> = {
  '': 'Todas',
  CRITICAL: 'Crítico',
  HIGH: 'Alto',
  MEDIUM: 'Médio',
  LOW: 'Baixo',
};

const TYPE_LABELS: Record<string, string> = {
  '': 'Todos os tipos',
  ALERTA_OPERACIONAL: 'Alertas',
  RDIC_PENDENTE: 'RDICs',
  BAIXA_FREQUENCIA: 'Frequência',
  OBSERVACAO_DESENVOLVIMENTO: 'Desenvolvimento',
  RESTRICAO_ALIMENTAR_CRITICA: 'Nutrição',
  CRIANCA_SEM_DIARIO: 'Diário',
};

export default function MissoesInteligentesPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [periodDays, setPeriodDays] = useState(14);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const params: Record<string, string> = { periodDays: String(periodDays) };
      if (filterPriority) params.priority = filterPriority;
      const res = await http.get('/insights/missions', { params });
      setMissions(res.data?.missions ?? []);
      setSummary(res.data?.summary ?? {});
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [filterPriority, periodDays]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtered = filterType
    ? missions.filter((m) => m.type === filterType)
    : missions;

  return (
    <PageShell
      title="Centro de Missões Inteligentes"
      description="Tarefas acionáveis geradas automaticamente a partir dos dados do sistema. Revisão humana sempre necessária."
      headerActions={
        <button
          onClick={carregar}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      }
    >
      <div className="space-y-5">

        {/* KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Crítico', value: summary.CRITICAL ?? 0, color: '#dc2626', bg: '#fef2f2' },
            { label: 'Alto',    value: summary.HIGH    ?? 0, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Médio',   value: summary.MEDIUM  ?? 0, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Baixo',   value: summary.LOW     ?? 0, color: '#22c55e', bg: '#f0fdf4' },
          ].map((k) => (
            <div key={k.label} style={{ background: k.bg, border: `0.5px solid ${k.color}30`, borderRadius: 16, padding: '14px 16px' }}>
              <p style={{ fontSize: 28, fontWeight: 600, margin: 0, color: k.color, letterSpacing: -1 }}>
                {loading ? '—' : k.value}
              </p>
              <p style={{ fontSize: 11, color: k.color, margin: '3px 0 0', opacity: 0.7, fontWeight: 500 }}>{k.label}</p>
            </div>
          ))}
        </section>

        {/* Filtros */}
        <section className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Filtros:</span>
            </div>

            {/* Prioridade */}
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilterPriority(val)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    filterPriority === val
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-slate-200" />

            {/* Tipo */}
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(TYPE_LABELS).slice(0, 4).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilterType(val)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    filterType === val
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-slate-200" />

            {/* Período */}
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-500 bg-white"
            >
              <option value={7}>7 dias</option>
              <option value={14}>14 dias</option>
              <option value={30}>30 dias</option>
            </select>
          </div>
        </section>

        {/* Aviso revisão humana */}
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>Todas as missões são geradas automaticamente e <strong>requerem revisão humana</strong> antes de qualquer ação. O sistema não toma decisões pedagógicas, clínicas ou administrativas de forma autônoma.</span>
        </div>

        {/* Lista de missões */}
        {erro && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {erro}
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-slate-400 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-slate-300" />
            Gerando missões...
          </div>
        )}

        {!loading && !erro && filtered.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle size={40} className="mx-auto mb-3" style={{ color: '#10b981' }} />
            <p className="text-slate-500 text-sm font-medium">Nenhuma missão pendente</p>
            <p className="text-slate-400 text-xs mt-1">O sistema não identificou pendências críticas no período selecionado.</p>
          </div>
        )}

        {!loading && !erro && filtered.length > 0 && (
          <section className="space-y-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              {filtered.length} missão{filtered.length !== 1 ? 'ões' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
            </p>
            {filtered.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </section>
        )}
      </div>
    </PageShell>
  );
}
