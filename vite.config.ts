import { defineConfig, loadEnv } from 'vite'
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
  console.log('Loaded environment mode:', mode)
  console.log('Environment keys:', Object.keys(env).filter(key => key.startsWith('VITE_')))
  
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
    // Force clear cache when environment variables change
    server: {
      fs: {
        strict: false
      }
    }
  }
})
