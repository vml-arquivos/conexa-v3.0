import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface AgentContextValue {
  panelOpen: boolean;
  paletteOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  openPalette: () => void;
  closePalette: () => void;
}

const AgentContext = createContext<AgentContextValue | undefined>(undefined);

/**
 * Estado global do Assistente (painel lateral) e da Paleta de Comandos.
 * Atalhos: Ctrl/⌘ + K abre a paleta; Ctrl/⌘ + J abre o assistente.
 */
export function AgentProvider({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openPanel = useCallback(() => { setPaletteOpen(false); setPanelOpen(true); }, []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const togglePanel = useCallback(() => { setPaletteOpen(false); setPanelOpen((v) => !v); }, []);
  const openPalette = useCallback(() => { setPanelOpen(false); setPaletteOpen(true); }, []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === 'k') { e.preventDefault(); setPanelOpen(false); setPaletteOpen((v) => !v); }
      if (key === 'j') { e.preventDefault(); setPaletteOpen(false); setPanelOpen((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo<AgentContextValue>(() => ({
    panelOpen, paletteOpen, openPanel, closePanel, togglePanel, openPalette, closePalette,
  }), [panelOpen, paletteOpen, openPanel, closePanel, togglePanel, openPalette, closePalette]);

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent deve ser usado dentro de AgentProvider');
  return ctx;
}
