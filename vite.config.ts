/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Log environment variable loading for debugging
const envPath = path.resolve('.env')
console.log(`Checking for .env file at: ${envPath}`)
if (fs.existsSync(envPath)) {
  console.log('.env file exists!')
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    console.log('Environment file content length:', envContent.length)
    const envLines = envContent.split('\n').length
    console.log(`Environment file has ${envLines} lines`)
    
    // Check specifically for OpenAI key without showing full value
    if (envContent.includes('VITE_OPENAI_API_KEY')) {
      console.log('VITE_OPENAI_API_KEY found in .env file')
    } else {
      console.warn('VITE_OPENAI_API_KEY NOT found in .env file')
    }
  } catch (err) {
    console.error('Error reading .env file:', err)
  }
} else {
  console.warn('.env file not found!')
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [react()],
    define: {
      // Explicitly expose env variables to the client
      'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(env.VITE_OPENAI_API_KEY)
    },
    // Add optimizeDeps to prevent caching issues
    optimizeDeps: {
      exclude: [],
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
        '@tests': path.resolve(__dirname, './src/__tests__')
      }
    },
    // Force clear cache when environment variables change
    server: {
      host: true,
      fs: {
        strict: false
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
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
          'src/main.tsx'
        ],
        thresholds: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      },
      // Retry tests to handle flaky tests
      retry: 2,
      // Timeout for async tests
      testTimeout: 10000
    },
  }
})
