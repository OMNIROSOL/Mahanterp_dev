/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4f46e5', // Indigo
          dark: '#4338ca',
          light: '#818cf8',
        },
        secondary: {
          DEFAULT: '#F3F4F6', // Light Gray
          dark: '#E5E7EB',
          light: '#F9FAFB',
        },
        success: '#10b981', // Green
        warning: '#f59e0b', // Orange
        error: '#ef4444', // Red
        background: '#F8F9FB', // Light Gray
        surface: '#ffffff', // White
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
