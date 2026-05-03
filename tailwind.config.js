/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        lab: {
          bg:      '#0f172a',
          panel:   '#1e293b',
          border:  '#334155',
          accent:  '#38bdf8',
          success: '#4ade80',
          warning: '#fb923c',
          danger:  '#f87171',
          ink:     '#f1f5f9',
          muted:   '#94a3b8',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    }
  },
  plugins: [],
}
