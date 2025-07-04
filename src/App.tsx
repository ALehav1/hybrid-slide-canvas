// src/App.tsx
import React, {
  useState,
  useCallback,
  useRef,
  useEffect,

} from 'react'
import { type Editor } from '@tldraw/tldraw'

import { CanvasRegion } from './components/CanvasRegion'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ConversationProvider } from './components/ConversationProvider'
import { LeftSidebar } from './components/LeftSidebar'
import { RightSidebar } from './components/RightSidebar'
import { Toolbar } from './components/Toolbar'

import { EditorContext } from './context/EditorContext'
import { useHistoryManager } from './lib/history/useHistoryManager'

import './App.css'

/* -------------------------------------------------------------------------- */
/*  Main App component                                                        */
/* -------------------------------------------------------------------------- */
export default function App() {
  /** Holds the live tldraw Editor once CanvasRegion mounts. */
  const [editor, setEditor] = useState<Editor | null>(null)

  /**
   * We sometimes need direct access to the HistoryManager from the top
   * level (e.g. demo “AI / Template” buttons).  We capture it in a ref
   * via the <HistoryBridge/> helper further down.
   */
  const historyManagerRef = useRef<ReturnType<typeof useHistoryManager> | null>(
    null,
  )

  /* When the inner <Tldraw> instance is ready, CanvasRegion calls this. */
  const handleEditorMount = useCallback((inst: Editor) => {
    setEditor(inst)
  }, [])

  /* ---------------------------------------------------------------------- */
  /*  DEMO ACTIONS (you can delete once real AI/template actions exist)     */
  /* ---------------------------------------------------------------------- */
  const addShapeWithOrigin = useCallback(
    (origin: 'ai' | 'template', color: string) => {
      const hm = historyManagerRef.current
      if (!editor || !hm) return

      hm.setOrigin(origin)
      editor.createShapes([
        {
          type: 'geo',
          x: 250 + Math.random() * 200,
          y: 250 + Math.random() * 200,
          props: {
            w: 100,
            h: 100,
            geo: origin === 'ai' ? 'rectangle' : 'cloud',
            fill: 'solid',
            color,
          },
        },
      ])
    },
    [editor],
  )

  /* ---------------------------------------------------------------------- */
  return (
    <div role="main" className="app">
      <ErrorBoundary>
        <ConversationProvider initialExpanded>
          {/* Provide the current editor to ALL descendants */}
          <EditorContext.Provider value={editor}>
            {/* Bridge lives *inside* the provider so it can see the editor */}
            <HistoryBridge
              setRef={(hm) => {
                historyManagerRef.current = hm
              }}
            />

            {/* ---------- Global app chrome ---------- */}
            <header className="header flex items-center justify-between">
              <h1>Hybrid Slide Canvas</h1>
              {/* Toolbar grabs the editor via useEditor – no prop needed */}
              <Toolbar />
            </header>

            <div className="flex flex-grow overflow-hidden">
              <LeftSidebar />

              <main className="flex-grow flex items-center justify-center p-4 bg-gray-50">
                {/* CanvasRegion creates the editor and passes it up */}
                <CanvasRegion onMount={handleEditorMount} />
              </main>

              <RightSidebar />
            </div>

            {/*  Temporary buttons to prove multi-origin history   */}
            <DemoButtons
              onAI={() => addShapeWithOrigin('ai', 'violet')}
              onTemplate={() => addShapeWithOrigin('template', 'green')}
            />
          </EditorContext.Provider>
        </ConversationProvider>
      </ErrorBoundary>
    </div>
  )
}

/* ======================================================================== */
/*  Helper: exposes the HistoryManager instance up through a ref            */
/* ======================================================================== */
type BridgeProps = {
  setRef: (hm: ReturnType<typeof useHistoryManager>) => void
}

const HistoryBridge: React.FC<BridgeProps> = ({ setRef }) => {
  const historyManager = useHistoryManager() // now safe (inside provider)

  /* Whenever the manager changes, update the parent’s ref. */
  useEffect(() => {
    setRef(historyManager)
  }, [historyManager, setRef])

  return null // no visual output
}

/* ======================================================================== */
/*  Tiny demo panel – remove in production                                  */
/* ======================================================================== */
const DemoButtons: React.FC<{
  onAI: () => void
  onTemplate: () => void
}> = ({ onAI, onTemplate }) => (
  <div className="fixed bottom-4 right-4 flex gap-2">
    <button className="btn-primary" onClick={onAI}>
      + AI Shape
    </button>
    <button className="btn-secondary" onClick={onTemplate}>
      + Template Shape
    </button>
  </div>
)
