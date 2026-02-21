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
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleProtectedRoute } from './RoleProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      // ─── Rotas legadas (mantidas para compatibilidade) ─────────────────────
      {
        path: 'plannings',
        element: <PlanningsPage />,
      },
      {
        path: 'diary',
        element: <DiaryPage />,
      },
      {
        path: 'matrices',
        element: <MatricesPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'professor',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'DEVELOPER']}>
            <TeacherDashboardPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Painel do Professor ───────────────────────────────────────────────
      {
        path: 'teacher-dashboard',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'COORDENADOR', 'UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <TeacherDashboardPage />
          </RoleProtectedRoute>
        ),
      },
         // ─── Plano de Aula com Matriz Completa 2026 ──────────────────
      {
        path: 'plano-de-aula',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanoDeAulaPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Planejamento Diário com Calendário Pedagógico 2026 ────────────
      {
        path: 'planejamento-diario',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanejamentoDiarioPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Planejamentos Pedagógicos com Templates e Matriz ─────────────
      {
        path: 'planejamentos',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PlanejamentosPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── RDIC & RIA ────────────────────────────────────────────────────────
      {
        path: 'rdic-ria',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RdicRiaPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Diário de Bordo com Microgestos ──────────────────────────────────
      {
        path: 'diario-de-bordo',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DiarioBordoPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Matriz Pedagógica 2026 ────────────────────────────────────────────
      {
        path: 'matriz-pedagogica',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <MatrizPedagogicaPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Configurações ────────────────────────────────────────────────────
      {
        path: 'configuracoes',
        element: (
          <ProtectedRoute>
            <ConfiguracoesPage />
          </ProtectedRoute>
        ),
      },
      // ─── Requisições de Materiais ─────────────────────────────────────────
      {
        path: 'material-requests',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <MaterialRequestPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Pedidos de Compra ────────────────────────────────────────────────
      {
        path: 'pedidos-compra',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PedidosCompraPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Dashboard Central ────────────────────────────────────────────────
      {
        path: 'central',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardCentralPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Dashboard de Unidade ─────────────────────────────────────────────
      {
        path: 'unidade',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardUnidadePage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Atendimentos aos Pais ────────────────────────────────────────────
      {
        path: 'atendimentos-pais',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AtendimentoPaisPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Chamada Diária ───────────────────────────────────────────────────
      {
        path: 'chamada',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'DEVELOPER']}>
            <ControleFaltasPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Relatório de Fotos (RDX) ─────────────────────────────────────────
      {
        path: 'rdx',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'PROFESSOR_AUXILIAR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <RdxPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Dashboard de Coordenação Pedagógica ──────────────────────────────
      {
        path: 'coordenacao-pedagogica',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardCoordenacaoPedagogicaPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Dashboard de Coordenação Geral ───────────────────────────────────
      {
        path: 'coordenacao-geral',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardCoordenacaoGeralPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Meu Perfil (todos os usuários) ──────────────────────────────────
      {
        path: 'meu-perfil',
        element: (
          <ProtectedRoute>
            <MeuPerfilPage />
          </ProtectedRoute>
        ),
      },
      // ─── Admin: Gestão de Usuários ────────────────────────────────────────
      {
        path: 'admin/usuarios',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AdminUsuariosPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Admin: Gestão de Unidades ────────────────────────────────────────
      {
        path: 'admin/unidades',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AdminUnidadesPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Admin: Gestão de Turmas ──────────────────────────────────────────────────────
      {
        path: 'admin/turmas',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AdminTurmasPage />
          </RoleProtectedRoute>
        ),
      },
      // ─── Coordenação Pedagógica Completa (turmas + currículo + reuniões) ────
      {
        path: 'coordenacao',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <CoordenacaoPedagogicaPage />
          </RoleProtectedRoute>
        ),
      },
    ],
  },
]);