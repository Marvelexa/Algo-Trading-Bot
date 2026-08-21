import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Chrome extension content scripts must be a single file, so code-splitting
    // is not possible. Raise the limit to suppress the false-positive warning.
    chunkSizeWarningLimit: 800,
    // Configure Rollup to build the content script as a single modular target
    rollupOptions: {
      input: {
        content: 'src/entry.tsx',
        interceptor: 'src/core/network/interceptor.ts',
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
