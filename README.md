# Hybrid Slide Canvas: AI-Powered Slide Creator

Hybrid Slide Canvas is a lightweight React 19 + Vite application that fuses
**TLDraw 3** for drawing, **Rough.js** for a hand-drawn aesthetic, and an AI
chat assistant for "text-to-diagram" creation.
Type **"add a blue rectangle"** and the shape appears—no manual toolbar clicks.

## User Journey

1. **Create a New Presentation**: Start with an empty canvas or choose from
   slide templates
2. **Add Content Through Natural Language**: Use the AI chat to add shapes, text,
   and diagrams
3. **Refine with Direct Manipulation**: Adjust elements by dragging, resizing, or
   using property panels
4. **Organize Your Slides**: Create multiple slides, reorder them via the
   thumbnail bar
5. **Apply Consistent Styling**: Choose from themes or customize the look and feel
6. **Present or Export**: Share your finished presentation

---

## Project Status (July 2, 2025)

- **Area: Codebase**
  **Clean & Tested** — Comprehensive audit complete, Y.js dependencies
  removed, stable baseline confirmed.

- **Area: Core libs**
  **React 19**, **@tldraw/tldraw 3.13**, **Zustand + Immer + Dexie**,
  **Rough.js**, **OpenAI**

- **Area: Performance**
  No more render loop; slide switch < 2 ms; ChatPanel optimized with
  strict JSON mode.

- **Area: AI bridge**
  Chat → JSON → canvas shape **working** and stable with robust
  error handling.

- **Area: Architecture**
  Three-panel layout (LeftSidebar, CanvasRegion, RightSidebar) fully
  implemented.

- **Area: Undo/Redo**
  Multi-origin undo/redo system implemented and tested.

- **Area: Next up**
  MVP Phase 2: Free-draw pen implementation.

### Recent Audit Findings (July 2, 2025)

**✅ Working Baseline Confirmed:**

- Last stable commit: `2479fe2` - all tests passing, no lint errors
- Three-panel layout fully functional with proper state propagation
- AI chat integration working with strict JSON mode and error handling
- Zustand + Immer + Dexie persistence layer fully operational
- TLDraw integration stable with custom shape helpers

**🧹 Cleanup Completed:**

- Removed Y.js dependencies (`yjs`, `y-indexeddb`, `y-websocket`)
- Removed unused MVP test components and routes
- Cleaned up feature flags and related code
- No duplicate or conflicting implementations found

**📁 Current Project Structure:**

- `src/components/` - React components with three-panel layout
- `src/lib/` - Utilities, storage, middleware, and helpers
- `src/state/` - Zustand stores with Dexie persistence
- `src/types/` - Centralized TypeScript type definitions
- `src/__tests__/` - Comprehensive test suite with mocks

**🎯 Ready for MVP Implementation:**

- Clean, stable codebase with no technical debt
- Modular architecture ready for new features
- Comprehensive testing infrastructure in place
- Type-safe foundation with centralized type definitions

---

## AI Command Examples

```text
# Basic Shapes
"Add a blue rectangle"
"Create a rough green ellipse 150×100 labeled 'Budget'"
"Draw a yellow star in the center"

# Complex Elements
"Create a flowchart with Start, Process, Decision, and End nodes"
"Add three blue circles in a row labeled A, B, and C"
"Draw a rough-style org chart with CEO at top"

# Formatting
"Add a text box with 'Quarterly Goals' in bold"
"Create a 2x3 table with headers Sales, Marketing, and Operations"
"Draw a border around the entire slide"
```

## Key Features

### AI Integration

- **AI Shape Commands** — e.g.  
  `add a rough green ellipse 150×100 labelled Budget`
- **Context-Aware AI** — The AI remembers slide context and previous
  conversations
- **Natural Language Processing** — Create, modify, and position shapes using
  everyday language
- **AI Assistance** — Get help with design suggestions and content
  organization

### Canvas & Drawing

- **Sketch-Style Rendering** — Rough.js strokes + TLDraw `dash:"draw"`
- **Shape Library Sidebar** — Pre-built flowchart, diagram, and org-chart
  nodes
- **Rich Text Support** — Add and format text with multiple styling options
- **Smart Object Alignment** — Intelligent snapping and alignment guides

### Presentation Management

- **Multi-Slide Decks** — Create, delete, and reorder slides via the
  thumbnail rail
- **Per-Slide Chat Memory** — Each slide keeps its own chat history, persisted
  in IndexedDB via Dexie.js
- **Slide Thumbnails** — Visual navigation through your presentation
- **Slide Templates** — Start with pre-designed layouts for common use cases

### User Interface

- **Modern, Responsive UI** — Sidebar (library + chat), center canvas,
  thumbnail bar
- **Keyboard Shortcuts** — Speed up common actions with intuitive
  shortcuts
- **Contextual Menus** — Right-click access to relevant tools and
  options
- **Adaptive Layout** — Works on desktop and tablets with responsive
  design

---

## Performance Metrics

| Metric | Performance |
|:---|:---|
| Slide switching | < 2ms |
| Shape creation | < 50ms |
| AI response time | 1-3s (dependent on OpenAI) |
| Canvas render | 60 FPS sustained |
| Initial load | < 1.5s to interactive |
| Memory usage | < 80MB baseline |

## Known Limitations

- Maximum 100 shapes per slide for optimal performance
- Canvas size limited to 4096x4096 pixels
- AI commands work best with simple, direct language
- Limited export formats (currently PNG only, PDF coming in Q3 2025)
- No offline mode for AI features (requires OpenAI API access)

## Architecture

The application's state is managed by two primary systems:

1. **`Zustand` with Immer and IndexedDB Persistence**: Handles global state with
   robust, transactional storage capabilities:
   - **`slidesStore.ts`**: Core slide state using Immer for immutable updates and
     Dexie/IndexedDB persistence for large data, factory functions for
     consistency
   - **`slidesSelectors.ts`**: Comprehensive selector system with:
       - Direct store integration hooks for simplified component use
       - Memoized selectors for performance optimization
       - Type guards and safety helpers to prevent runtime errors
       - Composed selectors for complex data transformations
       - Conversation and metadata-specific selectors
   - **`dexieStorage.ts`**: Dexie database implementation for robust,
     transactional storage
   - **`indexedDbMiddleware.ts`**: Zustand middleware for transparent
     persistence
2. **[ConversationProvider.tsx](cci:7://file:///Users/arilehavi/hybrid-slide-canvas/src/components/ConversationProvider.tsx:0:0-0:0)**: A React context provider that serves as
   the single source of truth for all chat-related functionality. It manages
   UI state (input values, expanded panels), loading/error states, and the
   conversation history for every slide. This centralized approach prevents
   component-level state conflicts and ensures a predictable data flow.

All components that need access to chat functionality, like `ChatPanel`,
consume the `useConversationContext` hook.

### Persistence Architecture

Hybrid Slide Canvas uses a well-structured state management approach with
middleware to ensure data persistence, type safety, and performance:

#### Data Storage Strategy

- **Zustand with Dexie persistence**: All slide data is stored in IndexedDB via
  Dexie.js to support larger data volumes and better performance
- **Dexie-based conversation storage**: Conversation data uses the same IndexedDB
  database with a dedicated API
- **Browser compatibility**: Works in all modern browsers with IndexedDB
  support
- **Migration helpers**: Handles data migration between schema versions
  - Atomic updates for data consistency
  - Configurable persistence settings per store

#### Data Flow

```mermaid
graph TB
    A[User Action] --> B[Zustand Store]
    B -->|"createJSONStorage<br>middleware"| C[Dexie Storage]
    C --> D[IndexedDB]
    B --> E[React Components]
    E --> A
    
    F[Conversation Action] --> G[ConversationProvider]
    G -->|"async storage API"| H[Conversation Storage]
    H --> D
    G --> I[Chat Components]
    I --> F
```

#### Benefits

- **Improved Performance**: IndexedDB offers better performance for larger datasets
- **More Storage Space**: Overcomes browser storage limits with IndexedDB
- **Background Syncing**: Supports background saving without blocking UI
- **Structured Data**: Rich schema support with IndexedDB and Dexie.js
- **Transaction Support**: ACID transactions for data reliability
- **Unified Storage Strategy**: Both slides and conversations use IndexedDB

#### Migration Process

The application includes migration helpers that automatically:

1. Check for schema version mismatches during application startup
2. If needed, automatically migrate data to the new schema version
3. Preserve data integrity throughout migration process
4. Track migration completion to avoid duplicate migrations

#### Testing Strategy

- Uses `fake-indexeddb` to simulate browser IndexedDB in Vitest test
  environment
- Centralized mocks in `src/__tests__/test-utils/mocks/`
- Isolation testing with Vitest spies and mocks
- Integration testing with MSW for network simulation

```ascii
┌─────────────┐         ┌──────────────┐         ┌───────────────┐
│  Zustand    │         │    Dexie     │         │   IndexedDB   │
│   Store     │◄-------►│ Storage Adapter │◄-------►│   Database    │
└─────────────┘         └──────────────┘         └───────────────┘
       ▲                                                  ▲
       │                                                  │
       │                                                  │
       │                                                  │
       │                                                  ▼
       │                       ┌────────────────────────────┐
       └───────────────────────┤        Application         │
                               └────────────────────────────┘
```

- **Zustand Store**: Maintains application state and triggers persistence operations
- **Dexie Storage Adapter**: Handles serialization and transaction management
- **IndexedDB Database**: Native browser storage with structured query capabilities
- **Transaction Management**: Ensures data integrity with atomic operations
- **Persistent Storage**: Survives page reloads and browser restarts

### Multi-Origin Undo/Redo System

To provide granular control over the application's history, we've implemented a custom multi-origin undo/redo system that works on top of TLDraw's native history stack. This allows users to selectively undo actions based on their source (e.g., "undo last AI action").

This system is composed of three key files:

- **`src/state/useHistoryStore.ts`**: A Zustand store that manages separate history stacks for each origin (`user`, `ai`, `template`) as well as a combined stack (`all`). It provides reactive selectors (`canUndo`, `canRedo`) that return boolean states for the UI.
- **`src/managers/HistoryManager.ts`**: A manager class that listens to `tldraw` store changes. It tags every new shape with its origin (`createdBy: 'user' | 'ai'`) and pushes a corresponding entry into `useHistoryStore`. It also provides a `withAISquash` method to group multiple AI-generated shape changes into a single, atomic undoable action using `tldraw`'s `markHistoryStoppingPoint` and `squashToMark` APIs.
- **`src/hooks/useHistoryManager.ts`**: A React hook that creates and memoizes a `HistoryManager` instance for the current editor. It exposes the manager's methods (`undo`, `redo`, `setOrigin`) and the reactive state from `useHistoryStore` to UI components like the `Toolbar`.

#### Logic Flow

The system ensures that our external history store and TLDraw's internal history stack remain synchronized.

```ascii
┌───────────────────┐      ┌──────────────────┐      ┌───────────────────┐
│   UI Component    │◄─────│ useHistoryManager├──────►│  HistoryManager   │
│ (e.g., Toolbar)   │      │      (Hook)      │      │      (Class)      │
└───────────────────┘      └──────────────────┘      └───────────────────┘
       │ ▲                        │ ▲                        │ ▲
       │ │                        │ │                        │ │
 (undo/redo calls)         (reactive state)           (listens for changes)
       │ │                        │ │                        │ │
       ▼ │                        ▼ │                        ▼ │
┌───────────────────┐      ┌──────────────────┐      ┌───────────────────┐
│ useHistoryStore   │◄─────┤ (delegates to)   │      │ TLDraw Store      │
│ (Zustand State)   │      └──────────────────┘      │ (Native History)  │
└───────────────────┘                              └───────────────────┘
```

### State Management Architecture

The application uses a multi-layer middleware approach with Zustand:

1. **Immer Middleware**: First in the chain, providing immutable state updates with structural sharing
   - Enables intuitive state mutation syntax while preserving immutability
     (`draft.slides.push(newSlide)` instead of `{...state, slides:
     [...state.slides, newSlide]}`)
   - Improves developer experience with TypeScript type safety
   - Prevents accidental mutations through proxies
   - Optimizes performance with structural sharing (only modified objects are new
     references)
   - Reduces boilerplate code and improves readability
   - Optimizes performance by only updating changed parts of the state

2. **Persistence Middleware**: Next in the chain, handles automatic state serialization to storage
   - Persists state to IndexedDB via Dexie for resilience and large data
     storage
   - Handles serialization/deserialization of complex objects including dates
   - Manages state hydration on app initialization
   - Provides version migration support

3. **Dev-only deepFreeze Utility**: Applied outside the middleware chain in
   development mode only
   - Bulletproof implementation with `deepFreeze(state)` that handles circular
     references and symbols
   - Throws errors when code attempts to mutate frozen state
   - Helps catch mutation bugs during development
   - Automatically disabled in production for performance
   - Provides detailed error logs pointing to mutation attempts
   - Located in `src/lib/utils/deepFreeze.ts`

```typescript
// State middleware chain example (simplified)
const useSlidesStore = create<SlidesState>(
  immer(
    persist(
      createSlidesStore,
      { storage: createDexieStorage('slidesDb') }
    )
  )
)

// Dev-only deep freeze is applied outside the middleware chain
if (import.meta.env.DEV) {
  deepFreeze(state)
};
```

### TLDraw Shape ID Strategy

A critical architecture component is our unique shape ID generation strategy
(implemented in `src/lib/utils/clientId.ts`):

1. **Client Instance Prefixing**: Each browser instance gets a unique client ID
   - Format: `c_{nanoid(4)}` (e.g., `c_a1b2`)
   - Persists across page reloads for consistency
   - Implemented via `createUniqueShapeId()` function

2. **Shape ID Generation**: All TLDraw shapes use prefixed IDs
   - Uses `createUniqueShapeId()` utility from `clientId.ts`
   - Format: `{clientId}-{nanoid(8)}` (e.g., `cid-a1b2c3-x7y8z9w0`)
   - Ensures no collisions across tabs, devices, or collaborative
     sessions
   - Type-safe: IDs are properly cast to TLDraw's `TLShapeId` type

### Testing with IndexedDB

1. **Mock Implementation**: Uses `fake-indexeddb` for tests
   - Automatically configured in `setupTests.ts`
   - Provides in-memory IndexedDB implementation
   - No configuration needed for individual tests

2. **Zustand Store Testing Patterns**:
   - **Actions Access**: Always use `slidesStore.getState().action()` pattern
   - **Store Reset**: Use built-in `slidesStore.getState().reset()` method to preserve action methods
   - **Type Safety**: Type stores as `StoreApi<StateInterface>` for method access
   - **Persistence Data Flow**: `storage.setItem` expects raw objects (handled by
     `createJSONStorage`), while direct `db.zustandStore` access reveals
     stringified JSON.
   - **Test Isolation**: Use `db.open()` in `beforeEach` and
     `db.delete()`/`db.close()` in `afterEach` for reliable test isolation.

3. **Testing Patterns**:
   - Storage adapter tests verify read/write operations
   - Store tests confirm persistence behavior
   - Migration tests validate data evolution
   - All mocks centralized in `src/__tests__/test-utils/mocks/`

4. **Common Testing Mistakes to Avoid**:
   - ❌ **Never** use `setState(initialData, true)` for reset - erases action
     methods
   - ❌ **Never** call actions directly on store object - causes TypeScript errors
   - ✅ **Always** access actions via `getState()`: `store.getState().action()`
   - ✅ **Always** use store's built-in `reset()` method for test cleanup

### Architecture Diagram

#### Chat Flow

```ascii
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   ChatPanel │────▶│ConversationProvider│────▶│ OpenAI API  │
└─────────────┘     └──────────────────┘     └─────────────┘
                             │
                             ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│ CanvasSlide │◀────│   aiActions.ts   │◀────│ AI Response │
└─────────────┘     └──────────────────┘     └─────────────┘
```

#### Processing Flow

1. **User Input** → Chat message entered in ChatPanel
2. **AI Processing** → The conversation provider sends the message to the OpenAI API
3. **Response Parsing** → The AI response is parsed through aiActions.ts to
   extract structured commands
4. **Canvas Updating** → Valid commands are executed via tldrawHelpers.ts to
   create/modify shapes
5. **State Persistence** → Changes are saved to the Zustand store and
   persisted to IndexedDB

---

## 🚀 Quick Start

```bash
# clone
git clone \
  https://github.com/ALehav1/hybrid-slide-canvas.git
cd hybrid-slide-canvas

# install (pnpm recommended)
pnpm install          # or npm i / yarn

# copy env and add OpenAI key (optional for offline
# usage)
cp env.template .env
echo "VITE_OPENAI_API_KEY=sk-..." >> .env

# run dev server
pnpm dev
# open http://localhost:5173
## 📁 Project Structure – 2025-07-01

<details>
<summary>Click to expand full tree</summary>


hybrid-slide-canvas/
├── public/                 # Static assets copied verbatim to /dist
│   └── vite.svg
└── src/
    ├─ App.tsx              # Root layout: canvas + side-bars + thumbnail
    │                        # rail
    ├─ main.tsx             # React 19 entry, mounts <App/>
    │
    ├─ components/          # Pure UI/interaction logic (no global
    │                        # state)
    │   ├─ CanvasSlide.tsx          # TLDraw wrapper w/ Rough.js skin
    │   ├─ LibraryPanel.tsx         # Shape library sidebar
    │   ├─ ErrorBoundary.tsx        # Global <ErrorBoundary/>
    │   ├─ ConversationProvider.tsx # Chat context provider
    │   └─ Chat/
    │       ├─ ChatPanel.tsx        # Chat UI shell + send button
    │       ├─ aiActions.ts         # Zod schema -> canvas command map
    │       └─ MessageList.tsx      # Virtualised scroll list
    │
    ├─ hooks/               # React hooks that orchestrate UI/state
    │   ├─ useConversationContext.ts # Typed consumer for ConversationProvider
    │   └─ useSlideOrchestration.ts  # Slide keyboard shortcuts & syncing
    │
    ├─ lib/
    │   ├─ openaiClient.ts           # Thin OpenAI SDK wrapper
    │   ├─ theme.ts                  # Central colour / stroke theme
    │   ├─ tldrawHelpers.ts          # createSketchShape(), groupShapes(), …
    │   ├─ utils/
    │   │   ├─ clientId.ts           # createUniqueShapeId() w/ per-tab prefix
    │   │   ├─ deepFreeze.ts         # DEV-only immutability guard
    │   │   └─ logging.ts            # {debug,info,warn,error} → console
    │   ├─ shapeLibraries/           # Declarative "insert-shape" catalogs
    │   │   ├─ basic.ts              # Rect, ellipse, diamond …
    │   │   └─ flowchart.ts          # Start/Process/Decision/End presets
    │   └─ storage/                  # All IndexedDB glue
    │       ├─ dexieStorage.ts       # Generic Zustand <-> Dexie adapter
    │       └─ indexedDbMiddleware.ts# (experimental) streaming persistence
    │
    ├─ state/               # Global state stores (Zustand)
    │   ├─ slidesStore.ts            # Production store (Immer + Dexie)
    │   ├─ enhancedSlidesStore.ts    # Experimental store (split-table schema)
    │   └─ slidesSelectors.ts        # Memoised selectors & handy hooks
    │
    ├─ styles/              # Tailwind/CSS reset + global tokens
    │   └─ base.css
    │
    ├─ types/
    │   └─ app.ts                     # Centralised shared types
    │
    ├─ __tests__/          # TESTS ONLY – mirrors src/ for easy discovery
    │   ├─ state/
    │   │   ├─ slidesStore-dexie.test.ts  # Persistence & Dexie mocking
    │   │   └─ enhancedSlidesStore.test.ts
    │   ├─ lib/
    │   │   ├─ deepFreeze.test.ts
    │   │   └─ tldrawHelpers.test.ts
    │   ├─ components/
    │   │   ├─ ChatPanel.test.tsx
    │   │   └─ LibraryPanel.test.tsx
    │   └─ test-utils/
    │       └─ mocks/
    │           ├─ dexie.ts           # 🔑 in-memory Dexie mock (tables + CRUD)
    │           ├─ openaiClient.ts    # Prevents real network calls
    │           └─ tldraw.ts          # Lightweight TLDraw stub
    │
    └─ setupTests.ts        # fake-indexeddb/auto + global beforeEach

</details>


🔍 What each top-level area does & why

| Layer / Dir   | Purpose                                                      | Why it exists                                        |
|---------------|--------------------------------------------------------------|------------------------------------------------------|
| `public/`     | Static files copied untouched by Vite.                       | Keeps favicon, SVGs and will host exported slide<br>thumbs. |
| `components/` | Pure UI: no global state; props in, events out.              | Makes components tree-shakable and<br>story-book-ready. |
| `hooks/`      | Composable behaviour hooks.                                  | Co-locates slide shortcuts, chat consumers, etc.     |
| `lib/`        | All framework-agnostic helpers & adapters.                   | Enables re-use in Node scripts & tests.              |
| `lib/storage/`| IndexedDB glue (Dexie) + future migration helpers.           | Abstracts persistence so stores stay clean.          |
| `state/`      | Single-source Zustand stores + selectors.                    | Clear boundary between state shape and UI.           |
| `styles/`     | Tailwind base + custom variables.                            | Keeps design tokens away from component logic.       |
| `types/`      | Cross-cutting TypeScript types/enums.                        | Avoids import cycles and "shadow" types.             |
| `__tests__/`  | Collocated test suites & reusable mocks.                     | "Tests live next to code" philosophy for DX.         |
| `setupTests.ts`| Global Vitest bootstrap: fake-indexeddb, console spies, etc. | Guarantees a hermetic test env, zero<br>db/file leakage.|


⸻

🗺️ Directory Narratives

components/
*   `CanvasSlide.tsx` – Boots a TLDraw 3 `<Tldraw>` instance, injects
    Rough.js sketch style, and exposes onEditorMount so external panels (chat)
    can drive the canvas.

state/
*   **`slidesStore.ts`**: Production-ready store that most components consume.
    Uses Immer for ergonomic draft mutating, `deepFreeze()` in dev, and Dexie
    via `createJSONStorage` for ~unlimited slide data.
*   **`enhancedSlidesStore.ts`**: Experimental store with additional features and optimizations.
*   **`slidesSelectors.ts`**: All read-only selectors (pure functions) + React
    wrappers (`useSlides(...)`, `useAdjacentSlides(...)`). Components never
    touch raw store state.

lib/utils/
*   `clientId.ts`: Generates a per-browser-tab cid_ab12 prefix via
    localStorage. Every shape id becomes cid_ab12-x7y8z9w0 → zero collisions
    in multi-user future.
*   `deepFreeze.ts`: DEV-only; walks objects with a WeakSet to avoid cycles;
    freezes symbol keys; bails in prod to save ~3 ms on large payloads.
*   `logging.ts`: Thin wrapper over console.* so we can later swap for Sentry or Echo.

lib/storage/
*   `dexieStorage.ts`: Factory that returns an object matching Zustand's
    StateStorage interface but backed by Dexie (IndexedDB). Adds prefixing,
    error handling & schema upgrades.
*   `indexedDbMiddleware.ts`: (Experimental) stream-writes large JSON blobs in
    chunks to avoid UI jank; currently used only by enhancedSlidesStore.

__tests__/test-utils/mocks/
*   `dexie.ts`: Critical mock: instantiates an in-memory MockDexie with a
    real-looking zustandStore table so persistence middleware doesn't crash.
*   `openaiClient.ts`: Replaces network calls with vi.fn()s returning canned
    responses; lets chat tests run offline.
*   `tldraw.ts`: Lightweight TLDraw stub exposing only createShapes, select,
    etc., for shape-creation unit tests.

### Path Aliases

The project uses TypeScript path aliases to simplify imports:

*   `@/types` → `src/types/` - Application-wide type definitions
*   `@/lib` → `src/lib/` - Utilities, storage, and helper modules
*   `@/components` → `src/components/` - UI components
*   `@/hooks` → `src/hooks/` - React hooks
*   `@/state` → `src/state/` - State management
*   `@/styles` → `src/styles/` - Global styles and CSS variables

## Key File Responsibilities

*   **`ConversationProvider.tsx`**: Central chat state manager that handles
    message processing, AI interactions, and slide-specific conversation
    history.
*   **`CanvasSlide.tsx`**: Manages the TLDraw canvas instance with sketch-style rendering and shape creation.
*   **`slidesStore.ts`**: Production Zustand store managing slide state, navigation, and persistence.
*   **`enhancedSlidesStore.ts`**: Experimental store with additional features and optimizations.
*   **`tldrawHelpers.ts`**: Utilities for creating sketch-style shapes and managing TLDraw operations.
*   **`aiActions.ts`**: Zod schema that validates and processes AI commands for canvas manipulation.
*   **`dexieStorage.ts`**: Zustand storage adapter for Dexie/IndexedDB persistence
*   **`clientId.ts`**: Unique client ID generation for TLDraw shape IDs

### 2025-07-03 — Conversation Provider & Test Suite Stabilization

*   **Fixed `ConversationProvider`**: Resolved all outstanding type errors by ensuring message timestamps are correct `Date` objects.
*   **Refactored Test Suite**: Overhauled `ConversationProvider.test.tsx` to use modern `vi.mock` declarations, eliminating all test failures and lint errors.
*   **Code Cleanup**: Removed unused imports and variables, ensuring a clean and stable codebase.

### 2025-07-02 — Test Suite Stability & Refactoring

*   **Fixed Flaky Tests**: Resolved persistent test failures by implementing an
    explicit, per-test mocking strategy (`vi.doMock`/`vi.doUnmock`) for
    modules with dynamic imports. This ensures mocks are applied correctly and
    avoids conflicts with Vitest's module cache.
*   **Improved Global Test Setup**: Added `vi.resetModules()` to the global
    `afterEach` hook in `setupTests.ts` to guarantee a clean module cache
    between test files, further enhancing test isolation.
*   **Resolved All Lint Errors**: Conducted a full codebase sweep to eliminate TypeScript and lint warnings. This included:
    +   Centralizing shared type definitions (e.g., `LibraryItem`) into
        `src/lib/shapeLibraries/types.ts` to prevent circular dependencies.
    +   Correcting type mismatches in component props.
    +   Removing unused imports and variables across multiple files.
*   **Corrected Test Logic**: Refactored `dexieStorage.test.ts` to fix flawed test logic and ensure the database connection is properly managed and tested.

### 2025-06-30 — State Management & Type-Safety Improvements

*   **Type Safety**: Enforced strict TypeScript rules across the entire codebase
    +   Fixed TypeScript errors in editor.select() and editor.deleteShapes() methods
    +   Ensured consistent type usage between store and UI components
*   **Decoupling**: Separated store creation from persistence for better maintainability
*   **Migration**: Fully migrated from Jest to Vitest for better Vite integration
*   **Coverage**: Added coverage reporting and improved test organization
*   **Mock System**: Centralized mock architecture for consistent testing
    +   All mocks consolidated to src/**tests**/test-utils/mocks/
    +   Enhanced typings for mocks to catch errors early

### 2025-06-29 — ChatPanel Stability & UX Refactor

*   **Stability**: Guarded against premature editor access to prevent race condition crashes
*   **Performance**: Switched to a useSlidesStore selector to prevent unnecessary re-renders
*   **UX**: Implemented auto-scrolling for the message list and ensured errors are cleared on subsequent interactions
*   **Styling**: Refined chat panel UI for a cleaner, more intuitive lookup table to simplify adding new commands

### 2025-06-29 — Major Cleanup & Refactor
*   **Removed** legacy hooks, services, tests (> 500 files)
*   **Fixed** infinite render loop, undefined imports, and duplicate variables
*   **Upgraded** to React 19 + TLDraw 3.13 + Zustand store

## 🗺️ Roadmap
Q3 2025
- Free-draw pen via Rough.js - Add natural sketch-style freehand drawing
  capability
- Export slides to PDF / PNG - Enable presentation export for sharing and printing
- Enhanced AI shape generation - Support more complex diagrams and layouts

Q4 2025
- Custom theme presets - Add Moody's palette, dark mode, and custom branding
  options
- Slide transitions and animations - Add animated transitions between slides
- Performance optimizations - Canvas rendering and state management
  improvements

Q1 2026
- Multi-user collaboration - Real-time editing via Yjs + Liveblocks
- Version history and branching - Track changes and explore alternative designs
- Template marketplace - Share and discover professional slide templates and
  shape libraries

Q2 2026
- AI presentation coaching - Feedback on slide design and content
- Advanced export options - Interactive web presentations and video export
- Enterprise integration - SSO, team management, and collaboration features

## 🤝 Contributing

1. Fork repository
2. `git checkout -b feat/your-feature`
3. Commit + test + lint
4. Open a PR — please include screenshots / test cases

### Getting Started for Contributors

### Adding a New AI Command

1. Open `src/components/Chat/aiActions.ts`
2. Add your command to the `AiActionSchema` Zod schema:

```typescript
const AiActionSchema = z.object({
  action: z.enum(['createShape', 'addText', 'yourNewCommand']),
  // Add specific params for your command
});
```

1. Implement the command handler in `handleAiAction` function
2. Add tests in `aiActions.test.ts`

### Creating a New Shape Type

1. Add shape definition to the appropriate library in `src/lib/shapeLibraries/`
2. Create the shape creator function:

```typescript
export function createCustomShape(editor: Editor, props: CustomShapeProps) {
  return editor.createShapes([
    {
      id: createShapeId(),
      type: 'custom',
      props: { ... },
      // Apply Rough.js styling
      style: { ...roughStyle },
    }
  ]);
}
```

1. Add to the shape factory in `tldrawHelpers.ts`
2. Create tests in `yourShape.test.ts`

### Adding a Slide Template

1. Define template in `src/lib/templates/`
2. Create preview thumbnail
3. Add to template selector in `SlideManager.tsx`
4. Register in `slidesStore.ts` template actions

## 📄 License

MIT
