/**
 * History system type definitions for multi-origin undo/redo
 * 
 * This module defines the core types for tracking and managing
 * history entries with origin-based categorization.
 */

import type { StoreApi, type UseBoundStore } from 'zustand';

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
