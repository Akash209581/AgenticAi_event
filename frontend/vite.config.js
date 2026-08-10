import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/cseAI': {
        target: 'http://localhost:6007',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
