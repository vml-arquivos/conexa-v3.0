import React from 'react';
import { AlertCircle, TriangleAlert } from 'lucide-react';
import { PendenciasAlert } from './PendenciasAlert';
import { AlertasSection } from './AlertasSection';
import { AtalhosExecutivos } from './AtalhosExecutivos';

interface ModuloOcorrenciasEvidenciasProps {
  // Pendências
  totalPendencias: number;
  planejamentosParaRevisar: number;
  requisicoesParaAnalisar: number;
  
  // Alertas
  loading?: boolean;
  alertasReais?: {
    total: number;
    criticos: any[];
    atencao: any[];
  } | null;
  alertasFallback?: any[];
  
  // Atalhos
  atalhosOcorrencias: any[];
}

/**
 * ModuloOcorrenciasEvidencias - Módulo 3: Ocorrências e Evidências
 * Agrupa alertas, pendências e atalhos para análise de evidências
 */
export function ModuloOcorrenciasEvidencias({
  totalPendencias,
  planejamentosParaRevisar,
  requisicoesParaAnalisar,
  loading = false,
  alertasReais,
  alertasFallback = [],
  atalhosOcorrencias,
}: ModuloOcorrenciasEvidenciasProps) {
  return (
    <div className="space-y-4">
      {/* Heading do módulo */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-red-600 rounded-full" />
        <h2 className="text-lg font-bold text-gray-900">Ocorrências e Evidências</h2>
        <p className="text-sm text-gray-500 ml-auto">Alertas críticos e análise de desenvolvimento</p>
      </div>

      {/* Alerta de pendências */}
      <PendenciasAlert
        totalPendencias={totalPendencias}
        planejamentosParaRevisar={planejamentosParaRevisar}
        requisicoesParaAnalisar={requisicoesParaAnalisar}
      />

      {/* Alertas Section */}
      <AlertasSection
        loading={loading}
        alertasReais={alertasReais}
        alertasFallback={alertasFallback}
      />

      {/* Atalhos: Pedidos de Material, Ocorrências */}
      <AtalhosExecutivos items={atalhosOcorrencias} />
    </div>
  );
}
