/** @type {import('tailwindcss').Config} */
const tokens = require('./tokens/build/tailwind');

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Design tokens from our token system
      colors: tokens.color,
      spacing: tokens.spacing,
      borderRadius: tokens.borderRadius,
      boxShadow: tokens.shadow,
      transitionDuration: tokens.transition,
      // Override specific layout dimensions from tokens
      gridTemplateRows: {
        'hybrid-layout': '60px 1fr auto', // TopNav | CanvasRegion | BottomPanel
      },
      width: {
        'sidebar': '288px',      // Exact Figma/Canva sidebar width
        'thumbnail-rail': '112px', // Exact thumbnail rail width
      },
      height: {
        'header': '60px',        // Header height
      }
    },
  },
  plugins: [
    // Add custom surface plugin for proper component styling
    function({ addUtilities }) {
      addUtilities({
        '.surface-elevated': {
          backgroundColor: 'var(--color-surface-panel, #ffffff)',
          boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
          borderRadius: 'var(--border-radius-md, 6px)',
        },
        '.surface-canvas': {
          backgroundColor: 'var(--color-surface-canvas, #f9fafb)',
        }
      })
    }
  ],
};
