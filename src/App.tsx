import { useState, useCallback } from 'react';
import { type Editor } from '@tldraw/tldraw';
import { CanvasRegion } from './components/CanvasRegion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConversationProvider } from './components/ConversationProvider';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { Toolbar } from './components/Toolbar';
import { useHistoryManager } from './hooks/useHistoryManager';
import './App.css';



/**
 * Root component with a three-panel layout: Left Sidebar, Main Canvas, Right Sidebar.
 * This structure separates navigation, creation, and AI interaction into distinct zones.
 */
export default function App() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const { setOrigin } = useHistoryManager(editor);

  const handleEditorMount = useCallback((newEditor: Editor) => {
    setEditor(newEditor);
  }, []);

    const handleAiAction = () => {
    if (!editor) return;
    setOrigin('ai');
    editor.createShapes([
      {
        type: 'geo',
        x: 250 + Math.random() * 200,
        y: 250 + Math.random() * 200,
        props: { w: 100, h: 100, geo: 'rectangle', fill: 'solid', color: 'violet' },
      },
    ]);
  };

    const handleTemplateAction = () => {
    if (!editor) return;
    setOrigin('template');
    editor.createShapes([
      {
        type: 'geo',
        x: 250 + Math.random() * 200,
        y: 250 + Math.random() * 200,
        props: { w: 100, h: 100, geo: 'cloud', fill: 'solid', color: 'green' },
      },
    ]);
  };

  return (
    <div role="main" className="app">
      <ErrorBoundary>
        <ConversationProvider initialExpanded={true}>
          <header className="header">
            <h1>Hybrid Slide Canvas</h1>
            <Toolbar editor={editor} />
            <div className="action-buttons">
              <button className="ai-action-btn" onClick={handleAiAction}>
                Simulate AI Action
              </button>
              <button className="template-action-btn" onClick={handleTemplateAction}>
                Simulate Template Action
              </button>
            </div>
          </header>
          <div className="flex flex-grow overflow-hidden">
            <LeftSidebar editor={editor} />
            <main className="flex-grow flex items-center justify-center p-4 bg-gray-50 canvas-container">
                                          <CanvasRegion 
                editor={editor}
                onEditorMount={handleEditorMount} 
              />
            </main>
            <RightSidebar editor={editor} />
          </div>
        </ConversationProvider>
      </ErrorBoundary>
    </div>
  );
}
