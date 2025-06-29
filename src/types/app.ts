/**
 * Core application types for the hybrid canvas project
 */
import type { TLShapeId } from 'tldraw';

export interface SlideData {
  number: number;
  frameId: TLShapeId;
  conversation: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  id?: string;
  title?: string;
}

export interface UseSlideOrchestrationReturn {
  slides: SlideData[];
  currentSlide: number;
  totalSlides: number;
  showSlideNavigator: boolean;
  draggedSlide: number | null;
  dragOverSlide: number | null;
  updateSlides: (updater: (prev: SlideData[]) => SlideData[]) => void;
  getCurrentSlide: () => SlideData | undefined;
  addNewSlide: (editor: unknown) => void;
  deleteSlide: (slideNumber: number, editor: unknown) => void;
  jumpToSlide: (slideNumber: number, editor: unknown) => void;
  navigateSlide: (direction: 'prev' | 'next', editor: unknown) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  setShowSlideNavigator: (show: boolean) => void;
  setDraggedSlide: (slide: number | null) => void;
  setDragOverSlide: (slide: number | null) => void;
}
