/**
 * Tema Escuro Premium - Conexa V3.0
 * 
 * Paleta de cores vibrantes e harmoniosas para dashboards profissionais
 * Inspirado em: Vercel, Linear, Stripe Dashboard
 */

export const darkPremiumTheme = {
  // Cores de fundo
  background: {
    primary: '#0A0A0B',      // Fundo principal (quase preto)
    secondary: '#111113',    // Fundo secundário (cards)
    tertiary: '#1A1A1D',     // Fundo terciário (hover)
    elevated: '#202024',     // Fundo elevado (modais)
  },

  // Bordas e divisores
  border: {
    default: '#27272A',      // Borda padrão
    subtle: '#1F1F23',       // Borda sutil
    strong: '#3F3F46',       // Borda forte
  },

  // Texto
  text: {
    primary: '#FAFAFA',      // Texto principal (branco quase puro)
    secondary: '#A1A1AA',    // Texto secundário (cinza claro)
    tertiary: '#71717A',     // Texto terciário (cinza médio)
    disabled: '#52525B',     // Texto desabilitado
    inverse: '#0A0A0B',      // Texto inverso (para fundos claros)
  },

  // Cores primárias (Azul vibrante)
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',           // Principal
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    DEFAULT: '#3B82F6',
  },

  // Cores de sucesso (Verde vibrante)
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',           // Principal
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    DEFAULT: '#22C55E',
  },

  // Cores de aviso (Amarelo/Laranja vibrante)
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',           // Principal
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    DEFAULT: '#F59E0B',
  },

  // Cores de erro (Vermelho vibrante)
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',           // Principal
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    DEFAULT: '#EF4444',
  },

  // Cores de informação (Ciano vibrante)
  info: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4',           // Principal
    600: '#0891B2',
    700: '#0E7490',
    800: '#155E75',
    900: '#164E63',
    DEFAULT: '#06B6D4',
  },

  // Cores de destaque (Roxo vibrante)
  accent: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',           // Principal
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
    900: '#581C87',
    DEFAULT: '#A855F7',
  },

  // Cores pedagógicas (Campos de Experiência)
  pedagogical: {
    euOutroNos: '#FF6B9D',          // Rosa vibrante
    corpoGestos: '#4ADE80',         // Verde vibrante
    tracosSons: '#F59E0B',          // Laranja vibrante
    escutaFala: '#3B82F6',          // Azul vibrante
    espacosTempo: '#A855F7',        // Roxo vibrante
  },

  // Gradientes
  gradients: {
    primary: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    success: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
    warning: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    error: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    accent: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
    rainbow: 'linear-gradient(135deg, #3B82F6 0%, #A855F7 50%, #EF4444 100%)',
  },

  // Sombras
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    glow: {
      primary: '0 0 20px rgba(59, 130, 246, 0.5)',
      success: '0 0 20px rgba(34, 197, 94, 0.5)',
      warning: '0 0 20px rgba(245, 158, 11, 0.5)',
      error: '0 0 20px rgba(239, 68, 68, 0.5)',
      accent: '0 0 20px rgba(168, 85, 247, 0.5)',
    },
  },

  // Estados interativos
  interactive: {
    hover: 'rgba(255, 255, 255, 0.05)',
    active: 'rgba(255, 255, 255, 0.1)',
    focus: 'rgba(59, 130, 246, 0.2)',
    disabled: 'rgba(255, 255, 255, 0.02)',
  },
};

/**
 * Classes CSS para aplicar o tema
 */
export const darkPremiumClasses = {
  // Backgrounds
  bgPrimary: 'bg-[#0A0A0B]',
  bgSecondary: 'bg-[#111113]',
  bgTertiary: 'bg-[#1A1A1D]',
  bgElevated: 'bg-[#202024]',

  // Bordas
  borderDefault: 'border-[#27272A]',
  borderSubtle: 'border-[#1F1F23]',
  borderStrong: 'border-[#3F3F46]',

  // Texto
  textPrimary: 'text-[#FAFAFA]',
  textSecondary: 'text-[#A1A1AA]',
  textTertiary: 'text-[#71717A]',
  textDisabled: 'text-[#52525B]',

  // Cores vibrantes
  primary: 'bg-[#3B82F6] text-white',
  success: 'bg-[#22C55E] text-white',
  warning: 'bg-[#F59E0B] text-white',
  error: 'bg-[#EF4444] text-white',
  info: 'bg-[#06B6D4] text-white',
  accent: 'bg-[#A855F7] text-white',

  // Hover states
  hoverPrimary: 'hover:bg-[#2563EB]',
  hoverSuccess: 'hover:bg-[#16A34A]',
  hoverWarning: 'hover:bg-[#D97706]',
  hoverError: 'hover:bg-[#DC2626]',
  hoverAccent: 'hover:bg-[#9333EA]',

  // Glow effects
  glowPrimary: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
  glowSuccess: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
  glowWarning: 'shadow-[0_0_20px_rgba(245,158,11,0.5)]',
  glowError: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
  glowAccent: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
};

export default darkPremiumTheme;
