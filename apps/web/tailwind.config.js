/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#effbf4',
          100: '#d8f5e4',
          200: '#b7e9cb',
          300: '#82d9aa',
          400: '#45c786',
          500: '#1fa967',
          600: '#158354',
          700: '#0f6844',
          800: '#0b4e35',
          900: '#083b2b',
          950: '#05251c',
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
        'ds-sm':  '0.375rem',
        'ds-md':  '0.5rem',
        'ds-lg':  '0.75rem',
        'ds-xl':  '1rem',
        'ds-2xl': '1.25rem',
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
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['SFMono-Regular', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      transitionDuration: {
        fast:   '100ms',
        base:   '150ms',
        slow:   '250ms',
        slower: '350ms',
      },
    },
  },
  plugins: [],
}
