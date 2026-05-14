import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getPrimaryRole } from '../../app/AuthProvider';
import { normalizeRoles } from '../../app/RoleProtectedRoute';
import { getPedagogicalToday } from '../../utils/pedagogicalDate';
import http from '../../api/http';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Calendar, LogOut, User, Users, Building2, Menu,
  Settings, UserCircle, ChevronDown,
} from 'lucide-react';

interface TopbarProps {
  onMenuToggle?: () => void;
}

type AccessibleClassroom = {
  id: string;
  name: string;
};

/**
 * Roles que representam coordenação/direção/unidade — não devem ver turma fixa.
 * Para esses roles, exibe contexto de unidade em vez de turma.
 */
const COORD_ROLES = [
  'UNIDADE',
  'UNIDADE_DIRETOR',
  'UNIDADE_COORDENADOR_PEDAGOGICO',
  'UNIDADE_NUTRICIONISTA',
  'UNIDADE_ADMINISTRATIVO',
  'STAFF_CENTRAL',
  'MANTENEDORA',
  'DEVELOPER',
];

/** Gera iniciais do nome do usuário para o avatar */
function getInitials(user: any): string {
  const firstName =
    user?.firstName || user?.user?.firstName || (user?.nome as string)?.split(' ')[0] || '';
  const lastName =
    user?.lastName || user?.user?.lastName || (user?.nome as string)?.split(' ')[1] || '';
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  const email: string = user?.email || user?.user?.email || '';
  return email ? email.slice(0, 2).toUpperCase() : 'U';
}

/** Retorna o nome de exibição do usuário */
function getDisplayName(user: any): string {
  const full =
    user?.nome ||
    user?.user?.name ||
    `${user?.firstName || user?.user?.firstName || ''} ${user?.lastName || user?.user?.lastName || ''}`.trim();
  return full || user?.email || 'Usuário';
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();
  const [resolvedClassroom, setResolvedClassroom] = useState<AccessibleClassroom | null>(null);

  // FIX p0.1: usar normalizeRoles + getPrimaryRole para seleção determinística do role exibido
  const userRoles = normalizeRoles(user);
  const primaryRole = getPrimaryRole(userRoles) || 'Usuário';

  // Determinar se o usuário é coordenação/unidade ou professor
  const userRoleTypes: string[] = (() => {
    if (!user || typeof user !== 'object') return [];
    const u = user as Record<string, unknown>;
    const roles = (u.roles ?? (u.user as Record<string, unknown> | undefined)?.roles) as unknown[] | undefined;
    if (!Array.isArray(roles)) return [];
    return roles
      .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
      .map((r) => (typeof r.type === 'string' ? r.type : null))
      .filter((t): t is string => t !== null);
  })();

  const allRoles = [...new Set([...userRoles, ...userRoleTypes])];
  const isCoordRole = allRoles.some((r) => COORD_ROLES.includes(r));

  // Dados de unidade (disponíveis no payload do /auth/me)
  const unitData = user?.unit;
  const unitName = unitData?.name ?? null;

  // Informações pedagógicas para a Topbar
  const today = getPedagogicalToday();
  const directClassrooms = Array.isArray(user?.classrooms)
    ? user.classrooms
    : Array.isArray(user?.user?.classrooms)
      ? user.user.classrooms
      : [];
  const directClassroom = directClassrooms[0] as AccessibleClassroom | undefined;
  const classroomName = directClassroom?.name || resolvedClassroom?.name || 'Turma não atribuída';
  const hasClassroom = Boolean(directClassroom?.id || resolvedClassroom?.id);

  useEffect(() => {
    if (isCoordRole) return;
    let active = true;
    if (directClassroom?.id) {
      setResolvedClassroom(null);
      return () => { active = false; };
    }
    http.get('/lookup/classrooms/accessible')
      .then((response) => {
        if (!active) return;
        const classrooms = Array.isArray(response.data) ? response.data : [];
        const firstClassroom = classrooms[0];
        setResolvedClassroom(
          firstClassroom?.id && firstClassroom?.name
            ? { id: firstClassroom.id, name: firstClassroom.name }
            : null,
        );
      })
      .catch(() => { if (!active) return; setResolvedClassroom(null); });
    return () => { active = false; };
  }, [directClassroom?.id, isCoordRole]);

  const displayName = getDisplayName(user);
  const initials = getInitials(user);
  const firstName = displayName.split(' ')[0];

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

          {/* Contexto: Turma (professor) ou Unidade (coordenação/direção) */}
          {isCoordRole ? (
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground min-w-0">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Unidade:</span>
              <Badge variant="secondary" className="truncate max-w-[140px] sm:max-w-[220px]">
                {unitName ?? 'Unidade'}
              </Badge>
            </div>
          ) : (
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
          )}
        </div>

        {/* Direita: dropdown de usuário */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 sm:gap-3 rounded-xl px-2 py-1.5 hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Menu do usuário"
              >
                {/* Avatar com iniciais */}
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0 text-xs font-bold text-primary select-none">
                  {initials}
                </div>
                {/* Nome + role — ocultos em mobile */}
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold truncate max-w-[130px]">{firstName}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    {primaryRole}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              {/* Cabeçalho do dropdown */}
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-sm truncate">{displayName}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user?.email || user?.user?.email || ''}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Meu Perfil */}
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => navigate('/app/meu-perfil')}
              >
                <UserCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                Meu Perfil
              </DropdownMenuItem>

              {/* Configurações */}
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => navigate('/app/configuracoes')}
              >
                <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
                Configurações
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Sair */}
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={logout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
