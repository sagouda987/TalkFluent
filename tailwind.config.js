/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8f8',
          100: '#d3efec',
          200: '#a7ddd7',
          300: '#7bc9c0',
          400: '#53b2aa',
          500: '#318f8b',
          600: '#256f71',
          700: '#1f595d',
          800: '#1d474a',
          900: '#1b3c3e'
        }
      },
      boxShadow: {
        soft: '0 20px 60px rgba(15, 27, 44, 0.14)'
      }
    }
  },
  plugins: []
};
