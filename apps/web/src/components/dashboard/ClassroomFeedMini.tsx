import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { getDiaryEvents, type DiaryEvent } from '../../api/diary';
import { Clock, User, Tag } from 'lucide-react';

interface ClassroomFeedMiniProps {
  classroomId: string;
}

export function ClassroomFeedMini({ classroomId }: ClassroomFeedMiniProps) {
  const [events, setEvents] = useState<DiaryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const allEvents = await getDiaryEvents();
      // Filtrar por classroomId e ordenar por data (mais recentes primeiro)
      // Nota: O backend idealmente deveria filtrar, mas faremos no front para o MVP
      const filtered = allEvents
        .filter(e => e.classroomId === classroomId)
        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
        .slice(0, 5); // Apenas os 5 últimos
      
      setEvents(filtered);
    } catch (error) {
      console.error('Erro ao carregar feed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Nenhuma atividade registrada hoje.</p>
        ) : (
          <div className="space-y-4">
            {events.map(event => (
              <div key={event.id} className="flex gap-3 border-b pb-3 last:border-0">
                <div className="mt-1">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-semibold">{event.title}</h4>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(event.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-medium text-muted-foreground">ID Aluno: {event.childId.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
