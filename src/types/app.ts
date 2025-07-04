/**
 * Core application types for the Hybrid Slide Canvas project
 * Enhanced with stricter type definitions for better type safety
 */
import type { Editor, TLStoreSnapshot, TLRecord } from '@tldraw/tldraw'

/** A complete tldraw snapshot for a slide */
export type SlideSnapshot = TLStoreSnapshot
import { z } from 'zod';

/* ---------- Constants ---------- */
/**
 * Message role constants - explicitly defining allowed roles
 * Using const object instead of enum for better compatibility
 */
export const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
} as const;

/**
 * Message role type - derived from the MessageRole constant
 */
export type MessageRole = typeof MessageRole[keyof typeof MessageRole];

/* ---------- Conversation ---------- */
/**
 * Message structure for slide conversations
 */
export interface ConversationMessage {
  id: string; // Required unique identifier
  role: MessageRole;
  content: string;
  timestamp: Date;
}

/**
 * Zod schema for validating ConversationMessage
 * Using nativeEnum for better performance
 */
export const ConversationMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant'] as const),
  content: z.string().min(1, 'Message content cannot be empty'),
  timestamp: z.date()
});

/* ---------- Slides ---------- */
/**
 * Slide data interface with improved type definitions
 * @template M The type of metadata stored with the slide
 * Note: Date fields will be serialized to strings when persisted and must be
 * hydrated back to Date objects when loaded from storage
 */
export interface SlideData<M extends Record<string, unknown> = Record<string, unknown>> {
  id: string
  number: number
  title: string
  /** The key we look up in the `snapshots` dictionary in the store. */
  snapshotId: string
  /** The ID of the tldraw frame shape corresponding to this slide. */
  frameId: string
  /** The conversation history associated with the slide. */
  conversation: ConversationMessage[]
  createdAt: Date
  updatedAt: Date
  thumbnailUrl?: string
  metadata?: M
}

/**
 * Zod schema for validating SlideData
 * Memoized as a constant to improve validation performance
 */
export const SlideDataSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().nonnegative(),
  title: z.string().min(1, 'Slide title cannot be empty'),
  snapshotId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  thumbnailUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional()
});

/* ---------- Helpers ---------- */
/**
 * Type for creating a new slide with default values
 * Preserves generic metadata type from SlideData
 */
export type CreateSlideOptions<M extends Record<string, unknown> = Record<string, unknown>> = 
  Pick<SlideData<M>, 'number' | 'snapshotId'> & 
  Partial<Omit<SlideData<M>, 'number' | 'snapshotId' | 'createdAt' | 'updatedAt'>>;

/**
 * Direction type for slide navigation
 */
export type NavigationDirection = 'prev' | 'next';

/**
 * Editor interface that proxies TLDraw's Editor capabilities
 * Use actual Editor type from @tldraw/tldraw for full type safety
 */
export interface TLDEditor extends Pick<Editor, 'createShapes' | 'deleteShapes' | 'select' | 'zoomToFit'> {
  // Any additional project-specific editor methods would be defined here
}

/**
 * Interface for the slide orchestration hook return value
 * Note: Preserves generic metadata type from SlideData
 */
/**
 * Interface for the slides state data
 */
export interface SlidesStateData {
  slides: SlideData[];
  currentSlideId: string;
}

export interface UseSlideOrchestrationReturn<M extends Record<string, unknown> = Record<string, unknown>> {
  // State
  slides: SlideData<M>[];
  currentSlide: number;
  totalSlides: number;
  showSlideNavigator: boolean;
  draggedSlide: number | null;
  dragOverSlide: number | null;
  
  // Actions
  updateSlides: (updater: (prev: SlideData<M>[]) => SlideData<M>[]) => void;
  getCurrentSlide: () => SlideData<M> | undefined;
  addNewSlide: (editor: TLDEditor) => Promise<SlideData<M>>;
  deleteSlide: (slideNumber: number, editor: TLDEditor) => Promise<void>;
  jumpToSlide: (slideNumber: number, editor: TLDEditor) => Promise<void>;
  navigateSlide: (direction: NavigationDirection, editor: TLDEditor) => Promise<void>;
  reorderSlides: (fromIndex: number, toIndex: number) => Promise<void>;
  setShowSlideNavigator: (show: boolean) => void;
  setDraggedSlide: (slide: number | null) => void;
  setDragOverSlide: (slide: number | null) => void;
}
