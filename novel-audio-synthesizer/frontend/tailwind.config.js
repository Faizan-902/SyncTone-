/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          gold: '#E5A93C',
          crimson: '#E50914',
          cyan: '#06B6D4',
          indigo: '#6366F1',
          violet: '#8B5CF6',
        },
        // Speaker color palette for text highlighting
        narrator: { light: '#f0f4ff', border: '#bfdbfe' },
        speaker1: { light: '#fef3c7', border: '#fcd34d' },
        speaker2: { light: '#dcfce7', border: '#86efac' },
        speaker3: { light: '#fce7f3', border: '#f9a8d4' },
        speaker4: { light: '#e0e7ff', border: '#a5b4fc' },
        speaker5: { light: '#fed7aa', border: '#fdba74' },
      },
    },
  },
  plugins: [],
};
