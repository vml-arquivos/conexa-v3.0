import React from 'react';
import { Users, CheckCircle, AlertCircle } from 'lucide-react';

interface TurmaStatus {
  id: string;
  nome: string;
  totalAlunos: number;
  chamadaFeita: boolean;
}

interface TurmasStatusTodayProps {
  turmas: TurmaStatus[];
  onViewAllClick: () => void;
}

/**
 * TurmasStatusToday - Lista de turmas com status de chamada
 * Mostra cada turma e se a chamada foi realizada
 */
export function TurmasStatusToday({ turmas, onViewAllClick }: TurmasStatusTodayProps) {
  if (!turmas?.length) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800">Status das Turmas — Hoje</p>
        <button
          onClick={onViewAllClick}
          className="text-xs text-blue-600 hover:underline"
        >
          Ver todas as turmas →
        </button>
      </div>
      <div className="divide-y divide-gray-50">
        {turmas?.map(turma => (
          <div
            key={turma?.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{turma?.nome}</p>
                <p className="text-xs text-gray-500">{turma?.totalAlunos ?? 0} alunos</p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {turma?.chamadaFeita ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-100">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Chamada OK</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100">
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">Pendente</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
