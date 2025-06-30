import React, { useState } from 'react';
import { type Editor } from '@tldraw/tldraw';
import { CanvasSlide } from './components/CanvasSlide';
import { ChatPanel } from './components/Chat/ChatPanel';
import { useSlidesStore } from './state/slidesStore';
import { LibraryPanel } from './components/LibraryPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConversationProvider } from './components/ConversationProvider';

/**
 * Root component that wraps the application with context providers and manages editor state.
 */
export default function App() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const { slides, currentSlideId, setCurrentSlide } = useSlidesStore();

  return (
    <div className="app-container flex h-screen bg-white">
      <ErrorBoundary>
        <ConversationProvider initialExpanded={true}>
          <main className="flex-1 bg-gray-50 relative">
            <CanvasSlide
              slideId={currentSlideId}
              key={currentSlideId}
              // Pass a callback to get the editor instance from the canvas
              onEditorMount={setEditor}
            >
              <aside className="absolute top-0 left-0 z-10 w-72 h-full bg-white border-r border-gray-200 flex flex-col">
                <LibraryPanel />
                <ChatPanel />
              </aside>
            </CanvasSlide>
          </main>
        </ConversationProvider>
      </ErrorBoundary>
      <nav className="w-28 border-l border-gray-200 overflow-y-auto bg-gray-50 p-2">
        {slides.map((s) => (
          <button
            key={s.id}
            className={`w-full aspect-[16/9] mb-2 rounded-md overflow-hidden transition-all ${
              s.id === currentSlideId
                ? 'ring-2 ring-blue-600 shadow-md'
                : 'ring-1 ring-gray-300 hover:ring-blue-500'
            }`}
            onClick={() => {
              if (editor) {
                setCurrentSlide(s.id, editor);
              }
            }}
          >
            <img
              src={s.thumbnail}
              alt={`Slide ${s.title || s.id}`}
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
            />
          </button>
        ))}
      </nav>
    </div>
  );
}
