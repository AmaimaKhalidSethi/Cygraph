/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#030810',
        panel:   '#060f1e',
        border:  '#0d2444',
        accent:  '#00d4ff',
        danger:  '#ff2244',
        warn:    '#f4a261',
        safe:    '#52b788',
        dim:     '#1a3a5c',
        textDim: '#8ab4d4',
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', 'monospace'],
        raj:  ['Rajdhani', 'sans-serif'],
        orb:  ['Orbitron', 'sans-serif'],
      },
    },
  },
  plugins: [],
}