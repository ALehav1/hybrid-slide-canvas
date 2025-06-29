/**
 * useSlideOrchestration Hook
 * Manages slide navigation, creation, and reordering
 */

import { useState, useCallback } from 'react';
import { Editor, createShapeId } from '@tldraw/tldraw';
import { logger } from '../lib/utils/logging';
import type { SlideData } from '../types/app';

/**
 * Interface for slide orchestration return values
 */
export interface UseSlideOrchestrationReturn {
  slides: SlideData[];
  currentSlide: number;
  totalSlides: number;
  showSlideNavigator: boolean;
  draggedSlide: number | null;
  dragOverSlide: number | null;
  
  // Actions
  setCurrentSlide: (slideNumber: number) => void;
  setShowSlideNavigator: (show: boolean) => void;
  addNewSlide: (editor: Editor | null) => void;
  deleteSlide: (slideNumber: number, editor: Editor | null) => void;
  jumpToSlide: (slideNumber: number, editor: Editor | null) => void;
  navigateSlide: (direction: 'prev' | 'next', editor: Editor | null) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  getCurrentSlide: () => SlideData | undefined;
  updateSlides: (updater: (prev: SlideData[]) => SlideData[]) => void;
  
  // Drag and drop handlers
  handleDragStart: (e: React.DragEvent, slideNumber: number) => void;
  handleDragOver: (e: React.DragEvent, slideNumber: number) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, targetSlideNumber: number) => void;
  handleDragEnd: () => void;
}

/**
 * Custom hook for managing slide orchestration
 */
export function useSlideOrchestration(): UseSlideOrchestrationReturn {
  // State for slides and navigation
  const [slides, setSlides] = useState<SlideData[]>([
    {
      number: 1,
      frameId: createShapeId('frame_1'),
      conversation: [],
      createdAt: new Date()
    }
  ]);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(1);
  const [showSlideNavigator, setShowSlideNavigator] = useState(false);
  
  // Drag and drop state
  const [draggedSlide, setDraggedSlide] = useState<number | null>(null);
  const [dragOverSlide, setDragOverSlide] = useState<number | null>(null);
  
  /**
   * Update slides state (needed for conversation updates)
   */
  const updateSlides = useCallback((updater: (prev: SlideData[]) => SlideData[]) => {
    setSlides(updater);
  }, []);

  /**
   * Get current slide data
   */
  const getCurrentSlide = useCallback((): SlideData | undefined => {
    return slides.find(slide => slide.number === currentSlide);
  }, [slides, currentSlide]);

  /**
   * Add a new slide
   */
  const addNewSlide = useCallback((editor: Editor | null) => {
    const newSlideNumber = slides.length + 1;
    const frameId = createShapeId(`frame_${newSlideNumber}`);
    
    logger.info('Adding new slide', { slideNumber: newSlideNumber });
    
    const newSlide: SlideData = {
      number: newSlideNumber,
      frameId,
      conversation: [],
      createdAt: new Date()
    };
    
    setSlides(prev => [...prev, newSlide]);
    setTotalSlides(newSlideNumber);
    
    // Create frame shape in editor if available
    if (editor) {
      const frameShape = {
        id: frameId,
        type: 'frame' as const,
        x: 100 + (newSlideNumber - 1) * 50,
        y: 100 + (newSlideNumber - 1) * 50,
        props: {
          w: 800,
          h: 600,
          name: `Slide ${newSlideNumber}`
        }
      };
      
      editor.createShape(frameShape);
      
      // Navigate to new slide
      setTimeout(() => {
        setCurrentSlide(newSlideNumber);
        editor.zoomToBounds(
          editor.getViewportPageBounds(),
          { 
            targetZoom: 1,
            animation: { duration: 300 } 
          }
        );
      }, 100);
    } else {
      setCurrentSlide(newSlideNumber);
    }
  }, [slides]);

  /**
   * Delete a slide
   */
  const deleteSlide = useCallback((slideNumber: number, editor: Editor | null) => {
    if (slides.length <= 1) {
      logger.warn('Cannot delete the last slide');
      return;
    }
    
    logger.info('Deleting slide', { slideNumber });
    
    const slideToDelete = slides.find(s => s.number === slideNumber);
    if (!slideToDelete) return;
    
    // Remove frame and associated shapes from editor
    if (editor && slideToDelete.frameId) {
      const frameShape = editor.getShape(slideToDelete.frameId);
      if (frameShape) {
        const shapesToDelete = editor.getSortedChildIdsForParent(frameShape.id);
        editor.deleteShapes([frameShape.id, ...shapesToDelete]);
      }
    }
    
    // Update slides array and renumber
    const newSlides = slides
      .filter(s => s.number !== slideNumber)
      .map((slide, index) => ({
        ...slide,
        number: index + 1
      }));
    
    setSlides(newSlides);
    setTotalSlides(newSlides.length);
    
    // Adjust current slide if needed
    if (currentSlide === slideNumber) {
      setCurrentSlide(Math.max(1, slideNumber - 1));
    } else if (currentSlide > slideNumber) {
      setCurrentSlide(currentSlide - 1);
    }
  }, [slides, currentSlide]);

  /**
   * Jump to a specific slide
   */
  const jumpToSlide = useCallback((slideNumber: number, editor: Editor | null) => {
    const targetSlide = slides.find(s => s.number === slideNumber);
    if (!targetSlide) {
      logger.warn('Slide not found', { slideNumber });
      return;
    }
    
    logger.debug('Jumping to slide', { 
      from: currentSlide, 
      to: slideNumber 
    });
    
    setCurrentSlide(slideNumber);
    
    // Focus on slide frame in editor
    if (editor && targetSlide.frameId) {
      const frameShape = editor.getShape(targetSlide.frameId);
      if (frameShape && 'x' in frameShape && 'y' in frameShape && 'props' in frameShape) {
        editor.zoomToBounds(
          editor.getViewportPageBounds(),
          { 
            targetZoom: 1,
            animation: { duration: 300 } 
          }
        );
      }
    }
  }, [slides, currentSlide]);

  /**
   * Navigate between slides
   */
  const navigateSlide = useCallback((direction: 'prev' | 'next', editor: Editor | null) => {
    const targetSlide = direction === 'prev' 
      ? Math.max(1, currentSlide - 1)
      : Math.min(totalSlides, currentSlide + 1);
    
    if (targetSlide !== currentSlide) {
      jumpToSlide(targetSlide, editor);
    }
  }, [currentSlide, totalSlides, jumpToSlide]);

  /**
   * Reorder slides (for drag and drop)
   */
  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    logger.info('Reordering slides', { from: fromIndex, to: toIndex });
    
    const newSlides = [...slides];
    const [movedSlide] = newSlides.splice(fromIndex - 1, 1);
    newSlides.splice(toIndex - 1, 0, movedSlide);
    
    // Renumber slides
    const renumberedSlides = newSlides.map((slide, index) => ({
      ...slide,
      number: index + 1
    }));
    
    setSlides(renumberedSlides);
    
    // Update current slide number if it changed
    const newCurrentSlideIndex = renumberedSlides.findIndex(
      s => s.frameId === getCurrentSlide()?.frameId
    );
    if (newCurrentSlideIndex !== -1) {
      setCurrentSlide(newCurrentSlideIndex + 1);
    }
  }, [slides, getCurrentSlide]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, slideNumber: number) => {
    setDraggedSlide(slideNumber);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', slideNumber.toString());
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, slideNumber: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlide(slideNumber);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverSlide(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSlideNumber: number) => {
    e.preventDefault();
    
    if (draggedSlide !== null && draggedSlide !== targetSlideNumber) {
      reorderSlides(draggedSlide, targetSlideNumber);
    }
    
    setDragOverSlide(null);
    setDraggedSlide(null);
  }, [draggedSlide, reorderSlides]);

  const handleDragEnd = useCallback(() => {
    setDraggedSlide(null);
    setDragOverSlide(null);
  }, []);

  return {
    slides,
    currentSlide,
    totalSlides,
    showSlideNavigator,
    draggedSlide,
    dragOverSlide,
    
    setCurrentSlide,
    setShowSlideNavigator,
    addNewSlide,
    deleteSlide,
    jumpToSlide,
    navigateSlide,
    reorderSlides,
    getCurrentSlide,
    updateSlides,
    
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  };
}
