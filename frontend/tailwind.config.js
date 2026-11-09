/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aurora: {
          dark: '#120F24',
          indigo: '#3B3470',
          violet: '#5B4FB8',
          lavender: '#8B80E0',
          periwinkle: '#B9B0F0',
          bloom: '#F1EEFA',
          mauve: '#B77A8E',
          coral: '#F2A36B',
          peach: '#FFA566',
          orange: '#E08A5A',
          neon: '#D4F23A',
          screen: '#0B0B12',
          accentFrom: '#9B8CFF',
          accentTo: '#FFA566',
        },
        midnight: {
          950: '#0c0a1a',
          900: '#141126',
          850: '#1c1836',
          800: '#252047',
          700: '#322c5e',
          600: '#433b7a',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
        '4xl': '32px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
        'glass-hover': '0 12px 40px 0 rgba(155, 140, 255, 0.15)',
        'aurora-glow': '0 0 50px -10px rgba(185, 176, 240, 0.35)',
        'active-pill': '0 4px 20px -2px rgba(255, 165, 102, 0.45)',
        'bubble': '0 12px 30px -4px rgba(0, 0, 0, 0.18)',
      },
      backgroundImage: {
        'active-gradient': 'linear-gradient(90deg, #B9AEFF 0%, #FFA566 100%)',
        'active-gradient-hover': 'linear-gradient(90deg, #A89BFF 0%, #FF954E 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 5s ease-in-out infinite',
        'drift': 'drift 25s ease-in-out infinite alternate',
        'beam': 'beam 8s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        drift: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(40px, -20px) scale(1.08)' },
          '100%': { transform: 'translate(-30px, 30px) scale(0.96)' },
        },
        beam: {
          '0%': { opacity: '0.45', transform: 'scaleX(1)' },
          '100%': { opacity: '0.75', transform: 'scaleX(1.15)' },
        },
      },
    },
  },
  plugins: [],
}
