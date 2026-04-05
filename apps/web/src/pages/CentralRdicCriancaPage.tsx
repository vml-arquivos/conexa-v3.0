/**
 * CentralRdicCriancaPage.tsx — SEDF 2026
 *
 * Fase 1: Central RDIC da Criança
 * Rota: /app/crianca/:childId/rdic-central
 *
 * Exibe:
 *  - Dados da criança (nome, idade, turma, alergias)
 *  - Histórico de todos os RDICs
 *  - Botão para abrir o Painel Analítico (Fase 2)
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, BarChart2, User,
  AlertTriangle, BookOpen, Clock, CheckCircle,
  RotateCcw, Globe,
} from 'lucide-react';
import { useHttp } from '../hooks/useHttp';
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
  conteudoFinal: Record<string, unknown> | null;
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

interface CentralResponse {
  child: CriancaDados;
  acompanhamentoNutricional: unknown | null;
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

const STATUS_ICON: Record<string, React.ReactNode> = {
  RASCUNHO: <Clock className="h-3 w-3" />,
  EM_REVISAO: <Clock className="h-3 w-3" />,
  DEVOLVIDO: <RotateCcw className="h-3 w-3" />,
  APROVADO: <CheckCircle className="h-3 w-3" />,
  FINALIZADO: <CheckCircle className="h-3 w-3" />,
  PUBLICADO: <Globe className="h-3 w-3" />,
};

function calcularIdade(dateOfBirth: string | null): string {
  if (!dateOfBirth) return '—';
  const nasc = new Date(dateOfBirth);
  if (isNaN(nasc.getTime())) return '—';
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

function formatarGenero(gender: string | null): string {
  if (!gender) return '';
  const map: Record<string, string> = {
    MASCULINO: 'Masculino',
    FEMININO: 'Feminino',
    M: 'Masculino',
    F: 'Feminino',
  };
  return map[gender.toUpperCase()] ?? gender;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CentralRdicCriancaPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const http = useHttp();

  const [dados, setDados] = useState<CentralResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await http.get<CentralResponse>(
        `/rdic/central-crianca/${childId}`,
      );
      setDados(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar dados da criança.';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }, [childId, http]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (loading) return <LoadingState message="Carregando central da criança..." />;

  if (erro || !dados) {
    return (
      <PageShell title="Central RDIC">
        <div className="p-6 text-center text-red-600">
          {erro ?? 'Dados não encontrados.'}
        </div>
      </PageShell>
    );
  }

  const { child, rdics } = dados;
  const idade = calcularIdade(child.dateOfBirth);
  const genero = formatarGenero(child.gender);

  return (
    <PageShell title={`Central RDIC — ${child.firstName} ${child.lastName}`}>
      <div className="max-w-4xl mx-auto p-4 space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/app/crianca/${childId}/painel-analitico`)}
            >
              <BarChart2 className="h-4 w-4 mr-1" />
              Painel Analítico
            </Button>
            <Button variant="ghost" size="sm" onClick={carregar}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Card da criança */}
        <Card>
          <CardContent className="pt-4 flex gap-4 items-center">
            {child.photoUrl ? (
              <img
                src={child.photoUrl}
                alt={child.firstName}
                className="w-16 h-16 rounded-full object-cover border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="h-8 w-8 text-indigo-500" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                {child.firstName} {child.lastName}
              </h2>
              <p className="text-sm text-gray-500">
                {idade}
                {genero ? ` · ${genero}` : ''}
              </p>
              {child.turmaAtual && (
                <p className="text-sm text-gray-600 mt-1">
                  Turma: <strong>{child.turmaAtual.name}</strong>
                  <span className="text-gray-400 ml-1">({child.turmaAtual.code})</span>
                </p>
              )}
              {child.allergies && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {child.allergies}
                </p>
              )}
              {child.medicalConditions && (
                <p className="text-xs text-orange-600 mt-0.5">
                  {child.medicalConditions}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Histórico de RDICs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Histórico de RDICs ({rdics.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rdics.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                Nenhum RDIC registado para esta criança.
              </p>
            ) : (
              <div className="space-y-2">
                {rdics.map(rdic => (
                  <div
                    key={rdic.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {rdic.periodo}
                        <span className="text-gray-400 ml-2 font-normal">
                          {rdic.anoLetivo}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Atualizado: {new Date(rdic.atualizadoEm).toLocaleDateString('pt-BR')}
                      </p>
                      {rdic.reviewComment && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" />
                          {rdic.reviewComment}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {STATUS_ICON[rdic.status]}
                      <Badge className={`text-xs ${STATUS_COLOR[rdic.status] ?? 'bg-gray-100'}`}>
                        {STATUS_LABEL[rdic.status] ?? rdic.status}
                      </Badge>
                    </div>
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
