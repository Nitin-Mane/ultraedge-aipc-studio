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
        // OpenVINO Aurora UI Theme
        'aurora': {
          'base': 'rgb(var(--color-aurora-base))',
          'surface': 'rgb(var(--color-aurora-surface))',
          'surface-hover': 'rgb(var(--color-aurora-surface-hover))',
          'border': 'rgb(var(--color-aurora-border))',
        },
        'edge': {
          'blue': '#4f46e5',           // UltraEdge electric indigo (primary)
          'cyan': '#22d3ee',           // UltraEdge cyan (accent)
          'cyan-hover': '#06b6d4',     // Cyan hover state
          'cyan-light': '#67e8f9',     // Light cyan
          'cyan-glow': '#00f5ff',      // Neon cyan glow
        },
        'qwen': {
          'purple': '#7c3aed',         // Qwen purple
          'violet': '#a855f7',         // Violet-blue
          'violet-light': '#c084fc',   // Light violet
        },
        'status': {
          'ready': '#10b981',          // Green/cyan
          'preparing': '#3b82f6',      // Blue
          'warning': '#f59e0b',        // Amber
          'error': '#ef4444',          // Red
          'offline': '#06b6d4',        // Cyan
          'enterprise': '#8b5cf6',     // Purple
        },
        'text': {
          'primary': 'rgb(var(--color-text-primary))',
          'secondary': 'rgb(var(--color-text-secondary))',
          'muted': 'rgb(var(--color-text-muted))',
          'accent': '#00f5ff',         // Accent text
        }
      },
      fontFamily: {
        'sans': ['Inter', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'card': '24px',
        'panel': '28px',
        'button': '12px',
        'input': '10px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.45)',
        'glow-cyan': '0 0 20px rgba(0, 245, 255, 0.3)',
        'glow-cyan-strong': '0 0 40px rgba(0, 245, 255, 0.5)',
        'glow-purple': '0 0 20px rgba(160, 85, 252, 0.3)',
      },
      backdropBlur: {
        'glass': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.4s ease-out',
        'slide-right': 'slideRight 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'particle': 'particle 8s linear infinite',
        'ring-rotate': 'ringRotate 20s linear infinite',
        'token-stream': 'tokenStream 0.05s linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 245, 255, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        particle: {
          '0%': { transform: 'translate(0, 0) scale(0)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translate(var(--tx), var(--ty)) scale(1)', opacity: '0' },
        },
        ringRotate: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        tokenStream: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'aurora-mesh': 'linear-gradient(135deg, #0a0e17 0%, #111827 50%, #0a0e17 100%)',
        'neural-grid': 'linear-gradient(rgba(34, 211, 238, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px)',
        'edge-beam': 'linear-gradient(120deg, rgba(79, 70, 229, 0.18) 0%, rgba(34, 211, 238, 0.12) 50%, rgba(168, 85, 247, 0.14) 100%)',
        'edge-sheen': 'linear-gradient(105deg, transparent 40%, rgba(103, 232, 249, 0.12) 50%, transparent 60%)',
      },
      backgroundSize: {
        'grid': '60px 60px',
      },
    },
  },
  plugins: [],
}