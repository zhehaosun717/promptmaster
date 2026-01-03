import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    // For GitHub Pages deployment with custom domain (sunami.top)
    base: '/',
    server: {
      port: 5555,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    esbuild: {
      // Disable problematic define replacements
      define: {}
    },
    build: {
      sourcemap: false
    }
  };
});
