import { useMemo, useSyncExternalStore } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Command, RefreshCw, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../app/AuthProvider';
import { MissionCard, PRIORITY_CONFIG, type Mission, type MissionPriority } from '../insights/MissionCard';
import { useAgent } from './AgentContext';
import { useMissions } from './useMissions';
import { getNavSnapshot, subscribeNav } from './navRegistry';

const PRIORITY_ORDER: MissionPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/** Atalhos "inteligentes": só aparecem se o menu do usuário realmente os oferece. */
const SMART_SHORTCUTS: Array<{ path: string; title: string; hint: string; ai?: boolean }> = [
  { path: '/app/planejamentos',     title: 'Planejar com IA',        hint: 'Sugestões de atividade alinhadas à matriz', ai: true },
  { path: '/app/rdic-crianca',      title: 'Relatório da criança',   hint: 'Rascunho assistido do desenvolvimento',      ai: true },
  { path: '/app/rdic-coord',        title: 'Revisar relatórios',     hint: 'Aprovar ou devolver com comentário' },
  { path: '/app/inteligencia',      title: 'Painel de Inteligência', hint: 'Indicadores e diagnósticos da unidade',       ai: true },
  { path: '/app/diario-calendario', title: 'Diário de bordo',        hint: 'Registrar o dia da turma' },
  { path: '/app/painel-alergias',   title: 'Alergias e dietas',      hint: 'Alertas de saúde e alimentação' },
  { path: '/app/reports',           title: 'Relatórios',             hint: 'Consolidados e exportações' },
  { path: '/app/central',           title: 'Análises centrais',      hint: 'Visão consolidada da rede',                   ai: true },
];

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function sortMissions(list: Mission[]): Mission[] {
  return [...list].sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
}

/** Resumo em linguagem natural, montado a partir dos números reais (sem texto inventado). */
function buildSummary(summary: Record<string, number>, total: number, top?: Mission): string {
  const crit = summary.CRITICAL ?? 0;
  const high = summary.HIGH ?? 0;
  if (total === 0) return 'Nenhuma pendência detectada nos últimos 14 dias. Tudo em dia por aqui.';
  const parts: string[] = [];
  if (crit > 0) parts.push(`${crit} ${crit === 1 ? 'item crítico' : 'itens críticos'}`);
  if (high > 0) parts.push(`${high} de prioridade alta`);
  const head = parts.length > 0
    ? `Há ${parts.join(' e ')} pedindo atenção.`
    : `Há ${total} ${total === 1 ? 'missão' : 'missões'} acompanhando o seu dia.`;
  return top ? `${head} Comece por: “${top.title}”.` : head;
}

export function AgentPanel() {
  const { panelOpen, closePanel, openPalette } = useAgent();
  const { user } = useAuth() as any;
  const userKey = String(user?.id ?? user?.user?.id ?? user?.email ?? 'anon');
  const { missions, summary, loading, error, refresh } = useMissions(panelOpen, userKey);
  const nav = useSyncExternalStore(subscribeNav, getNavSnapshot);

  const firstName = String(user?.nome || user?.user?.name || '').trim().split(/\s+/)[0] || '';
  const sorted = useMemo(() => sortMissions(missions), [missions]);
  const shortcuts = useMemo(() => {
    const available = new Set(nav.map((n) => n.path));
    return SMART_SHORTCUTS.filter((s) => available.has(s.path)).slice(0, 6);
  }, [nav]);
  const total = missions.length;

  return (
    <Dialog.Root open={panelOpen} onOpenChange={(o) => { if (!o) closePanel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-[var(--surface-overlay)] backdrop-blur-[2px] data-[state=open]:animate-fade" />
        <Dialog.Content
          aria-describedby="agent-desc"
          className="fixed right-0 top-0 z-[71] flex h-dvh w-full max-w-[27rem] flex-col border-l border-[var(--border-default)] bg-[var(--surface-modal)] shadow-ds-lg animate-ds-slide-left focus:outline-none"
        >
          {/* Cabeçalho */}
          <header className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <span aria-hidden="true" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-ds-sm dark:text-[#06140d]" style={{ background: 'var(--ai-gradient)' }}>
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <Dialog.Title className="font-display text-base font-bold leading-tight tracking-tight text-[var(--text-primary)]">
                  Assistente Conexa
                </Dialog.Title>
                <p id="agent-desc" className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  Seu copiloto pedagógico — sugere, você decide.
                </p>
              </div>
            </div>
            <Dialog.Close
              aria-label="Fechar assistente"
              className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </header>

          {/* Corpo */}
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            {/* Resumo */}
            <section className="ds-ai-surface p-4">
              <p className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
                {greeting()}{firstName ? `, ${firstName}` : ''}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                {loading && total === 0 ? 'Analisando os dados do sistema…' : error ? error : buildSummary(summary, total, sorted[0])}
              </p>
              {!error && (
                <dl className="mt-3.5 grid grid-cols-4 gap-2">
                  {PRIORITY_ORDER.map((p) => (
                    <div key={p} className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-1.5 text-center">
                      <dd className="font-display text-lg font-bold tabular-nums leading-none" style={{ color: PRIORITY_CONFIG[p].text }}>
                        {loading && total === 0 ? '–' : summary[p] ?? 0}
                      </dd>
                      <dt className="mt-1 text-[11px] text-[var(--text-secondary)]">{PRIORITY_CONFIG[p].label}</dt>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            {/* Prioridades */}
            <section aria-labelledby="agent-prior">
              <div className="mb-2.5 flex items-center justify-between">
                <h3 id="agent-prior" className="ds-section-label !mb-0">Prioridades agora</h3>
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                </button>
              </div>

              {sorted.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {sorted.slice(0, 5).map((m) => <MissionCard key={m.id} mission={m} compact />)}
                </div>
              ) : !loading && !error ? (
                <div className="flex items-center gap-2.5 rounded-ds-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-inset)] p-4 text-[13px] text-[var(--text-secondary)]">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[var(--success)]" />
                  Sem pendências no momento.
                </div>
              ) : null}

              {total > 5 && (
                <Link
                  to="/app/inteligencia/missoes"
                  onClick={closePanel}
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--text-brand)] hover:underline"
                >
                  Ver todas as {total} missões <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </section>

            {/* Atalhos */}
            {shortcuts.length > 0 && (
              <section aria-labelledby="agent-short">
                <h3 id="agent-short" className="ds-section-label">Atalhos inteligentes</h3>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {shortcuts.map((s) => (
                    <li key={s.path}>
                      <Link
                        to={s.path}
                        onClick={closePanel}
                        className="group flex h-full flex-col gap-1 rounded-ds-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 transition-[border-color,box-shadow] hover:border-[var(--border-strong)] hover:shadow-ds-sm"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-[var(--text-primary)]">{s.title}</span>
                          {s.ai && <span className="ds-ai-chip"><Sparkles className="h-3 w-3" />IA</span>}
                        </span>
                        <span className="text-xs leading-snug text-[var(--text-secondary)]">{s.hint}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Rodapé */}
          <footer className="space-y-2.5 border-t border-[var(--border-subtle)] bg-[var(--surface-inset)] px-5 py-3.5">
            <button
              onClick={openPalette}
              className="flex w-full items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2 text-[13px] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
            >
              <span className="flex items-center gap-2"><Command className="h-4 w-4" /> Buscar páginas e ações</span>
              <kbd className="rounded border border-[var(--border-default)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[11px]">Ctrl K</kbd>
            </button>
            <p className="text-center text-[11px] leading-snug text-[var(--text-tertiary)]">
              Sugestões automáticas exigem revisão humana. Nenhum dado é alterado sem a sua confirmação.
            </p>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
