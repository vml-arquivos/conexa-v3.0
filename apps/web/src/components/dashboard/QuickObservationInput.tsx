import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { MessageSquare, Send } from 'lucide-react';
import { createDiaryEvent } from '../../api/diary';
import { getPedagogicalToday } from '../../utils/pedagogicalDate';

import { getErrorMessage } from '../../utils/errorMessage';
interface StudentRef {
  id: string;
  name?: string;
}

interface QuickObservationInputProps {
  planningId: string;
  curriculumEntryId: string;
  classroomId: string;
  students: StudentRef[];
}

export function QuickObservationInput({ planningId, curriculumEntryId, classroomId, students }: QuickObservationInputProps) {
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendObservation = async () => {
    if (!selectedStudent || !observation.trim()) return;

    try {
      setLoading(true);
      await createDiaryEvent({
        type: 'OBSERVACAO',
        title: 'Observação Pedagógica',
        description: observation,
        eventDate: getPedagogicalToday(),
        childId: selectedStudent,
        classroomId,
        planningId,
        curriculumEntryId
      });

      toast({
        title: "Observação Salva",
        description: "A observação foi registrada no diário do aluno.",
      });
      setObservation('');
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: getErrorMessage(error, "Falha ao registrar observação."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          Observação Rápida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Aluno</label>
          <select 
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
          >
            <option value="">Selecione um aluno...</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>{student.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Observação</label>
          <textarea 
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Digite aqui a observação do dia..."
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
          />
        </div>

        <Button 
          className="w-full gap-2" 
          onClick={handleSendObservation}
          disabled={loading || !selectedStudent || !observation.trim()}
        >
          <Send className="h-4 w-4" />
          Salvar Observação
        </Button>
      </CardContent>
    </Card>
  );
}
