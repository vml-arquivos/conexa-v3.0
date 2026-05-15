/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        surface: {
          base:     '#ffffff',
          subtle:   '#f8fafc',
          muted:    '#f1f5f9',
          elevated: '#ffffff',
        },
      },
      borderRadius: {
        'ds-sm':  '0.375rem',
        'ds-md':  '0.5rem',
        'ds-lg':  '0.75rem',
        'ds-xl':  '1rem',
        'ds-2xl': '1.25rem',
      },
      boxShadow: {
        'ds-xs':    '0 1px 2px 0 rgba(0,0,0,0.05)',
        'ds-sm':    '0 1px 3px 0 rgba(0,0,0,0.07),0 1px 2px -1px rgba(0,0,0,0.04)',
        'ds-md':    '0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.04)',
        'ds-lg':    '0 10px 15px -3px rgba(0,0,0,0.07),0 4px 6px -4px rgba(0,0,0,0.04)',
        'ds-brand': '0 0 0 3px rgba(37,99,235,0.15)',
        'ds-focus': '0 0 0 2px rgba(37,99,235,0.4)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      transitionDuration: {
        'fast':   '100ms',
        'base':   '150ms',
        'slow':   '250ms',
        'slower': '350ms',
      },
    },
  },
  plugins: [],
}

