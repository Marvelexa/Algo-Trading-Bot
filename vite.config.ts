import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env': {}
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      exclude: ['playwright', 'playwright-core', 'events']
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: 'ws://127.0.0.1:3001',
          ws: true,
        },
      },
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR === 'true' ? false : {
        overlay: false
      },
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/public/temp-websites/**',
          '**/public/videos/**',
          '**/public/screenshots/**',
          '**/.whatsapp_session/**',
          '**/public/whatsapp_sent_log.json',
          '**/synced_leads.json'
        ]
      },
    },
  };
});
