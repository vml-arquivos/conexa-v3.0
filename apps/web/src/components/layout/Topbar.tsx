import { useAuth } from '../../app/AuthProvider';
import { getPedagogicalToday } from '../../utils/pedagogicalDate';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, LogOut, User, Users } from 'lucide-react';

export function Topbar() {
  const { user, logout } = useAuth();
  
  // Informações pedagógicas para a Topbar
  const today = getPedagogicalToday();
  const classroomName = user?.user?.classrooms?.[0]?.name || "Turma não atribuída";
  const hasClassroom = !!user?.user?.classrooms?.[0]?.id;

  return (
    <header className="bg-background border-b border-border px-6 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Data Pedagógica:</span>
            <Badge variant="outline" className="font-mono">{today}</Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-l pl-6">
            <Users className="h-4 w-4" />
            <span>Turma:</span>
            <Badge variant={hasClassroom ? "secondary" : "destructive"}>
              {classroomName}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2 hidden sm:flex">
            <span className="text-sm font-semibold">{user?.user?.name || user?.email}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              {user?.user?.roles?.[0] || "Usuário"}
            </span>
          </div>
          
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <User className="h-4 w-4 text-primary" />
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={logout}
            className="text-muted-foreground hover:text-destructive"
            title="Sair"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
