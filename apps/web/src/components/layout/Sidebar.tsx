import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  BarChart2,
  Grid,
  ShoppingCart,
  GraduationCap,
  ChevronRight,
  TrendingUp,
  Users,
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Home,
  MessageCircle,
  Camera,
  UserCheck,
  Building2,
  Network,
} from 'lucide-react';
import { useAuth } from '../../app/AuthProvider';
import { normalizeRoles } from '../../app/RoleProtectedRoute';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const PROFESSOR_PRINCIPAL: MenuItem[] = [
  { path: '/app/teacher-dashboard', label: 'Painel do Professor', icon: <GraduationCap className="h-4 w-4" /> },
  { path: '/app/material-requests', label: 'Requisições de Materiais', icon: <ShoppingCart className="h-4 w-4" /> },
];

const PROFESSOR_FERRAMENTAS: MenuItem[] = [
  { path: '/app/plannings', label: 'Planejamentos', icon: <BookOpen className="h-4 w-4" /> },
  { path: '/app/diary', label: 'Diário de Bordo', icon: <ClipboardList className="h-4 w-4" /> },
  { path: '/app/chamada', label: 'Chamada Diária', icon: <UserCheck className="h-4 w-4" /> },
  { path: '/app/rdx', label: 'Relatório de Fotos', icon: <Camera className="h-4 w-4" /> },
  { path: '/app/atendimentos-pais', label: 'Atendimentos Pais', icon: <MessageCircle className="h-4 w-4" /> },
  { path: '/app/reports', label: 'Relatórios', icon: <BarChart2 className="h-4 w-4" /> },
];

const UNIDADE_GESTAO: MenuItem[] = [
  { path: '/app/unidade', label: 'Painel da Unidade', icon: <Home className="h-4 w-4" /> },
  { path: '/app/coordenacao-pedagogica', label: 'Coordenação Pedagógica', icon: <Building2 className="h-4 w-4" /> },
  { path: '/app/material-requests', label: 'Requisições Pendentes', icon: <ShoppingCart className="h-4 w-4" /> },
  { path: '/app/pedidos-compra', label: 'Pedidos de Compra', icon: <ShoppingBag className="h-4 w-4" /> },
];

const UNIDADE_PEDAGOGICO: MenuItem[] = [
  { path: '/app/plannings', label: 'Planejamentos', icon: <BookOpen className="h-4 w-4" /> },
  { path: '/app/diary', label: 'Diário de Bordo', icon: <ClipboardList className="h-4 w-4" /> },
  { path: '/app/chamada', label: 'Chamada Diária', icon: <UserCheck className="h-4 w-4" /> },
  { path: '/app/rdx', label: 'Relatório de Fotos', icon: <Camera className="h-4 w-4" /> },
  { path: '/app/matrices', label: 'Matriz Curricular', icon: <Grid className="h-4 w-4" /> },
  { path: '/app/atendimentos-pais', label: 'Atendimentos Pais', icon: <MessageCircle className="h-4 w-4" /> },
  { path: '/app/reports', label: 'Relatórios', icon: <BarChart2 className="h-4 w-4" /> },
];

const CENTRAL_ITEMS: MenuItem[] = [
  { path: '/app/central', label: 'Análises Centrais', icon: <TrendingUp className="h-4 w-4" /> },
  { path: '/app/coordenacao-geral', label: 'Coordenação Geral', icon: <Network className="h-4 w-4" /> },
  { path: '/app/pedidos-compra', label: 'Pedidos de Compra', icon: <ShoppingBag className="h-4 w-4" /> },
  { path: '/app/reports', label: 'Relatórios', icon: <BarChart2 className="h-4 w-4" /> },
];

const MANTENEDORA_ITEMS: MenuItem[] = [
  { path: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { path: '/app/coordenacao-geral', label: 'Coordenação Geral', icon: <Network className="h-4 w-4" /> },
  { path: '/app/central', label: 'Análises Centrais', icon: <TrendingUp className="h-4 w-4" /> },
  { path: '/app/unidade', label: 'Gestão de Unidades', icon: <Users className="h-4 w-4" /> },
  { path: '/app/pedidos-compra', label: 'Pedidos de Compra', icon: <ShoppingBag className="h-4 w-4" /> },
  { path: '/app/reports', label: 'Relatórios', icon: <BarChart2 className="h-4 w-4" /> },
];

const DEV_EXTRA: MenuItem[] = [
  { path: '/app/matrices', label: 'Matrizes Curriculares', icon: <Grid className="h-4 w-4" /> },
  { path: '/app/plannings', label: 'Planejamentos', icon: <FileText className="h-4 w-4" /> },
  { path: '/app/diary', label: 'Diário de Bordo', icon: <ClipboardList className="h-4 w-4" /> },
  { path: '/app/chamada', label: 'Chamada Diária', icon: <UserCheck className="h-4 w-4" /> },
  { path: '/app/rdx', label: 'Relatório de Fotos (RDX)', icon: <Camera className="h-4 w-4" /> },
  { path: '/app/coordenacao-pedagogica', label: 'Coord. Pedagógica', icon: <Building2 className="h-4 w-4" /> },
  { path: '/app/coordenacao-geral', label: 'Coord. Geral', icon: <Network className="h-4 w-4" /> },
];

function NavItem({ item, active }: { item: MenuItem; active: boolean }) {
  return (
    <Link
      to={item.path}
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
      {active && <ChevronRight className="h-3 w-3 opacity-70" />}
    </Link>
  );
}

function NavSection({ titulo, items, isActive }: { titulo: string; items: MenuItem[]; isActive: (path: string) => boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
        {titulo}
      </p>
      <div className="space-y-1">
        {items.map(item => (
          <NavItem key={item.path} item={item} active={isActive(item.path)} />
        ))}
      </div>
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const userRoles = normalizeRoles(user);

  const isProfessor = userRoles.some(r => r === 'PROFESSOR' || r === 'PROFESSOR_AUXILIAR');
  const isUnidade = userRoles.some(r => r === 'UNIDADE' || r.startsWith('UNIDADE_'));
  const isCentral = userRoles.some(r => r === 'STAFF_CENTRAL' || r.startsWith('STAFF_CENTRAL_'));
  const isMantenedora = userRoles.some(r => r === 'MANTENEDORA' || r.startsWith('MANTENEDORA_'));
  const isDeveloper = userRoles.includes('DEVELOPER');

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const perfilLabel = isDeveloper ? 'Desenvolvedor'
    : isMantenedora ? 'Mantenedora'
    : isCentral ? 'Equipe Central'
    : isUnidade ? 'Unidade'
    : isProfessor ? 'Professor(a)'
    : 'Usuário';

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Conexa V3</h1>
            <p className="text-xs text-gray-400 mt-0.5">Sistema Pedagógico</p>
          </div>
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

      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
        {isDeveloper && (
          <>
            <NavSection titulo="Professor" items={[...PROFESSOR_PRINCIPAL, ...PROFESSOR_FERRAMENTAS]} isActive={isActive} />
            <NavSection titulo="Unidade" items={[...UNIDADE_GESTAO, ...UNIDADE_PEDAGOGICO]} isActive={isActive} />
            <NavSection titulo="Central" items={CENTRAL_ITEMS} isActive={isActive} />
            <NavSection titulo="Mantenedora" items={MANTENEDORA_ITEMS} isActive={isActive} />
            <NavSection titulo="Dev Extra" items={DEV_EXTRA} isActive={isActive} />
          </>
        )}
        {!isDeveloper && isMantenedora && (
          <NavSection titulo="Mantenedora" items={MANTENEDORA_ITEMS} isActive={isActive} />
        )}
        {!isDeveloper && isCentral && (
          <NavSection titulo="Análises Centrais" items={CENTRAL_ITEMS} isActive={isActive} />
        )}
        {!isDeveloper && isUnidade && (
          <>
            <NavSection titulo="Gestão" items={UNIDADE_GESTAO} isActive={isActive} />
            <NavSection titulo="Pedagógico" items={UNIDADE_PEDAGOGICO} isActive={isActive} />
          </>
        )}
        {!isDeveloper && !isUnidade && isProfessor && (
          <>
            <NavSection titulo="Pedagógico" items={PROFESSOR_PRINCIPAL} isActive={isActive} />
            <NavSection titulo="Ferramentas" items={PROFESSOR_FERRAMENTAS} isActive={isActive} />
          </>
        )}
        {!isDeveloper && !isMantenedora && !isCentral && !isUnidade && !isProfessor && (
          <NavSection titulo="Menu" items={UNIDADE_GESTAO} isActive={isActive} />
        )}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">Conexa V3 © 2026</p>
      </div>
    </aside>
  );
}
