
import React, { useMemo } from 'react'
import {
  type Editor,
  createTLStore,
  defaultShapeUtils,
  type TLStore,
} from '@tldraw/tldraw'

import { LibraryPanel } from './LibraryPanel'
import { ChatPanel } from './Chat/ChatPanel'
import { CanvasSlide } from './CanvasSlide'
import { SlideRail } from './SlideRail'
import { Toolbar } from './Toolbar'
import { useEnhancedSlidesStore } from '@/state/enhancedSlidesStore'
import { EditorContext } from '@/lib/tldraw/EditorContext'

/**
 * CanvasRegion
 * ┌──────────┬───────────────────────┬──────────┐
 * │ sidebar  │   canvas / toolbar    │ thumbnails
 * └──────────┴───────────────────────┴──────────┘
 */
interface CanvasRegionProps {
  /** the *currently mounted* editor instance (set by CanvasSlide on mount) */
  editor: Editor | null
  /** callback forwarded to <CanvasSlide onMount> */
  onEditorMount: (editor: Editor) => void
}

export const CanvasRegion: React.FC<CanvasRegionProps> = ({
  editor,
  onEditorMount,
}) => {
  const currentSlideId = useSlidesStore((s) => s.currentSlideId)

  const store: TLStore = useMemo(
    () => createTLStore({ shapeUtils: defaultShapeUtils }),
    [currentSlideId]
  )

  return (
    <div className="flex h-full">
      {/* left sidebar */}
      <aside className="w-[288px] shrink-0 border-r bg-white flex flex-col">
        <LibraryPanel />
        <ChatPanel />
      </aside>

      {/* canvas column */}
      <EditorContext.Provider value={editor}>
        <main className="flex-1 flex flex-col">
          <Toolbar /> {/* consumes context */}
          <CanvasSlide
            key={currentSlideId}
            slideId={currentSlideId}
            store={store}
            onMount={onEditorMount}
            className="flex-1"
          />
        </main>
      </EditorContext.Provider>

      <SlideRail
        editor={editor}
        className="w-[112px] shrink-0 border-l bg-gray-50"
      />
    </div>
  )
}
