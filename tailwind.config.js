/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        // Light theme — warm cream + white + near-black neutrals.
        canvas: '#FFFFFF',
        soft: '#FBFBF9',
        card: '#F6F6F3',
        secondary: '#E5E5E0',
        'secondary-pressed': '#C8C8C1',
        hairline: '#DADAD3',
        'soft-hairline': '#E5E5E0',
        ink: '#000000',
        'ink-secondary': '#33332E',
        'ink-muted': '#62625B',
        'ink-disabled': '#91918C',
        'ink-faint': '#C8C8C1',
        // Accent — used sparingly for actions and active states.
        accent: {
          DEFAULT: '#E60023',
          pressed: '#CC001F',
          light: '#FF5C6C', // dark-mode accent text (readable on dark surfaces)
        },
        // Dark theme surfaces.
        night: {
          DEFAULT: '#191918',
          card: '#262622',
          card2: '#30302D',
          text: '#FFFFFF',
          secondary: '#DADAD3',
          muted: '#A5A59E',
          hairline: '#30302D',
        },
      },
    },
  },
  plugins: [],
};
