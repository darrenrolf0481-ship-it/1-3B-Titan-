import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['var(--font-orbitron)', 'sans-serif'],
        rajdhani: ['var(--font-rajdhani)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        'neon-blue': 'rgb(0, 212, 255)',
        'neon-violet': 'rgb(155, 48, 255)',
        'neon-cyan': 'rgb(0, 255, 240)',
        'neon-red': 'rgb(255, 34, 68)',
        'neon-green': 'rgb(0, 255, 136)',
        'neon-orange': 'rgb(255, 107, 26)',
        'neon-gold': 'rgb(255, 170, 0)',
        'neon-pink': 'rgb(255, 0, 170)',
        panel: 'rgba(13, 13, 25, 0.9)',
        void: '#000008',
        'border-subtle': 'rgb(26, 26, 74)',
        'border-accent': 'rgb(42, 42, 106)',
        'text-ghost': 'rgb(51, 68, 102)',
        'text-dim': 'rgb(102, 136, 170)',
        'text-bright': 'rgb(232, 232, 255)',
      },
    },
  },
  plugins: [],
};

export default config;
