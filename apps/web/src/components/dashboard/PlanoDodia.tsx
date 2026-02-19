import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BookOpen, Target, Lightbulb, Calendar } from 'lucide-react';

interface CurriculumEntry {
  id: string;
  date: string;
  campoDeExperiencia?: string;
  objetivoBNCC?: string;
  objetivoCurriculo?: string;
  intencionalidade?: string;
  exemploAtividade?: string;
}

interface Planning {
  id: string;
  title: string;
  status: string;
  startDate?: string;
  endDate?: string;
  pedagogicalContent?: string;
}

interface PlanoDoDiaProps {
  planning: Planning | null;
  entry: CurriculumEntry | null;
  date?: string;
}

const CAMPO_LABELS: Record<string, string> = {
  O_EU_O_OUTRO_E_O_NOS: 'O Eu, o Outro e o Nós',
  CORPO_GESTOS_E_MOVIMENTOS: 'Corpo, Gestos e Movimentos',
  TRACOS_SONS_CORES_E_FORMAS: 'Traços, Sons, Cores e Formas',
  ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO: 'Escuta, Fala, Pensamento e Imaginação',
  ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES: 'Espaços, Tempos, Quantidades, Relações e Transformações',
};

export function PlanoDoDia({ planning, entry, date }: PlanoDoDiaProps) {
  const today = date || new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (!planning && !entry) {
    return (
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-gray-700">
            <Calendar className="h-4 w-4 text-gray-400" />
            Plano do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-400">
            <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhum planejamento ativo para hoje</p>
            <p className="text-xs mt-1">Acesse a seção de Planejamentos para criar ou ativar um plano.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-100 bg-green-50/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-green-800">
            <Calendar className="h-4 w-4 text-green-600" />
            Plano do Dia
          </CardTitle>
          <span className="text-xs text-green-600 font-medium capitalize">{today}</span>
        </div>
        {planning && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded font-semibold uppercase">
              {planning.status === 'EM_EXECUCAO' ? 'Em Execução' : planning.status}
            </span>
            <span className="text-sm font-semibold text-green-900">{planning.title}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {entry && (
          <>
            {/* Campo de Experiência */}
            {entry.campoDeExperiencia && (
              <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-green-100">
                <BookOpen className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Campo de Experiência (BNCC)</p>
                  <p className="text-sm font-medium text-gray-800">
                    {CAMPO_LABELS[entry.campoDeExperiencia] || entry.campoDeExperiencia}
                  </p>
                </div>
              </div>
            )}

            {/* Objetivo BNCC */}
            {entry.objetivoBNCC && (
              <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-blue-100">
                <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Objetivo BNCC</p>
                  <p className="text-sm text-gray-800 leading-relaxed">{entry.objetivoBNCC}</p>
                </div>
              </div>
            )}

            {/* Objetivo do Currículo */}
            {entry.objetivoCurriculo && (
              <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-purple-100">
                <Target className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Objetivo do Currículo Local</p>
                  <p className="text-sm text-gray-800 leading-relaxed">{entry.objetivoCurriculo}</p>
                </div>
              </div>
            )}

            {/* Intencionalidade e Atividade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {entry.intencionalidade && (
                <div className="p-3 bg-white rounded-lg border border-yellow-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Intencionalidade</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{entry.intencionalidade}</p>
                </div>
              )}
              {entry.exemploAtividade && (
                <div className="p-3 bg-white rounded-lg border border-orange-100">
                  <div className="flex items-center gap-1 mb-1">
                    <Lightbulb className="h-3 w-3 text-orange-500" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Atividade Sugerida</p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{entry.exemploAtividade}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Conteúdo pedagógico do planejamento */}
        {planning?.pedagogicalContent && !entry && (
          <div className="p-3 bg-white rounded-lg border border-green-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Conteúdo Pedagógico</p>
            <p className="text-sm text-gray-700 leading-relaxed">{planning.pedagogicalContent}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
