import { useState, useEffect } from 'react';
import { useAuth } from '../app/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { PageShell } from '../components/ui/PageShell';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import { Calendar, Plus, FileText, Save } from 'lucide-react';

interface PlanningDay {
  date: string;
  dayOfWeek: number;
  campoDeExperiencia: string;
  objetivoBNCC: string;
  objetivoBNCCCode: string;
  objetivoCurriculo: string;
  intencionalidade: string;
  exemploAtividade: string;
  atividadePlanejada: string;
  materiaisNecessarios: string[];
  observacoes: string;
}

interface Planning {
  id: string;
  title: string;
  weekStart: string;
  weekEnd: string;
  matrix: {
    name: string;
    code: string;
  };
  days: number;
  content: PlanningDay[];
}

export default function PlanejamentosPage() {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState<Planning | null>(null);
  const [weekStart, setWeekStart] = useState('');

  useEffect(() => {
    // Definir segunda-feira da semana atual
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ajustar para segunda
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    setWeekStart(monday.toISOString().split('T')[0]);
  }, []);

  async function handleGenerate() {
    if (!weekStart) {
      toast.error('Selecione a data de início da semana');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/teachers/planning/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ weekStartDate: weekStart }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao gerar planejamento');
      }

      const data = await response.json();
      setPlanning(data);
      toast.success('Planejamento gerado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao gerar planejamento:', err);
      toast.error(err.message || 'Erro ao gerar planejamento');
    } finally {
      setLoading(false);
    }
  }

  function updateDay(index: number, field: string, value: any) {
    if (!planning) return;

    const newContent = [...planning.content];
    newContent[index] = { ...newContent[index], [field]: value };
    setPlanning({ ...planning, content: newContent });
  }

  const diasSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

  return (
    <PageShell 
      title="Planejamentos Pedagógicos"
      subtitle="Gere e edite seus planejamentos semanais baseados na matriz curricular"
    >
      {/* Gerador de Planejamento */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gerar Novo Planejamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="weekStart">Início da Semana (Segunda-feira)</Label>
              <Input
                id="weekStart"
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {loading ? 'Gerando...' : 'Gerar Planejamento'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Planejamento Gerado */}
      {planning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {planning.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {planning.matrix.name} • {planning.days} dias letivos
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {planning.content.map((day, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                {/* Cabeçalho do Dia */}
                <div className="border-b pb-3">
                  <h3 className="font-semibold text-lg">
                    {diasSemana[day.dayOfWeek - 1]} - {new Date(day.date).toLocaleDateString('pt-BR')}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Campo de Experiência:</strong> {day.campoDeExperiencia}
                  </p>
                </div>

                {/* Objetivos (Somente Leitura) */}
                <div className="bg-muted/50 p-3 rounded space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">OBJETIVO BNCC ({day.objetivoBNCCCode})</p>
                    <p className="text-sm">{day.objetivoBNCC}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">OBJETIVO CURRÍCULO EM MOVIMENTO</p>
                    <p className="text-sm">{day.objetivoCurriculo}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">INTENCIONALIDADE</p>
                    <p className="text-sm">{day.intencionalidade}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">EXEMPLO DE ATIVIDADE</p>
                    <p className="text-sm italic">{day.exemploAtividade}</p>
                  </div>
                </div>

                {/* Campos Editáveis pelo Professor */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`atividade-${index}`}>
                      Atividade Planejada *
                    </Label>
                    <Textarea
                      id={`atividade-${index}`}
                      placeholder="Descreva a atividade que você vai realizar com base no exemplo acima..."
                      value={day.atividadePlanejada}
                      onChange={(e) => updateDay(index, 'atividadePlanejada', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`materiais-${index}`}>
                      Materiais Necessários
                    </Label>
                    <Input
                      id={`materiais-${index}`}
                      placeholder="Ex: Massinha, papel kraft, tintas..."
                      value={day.materiaisNecessarios.join(', ')}
                      onChange={(e) => updateDay(index, 'materiaisNecessarios', e.target.value.split(',').map(m => m.trim()))}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`obs-${index}`}>
                      Observações
                    </Label>
                    <Textarea
                      id={`obs-${index}`}
                      placeholder="Observações adicionais sobre este dia..."
                      value={day.observacoes}
                      onChange={(e) => updateDay(index, 'observacoes', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Botão Salvar */}
            <div className="flex justify-end pt-4">
              <Button className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Salvar Planejamento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado Vazio */}
      {!planning && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum planejamento gerado</p>
              <p className="text-sm">
                Selecione uma data e clique em "Gerar Planejamento" para começar
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <LoadingState message="Gerando planejamento..." />}
    </PageShell>
  );
}
