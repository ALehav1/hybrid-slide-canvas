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
import { type SlideData, type ConversationMessage } from '../types/app';
// Reuse selectors from slidesSelectors by adding them to the store
import { selectors } from './slidesSelectors';
import createDexieStorage from '../lib/storage/dexieStorage';

// Initialize Dexie storage adapter
const dexieStorage = createDexieStorage({
  name: 'enhanced-slides',
  initializeDb: true
});

// NOTE: Dexie initialization is handled by the storage adapter
// This happens automatically when createDexieStorage is called

// The core data structure for a single slide
// This extends SlideData with additional UI-specific properties
export type Slide = SlideData & {
  thumbnail?: string; // URL or data URI for the thumbnail (optional)
};

// The state and actions for the slides store
export interface SlidesState {
  // State
  slides: Slide[];
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

const initialSlidesState = {
  slides: [
    {
      id: 'slide-1',
      number: 1,
      frameId: createShapeId('frame_1'),
      title: 'Slide 1',
      thumbnail: '/placeholder.png',
      conversation: [initialMessage],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { isInitialized: true }
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
 * Helper to deserialize slide content and merge with metadata
 */
const deserializeSlides = (persistedState: any, currentState: SlidesState) => {
  if (!persistedState || !persistedState.slidesMetadata) {
    return {
      ...currentState,
      isLoaded: true,
      isHydrated: true,
    };
  }
  
  // Create a map of existing slides by ID for easier lookup
  const slideContentMap = new Map();
  currentState.slides.forEach(slide => {
    slideContentMap.set(slide.id, {
      conversation: slide.conversation,
      metadata: slide.metadata,
    });
  });
  
  // Merge persisted metadata with existing slide content
  const mergedSlides = persistedState.slidesMetadata.map((metadata: any) => {
    const existingContent = slideContentMap.get(metadata.id) || {
      conversation: [],
      metadata: {},
    };
    
    return {
      ...metadata,
      conversation: existingContent.conversation,
      metadata: existingContent.metadata,
      // Ensure dates are proper Date objects
      createdAt: metadata.createdAt instanceof Date 
        ? metadata.createdAt 
        : new Date(metadata.createdAt),
      updatedAt: metadata.updatedAt instanceof Date 
        ? metadata.updatedAt 
        : new Date(metadata.updatedAt),
    };
  });
  
  return {
    ...currentState,
    slides: mergedSlides,
    currentSlideId: persistedState.currentSlideId || currentState.currentSlideId,
    isLoaded: true,
    isHydrated: true,
  };
};

/**
 * Slides store with enhanced Dexie persistence
 */
export const useEnhancedSlidesStore = create<SlidesState>()(
  persist(
    (set, get) => ({
      ...initialSlidesState,

      /**
       * Adds a new slide with a corresponding frame in the editor.
       */
      addFrameSlide: (editor: Editor) => {
        if (!editor) return;

        const newSlideNumber = get().slides.length + 1;
        const id = `slide-${nanoid(6)}`;
        const frameId = createShapeId(`frame_${newSlideNumber}`);
        const title = `Slide ${newSlideNumber}`;

        logger.info('Adding new slide', { id, frameId });

        // Create a new slide with all required fields
        const newSlide: Slide = {
          id,
          number: newSlideNumber,
          frameId,
          title,
          thumbnail: '/placeholder.png', // Placeholder, will be updated later
          conversation: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { isNew: true }
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
        
        // Store slide content - now handled by Dexie persistence
        // No need to manually store slide content anymore
        logger.debug('New slide created with ID', id);
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
        
        // Also remove from IndexedDB
        idb.deleteData('slideContent', slideId).catch(error => {
          logger.error('Failed to delete slide content from IndexedDB', error);
        });
      },

      /**
       * Sets the current slide and focuses the editor on its frame.
       */
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
            thumbnail: thumbnailUrl,
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
      reset: () => set(initialSlidesState),

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
      onRehydrateStorage: () => (state) => {
        if (state) {
          // State successfully rehydrated from Dexie
          logger.debug('Enhanced slides store rehydrated from Dexie');
          // We can't directly use 'set' here as it's not in scope
          // The state will be automatically merged by Zustand
          return { ...state, isLoaded: true, isHydrated: true };
        }
        return undefined;
      },
      version: 1
    }
  )
);

// Export all selectors
export { selectors, useSlides, useCurrentSlide, useSlideById, 
  useNavigationState, useAdjacentSlides, useSlideSearch, useRecentSlides } from './slidesSelectors';

// Initialize the store early (singleton pattern)
useEnhancedSlidesStore.getState();
