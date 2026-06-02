/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        slate: {
          950: '#070a13',
          900: '#0d1224',
          800: '#151c36',
          700: '#1f2954',
        },
        indigo: {
          500: '#6366f1',
          400: '#818cf8',
        },
        emerald: {
          500: '#10b981',
          400: '#34d399',
        },
        cyan: {
          500: '#06b6d4',
          400: '#22d3ee',
        },
        rose: {
          500: '#f43f5e',
          400: '#fb7185',
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
