import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      exclude: ['playwright', 'playwright-core', 'events']
    },
    server: {
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
