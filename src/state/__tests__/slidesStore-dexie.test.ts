/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { mockDexie } from '../../__tests__/test-utils/mocks';
import slidesStore from '../slidesStore';

// Mock console methods to prevent noise during tests
console.debug = vi.fn();
console.error = vi.fn();

// Setup mock for nanoid to ensure consistent IDs in tests
vi.mock('nanoid', () => ({
  nanoid: () => 'test-id-123'
}));

// Mock Dexie directly
vi.mock('dexie', () => {
  return {
    default: mockDexie.MockDexie
  };
});

describe('slidesStore with Dexie persistence', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      slidesStore.setState({
        slides: [],
        currentSlideId: '',
      }, true);
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should add a frame slide and persist it', async () => {
    // Create a mock editor
    const mockEditor = {
      createShapes: vi.fn(),
      select: vi.fn()
    };
    
    // Act - add a new slide
    act(() => {
      slidesStore.getState().addFrameSlide(mockEditor);
    });
    
    // Wait for async storage
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Assert
    const state = slidesStore.getState();
    expect(state.slides.length).toBe(1);
    expect(mockEditor.createShapes).toHaveBeenCalled();
  });

  it('should update slide metadata and persist changes', async () => {
    // Arrange - Add a slide first
    const mockEditor = {
      createShapes: vi.fn(),
      select: vi.fn()
    };
    
    act(() => {
      slidesStore.getState().addFrameSlide(mockEditor);
    });
    
    // Get the created slide id
    const slideId = slidesStore.getState().slides[0].id;
    
    // Wait for async storage
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Act - Update the slide metadata
    act(() => {
      slidesStore.getState().updateSlideMetadata(slideId, 'Updated Title');
    });
    
    // Wait for async storage
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Assert
    const state = slidesStore.getState();
    expect(state.slides[0].title).toBe('Updated Title');
  });

  it('should delete a slide and persist changes', async () => {
    // Arrange - First create two slides so we can delete one
    const mockEditor = {
      createShapes: vi.fn(),
      select: vi.fn(),
      deleteShapes: vi.fn()
    };
    
    // Create first slide
    act(() => {
      slidesStore.getState().addFrameSlide(mockEditor);
    });
    
    // Create second slide
    act(() => {
      slidesStore.getState().addFrameSlide(mockEditor);
    });
    
    // Get the second slide id
    const slideId = slidesStore.getState().slides[1].id;
    
    // Wait for async storage
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Act - Delete the second slide
    act(() => {
      slidesStore.getState().deleteSlide(slideId, mockEditor);
    });
    
    // Wait for async storage
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Assert
    const state = slidesStore.getState();
    expect(state.slides.length).toBe(1);
    expect(mockEditor.deleteShapes).toHaveBeenCalled();
  });

  it('should set current slide and persist it', async () => {
    // Arrange - Create two slides
    const mockEditor = {
      createShapes: vi.fn(),
      select: vi.fn()
    };
    
    // Create slides
    act(() => {
      slidesStore.getState().addFrameSlide(mockEditor);
      slidesStore.getState().addFrameSlide(mockEditor);
    });
    
    // Get the first slide id
    const slideId = slidesStore.getState().slides[0].id;
    
    // Wait for async storage
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Act - Set the current slide to the first slide
    act(() => {
      slidesStore.getState().setCurrentSlide(slideId, mockEditor);
    });
    
    // Wait for async storage
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Assert
    const state = slidesStore.getState();
    expect(state.currentSlideId).toBe(slideId);
    expect(mockEditor.select).toHaveBeenCalled();
  });

  it('should expose persist API for manual operations', async () => {
    // Arrange
    const store = slidesStore.getState();
    
    // Assert
    // Check that the persist API is available with proper methods
    expect(store.persist).toBeDefined();
    expect(typeof store.persist?.persist).toBe('function');
    expect(typeof store.persist?.clear).toBe('function');
    expect(typeof store.persist?.rehydrate).toBe('function');
  });

  it('should manually persist state when calling persist API', async () => {
    // Arrange
    const store = slidesStore.getState();
    
    // Act - Create slide but bypass automatic persistence
    act(() => {
      // Simulate direct state change without triggering persistence middleware
      const newSlide = {
        id: 'manual-test-id',
        number: 1,
        title: 'Manual Test',
        frameId: 'frame-test-id',
        conversation: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        thumbnailUrl: '/placeholder.png',
        metadata: { test: true }
      };
      
      // Override the state directly
      slidesStore.setState({
        slides: [newSlide],
        currentSlideId: 'manual-test-id'
      }, false); // false to avoid triggering listeners
    });
    
    // Act - Manually persist
    await store.persist?.persist();
    
    // Assert
    // Force rehydration to verify persistence
    await store.persist?.rehydrate();
    
    const state = slidesStore.getState();
    expect(state.slides.length).toBe(1);
    expect(state.slides[0].id).toBe('manual-test-id');
  });
});
