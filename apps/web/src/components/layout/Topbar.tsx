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
  const userRoles = normalizeRoles(user);
  const primaryRole = getPrimaryRole(userRoles) || 'Usuário';

  // ─── Determinar se o usuário é coordenação/unidade ou professor ────────────
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

  // ─── Dados de unidade ────────────────────────────────────────────────────
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

  return (
    <header className="bg-slate-950 border-b border-slate-800/50 px-3 sm:px-4 sticky top-0 z-50 h-[48px] flex items-center">
      <div className="flex items-center justify-between w-full gap-2">

        {/* ── Esquerda: hamburguer + info pedagógica ── */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Botão hamburguer — apenas mobile */}
          <button
            className="md:hidden flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
            onClick={onMenuToggle}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Data pedagógica — oculta em mobile pequeno */}
          <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
            <Calendar className="h-3.5 w-3.5 text-slate-600" />
            <span className="font-mono text-[11px] font-normal text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md tabular-nums">
              {today}
            </span>
          </div>

          {/* Separador — apenas sm+ */}
          <span className="hidden sm:block w-px h-4 bg-slate-800 flex-shrink-0" />

          {/* Contexto: Turma ou Unidade */}
          {isCoordRole ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-slate-600" />
              <span className="text-[11px] font-normal text-slate-500 hidden sm:inline whitespace-nowrap">Unidade</span>
              <span className="text-[11px] font-medium text-slate-300 truncate max-w-[100px] sm:max-w-[180px]">
                {unitName ?? 'Unidade'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <Users className="h-3.5 w-3.5 flex-shrink-0 text-slate-600" />
              <span className="text-[11px] font-normal text-slate-500 hidden sm:inline whitespace-nowrap">Turma</span>
              <span className={`text-[11px] font-medium truncate max-w-[90px] sm:max-w-[160px] ${
                hasClassroom ? 'text-slate-300' : 'text-red-400'
              }`}>
                {classroomName}
              </span>
            </div>
          )}
        </div>

        {/* ── Direita: nome + avatar + logout ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Nome e role — apenas sm+ */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[12px] font-medium text-slate-200 truncate max-w-[130px] leading-tight">
              {user?.nome || user?.user?.name || user?.email}
            </span>
            <span className="text-[9px] font-normal text-slate-500 tracking-wide">
              {primaryRole}
            </span>
          </div>

          {/* Avatar compacto */}
          <div className="h-7 w-7 rounded-full bg-brand-800/40 flex items-center justify-center border border-brand-700/30 flex-shrink-0">
            <User className="h-3.5 w-3.5 text-brand-400" />
          </div>

          {/* Logout — touch-friendly */}
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-800/70 transition-colors touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
