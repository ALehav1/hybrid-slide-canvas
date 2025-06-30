import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Editor, createShapeId, type TLShapeId } from '@tldraw/tldraw';
import { logger } from '../lib/utils/logging';

// The core data structure for a single slide
export type Slide = {
  id: string; // Unique identifier for the slide
  frameId: TLShapeId; // The ID of the corresponding frame shape in tldraw
  title?: string; // Optional title
  thumbnail: string; // URL or data URI for the thumbnail
};

// The state and actions for the slides store
export interface SlidesState {
  slides: Slide[];
  currentSlideId: string;
  addFrameSlide: (editor: Editor) => void;
  deleteSlide: (slideId: string, editor: Editor) => void;
  setCurrentSlide: (id: string, editor: Editor) => void; // Will also handle jumping
  reorderSlides: (fromId: string, toId: string) => void;
  reset: () => void;
}

const initialSlidesState = {
  slides: [
    {
      id: 'slide-1',
      frameId: createShapeId('frame_1'),
      thumbnail: '/placeholder.png',
      title: 'Slide 1',
    },
  ],
  currentSlideId: 'slide-1',
};

export const useSlidesStore = create<SlidesState>()(
  persist(
    (set, get) => ({
      ...initialSlidesState,

      /**
       * Adds a new slide with a corresponding frame in the editor.
       */
      addFrameSlide: (editor: Editor) => {
        if (!editor) return;

        const newSlideNumber = get().slides.length + 1;
        const id = `slide-${newSlideNumber}`;
        const frameId = createShapeId(`frame_${newSlideNumber}`);
        const title = `Slide ${newSlideNumber}`;

        logger.info('Adding new slide', { id, frameId });

        const newSlide: Slide = {
          id,
          frameId,
          title,
          thumbnail: '/placeholder.png', // Placeholder, will be updated later
        };

        // Create the frame shape in the tldraw canvas
        const frameShape = {
          id: frameId,
          type: 'frame' as const,
          x: 100 + (newSlideNumber - 1) * 850, // Position new frames side-by-side
          y: 100,
          props: { w: 800, h: 600, name: title },
        };
        editor.createShapes([frameShape]);

        set((state) => ({
          slides: [...state.slides, newSlide],
          currentSlideId: id,
        }));

        // Zoom to fit the new frame after a short delay
        setTimeout(() => {
          const shape = editor.getShape(frameId);
          if (shape) {
            const bounds = editor.getShapePageBounds(shape);
            if (bounds) {
              editor.zoomToBounds(bounds, { animation: { duration: 300 } });
            }
          }
        }, 100);
      },

      /**
       * Deletes a slide and its corresponding frame from the editor.
       */
      deleteSlide: (slideId: string, editor: Editor) => {
        if (!editor) return;
        if (get().slides.length <= 1) {
          logger.warn('Cannot delete the last slide');
          return;
        }

        const slideToDelete = get().slides.find((s) => s.id === slideId);
        if (!slideToDelete) {
          logger.error('Slide to delete not found', { slideId });
          return;
        }

        logger.info('Deleting slide', { slideId });

        // Delete the frame from the tldraw canvas
        editor.deleteShapes([slideToDelete.frameId]);

        set((state) => {
          const remainingSlides = state.slides.filter((s) => s.id !== slideId);
          let newCurrentSlideId = state.currentSlideId;

          // If the deleted slide was the current one, select the previous or first slide
          if (state.currentSlideId === slideId) {
            const deletedIndex = state.slides.findIndex((s) => s.id === slideId);
            const newIndex = Math.max(0, deletedIndex - 1);
            newCurrentSlideId = remainingSlides[newIndex].id;
          }

          return {
            slides: remainingSlides,
            currentSlideId: newCurrentSlideId,
          };
        });
      },

      /**
       * Sets the current slide and focuses the editor on its frame.
       */
      setCurrentSlide: (id: string, editor: Editor) => {
        if (!editor) {
          set({ currentSlideId: id });
          return;
        }

        const targetSlide = get().slides.find((s) => s.id === id);
        if (!targetSlide) {
          logger.warn('Slide not found', { id });
          return;
        }

        logger.debug('Jumping to slide', { from: get().currentSlideId, to: id });
        set({ currentSlideId: id });

        // Zoom to the frame associated with the slide
        const shape = editor.getShape(targetSlide.frameId);
        if (shape) {
          const bounds = editor.getShapePageBounds(shape);
          if (bounds) {
            editor.zoomToBounds(bounds, { animation: { duration: 300 } });
          }
        }
      },

      /**
       * Reorders slides based on a drag-and-drop operation.
       */
      reorderSlides: (fromId: string, toId: string) => {
        if (fromId === toId) return;

        logger.info('Reordering slides', { from: fromId, to: toId });

        set((state) => {
          const slides = [...state.slides];
          const fromIndex = slides.findIndex((s) => s.id === fromId);
          const toIndex = slides.findIndex((s) => s.id === toId);

          if (fromIndex === -1 || toIndex === -1) {
            logger.error('Could not find slides for reordering', { fromId, toId });
            return state;
          }

          const [movedSlide] = slides.splice(fromIndex, 1);
          slides.splice(toIndex, 0, movedSlide);

          return { slides };
        });
      },

      /**
       * Resets the store to its initial state.
       */
      reset: () => set(initialSlidesState),
    }),
    { name: 'slides-store' } // key used in localStorage
  )
);
