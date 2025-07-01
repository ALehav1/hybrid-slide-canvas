/**
 * Slide Store Selectors
 * 
 * Centralized, memoized selectors for slides state
 * These selectors are optimized for performance and minimize unnecessary re-renders
 * 
 * @module slidesSelectors
 */

import { useMemo } from 'react';
import { type SlidesState, useSlidesStore } from './slidesStore';
import { type SlideData, type ConversationMessage } from '../types/app';
import { logger } from '../lib/utils/logging';

/**
 * A minimal slice of the slides state used by selectors
 * This helps avoid circular dependencies when selectors are used by the store
 * and components evolve independently.
 */
export type SlidesSlice = Pick<
  SlidesState,
  'slides' | 'currentSlideId'
>;

/**
 * Base selector functions for direct state access
 * These are used internally by the exported hooks
 */
export const selectors = {
  /**
   * Get all slides
   */
  getSlides: (state: SlidesSlice) => state.slides,
  
  /**
   * Get current slide ID
   */
  getCurrentSlideId: (state: SlidesSlice) => state.currentSlideId,
  
  /**
   * Get current slide
   */
  getCurrentSlide: (state: SlidesSlice): SlideData | undefined => {
    const currentId = state.currentSlideId;
    return state.slides.find(slide => slide.id === currentId);
  },
  
  /**
   * Get slide by ID
   */
  getSlideById: (state: SlidesSlice, slideId: string): SlideData | undefined => {
    return state.slides.find(slide => slide.id === slideId);
  },
  
  /**
   * Get slide by frame ID
   */
  getSlideByFrameId: (state: SlidesSlice, frameId: string): SlideData | undefined => {
    return state.slides.find(slide => slide.frameId === frameId);
  },
  
  /**
   * Get adjacent slides (prev/next) relative to the current slide
   */
  getAdjacentSlides: (state: SlidesSlice): { prev?: SlideData, next?: SlideData } => {
    const { slides, currentSlideId } = state;
    const currentIndex = slides.findIndex(slide => slide.id === currentSlideId);
    
    if (currentIndex === -1) {
      logger.warn('Current slide not found in slides array', { currentSlideId });
      return {};
    }
    
    const result: { prev?: SlideData; next?: SlideData } = {};
    
    if (currentIndex > 0) {
      result.prev = slides[currentIndex - 1];
    }
    
    if (currentIndex < slides.length - 1) {
      result.next = slides[currentIndex + 1];
    }
    
    return result;
  },
  
  /**
   * Get total slides count
   */
  getSlidesCount: (state: SlidesSlice): number => state.slides.length,
  
  /**
   * Get current slide index (1-based)
   */
  getCurrentSlideIndex: (state: SlidesSlice): number => {
    const { slides, currentSlideId } = state;
    const index = slides.findIndex(slide => slide.id === currentSlideId);
    return index === -1 ? 0 : index + 1;
  },
  
  /**
   * Check if can navigate to previous slide
   */
  canNavigateToPrevious: (state: SlidesSlice): boolean => {
    const { slides, currentSlideId } = state;
    const currentIndex = slides.findIndex(slide => slide.id === currentSlideId);
    return currentIndex > 0;
  },
  
  /**
   * Check if can navigate to next slide
   */
  canNavigateToNext: (state: SlidesSlice): boolean => {
    const { slides, currentSlideId } = state;
    const currentIndex = slides.findIndex(slide => slide.id === currentSlideId);
    return currentIndex < slides.length - 1 && currentIndex !== -1;
  },
  
  /**
   * Get slides with title matching search term
   */
  searchSlidesByTitle: (state: SlidesSlice, searchTerm: string): SlideData[] => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    return state.slides.filter(slide => 
      slide.title.toLowerCase().includes(term)
    );
  },
  
  /**
   * Get recently updated slides (limited to max count)
   */
  getRecentSlides: (state: SlidesSlice, maxCount: number = 5): SlideData[] => {
    return [...state.slides]
      .sort((a, b) => {
        const aDate = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
        const bDate = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, maxCount);
  },
};

/**
 * React hook for accessing all slides
 * Memoized to prevent unnecessary re-renders
 */
export function useSlides(slidesState: SlidesSlice) {
  return useMemo(() => selectors.getSlides(slidesState), [slidesState.slides]);
}

/**
 * React hook for accessing the current slide
 * Memoized to prevent unnecessary re-renders
 */
export function useCurrentSlide(slidesState: SlidesSlice) {
  return useMemo(
    () => selectors.getCurrentSlide(slidesState),
    [slidesState.currentSlideId, slidesState.slides]
  );
}

/**
 * React hook for accessing a slide by ID
 * Memoized to prevent unnecessary re-renders
 */
export function useSlideById(slidesState: SlidesSlice, slideId: string | null) {
  return useMemo(() => {
    if (!slideId) return undefined;
    return selectors.getSlideById(slidesState, slideId);
  }, [slidesState.slides, slideId]);
}

/**
 * React hook for checking if navigation to previous/next slide is possible
 * Returns object with canGoNext and canGoPrevious flags
 */
export function useNavigationState(slidesState: SlidesSlice) {
  return useMemo(() => ({
    canGoNext: selectors.canNavigateToNext(slidesState),
    canGoPrevious: selectors.canNavigateToPrevious(slidesState),
  }), [slidesState.currentSlideId, slidesState.slides]);
}

/**
 * React hook for accessing adjacent slides (prev/next)
 * Memoized to prevent unnecessary re-renders
 */
export function useAdjacentSlides(slidesState: SlidesSlice) {
  return useMemo(
    () => selectors.getAdjacentSlides(slidesState),
    [slidesState.currentSlideId, slidesState.slides]
  );
}

/**
 * React hook for searching slides by title
 * Memoized to prevent unnecessary re-renders
 */
export function useSlideSearch(slidesState: SlidesSlice, searchTerm: string) {
  return useMemo(
    () => selectors.searchSlidesByTitle(slidesState, searchTerm),
    [slidesState.slides, searchTerm]
  );
}

/**
 * React hook for getting recent slides
 * Memoized to prevent unnecessary re-renders
 */
export function useRecentSlides(slidesState: SlidesSlice, maxCount: number = 5) {
  return useMemo(
    () => selectors.getRecentSlides(slidesState, maxCount),
    [slidesState.slides, maxCount]
  );
}

/**
 * Selector helpers for use with Zustand's store.use() API
 * These enable shallow selects to minimize unnecessary component re-renders
 * 
 * Example usage:
 * const slides = useStore(selectSlides);
 * const currentSlide = useStore(selectCurrentSlide);
 */
export const selectSlides = (state: SlidesSlice) => state.slides;
export const selectCurrentSlideId = (state: SlidesSlice) => state.currentSlideId;
export const selectCurrentSlide = (state: SlidesSlice) => selectors.getCurrentSlide(state);
export const selectSlidesCount = (state: SlidesSlice) => selectors.getSlidesCount(state);
export const selectCurrentSlideIndex = (state: SlidesSlice) => selectors.getCurrentSlideIndex(state);
export const selectNavigationState = (state: SlidesSlice) => ({
  canGoNext: selectors.canNavigateToNext(state),
  canGoPrevious: selectors.canNavigateToPrevious(state),
});
export const selectAdjacentSlides = (state: SlidesSlice) => selectors.getAdjacentSlides(state);

/**
 * Factory functions for parameterized selectors
 * These return selector functions that accept specific parameters
 * 
 * Example usage:
 * const selectSlideById = makeSelectSlideById(slideId);
 * const slide = useStore(selectSlideById);
 */
export const makeSelectSlideById = (slideId: string) => 
  (state: SlidesSlice) => selectors.getSlideById(state, slideId);

export const makeSelectSlideByFrameId = (frameId: string) => 
  (state: SlidesSlice) => selectors.getSlideByFrameId(state, frameId);

export const makeSelectSlideSearch = (searchTerm: string) => 
  (state: SlidesSlice) => selectors.searchSlidesByTitle(state, searchTerm);

/**
 * Type guard selector that throws if no current slide is found
 * Useful for code paths where a slide must exist
 */
export const selectCurrentSlideOrThrow = (state: SlidesSlice): SlideData => {
  const slide = selectors.getCurrentSlide(state);
  if (!slide) {
    throw new Error('No current slide selected');
  }
  return slide;
};

/**
 * Performance helper to check if a slide exists without returning the full object
 */
export const selectSlideExists = (state: SlidesSlice, slideId: string): boolean => 
  state.slides.some(slide => slide.id === slideId);

/**
 * Combines multiple selectors for slide progress information
 */
export const selectSlideProgress = (state: SlidesSlice) => ({
  current: selectors.getCurrentSlideIndex(state),
  total: selectors.getSlidesCount(state),
  percentage: Math.round((selectors.getCurrentSlideIndex(state) / Math.max(1, selectors.getSlidesCount(state))) * 100)
});

/**
 * Selects slides with specific metadata values
 */
export const selectSlidesByMetadata = (state: SlidesSlice, key: string, value: any) => 
  state.slides.filter(slide => slide.metadata?.[key] === value);

/**
 * Conversation-specific selectors
 */
export const selectCurrentSlideConversation = (state: SlidesSlice): ConversationMessage[] => {
  const currentSlide = selectors.getCurrentSlide(state);
  return currentSlide?.conversation || [];
};

export const selectSlideHasConversation = (state: SlidesSlice, slideId: string): boolean => {
  const slide = selectors.getSlideById(state, slideId);
  return (slide?.conversation?.length || 0) > 1; // More than just the initial message
};

/**
 * Direct store integration hooks
 * These hooks use the store directly so components don't need to pass state
 */

/**
 * Hook to get all slides directly from the store
 */
export function useSlidesFromStore() {
  return useSlidesStore(selectSlides);
}

/**
 * Hook to get the current slide directly from the store
 */
export function useCurrentSlideFromStore() {
  return useSlidesStore(selectCurrentSlide);
}

/**
 * Hook to get navigation state directly from the store
 */
export function useNavigationStateFromStore() {
  return useSlidesStore(selectNavigationState);
}

/**
 * Hook to get slide progress info directly from the store
 */
export function useSlideProgressFromStore() {
  return useSlidesStore(selectSlideProgress);
}

/**
 * Hook to get the current slide's conversation directly from the store
 */
export function useCurrentConversationFromStore() {
  return useSlidesStore(selectCurrentSlideConversation);
}
