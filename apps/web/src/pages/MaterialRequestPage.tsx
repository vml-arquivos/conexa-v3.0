import { useState } from 'react';
import { MaterialRequestForm } from '../components/material-request/MaterialRequestForm';
import { MaterialRequestList } from '../components/material-request/MaterialRequestList';
import { ShoppingCart, ClipboardList, Info } from 'lucide-react';

export function MaterialRequestPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeView, setActiveView] = useState<'form' | 'list'>('form');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-blue-600" />
          Requisições de Materiais
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Solicite materiais pedagógicos, de higiene, limpeza e alimentação para sua turma.
          As solicitações são encaminhadas à Coordenadora Pedagógica da unidade.
        </p>
      </header>

      {/* Aviso informativo */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Como funciona o fluxo de requisições:</p>
          <p>
            Ao submeter uma requisição, ela é encaminhada automaticamente para a{' '}
            <strong>Coordenadora Pedagógica</strong> da sua unidade, que poderá aprovar,
            ajustar ou encaminhar para a Direção e Administrativo conforme necessário.
            Você pode acompanhar o status de cada solicitação na aba "Minhas Requisições".
          </p>
        </div>
      </div>

      {/* Tabs mobile */}
      <div className="flex border-b border-gray-200 lg:hidden">
        <button
          onClick={() => setActiveView('form')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeView === 'form'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          Nova Requisição
        </button>
        <button
          onClick={() => setActiveView('list')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeView === 'list'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Minhas Requisições
        </button>
      </div>

      {/* Layout desktop: duas colunas */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6">
        <MaterialRequestForm
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
        <MaterialRequestList refreshTrigger={refreshTrigger} />
      </div>

      {/* Layout mobile: alternado */}
      <div className="lg:hidden">
        {activeView === 'form' && (
          <MaterialRequestForm
            onSuccess={() => {
              setRefreshTrigger(prev => prev + 1);
              setActiveView('list');
            }}
          />
        )}
        {activeView === 'list' && (
          <MaterialRequestList refreshTrigger={refreshTrigger} />
        )}
      </div>
    </div>
  );
}
