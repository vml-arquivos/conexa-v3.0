import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles } from '../app/RoleProtectedRoute';
import { useUnitScope } from '../contexts/UnitScopeContext';
import { UnitScopeSelector } from '../components/select/UnitScopeSelector';
import {
  BarChart2, ShoppingCart, CheckCircle, XCircle,
  Clock, Package, RefreshCw, Filter,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface RelatorioPeriodo {
  inicio: string | null;
  fim: string | null;
}
interface Totais {
  requisicoes: number;
  aprovadas: number;
  pendentes: number;
  rejeitadas: number;
  entregues: number;
  custoEstimadoTotal: number;
}
interface PorCategoria {
  [tipo: string]: { total: number; aprovados: number; pendentes: number; rejeitados: number };
}
interface PorTurma {
  nome: string;
  total: number;
  aprovados: number;
}
interface Detalhe {
  id: string;
  code: string;
  titulo: string;
  tipo: string;
  quantidade: number;
  status: string;
  prioridade: string;
  turma: string | null;
  professor: string | null;
  custoEstimado: number | null;
  dataSolicitacao: string;
  dataAprovacao: string | null;
}
interface RelatorioData {
  periodo: RelatorioPeriodo;
  totais: Totais;
  porCategoria: PorCategoria;
  porTurma: PorTurma[];
  porStatus: Record<string, number>;
  detalhes: Detalhe[];
}

// ─── Labels ───────────────────────────────────────────────────────────────────
const TIPO_LABEL: Record<string, string> = {
  PEDAGOGICO: 'Pedagógico',
  HIGIENE: 'Higiene Pessoal',
  LIMPEZA: 'Limpeza',
  ALIMENTACAO: 'Alimentação',
  OUTRO: 'Outros',
};
const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  SOLICITADO: { label: 'Solicitado', cor: 'bg-blue-100 text-blue-700' },
  EM_ANALISE: { label: 'Em Análise', cor: 'bg-yellow-100 text-yellow-700' },
  APROVADO: { label: 'Aprovado', cor: 'bg-green-100 text-green-700' },
  REJEITADO: { label: 'Rejeitado', cor: 'bg-red-100 text-red-700' },
  ENTREGUE: { label: 'Entregue', cor: 'bg-purple-100 text-purple-700' },
  RASCUNHO: { label: 'Rascunho', cor: 'bg-gray-100 text-gray-600' },
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function RelatorioConsumoMateriaisPage() {
  const { user } = useAuth();
  const roles = normalizeRoles(user);
  const isCentral = roles.includes('STAFF_CENTRAL') || roles.includes('MANTENEDORA') || roles.includes('DEVELOPER');

  // Suporte a ?unitId= via query param
  const [searchParams] = useSearchParams();
  const unitIdFromQuery = searchParams.get('unitId') ?? '';

  // Contexto global de unidade (compartilhado entre telas)
  const { selectedUnitId: ctxUnitId, setUnit: ctxSetUnit, accessibleUnits } = useUnitScope();

  // Inicializar unidade a partir do query param se fornecido
  useEffect(() => {
    if (unitIdFromQuery && unitIdFromQuery !== ctxUnitId) {
      ctxSetUnit(unitIdFromQuery);
    }
  }, [unitIdFromQuery]); // eslint-disable-line

  const selectedUnitId = ctxUnitId ?? '';

  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
  });

  const carregarRelatorio = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
      if (isCentral && selectedUnitId) params.set('unitId', selectedUnitId);
      const res = await http.get(`/material-requests/relatorio-consumo?${params.toString()}`);
      const raw = res.data ?? {};
      setRelatorio({
        periodo: raw.periodo ?? { inicio: null, fim: null },
        totais: raw.totais ?? { requisicoes: 0, aprovadas: 0, pendentes: 0, rejeitadas: 0, entregues: 0, custoEstimadoTotal: 0 },
        porCategoria: raw.porCategoria ?? {},
        porTurma: Array.isArray(raw.porTurma) ? raw.porTurma : [],
        porStatus: raw.porStatus ?? {},
        detalhes: Array.isArray(raw.detalhes) ? raw.detalhes : [],
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  }, [filtros.dataInicio, filtros.dataFim, selectedUnitId, isCentral]);

  // Carregar automaticamente ao montar e quando unidade muda
  useEffect(() => {
    carregarRelatorio();
  }, [carregarRelatorio]);

  function handleFiltrar(e: React.FormEvent) {
    e.preventDefault();
    carregarRelatorio();
  }

  function formatarData(iso: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  const unidadeNome = accessibleUnits.find(u => u.id === selectedUnitId)?.name;

  return (
    <PageShell
      title="Relatório de Consumo de Materiais"
      subtitle={
        isCentral
          ? selectedUnitId
            ? `Unidade: ${unidadeNome ?? selectedUnitId}`
            : 'Toda a rede — selecione uma unidade para filtrar'
          : 'Análise de requisições por categoria, turma e período'
      }
    >
      {/* Seletor de Unidade — apenas para STAFF_CENTRAL/MANTENEDORA/DEVELOPER */}
      {isCentral && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
          <UnitScopeSelector
            showNetworkOption
            placeholder="Toda a rede (sem filtro)"
            className="flex-1 min-w-[200px]"
          />
          {selectedUnitId && (
            <span className="text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
              Filtrando por: <strong>{unidadeNome}</strong>
            </span>
          )}
          {!selectedUnitId && (
            <span className="text-xs text-gray-500">
              Sem filtro de unidade — exibindo dados de toda a rede
            </span>
          )}
        </div>
      )}

      {/* Filtros de período */}
      <Card className="border border-gray-200 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700 text-base">
            <Filter className="h-4 w-4" /> Filtros de Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFiltrar} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <BarChart2 className="h-4 w-4 mr-2" />}
                Gerar Relatório
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading && <LoadingState message="Gerando relatório..." />}
      {!loading && relatorio && (
        <>
          {/* Cards de totais */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-blue-100 bg-blue-50">
              <CardContent className="p-4 text-center">
                <ShoppingCart className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-800">{relatorio.totais.requisicoes}</p>
                <p className="text-xs text-blue-600">Total</p>
              </CardContent>
            </Card>
            <Card className="border-green-100 bg-green-50">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-800">{relatorio.totais.aprovadas}</p>
                <p className="text-xs text-green-600">Aprovadas</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-100 bg-yellow-50">
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-yellow-800">{relatorio.totais.pendentes}</p>
                <p className="text-xs text-yellow-600">Pendentes</p>
              </CardContent>
            </Card>
            <Card className="border-red-100 bg-red-50">
              <CardContent className="p-4 text-center">
                <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-800">{relatorio.totais.rejeitadas}</p>
                <p className="text-xs text-red-600">Rejeitadas</p>
              </CardContent>
            </Card>
            <Card className="border-purple-100 bg-purple-50">
              <CardContent className="p-4 text-center">
                <Package className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-purple-800">{relatorio.totais.entregues}</p>
                <p className="text-xs text-purple-600">Entregues</p>
              </CardContent>
            </Card>
          </div>

          {/* Por Categoria */}
          {Object.keys(relatorio.porCategoria).length > 0 && (
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-base text-gray-700">Por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(relatorio.porCategoria).map(([tipo, dados]) => (
                    <div key={tipo} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm font-medium text-gray-700">{TIPO_LABEL[tipo] ?? tipo}</span>
                      <div className="flex gap-3 text-xs">
                        <span className="text-gray-500">Total: <strong>{dados.total}</strong></span>
                        <span className="text-green-600">Aprovados: <strong>{dados.aprovados}</strong></span>
                        <span className="text-yellow-600">Pendentes: <strong>{dados.pendentes}</strong></span>
                        <span className="text-red-600">Rejeitados: <strong>{dados.rejeitados}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Por Turma */}
          {relatorio.porTurma.length > 0 && (
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-base text-gray-700">Por Turma</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatorio.porTurma.map((t, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{t.nome}</span>
                      <div className="flex gap-3 text-xs">
                        <span className="text-gray-500">Total: <strong>{t.total}</strong></span>
                        <span className="text-green-600">Aprovados: <strong>{t.aprovados}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detalhes */}
          {relatorio.detalhes.length > 0 && (
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-base text-gray-700 flex items-center justify-between">
                  <span>Detalhes das Requisições</span>
                  <span className="text-xs font-normal text-gray-400">{relatorio.detalhes.length} itens</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Código</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Título</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Turma</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Qtd</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Solicitado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {relatorio.detalhes.map(d => (
                        <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-3 text-gray-400 font-mono text-xs">{d.code}</td>
                          <td className="py-2 px-3 text-gray-700 font-medium">{d.titulo}</td>
                          <td className="py-2 px-3 text-gray-500">{TIPO_LABEL[d.tipo] ?? d.tipo}</td>
                          <td className="py-2 px-3 text-gray-600">{d.turma || '—'}</td>
                          <td className="py-2 px-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABEL[d.status]?.cor ?? 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABEL[d.status]?.label ?? d.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-700">{d.quantidade}</td>
                          <td className="py-2 px-3 text-gray-400 text-xs">{formatarData(d.dataSolicitacao)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {relatorio.detalhes.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">Nenhuma requisição encontrada</p>
              <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros de período{isCentral ? ' ou selecione uma unidade' : ''}</p>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
