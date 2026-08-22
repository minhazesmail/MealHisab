/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eafff1', 500: '#39ff88', 600: '#19d96b', 700: '#0d6b36' },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)',
        },
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line-strong) / <alpha-value>)',
        },
        main: 'rgb(var(--text-main) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        'brand-green': 'rgb(var(--brand-green) / <alpha-value>)',
        'brand-green-2': 'rgb(var(--brand-green-2) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      borderRadius: { xl: '1rem', '2xl': '1.25rem' },
      boxShadow: {
        soft: '0 18px 60px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.025)',
        glow: '0 12px 40px rgba(25, 217, 107, 0.16)',
      },
    },
  },
  plugins: [],
}
