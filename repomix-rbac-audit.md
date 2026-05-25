This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: apps/web/src/components/layout/Sidebar.tsx, apps/web/src/components/layout/AppLayout.tsx, apps/web/src/app/RoleProtectedRoute.tsx, apps/web/src/app/router.tsx
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
apps/web/src/app/RoleProtectedRoute.tsx
apps/web/src/app/router.tsx
apps/web/src/components/layout/AppLayout.tsx
apps/web/src/components/layout/Sidebar.tsx
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="apps/web/src/app/RoleProtectedRoute.tsx">
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

/**
 * Normaliza roles do usuário para array de strings (RoleLevel)
 * Suporta múltiplos formatos:
 * - user.roles (string[] ou objeto[])
 * - user.user.roles (fallback)
 * - Se objeto[]: mapear role.level (string)
 */
export function normalizeRoles(user: unknown): string[] {
  if (!user || typeof user !== 'object') return [];
  const userObj = user as Record<string, unknown>;
  let roles = userObj.roles;
  if (!roles && userObj.user && typeof userObj.user === 'object') {
    const nestedUser = userObj.user as Record<string, unknown>;
    roles = nestedUser.roles;
  }
  if (!roles || !Array.isArray(roles)) return [];
  if (typeof roles[0] === 'string') return roles as string[];
  if (typeof roles[0] === 'object' && roles[0] !== null) {
    return roles
      .map((role: { level?: string; roleId?: string }) => role.level || role.roleId || null)
      .filter((level: string | null) => level !== null) as string[];
  }
  return [];
}

/**
 * Extrai os RoleTypes do usuário (ex: UNIDADE_NUTRICIONISTA, UNIDADE_DIRETOR)
 * Retorna array de strings com os tipos de papel
 */
export function normalizeRoleTypes(user: unknown): string[] {
  if (!user || typeof user !== 'object') return [];
  const userObj = user as Record<string, unknown>;
  let roles = userObj.roles;
  if (!roles && userObj.user && typeof userObj.user === 'object') {
    const nestedUser = userObj.user as Record<string, unknown>;
    roles = nestedUser.roles;
  }
  if (!roles || !Array.isArray(roles)) return [];
  if (typeof roles[0] === 'object' && roles[0] !== null) {
    return roles
      .map((role: { type?: string }) => role.type || null)
      .filter((t: string | null) => t !== null) as string[];
  }
  return [];
}

/**
 * Retorna o papel primário do usuário para exibição no menu/topbar
 * Prioridade: DEVELOPER > MANTENEDORA > STAFF_CENTRAL > UNIDADE_DIRETOR > UNIDADE_NUTRICIONISTA > UNIDADE > PROFESSOR
 */
export function getPrimaryRole(user: unknown): string {
  const levels = normalizeRoles(user);
  const types = normalizeRoleTypes(user);
  const priority = [
    'DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL',
    'UNIDADE_DIRETOR', 'UNIDADE_NUTRICIONISTA',
    'UNIDADE_COORDENADOR_PEDAGOGICO', 'UNIDADE_ADMINISTRATIVO',
    'UNIDADE', 'PROFESSOR',
  ];
  // Verificar types primeiro (mais específico)
  for (const p of priority) {
    if (types.includes(p)) return p;
  }
  // Fallback para levels
  for (const p of priority) {
    if (levels.includes(p)) return p;
  }
  return levels[0] ?? 'DESCONHECIDO';
}

/**
 * Verifica se o usuário tem um role type específico
 */
export function hasRoleType(user: unknown, type: string): boolean {
  return normalizeRoleTypes(user).includes(type);
}

/**
 * Verifica se o usuário é Diretor de Unidade
 */
export function isDiretor(user: unknown): boolean {
  return hasRoleType(user, 'UNIDADE_DIRETOR');
}

/**
 * Verifica se o usuário é Nutricionista de Unidade
 */
export function isNutricionista(user: unknown): boolean {
  return hasRoleType(user, 'UNIDADE_NUTRICIONISTA');
}

/**
 * Verifica se o usuário é Coordenador Pedagógico de Unidade
 */
export function isCoordenadorPedagogico(user: unknown): boolean {
  return hasRoleType(user, 'UNIDADE_COORDENADOR_PEDAGOGICO');
}

/**
 * RoleProtectedRoute - Protege rotas baseadas em roles do usuário
 *
 * Verifica se o usuário autenticado possui pelo menos uma das roles permitidas.
 * Suporta verificação por RoleLevel (ex: 'UNIDADE') e por RoleType (ex: 'UNIDADE_DIRETOR').
 * Se não possuir, redireciona para o dashboard principal.
 */
export function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar por RoleLevel e por RoleType
  const userLevels = normalizeRoles(user);
  const userTypes = normalizeRoleTypes(user);
  const allUserRoles = [...new Set([...userLevels, ...userTypes])];

  const hasAllowedRole = allUserRoles.some((role: string) => allowedRoles.includes(role));

  if (!hasAllowedRole) {
    console.warn(
      `Acesso negado: usuário não possui role permitida. ` +
      `Roles do usuário: ${allUserRoles.join(', ')}, ` +
      `Roles permitidas: ${allowedRoles.join(', ')}`,
    );
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
</file>

<file path="apps/web/src/components/layout/AppLayout.tsx">
import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from '../ui/sonner';
import { UnitScopeProvider } from '../../contexts/UnitScopeContext';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  return (
    <UnitScopeProvider>
      <div className="flex min-h-screen bg-background">
        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* Sidebar — fixa no desktop, drawer no mobile */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0 md:z-auto md:flex-shrink-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar onClose={closeSidebar} />
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onMenuToggle={toggleSidebar} />
          <main className="flex-1 overflow-x-hidden">
            <Outlet />
          </main>
          <Toaster position="bottom-right" richColors closeButton />
        </div>
      </div>
    </UnitScopeProvider>
  );
}
</file>

<file path="apps/web/src/app/router.tsx">
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { PlanningsPage } from '../pages/PlanningsPage';
import { DiaryPage } from '../pages/DiaryPage';
import { MatricesPage } from '../pages/MatricesPage';
import { ReportsPage } from '../pages/ReportsPage';
import TeacherDashboardPage from '../pages/TeacherDashboardPage';
import { MaterialRequestPage } from '../pages/MaterialRequestPage';
import { PedidosCompraPage } from '../pages/PedidosCompraPage';
import { CatalogImportPage } from '../pages/CatalogImportPage';
import { DashboardCentralPage } from '../pages/DashboardCentralPage';
import { DashboardUnidadePage } from '../pages/DashboardUnidadePage';
import { AtendimentoPaisPage } from '../pages/AtendimentoPaisPage';
import DashboardCoordenacaoPedagogicaPage from '../pages/DashboardCoordenacaoPedagogicaPage';
import DashboardCoordenacaoGeralPage from '../pages/DashboardCoordenacaoGeralPage';
import ControleFaltasPage from '../pages/ControleFaltasPage';
import RdxPage from '../pages/RdxPage';
// ─── Novas páginas implementadas ─────────────────────────────────────────────
import PlanejamentosPage from '../pages/PlanejamentosPage';
import RdicRiaPage from '../pages/RdicRiaPage';
import DiarioBordoPage from '../pages/DiarioBordoPage';
import DiarioCalendarioPage from '../pages/DiarioCalendarioPage';
import MatrizPedagogicaPage from '../pages/MatrizPedagogicaPage';
import ConfiguracoesPage from '../pages/ConfiguracoesPage';
import AdminUsuariosPage from '../pages/AdminUsuariosPage';
import AdminUnidadesPage from '../pages/AdminUnidadesPage';
import AdminTurmasPage from '../pages/AdminTurmasPage';
import MeuPerfilPage from '../pages/MeuPerfilPage';
import PlanejamentoDiarioPage from '../pages/PlanejamentoDiarioPage';
import PlanoDeAulaPage from '../pages/PlanoDeAulaPage';
import CoordenacaoPedagogicaPage from '../pages/CoordenacaoPedagogicaPage';
import RelatorioConsumoMateriaisPage from '../pages/RelatorioConsumoMateriaisPage';
import PainelAlergiasPage from '../pages/PainelAlergiasPage';
import DashboardConsumoMateriaisPage from '../pages/DashboardConsumoMateriaisPage';
import RdicCriancaPage from '../pages/RdicCriancaPage';
import SalaDeAulaVirtualPage from '../pages/SalaDeAulaVirtualPage';
import RdicCoordPage from '../pages/RdicCoordPage';
import RdicGeralPage from '../pages/RdicGeralPage';
// ─── Fases 1, 2 e 3 — Central RDIC, Painel Analítico e Painel da Turma ────────────────────
import CentralRdicCriancaPage from '../pages/CentralRdicCriancaPage';
import PainelAnaliticoCriancaPage from '../pages/PainelAnaliticoCriancaPage';
import PainelTurmaPage from '../pages/PainelTurmaPage';
import PainelInteligenciaPage from '../pages/PainelInteligenciaPage';
import ConferenciaPlanejamentoPage from '../pages/ConferenciaPlanejamentoPage';
import { DashboardDiretorPage } from '../pages/DashboardDiretorPage';
import { DashboardNutricionistaPage } from '../pages/DashboardNutricionistaPage';
import DashboardPsicologoPage from '../pages/DashboardPsicologoPage';
import DesenvolvimentoInfantilPage from '../pages/DesenvolvimentoInfantilPage';
// ─── Módulo de Planejamento — Oficina e Painel de Planejamentos ─────────────────────
import PlanoDeAulaNovoPage from '../pages/PlanoDeAulaNovoPage';
import PlanoDeAulaListaPage from '../pages/PlanoDeAulaListaPage';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleProtectedRoute } from './RoleProtectedRoute';
import { RouteErrorBoundary } from '../components/ErrorBoundary';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app/dashboard" replace />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Rotas legadas (mantidas para compatibilidade, sem exposição no menu) ─
      {
        path: 'plannings',
        element: <PlanningsPage />,
        errorElement: <RouteErrorBoundary />,
      },
      {
        // Legada: UI primitiva sem guards de role. Mantida para links externos.
        path: 'diary',
        element: <DiaryPage />,
        errorElement: <RouteErrorBoundary />,
      },
      {
        path: 'matrices',
        element: <MatricesPage />,
        errorElement: <RouteErrorBoundary />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
        errorElement: <RouteErrorBoundary />,
      },
      {
        // Legada: redireciona para a rota canônica com suporte a PROFESSOR_AUXILIAR
        path: 'professor',
        element: <Navigate to="/app/teacher-dashboard" replace />,
      },
      // ─── Painel do Professor ───────────────────────────────────────────────
      {
        path: 'teacher-dashboard',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'COORDENADOR', 'UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <TeacherDashboardPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Plano de Aula com Matriz Completa 2026 ──────────────────
      {
        path: 'plano-de-aula',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Planejamento Diário com Calendário Pedagógico 2026 ────────────
      {
        path: 'planejamento-diario',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanejamentoDiarioPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Planejamentos — Painel de Planejamentos (rota canônica do professor) ─────────
      {
        path: 'planejamentos',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaListaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Planejamento individual (visualização) — rota que gerava 404 ─────────
      // Rota adicionada para suportar links /app/planejamentos/:id
      {
        path: 'planejamentos/:id',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaListaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // Legada: PlanejamentosPage (mantida para links internos existentes)
      {
        path: 'planejamentos-legado',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanejamentosPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── RDIC por Criança (professor) ──────────────────────────────────────
      {
        path: 'rdic-crianca',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RdicCriancaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── RDIC Coordenação Pedagógica da Unidade (revisão e aprovação) ────────
      {
        path: 'rdic-coord',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <RdicCoordPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── RDIC Coordenação Geral (somente leitura, apenas PUBLICADOS) ────────
      {
        path: 'rdic-geral',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RdicGeralPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── RDIC & RIA ────────────────────────────────────────────────────────
      {
        path: 'rdic-ria',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RdicRiaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── RDIC alias (/app/rdic → RdicCriancaPage) ─────────────────────────────────
      {
        path: 'rdic',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RdicCriancaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Observações Individuais alias (/app/coordenacao/observacoes) ────────────
      {
        path: 'coordenacao/observacoes',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DesenvolvimentoInfantilPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Diário da Turma — Calendário por Dia Letivo (PR 1: nova entrada principal) ────
      {
        path: 'diario-calendario',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DiarioCalendarioPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Diário de Bordo com Microgestos (preservado — entrada via calendário ou link direto) ──
      {
        path: 'diario-de-bordo',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DiarioBordoPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Matriz Pedagógica 2026 ────────────────────────────────────────────
      {
        path: 'matriz-pedagogica',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <MatrizPedagogicaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Configurações ────────────────────────────────────────────────────
      {
        path: 'configuracoes',
        element: (
          <ProtectedRoute>
            <ConfiguracoesPage />
          </ProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Requisições de Materiais ─────────────────────────────────────────
      {
        path: 'material-requests',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <MaterialRequestPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Pedidos de Compra ────────────────────────────────────────────────
      {
        path: 'pedidos-compra',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PedidosCompraPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Catálogo de Produtos (importação CSV/XLSX) ─────────────────────
      {
        path: 'catalog-import',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <CatalogImportPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard Central ────────────────────────────────────────────────
      {
        path: 'central',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardCentralPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard do Diretor ──────────────────────────────────────────────
      {
        path: 'diretor',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardDiretorPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard da Nutricionista ───────────────────────────────────────────────────────────────────────────────────────
      {
        path: 'nutricionista',
        element: (
          // FASE 1: restrito a UNIDADE_NUTRICIONISTA (RoleType específico).
          // UNIDADE genérico (diretor, coord, administrativo) não acessa este painel.
          // MANTENEDORA e DEVELOPER mantêm acesso para suporte e auditoria.
          <RoleProtectedRoute allowedRoles={['UNIDADE_NUTRICIONISTA', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardNutricionistaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard de Unidade ───────────────────────────────────────────────────────────────────────────────────────
      {
        path: 'unidade',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardUnidadePage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Atendimentos aos Pais ────────────────────────────────────────────
      {
        path: 'atendimentos-pais',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AtendimentoPaisPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Chamada Diária ───────────────────────────────────────────────────
      {
        path: 'chamada',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <ControleFaltasPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Relatório de Fotos (RDX) ─────────────────────────────────────────
      {
        path: 'rdx',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RdxPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard de Coordenação Pedagógica ──────────────────────────────
      {
        path: 'coordenacao-pedagogica',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardCoordenacaoPedagogicaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard de Coordenação Geral ───────────────────────────────────
      {
        path: 'coordenacao-geral',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardCoordenacaoGeralPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard da Psicóloga Central ──────────────────────────────────
      {
        path: 'psicologo',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardPsicologoPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Desenvolvimento Infantil ────────────────────────────────────────
      {
        path: 'desenvolvimento-infantil',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DesenvolvimentoInfantilPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Meu Perfil (todos os usuários) ──────────────────────────────────
      {
        path: 'meu-perfil',
        element: (
          <ProtectedRoute>
            <MeuPerfilPage />
          </ProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
            // ─── Admin: Gestão de Usuários ────────────────────
      // RBAC: UNIDADE_NUTRICIONISTA NÃO acessa gestão de usuários.
      // Apenas perfis UNIDADE genéricos (diretor, coord, admin) e superiores.
      {
        path: 'admin/usuarios',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE_DIRETOR', 'UNIDADE_COORDENADOR_PEDAGOGICO', 'UNIDADE_ADMINISTRATIVO', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AdminUsuariosPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Admin: Gestão de Unidades ────────────────────────────────────────
      {
        path: 'admin/unidades',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AdminUnidadesPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Admin: Gestão de Turmas ──────────────────────────────────────────────────────
      {
        path: 'admin/turmas',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AdminTurmasPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Coordenação Pedagógica Completa (turmas + currículo + reuniões) ────
      {
        path: 'coordenacao',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <CoordenacaoPedagogicaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Relatório de Consumo de Materiais (Coordenação) ─────────────────
      {
        path: 'relatorio-consumo-materiais',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RelatorioConsumoMateriaisPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard de Consumo de Materiais com gráficos ─────────────────────
      {
        path: 'dashboard-consumo-materiais',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardConsumoMateriaisPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Painel de Alergias e Dietas ────────────────────────────────────
      // Visível para professor, coordenação, diretor, nutri e secretaria
      {
        path: 'painel-alergias',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PainelAlergiasPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Módulo de Planejamento — Oficina (criação/edição) ─────────────────
      {
        path: 'planejamento/novo',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaNovoPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      {
        path: 'planejamento/:id/editar',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaNovoPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      {
        path: 'planejamento/:planningId/conferir',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'DEVELOPER']}>
            <ConferenciaPlanejamentoPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Módulo de Planejamento — Painel de Planejamentos (lista/calendário) ────────
      {
        path: 'planejamentos-calendario',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaListaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Sala de Aula Virtual (Professor + Coordenação) ─────────────────────────
      {
        path: 'sala-de-aula-virtual',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <SalaDeAulaVirtualPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      { path:'turma/:classroomId/painel', element:(<RoleProtectedRoute allowedRoles={['PROFESSOR','PROFESSOR_AUXILIAR','UNIDADE','STAFF_CENTRAL','MANTENEDORA','DEVELOPER']}><PainelTurmaPage/></RoleProtectedRoute>), errorElement:<RouteErrorBoundary/> },
      { path:'crianca/:childId/rdic-central', element:(<RoleProtectedRoute allowedRoles={['PROFESSOR','PROFESSOR_AUXILIAR','UNIDADE','STAFF_CENTRAL','MANTENEDORA','DEVELOPER']}><CentralRdicCriancaPage/></RoleProtectedRoute>), errorElement:<RouteErrorBoundary/> },
      { path:'crianca/:childId/painel-analitico', element:(<RoleProtectedRoute allowedRoles={['PROFESSOR','PROFESSOR_AUXILIAR','UNIDADE','STAFF_CENTRAL','MANTENEDORA','DEVELOPER']}><PainelAnaliticoCriancaPage/></RoleProtectedRoute>), errorElement:<RouteErrorBoundary/> },
      { path:'inteligencia', element:(<RoleProtectedRoute allowedRoles={['UNIDADE','STAFF_CENTRAL','MANTENEDORA','DEVELOPER']}><PainelInteligenciaPage/></RoleProtectedRoute>), errorElement:<RouteErrorBoundary/> },
    ],
  },
]);
</file>

<file path="apps/web/src/components/layout/Sidebar.tsx">
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen, ClipboardList, BarChart2, ShoppingCart, GraduationCap,
  ChevronRight, TrendingUp, Users, LayoutDashboard, ShoppingBag,
  FileText, Home, MessageCircle, Camera, UserCheck, Building2,
  Network, Brain, Layers, Settings, Sparkles, UserCircle, Calendar,
  Apple, Utensils, Shield, X, Eye, FileEdit, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../app/AuthProvider';
import { normalizeRoles, normalizeRoleTypes } from '../../app/RoleProtectedRoute';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

// ─── Menus por perfil ─────────────────────────────────────────────────────────

// PROFESSOR / PROFESSOR_AUXILIAR ──────────────────────────────────────────────
const PROFESSOR_PRINCIPAL: MenuItem[] = [
  { path: '/app/teacher-dashboard', label: 'Painel do Professor', icon: <GraduationCap className="h-4 w-4" /> },
  { path: '/app/material-requests', label: 'Requisições de Materiais', icon: <ShoppingCart className="h-4 w-4" /> },
];
const PROFESSOR_FERRAMENTAS: MenuItem[] = [
  // Plano de Aula: entrada única → calendário de planejamentos
  { path: '/app/planejamentos',       label: 'Plano de Aula',          icon: <BookOpen className="h-4 w-4" />, badge: 'Novo' },
  // Diário: entrada única → calendário de dias letivos (PR 1/PR 2)
  { path: '/app/diario-calendario',   label: 'Diário',                 icon: <ClipboardList className="h-4 w-4" />, badge: 'Novo' },
  // Chamada Diária removida do menu principal (incorporada ao fluxo do Diário)
  { path: '/app/rdic-crianca',        label: 'RDIC por Criança',       icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/rdx',                 label: 'Fotos da Turma',         icon: <Camera className="h-4 w-4" /> },
  { path: '/app/atendimentos-pais',   label: 'Atendimentos Pais',      icon: <MessageCircle className="h-4 w-4" /> },
  { path: '/app/matriz-pedagogica',   label: 'Matriz 2026',            icon: <Layers className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/painel-alergias',     label: 'Alergias e Dietas',      icon: <Apple className="h-4 w-4" />, badge: 'Importante' },
];

// UNIDADE — Coordenadora Pedagógica ────────────────────────────────────────────
const COORD_GESTAO: MenuItem[] = [
  { path: '/app/coordenacao-pedagogica', label: 'Painel da Coordenação',    icon: <Home className="h-4 w-4" /> },
  { path: '/app/coordenacao',            label: 'Turmas & Reuniões',        icon: <Users className="h-4 w-4" /> },
  { path: '/app/material-requests',      label: 'Requisições de Materiais', icon: <ShoppingCart className="h-4 w-4" /> },
  { path: '/app/pedidos-compra',         label: 'Pedidos de Compra',        icon: <ShoppingBag className="h-4 w-4" /> },
];
const COORD_PEDAGOGICO: MenuItem[] = [
  { path: '/app/rdic-coord',      label: 'RDIC — Revisão',      icon: <Brain className="h-4 w-4" />, badge: 'Coord' },
  { path: '/app/rdic-crianca',    label: 'RDIC por Criança',    icon: <Brain className="h-4 w-4" /> },
  { path: '/app/inteligencia',    label: 'Inteligência',        icon: <Sparkles className="h-4 w-4" /> },
  { path: '/app/reports',         label: 'Relatórios',          icon: <BarChart2 className="h-4 w-4" /> },
  { path: '/app/painel-alergias', label: 'Alergias e Dietas',   icon: <Apple className="h-4 w-4" />, badge: 'Importante' },
];

// UNIDADE — Diretor ────────────────────────────────────────────────────────────
const DIRETOR_ITEMS: MenuItem[] = [
  { path: '/app/diretor',           label: 'Painel do Diretor',      icon: <Shield className="h-4 w-4" /> },
  { path: '/app/pedidos-compra',    label: 'Aprovar Pedidos',        icon: <ShoppingBag className="h-4 w-4" />, badge: 'Aprovação' },
  { path: '/app/coordenacao',       label: 'Turmas & Equipe',        icon: <Users className="h-4 w-4" /> },
  { path: '/app/reports',           label: 'Relatórios',             icon: <BarChart2 className="h-4 w-4" /> },
  { path: '/app/planejamentos',     label: 'Planejamentos',          icon: <BookOpen className="h-4 w-4" /> },
  { path: '/app/painel-alergias',   label: 'Alergias e Dietas',      icon: <Apple className="h-4 w-4" /> },
];

// UNIDADE — Nutricionista ──────────────────────────────────────────────────────
// Navegação completa do módulo via query param ?s=<secao>
// A sidebar global escura é o único menu do módulo (sem sidebar interna)
const NUTRI_ITEMS: MenuItem[] = [
  { path: '/app/nutricionista',                      label: 'Painel da Nutricionista', icon: <Utensils className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=cardapios',          label: 'Cardápios',               icon: <BookOpen className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=cardapios-nutricao', label: 'Cálculo Nutricional',     icon: <BarChart2 className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=turmas',             label: 'Turmas e Crianças',       icon: <Users className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=dietas',             label: 'Dietas e Restrições',     icon: <AlertTriangle className="h-4 w-4" />, badge: 'Importante' },
  { path: '/app/nutricionista?s=observacoes-prof',   label: 'Obs. dos Professores',    icon: <Eye className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=anotacoes-nutri',          label: 'Anotações Nutricionais',    icon: <FileEdit className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=acompanhamento-individual', label: 'Acompanhamento Individual', icon: <Shield className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/nutricionista?s=relatorio',                 label: 'Relatórios',                icon: <FileText className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=pedidos',            label: 'Pedidos de Alimentação',  icon: <ShoppingCart className="h-4 w-4" /> },
  { path: '/app/nutricionista?s=configuracoes',      label: 'Configurações',           icon: <Settings className="h-4 w-4" /> },
];

// UNIDADE — Administrativo ─────────────────────────────────────────────────────
const ADMIN_UNIDADE_ITEMS: MenuItem[] = [
  { path: '/app/unidade',                       label: 'Painel da Unidade',      icon: <Home className="h-4 w-4" /> },
  { path: '/app/material-requests',             label: 'Requisições Pendentes',  icon: <ShoppingCart className="h-4 w-4" /> },
  { path: '/app/pedidos-compra',                label: 'Pedidos de Compra',      icon: <ShoppingBag className="h-4 w-4" /> },
  { path: '/app/relatorio-consumo-materiais',   label: 'Consumo de Materiais',   icon: <BarChart2 className="h-4 w-4" /> },
  { path: '/app/coordenacao',                   label: 'Turmas',                 icon: <Users className="h-4 w-4" /> },
];

// UNIDADE — Genérico (sem roleType específico) ─────────────────────────────────
const UNIDADE_GESTAO: MenuItem[] = [
  { path: '/app/unidade',                       label: 'Painel da Unidade',      icon: <Home className="h-4 w-4" /> },
  { path: '/app/coordenacao-pedagogica',        label: 'Coord. Pedagógica',      icon: <Building2 className="h-4 w-4" /> },
  { path: '/app/coordenacao',                   label: 'Turmas & Reuniões',      icon: <Users className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/material-requests',             label: 'Requisições Pendentes',  icon: <ShoppingCart className="h-4 w-4" /> },
  { path: '/app/relatorio-consumo-materiais',   label: 'Consumo de Materiais',   icon: <BarChart2 className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/dashboard-consumo-materiais',   label: 'Consumo — Gráficos',      icon: <TrendingUp className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/painel-alergias',               label: 'Alergias e Dietas',      icon: <Apple className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/pedidos-compra',                label: 'Pedidos de Compra',      icon: <ShoppingBag className="h-4 w-4" /> },
];
const UNIDADE_PEDAGOGICO: MenuItem[] = [
  { path: '/app/rdic-coord',        label: 'RDIC — Revisão e Aprovação', icon: <Brain className="h-4 w-4" />, badge: 'Coord' },
  { path: '/app/rdic-crianca',      label: 'RDIC por Criança',           icon: <Brain className="h-4 w-4" /> },
  { path: '/app/inteligencia',      label: 'Painel de Inteligência',     icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/chamada',           label: 'Chamada Diária',             icon: <UserCheck className="h-4 w-4" /> },
  { path: '/app/rdx',               label: 'Fotos da Turma',             icon: <Camera className="h-4 w-4" /> },
  { path: '/app/matriz-pedagogica', label: 'Matriz 2026',                icon: <Layers className="h-4 w-4" /> },
  { path: '/app/atendimentos-pais', label: 'Atendimentos Pais',          icon: <MessageCircle className="h-4 w-4" /> },
  { path: '/app/reports',           label: 'Relatórios',                 icon: <BarChart2 className="h-4 w-4" /> },
];
// STAFF_CENTRAL_PSICOLOGIA ──────────────────────────────────────────────────────────────────────────────────
const PSICOLOGA_ITEMS: MenuItem[] = [
  { path: '/app/psicologo',                label: 'Psicologia Central',      icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/desenvolvimento-infantil', label: 'Desenvolvimento Infantil', icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/rdic-geral',               label: 'RDICs Publicados',         icon: <FileText className="h-4 w-4" /> },
  { path: '/app/central',                  label: 'Análises Centrais',        icon: <TrendingUp className="h-4 w-4" /> },
  { path: '/app/reports',                  label: 'Relatórios',               icon: <BarChart2 className="h-4 w-4" /> },
];
// STAFF_CENTRAL ──────────────────────────────────────────────────────────────────────────────────
const CENTRAL_ITEMS: MenuItem[] = [
  { path: '/app/central',                  label: 'Análises Centrais',        icon: <TrendingUp className="h-4 w-4" /> },
  { path: '/app/inteligencia',             label: 'Painel de Inteligência',   icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/coordenacao-geral',        label: 'Coordenação Geral',        icon: <Network className="h-4 w-4" /> },
  { path: '/app/rdic-geral',               label: 'RDICs Publicados',         icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/desenvolvimento-infantil', label: 'Desenvolvimento Infantil', icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/matriz-pedagogica',        label: 'Matriz 2026',              icon: <Layers className="h-4 w-4" /> },
  { path: '/app/reports',                  label: 'Relatórios',               icon: <BarChart2 className="h-4 w-4" /> },
];

// MANTENEDORA ──────────────────────────────────────────────────────────────────
const MANTENEDORA_ITEMS: MenuItem[] = [
  { path: '/app/dashboard',         label: 'Painel Global',       icon: <LayoutDashboard className="h-4 w-4" /> },
  { path: '/app/coordenacao-geral', label: 'Coordenação Geral',   icon: <Network className="h-4 w-4" /> },
  { path: '/app/central',           label: 'Análises Centrais',   icon: <TrendingUp className="h-4 w-4" /> },
  { path: '/app/rdic-geral',        label: 'RDICs Publicados',    icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/pedidos-compra',    label: 'Pedidos de Compra',   icon: <ShoppingBag className="h-4 w-4" /> },
  { path: '/app/matriz-pedagogica', label: 'Matriz 2026',         icon: <Layers className="h-4 w-4" /> },
  { path: '/app/reports',           label: 'Relatórios',          icon: <BarChart2 className="h-4 w-4" /> },
];

// DEVELOPER — acesso completo ──────────────────────────────────────────────────
const DEV_EXTRA: MenuItem[] = [
  { path: '/app/sala-de-aula-virtual', label: 'Sala de Aula Virtual',   icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/rdic-ria',             label: 'RDIC — Registros (RIA)', icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/planejamentos',        label: 'Planejamentos',          icon: <FileText className="h-4 w-4" /> },
  { path: '/app/nutricionista',        label: 'Painel da Nutricionista',icon: <Utensils className="h-4 w-4" /> },
  { path: '/app/diretor',              label: 'Painel do Diretor',      icon: <Shield className="h-4 w-4" /> },
  { path: '/app/configuracoes',        label: 'Configurações',          icon: <Settings className="h-4 w-4" /> },
];

// ─── Componentes de navegação ─────────────────────────────────────────────────

// isActiveForItem: compara pathname + search para itens com query params
function isActiveForItem(location: ReturnType<typeof useLocation>, itemPath: string): boolean {
  const [itemPathname, itemSearch] = itemPath.split('?');
  if (itemSearch) {
    // Item com query param: pathname deve bater E o param ?s= deve bater
    if (location.pathname !== itemPathname) return false;
    const itemParams = new URLSearchParams(itemSearch);
    const locParams = new URLSearchParams(location.search);
    for (const [key, val] of itemParams.entries()) {
      if (locParams.get(key) !== val) return false;
    }
    return true;
  }
  // Item sem query param: ativo apenas se pathname bate E não há ?s= na URL
  // (para não marcar "Painel da Nutricionista" quando uma sub-seção está ativa)
  if (location.pathname === itemPathname) {
    const locParams = new URLSearchParams(location.search);
    return !locParams.has('s');
  }
  return false;
}

function NavItem({ item, active, onClick }: { item: MenuItem; active: boolean; onClick?: () => void }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <span className="flex items-center gap-2.5">
        {item.icon}
        {item.label}
      </span>
      <span className="flex items-center gap-1">
        {item.badge && (
          <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full leading-none">
            {item.badge}
          </span>
        )}
        {active && <ChevronRight className="h-3 w-3 opacity-70" />}
      </span>
    </Link>
  );
}

function NavSection({
  titulo, items, location, onItemClick,
}: { titulo: string; items: MenuItem[]; location: ReturnType<typeof useLocation>; onItemClick?: () => void }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
        {titulo}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <NavItem key={item.path} item={item} active={isActiveForItem(location, item.path)} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar Principal ────────────────────────────────────────────────────────
interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const userLevels = normalizeRoles(user);
  const userTypes  = normalizeRoleTypes(user);

  // Flags de nível
  const isProfessor   = userLevels.some((r) => r === 'PROFESSOR' || r === 'PROFESSOR_AUXILIAR');
  const isUnidade     = userLevels.some((r) => r === 'UNIDADE' || r.startsWith('UNIDADE_'));
  const isCentral     = userLevels.some((r) => r === 'STAFF_CENTRAL' || r.startsWith('STAFF_CENTRAL_'));
  const isMantenedora = userLevels.some((r) => r === 'MANTENEDORA' || r.startsWith('MANTENEDORA_'));
  const isDeveloper   = userLevels.includes('DEVELOPER');

  // Flags de tipo (sub-papel dentro de UNIDADE)
  const isDiretor         = userTypes.includes('UNIDADE_DIRETOR');
  const isNutricionista   = userTypes.includes('UNIDADE_NUTRICIONISTA');
  const isCoordPedagogico = userTypes.includes('UNIDADE_COORDENADOR_PEDAGOGICO');
  const isAdministrativo  = userTypes.includes('UNIDADE_ADMINISTRATIVO');
  // Flag de tipo para Psicóloga Central
  const isPsicologa = userTypes.includes('STAFF_CENTRAL_PSICOLOGIA');
  // Se UNIDADE mas sem tipo específico, tratar como coordenadora genérica
  const isUnidadeGenerica = isUnidade && !isDiretor && !isNutricionista && !isCoordPedagogico && !isAdministrativo;

  // Label de perfil para exibição
  const perfilLabel = isDeveloper        ? 'Desenvolvedor'
    : isMantenedora                      ? 'Mantenedora'
    : isPsicologa                        ? 'Psicóloga Central'
    : isCentral                          ? 'Equipe Central'
    : isDiretor                          ? 'Diretor(a)'
    : isNutricionista                    ? 'Nutricionista'
    : isCoordPedagogico                  ? 'Coord. Pedagógica'
    : isAdministrativo                   ? 'Administrativo'
    : isUnidade                          ? 'Unidade'
    : isProfessor                        ? 'Professor(a)'
    : 'Usuário';

  const configItem: MenuItem = { path: '/app/configuracoes', label: 'Configurações', icon: <Settings className="h-4 w-4" /> };
  const perfilItem: MenuItem = { path: '/app/meu-perfil',    label: 'Meu Perfil',    icon: <UserCircle className="h-4 w-4" /> };

  // adminItems: exibido apenas para perfis com acesso administrativo real.
  // Nutricionista (isNutricionista) NÃO recebe este bloco — ela não gerencia
  // usuários, turmas ou unidades administrativas.
  const adminItems: MenuItem[] = [
    ...(!isNutricionista ? [{ path: '/app/admin/usuarios', label: 'Usuários', icon: <Users className="h-4 w-4" /> }] : []),
    ...(!isNutricionista ? [{ path: '/app/admin/turmas',   label: 'Turmas',   icon: <GraduationCap className="h-4 w-4" /> }] : []),
    ...(isMantenedora || isCentral || isDeveloper
      ? [{ path: '/app/admin/unidades', label: 'Unidades', icon: <Building2 className="h-4 w-4" /> }]
      : []),
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white h-full min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">Conexa V3</h1>
              <p className="text-xs text-gray-400 mt-0.5">Sistema Pedagógico</p>
            </div>
          </div>
          {/* Botão fechar — só aparece em mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {user && (
          <div className="mt-3 px-2 py-2 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400">Perfil</p>
            <p className="text-sm font-medium text-gray-200 truncate">
              {(user.nome as string) || user.email}
            </p>
            <span className="inline-block mt-1 text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
              {perfilLabel}
            </span>
          </div>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">

        {/* DEVELOPER: vê tudo */}
        {isDeveloper && (
          <>
            <NavSection titulo="Professor"    items={[...PROFESSOR_PRINCIPAL, ...PROFESSOR_FERRAMENTAS]} location={location} onItemClick={onClose} />
            <NavSection titulo="Nutricionista" items={NUTRI_ITEMS}                                        location={location} onItemClick={onClose} />
            <NavSection titulo="Diretor"       items={DIRETOR_ITEMS}                                      location={location} onItemClick={onClose} />
            <NavSection titulo="Unidade"       items={[...UNIDADE_GESTAO, ...UNIDADE_PEDAGOGICO]}         location={location} onItemClick={onClose} />
            <NavSection titulo="Central"       items={CENTRAL_ITEMS}                                      location={location} onItemClick={onClose} />
            <NavSection titulo="Mantenedora"   items={MANTENEDORA_ITEMS}                                  location={location} onItemClick={onClose} />
            <NavSection titulo="Dev — Extras"  items={DEV_EXTRA}                                          location={location} onItemClick={onClose} />
          </>
        )}

        {/* MANTENEDORA */}
        {!isDeveloper && isMantenedora && (
          <NavSection titulo="Mantenedora" items={MANTENEDORA_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* STAFF_CENTRAL — Psicóloga Central (menu dedicado) */}
        {!isDeveloper && isCentral && isPsicologa && (
          <NavSection titulo="Psicologia" items={PSICOLOGA_ITEMS} location={location} onItemClick={onClose} />
        )}
        {/* STAFF_CENTRAL — Coordenação Geral e demais */}
        {!isDeveloper && isCentral && !isPsicologa && (
          <NavSection titulo="Análises Centrais" items={CENTRAL_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* UNIDADE — Diretor */}
        {!isDeveloper && isDiretor && (
          <NavSection titulo="Diretor" items={DIRETOR_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* UNIDADE — Nutricionista */}
        {!isDeveloper && isNutricionista && (
          <NavSection titulo="Nutricionista" items={NUTRI_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* UNIDADE — Coordenadora Pedagógica */}
        {!isDeveloper && isCoordPedagogico && (
          <>
            <NavSection titulo="Gestão"      items={COORD_GESTAO}      location={location} onItemClick={onClose} />
            <NavSection titulo="Pedagógico"  items={COORD_PEDAGOGICO}  location={location} onItemClick={onClose} />
          </>
        )}

        {/* UNIDADE — Administrativo */}
        {!isDeveloper && isAdministrativo && (
          <NavSection titulo="Administrativo" items={ADMIN_UNIDADE_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* UNIDADE — Genérico (sem roleType específico) */}
        {!isDeveloper && isUnidadeGenerica && (
          <>
            <NavSection titulo="Gestão"      items={UNIDADE_GESTAO}      location={location} onItemClick={onClose} />
            <NavSection titulo="Pedagógico"  items={UNIDADE_PEDAGOGICO}  location={location} onItemClick={onClose} />
          </>
        )}

        {/* PROFESSOR / PROFESSOR_AUXILIAR */}
        {!isDeveloper && !isUnidade && isProfessor && (
          <>
            <NavSection titulo="Pedagógico"  items={PROFESSOR_PRINCIPAL}   location={location} onItemClick={onClose} />
            <NavSection titulo="Ferramentas" items={PROFESSOR_FERRAMENTAS} location={location} onItemClick={onClose} />
          </>
        )}

        {/* Fallback */}
        {!isDeveloper && !isMantenedora && !isCentral && !isUnidade && !isProfessor && (
          <NavSection titulo="Menu" items={UNIDADE_GESTAO} location={location} onItemClick={onClose} />
        )}

      </nav>

      {/* Rodapé */}
      <div className="p-3 border-t border-gray-800 space-y-1">
        {(isUnidade || isCentral || isMantenedora || isDeveloper) && adminItems.length > 0 && (
          <NavSection titulo="Administração" items={adminItems} location={location} onItemClick={onClose} />
        )}
        <div className="pt-1 space-y-1">
          <NavItem item={perfilItem} active={isActiveForItem(location, '/app/meu-perfil')} onClick={onClose} />
          <NavItem item={configItem} active={isActiveForItem(location, '/app/configuracoes')} onClick={onClose} />
        </div>
        <p className="text-xs text-gray-600 text-center pt-1">Conexa V3 © 2026</p>
      </div>
    </aside>
  );
}
</file>

</files>
