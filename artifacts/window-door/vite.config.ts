import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT ?? '3000';

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, 'src') },
      {
        find: '@assets',
        replacement: path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      ...(!process.env.REPL_ID &&
      !process.env.VITE_CLERK_PUBLISHABLE_KEY &&
      !process.env.CLERK_PUBLISHABLE_KEY
        ? [
            {
              find: '@clerk/clerk-react',
              replacement: path.resolve(
                import.meta.dirname,
                'src/lib/clerk-dev',
              ),
            },
          ]
        : []),
    ],
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: !process.env.REPL_ID
      ? { '/api': { target: 'http://localhost:8080', changeOrigin: true } }
      : undefined,
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
