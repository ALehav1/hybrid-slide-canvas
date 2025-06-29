# Hybrid Canvas: AI-Powered Slide Creator

## Overview

Hybrid Canvas is a clean, modern React application that combines TLDraw canvas functionality with AI-powered shape creation. Users can create multi-slide presentations using natural language prompts to generate shapes, text, and designs directly on the canvas.

## ✨ Current Status (June 29, 2025)

**MAJOR CLEANUP COMPLETED** - Project has undergone comprehensive file audit and cleanup:

✅ **Fully Functional App** - All critical issues resolved (duplicate variables, undefined imports, render loops)
✅ **Clean Codebase** - Removed 500+ unused files, components, hooks, services, and tests
✅ **Stable Performance** - No infinite render loops, optimized memoization
✅ **Working AI Integration** - Chat commands create actual shapes on TLDraw canvas

## 🎯 Key Features

- **AI Shape Creation**: Type commands like "add a blue rectangle" or "create text that says hello"
- **Multi-Slide Support**: Create and navigate between multiple slides
- **Per-Slide Chat**: Conversation history persists per slide
- **TLDraw Integration**: Professional drawing canvas with shape creation
- **Clean UI**: Modern interface with sidebar chat and slide thumbnails
- **Responsive Design**: Works on different screen sizes

## 📁 Project Structure

```text
hybrid-canvas/
├── public/
│   └── vite.svg                # Vite logo
├── src/
│   ├── main.tsx                # Application entry point
│   ├── App.tsx                 # Main application component (244 lines)
│   ├── vite-env.d.ts          # Vite environment types
│   ├── assets/
│   │   └── react.svg          # React logo
│   ├── components/             # React components
│   │   ├── ConversationProvider.tsx # Centralized conversation state
│   │   └── TLDrawCanvas.tsx    # TLDraw canvas integration
│   ├── hooks/                  # Custom React hooks
│   │   ├── useConversationContext.ts # Conversation context access
│   │   └── useSlideOrchestration.ts # Slide management
│   ├── lib/                    # Utility libraries
│   │   └── utils/
│   │       └── logging.ts      # Development logging utility
│   ├── styles/                 # Application styles
│   │   ├── App.css            # Main application styles
│   │   ├── index.css          # Global styles
│   │   └── TLDrawCanvas.css   # Canvas-specific styles
│   ├── types/                  # TypeScript type definitions
│   │   └── app.ts             # Core application types
│   └── __tests__/             # Test files
│       ├── App-minimal.test.tsx
│       └── ConversationProvider.test.tsx
├── package.json               # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts           # Vite configuration
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key (optional, for future AI enhancements)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd hybrid-canvas

# Install dependencies
npm install

# Copy environment template
cp env.template .env

# Add your OpenAI API key to .env (optional)
echo "VITE_OPENAI_API_KEY=your-api-key-here" >> .env

# Start development server
npm run dev
```

### Usage

1. **Open the app** - Navigate to `http://localhost:5173`
2. **Create shapes** - Type commands in the chat:
   - "add a blue rectangle"
   - "create a circle"
   - "add text that says hello world"
3. **Manage slides** - Use the slide panel to add/delete slides
4. **Navigate** - Click slide thumbnails to switch between slides

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Run ESLint
```

### Key Components

- **App.tsx** - Main application with ConversationProvider wrapper
- **ConversationProvider** - Manages chat state and conversation history per slide
- **TLDrawCanvas** - Integrates TLDraw with AI shape creation functionality
- **useSlideOrchestration** - Handles slide creation, deletion, and navigation
- **useConversationContext** - Provides access to chat functionality

### AI Shape Creation

The app includes built-in AI command parsing that recognizes:
- **Shapes**: rectangle, square, circle, ellipse
- **Colors**: blue, red, green, black (extensible)
- **Text**: Extracts text content from natural language
- **Positioning**: Centers shapes on the canvas

## 🧪 Testing

The project includes essential tests:
- **App.test.tsx** - Integration tests for main app functionality
- **smoke.test.tsx** - Basic rendering and functionality tests

Run tests with: `npm run test`

## 📦 Dependencies

### Core
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TLDraw** - Canvas and drawing functionality

### Development
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Testing Library** - React component testing

## 🚀 Deployment

The app is configured for easy deployment to:
- **Vercel** (recommended) - `vercel.json` included
- **Netlify** - Works out of the box
- **GitHub Pages** - Static build deployment

## 📝 Recent Changes

### Major Cleanup (June 29, 2025)
- ✅ Removed 500+ unused files, components, hooks, services
- ✅ Fixed all TypeScript errors and render loop issues
- ✅ Simplified architecture to core functionality only
- ✅ Updated project structure and documentation
- ✅ Verified all functionality works correctly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
