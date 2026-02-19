import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { createDiaryEvent } from '../../api/diary';
import { getPedagogicalToday } from '../../utils/pedagogicalDate';

interface QuickObservationInputProps {
  planningId: string;
  curriculumEntryId: string;
  classroomId: string;
  students: any[];
}

export function QuickObservationInput({ planningId, curriculumEntryId, classroomId, students }: QuickObservationInputProps) {
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

      toast.success("Observação Salva", {
        description: "A observação foi registrada no diário do aluno.",
      });
      setObservation('');
    } catch (error: any) {
      toast.error("Erro ao Salvar", {
        description: error.message || "Falha ao registrar observação.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm border-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          Observação Rápida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aluno</label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observação</label>
          <Textarea 
            className="min-h-[100px] resize-none"
            placeholder="Digite aqui a observação do dia para este aluno..."
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
          />
        </div>

        <Button 
          className="w-full gap-2 font-semibold" 
          onClick={handleSendObservation}
          disabled={loading || !selectedStudent || !observation.trim()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Salvar Observação
        </Button>
      </CardContent>
    </Card>
  );
}
