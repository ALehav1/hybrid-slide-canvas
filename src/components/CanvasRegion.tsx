import React from 'react';
import { type Editor } from '@tldraw/tldraw';
import { LibraryPanel } from './LibraryPanel';
import { ChatPanel } from './Chat/ChatPanel';
import { CanvasSlide } from './CanvasSlide';
import { SlideRail } from './SlideRail';
import { useSlidesStore } from '../state/slidesStore';

interface CanvasRegionProps {
  editor: Editor | null;
  onEditorMount: (editor: Editor) => void;
}

/**
 * CanvasRegion - Three-panel layout manager
 * Implements the exact Figma/Canva layout: 288px sidebar | fluid canvas | 112px thumbnail rail
 * Isolates TLDraw from React layout concerns by providing explicit children structure
 */
export function CanvasRegion({ editor, onEditorMount }: CanvasRegionProps) {
  const { currentSlideId } = useSlidesStore();

  return (
    <div className="flex h-full">
      {/* Left Sidebar - 288px fixed width */}
      <aside className="w-[288px] shrink-0 border-r bg-white flex flex-col">
        <LibraryPanel editor={editor} />
        <ChatPanel editor={editor} />
      </aside>

      {/* Main Canvas - Fluid width */}
      <CanvasSlide 
        key={currentSlideId} 
        slideId={currentSlideId} 
        className="flex-1"
        onEditorMount={onEditorMount}
      />

      {/* Right Thumbnail Rail - 112px fixed width */}
      <SlideRail 
        editor={editor}
        className="w-[112px] shrink-0 border-l bg-gray-50" 
      />
    </div>
  );
}
