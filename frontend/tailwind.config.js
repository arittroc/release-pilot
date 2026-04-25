/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#030305', // Near pitch black
        accent: '#7c3aed',     // Deep violet
        glow: '#c026d3',       // Magenta glow
      },
      fontFamily: {
        // We will use standard sans for now, but tightly tracked
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
