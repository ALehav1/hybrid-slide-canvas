/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { act } from '@testing-library/react';
import Dexie from 'dexie';
import slidesStore from '../slidesStore';



// IMPORTANT: Actions in Zustand stores should always be accessed via getState()
// Example: slidesStore.getState().reset() NOT slidesStore.reset()

import type { Editor, TLShapeId } from '@tldraw/tldraw';

// Use the singleton store instance
// Tests now use the store's built-in reset() method instead of setState with plain data
// This preserves all action methods and is the correct pattern for Zustand stores

// Mock nanoid for predictable IDs in tests
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => `test-id-${Math.random().toString(36).substr(2, 9)}`)
}));

// Mock console methods to prevent noise during tests

console.debug = vi.fn();
console.error = vi.fn();
console.info = vi.fn();
console.warn = vi.fn();



// Helper to create a mock editor
function createMockEditor(): Editor {
  return {
    // Basic methods needed for tests
    selectAll: vi.fn(() => {}) as any,
    deleteShapes: vi.fn(() => {}) as any,
    createShapes: vi.fn(() => ['shape1', 'shape2'] as TLShapeId[]) as any,
    selectNone: vi.fn(() => {}) as any,
    zoomToFit: vi.fn(() => {}) as any,
    zoomToSelection: vi.fn(() => {}) as any,
    getSelectedShapes: vi.fn(() => []) as any,
    getSelectedShapeIds: vi.fn(() => []) as any,
    getShapeById: vi.fn(() => null) as any,
    getShapeAndDescendantIds: vi.fn().mockReturnValue([]) as any,
    setCamera: vi.fn(() => {}) as any,
    updateInstanceState: vi.fn(() => {}) as any,
    setCurrentTool: vi.fn(() => {}) as any,
    exportImage: vi.fn(() => Promise.resolve(new Blob())) as any,
    getShapeByIds: vi.fn(() => []) as any,
    getViewportPageBounds: vi.fn().mockReturnValue({ x: 0, y: 0, w: 1920, h: 1080 }) as any,
    select: vi.fn() as any,
    zoomToBounds: vi.fn() as any,
    getShape: vi.fn() as any,
    getShapePageBounds: vi.fn() as any,
    isShapeHidden: vi.fn() as any,
    getIsShapeHiddenCache: vi.fn() as any,
    getShapeByPath: vi.fn() as any,
    
    // Input system mock with minimal required properties
    inputs: {
      // Just provide what we use in the tests
      ctrlKey: false,
      buttons: new Set() as any,
      keys: new Set() as any,
      originScreenPoint: { x: 0, y: 0 } as any,
      originPagePoint: { x: 0, y: 0 } as any,
      currentScreenPoint: { x: 0, y: 0 } as any,
      currentPagePoint: { x: 0, y: 0 } as any,
      previousScreenPoint: { x: 0, y: 0 } as any,
      previousPagePoint: { x: 0, y: 0 } as any,
      isPointing: false,
      isDragging: false,
      isPanning: false,
      isZooming: false,
      isSpacebarPanning: false,
    } as any,
    
    // Add id as it's used in tests
    id: 'test-editor',
    
    // History system mock with minimal required properties
    history: {
      // Only mock the methods we actually use
      resume: vi.fn(),
      pause: vi.fn(), // Kept for compatibility with test usage
    } as any,
    
    user: {
      // Only provide properties we need
      presence: {},
      id: 'test-user', // Kept for compatibility with test usage
    } as any,
    
    store: {
      set: vi.fn(),
      createWithOptions: vi.fn(),
    } as any,
    
    // Provide minimal options to satisfy type
    options: {
      maxShapesPerPage: 1000,
      maxFilesAtOnce: 10,
      maxPages: 100,
      animationMediumMs: 300,
    } as any,
  } as unknown as Editor;
}

// Mock editor factory
let mockEditor: Editor;

beforeEach(async () => {
  // Enable fake timers for all tests in this suite
  vi.useFakeTimers();

  // Reset mocks between tests
  vi.clearAllMocks();
  
  // Clear any database between tests - properly await async operations
  const databases = await indexedDB.databases();
  await Promise.all(
    databases.map(database => database.name && indexedDB.deleteDatabase(database.name))
  );

  // Reset slidesStore using the built-in reset() method
  // This preserves all action methods while resetting state to initial values
  slidesStore.getState().reset();
  // Create a clean mock for the editor
  mockEditor = createMockEditor();
  
  // No need to register for reset as we're directly calling reset() on the store
  // This approach properly preserves all action methods
});

describe('slidesStore with Dexie persistence', () => {
  // initialState is defined at module scope above
  
  afterEach(async () => {
    // Restore mocks
    vi.restoreAllMocks();
    // Ensure all debounced state persistence is flushed
    await vi.runAllTimersAsync();
  });

  it('should initialize with default state', () => {
    const state = slidesStore.getState();
    
    // The store should start with one slide
    expect(state.slides).toHaveLength(1);
    expect(state.currentSlideId).toBe('slide-1');
    expect(state.slides[0].title).toBe('Welcome to Hybrid Slide Canvas');
  });

  it('should add a frame slide and persist it', async () => {
    // Check initial state
    const initialState = slidesStore.getState();
    expect(initialState.slides.length).toBe(1); // Starts with one slide by default
    
    // No need to reset again - the test starts with a clean slate
    // Test initialization is handled by beforeEach
    
    // Act - add a new slide
    act(() => {
      slidesStore.getState().addFrameSlide(mockEditor);
    });
    
    // Wait for storage persistence
    await (slidesStore as any).persist?.rehydrate?.();
    
    // Assert
    const state = slidesStore.getState();
    expect(state.slides.length).toBe(2); // Default slide + new slide
    expect(mockEditor.createShapes).toHaveBeenCalled();
  });

  it('should update slide title and persist changes', async () => {
    // Tests already have a clean state from beforeEach
    // No need to reset again here
    
    // Act - Update the slide metadata
    act(() => {
      slidesStore.getState().updateSlideMetadata('slide-1', 'Updated Title');
    });
    
    // Wait for storage persistence
    await (slidesStore as any).persist?.rehydrate?.();
    
    // Assert
    const state = slidesStore.getState();
    expect(state.slides[0].title).toBe('Updated Title');
  });

  it('should delete a slide when more than one exists', async () => {
    // Add a second slide
    act(() => {
      slidesStore.getState().addFrameSlide(mockEditor);
    });
    
    await (slidesStore as any).persist?.rehydrate?.();
    
    // Get the second slide ID
    const stateWithTwoSlides = slidesStore.getState();
    expect(stateWithTwoSlides.slides.length).toBe(2);
    const slideToDeleteId = stateWithTwoSlides.slides[1].id;
    
    // Act - Delete the second slide
    act(() => {
      slidesStore.getState().deleteSlide(slideToDeleteId, mockEditor);
    });
    
    // Wait for storage persistence
    await (slidesStore as any).persist?.rehydrate?.();
    
    // Assert
    const finalState = slidesStore.getState();
    expect(finalState.slides.length).toBe(1);
    expect(mockEditor.deleteShapes).toHaveBeenCalled();
  });

  it('should not delete the last remaining slide', async () => {
    // Tests already have a clean state from beforeEach
    // No need to reset again here
    
    // Try to delete the only slide
    act(() => {
      slidesStore.getState().deleteSlide('slide-1', mockEditor);
    });
    
    // Assert - slide should not be deleted
    const stateAfter = slidesStore.getState();
    expect(stateAfter.slides).toHaveLength(1);
    expect(mockEditor.deleteShapes).not.toHaveBeenCalled();
  });

  it('should set current slide and focus editor', async () => {
    // Tests already have a clean state from beforeEach
    // No need to reset again here
    
    // Add two more slides
    act(() => {
      slidesStore.getState().addFrameSlide(mockEditor);
      slidesStore.getState().addFrameSlide(mockEditor);
    });
    
    await (slidesStore as any).persist?.rehydrate?.();
    
    // Get the first slide id
    const stateWithThreeSlides = slidesStore.getState();
    expect(stateWithThreeSlides.slides.length).toBe(3);
    const slideId = stateWithThreeSlides.slides[0].id;
    
    // Act - Set the current slide to the first slide
    act(() => {
      slidesStore.getState().setCurrentSlide(slideId, mockEditor);
    });
    
    // Wait for storage persistence
    await (slidesStore as any).persist?.rehydrate?.();
    
    // Assert
    const state = slidesStore.getState();
    expect(state.currentSlideId).toBe(slideId);
    expect(mockEditor.select).toHaveBeenCalled();
  });

  it('should reorder slides correctly', async () => {
    // First create a clean DB state by deleting any existing DB
    await Dexie.delete('hybrid-slide-canvas');
    
    // Verify we start with a clean slate - one default slide
    const initialState = slidesStore.getState();
    expect(initialState.slides.length).toBe(1);
    
    // Add two more slides using the store's action methods directly on the store
    act(() => {
      slidesStore.getState().addFrameSlide(mockEditor); // Second slide
      slidesStore.getState().addFrameSlide(mockEditor); // Third slide
    });
    
    // Wait for persistence to complete
    await (slidesStore as any).persist?.rehydrate?.();
    
    // Get the slide IDs in their original order
    const slidesBeforeReordering = slidesStore.getState().slides;
    expect(slidesBeforeReordering.length).toBe(3);
    
    const slide1Id = slidesBeforeReordering[0].id;
    const slide2Id = slidesBeforeReordering[1].id;
    const slide3Id = slidesBeforeReordering[2].id;
    
    // Log the initial state for debugging
    console.log('Slides before reordering:', {
      0: slide1Id,
      1: slide2Id,
      2: slide3Id,
    });
    
    // Reorder: move slide at index 2 to index 1, directly on the store
    act(() => {
      slidesStore.getState().reorderSlides(2, 1);
    });
    
    // Wait for persistence to complete
    await (slidesStore as any).persist?.rehydrate?.();
    
    // Check the new order
    const slidesAfterReordering = slidesStore.getState().slides;
    expect(slidesAfterReordering.length).toBe(3);
    
    // Log the resulting state for debugging
    console.log('Slides after reordering:', {
      0: slidesAfterReordering[0].id,
      1: slidesAfterReordering[1].id, 
      2: slidesAfterReordering[2].id,
    });
    
    // After moving index 2 to index 1, order should be:
    // [slide1Id, slide3Id, slide2Id]
    expect(slidesAfterReordering[0].id).toBe(slide1Id);
    expect(slidesAfterReordering[1].id).toBe(slide3Id);
    expect(slidesAfterReordering[2].id).toBe(slide2Id);
    
    // Verify slide numbers are updated correctly
    expect(slidesAfterReordering[0].number).toBe(1);
    expect(slidesAfterReordering[1].number).toBe(2);
    expect(slidesAfterReordering[2].number).toBe(3);
  });

  it('should duplicate a slide', async () => {
    // Tests already have a clean state from beforeEach
    // No need to reset again here
    
    // Duplicate the slide
    act(() => {
      slidesStore.getState().duplicateSlide('slide-1');
    });
    
    // Assert
    const state = slidesStore.getState();
    expect(state.slides).toHaveLength(2);
    
    const duplicatedSlide = state.slides[1];
    expect(duplicatedSlide.title).toBe('Welcome to Hybrid Slide Canvas (Copy)');
    expect(duplicatedSlide.conversation).toHaveLength(0); // Empty conversation
    expect(duplicatedSlide.metadata?.duplicatedFrom).toBe('slide-1');
    expect(state.currentSlideId).toBe(duplicatedSlide.id);
  });

  it('should add messages to slide conversation', async () => {
    // Tests already have a clean state from beforeEach
    // No need to reset again here
    
    const messageData = {
      role: 'user' as const,
      content: 'Test message'
    };
    
    // Add message to first slide
    act(() => {
      slidesStore.getState().addMessage('slide-1', messageData.role, messageData.content);
    });
    
    // Assert
    const state = slidesStore.getState();
    const slide = state.slides.find(s => s.id === 'slide-1');
    
    expect(slide?.conversation).toHaveLength(2); // Welcome message + new message
    // Get the added message object
    const addedMessage = slide?.conversation[1];
    
    // Check that it exists and has the expected properties
    expect(addedMessage).toBeDefined();
    if (addedMessage) {
      // The ConversationMessage interface has direct properties, no need for extraction
      
      // Check that they match the message we added
      expect(addedMessage.role).toBe(messageData.role);
      expect(addedMessage.content).toBe(messageData.content);
      // ID should be generated by nanoid mock (test-id-*)
      expect(addedMessage.id).toMatch(/^test-id-[a-z0-9]+$/);
    }
    expect(slide?.conversation[1].timestamp).toBeInstanceOf(Date);
  });

  it('should reset store to initial state', async () => {
    // Make several changes
    act(() => {
      const snap = slidesStore.getState();
      snap.addFrameSlide(mockEditor);
      snap.updateSlideMetadata('slide-1', 'Changed Title');
      // Fix addMessage call to match the actual function signature
      snap.addMessage('slide-1', 'user', 'Test message');
    });
    
    // Verify changes were made
    const stateBeforeReset = slidesStore.getState();
    expect(stateBeforeReset.slides).toHaveLength(2);
    expect(stateBeforeReset.slides[0].title).toBe('Changed Title');
    
    // Reset with our test initial state (simulating the reset method)
    act(() => {
      // Reset to initial state using the store's built-in reset method
      slidesStore.getState().reset();
      
      // Then set the initial slide state
      // This preserves all action methods while setting state data
      // Use the store's own reset method instead of setState(data, true)
      slidesStore.getState().reset();
    });
    
    // Assert - should be back to initial state
    const stateAfterReset = slidesStore.getState();
    expect(stateAfterReset.slides).toHaveLength(1);
    expect(stateAfterReset.slides[0].title).toBe('Welcome to Hybrid Slide Canvas');
    expect(stateAfterReset.currentSlideId).toBe('slide-1');
    expect(stateAfterReset.slides[0].conversation).toHaveLength(1); // Just welcome message
  });

  it('should handle editor errors gracefully', async () => {
    // Each test starts with a clean state from beforeEach
    // No need for explicit reset here
    
    // Track errors with a spy
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Make createShapes throw an error
    mockEditor.createShapes = vi.fn().mockImplementation(() => {
      throw new Error('Editor error');
    });
    
    // Wrap in try/catch since we expect an error
    let errorCaught = false;
    try {
      // Try to add a slide with the faulty editor
      act(() => {
        slidesStore.getState().addFrameSlide(mockEditor);
      });
    } catch (e: unknown) {
      errorCaught = true;
      console.error('Error in test:', e instanceof Error ? e.message : String(e));
      // Continue even if there's an error
    }
    
    // Wait for any operations to complete
    await (slidesStore as any).persist?.rehydrate?.();
    
    // Verify the store state
    const state = slidesStore.getState();
    
    // Even if we caught an error, the state should be valid
    expect(errorCaught).toBe(true);
    expect(mockEditor.createShapes).toHaveBeenCalled();
    
    // Check that the store is still in a good state
    expect(state.slides).toBeDefined();
    expect(Array.isArray(state.slides)).toBe(true);
    
    // Cleanup
    consoleErrorSpy.mockRestore();
  });

  it('should properly handle slide positioning', async () => {
    // Tests already have a clean state from beforeEach
    // No need to reset again here
    // Use the existing mockEditor from beforeEach
    
    // Add multiple slides
    act(() => {
      const snap = slidesStore.getState();
      snap.addFrameSlide(mockEditor);
      snap.addFrameSlide(mockEditor);
    });
    
    // Check that createShapes was called correctly
    expect(mockEditor.createShapes).toHaveBeenCalledTimes(2);
    
    // Verify createShapes was called twice
    expect(mockEditor.createShapes).toHaveBeenCalledTimes(2);
    
    // Get all createShapes calls and check that they created slides at increasing x positions
    const calls = (mockEditor.createShapes as Mock).mock.calls;
    const firstCallXPosition = calls[0][0][0].x;
    const secondCallXPosition = calls[1][0][0].x;
    
    // The second position should be greater than the first (specific values don't matter)
    expect(secondCallXPosition).toBeGreaterThan(firstCallXPosition);
    
    // Y positions should be the same (both at 0)
    expect(calls[0][0][0].y).toBe(0);
    expect(calls[1][0][0].y).toBe(0);
  });


});
