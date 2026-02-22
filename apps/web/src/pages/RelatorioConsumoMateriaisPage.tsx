import { useState, useEffect } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  BarChart2, ShoppingCart, CheckCircle, XCircle,
  Clock, Package, RefreshCw, Filter, Download,
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
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);
  const [filtros, setFiltros] = useState({
    classroomId: '',
    dataInicio: '',
    dataFim: '',
  });

  useEffect(() => {
    carregarRelatorio();
  }, []);

  async function carregarRelatorio() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.classroomId) params.set('classroomId', filtros.classroomId);
      if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
      const res = await http.get(`/material-requests/relatorio-consumo?${params.toString()}`);
      setRelatorio(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  }

  function handleFiltrar(e: React.FormEvent) {
    e.preventDefault();
    carregarRelatorio();
  }

  function formatarData(iso: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  return (
    <PageShell
      title="Relatório de Consumo de Materiais"
      subtitle="Análise de requisições por categoria, turma e período — exclusivo para coordenação"
    >
      {/* Filtros */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700 text-base">
            <Filter className="h-4 w-4" /> Filtros
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-blue-600" /> Por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(relatorio.porCategoria).map(([tipo, dados]) => (
                    <div key={tipo}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{TIPO_LABEL[tipo] || tipo}</span>
                        <span className="text-xs text-gray-500">{dados.total} requisições</span>
                      </div>
                      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                        {dados.aprovados > 0 && (
                          <div
                            className="bg-green-500 h-full"
                            style={{ width: `${(dados.aprovados / dados.total) * 100}%` }}
                            title={`Aprovados: ${dados.aprovados}`}
                          />
                        )}
                        {dados.pendentes > 0 && (
                          <div
                            className="bg-yellow-400 h-full"
                            style={{ width: `${(dados.pendentes / dados.total) * 100}%` }}
                            title={`Pendentes: ${dados.pendentes}`}
                          />
                        )}
                        {dados.rejeitados > 0 && (
                          <div
                            className="bg-red-400 h-full"
                            style={{ width: `${(dados.rejeitados / dados.total) * 100}%` }}
                            title={`Rejeitados: ${dados.rejeitados}`}
                          />
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span className="text-green-600">✓ {dados.aprovados} aprovados</span>
                        <span className="text-yellow-600">⏳ {dados.pendentes} pendentes</span>
                        <span className="text-red-600">✗ {dados.rejeitados} rejeitados</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Por Turma */}
          {relatorio.porTurma.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-600" /> Por Turma
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-gray-500 text-xs">
                        <th className="text-left py-2 pr-4">Turma</th>
                        <th className="text-center py-2 px-2">Total</th>
                        <th className="text-center py-2 px-2">Aprovadas</th>
                        <th className="text-center py-2 px-2">Taxa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorio.porTurma.sort((a, b) => b.total - a.total).map((t, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 pr-4 font-medium text-gray-800">{t.nome}</td>
                          <td className="py-2 px-2 text-center text-gray-600">{t.total}</td>
                          <td className="py-2 px-2 text-center text-green-600">{t.aprovados}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              t.total > 0 && (t.aprovados / t.total) >= 0.7
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {t.total > 0 ? Math.round((t.aprovados / t.total) * 100) : 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detalhes */}
          {relatorio.detalhes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-gray-600" /> Detalhamento Completo
                  <span className="ml-auto text-xs text-gray-400 font-normal">{relatorio.detalhes.length} registros</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-gray-500 text-xs">
                        <th className="text-left py-2 pr-3">Código</th>
                        <th className="text-left py-2 pr-3">Título</th>
                        <th className="text-left py-2 pr-3">Tipo</th>
                        <th className="text-left py-2 pr-3">Turma</th>
                        <th className="text-center py-2 px-2">Qtd</th>
                        <th className="text-center py-2 px-2">Status</th>
                        <th className="text-left py-2 px-2">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorio.detalhes.map(d => (
                        <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 pr-3 font-mono text-xs text-gray-500">{d.code}</td>
                          <td className="py-2 pr-3 text-gray-800 max-w-[200px] truncate">{d.titulo}</td>
                          <td className="py-2 pr-3 text-gray-600">{TIPO_LABEL[d.tipo] || d.tipo}</td>
                          <td className="py-2 pr-3 text-gray-600">{d.turma || '—'}</td>
                          <td className="py-2 px-2 text-center text-gray-600">{d.quantidade}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABEL[d.status]?.cor || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABEL[d.status]?.label || d.status}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-xs text-gray-500">{formatarData(d.dataSolicitacao)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {relatorio.detalhes.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhuma requisição encontrada</p>
              <p className="text-sm mt-1">Ajuste os filtros para ampliar o período de busca</p>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
