/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:  '#0F5229',
          mid:   '#1A7A3C',
          light: '#2ECC71',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light:   '#F0D080',
        }
      }
    }
  },
  plugins: [],
}
