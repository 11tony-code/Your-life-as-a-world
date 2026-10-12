import { defineConfig } from 'vite';
import { handleApi } from './server/guide.mjs';

export default defineConfig({
  base: './',
  server: { port: 5173, strictPort: true },
  plugins: [{
    name: 'echo-guide-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api/')) handleApi(req, res);
        else next();
      });
    },
  }],
  build: {
    target: 'es2022',
    rollupOptions: { output: { manualChunks(id) {
      if (id.includes('/node_modules/pixi.js/')) return 'pixi';
      if (id.includes('/node_modules/three/')) return 'islands';
    } } },
    chunkSizeWarningLimit: 1000,
  },
});
