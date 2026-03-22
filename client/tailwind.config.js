/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dirk: {
          orange: '#f97316',
          dark: '#ea580c',
          light: '#fdba74'
        }
      }
    }
  },
  plugins: []
};
