import { useState, useEffect, useMemo } from 'react';
import { getAccessibleClassrooms } from '../../api/lookup';
import type { AccessibleClassroom } from '../../types/lookup';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface ClassroomSelectProps {
  unitId?: string;
  value: string;
  onChange: (classroomId: string) => void;
  disabled?: boolean;
  className?: string;
  autoSelectSingle?: boolean;
}

type FetchState = {
  classrooms: AccessibleClassroom[];
  loading: boolean;
  error: string | null;
};

export function ClassroomSelect({
  unitId,
  value,
  onChange,
  disabled,
  className,
  autoSelectSingle = true,
}: ClassroomSelectProps) {
  const [fetchState, setFetchState] = useState<FetchState>({
    classrooms: [],
    loading: true,
    error: null,
  });
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);
  const [lastSelectedClassroom, setLastSelectedClassroom] = useLocalStorage<string>('lastSelectedClassroom', '');

  useEffect(() => {
    let cancelled = false;

    getAccessibleClassrooms(unitId)
      .then((data) => {
        if (cancelled) return;
        setFetchState({ classrooms: data, loading: false, error: null });
        // Reset auto-select flag when data changes
        setAutoSelected(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchState({
          classrooms: [],
          loading: false,
          error: err?.response?.data?.message || 'Erro ao carregar turmas',
        });
      });

    return () => { cancelled = true; };
  }, [unitId]);

  // Auto-selecionar se apenas 1 turma (via efeito separado)
  useEffect(() => {
    if (autoSelectSingle && !autoSelected && fetchState.classrooms.length === 1 && !value) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoSelected(true);
      onChange(fetchState.classrooms[0].id);
    }
  }, [fetchState.classrooms, value, onChange, autoSelectSingle, autoSelected]);

  // Restaurar última turma selecionada se existir e for válida
  useEffect(() => {
    if (!value && lastSelectedClassroom && fetchState.classrooms.some(c => c.id === lastSelectedClassroom)) {
      onChange(lastSelectedClassroom);
    }
  }, [fetchState.classrooms, value, lastSelectedClassroom, onChange]);

  // Salvar turma selecionada no localStorage
  useEffect(() => {
    if (value && value !== lastSelectedClassroom) {
      setLastSelectedClassroom(value);
    }
  }, [value, lastSelectedClassroom, setLastSelectedClassroom]);

  const { classrooms, loading, error } = fetchState;

  const filtered = useMemo(() => {
    if (!search.trim()) return classrooms;
    const term = search.toLowerCase();
    return classrooms.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term)
    );
  }, [classrooms, search]);

  const selectedClassroom = classrooms.find((c) => c.id === value);

  if (loading) {
    return (
      <div className={`px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm ${className || ''}`}>
        Carregando turmas...
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

  if (classrooms.length === 0) {
    return (
      <div className={`px-3 py-2 border border-yellow-300 rounded-md bg-yellow-50 text-yellow-700 text-sm ${className || ''}`}>
        <p className="font-medium">Nenhuma turma encontrada {unitId ? 'nesta unidade' : 'para seu acesso'}.</p>
        <p className="text-xs mt-1">Rode o seed/importação no backend ou contate o administrador.</p>
      </div>
    );
  }

  // Se apenas 1 turma, mostrar como texto fixo
  if (classrooms.length === 1) {
    return (
      <div className={`px-3 py-2 border border-green-200 rounded-md bg-green-50 text-green-800 text-sm font-medium ${className || ''}`}>
        {classrooms[0].name}
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
        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left text-sm hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {selectedClassroom ? (
          <span>
            <span className="font-medium">{selectedClassroom.name}</span>
            <span className="text-gray-400 ml-1 text-xs">({selectedClassroom.code})</span>
          </span>
        ) : (
          <span className="text-gray-400">Selecione uma turma...</span>
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
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-400"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                Nenhuma turma encontrada
              </div>
            ) : (
              filtered.map((classroom) => (
                <button
                  key={classroom.id}
                  type="button"
                  onClick={() => {
                    onChange(classroom.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-green-50 ${
                    classroom.id === value ? 'bg-green-100 font-medium' : ''
                  }`}
                >
                  <span className="font-medium">{classroom.name}</span>
                  <span className="text-gray-400 ml-1 text-xs">({classroom.code})</span>
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
