import React, { useTransition } from 'react';
import { type Editor } from '@tldraw/tldraw';
import { useSlidesStore } from '../state/slidesStore';

interface SlideRailProps {
  editor: Editor | null;
  className?: string;
}

/**
 * SlideRail - Thumbnail navigation for slides
 * Extracted from App.tsx nav section for proper component isolation
 */
export function SlideRail({ editor, className = '' }: SlideRailProps) {
  const [isPending, startTransition] = useTransition();
  const { slides, currentSlideId, setCurrentSlide } = useSlidesStore();

  return (
    <nav className={`w-[112px] border-l border-gray-200 overflow-y-auto bg-gray-50 p-2 ${className}`}>
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
              // Use transition for slide changes to prevent UI blocking
              startTransition(() => {
                setCurrentSlide(s.id, editor);
              });
            }
          }}
        >
          <img
            src={s.thumbnailUrl}
            alt={`Slide ${s.title || s.id}`}
            className={`w-full h-full object-cover ${s.id === currentSlideId && isPending ? 'opacity-50' : ''}`}
            onError={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
          />
        </button>
      ))}
    </nav>
  );
}
