/**
 * @file Unit tests for the slidesStore.
 * This test suite validates the state management logic for slides, including adding, deleting,
 * reordering, and navigating slides, ensuring that the store correctly interacts with a
 * mocked tldraw editor instance.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { useSlidesStore } from './slidesStore';
import { mockEditor } from '../__tests__/test-utils/mocks/tldraw';
import { act } from '@testing-library/react';
import { type TLShape, type Box } from '@tldraw/tldraw';

// Use fake timers to control setTimeout
vi.useFakeTimers();

// Reset the store and mocks before each test
beforeEach(() => {
  act(() => {
    useSlidesStore.getState().reset();
  });
  vi.clearAllMocks();

  // Setup default mock return values for editor functions
  (mockEditor.getShape as Mock).mockImplementation((shapeId: string) => ({ id: shapeId, type: 'frame' } as TLShape));
  (mockEditor.getShapePageBounds as Mock).mockReturnValue({ x: 0, y: 0, w: 800, h: 600 } as Box);
});

describe('useSlidesStore', () => {
  it('should add a new frame slide and zoom to it', () => {
    act(() => {
      useSlidesStore.getState().addFrameSlide(mockEditor);
    });

    const { slides, currentSlideId } = useSlidesStore.getState();
    expect(slides).toHaveLength(2);
    expect(slides[1].title).toBe('Slide 2');
    expect(currentSlideId).toBe(slides[1].id);

    expect(mockEditor.createShapes).toHaveBeenCalledTimes(1);

    // Fast-forward timers to trigger the zoom
    act(() => {
      vi.runAllTimers();
    });

    expect(mockEditor.getShape).toHaveBeenCalledTimes(1);
    expect(mockEditor.getShapePageBounds).toHaveBeenCalledTimes(1);
    expect(mockEditor.zoomToBounds).toHaveBeenCalledTimes(1);
  });

  it('should delete a slide and update the current slide', () => {
    act(() => {
      useSlidesStore.getState().addFrameSlide(mockEditor);
    });

    const slideToDelete = useSlidesStore.getState().slides[1];

    act(() => {
      useSlidesStore.getState().deleteSlide(slideToDelete.id, mockEditor);
    });

    const { slides, currentSlideId } = useSlidesStore.getState();
    expect(slides).toHaveLength(1);
    expect(slides.find((s) => s.id === slideToDelete.id)).toBeUndefined();
    expect(currentSlideId).toBe('slide-1');

    expect(mockEditor.deleteShapes).toHaveBeenCalledTimes(1);
    expect(mockEditor.deleteShapes).toHaveBeenCalledWith([slideToDelete.frameId]);
  });

  it('should not delete the last remaining slide', () => {
    const initialSlideId = useSlidesStore.getState().slides[0].id;
    act(() => {
      useSlidesStore.getState().deleteSlide(initialSlideId, mockEditor);
    });

    expect(useSlidesStore.getState().slides).toHaveLength(1);
    expect(mockEditor.deleteShapes).not.toHaveBeenCalled();
  });

  it('should set the current slide and zoom to it', () => {
    act(() => {
      useSlidesStore.getState().addFrameSlide(mockEditor);
    });
    act(() => {
      vi.runAllTimers(); // Complete the zoom from adding the slide
    });

    const slideToSelect = useSlidesStore.getState().slides[1];
    const mockBounds = { x: 10, y: 10, w: 200, h: 200 };
    (mockEditor.getShapePageBounds as Mock).mockReturnValue(mockBounds);

    act(() => {
      useSlidesStore.getState().setCurrentSlide(slideToSelect.id, mockEditor);
    });

    expect(useSlidesStore.getState().currentSlideId).toBe(slideToSelect.id);

    expect(mockEditor.zoomToBounds).toHaveBeenCalledTimes(3); // 2 for add, 1 for set
    expect(mockEditor.zoomToBounds).toHaveBeenLastCalledWith(mockBounds, expect.any(Object));
  });

  it('should reorder slides correctly', () => {
    act(() => {
      useSlidesStore.getState().addFrameSlide(mockEditor);
      useSlidesStore.getState().addFrameSlide(mockEditor);
    });

    const originalSlides = useSlidesStore.getState().slides;
    const fromId = originalSlides[0].id; // slide-1
    const toId = originalSlides[2].id;   // slide-3

    act(() => {
      useSlidesStore.getState().reorderSlides(fromId, toId);
    });

    const reorderedSlides = useSlidesStore.getState().slides;
    expect(reorderedSlides.map(s => s.id)).toEqual([originalSlides[1].id, originalSlides[2].id, originalSlides[0].id]);
  });
});
