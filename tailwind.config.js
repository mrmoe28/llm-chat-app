/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brownish-gray': {
          50: '#f7f6f4',
          100: '#edeae5',
          200: '#dbd5cb',
          300: '#c4baaa',
          400: '#ab9d88',
          500: '#96856d',
          600: '#7d6f5d',
          700: '#655a4d',
          800: '#4d4640',
          900: '#3d3935',
          950: '#2a2522',
        },
      },
    },
  },
  plugins: [],
}
