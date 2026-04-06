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
  { path: '/app/planejamentos',       label: 'Meus Planejamentos',     icon: <BookOpen className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/planejamento/novo',   label: 'Novo Planejamento',      icon: <Calendar className="h-4 w-4" /> },
  { path: '/app/diario-de-bordo',     label: 'Diário de Bordo',        icon: <ClipboardList className="h-4 w-4" /> },
  { path: '/app/rdic-crianca',        label: 'RDIC por Criança',       icon: <Brain className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/chamada',             label: 'Chamada Diária',         icon: <UserCheck className="h-4 w-4" /> },
  { path: '/app/rdx',                 label: 'Fotos da Turma',         icon: <Camera className="h-4 w-4" /> },
  { path: '/app/atendimentos-pais',   label: 'Atendimentos Pais',      icon: <MessageCircle className="h-4 w-4" /> },
  { path: '/app/matriz-pedagogica',   label: 'Matriz 2026',            icon: <Layers className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/painel-alergias',     label: 'Alergias e Dietas',      icon: <Apple className="h-4 w-4" />, badge: 'Importante' },
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
  { path: '/app/rdic-coord',           label: 'RDIC — Revisão e Aprovação', icon: <Brain className="h-4 w-4" />, badge: 'Coord' },
  { path: '/app/rdic-crianca',         label: 'RDIC por Criança',           icon: <Brain className="h-4 w-4" /> },
  { path: '/app/inteligencia',         label: 'Painel de Inteligência',     icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/sala-de-aula-virtual', label: 'Sala de Aula Virtual',       icon: <Sparkles className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/chamada',              label: 'Chamada Diária',             icon: <UserCheck className="h-4 w-4" /> },
  { path: '/app/rdx',               label: 'Fotos da Turma',             icon: <Camera className="h-4 w-4" /> },
  { path: '/app/matriz-pedagogica', label: 'Matriz 2026',                icon: <Layers className="h-4 w-4" /> },
  { path: '/app/atendimentos-pais', label: 'Atendimentos Pais',          icon: <MessageCircle className="h-4 w-4" /> },
  { path: '/app/reports',           label: 'Relatórios',                 icon: <BarChart2 className="h-4 w-4" /> },
  { path: '/app/painel-alergias',   label: 'Alergias e Dietas',          icon: <Apple className="h-4 w-4" /> },
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
