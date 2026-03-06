import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen, ClipboardList, BarChart2, ShoppingCart, GraduationCap,
  ChevronRight, TrendingUp, Users, LayoutDashboard, ShoppingBag,
  FileText, Home, MessageCircle, Camera, UserCheck, Building2,
  Network, Brain, Layers, Settings, Sparkles, UserCircle, Calendar,
  Apple, Utensils, Shield,
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
  { path: '/app/planejamentos',       label: 'Meus Planejamentos',     icon: <BookOpen className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/planejamento/novo',   label: 'Novo Planejamento',      icon: <Calendar className="h-4 w-4" /> },
  { path: '/app/diario-de-bordo',     label: 'Diário de Bordo',        icon: <ClipboardList className="h-4 w-4" /> },
  { path: '/app/rdic-crianca',        label: 'RDIC por Criança',       icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/chamada',             label: 'Chamada Diária',         icon: <UserCheck className="h-4 w-4" /> },
  { path: '/app/rdx',                 label: 'Fotos da Turma',         icon: <Camera className="h-4 w-4" /> },
  { path: '/app/atendimentos-pais',   label: 'Atendimentos Pais',      icon: <MessageCircle className="h-4 w-4" /> },
  { path: '/app/matriz-pedagogica',   label: 'Matriz 2026',            icon: <Layers className="h-4 w-4" />, badge: 'Novo' },
];

// UNIDADE — Coordenadora Pedagógica ────────────────────────────────────────────
const COORD_GESTAO: MenuItem[] = [
  { path: '/app/unidade',                       label: 'Painel da Unidade',      icon: <Home className="h-4 w-4" /> },
  { path: '/app/coordenacao-pedagogica',        label: 'Coord. Pedagógica',      icon: <Building2 className="h-4 w-4" /> },
  { path: '/app/coordenacao',                   label: 'Turmas & Reuniões',      icon: <Users className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/material-requests',             label: 'Requisições Pendentes',  icon: <ShoppingCart className="h-4 w-4" /> },
  { path: '/app/relatorio-consumo-materiais',   label: 'Consumo de Materiais',   icon: <BarChart2 className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/pedidos-compra',                label: 'Pedidos de Compra',      icon: <ShoppingBag className="h-4 w-4" /> },
];
const COORD_PEDAGOGICO: MenuItem[] = [
  { path: '/app/rdic-coord',        label: 'RDIC — Revisão e Aprovação', icon: <Brain className="h-4 w-4" />, badge: 'Coord' },
  { path: '/app/rdic-crianca',      label: 'RDIC por Criança',           icon: <Brain className="h-4 w-4" /> },
  { path: '/app/chamada',           label: 'Chamada Diária',             icon: <UserCheck className="h-4 w-4" /> },
  { path: '/app/rdx',               label: 'Fotos da Turma',             icon: <Camera className="h-4 w-4" /> },
  { path: '/app/matriz-pedagogica', label: 'Matriz 2026',                icon: <Layers className="h-4 w-4" /> },
  { path: '/app/atendimentos-pais', label: 'Atendimentos Pais',          icon: <MessageCircle className="h-4 w-4" /> },
  { path: '/app/reports',           label: 'Relatórios',                 icon: <BarChart2 className="h-4 w-4" /> },
];

// UNIDADE — Diretor ────────────────────────────────────────────────────────────
const DIRETOR_ITEMS: MenuItem[] = [
  { path: '/app/diretor',           label: 'Painel do Diretor',      icon: <Shield className="h-4 w-4" /> },
  { path: '/app/pedidos-compra',    label: 'Aprovar Pedidos',        icon: <ShoppingBag className="h-4 w-4" />, badge: 'Aprovação' },
  { path: '/app/coordenacao',       label: 'Turmas & Equipe',        icon: <Users className="h-4 w-4" /> },
  { path: '/app/reports',           label: 'Relatórios',             icon: <BarChart2 className="h-4 w-4" /> },
  { path: '/app/planejamentos',     label: 'Planejamentos',          icon: <BookOpen className="h-4 w-4" /> },
];

// UNIDADE — Nutricionista ──────────────────────────────────────────────────────
const NUTRI_ITEMS: MenuItem[] = [
  { path: '/app/nutricionista',                 label: 'Painel da Nutricionista', icon: <Utensils className="h-4 w-4" /> },
  { path: '/app/painel-alergias',               label: 'Alergias e Dietas',       icon: <Apple className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/material-requests',             label: 'Requisições Alimentação', icon: <ShoppingCart className="h-4 w-4" /> },
  { path: '/app/pedidos-compra',                label: 'Pedidos de Compra',       icon: <ShoppingBag className="h-4 w-4" /> },
  { path: '/app/relatorio-consumo-materiais',   label: 'Consumo de Materiais',    icon: <BarChart2 className="h-4 w-4" /> },
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
  { path: '/app/dashboard-consumo-materiais',   label: 'Dashboard Consumo',      icon: <TrendingUp className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/painel-alergias',               label: 'Alergias e Dietas',      icon: <Apple className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/pedidos-compra',                label: 'Pedidos de Compra',      icon: <ShoppingBag className="h-4 w-4" /> },
];
const UNIDADE_PEDAGOGICO: MenuItem[] = [
  { path: '/app/rdic-coord',        label: 'RDIC — Revisão e Aprovação', icon: <Brain className="h-4 w-4" />, badge: 'Coord' },
  { path: '/app/rdic-crianca',      label: 'RDIC por Criança',           icon: <Brain className="h-4 w-4" /> },
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
  { path: '/app/coordenacao-geral',        label: 'Coordenação Geral',        icon: <Network className="h-4 w-4" /> },
  { path: '/app/rdic-geral',               label: 'RDICs Publicados',         icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/desenvolvimento-infantil', label: 'Desenvolvimento Infantil', icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/matriz-pedagogica',        label: 'Matriz 2026',              icon: <Layers className="h-4 w-4" /> },
  { path: '/app/reports',                  label: 'Relatórios',               icon: <BarChart2 className="h-4 w-4" /> },
];

// MANTENEDORA ──────────────────────────────────────────────────────────────────
const MANTENEDORA_ITEMS: MenuItem[] = [
  { path: '/app/dashboard',         label: 'Dashboard Global',    icon: <LayoutDashboard className="h-4 w-4" /> },
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
  { path: '/app/nutricionista',        label: 'Dashboard Nutricionista',icon: <Utensils className="h-4 w-4" /> },
  { path: '/app/diretor',              label: 'Dashboard Diretor',      icon: <Shield className="h-4 w-4" /> },
  { path: '/app/configuracoes',        label: 'Configurações',          icon: <Settings className="h-4 w-4" /> },
];

// ─── Componentes de navegação ─────────────────────────────────────────────────
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
      <span className="flex items-center gap-1">
        {item.badge && !active && (
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
  titulo, items, isActive,
}: { titulo: string; items: MenuItem[]; isActive: (path: string) => boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
        {titulo}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <NavItem key={item.path} item={item} active={isActive(item.path)} />
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar Principal ────────────────────────────────────────────────────────
export function Sidebar() {
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

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

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

  const adminItems: MenuItem[] = [
    { path: '/app/admin/usuarios', label: 'Usuários', icon: <Users className="h-4 w-4" /> },
    { path: '/app/admin/turmas',   label: 'Turmas',   icon: <GraduationCap className="h-4 w-4" /> },
    ...(isMantenedora || isCentral || isDeveloper
      ? [{ path: '/app/admin/unidades', label: 'Unidades', icon: <Building2 className="h-4 w-4" /> }]
      : []),
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      {/* Logo */}
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

      {/* Navegação */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">

        {/* DEVELOPER: vê tudo */}
        {isDeveloper && (
          <>
            <NavSection titulo="Professor"    items={[...PROFESSOR_PRINCIPAL, ...PROFESSOR_FERRAMENTAS]} isActive={isActive} />
            <NavSection titulo="Nutricionista" items={NUTRI_ITEMS}                                        isActive={isActive} />
            <NavSection titulo="Diretor"       items={DIRETOR_ITEMS}                                      isActive={isActive} />
            <NavSection titulo="Unidade"       items={[...UNIDADE_GESTAO, ...UNIDADE_PEDAGOGICO]}         isActive={isActive} />
            <NavSection titulo="Central"       items={CENTRAL_ITEMS}                                      isActive={isActive} />
            <NavSection titulo="Mantenedora"   items={MANTENEDORA_ITEMS}                                  isActive={isActive} />
            <NavSection titulo="Dev — Extras"  items={DEV_EXTRA}                                          isActive={isActive} />
          </>
        )}

        {/* MANTENEDORA */}
        {!isDeveloper && isMantenedora && (
          <NavSection titulo="Mantenedora" items={MANTENEDORA_ITEMS} isActive={isActive} />
        )}

        {/* STAFF_CENTRAL — Psicóloga Central (menu dedicado) */}
        {!isDeveloper && isCentral && isPsicologa && (
          <NavSection titulo="Psicologia" items={PSICOLOGA_ITEMS} isActive={isActive} />
        )}
        {/* STAFF_CENTRAL — Coordenação Geral e demais */}
        {!isDeveloper && isCentral && !isPsicologa && (
          <NavSection titulo="Análises Centrais" items={CENTRAL_ITEMS} isActive={isActive} />
        )}

        {/* UNIDADE — Diretor */}
        {!isDeveloper && isDiretor && (
          <NavSection titulo="Diretor" items={DIRETOR_ITEMS} isActive={isActive} />
        )}

        {/* UNIDADE — Nutricionista */}
        {!isDeveloper && isNutricionista && (
          <NavSection titulo="Nutricionista" items={NUTRI_ITEMS} isActive={isActive} />
        )}

        {/* UNIDADE — Coordenadora Pedagógica */}
        {!isDeveloper && isCoordPedagogico && (
          <>
            <NavSection titulo="Gestão"      items={COORD_GESTAO}      isActive={isActive} />
            <NavSection titulo="Pedagógico"  items={COORD_PEDAGOGICO}  isActive={isActive} />
          </>
        )}

        {/* UNIDADE — Administrativo */}
        {!isDeveloper && isAdministrativo && (
          <NavSection titulo="Administrativo" items={ADMIN_UNIDADE_ITEMS} isActive={isActive} />
        )}

        {/* UNIDADE — Genérico (sem roleType específico) */}
        {!isDeveloper && isUnidadeGenerica && (
          <>
            <NavSection titulo="Gestão"      items={UNIDADE_GESTAO}      isActive={isActive} />
            <NavSection titulo="Pedagógico"  items={UNIDADE_PEDAGOGICO}  isActive={isActive} />
          </>
        )}

        {/* PROFESSOR / PROFESSOR_AUXILIAR */}
        {!isDeveloper && !isUnidade && isProfessor && (
          <>
            <NavSection titulo="Pedagógico"  items={PROFESSOR_PRINCIPAL}   isActive={isActive} />
            <NavSection titulo="Ferramentas" items={PROFESSOR_FERRAMENTAS} isActive={isActive} />
          </>
        )}

        {/* Fallback */}
        {!isDeveloper && !isMantenedora && !isCentral && !isUnidade && !isProfessor && (
          <NavSection titulo="Menu" items={UNIDADE_GESTAO} isActive={isActive} />
        )}

      </nav>

      {/* Rodapé */}
      <div className="p-3 border-t border-gray-800 space-y-1">
        {(isUnidade || isCentral || isMantenedora || isDeveloper) && (
          <NavSection titulo="Administração" items={adminItems} isActive={isActive} />
        )}
        <div className="pt-1 space-y-1">
          <NavItem item={perfilItem} active={isActive('/app/meu-perfil')} />
          <NavItem item={configItem} active={isActive('/app/configuracoes')} />
        </div>
        <p className="text-xs text-gray-600 text-center pt-1">Conexa V3 © 2026</p>
      </div>
    </aside>
  );
}
