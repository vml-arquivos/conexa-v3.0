/**
 * UnifiedDashboard — Hub central do COCRIS Pedagógico
 *
 * Renderiza widgets modulares de acordo com o perfil do usuário (RBAC).
 * Cada widget é independente e pode ser expandido sem afetar os demais.
 * Os dashboards específicos por perfil continuam existindo nas suas rotas.
 *
 * Regras:
 * - Sem chamadas de API neste componente (dados vêm dos dashboards específicos)
 * - Sem alteração de RBAC
 * - Sem lockfile, sem migration
 */

import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, ClipboardList, BookOpen, Brain, Camera,
  MessageCircle, Apple, BarChart2, Users, ShoppingCart,
  ShoppingBag, TrendingUp, Network, Sparkles, FileText,
  Home, Shield, Utensils, Layers, Building2, Settings,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../app/AuthProvider';
import { normalizeRoles, normalizeRoleTypes } from '../../app/RoleProtectedRoute';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Widget {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  accent: string;       // classe Tailwind de cor de destaque
  badge?: string;
  priority?: number;    // menor = mais importante
}

// ─── Catálogo de widgets por perfil ──────────────────────────────────────────

const W_PROFESSOR: Widget[] = [
  {
    id: 'teacher-dashboard',
    title: 'Painel do Professor',
    description: 'Indicadores da turma, chamada e atividades do dia.',
    icon: <GraduationCap className="h-5 w-5" />,
    path: '/app/teacher-dashboard',
    accent: 'bg-brand-600',
    priority: 1,
  },
  {
    id: 'diario',
    title: 'Diário',
    description: 'Registre o diário de bordo do dia letivo.',
    icon: <ClipboardList className="h-5 w-5" />,
    path: '/app/diario-calendario',
    accent: 'bg-emerald-600',
    badge: 'Novo',
    priority: 2,
  },
  {
    id: 'planejamentos',
    title: 'Plano de Aula',
    description: 'Crie e gerencie seus planejamentos pedagógicos.',
    icon: <BookOpen className="h-5 w-5" />,
    path: '/app/planejamentos',
    accent: 'bg-violet-600',
    badge: 'Novo',
    priority: 3,
  },
  {
    id: 'rdic',
    title: 'RDIC por Criança',
    description: 'Relatório de Desenvolvimento Individual da Criança.',
    icon: <Brain className="h-5 w-5" />,
    path: '/app/rdic-crianca',
    accent: 'bg-amber-600',
    badge: 'Novo',
    priority: 4,
  },
  {
    id: 'fotos',
    title: 'Fotos da Turma',
    description: 'Registre momentos fotográficos da turma.',
    icon: <Camera className="h-5 w-5" />,
    path: '/app/rdx',
    accent: 'bg-pink-600',
    priority: 5,
  },
  {
    id: 'atendimentos',
    title: 'Atendimentos Pais',
    description: 'Registre e consulte atendimentos com responsáveis.',
    icon: <MessageCircle className="h-5 w-5" />,
    path: '/app/atendimentos-pais',
    accent: 'bg-teal-600',
    priority: 6,
  },
  {
    id: 'alergias',
    title: 'Alergias e Dietas',
    description: 'Consulte restrições alimentares da turma.',
    icon: <Apple className="h-5 w-5" />,
    path: '/app/painel-alergias',
    accent: 'bg-red-600',
    badge: 'Atenção',
    priority: 7,
  },
  {
    id: 'materiais',
    title: 'Requisições de Materiais',
    description: 'Solicite materiais pedagógicos para a turma.',
    icon: <ShoppingCart className="h-5 w-5" />,
    path: '/app/material-requests',
    accent: 'bg-slate-600',
    priority: 8,
  },
];

const W_COORD_PEDAGOGICO: Widget[] = [
  {
    id: 'coord-dashboard',
    title: 'Painel da Coordenação',
    description: 'Visão consolidada da unidade pedagógica.',
    icon: <Home className="h-5 w-5" />,
    path: '/app/coordenacao-pedagogica',
    accent: 'bg-brand-600',
    priority: 1,
  },
  {
    id: 'diario-coord',
    title: 'Diário',
    description: 'Acompanhe os diários dos professores.',
    icon: <ClipboardList className="h-5 w-5" />,
    path: '/app/diario-calendario',
    accent: 'bg-emerald-600',
    badge: 'Novo',
    priority: 2,
  },
  {
    id: 'rdic-coord',
    title: 'RDIC — Revisão',
    description: 'Revise e aprove os RDICs dos professores.',
    icon: <Brain className="h-5 w-5" />,
    path: '/app/rdic-coord',
    accent: 'bg-amber-600',
    badge: 'Coord',
    priority: 3,
  },
  {
    id: 'turmas',
    title: 'Turmas & Reuniões',
    description: 'Gerencie turmas e reuniões pedagógicas.',
    icon: <Users className="h-5 w-5" />,
    path: '/app/coordenacao',
    accent: 'bg-violet-600',
    priority: 4,
  },
  {
    id: 'inteligencia',
    title: 'Inteligência',
    description: 'Análises e insights pedagógicos da unidade.',
    icon: <Sparkles className="h-5 w-5" />,
    path: '/app/inteligencia',
    accent: 'bg-indigo-600',
    priority: 5,
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    description: 'Relatórios pedagógicos e de desempenho.',
    icon: <BarChart2 className="h-5 w-5" />,
    path: '/app/reports',
    accent: 'bg-slate-600',
    priority: 6,
  },
];

const W_DIRETOR: Widget[] = [
  {
    id: 'diretor-dashboard',
    title: 'Painel do Diretor',
    description: 'Visão executiva da unidade escolar.',
    icon: <Shield className="h-5 w-5" />,
    path: '/app/diretor',
    accent: 'bg-brand-600',
    priority: 1,
  },
  {
    id: 'pedidos',
    title: 'Aprovar Pedidos',
    description: 'Pedidos de compra aguardando aprovação.',
    icon: <ShoppingBag className="h-5 w-5" />,
    path: '/app/pedidos-compra',
    accent: 'bg-amber-600',
    badge: 'Aprovação',
    priority: 2,
  },
  {
    id: 'equipe',
    title: 'Turmas & Equipe',
    description: 'Gerencie turmas e equipe pedagógica.',
    icon: <Users className="h-5 w-5" />,
    path: '/app/coordenacao',
    accent: 'bg-violet-600',
    priority: 3,
  },
  {
    id: 'relatorios-dir',
    title: 'Relatórios',
    description: 'Relatórios executivos da unidade.',
    icon: <BarChart2 className="h-5 w-5" />,
    path: '/app/reports',
    accent: 'bg-slate-600',
    priority: 4,
  },
];

const W_NUTRICIONISTA: Widget[] = [
  {
    id: 'nutri-dashboard',
    title: 'Painel da Nutricionista',
    description: 'Visão geral do módulo de nutrição.',
    icon: <Utensils className="h-5 w-5" />,
    path: '/app/nutricionista',
    accent: 'bg-emerald-600',
    priority: 1,
  },
  {
    id: 'cardapios',
    title: 'Cardápios',
    description: 'Gerencie os cardápios da unidade.',
    icon: <BookOpen className="h-5 w-5" />,
    path: '/app/nutricionista?s=cardapios',
    accent: 'bg-brand-600',
    priority: 2,
  },
  {
    id: 'dietas',
    title: 'Dietas e Restrições',
    description: 'Crianças com restrições alimentares.',
    icon: <Apple className="h-5 w-5" />,
    path: '/app/nutricionista?s=dietas',
    accent: 'bg-red-600',
    badge: 'Importante',
    priority: 3,
  },
  {
    id: 'turmas-nutri',
    title: 'Turmas e Crianças',
    description: 'Visualize crianças por turma.',
    icon: <Users className="h-5 w-5" />,
    path: '/app/nutricionista?s=turmas',
    accent: 'bg-violet-600',
    priority: 4,
  },
];

const W_CENTRAL: Widget[] = [
  {
    id: 'central-dashboard',
    title: 'Análises Centrais',
    description: 'Visão consolidada de todas as unidades.',
    icon: <TrendingUp className="h-5 w-5" />,
    path: '/app/central',
    accent: 'bg-brand-600',
    priority: 1,
  },
  {
    id: 'coord-geral',
    title: 'Coordenação Geral',
    description: 'Acompanhe todas as unidades da rede.',
    icon: <Network className="h-5 w-5" />,
    path: '/app/coordenacao-geral',
    accent: 'bg-violet-600',
    priority: 2,
  },
  {
    id: 'rdic-geral',
    title: 'RDICs Publicados',
    description: 'Relatórios de desenvolvimento publicados.',
    icon: <Brain className="h-5 w-5" />,
    path: '/app/rdic-geral',
    accent: 'bg-amber-600',
    badge: 'Novo',
    priority: 3,
  },
  {
    id: 'inteligencia-central',
    title: 'Painel de Inteligência',
    description: 'Análises avançadas e insights da rede.',
    icon: <Sparkles className="h-5 w-5" />,
    path: '/app/inteligencia',
    accent: 'bg-indigo-600',
    badge: 'Novo',
    priority: 4,
  },
  {
    id: 'relatorios-central',
    title: 'Relatórios',
    description: 'Relatórios centrais e comparativos.',
    icon: <BarChart2 className="h-5 w-5" />,
    path: '/app/reports',
    accent: 'bg-slate-600',
    priority: 5,
  },
];

const W_MANTENEDORA: Widget[] = [
  {
    id: 'global-dashboard',
    title: 'Painel Global',
    description: 'Visão executiva de toda a rede COCRIS.',
    icon: <Building2 className="h-5 w-5" />,
    path: '/app/dashboard',
    accent: 'bg-brand-600',
    priority: 1,
  },
  {
    id: 'coord-geral-mant',
    title: 'Coordenação Geral',
    description: 'Acompanhe todas as unidades da rede.',
    icon: <Network className="h-5 w-5" />,
    path: '/app/coordenacao-geral',
    accent: 'bg-violet-600',
    priority: 2,
  },
  {
    id: 'analises-mant',
    title: 'Análises Centrais',
    description: 'Indicadores consolidados da rede.',
    icon: <TrendingUp className="h-5 w-5" />,
    path: '/app/central',
    accent: 'bg-emerald-600',
    priority: 3,
  },
  {
    id: 'matriz-mant',
    title: 'Matriz 2026',
    description: 'Matriz pedagógica da rede.',
    icon: <Layers className="h-5 w-5" />,
    path: '/app/matriz-pedagogica',
    accent: 'bg-amber-600',
    priority: 4,
  },
  {
    id: 'relatorios-mant',
    title: 'Relatórios',
    description: 'Relatórios executivos e comparativos.',
    icon: <BarChart2 className="h-5 w-5" />,
    path: '/app/reports',
    accent: 'bg-slate-600',
    priority: 5,
  },
];

// ─── WidgetCard ───────────────────────────────────────────────────────────────

function WidgetCard({ widget }: { widget: Widget }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(widget.path)}
      className="group relative w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-ds-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
    >
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 w-1 h-full ${widget.accent} rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity`} />

      <div className="pl-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className={`p-2 rounded-lg ${widget.accent} bg-opacity-10`}>
            <span className={`${widget.accent.replace('bg-', 'text-')}`}>
              {widget.icon}
            </span>
          </div>
          {widget.badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex-shrink-0">
              {widget.badge}
            </span>
          )}
        </div>

        {/* Content */}
        <h3 className="text-[13px] font-semibold text-slate-800 group-hover:text-brand-700 transition-colors leading-tight">
          {widget.title}
        </h3>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
          {widget.description}
        </p>

        {/* Footer */}
        <div className="flex items-center gap-1 mt-3 text-[11px] font-semibold text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Acessar</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </button>
  );
}

// ─── WidgetRenderer ───────────────────────────────────────────────────────────

interface WidgetRendererProps {
  widgets: Widget[];
  title: string;
  subtitle?: string;
}

function WidgetRenderer({ widgets, title, subtitle }: WidgetRendererProps) {
  const sorted = [...widgets].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  return (
    <div>
      {/* Section header */}
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* Grid responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sorted.map((widget) => (
          <WidgetCard key={widget.id} widget={widget} />
        ))}
      </div>
    </div>
  );
}

// ─── UnifiedDashboard ─────────────────────────────────────────────────────────

export function UnifiedDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const userLevels = normalizeRoles(user);
  const userTypes  = normalizeRoleTypes(user);

  const isProfessor       = userLevels.some((r) => r === 'PROFESSOR' || r === 'PROFESSOR_AUXILIAR');
  const isUnidade         = userLevels.some((r) => r === 'UNIDADE' || r.startsWith('UNIDADE_'));
  const isCentral         = userLevels.some((r) => r === 'STAFF_CENTRAL' || r.startsWith('STAFF_CENTRAL_'));
  const isMantenedora     = userLevels.some((r) => r === 'MANTENEDORA' || r.startsWith('MANTENEDORA_'));
  const isDeveloper       = userLevels.includes('DEVELOPER');
  const isDiretor         = userTypes.includes('UNIDADE_DIRETOR');
  const isNutricionista   = userTypes.includes('UNIDADE_NUTRICIONISTA');
  const isCoordPedagogico = userTypes.includes('UNIDADE_COORDENADOR_PEDAGOGICO');

  const userName = (user?.nome as string) || user?.email || 'Usuário';
  const unitName = user?.unit?.name;

  // Saudação por hora
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  // Selecionar widgets por perfil
  let widgets: Widget[] = [];
  let sectionTitle = 'Acesso Rápido';
  let sectionSubtitle: string | undefined;

  if (isDeveloper) {
    widgets = [...W_PROFESSOR, ...W_COORD_PEDAGOGICO, ...W_CENTRAL, ...W_MANTENEDORA];
    sectionTitle = 'Todos os módulos';
    sectionSubtitle = 'Acesso completo — modo desenvolvedor';
  } else if (isMantenedora) {
    widgets = W_MANTENEDORA;
    sectionTitle = 'Painel da Mantenedora';
    sectionSubtitle = 'Visão executiva da rede COCRIS';
  } else if (isCentral) {
    widgets = W_CENTRAL;
    sectionTitle = 'Equipe Central';
    sectionSubtitle = 'Análises e coordenação da rede';
  } else if (isDiretor) {
    widgets = W_DIRETOR;
    sectionTitle = 'Painel do Diretor';
    sectionSubtitle = unitName ? `Unidade: ${unitName}` : undefined;
  } else if (isNutricionista) {
    widgets = W_NUTRICIONISTA;
    sectionTitle = 'Módulo de Nutrição';
    sectionSubtitle = unitName ? `Unidade: ${unitName}` : undefined;
  } else if (isCoordPedagogico) {
    widgets = W_COORD_PEDAGOGICO;
    sectionTitle = 'Coordenação Pedagógica';
    sectionSubtitle = unitName ? `Unidade: ${unitName}` : undefined;
  } else if (isUnidade) {
    widgets = [...W_COORD_PEDAGOGICO, ...W_DIRETOR.slice(1)];
    sectionTitle = 'Painel da Unidade';
    sectionSubtitle = unitName ? `Unidade: ${unitName}` : undefined;
  } else if (isProfessor) {
    widgets = W_PROFESSOR;
    sectionTitle = 'Ferramentas do Professor';
    sectionSubtitle = 'Acesse rapidamente os módulos pedagógicos';
  } else {
    widgets = W_PROFESSOR;
    sectionTitle = 'Acesso Rápido';
  }

  // Atalhos rápidos fixos no rodapé
  const quickLinks = [
    { label: 'Configurações', path: '/app/configuracoes', icon: <Settings className="h-3.5 w-3.5" /> },
    { label: 'Meu Perfil', path: '/app/meu-perfil', icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-full bg-surface-subtle">
      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-950 to-brand-900 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] font-semibold text-brand-300 uppercase tracking-widest mb-1">
            {import.meta.env.VITE_APP_NAME || 'COCRIS Pedagógico'}
          </p>
          <h1 className="text-xl font-bold text-white">
            {greeting}, {userName.split(' ')[0]}
          </h1>
          {unitName && (
            <p className="text-[12px] text-slate-400 mt-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {unitName}
            </p>
          )}
        </div>
      </div>

      {/* ── Widgets ────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <WidgetRenderer
          widgets={widgets}
          title={sectionTitle}
          subtitle={sectionSubtitle}
        />

        {/* ── Atalhos rápidos ─────────────────────────────────────────────── */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-brand-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-50"
            >
              {link.icon}
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
