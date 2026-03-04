/**
 * UnitScopeSelector — seletor de unidade global reutilizável.
 *
 * Usa o UnitScopeContext para ler e alterar a unidade ativa.
 * Exibe opção "Rede (todas)" + lista de unidades acessíveis.
 *
 * Props:
 *   - showNetworkOption: exibir opção "Rede (todas)" (default: true)
 *   - placeholder: texto quando nenhuma unidade está selecionada
 *   - className: classes CSS adicionais
 *   - compact: versão compacta sem label
 */

import { useUnitScope } from '../../contexts/UnitScopeContext';
import { Building2, Network } from 'lucide-react';

interface UnitScopeSelectorProps {
  showNetworkOption?: boolean;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export function UnitScopeSelector({
  showNetworkOption = true,
  placeholder = 'Selecione uma unidade',
  className = '',
  compact = false,
}: UnitScopeSelectorProps) {
  const { selectedUnitId, accessibleUnits, unitsLoading, setUnit } = useUnitScope();

  if (unitsLoading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-400 ${className}`}>
        <Building2 className="w-4 h-4 animate-pulse" />
        <span>Carregando unidades...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!compact && (
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap flex items-center gap-1">
          <Building2 className="w-4 h-4" />
          Unidade:
        </label>
      )}
      <select
        value={selectedUnitId ?? ''}
        onChange={(e) => setUnit(e.target.value || null)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[200px] max-w-[320px]"
      >
        {showNetworkOption && (
          <option value="">
            🌐 Rede (todas as unidades)
          </option>
        )}
        {!showNetworkOption && !selectedUnitId && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {accessibleUnits.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </select>
      {selectedUnitId && (
        <button
          onClick={() => setUnit(null)}
          title="Ver rede completa"
          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <Network className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
