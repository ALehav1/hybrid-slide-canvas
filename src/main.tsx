// Import environment test first to ensure we log environment variables early
// Removed for production

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
// Import App and ConversationProvider
import App from './App'
import { ConversationProvider } from './components/ConversationProvider'
import { logger } from './lib/utils/logging'

// Initialize logger with appropriate level based on environment
logger.setLevel(import.meta.env.DEV ? 'debug' : 'warn')

// Production entry point with ConversationProvider
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConversationProvider>
      <App />
    </ConversationProvider>
  </StrictMode>,
)
