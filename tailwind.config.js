/** @type {import('tailwindcss').Config} */
export default { content: ['./index.html', './src/**/*.{ts,tsx}'], theme: { extend: { colors: {
  ember: 'var(--primary)', coral: 'var(--primary-hi)', saffron: 'var(--gold)', charcoal: 'var(--bg)', leaf: 'var(--status-segregated)', white: 'var(--text)',
  orange: { 50: 'var(--surface)', 100: 'var(--surface-raised)', 200: 'var(--glass-border)', 300: 'var(--primary)', 400: 'var(--primary)', 500: 'var(--primary)', 600: 'var(--primary)', 700: 'var(--text-2)', 800: 'var(--text)', 900: 'var(--text)' },
  stone: { 50: 'var(--surface)', 100: 'var(--surface-raised)', 200: 'var(--glass-border)', 300: 'var(--text-3)', 400: 'var(--text-3)', 500: 'var(--text-2)', 600: 'var(--text-2)', 700: 'var(--text)', 800: 'var(--text)', 900: 'var(--text)' },
  green: { 50: 'var(--status-segregated)', 100: 'var(--status-segregated)', 700: 'var(--bg)', 800: 'var(--bg)' },
  yellow: { 50: 'var(--status-partly)', 100: 'var(--status-partly)', 900: 'var(--bg)' },
  red: { 50: 'var(--status-mixed)', 100: 'var(--status-mixed)', 700: 'var(--bg)', 800: 'var(--bg)' }
}, boxShadow: { lift: 'var(--shadow-soft)' } } }, plugins: [] };
