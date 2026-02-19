import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Utensils, Moon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { createDiaryEvent } from '../../api/diary';
import { getPedagogicalToday } from '../../utils/pedagogicalDate';

interface OneTouchDiaryPanelProps {
  planningId: string;
  curriculumEntryId: string;
  classroomId: string;
  students: any[];
}

export function OneTouchDiaryPanel({ planningId, curriculumEntryId, classroomId, students }: OneTouchDiaryPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleQuickRegister = async (type: string, title: string, description: string) => {
    const toastId = toast.loading(`Registrando ${title.toLowerCase()}...`);
    try {
      setLoading(type);
      
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

      toast.success("Registro Concluído", {
        id: toastId,
        description: `${title} registrado para ${students.length} alunos.`,
      });
    } catch (error: any) {
      toast.error("Erro no Registro", {
        id: toastId,
        description: error.message || "Falha ao registrar evento em lote.",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="shadow-sm border-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Registro Rápido (One-Touch)
        </CardTitle>
        <CardDescription>
          Ações coletivas para toda a turma com um único clique.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button 
          variant="outline" 
          className="h-24 flex flex-col gap-2 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all group"
          onClick={() => handleQuickRegister('ALIMENTACAO', 'Alimentação Completa', 'O aluno consumiu toda a refeição oferecida.')}
          disabled={!!loading}
        >
          {loading === 'ALIMENTACAO' ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Utensils className="h-6 w-6 text-orange-500 group-hover:scale-110 transition-transform" />
          )}
          <span className="font-semibold">Alimentação</span>
        </Button>

        <Button 
          variant="outline" 
          className="h-24 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all group"
          onClick={() => handleQuickRegister('SONO', 'Sono Tranquilo', 'O aluno dormiu durante o período de repouso.')}
          disabled={!!loading}
        >
          {loading === 'SONO' ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Moon className="h-6 w-6 text-blue-500 group-hover:scale-110 transition-transform" />
          )}
          <span className="font-semibold">Sono</span>
        </Button>

        <Button 
          variant="outline" 
          className="h-24 flex flex-col gap-2 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-all group"
          onClick={() => handleQuickRegister('OCORRENCIA', 'Sem Ocorrências', 'Dia transcorreu sem intercorrências médicas ou disciplinares.')}
          disabled={!!loading}
        >
          {loading === 'OCORRENCIA' ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <AlertCircle className="h-6 w-6 text-green-500 group-hover:scale-110 transition-transform" />
          )}
          <span className="font-semibold">Ocorrências</span>
        </Button>
      </CardContent>
    </Card>
  );
}
