/** @type {import('tailwindcss').Config} */

// Escala neutra (grafite levemente esverdeado) — substitui o cinza frio padrão
// do Tailwind para que cartões, bordas e textos legados fiquem harmônicos com
// a marca. O tema escuro é tratado em index.css (camada de compatibilidade).
const neutral = {
  50:  '#f7f9f8',
  100: '#eef2f0',
  200: '#e2e8e5',
  300: '#cdd6d1',
  400: '#98a69e',
  500: '#62736a',
  600: '#4b5c53',
  700: '#3a4a42',
  800: '#25322c',
  900: '#14201a',
  950: '#0b140f',
};

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: neutral,
        slate: neutral,
        zinc: neutral,
        neutral,
        stone: neutral,
        brand: {
          50:  '#eaf7f0',
          100: '#d3eee0',
          200: '#aadcc3',
          300: '#78c6a0',
          400: '#3fab7c',
          500: '#1c9565',
          600: '#0f7f53',
          700: '#0b6e47',
          800: '#0a5639',
          900: '#083f2b',
          950: '#04241a',
        },
        surface: {
          page:    'var(--surface-page)',
          base:    'var(--surface-base)',
          subtle:  'var(--surface-subtle)',
          muted:   'var(--surface-muted)',
          elevated:'var(--surface-floating)',
          brand:   'var(--surface-brand)',
          card:    'var(--surface-card)',
        },
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      borderRadius: {
        'ds-sm':  'var(--r-sm)',
        'ds-md':  'var(--r-md)',
        'ds-lg':  'var(--r-lg)',
        'ds-xl':  'var(--r-xl)',
        'ds-2xl': 'var(--r-2xl)',
      },
      boxShadow: {
        'ds-xs':    'var(--shadow-xs)',
        'ds-sm':    'var(--shadow-sm)',
        'ds-md':    'var(--shadow-md)',
        'ds-lg':    'var(--shadow-lg)',
        'ds-brand': 'var(--shadow-glow)',
        'ds-focus': 'var(--shadow-focus)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      transitionDuration: {
        fast:   '100ms',
        base:   '150ms',
        slow:   '250ms',
        slower: '350ms',
      },
      keyframes: {
        'ds-rise':   { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'ds-slide-left': { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'ds-shimmer': { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'ds-rise': 'ds-rise 220ms var(--ease-out) both',
        'ds-slide-left': 'ds-slide-left 260ms var(--ease-out) both',
      },
    },
  },
  plugins: [],
}
