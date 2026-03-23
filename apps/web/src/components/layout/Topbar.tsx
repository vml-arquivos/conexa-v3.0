import { useAuth, getPrimaryRole } from '../../app/AuthProvider';
import { normalizeRoles } from '../../app/RoleProtectedRoute';
import { getPedagogicalToday } from '../../utils/pedagogicalDate';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, LogOut, User, Users, Menu } from 'lucide-react';

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth() as any;

  // FIX p0.1: usar normalizeRoles + getPrimaryRole para seleção determinística do role exibido
  // Garante que STAFF_CENTRAL apareça mesmo quando o array de roles tem outra ordem
  const userRoles = normalizeRoles(user);
  const primaryRole = getPrimaryRole(userRoles) || 'Usuário';

  // Informações pedagógicas para a Topbar
  const today = getPedagogicalToday();
  const classroomName = user?.user?.classrooms?.[0]?.name || "Turma não atribuída";
  const hasClassroom = !!user?.user?.classrooms?.[0]?.id;

  return (
    <header className="bg-background border-b border-border px-3 sm:px-6 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        {/* Esquerda: hamburguer (mobile) + info pedagógica */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Botão hamburguer — visível apenas em mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden flex-shrink-0 text-muted-foreground"
            onClick={onMenuToggle}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Data pedagógica — oculta em telas pequenas */}
          <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Data Pedagógica:</span>
            <Badge variant="outline" className="font-mono">{today}</Badge>
          </div>

          {/* Turma */}
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground min-w-0">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Turma:</span>
            <Badge
              variant={hasClassroom ? 'secondary' : 'destructive'}
              className="truncate max-w-[120px] sm:max-w-[200px]"
            >
              {classroomName}
            </Badge>
          </div>
        </div>

        {/* Direita: nome do usuário + avatar + logout */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold truncate max-w-[140px]">
              {user?.nome || user?.user?.name || user?.email}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              {primaryRole}
            </span>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
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
