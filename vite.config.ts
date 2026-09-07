import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Конфигурация Vite для Ionic React + Capacitor
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 8100, // стандартный порт Ionic
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
  },
  optimizeDeps: {
    // Предварительная сборка для Ionic
    include: ['@ionic/react', '@ionic/react-router', 'ionicons'],
  },
});
