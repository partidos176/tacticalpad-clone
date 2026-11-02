import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        partido: 'partido.html',
        tareas: 'tareas.html',
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  preview: {
    port: 5173,
  },
});
