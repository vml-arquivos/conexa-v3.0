import { useEffect, useState } from 'react';
import { useAuth, getPrimaryRole } from '../../app/AuthProvider';
import { normalizeRoles } from '../../app/RoleProtectedRoute';
import { getPedagogicalToday } from '../../utils/pedagogicalDate';
import http from '../../api/http';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, LogOut, Users, Building2, Menu, Moon, Search, Sparkles, Sun } from 'lucide-react';
import { useAgent } from '../agent/AgentContext';
import { useMissions } from '../agent/useMissions';
import { useTheme } from '../../contexts/ThemeContext';

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

/** Perfis que podem abrir o Centro de Missões (mesma regra da rota). */
const MISSION_ROLES = ['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER'];

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth() as any;
  const { theme, toggleTheme } = useTheme();
  const { togglePanel, openPalette } = useAgent();
  // O selo de prioridades é carregado com atraso e só para perfis que usam missões,
  // para nunca competir com o carregamento da página.
  const [badgeReady, setBadgeReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setBadgeReady(true), 2500);
    return () => window.clearTimeout(t);
  }, []);
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
  const usesMissions = allRoles.some((r) => MISSION_ROLES.includes(r) || r.startsWith('UNIDADE_') || r.startsWith('STAFF_CENTRAL_'));
  const missionsUserKey = String(user?.id ?? user?.user?.id ?? user?.email ?? 'anon');
  const { summary } = useMissions(badgeReady && usesMissions, missionsUserKey);
  const urgentCount = (summary.CRITICAL ?? 0) + (summary.HIGH ?? 0);

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

  const displayName = (user?.nome || user?.user?.name || user?.email || '') as string;
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  const iconBtn =
    'relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] touch-manipulation';

  return (
    <header className="sticky top-0 z-50 flex h-14 flex-shrink-0 items-center border-b border-[var(--border-default)] bg-[var(--surface-topbar)] px-3 text-[var(--text-primary)] backdrop-blur-md supports-[backdrop-filter]:bg-[var(--surface-topbar)] sm:px-5">
      <div className="flex w-full items-center justify-between gap-3">

        {/* ── Esquerda: menu (mobile) + contexto ── */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <button className={`${iconBtn} md:hidden`} onClick={onMenuToggle} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>

          {/* Data pedagógica */}
          <div className="hidden flex-shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] px-2.5 py-1 sm:flex">
            <Calendar className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
            <span className="text-xs font-medium tabular-nums text-[var(--text-secondary)]">{today}</span>
          </div>

          {/* Contexto: Unidade ou Turma */}
          {isCoordRole ? (
            <div className="flex min-w-0 items-center gap-1.5 rounded-full bg-[var(--surface-subtle)] px-2.5 py-1">
              <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
              <span className="hidden text-xs text-[var(--text-secondary)] sm:inline">Unidade</span>
              <span className="max-w-[110px] truncate text-xs font-semibold text-[var(--text-primary)] sm:max-w-[200px]">
                {unitName ?? 'Unidade'}
              </span>
            </div>
          ) : (
            <div className={`flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 ${hasClassroom ? 'bg-[var(--surface-subtle)]' : 'bg-[var(--error-bg)]'}`}>
              <Users className={`h-3.5 w-3.5 flex-shrink-0 ${hasClassroom ? 'text-[var(--text-tertiary)]' : 'text-[var(--error)]'}`} aria-hidden="true" />
              <span className="hidden text-xs text-[var(--text-secondary)] sm:inline">Turma</span>
              <span className={`max-w-[100px] truncate text-xs font-semibold sm:max-w-[180px] ${hasClassroom ? 'text-[var(--text-primary)]' : 'text-[var(--error)]'}`}>
                {classroomName}
              </span>
            </div>
          )}
        </div>

        {/* ── Direita: busca, assistente, tema, perfil ── */}
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-1.5">
          {/* Busca / paleta de comandos */}
          <button
            onClick={openPalette}
            aria-label="Buscar páginas e ações (Ctrl K)"
            className="hidden h-9 items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] pl-2.5 pr-1.5 text-[13px] text-[var(--text-tertiary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] lg:flex"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="pr-6">Buscar…</span>
            <kbd className="rounded border border-[var(--border-default)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">Ctrl K</kbd>
          </button>
          <button onClick={openPalette} aria-label="Buscar páginas e ações" className={`${iconBtn} lg:hidden`}>
            <Search className="h-[18px] w-[18px]" />
          </button>

          {/* Assistente de IA */}
          <button
            onClick={togglePanel}
            aria-label={urgentCount > 0 ? `Abrir assistente — ${urgentCount} prioridades` : 'Abrir assistente'}
            title="Assistente Conexa (Ctrl J)"
            className="relative flex h-9 items-center gap-1.5 rounded-lg border border-[var(--ai-border)] px-2.5 text-[13px] font-semibold text-[var(--ai-fg)] transition-[filter,box-shadow] hover:shadow-ds-sm"
            style={{ background: 'var(--ai-surface)' }}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Assistente</span>
            {urgentCount > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--error)] px-1 text-[10px] font-bold leading-none text-[var(--destructive-foreground)]">
                {urgentCount > 99 ? '99+' : urgentCount}
              </span>
            )}
          </button>

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            className={iconBtn}
          >
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>

          <span className="mx-1 hidden h-6 w-px bg-[var(--border-default)] sm:block" aria-hidden="true" />

          {/* Perfil */}
          <div className="flex items-center gap-2.5">
            <div className="hidden flex-col items-end sm:flex">
              <span className="max-w-[150px] truncate text-[13px] font-semibold leading-tight text-[var(--text-primary)]">{displayName}</span>
              <span className="text-[11px] leading-tight text-[var(--text-secondary)]">{primaryRole}</span>
            </div>
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-brand)] font-display text-[13px] font-bold text-[var(--text-brand)] ring-1 ring-[var(--border-brand)]">
              {initial}
            </span>
          </div>

          <button
            onClick={logout}
            className={`${iconBtn} hover:!text-[var(--error)]`}
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
