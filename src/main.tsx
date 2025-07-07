/**
 * main.tsx (Temporary Diagnostic Version)
 * 
 * This file has been temporarily modified to render ONLY the diagnostic component
 * for testing the tldraw shape rendering in a completely isolated environment.
 * 
 * This will help determine if the malformed shape issue is caused by CSS conflicts
 * from the main application's styles.
 * 
 * To restore the original application, revert the changes in this file.
 */
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { ConversationProvider } from './components/ConversationProvider';
import React from 'react';

// Render only the diagnostic component.
// Note: We are NOT importing `index.css` or `App.css` to ensure isolation.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConversationProvider>
      <App />
    </ConversationProvider>
  </React.StrictMode>,
);
