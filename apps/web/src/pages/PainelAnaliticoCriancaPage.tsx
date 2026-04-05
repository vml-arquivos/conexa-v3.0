/**
 * PainelAnaliticoCriancaPage.tsx — SEDF 2026
 *
 * Painel analítico individual da criança:
 *  - Radar de competências por trimestre
 *  - Histórico de RDICs
 *  - Dados nutricionais (quando disponíveis)
 *
 * NOTA: o eixo de raio polar foi removido intencionalmente — não está confirmado
 * no projecto e causava warning de prop inválida no Recharts.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import http from '../api/http';
import { PageShell } from '../components/PageShell';
import { LoadingState } from '../components/LoadingState';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RdicResumo {
  id: string;
  periodo: string;
  periodoEnum: string | null;
  anoLetivo: number;
  status: string;
  criadoEm: string;
  atualizadoEm: string;
  reviewComment: string | null;
  conteudoFinal: Record<string, any> | null;
}

interface CriancaDados {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  photoUrl: string | null;
  turmaAtual: { id: string; name: string; code: string } | null;
}

interface AcompanhamentoNutricional {
  statusCaso: string;
  orientacoesProfCozinha: string | null;
  restricoesOperacionais: string | null;
  substituicoesSeguras: string | null;
  proximaReavaliacao: string | null;
}

interface CentralDaCriancaResponse {
  child: CriancaDados;
  acompanhamentoNutricional: AcompanhamentoNutricional | null;
  rdics: RdicResumo[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  EM_REVISAO: 'Em Revisão',
  DEVOLVIDO: 'Devolvido',
  APROVADO: 'Aprovado',
  FINALIZADO: 'Finalizado',
  PUBLICADO: 'Publicado',
};

const STATUS_COLOR: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-700',
  EM_REVISAO: 'bg-yellow-100 text-yellow-800',
  DEVOLVIDO: 'bg-red-100 text-red-700',
  APROVADO: 'bg-green-100 text-green-800',
  FINALIZADO: 'bg-blue-100 text-blue-800',
  PUBLICADO: 'bg-purple-100 text-purple-800',
};

function calcularIdade(dateOfBirth: string | null): string {
  if (!dateOfBirth) return '—';
  const nasc = new Date(dateOfBirth);
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
  return `${anos} anos`;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PainelAnaliticoCriancaPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();

  const [dados, setDados] = useState<CentralDaCriancaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await http.get<CentralDaCriancaResponse>(
        `/rdic/central-crianca/${childId}`,
      );
      setDados(res);
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao carregar dados da criança.');
    } finally {
      setLoading(false);
    }
  }, [childId, http]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (loading) return <LoadingState message="Carregando painel da criança..." />;

  if (erro || !dados) {
    return (
      <PageShell title="Painel Analítico">
        <div className="p-6 text-center text-red-600">
          {erro ?? 'Dados não encontrados.'}
        </div>
      </PageShell>
    );
  }

  const { child, acompanhamentoNutricional, rdics } = dados;

  // Dados para o radar (últimos 3 RDICs com conteúdoFinal)
  const rdicsComConteudo = rdics
    .filter(r => r.conteudoFinal && Object.keys(r.conteudoFinal).length > 0)
    .slice(0, 3);

  const radarData = rdicsComConteudo.length > 0
    ? Object.keys(rdicsComConteudo[0].conteudoFinal ?? {}).map(campo => {
        const entry: Record<string, any> = { campo };
        rdicsComConteudo.forEach((r, i) => {
          const val = (r.conteudoFinal as any)?.[campo];
          entry[`T${i + 1}`] = typeof val === 'number' ? val : 0;
        });
        return entry;
      })
    : [];

  return (
    <PageShell title={`Painel — ${child.firstName} ${child.lastName}`}>
      <div className="max-w-5xl mx-auto p-4 space-y-6">

        {/* Cabeçalho da criança */}
        <Card>
          <CardContent className="pt-4 flex gap-4 items-center">
            {child.photoUrl ? (
              <img
                src={child.photoUrl}
                alt={child.firstName}
                className="w-16 h-16 rounded-full object-cover border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
                {child.firstName[0]}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">
                {child.firstName} {child.lastName}
              </h2>
              <p className="text-sm text-gray-500">
                {calcularIdade(child.dateOfBirth)}
                {child.gender ? ` · ${child.gender}` : ''}
              </p>
              {child.turmaAtual && (
                <p className="text-sm text-gray-600 mt-1">
                  Turma: <strong>{child.turmaAtual.name}</strong> ({child.turmaAtual.code})
                </p>
              )}
              {child.allergies && (
                <p className="text-xs text-red-600 mt-1">
                  Alergias: {child.allergies}
                </p>
              )}
            </div>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Radar de competências */}
        {radarData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução por Competências</CardTitle>
            </CardHeader>
            <CardContent>
              {/* eixo de raio polar removido — não confirmado no projecto */}
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="campo" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {rdicsComConteudo.map((_, i) => (
                    <Radar
                      key={i}
                      name={`Trimestre ${i + 1}`}
                      dataKey={`T${i + 1}`}
                      stroke={['#6366f1', '#10b981', '#f59e0b'][i]}
                      fill={['#6366f1', '#10b981', '#f59e0b'][i]}
                      fillOpacity={0.15}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Acompanhamento nutricional */}
        {acompanhamentoNutricional && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acompanhamento Nutricional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Status:</strong>{' '}
                <Badge variant="outline">{acompanhamentoNutricional.statusCaso}</Badge>
              </p>
              {acompanhamentoNutricional.restricoesOperacionais && (
                <p>
                  <strong>Restrições:</strong> {acompanhamentoNutricional.restricoesOperacionais}
                </p>
              )}
              {acompanhamentoNutricional.substituicoesSeguras && (
                <p>
                  <strong>Substituições seguras:</strong> {acompanhamentoNutricional.substituicoesSeguras}
                </p>
              )}
              {acompanhamentoNutricional.orientacoesProfCozinha && (
                <p>
                  <strong>Orientações cozinha:</strong> {acompanhamentoNutricional.orientacoesProfCozinha}
                </p>
              )}
              {acompanhamentoNutricional.proximaReavaliacao && (
                <p>
                  <strong>Próxima reavaliação:</strong>{' '}
                  {new Date(acompanhamentoNutricional.proximaReavaliacao).toLocaleDateString('pt-BR')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Histórico de RDICs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de RDICs</CardTitle>
          </CardHeader>
          <CardContent>
            {rdics.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum RDIC registado para esta criança.</p>
            ) : (
              <div className="space-y-2">
                {rdics.map(rdic => (
                  <div
                    key={rdic.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {rdic.periodo} · {rdic.anoLetivo}
                      </p>
                      <p className="text-xs text-gray-500">
                        Atualizado: {new Date(rdic.atualizadoEm).toLocaleDateString('pt-BR')}
                      </p>
                      {rdic.reviewComment && (
                        <p className="text-xs text-red-600 mt-1">
                          Comentário: {rdic.reviewComment}
                        </p>
                      )}
                    </div>
                    <Badge className={STATUS_COLOR[rdic.status] ?? 'bg-gray-100'}>
                      {STATUS_LABEL[rdic.status] ?? rdic.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </PageShell>
  );
}
