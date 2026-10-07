/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
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
