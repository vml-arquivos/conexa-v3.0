import React from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';

interface SupervisionMetric {
  label: string;
  value: number;
  color: string;
  bgColor: string;
  percentage?: number;
}

interface ClassroomStatus {
  id: string;
  name: string;
  professor: string;
  status: 'on-time' | 'pending' | 'critical';
  planningStatus: 'approved' | 'reviewing' | 'draft';
  diaryStatus: 'published' | 'draft' | 'missing';
  frequency: number;
  onClick: () => void;
}

interface PedagogicalSupervisionBlockProps {
  planningMetrics: SupervisionMetric[];
  diaryMetrics: SupervisionMetric[];
  classrooms: ClassroomStatus[];
  loading?: boolean;
  onClassroomClick?: (classroomId: string) => void;
}

export function PedagogicalSupervisionBlock({
  planningMetrics,
  diaryMetrics,
  classrooms,
  loading = false,
  onClassroomClick,
}: PedagogicalSupervisionBlockProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Fiscalização Pedagógica</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">Status de planejamentos, diários e turmas</p>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100">
        {/* Planejamentos */}
        <div className="px-6 py-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Status dos Planejamentos</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {planningMetrics.map((metric, idx) => (
              <div key={idx} className={`${metric.bgColor} rounded-lg p-3`}>
                <p className="text-xs text-gray-600 font-semibold">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                {metric.percentage !== undefined && (
                  <p className="text-xs text-gray-500 mt-1">{metric.percentage}%</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Diários */}
        <div className="px-6 py-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Status dos Diários</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {diaryMetrics.map((metric, idx) => (
              <div key={idx} className={`${metric.bgColor} rounded-lg p-3`}>
                <p className="text-xs text-gray-600 font-semibold">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                {metric.percentage !== undefined && (
                  <p className="text-xs text-gray-500 mt-1">{metric.percentage}%</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Turmas */}
        <div className="px-6 py-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Turmas em Dia vs Pendentes</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {classrooms.map((classroom) => (
              <button
                key={classroom.id}
                onClick={() => onClassroomClick?.(classroom.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900">{classroom.name}</p>
                  <p className="text-xs text-gray-500">{classroom.professor}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        classroom.planningStatus === 'approved'
                          ? 'bg-emerald-500'
                          : classroom.planningStatus === 'reviewing'
                            ? 'bg-amber-500'
                            : 'bg-gray-300'
                      }`}
                    ></span>
                    <span className="text-xs text-gray-600">Plano</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        classroom.diaryStatus === 'published'
                          ? 'bg-emerald-500'
                          : classroom.diaryStatus === 'draft'
                            ? 'bg-amber-500'
                            : 'bg-gray-300'
                      }`}
                    ></span>
                    <span className="text-xs text-gray-600">Diário</span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      classroom.status === 'on-time'
                        ? 'bg-emerald-100 text-emerald-700'
                        : classroom.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {classroom.status === 'on-time'
                      ? '✓ Em dia'
                      : classroom.status === 'pending'
                        ? '⏳ Pendente'
                        : '🔴 Crítico'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
