import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import {
  Heart, Brain, Users, Smile, Star, BookOpen,
  Utensils, Moon, Activity, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';
import { createDiaryEvent } from '../../api/diary';
import { getPedagogicalToday } from '../../utils/pedagogicalDate';
import { getErrorMessage } from '../../utils/errorMessage';

interface StudentRef {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

interface StudentDevelopmentPanelProps {
  planningId: string;
  curriculumEntryId: string;
  classroomId: string;
  students: StudentRef[];
}

type MicrogroupType = 'desenvolvimento' | 'rotina' | 'comportamento' | 'saude';

interface Microgesto {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  group: MicrogroupType;
}

const MICROGESTOS: Microgesto[] = [
  // Desenvolvimento
  { type: 'DESENVOLVIMENTO', title: 'Marco de Desenvolvimento', description: 'Criança demonstrou novo marco no desenvolvimento.', icon: <Star className="h-5 w-5" />, color: 'text-purple-600 bg-purple-50 border-purple-200', group: 'desenvolvimento' },
  { type: 'AVALIACAO', title: 'Progresso Pedagógico', description: 'Progresso observado nas atividades pedagógicas do dia.', icon: <BookOpen className="h-5 w-5" />, color: 'text-blue-600 bg-blue-50 border-blue-200', group: 'desenvolvimento' },
  { type: 'DESENVOLVIMENTO', title: 'Interação Social', description: 'Boa interação social com colegas e educadores.', icon: <Users className="h-5 w-5" />, color: 'text-green-600 bg-green-50 border-green-200', group: 'desenvolvimento' },
  { type: 'DESENVOLVIMENTO', title: 'Expressão Emocional', description: 'Expressão emocional positiva e regulação observada.', icon: <Heart className="h-5 w-5" />, color: 'text-pink-600 bg-pink-50 border-pink-200', group: 'desenvolvimento' },
  { type: 'DESENVOLVIMENTO', title: 'Desenvolvimento Cognitivo', description: 'Demonstrou curiosidade e engajamento cognitivo.', icon: <Brain className="h-5 w-5" />, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', group: 'desenvolvimento' },
  // Rotina
  { type: 'REFEICAO', title: 'Alimentação Completa', description: 'Consumiu toda a refeição oferecida.', icon: <Utensils className="h-5 w-5" />, color: 'text-orange-600 bg-orange-50 border-orange-200', group: 'rotina' },
  { type: 'REFEICAO', title: 'Alimentação Parcial', description: 'Consumiu parte da refeição oferecida.', icon: <Utensils className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50 border-amber-200', group: 'rotina' },
  { type: 'SONO', title: 'Sono Tranquilo', description: 'Dormiu bem durante o período de repouso.', icon: <Moon className="h-5 w-5" />, color: 'text-blue-600 bg-blue-50 border-blue-200', group: 'rotina' },
  { type: 'HIGIENE', title: 'Higiene Realizada', description: 'Higiene pessoal realizada conforme rotina.', icon: <Smile className="h-5 w-5" />, color: 'text-teal-600 bg-teal-50 border-teal-200', group: 'rotina' },
  // Comportamento
  { type: 'COMPORTAMENTO', title: 'Comportamento Positivo', description: 'Demonstrou comportamento colaborativo e respeitoso.', icon: <Smile className="h-5 w-5" />, color: 'text-green-600 bg-green-50 border-green-200', group: 'comportamento' },
  { type: 'COMPORTAMENTO', title: 'Dificuldade Comportamental', description: 'Apresentou dificuldade de comportamento que requer atenção.', icon: <Activity className="h-5 w-5" />, color: 'text-red-600 bg-red-50 border-red-200', group: 'comportamento' },
  // Saúde
  { type: 'SAUDE', title: 'Ocorrência de Saúde', description: 'Ocorrência de saúde registrada para acompanhamento.', icon: <Activity className="h-5 w-5" />, color: 'text-red-600 bg-red-50 border-red-200', group: 'saude' },
  { type: 'OBSERVACAO', title: 'Observação Geral', description: 'Observação geral do dia registrada.', icon: <MessageSquare className="h-5 w-5" />, color: 'text-gray-600 bg-gray-50 border-gray-200', group: 'saude' },
];

const GROUP_LABELS: Record<MicrogroupType, string> = {
  desenvolvimento: '🌱 Desenvolvimento',
  rotina: '⏰ Rotina Diária',
  comportamento: '😊 Comportamento',
  saude: '❤️ Saúde e Observações',
};

export function StudentDevelopmentPanel({ planningId, curriculumEntryId, classroomId, students }: StudentDevelopmentPanelProps) {
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [loadingGesto, setLoadingGesto] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<MicrogroupType, boolean>>({
    desenvolvimento: true,
    rotina: true,
    comportamento: false,
    saude: false,
  });

  const toggleGroup = (group: MicrogroupType) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const getStudentName = (student: StudentRef) => {
    if (student.name) return student.name;
    return [student.firstName, student.lastName].filter(Boolean).join(' ') || 'Aluno';
  };

  const handleMicrogesto = async (gesto: Microgesto) => {
    if (!selectedStudent) {
      toast({ variant: 'destructive', title: 'Selecione um aluno', description: 'Escolha o aluno antes de registrar o microgesto.' });
      return;
    }
    const key = `${gesto.type}-${gesto.title}`;
    try {
      setLoadingGesto(key);
      const studentName = students.find(s => s.id === selectedStudent);
      await createDiaryEvent({
        type: gesto.type,
        title: gesto.title,
        description: customNote.trim() || gesto.description,
        eventDate: getPedagogicalToday(),
        childId: selectedStudent,
        classroomId,
        planningId,
        curriculumEntryId,
      });
      toast({
        title: `Microgesto registrado!`,
        description: `"${gesto.title}" registrado para ${studentName ? getStudentName(studentName) : 'o aluno'}.`,
      });
      setCustomNote('');
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar',
        description: getErrorMessage(error, 'Não foi possível registrar o microgesto.'),
      });
    } finally {
      setLoadingGesto(null);
    }
  };

  const groupedGestos = MICROGESTOS.reduce((acc, gesto) => {
    if (!acc[gesto.group]) acc[gesto.group] = [];
    acc[gesto.group].push(gesto);
    return acc;
  }, {} as Record<MicrogroupType, Microgesto[]>);

  return (
    <Card className="border-purple-100">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-purple-900">
          <Star className="h-5 w-5 text-purple-600" />
          Desenvolvimento Individual — Microgestos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Seleção de aluno */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Selecionar Criança</label>
          <select
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Selecione uma criança para registrar...</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>{getStudentName(student)}</option>
            ))}
          </select>
        </div>

        {/* Nota personalizada (opcional) */}
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">
            Nota adicional (opcional — substituirá a descrição padrão do microgesto)
          </label>
          <textarea
            placeholder="Detalhe específico da observação..."
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            rows={2}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Grupos de microgestos */}
        {(Object.keys(groupedGestos) as MicrogroupType[]).map(group => (
          <div key={group} className="border border-gray-100 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-sm font-semibold text-gray-700">{GROUP_LABELS[group]}</span>
              {expandedGroups[group] ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {expandedGroups[group] && (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groupedGestos[group].map((gesto, idx) => {
                  const key = `${gesto.type}-${gesto.title}`;
                  const isLoading = loadingGesto === key;
                  return (
                    <Button
                      key={idx}
                      variant="outline"
                      className={`h-auto py-2.5 px-3 flex items-start gap-2 text-left justify-start border ${gesto.color} hover:opacity-90 transition-opacity`}
                      onClick={() => handleMicrogesto(gesto)}
                      disabled={isLoading || !selectedStudent}
                    >
                      <span className="flex-shrink-0 mt-0.5">{gesto.icon}</span>
                      <span className="text-xs font-medium leading-tight">{gesto.title}</span>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {!selectedStudent && (
          <p className="text-xs text-center text-gray-400 italic">
            Selecione uma criança acima para habilitar os microgestos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
