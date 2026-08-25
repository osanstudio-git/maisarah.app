/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#A01020',
          light: '#F8F9FA',
          gray: '#6B7280',
          border: '#E5E7EB'
        }
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'], // Assuming an Arabic font like Tajawal
      }
    },
  },
  plugins: [],
}
