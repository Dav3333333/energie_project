/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    // Breakpoints pensés pour mobile d'abord (base = mobile)
    screens: {
      xs: '380px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
          400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
          800: '#075985', 900: '#0c4a6e',
        },
        success: { DEFAULT: '#16a34a', light: '#dcfce7', dark: '#166534' },
        warning: { DEFAULT: '#f59e0b', light: '#fef3c7', dark: '#92400e' },
        danger:  { DEFAULT: '#dc2626', light: '#fee2e2', dark: '#991b1b' },
        muted:   { DEFAULT: '#64748b', light: '#f1f5f9', dark: '#334155' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      // Hauteurs / largeurs tactiles
      minHeight: {
        touch: '44px',
        'touch-lg': '56px',
      },
      minWidth: {
        touch: '44px',
      },
      // Espaces safe area
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
      },
      // Hauteur viewport dynamique
      height: {
        dvh: '100dvh',
        'dvh-screen': '100dvh',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'bottom-nav': '0 -2px 8px rgb(0 0 0 / 0.06)',
      },
      zIndex: {
        'bottom-nav': '40',
        drawer: '50',
        toast: '60',
        modal: '70',
      },
      transitionTimingFunction: {
        'drawer': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};