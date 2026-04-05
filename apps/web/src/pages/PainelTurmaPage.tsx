/**
 * PainelTurmaPage.tsx — SEDF 2026
 *
 * Painel analítico da turma:
 *  - Visão geral de RDICs por status
 *  - Indicadores de saúde e nutrição
 *  - Listagem de crianças com alertas
 *
 * NOTA: Stethoscope é usado para representar condições médicas — o ícone
 * alternativo não está confirmado no bundle lucide-react utilizado.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Brain, Users, AlertTriangle, CheckCircle, Clock,
  RotateCcw, Globe, ArrowLeft, RefreshCw, Activity,
  Apple, Heart, Stethoscope, TrendingUp, BookOpen, User,
} from 'lucide-react';
import http from '../api/http';
import { PageShell } from '../components/ui/PageShell';
import { LoadingState } from '../components/ui/LoadingState';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CriancaResumo {
  childId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  status: string | null;
  rdic: { id: string; status: string } | null;
  temAlergia: boolean;
  temCondicaoMedica: boolean;
}

interface TurmaStatusResponse {
  classroomId: string;
  classroomName: string;
  trimestre: string;
  anoLetivo: number;
  criancas: CriancaResumo[];
  totais: {
    total: number;
    rascunho: number;
    emRevisao: number;
    devolvido: number;
    aprovado: number;
    finalizado: number;
    publicado: number;
    semRdic: number;
  };
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  cor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  cor: string;
}) {
  return (
    <Card className={`border-l-4 ${cor}`}>
      <CardContent className="pt-4 flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PainelTurmaPage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();

  const [dados, setDados] = useState<TurmaStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [trimestreId, setTrimestreId] = useState<string>('T1');

  const carregar = useCallback(async () => {
    if (!classroomId) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await http.get<TurmaStatusResponse>(
        `/rdic/turma-status?classroomId=${classroomId}&trimestre=${trimestreId}`,
      );
      setDados(res);
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao carregar painel da turma.');
    } finally {
      setLoading(false);
    }
  }, [classroomId, trimestreId, http]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ─── KPIs com ícones ──────────────────────────────────────────────────────────────────
  const kpis = dados
    ? [
        {
          label: 'Total de crianças',
          value: dados.totais.total,
          icon: <Users className="h-4 w-4 text-blue-500" />,
          cor: 'border-blue-400',
        },
        {
          label: 'Aprovados',
          value: dados.totais.aprovado + dados.totais.finalizado + dados.totais.publicado,
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          cor: 'border-green-400',
        },
        {
          label: 'Em Revisão',
          value: dados.totais.emRevisao,
          icon: <Clock className="h-4 w-4 text-yellow-500" />,
          cor: 'border-yellow-400',
        },
        {
          label: 'Devolvidos',
          value: dados.totais.devolvido,
          icon: <RotateCcw className="h-4 w-4 text-red-500" />,
          cor: 'border-red-400',
        },
        {
          label: 'Sem RDIC',
          value: dados.totais.semRdic,
          icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
          cor: 'border-orange-400',
        },
        {
          label: 'Cond. médicas',
          icon: <Stethoscope className="h-4 w-4 text-purple-500" />,
          value: dados.criancas.filter(c => c.temCondicaoMedica).length,
          cor: 'border-purple-400',
        },
      ]
    : [];

  if (loading) return <LoadingState message="Carregando painel da turma..." />;

  if (erro || !dados) {
    return (
      <PageShell title="Painel da Turma">
        <div className="p-6 text-center text-red-600">
          {erro ?? 'Dados não encontrados.'}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={`Painel — ${dados.classroomName}`}>
      <div className="max-w-6xl mx-auto p-4 space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <h1 className="text-lg font-semibold">{dados.classroomName}</h1>
            <Badge variant="outline">{dados.trimestre} · {dados.anoLetivo}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={carregar}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map(k => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        {/* Lista de crianças */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Crianças ({dados.criancas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dados.criancas.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma criança encontrada nesta turma.</p>
            ) : (
              <div className="space-y-2">
                {dados.criancas.map(c => (
                  <div
                    key={c.childId}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/app/crianca/${c.childId}/rdic-central`)}
                  >
                    <div className="flex items-center gap-3">
                      {c.photoUrl ? (
                        <img
                          src={c.photoUrl}
                          alt={c.firstName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                          {c.firstName[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {c.firstName} {c.lastName}
                        </p>
                        <div className="flex gap-1 mt-0.5">
                          {c.temAlergia && (
                            <span title="Alergia">
                              <Apple className="h-3 w-3 text-red-500" />
                            </span>
                          )}
                          {c.temCondicaoMedica && (
                            <span title="Condição médica">
                              <Stethoscope className="h-3 w-3 text-purple-500" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={STATUS_COLOR[c.rdic?.status ?? ''] ?? 'bg-gray-100 text-gray-600'}>
                      {c.rdic ? (STATUS_LABEL[c.rdic.status] ?? c.rdic.status) : 'Sem RDIC'}
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
