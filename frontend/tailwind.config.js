/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#02040A',
          900: '#030712', // Deep Space Void
          850: '#070D1F',
          800: '#0B132B', // Elevated Titanium Card Surface
          750: '#0F1A3A',
          700: '#14214D',
          600: '#1D2E68',
          500: '#2E448F',
        },
        orbital: {
          cyan: '#38BDF8', // Orbital Radar Cyan
          glow: 'rgba(56, 189, 248, 0.25)',
          deep: '#0284C7',
        },
        plasma: {
          orange: '#F97316', // Atmospheric Reentry Plasma
          glow: 'rgba(249, 115, 22, 0.25)',
          deep: '#EA580C',
        },
        deorbit: {
          green: '#10B981', // Confirmed Deorbit / Clean Atmospheric Reentry
          glow: 'rgba(16, 185, 129, 0.25)',
          dark: '#059669',
        },
        threat: {
          crimson: '#EF4444', // Active Collision Hazard / Failed ADR
          glow: 'rgba(239, 68, 68, 0.25)',
        },
        decay: {
          amber: '#F59E0B', // Partial Orbit Lowering Milestone
          glow: 'rgba(245, 158, 11, 0.25)',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'orbital-glow': '0 0 25px -4px rgba(56, 189, 248, 0.35)',
        'deorbit-glow': '0 0 25px -4px rgba(16, 185, 129, 0.35)',
        'plasma-glow': '0 0 25px -4px rgba(249, 115, 22, 0.35)',
        'threat-glow': '0 0 25px -4px rgba(239, 68, 68, 0.35)',
        'radar-console': 'inset 0 0 30px rgba(56, 189, 248, 0.05), 0 10px 30px -10px rgba(0, 0, 0, 0.8)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-radar': 'spin 12s linear infinite',
      },
    },
  },
  plugins: [],
};
