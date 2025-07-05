/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['fsevents'],
    },
    define: {
      'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(env.VITE_OPENAI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@state': path.resolve(__dirname, './src/state'),
        '@types': path.resolve(__dirname, './src/types'),
        '@context': path.resolve(__dirname, './src/context'),
        '@tests': path.resolve(__dirname, './src/__tests__'),
      },
    },
    server: {
      host: true,
      fs: {
        strict: false,
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      include: [
        'src/**/*.{test,spec}.{js,ts,jsx,tsx}'
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**'
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov', 'html', 'json-summary'],
        exclude: [
          'coverage/**',
          'dist/**',
          '**/node_modules/**',
          '**/*.d.ts',
          'src/mocks/**',
          '**/__mocks__/**',
          'src/main.tsx',
        ],
        thresholds: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
      retry: 2,
      testTimeout: 10000,
      pool: 'forks',
    },
  };
});

