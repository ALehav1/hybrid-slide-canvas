// src/lib/types.ts
// A single, centralized file for all custom TypeScript type definitions.

/**
 * History system type definitions for multi-origin undo/redo
 * 
 * This module defines the core types for tracking and managing
 * history entries with origin-based categorization.
 */

import type { Editor, TLStoreSnapshot, TLShapeId } from '@tldraw/tldraw';
import type { StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { z } from 'zod';

/**
 * Origin types for tracking the source of changes
 * - 'user': Direct user interactions (drawing, moving, etc.)
 * - 'ai': AI-generated content (shapes, diagrams, etc.)
 * - 'template': Template-based insertions
 */
export type HistoryOrigin = 'user' | 'ai' | 'template';

/**
 * Single history entry representing a change operation
 * Each entry captures the state before and after a change
 */
export interface HistoryEntry {
  /** Unique identifier for this history entry */
  id: string;
  
  /** Origin/source of this change */
  origin: HistoryOrigin;
  
  /** Human-readable description of the change */
  description: string;
  
  /** Timestamp when the change occurred */
  timestamp: Date;
  
  /** 
   * Function to undo this change
   * Should restore the state to before this change
   */
  undo: () => void;
  
  /** 
   * Function to redo this change
   * Should reapply the change after it was undone
   */
  redo: () => void;
  
  /** 
   * Optional metadata for debugging and analysis
   * Can include shape IDs, coordinates, etc.
   */
  metadata?: Record<string, unknown>;
}

/**
 * History state interface for the Zustand store
 * Manages the complete history stack and current position
 */
export interface HistoryState {
  /** Array of all history entries (chronological order) */
  entries: HistoryEntry[];
  
  /** Current position in the history stack (-1 means no entries) */
  currentIndex: number;
  
  /** Maximum number of entries to retain (for memory management) */
  maxEntries: number;
  
  /** Whether history tracking is currently enabled */
  isEnabled: boolean;
  
  /** Statistics for debugging and performance monitoring */
  stats: {
    totalEntries: number;
    undoCount: number;
    redoCount: number;
    lastActionTime: Date | null;
  };
}

/**
 * Actions available in the history manager.
 * These are the methods exposed by the Zustand store.
 */
export interface HistoryActions {
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: (origin?: HistoryOrigin) => boolean;
  redo: (origin?: HistoryOrigin) => boolean;
  canUndo: (origin?: HistoryOrigin) => boolean;
  canRedo: (origin?: HistoryOrigin) => boolean;
  clear: () => void;
  clearByOrigin: (origin: HistoryOrigin) => void;
  setEnabled: (enabled: boolean) => void;
  getEntriesByOrigin: (origin: HistoryOrigin) => HistoryEntry[];
  getRecentEntries: (count?: number) => HistoryEntry[];
}

/**
 * The complete state and actions of the history store.
 */
export type HistoryStoreState = HistoryState & HistoryActions;

/**
 * The HistoryStore hook type, including Zustand's methods.
 * This is the type for the object returned by `create()`.
 */
export type HistoryStore = UseBoundStore<StoreApi<HistoryStoreState>>;

/**
 * Configuration options for the history manager
 */
export interface HistoryManagerConfig {
  /** Maximum entries to retain (default: 100) */
  maxEntries?: number;
  
  /** Whether to start with history enabled (default: true) */
  initialEnabled?: boolean;
  
  /** Debounce delay for batching rapid changes (default: 100ms) */
  debounceMs?: number;
  
  /** Whether to include metadata in entries (default: true) */
  includeMetadata?: boolean;
}

/**
 * Batch operation interface for grouping multiple changes
 * Allows treating multiple operations as a single undoable unit
 */
export interface HistoryBatch {
  /** Unique identifier for this batch */
  id: string;
  
  /** Origin of all changes in this batch */
  origin: HistoryOrigin;
  
  /** Description of the batch operation */
  description: string;
  
  /** Array of individual changes in this batch */
  changes: {
    undo: () => void;
    redo: () => void;
    metadata?: Record<string, unknown>;
  }[];
}

/**
 * Type definitions for store middleware
 * 
 * This module provides type definitions and helper types for enhancing 
 * Zustand stores with middleware while maintaining full type safety.
 * 
 * @module middleware/types
 */

/**
 * Simplified type for a store that may have persistence middleware
 * 
 * @template T - State type for the store
 */
export type PersistableStore<T> = StateCreator<T>;

/**
 * Simplified type for a store with IndexedDB persistence 
 * 
 * @template T - State type for the store
 */
export type IndexedDbStore<T> = StateCreator<T>;

/**
 * Type helper for creating a store with freeze state middleware
 * 
 * @template T - State type for the store
 */
export type FreezableStore<T> = StateCreator<T>;

/**
 * Type helper for creating a store with multiple middleware layers
 * Provides better type inference than using multiple `as unknown as` casts
 * 
 * @template T - State type for the store
 */
export type MiddlewareEnhancedStore<T> = StateCreator<T>;

/**
 * Represents a single item in a shape library that can be added to the canvas.
 */
export interface LibraryItem {
  /** A unique identifier for the library item (e.g., 'lib-rect-node'). */
  id: string;
  /** The display name of the item (e.g., 'Rectangle Node'). */
  name: string;
  /** The path to the preview image for the library item. */
  preview: string;
  /** A factory function that creates the shape on the canvas when the item is selected. */
  factory: (editor: Editor | undefined) => Promise<void>;
}

/** A complete tldraw snapshot for a slide */
export type SlideSnapshot = TLStoreSnapshot

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
 * The canonical, unified data interface for a single slide.
 * This is the source of truth for the slide structure across all stores and components.
 *
 * @template M The type of metadata stored with the slide
 * Note: Date fields will be serialized to strings when persisted and must be
 * hydrated back to Date objects when loaded from storage.
 */
export interface SlideData<M extends Record<string, unknown> = Record<string, unknown>> {
  id: string
  number: number
  title: string
  /** The key we look up in the `snapshots` dictionary in the store. */
  snapshotId: string
  /** The ID of the tldraw frame shape corresponding to this slide. */
  frameId: string | null
  /** The conversation history associated with the slide. */
  conversation: ConversationMessage[]
  createdAt: Date
  updatedAt: Date
  thumbnailUrl?: string
  metadata?: M
}

/**
 * Zod schema for validating SlideData.
 * This ensures data integrity when creating or updating slides.
 * Memoized as a constant to improve validation performance.
 */
export const SlideDataSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().nonnegative(),
  title: z.string().min(1, 'Slide title cannot be empty'),
  snapshotId: z.string().min(1),
  // A simple check for TLShapeId format. This is not exhaustive but good enough for runtime validation.
  frameId: z.custom<TLShapeId>((val) => typeof val === 'string' && val.startsWith('shape:'), {
    message: 'Invalid frameId format',
  }),
  conversation: z.array(ConversationMessageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  thumbnailUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
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
export type TLDEditor = Pick<Editor, 'createShapes' | 'deleteShapes' | 'select' | 'zoomToFit'>;

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

