import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { getDiaryEvents, type DiaryEvent } from '../../api/diary';
import { Clock, User, Tag, Utensils, Moon, MessageSquare, AlertCircle } from 'lucide-react';

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
      const filtered = allEvents
        .filter(e => e.classroomId === classroomId)
        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
        .slice(0, 5);
      
      setEvents(filtered);
    } catch (error) {
      console.error('Erro ao carregar feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ALIMENTACAO': return <Utensils className="h-3.5 w-3.5 text-orange-500" />;
      case 'SONO': return <Moon className="h-3.5 w-3.5 text-blue-500" />;
      case 'OBSERVACAO': return <MessageSquare className="h-3.5 w-3.5 text-primary" />;
      case 'OCORRENCIA': return <AlertCircle className="h-3.5 w-3.5 text-green-500" />;
      default: return <Tag className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Card className="shadow-sm border-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Atividades Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Tag className="h-8 w-8 text-muted-foreground/20 mx-auto" />
            <p className="text-xs text-muted-foreground">Nenhuma atividade registrada hoje.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map(event => (
              <div key={event.id} className="flex gap-3 relative group">
                <div className="mt-1 shrink-0">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
                    {getEventIcon(event.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xs font-bold truncate">{event.title}</h4>
                    <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap bg-muted px-1.5 py-0.5 rounded">
                      {new Date(event.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{event.description}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <User className="h-2.5 w-2.5 text-muted-foreground/60" />
                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                      Aluno: {event.childId.substring(0, 8)}
                    </span>
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 ml-auto uppercase font-bold tracking-tighter">
                      {event.type}
                    </Badge>
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
