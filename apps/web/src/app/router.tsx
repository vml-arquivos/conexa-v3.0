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
      // ─── Diário de Bordo com Microgestos ──────────────────────────────────────────────
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
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
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
      // ─── Dashboard da Nutricionista ───────────────────────────────────────────
      {
        path: 'nutricionista',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardNutricionistaPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
      // ─── Dashboard de Unidade ─────────────────────────────────────────────
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
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'DEVELOPER']}>
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
      // ─── Admin: Gestão de Usuários ────────────────────────────────────────
      {
        path: 'admin/usuarios',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
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
      // ─── Painel de Alergias e Dietas (Nutricionista) ─────────────────────
      {
        path: 'painel-alergias',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
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
      // ─── Sala de Aula Virtual (Professor + Coordenação) ─────────────────────
      {
        path: 'sala-de-aula-virtual',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <SalaDeAulaVirtualPage />
          </RoleProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
      },
    ],
  },
]);
