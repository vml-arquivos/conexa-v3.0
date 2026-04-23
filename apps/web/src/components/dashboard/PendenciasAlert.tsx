import React from 'react';
import { Bell } from 'lucide-react';

interface PendenciasAlertProps {
  totalPendencias: number;
  planejamentosParaRevisar: number;
  requisicoesParaAnalisar: number;
}

/**
 * PendenciasAlert - Banner de pendências no topo
 * Mostra total de itens que precisam de atenção
 */
export function PendenciasAlert({
  totalPendencias,
  planejamentosParaRevisar,
  requisicoesParaAnalisar,
}: PendenciasAlertProps) {
  if (totalPendencias <= 0) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex items-center gap-3">
      <Bell className="h-6 w-6 text-orange-500 flex-shrink-0" />
      <div>
        <p className="font-bold text-orange-800">
          {totalPendencias} {totalPendencias === 1 ? 'item precisa' : 'itens precisam'} da sua atenção
        </p>
        <p className="text-sm text-orange-600">
          {planejamentosParaRevisar > 0 ? `${planejamentosParaRevisar} planejamento(s) para revisar` : ''}
          {planejamentosParaRevisar > 0 && requisicoesParaAnalisar > 0 ? ' · ' : ''}
          {requisicoesParaAnalisar > 0 ? `${requisicoesParaAnalisar} pedido(s) de material` : ''}
        </p>
      </div>
    </div>
  );
}
