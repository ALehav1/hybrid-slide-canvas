import React, { useState } from 'react';
import { type Editor } from '@tldraw/tldraw';
import { TopNav } from './components/TopNav';
import { CanvasRegion } from './components/CanvasRegion';
import { BottomChatPanel } from './components/BottomChatPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConversationProvider } from './components/ConversationProvider';

/**
 * Root component with grid-based layout per Figma/Canva specification
 * Implements: TopNav (60px) → CanvasRegion (1fr) → BottomChatPanel (row 3)
 * Isolates TLDraw from React layout concerns
 */
export default function App() {
  const [editor, setEditor] = useState<Editor | null>(null);

  return (
    <div role="main" className="hybrid-app-layout grid grid-rows-[60px_1fr_auto] h-screen bg-white">
      <ErrorBoundary>
        <ConversationProvider initialExpanded={true}>
          <TopNav />                              {/* 60px row 1 */}
          {/* 1fr row 2 */}
          <CanvasRegion
            editor={editor}
            onEditorMount={setEditor}
          />
          <BottomChatPanel />                     {/* row 3 - grid row instead of absolute positioning */}
        </ConversationProvider>
      </ErrorBoundary>
    </div>
  );
}
