/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-deep': '#0a0e17',
        'bg-card': '#111827',
        'bg-elevated': '#1a2236',
        'bg-hover': '#222d42',
        'accent': '#6366f1',
        'accent-cyan': '#38bdf8',
        'bid': '#34d399',
        'ask': '#f87171',
        'warn': '#fbbf24',
        'ai-accent': '#a78bfa',
        'border': '#1e293b',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-muted': '#475569',
      },
      fontFamily: {
        sans: ['"Inter"', '"SF Pro Display"', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"SF Mono"', 'monospace'],
      },
      fontWeight: {
        DEFAULT: '500',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'price-up': 'price-up 0.6s ease-out forwards',
        'price-down': 'price-down 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.2s ease-out',
        'count-up': 'count-up 0.25s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.8)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'price-up': {
          '0%': { boxShadow: 'inset 0 0 20px rgba(52, 211, 153, 0.25)' },
          '100%': { boxShadow: 'inset 0 0 0px rgba(52, 211, 153, 0)' },
        },
        'price-down': {
          '0%': { boxShadow: 'inset 0 0 20px rgba(248, 113, 113, 0.25)' },
          '100%': { boxShadow: 'inset 0 0 0px rgba(248, 113, 113, 0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
