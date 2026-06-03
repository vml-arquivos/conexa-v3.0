import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen, ClipboardList, BarChart2, ShoppingCart, GraduationCap,
  FileArchive, HeartPulse,
  ChevronRight, ChevronDown, TrendingUp, Users, LayoutDashboard, ShoppingBag,
  FileText, Home, MessageCircle, Camera, UserCheck, Building2,
  Network, Brain, Layers, Settings, Sparkles, UserCircle, Calendar,
  Apple, Utensils, Shield, X, Eye, FileEdit, AlertTriangle,, UserPlus, Bell, FolderCheck, Bus, Stethoscope
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
  { path: '/app/painel-alergias',     label: 'Alergias e Dietas',      icon: <Apple className="h-4 w-4" />, badge: 'Atenção' },
];

// UNIDADE — Coordenadora Pedagógica ────────────────────────────────────────────
const COORD_GESTAO: MenuItem[] = [
  { path: '/app/coordenacao-pedagogica', label: 'Painel da Coordenação',    icon: <Home className="h-4 w-4" /> },
  { path: '/app/coordenacao',            label: 'Turmas & Reuniões',        icon: <Users className="h-4 w-4" /> },
  { path: '/app/material-requests',      label: 'Requisições de Materiais', icon: <ShoppingCart className="h-4 w-4" /> },
  { path: '/app/pedidos-compra',         label: 'Pedidos de Compra',        icon: <ShoppingBag className="h-4 w-4" /> },
];
const COORD_PEDAGOGICO: MenuItem[] = [
  { path: '/app/diario-calendario', label: 'Diário',             icon: <ClipboardList className="h-4 w-4" />, badge: 'Novo' },
  { path: '/app/atendimentos-pais', label: 'Atendimentos Pais',  icon: <MessageCircle className="h-4 w-4" /> },
  { path: '/app/rdic-coord',        label: 'RDIC — Revisão',     icon: <Brain className="h-4 w-4" />, badge: 'Coord' },
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

// UNIDADE — Administrativo (Secretaria) ─────────────────────────────────────
const ADMIN_UNIDADE_ITEMS: MenuItem[] = [
  { path: '/app/secretaria',                    label: 'Painel da Secretaria',        icon: <Home className="h-4 w-4" /> },
  { path: '/app/secretaria/matriculas',         label: 'Matrículas e Fichas',         icon: <UserCheck className="h-4 w-4" /> },
  { path: '/app/secretaria/matriculas/nova',    label: 'Nova Matrícula',              icon: <UserPlus className="h-4 w-4" />, badge: 'Essencial' },
  { path: '/app/secretaria/movimentacoes',      label: 'Cancelamentos/Transferências', icon: <FileArchive className="h-4 w-4" /> },
  { path: '/app/secretaria/faltas',             label: 'Controle de Faltas',          icon: <ClipboardList className="h-4 w-4" /> },
  { path: '/app/secretaria/atestados',          label: 'Atestados e Documentos',      icon: <FolderCheck className="h-4 w-4" /> },
  { path: '/app/secretaria/ocorrencias',        label: 'Saúde e Ocorrências',         icon: <HeartPulse className="h-4 w-4" /> },
  { path: '/app/atendimentos-pais',             label: 'Atendimento aos Pais',        icon: <MessageCircle className="h-4 w-4" /> },
  { path: '/app/secretaria/transporte',         label: 'Transporte e Retirada',       icon: <Bus className="h-4 w-4" /> },
  { path: '/app/secretaria/funcionarios',       label: 'Funcionários da Unidade',     icon: <Building2 className="h-4 w-4" /> },
  { path: '/app/secretaria/comunicacao',        label: 'Comunicados Administrativos', icon: <Bell className="h-4 w-4" /> },
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
      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-100 ${
        active
          ? 'bg-brand-600 text-white shadow-ds-sm'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={`flex-shrink-0 transition-colors ${
          active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
        }`}>
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
      </span>
      {item.badge && (
        <span className={`ml-1 flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
          active
            ? 'bg-white/20 text-white'
            : 'bg-brand-900/60 text-brand-300'
        }`}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function NavSection({
  titulo, items, location, onItemClick,
}: { titulo: string; items: MenuItem[]; location: ReturnType<typeof useLocation>; onItemClick?: () => void }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.07em] px-2.5 mb-1.5">
        {titulo}
      </p>
      <div className="space-y-0.5">
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
    : isAdministrativo                   ? 'Secretaria'
    : isUnidade                          ? 'Unidade'
    : isProfessor                        ? 'Professor(a)'
    : 'Usuário';

  const configItem: MenuItem = { path: '/app/configuracoes', label: 'Configurações', icon: <Settings className="h-4 w-4" /> };
  const perfilItem: MenuItem = { path: '/app/meu-perfil',    label: 'Meu Perfil',    icon: <UserCircle className="h-4 w-4" /> };
  const [configOpen, setConfigOpen] = useState(
    () => location.pathname.startsWith('/app/meu-perfil') || location.pathname.startsWith('/app/configuracoes')
  );

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
    <aside className="w-64 bg-slate-950 text-white h-full min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Logo institucional COCRIS */}
              <img
                src={import.meta.env.VITE_APP_LOGO_URL || '/branding/cocris/logo-cocris.png'}
                alt={import.meta.env.VITE_APP_NAME || 'COCRIS Pedagógico'}
                className="h-9 w-auto object-contain flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fb) fb.style.display = 'flex';
                }}
              />
              {/* Fallback: ícone + texto */}
              <div className="hidden items-center gap-2" aria-hidden="true">
                <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">C</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-bold leading-tight text-white truncate">{import.meta.env.VITE_APP_NAME || 'COCRIS Pedagógico'}</h1>
                  <p className="text-[10px] text-slate-500 mt-0.5">Sistema Pedagógico</p>
                </div>
              </div>
            </div>
            {/* Botão fechar — só aparece em mobile */}
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {user && (
            <div className="mt-3 px-2.5 py-2 bg-slate-900 rounded-lg border border-slate-800/60">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Perfil ativo</p>
              <p className="text-sm font-medium text-slate-100 truncate mt-0.5">
                {(user.nome as string) || user.email}
              </p>
              <span className="inline-block mt-1.5 text-[10px] font-semibold bg-brand-900/70 text-brand-300 px-2 py-0.5 rounded-full tracking-wide">
                {perfilLabel}
              </span>
            </div>
          )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">

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
        {!isDeveloper && !isAdministrativo && isDiretor && (
          <NavSection titulo="Diretor" items={DIRETOR_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* UNIDADE — Nutricionista */}
        {!isDeveloper && isNutricionista && (
          <NavSection titulo="Nutricionista" items={NUTRI_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* UNIDADE — Coordenadora Pedagógica */}
        {!isDeveloper && !isAdministrativo && isCoordPedagogico && (
          <>
            <NavSection titulo="Gestão"      items={COORD_GESTAO}      location={location} onItemClick={onClose} />
            <NavSection titulo="Pedagógico"  items={COORD_PEDAGOGICO}  location={location} onItemClick={onClose} />
          </>
        )}

        {/* UNIDADE — Administrativo */}
        {!isDeveloper && isAdministrativo && (
          <NavSection titulo="Secretaria da Unidade" items={ADMIN_UNIDADE_ITEMS} location={location} onItemClick={onClose} />
        )}

        {/* UNIDADE — Genérico (sem roleType específico) */}
        {!isDeveloper && !isAdministrativo && isUnidadeGenerica && (
          <>
            <NavSection titulo="Gestão"      items={UNIDADE_GESTAO}      location={location} onItemClick={onClose} />
            <NavSection titulo="Pedagógico"  items={UNIDADE_PEDAGOGICO}  location={location} onItemClick={onClose} />
          </>
        )}

        {/* PROFESSOR / PROFESSOR_AUXILIAR */}
        {!isDeveloper && !isAdministrativo && !isUnidade && isProfessor && (
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
      <div className="px-3 py-3 border-t border-slate-800/60 space-y-2">
        {!isAdministrativo && (isUnidade || isCentral || isMantenedora || isDeveloper) && adminItems.length > 0 && (
          <NavSection titulo="Administração" items={adminItems} location={location} onItemClick={onClose} />
        )}
        {/* Grupo recolhível — Configurações */}
        <div>
          <button
            type="button"
            onClick={() => setConfigOpen(o => !o)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Settings className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <span className="flex-1 text-left">Configurações</span>
            <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${configOpen ? 'rotate-180' : ''}`} />
          </button>
          {configOpen && (
            <div className="mt-0.5 ml-3 pl-3 border-l border-slate-700/60 space-y-0.5">
              <NavItem item={perfilItem} active={isActiveForItem(location, '/app/meu-perfil')} onClick={onClose} />
              <NavItem item={configItem} active={isActiveForItem(location, '/app/configuracoes')} onClick={onClose} />
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-700 text-center pt-1">{import.meta.env.VITE_APP_NAME || 'COCRIS Pedagógico'} © 2026</p>
      </div>
    </aside>
  );
}
