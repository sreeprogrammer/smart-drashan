/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: {
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#f9d0d8',
          300: '#f3a8b8',
          400: '#e96d88',
          500: '#db4264',
          600: '#c52a4e',
          700: '#9d1d3e',
          800: '#7a1a35',
          900: '#5c1830',
          950: '#3a0a18',
          deep: '#6B1F2B',
        },
        navy: {
          50: '#f0f4fa',
          100: '#dbe5f1',
          200: '#b8cce3',
          300: '#8aabd0',
          400: '#5a85b8',
          500: '#3a679e',
          600: '#2a4f82',
          700: '#1f3d67',
          800: '#13204f',
          900: '#0a1535',
          950: '#050d24',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          accent: '#D4AF37',
        },
        cream: '#FFF8E7',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        tamil: ['"Noto Sans Tamil"', 'sans-serif'],
      },
      animation: {
        'marquee': 'marquee 30s linear infinite',
        'marquee-pause': 'marquee-pause 30s linear infinite',
        'fade-in': 'fade-in 0.8s ease-out',
        'fade-slide': 'fade-slide 0.6s ease-out',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-slide': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.7' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
