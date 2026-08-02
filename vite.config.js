// @ts-check
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  return {
    plugins: [react()],
    define: {
      // AI Studio injects GEMINI_API_KEY (no VITE_ prefix); expose it to the client either way.
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(
        env.VITE_GEMINI_API_KEY ?? env.GEMINI_API_KEY ?? ''
      ),
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, '.'),
      },
    },
  };
});
