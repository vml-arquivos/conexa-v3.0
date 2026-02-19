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
          <RoleProtectedRoute allowedRoles={['PROFESSOR']}>
            <TeacherDashboardPage />
          </RoleProtectedRoute>
        ),
      },
      // Dashboard do Professor — rota principal (redirecionamento pós-login)
      {
        path: 'teacher-dashboard',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'COORDENADOR', 'DIRETOR', 'MANTENEDORA', 'DEVELOPER']}>
            <TeacherDashboardPage />
          </RoleProtectedRoute>
        ),
      },
      // Página dedicada de Requisições de Materiais
      {
        path: 'material-requests',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <MaterialRequestPage />
          </RoleProtectedRoute>
        ),
      },
      // Pedidos de Compra — Unidade consolida, Mantenedora gerencia
      {
        path: 'pedidos-compra',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <PedidosCompraPage />
          </RoleProtectedRoute>
        ),
      },
      // Dashboard Central (Bruna/Carla) — somente leitura
      {
        path: 'central',
        element: (
          <RoleProtectedRoute allowedRoles={['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardCentralPage />
          </RoleProtectedRoute>
        ),
      },
      // Dashboard de Unidade — gestão operacional
      {
        path: 'unidade',
        element: (
          <RoleProtectedRoute allowedRoles={['UNIDADE', 'MANTENEDORA', 'DEVELOPER']}>
            <DashboardUnidadePage />
          </RoleProtectedRoute>
        ),
      },
      // Atendimentos aos Pais/Responsáveis
      {
        path: 'atendimentos-pais',
        element: (
          <RoleProtectedRoute allowedRoles={['PROFESSOR', 'UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER']}>
            <AtendimentoPaisPage />
          </RoleProtectedRoute>
        ),
      },
    ],
  },
]);
