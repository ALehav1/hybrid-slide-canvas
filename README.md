# 🎨 Hybrid Slide Canvas

> **AI-Powered Collaborative Diagramming Platform**  
> Create, edit, and share professional diagrams with intelligent assistance

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-green)](https://github.com/ALehav1/hybrid-slide-canvas)
[![Tests](https://img.shields.io/badge/Tests-88%2F88%20Passing-brightgreen)](./README-MVP.md#testing)
[![TypeScript](https://img.shields.io/badge/TypeScript-Zero%20Errors-blue)](./README-MVP.md#typescript)

## ✨ What is Hybrid Slide Canvas?

Hybrid Slide Canvas combines the power of **TLDraw's infinite canvas** with **OpenAI's intelligent assistance** to create a next-generation diagramming experience. Whether you're building flowcharts, wireframes, or architectural diagrams, our platform provides the tools and AI guidance to bring your ideas to life.

### 🎯 Key Features

- **🤖 AI-Powered Diagram Generation** - Describe your diagram in natural language, let AI create it
- **🎨 Professional Drawing Tools** - Full-featured canvas with shapes, free-draw, and custom tools
- **📱 Multi-Slide Presentations** - Organize complex projects across multiple slides
- **⏰ Smart Undo/Redo** - Multi-origin history tracking (separate user/AI/template actions)
- **📤 Export Anywhere** - PNG, PDF, and vector formats for any workflow
- **🔄 Real-Time Collaboration** - *(Coming in Phase 2)*

### 🚀 Quick Start

```bash
# Clone and run locally
git clone https://github.com/ALehav1/hybrid-slide-canvas.git
cd hybrid-slide-canvas
pnpm install
cp .env.template .env  # Add your OpenAI API key
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) and start creating!

## 📚 Documentation

- **[MVP Documentation](README-MVP.md)** - Complete technical documentation, architecture, and API reference
- **[Development Roadmap](Roadmap.md)** - Future features, phases, and development timeline
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project

## 🛠️ Current Status (Baseline MVP)

Our **production-ready MVP** includes:

| Component | Status | Details |
|-----------|--------|---------|
| Core Canvas | ✅ Complete | TLDraw v3 integration with custom shapes |
| AI Integration | ✅ Complete | OpenAI-powered diagram generation |
| Multi-Slide System | ✅ Complete | Slide navigation and management |
| Export Tools | ✅ Complete | PNG and PDF export functionality |
| History System | ✅ Complete | Multi-origin undo/redo with granular control |
| Test Coverage | ✅ Complete | 88/88 tests passing, zero TypeScript errors |

## 🗺️ What's Next?

We're following a **4-phase development roadmap**:

1. **Phase 1** *(Next)*: UI/UX Foundation & Polish
2. **Phase 2**: Advanced Features & Real-Time Collaboration  
3. **Phase 3**: Enterprise Features & Scale
4. **Phase 4**: Platform & Plugin Ecosystem

[View Full Roadmap →](Roadmap.md)

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Canvas**: TLDraw v3 (infinite canvas library)
- **AI**: OpenAI API with structured responses
- **State**: Zustand + Immer for immutable updates
- **Storage**: IndexedDB via Dexie for local persistence
- **Testing**: Vitest + Testing Library (88/88 tests passing)
- **Styling**: Tailwind CSS + CSS Custom Properties

## 🤝 Community

- **🐛 Report Issues**: [GitHub Issues](https://github.com/ALehav1/hybrid-slide-canvas/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/ALehav1/hybrid-slide-canvas/discussions)
- **🔧 Contribute**: See our [Contributing Guide](CONTRIBUTING.md)

## 📄 License

[MIT License](LICENSE) - Feel free to use this project for personal or commercial purposes.

---

**Ready to transform how you create diagrams?** [Get Started →](README-MVP.md#quick-start) | [View Roadmap →](Roadmap.md)
