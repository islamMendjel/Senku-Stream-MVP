/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0a0b10',
        surface: '#131722',
        surfaceLight: '#181d2c',
        borderDim: '#1f293d',
        portal: {
          DEFAULT: '#00ff88',
          glow: '#39ff14',
        },
        cyanNeon: {
          DEFAULT: '#57c7ff',
          bright: '#00d2ff',
        },
        amberNeon: {
          DEFAULT: '#ffb86c',
          bright: '#e5c07b',
        },
        dangerNeon: {
          DEFAULT: '#ff5555',
          bright: '#ff3366',
        },
        textBright: '#e6edf3',
        textMuted: '#768390',
        textDim: '#4e5a6e',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'portal-glow': '0 0 15px rgba(0, 255, 136, 0.35)',
        'cyan-glow': '0 0 15px rgba(87, 199, 255, 0.35)',
        'active-panel': '0 0 20px rgba(0, 255, 136, 0.15)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-fast': 'spin 0.7s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.95)' },
        },
      },
      transitionTimingFunction: {
        'spring-overshoot': 'cubic-bezier(0.175, 0.885, 0.32, 1.1)',
      },
    },
  },
  plugins: [],
};
