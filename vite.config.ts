import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { networkInterfaces } from 'os';

// Patch for restricted environments (Android/Termux, containers)
// where uv_interface_addresses syscall is blocked (error 13)
try {
  networkInterfaces();
} catch {
  const os = require('os');
  os.networkInterfaces = () => ({});
}

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''),
    'process.env.NEXT_PUBLIC_GEMINI_API_KEY': JSON.stringify(process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
    'process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY': JSON.stringify(process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || ''),
    'process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID': JSON.stringify(process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || 'FGY2WhTYpPnrIDTdsKH5'),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': 'http://127.0.0.1:8001',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    crossOriginLoading: false,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  }
});
