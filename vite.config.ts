import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'webview',
  base: '',
  build: {
    outDir: '../media',
    emptyOutDir: false,
    rollupOptions: {
      input: 'webview/index.html',
      output: {
        entryFileNames: 'webview.js',
        chunkFileNames: 'webview-[hash].js',
        assetFileNames: (assetInfo) => assetInfo.name?.endsWith('.css') ? 'webview.css' : 'webview-[hash][extname]'
      }
    }
  }
});
