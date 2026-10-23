/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      spacing: {
        '88': '22rem',
      },
      colors: {
        // Speaker color palette for text highlighting
        narrator: { light: '#f0f4ff', border: '#bfdbfe' },
        speaker1: { light: '#fef3c7', border: '#fcd34d' },
        speaker2: { light: '#dcfce7', border: '#86efac' },
        speaker3: { light: '#fce7f3', border: '#f9a8d4' },
        speaker4: { light: '#e0e7ff', border: '#a5b4fc' },
        speaker5: { light: '#fed7aa', border: '#fdba74' },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out forwards',
        scaleUp: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shake: 'shake 0.35s ease-in-out',
        slideLeft: 'slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
