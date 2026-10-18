import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '4.5': '1.125rem',
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
      colors: {
        brand: {
          50:  '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
}

export default config
