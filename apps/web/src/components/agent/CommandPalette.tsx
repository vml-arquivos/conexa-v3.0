import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Moon, Search, Sparkles, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAgent } from './AgentContext';
import { getNavSnapshot, subscribeNav } from './navRegistry';

interface PaletteItem {
  id: string;
  label: string;
  section: string;
  icon?: React.ReactNode;
  hint?: string;
  run: () => void;
}

const normalize = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function CommandPalette() {
  const { paletteOpen, closePalette, openPanel } = useAgent();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const nav = useSyncExternalStore(subscribeNav, getNavSnapshot);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { if (paletteOpen) { setQuery(''); setActive(0); } }, [paletteOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const pages: PaletteItem[] = nav.map((n) => ({
      id: `${n.section}:${n.path}`,
      label: n.label,
      section: n.section,
      icon: n.icon,
      run: () => navigate(n.path),
    }));
    const actions: PaletteItem[] = [
      { id: 'act:agent', label: 'Abrir Assistente Conexa', section: 'Ações', icon: <Sparkles className="h-4 w-4" />, hint: 'Ctrl J', run: openPanel },
      {
        id: 'act:theme',
        label: theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro',
        section: 'Ações',
        icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        run: toggleTheme,
      },
    ];
    return [...pages, ...actions];
  }, [nav, navigate, openPanel, theme, toggleTheme]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return items;
    return items.filter((i) => normalize(`${i.label} ${i.section}`).includes(q));
  }, [items, query]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (item?: PaletteItem) => {
    if (!item) return;
    closePalette();
    // aguarda o fechamento para não competir com o foco do diálogo
    setTimeout(item.run, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(filtered[active]); }
  };

  let lastSection = '';

  return (
    <Dialog.Root open={paletteOpen} onOpenChange={(o) => { if (!o) closePalette(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-[var(--surface-overlay)] backdrop-blur-[2px] data-[state=open]:animate-fade" />
        <Dialog.Content
          aria-describedby={undefined}
          onKeyDown={onKeyDown}
          className="fixed left-1/2 top-[12vh] z-[71] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-ds-2xl border border-[var(--border-default)] bg-[var(--surface-modal)] shadow-ds-lg animate-ds-rise focus:outline-none"
        >
          <Dialog.Title className="sr-only">Buscar páginas e ações</Dialog.Title>
          <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] px-4">
            <Search className="h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar página ou ação…"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-activedescendant={filtered[active] ? `palette-opt-${active}` : undefined}
              className="h-12 w-full bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            />
            <kbd className="hidden rounded border border-[var(--border-default)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)] sm:block">Esc</kbd>
          </div>

          <ul id="palette-list" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
            {filtered.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]">Nada encontrado para “{query}”.</li>
            )}
            {filtered.map((item, idx) => {
              const header = item.section !== lastSection;
              lastSection = item.section;
              return (
                <li key={item.id} role="presentation">
                  {header && (
                    <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{item.section}</p>
                  )}
                  <div
                    id={`palette-opt-${idx}`}
                    role="option"
                    aria-selected={idx === active}
                    data-idx={idx}
                    onMouseMove={() => setActive(idx)}
                    onClick={() => choose(item)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                      idx === active ? 'bg-[var(--surface-brand)] text-[var(--text-brand)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${idx === active ? 'text-[var(--text-brand)]' : 'text-[var(--text-tertiary)]'}`}>{item.icon}</span>
                    <span className="flex-1 truncate font-medium">{item.label}</span>
                    {item.hint && <kbd className="rounded border border-[var(--border-default)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">{item.hint}</kbd>}
                    {idx === active && <CornerDownLeft className="h-3.5 w-3.5 flex-shrink-0 opacity-70" aria-hidden="true" />}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-inset)] px-4 py-2 text-[11px] text-[var(--text-tertiary)]">
            <span>↑ ↓ navegar · Enter abrir</span>
            <span>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
