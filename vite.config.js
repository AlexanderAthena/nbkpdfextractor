import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    optimizeDeps: {
      exclude: ['pdfjs-dist', 'pdf-lib'],  // Exclude libraries from dependency pre-bundling
    },
    build: {
      rollupOptions: {
        output: {
          sourcemapExcludeSources: true,  // Exclude library sources from source maps
        },
      },
    },
  });