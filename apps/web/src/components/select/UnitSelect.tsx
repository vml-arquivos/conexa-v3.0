import { useState, useEffect, useMemo } from 'react';
import { getAccessibleUnits } from '../../api/lookup';
import type { AccessibleUnit } from '../../types/lookup';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface UnitSelectProps {
  value: string;
  onChange: (unitId: string) => void;
  disabled?: boolean;
  className?: string;
}

type FetchState = {
  units: AccessibleUnit[];
  loading: boolean;
  error: string | null;
};

export function UnitSelect({ value, onChange, disabled, className }: UnitSelectProps) {
  const [fetchState, setFetchState] = useState<FetchState>({
    units: [],
    loading: true,
    error: null,
  });
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);
  const [lastSelectedUnit, setLastSelectedUnit] = useLocalStorage<string>('lastSelectedUnit', '');

  useEffect(() => {
    let cancelled = false;

    getAccessibleUnits()
      .then((data) => {
        if (cancelled) return;
        console.log('[UnitSelect] Unidades carregadas:', data.length, data);
        setFetchState({ units: data, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[UnitSelect] Erro ao carregar unidades:', err);
        setFetchState({
          units: [],
          loading: false,
          error: err?.response?.data?.message || 'Erro ao carregar unidades',
        });
      });

    return () => { cancelled = true; };
  }, []);

  // Auto-selecionar se apenas 1 unidade (via efeito separado)
  useEffect(() => {
    if (!autoSelected && fetchState.units.length === 1 && !value) {
      console.log('[UnitSelect] Auto-selecionando única unidade:', fetchState.units[0]);
      setAutoSelected(true);
      onChange(fetchState.units[0].id);
    }
  }, [fetchState.units, value, onChange, autoSelected]);

  // Restaurar última unidade selecionada se existir e for válida
  useEffect(() => {
    if (!value && lastSelectedUnit && fetchState.units.some(u => u.id === lastSelectedUnit)) {
      console.log('[UnitSelect] Restaurando última unidade selecionada:', lastSelectedUnit);
      onChange(lastSelectedUnit);
    }
  }, [fetchState.units, value, lastSelectedUnit, onChange]);

  // Salvar unidade selecionada no localStorage
  useEffect(() => {
    if (value && value !== lastSelectedUnit) {
      setLastSelectedUnit(value);
    }
  }, [value, lastSelectedUnit, setLastSelectedUnit]);

  const { units, loading, error } = fetchState;

  const filtered = useMemo(() => {
    if (!search.trim()) return units;
    const term = search.toLowerCase();
    return units.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.code.toLowerCase().includes(term)
    );
  }, [units, search]);

  const selectedUnit = units.find((u) => u.id === value);

  if (loading) {
    return (
      <div className={`px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm ${className || ''}`}>
        Carregando unidades...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600 text-sm ${className || ''}`}>
        {error}
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className={`px-3 py-2 border border-yellow-300 rounded-md bg-yellow-50 text-yellow-700 text-sm ${className || ''}`}>
        <p className="font-medium">Nenhuma unidade encontrada para seu acesso.</p>
        <p className="text-xs mt-1">Rode o seed/importação no backend ou contate o administrador.</p>
      </div>
    );
  }

  // Se apenas 1 unidade, mostrar como texto fixo
  if (units.length === 1) {
    return (
      <div className={`px-3 py-2 border border-green-200 rounded-md bg-green-50 text-green-800 text-sm font-medium ${className || ''}`}>
        {units[0].name}
      </div>
    );
  }

  return (
    <div className={`relative ${className || ''}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left text-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {selectedUnit ? (
          <span>
            <span className="font-medium">{selectedUnit.name}</span>
            <span className="text-gray-400 ml-1 text-xs">({selectedUnit.code})</span>
          </span>
        ) : (
          <span className="text-gray-400">Selecione uma unidade...</span>
        )}
        <span className="float-right text-gray-400">▾</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou código..."
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                Nenhuma unidade encontrada
              </div>
            ) : (
              filtered.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => {
                    onChange(unit.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                    unit.id === value ? 'bg-blue-100 font-medium' : ''
                  }`}
                >
                  <span className="font-medium">{unit.name}</span>
                  <span className="text-gray-400 ml-1 text-xs">({unit.code})</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setSearch('');
          }}
        />
      )}
    </div>
  );
}
