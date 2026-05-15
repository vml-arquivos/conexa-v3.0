import { useEffect, useState } from 'react';
import { useAuth, getPrimaryRole } from '../../app/AuthProvider';
import { normalizeRoles } from '../../app/RoleProtectedRoute';
import { getPedagogicalToday } from '../../utils/pedagogicalDate';
import http from '../../api/http';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, LogOut, User, Users, Building2, Menu } from 'lucide-react';

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

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth() as any;
  const [resolvedClassroom, setResolvedClassroom] = useState<AccessibleClassroom | null>(null);

  // FIX p0.1: usar normalizeRoles + getPrimaryRole para seleção determinística do role exibido
  // Garante que STAFF_CENTRAL apareça mesmo quando o array de roles tem outra ordem
  const userRoles = normalizeRoles(user);
  const primaryRole = getPrimaryRole(userRoles) || 'Usuário';

  // ─── Determinar se o usuário é coordenação/unidade ou professor ────────────
  // Importar normalizeRoleTypes para verificar types específicos (UNIDADE_DIRETOR etc.)
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

  // ─── Dados de unidade (disponíveis no payload do /auth/me) ────────────────
  // O /auth/me retorna: user.unit = { id, name, unitCode } | null
  // O tipo User já declara o campo unit — acesso direto sem cast
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
    // Coordenação não precisa resolver turma — evita chamada desnecessária
    if (isCoordRole) return;

    let active = true;

    if (directClassroom?.id) {
      setResolvedClassroom(null);
      return () => {
        active = false;
      };
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
      .catch(() => {
        if (!active) return;
        setResolvedClassroom(null);
      });

    return () => {
      active = false;
    };
  }, [directClassroom?.id, isCoordRole]);

  return (
    <header className="bg-background border-b border-border px-3 sm:px-6 py-3 sticky top-0 z-40">
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

          {/* Data pedagógica — visível a partir de sm */}
          <div className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap hidden md:inline">Data:</span>
            <Badge variant="outline" className="font-mono text-xs">{today}</Badge>
          </div>

          {/* Contexto: Turma (professor) ou Unidade (coordenação/direção) */}
          {isCoordRole ? (
            /* ── Coordenação/Direção: exibe unidade, nunca turma fixa ── */
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground min-w-0">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Unidade:</span>
              <Badge
                variant="secondary"
                className="truncate max-w-[140px] sm:max-w-[220px]"
              >
                {unitName ?? 'Unidade'}
              </Badge>
            </div>
          ) : (
            /* ── Professor/Auxiliar: exibe turma atribuída ── */
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
