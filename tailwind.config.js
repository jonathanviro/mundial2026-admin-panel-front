/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: '#1B3A5C', light: '#2a5a8c', dark: '#122840' },
        accent:   { DEFAULT: '#C8952A', light: '#f0b429', dark: '#a07520' },
        success:  { DEFAULT: '#006847', light: '#00a651' },
        danger:   '#dc2626',
        surface:  { DEFAULT: '#0f1923', card: '#1a2634', card2: '#243040' },
      },
      fontFamily: { sans: ['Inter', 'Segoe UI', 'sans-serif'] },
    },
  },
  plugins: [],
}


