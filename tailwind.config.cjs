/** @type {import('tailwindcss').Config} */
const tokens = require('./tokens/build/tailwind.cjs');

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: tokens.color,
      spacing: tokens.spacing,
      borderRadius: tokens.borderRadius,
      boxShadow: tokens.shadow,
      transitionDuration: tokens.transition,
      gridTemplateRows: {
        'hybrid-layout': '60px 1fr auto',
      },
      width: {
        'sidebar': '288px',
        'thumbnail-rail': '112px',
      },
      height: {
        'header': '60px',
      }
    },
  },
  plugins: [
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
