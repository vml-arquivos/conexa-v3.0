/**
 * UnitScopeContext — fonte única de verdade para o escopo de unidade ativo.
 *
 * Usado por todas as telas centrais (STAFF_CENTRAL/MANTENEDORA/DEVELOPER) para
 * garantir que o unitId selecionado seja compartilhado entre páginas sem perda
 * de estado ao navegar.
 *
 * Persistência:
 *   1. URL query param (?unitId=) — prioridade máxima, sincronizado bidirecional
 *   2. localStorage (key: "conexa:selectedUnitId") — fallback entre sessões
 *   3. Validação: se unitId não estiver em /lookup/units/accessible, limpa
 *
 * Modos:
 *   - "network": visão de toda a rede (sem filtro de unidade)
 *   - "unit": visão de uma unidade específica
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAccessibleUnits } from '../api/lookup';
import type { AccessibleUnit } from '../types/lookup';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ScopeMode = 'network' | 'unit';

export interface UnitContextSummary {
  unit: { id: string; name: string; code: string; city: string | null; state: string | null };
  counts: { classrooms: number; children: number; teachers: number; staff: number };
  recent: { plansPending: number; diariesThisWeek: number; rdicPublished: number };
}

interface UnitScopeContextType {
  /** ID da unidade selecionada (null = modo rede) */
  selectedUnitId: string | null;
  /** Modo atual: "network" ou "unit" */
  scopeMode: ScopeMode;
  /** Lista de unidades acessíveis ao usuário */
  accessibleUnits: AccessibleUnit[];
  /** Unidade atualmente selecionada (objeto completo) */
  selectedUnit: AccessibleUnit | null;
  /** Resumo da unidade selecionada (carregado via /coordenacao/unit-context/summary) */
  unitSummary: UnitContextSummary | null;
  /** Se o resumo está sendo carregado */
  summaryLoading: boolean;
  /** Se as unidades estão sendo carregadas */
  unitsLoading: boolean;
  /** Selecionar uma unidade (null = modo rede) */
  setUnit: (unitId: string | null) => void;
  /** Forçar modo rede (limpa unitId) */
  setNetworkMode: () => void;
  /** Recarregar o resumo da unidade atual */
  refreshSummary: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const UnitScopeContext = createContext<UnitScopeContextType | undefined>(undefined);

const LS_KEY = 'conexa:selectedUnitId';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UnitScopeProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accessibleUnits, setAccessibleUnits] = useState<AccessibleUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitSummary, setUnitSummary] = useState<UnitContextSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ── Resolução inicial do unitId (URL > localStorage) ──────────────────────
  const getInitialUnitId = (): string | null => {
    const fromUrl = searchParams.get('unitId');
    if (fromUrl) return fromUrl;
    return localStorage.getItem(LS_KEY) ?? null;
  };

  const [selectedUnitId, setSelectedUnitIdState] = useState<string | null>(getInitialUnitId);

  // ── Carregar unidades acessíveis e validar unitId ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    setUnitsLoading(true);
    getAccessibleUnits()
      .then((units) => {
        if (cancelled) return;
        setAccessibleUnits(units);

        // Validar que o unitId salvo ainda é acessível
        if (selectedUnitId) {
          const valid = units.some((u) => u.id === selectedUnitId);
          if (!valid) {
            setSelectedUnitIdState(null);
            localStorage.removeItem(LS_KEY);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setAccessibleUnits([]);
      })
      .finally(() => {
        if (!cancelled) setUnitsLoading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // só na montagem

  // ── Carregar resumo quando unitId muda ────────────────────────────────────
  const loadSummary = useCallback(async (unitId: string) => {
    setSummaryLoading(true);
    try {
      const { default: http } = await import('../api/http');
      const resp = await http.get(`/coordenacao/unit-context/summary`, {
        params: { unitId },
      });
      setUnitSummary(resp.data as UnitContextSummary);
    } catch {
      setUnitSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUnitId) {
      loadSummary(selectedUnitId);
    } else {
      setUnitSummary(null);
    }
  }, [selectedUnitId, loadSummary]);

  // ── Sincronizar com URL ────────────────────────────────────────────────────
  useEffect(() => {
    const fromUrl = searchParams.get('unitId');
    if (fromUrl && fromUrl !== selectedUnitId) {
      setSelectedUnitIdState(fromUrl);
      localStorage.setItem(LS_KEY, fromUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Ações públicas ────────────────────────────────────────────────────────
  const setUnit = useCallback((unitId: string | null) => {
    setSelectedUnitIdState(unitId);
    if (unitId) {
      localStorage.setItem(LS_KEY, unitId);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('unitId', unitId);
        return next;
      }, { replace: true });
    } else {
      localStorage.removeItem(LS_KEY);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('unitId');
        return next;
      }, { replace: true });
    }
  }, [setSearchParams]);

  const setNetworkMode = useCallback(() => setUnit(null), [setUnit]);

  const refreshSummary = useCallback(async () => {
    if (selectedUnitId) await loadSummary(selectedUnitId);
  }, [selectedUnitId, loadSummary]);

  // ── Derivados ─────────────────────────────────────────────────────────────
  const selectedUnit = useMemo(
    () => accessibleUnits.find((u) => u.id === selectedUnitId) ?? null,
    [accessibleUnits, selectedUnitId],
  );

  const scopeMode: ScopeMode = selectedUnitId ? 'unit' : 'network';

  const value: UnitScopeContextType = {
    selectedUnitId,
    scopeMode,
    accessibleUnits,
    selectedUnit,
    unitSummary,
    summaryLoading,
    unitsLoading,
    setUnit,
    setNetworkMode,
    refreshSummary,
  };

  return (
    <UnitScopeContext.Provider value={value}>
      {children}
    </UnitScopeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUnitScope(): UnitScopeContextType {
  const ctx = useContext(UnitScopeContext);
  if (!ctx) throw new Error('useUnitScope must be used within UnitScopeProvider');
  return ctx;
}
