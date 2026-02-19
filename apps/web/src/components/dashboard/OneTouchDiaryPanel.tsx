import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { Utensils, Moon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createDiaryEvent } from '../../api/diary';
import { getPedagogicalToday } from '../../utils/pedagogicalDate';

import { getErrorMessage } from '../../utils/errorMessage';
interface StudentRef {
  id: string;
  name?: string;
}

interface OneTouchDiaryPanelProps {
  planningId: string;
  curriculumEntryId: string;
  classroomId: string;
  students: StudentRef[]; // Idealmente viria de uma API de alunos
}

export function OneTouchDiaryPanel({ planningId, curriculumEntryId, classroomId, students }: OneTouchDiaryPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleQuickRegister = async (type: string, title: string, description: string) => {
    try {
      setLoading(type);
      
      // Registro em lote para todos os alunos da turma
      // No MVP, faremos uma chamada por aluno (ou uma chamada de lote se o backend suportar)
      // Como o backend atual só tem createDiaryEvent individual, simularemos o lote
      
      const promises = students.map(student => 
        createDiaryEvent({
          type,
          title,
          description,
          eventDate: getPedagogicalToday(),
          childId: student.id,
          classroomId,
          planningId,
          curriculumEntryId
        })
      );

      await Promise.all(promises);

      toast({
        title: "Registro Concluído",
        description: `${title} registrado para ${students.length} alunos.`,
      });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Erro no Registro",
        description: getErrorMessage(error, "Falha ao registrar evento em lote."),
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Registro Rápido (One-Touch)
        </CardTitle>
        <CardDescription>
          Registre eventos comuns para toda a turma com um clique.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button 
          variant="outline" 
          className="h-20 flex flex-col gap-2"
          onClick={() => handleQuickRegister('ALIMENTACAO', 'Alimentação Completa', 'O aluno consumiu toda a refeição oferecida.')}
          disabled={!!loading}
        >
          <Utensils className="h-6 w-6 text-orange-500" />
          <span>Alimentação</span>
        </Button>

        <Button 
          variant="outline" 
          className="h-20 flex flex-col gap-2"
          onClick={() => handleQuickRegister('SONO', 'Sono Tranquilo', 'O aluno dormiu durante o período de repouso.')}
          disabled={!!loading}
        >
          <Moon className="h-6 w-6 text-blue-500" />
          <span>Sono</span>
        </Button>

        <Button 
          variant="outline" 
          className="h-20 flex flex-col gap-2"
          onClick={() => handleQuickRegister('OCORRENCIA', 'Sem Ocorrências', 'Dia transcorreu sem intercorrências médicas ou disciplinares.')}
          disabled={!!loading}
        >
          <AlertCircle className="h-6 w-6 text-green-500" />
          <span>Ocorrências</span>
        </Button>
      </CardContent>
    </Card>
  );
}
