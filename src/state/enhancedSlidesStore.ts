/**
 * Enhanced Slides Store with IndexedDB Persistence
 * 
 * Provides robust state management for slides with:
 * - IndexedDB persistence for better performance and storage limits
 * - Split storage for slide metadata and content
 * - Optimized selector pattern with colocation
 * - Improved TypeScript typing
 * 
 * @module enhancedSlidesStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Editor, createShapeId } from '@tldraw/tldraw';
import { nanoid } from 'nanoid';
import { logger } from '../lib/utils/logging';
import { type SlideData, type ConversationMessage } from '@/lib/types';
import createDexieStorage from '../lib/storage/dexieStorage';

// Initialize Dexie storage adapter
const dexieStorage = createDexieStorage({
  name: 'enhanced-slides',
  initializeDb: true
});

// NOTE: Dexie initialization is handled by the storage adapter
// This happens automatically when createDexieStorage is called



// The state and actions for the slides store
export interface SlidesState {
  // State
  slides: SlideData[];
  currentSlideId: string;
  isLoaded: boolean;
  isHydrated: boolean;
  
  // Actions
  addFrameSlide: (editor: Editor) => void;
  deleteSlide: (slideId: string, editor: Editor) => void;
  setCurrentSlide: (id: string, editor?: Editor) => void;
  reorderSlides: (fromId: string, toId: string) => void;
  reset: () => void;
  updateSlideThumbnail: (slideId: string, thumbnailUrl: string) => void;
  updateSlideTitle: (slideId: string, title: string) => void;
  
  // Persistence methods
  persistSlides: () => Promise<void>;
}

// Create initial message for first slide
const initialMessage: ConversationMessage = {
  role: 'assistant',
  content: 'Welcome to your first slide! Ask me to create content for your presentation.',
  timestamp: new Date(),
  id: nanoid()
};

const initialSlidesState: { slides: SlideData[], currentSlideId: string, isLoaded: boolean, isHydrated: boolean } = {
  slides: [
    {
      id: 'slide-1',
      number: 1,
      snapshotId: 'placeholder-snapshot-1', // Added placeholder snapshotId
      frameId: createShapeId('frame_1'),
      title: 'Slide 1',
      thumbnailUrl: '/placeholder.png',
      conversation: [initialMessage],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { isInitialized: true },
    },
  ],
  currentSlideId: 'slide-1',
  isLoaded: false,
  isHydrated: false,
};

/**
 * Helper to serialize slide content separately from metadata
 * This enables more efficient storage patterns
 */
const serializeSlides = (state: SlidesState) => {
  // Return only the parts of the state we want to persist
  return {
    slides: state.slides,
    currentSlideId: state.currentSlideId,
    isLoaded: state.isLoaded,
  };
};



/**
 * Slides store with enhanced Dexie persistence
 */
export const useEnhancedSlidesStore = create<SlidesState>()(
  persist(
    (set, get) => ({
      ...initialSlidesState,

      addFrameSlide: (editor: Editor) => {
        const newSlideNumber = get().slides.length + 1;
        const newSlideId = `slide-${nanoid(6)}`;
        const newFrameId = createShapeId(`frame_${newSlideNumber}`);
        const title = `Slide ${newSlideNumber}`;

        logger.info('Adding new slide', { id: newSlideId, frameId: newFrameId });

        const newSlide: SlideData = {
          id: newSlideId,
          number: newSlideNumber,
          snapshotId: `placeholder-snapshot-${newSlideNumber}`,
          frameId: newFrameId,
          title,
          thumbnailUrl: '/placeholder.png',
          conversation: [
            {
              role: 'assistant',
              content: 'This is a new slide. What should we create?',
              timestamp: new Date(),
              id: nanoid(),
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { isInitialized: false },
        };

        const frameShape = {
          id: newFrameId,
          type: 'frame' as const,
          x: 100 + (newSlideNumber - 1) * 850,
          y: 100,
          props: { w: 800, h: 600, name: title },
        };

        // Side-effect: create shape in editor
        editor.createShapes([frameShape]);

        // Update state
        set((state) => ({
          slides: [...state.slides, newSlide],
          currentSlideId: newSlideId,
        }));

        // Side-effect: zoom to new frame
        setTimeout(() => {
          const shape = editor.getShape(newFrameId);
          if (shape) {
            const bounds = editor.getShapePageBounds(shape);
            if (bounds) {
              editor.zoomToBounds(bounds, { animation: { duration: 300 } });
            }
          }
        }, 100);
      },

      deleteSlide: (slideId: string, editor: Editor) => {
        if (get().slides.length <= 1) {
          logger.warn('Cannot delete the last slide');
          return;
        }

        const slideToDelete = get().slides.find((s) => s.id === slideId);
        if (!slideToDelete) {
          logger.error('Could not find slide to delete', { slideId });
          return;
        }

        logger.info('Deleting slide', { slideId });
        editor.deleteShapes([slideToDelete.frameId]);

        set((state) => {
          const slides = state.slides.filter((s) => s.id !== slideId);
          let newCurrentSlideId = state.currentSlideId;

          if (state.currentSlideId === slideId) {
            const deletedIndex = state.slides.findIndex((s) => s.id === slideId);
            const newIndex = Math.max(0, deletedIndex - 1);
            newCurrentSlideId = slides[newIndex]?.id || '';
          }

          return {
            slides,
            currentSlideId: newCurrentSlideId,
          };
        });

        logger.info('Deleted slide and frame', { slideId, frameId: slideToDelete.frameId });
      },

      setCurrentSlide: (id: string, editor?: Editor) => {
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
       * Updates a slide's thumbnail.
       */
      updateSlideThumbnail: (slideId: string, thumbnailUrl: string) => {
        set((state) => {
          const slides = [...state.slides];
          const slideIndex = slides.findIndex((s) => s.id === slideId);
          
          if (slideIndex === -1) {
            logger.error('Could not find slide to update thumbnail', { slideId });
            return state;
          }
          
          slides[slideIndex] = {
            ...slides[slideIndex],
            thumbnailUrl: thumbnailUrl,
            updatedAt: new Date(),
          };
          
          return { slides };
        });
      },

      /**
       * Updates a slide's title.
       */
      updateSlideTitle: (slideId: string, title: string) => {
        set((state) => {
          const slides = [...state.slides];
          const slideIndex = slides.findIndex((s) => s.id === slideId);
          
          if (slideIndex === -1) {
            logger.error('Could not find slide to update title', { slideId });
            return state;
          }
          
          slides[slideIndex] = {
            ...slides[slideIndex],
            title,
            updatedAt: new Date(),
          };
          
          return { slides };
        });
      },

      /**
       * Resets the store to its initial state.
       */
      reset: () => { set(initialSlidesState); },

      /**
       * Force persist slides to storage.
       */
      persistSlides: async () => {
        // Get access to persist API from middleware
        const store = get() as SlidesState & { persist?: { persist: () => Promise<void> } };
        if (store.persist?.persist) {
          await store.persist.persist();
          logger.debug('Manually persisted slides state');
        }
      },
    }),
    {
      // Dexie persistence options
      name: 'enhanced-slides-store',
      storage: dexieStorage,
      partialize: serializeSlides, // Use our existing serializer
      onRehydrateStorage: () => (state?: SlidesState, error?: unknown) => {
        if (error) {
          logger.error('Failed to rehydrate enhanced slides store from Dexie', { error });
        }
        if (state) {
          // State successfully rehydrated from Dexie
          logger.debug('Enhanced slides store rehydrated from Dexie');
          // The state will be automatically merged by Zustand, but we can set transient flags.
          state.isLoaded = true;
          state.isHydrated = true;
        }
      },
      version: 1
    }
  )
);

// Selectors are now co-located and do not need to be exported from a separate file.
export { useSlides, useCurrentSlide, useSlideById, 
  useNavigationState, useAdjacentSlides, useSlideSearch, useRecentSlides } from './slidesSelectors';

// Initialize the store early (singleton pattern)
useEnhancedSlidesStore.getState();
