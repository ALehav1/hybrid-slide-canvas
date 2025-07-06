
import React, { useMemo } from 'react';
import {
  type Editor,
  createTLStore,
  defaultShapeUtils,
  type TLStore,
} from '@tldraw/tldraw';

import { LibraryPanel } from './LibraryPanel';
import { CanvasSlide } from './CanvasSlide';
import { SlideRail } from './SlideRail';
import { useSlidesStore } from '@/state/slidesStore';

interface CanvasRegionProps {
  onMount: (editor: Editor) => void;
}

export const CanvasRegion: React.FC<CanvasRegionProps> = ({ onMount }) => {
  const currentSlideId = useSlidesStore((s) => s.currentSlideId);

  const store: TLStore = useMemo(
    () => createTLStore({ shapeUtils: defaultShapeUtils }),
    []
  );

  return (
    <div className="flex h-full">
      <aside className="w-[288px] shrink-0 border-r bg-white flex flex-col">
        <LibraryPanel />
      </aside>

      <main className="flex-1 flex flex-col">
        <CanvasSlide
          key={currentSlideId}
          slideId={currentSlideId}
          store={store}
          onMount={onMount}
          className="flex-1"
        />
      </main>

      <SlideRail className="w-[112px] shrink-0 border-l bg-gray-50" />
    </div>
  );
};
