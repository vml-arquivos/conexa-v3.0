import React, { useState } from 'react';
import { Search, Filter, ChevronRight } from 'lucide-react';

interface WorkItem {
  id: string;
  type: 'planejamento' | 'diario' | 'requisicao' | 'atendimento';
  title: string;
  subtitle: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  date: string;
  onClick: () => void;
}

interface WorkQueueBlockProps {
  items: WorkItem[];
  loading?: boolean;
  onFilterChange?: (filters: any) => void;
}

export function WorkQueueBlock({ items, loading = false, onFilterChange }: WorkQueueBlockProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || item.type === selectedType;
    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      planejamento: 'Planejamento',
      diario: 'Diário',
      requisicao: 'Requisição',
      atendimento: 'Atendimento',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      planejamento: 'bg-blue-100 text-blue-700',
      diario: 'bg-purple-100 text-purple-700',
      requisicao: 'bg-pink-100 text-pink-700',
      atendimento: 'bg-green-100 text-green-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      pending: '⏳',
      'in-progress': '⚙️',
      completed: '✅',
    };
    return icons[status] || '•';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-amber-100 text-amber-700',
      low: 'bg-emerald-100 text-emerald-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
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
          <Search className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Fila de Trabalho</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {filteredItems.length} de {items.length} itens
        </p>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-100 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setSelectedType(null);
              onFilterChange?.({ type: null });
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              !selectedType
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {['planejamento', 'diario', 'requisicao', 'atendimento'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(selectedType === type ? null : type);
                onFilterChange?.({ type: selectedType === type ? null : type });
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500 text-sm">Nenhum item encontrado</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{getStatusIcon(item.status)}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getTypeColor(item.type)}`}>
                    {getTypeLabel(item.type)}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getPriorityColor(item.priority)}`}>
                    {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                <p className="text-xs text-gray-400 mt-1">{item.date}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
