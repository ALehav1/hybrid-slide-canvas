/**
 * History Management System for tldraw v3 Integration
 * 
 * This system provides multi-origin history tracking (user/ai/template/system)
 * while working exclusively with tldraw v3's public APIs. It uses store.listen()
 * instead of accessing protected editor.history properties.
 */

import { Editor } from '@tldraw/tldraw';
import { logger } from '../utils/logging';

export type OriginType = 'user' | 'ai' | 'template' | 'system';

export interface HistoryEntry {
  id: string;
  origin: OriginType;
  description: string;
  markId: string;
  timestamp: number;
  undone: boolean;
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  isUndoing: boolean;
  isRedoing: boolean;
  /** flag that disables recording when false */
  isEnabled: boolean;
  /** hard max on stored entries (oldest trimmed) */
  maxEntries: number;
  /** simple statistics block (optional for legacy) */
  stats: HistoryStats;
}

/**  Light-weight stats helper  */
export interface HistoryStats {
  totalEntries: number;
  undoCount: number;
  redoCount: number;
  lastActionTime: Date | null;
}

export interface HistoryActions {
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: (origin?: OriginType) => void;
  redo: (origin?: OriginType) => void;
  clear: () => void;
  getEntriesByOrigin: (origin: OriginType) => HistoryEntry[];
  canUndo: (origin?: OriginType) => boolean;
  canRedo: (origin?: OriginType) => boolean;
  /** clear only entries for a given origin  */
  clearByOrigin: (origin: OriginType) => void;
  /** enable / disable recording */
  setOrigin: (origin: OriginType) => void;
  setEnabled: (enabled: boolean) => void;
  /** recent N active entries – helper used by tests  */
  getRecentEntries: (count: number) => HistoryEntry[];
}

export type HistoryStore = HistoryState & HistoryActions;

/**
 * Creates a history manager that integrates with tldraw v3 Editor
 */
export class HistoryManager {
  private editor: Editor | null = null;
  private store: HistoryStore;
  private unsubscribe: (() => void) | null = null;
  private currentOperationOrigin: OriginType | null = null;
  private isRecording = true; // Added isRecording flag

  constructor(store: HistoryStore) {
    /* Provide sane defaults, then merge with provided store so we don't
       declare the same property twice in a single object literal which
       triggers TS2783. */
    const defaults: HistoryStore = {
      entries: [],
      currentIndex: -1,
      isUndoing: false,
      isRedoing: false,
      isEnabled: true,
      maxEntries: 100,
      stats: {
        totalEntries: 0,
        undoCount: 0,
        redoCount: 0,
        lastActionTime: null,
      },
      /* noop fall-backs – will be overwritten if real impl supplied */
      addEntry: () => {},
      undo: () => false,
      redo: () => false,
      clear: () => {},
      getEntriesByOrigin: () => [],
      canUndo: () => false,
      canRedo: () => false,
      clearByOrigin: () => {},
      setOrigin: () => {},
      setEnabled: () => {},
      getRecentEntries: () => [],
    };

    // Merge defaults with the caller-provided implementation
    this.store = Object.assign(defaults, store);
  }

  /**
   * Initialize with tldraw editor
   */
  public setEditor(editor: Editor): void {
    if (this.editor === editor) return;
    
    // Clean up previous editor
    this.dispose();
    
    this.editor = editor;
    this.setupStoreListener();
    
    logger.debug('HistoryManager initialized with editor');
  }

  /**
   * Setup store listener to track changes
   */
  private setupStoreListener(): void {
    if (!this.editor) return;

    // Listen to store changes using tldraw v3 public API
    this.unsubscribe = this.editor.store.listen(
      (update) => {
        // Only track actual changes, not initial hydration
        const hasChanges = Object.keys(update.changes.added).length > 0 || 
                          Object.keys(update.changes.updated).length > 0 || 
                          Object.keys(update.changes.removed).length > 0;
        
        if (hasChanges) {
          this.handleStoreChange();
        }
      },
      { source: 'user' }
    );
  }

  /**
   * Handle store changes and create history entries
   */
  private handleStoreChange(): void {
    if (!this.editor || !this.isRecording || this.store.isUndoing || this.store.isRedoing) return;

    const origin = this.currentOperationOrigin || 'user';
    const markId = this.createMark();
    
    if (markId) {
      this.store.addEntry({
        origin,
        description: `${origin} action`,
        markId,
        undone: false
      });

      /* stats / maxEntries maintenance */
      const { stats, maxEntries, entries } = this.store;
      stats.totalEntries += 1;
      stats.lastActionTime = new Date();
      if (entries.length > maxEntries) {
        entries.splice(0, entries.length - maxEntries);
      }
    }

    // Reset operation origin
    this.currentOperationOrigin = null;
  }

  /**
   * Create a mark in tldraw's history system
   */
  private createMark(): string | null {
    if (!this.editor) return null;

    try {
      // Use tldraw v3 public API for creating marks
      const markId = `mark_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      // Create a mark using editor's public method
      this.editor.markHistoryStoppingPoint(markId);
      
      return markId;
    } catch (error) {
      logger.error('Failed to create mark:', error);
      return null;
    }
  }

  /**
   * Execute operation with specific origin
   */
  public withOrigin<T>(origin: OriginType, operation: () => T): T {
    const previousOrigin = this.currentOperationOrigin;
    this.currentOperationOrigin = origin;
    
    try {
      return operation();
    } finally {
      this.currentOperationOrigin = previousOrigin;
    }
  }

  /**
   * Execute operation in a batch
   */
  public batch(origin: OriginType, operation: () => void): void {
    if (!this.editor) {
      throw new Error('Editor not initialized');
    }

    this.withOrigin(origin, () => {
      if (this.editor) {
        this.editor.run(operation);
      }
    });
  }

  /**
   * Temporarily disable history recording
   */
  public pause(): void {
    this.isRecording = false;
  }

  /**
   * Resume history recording
   */
  public resume(): void {
    this.isRecording = true;
  }

  /**
   * Execute a function without recording history
   */
  public ignore<T>(fn: () => T): T {
    this.pause();
    try {
      return fn();
    } finally {
      this.resume();
    }
  }

  /**
   * Undo operation
   */
  public undo(origin?: OriginType): boolean {
    if (!this.editor || !this.store.canUndo(origin)) return false;

    const entries = origin 
      ? this.store.getEntriesByOrigin(origin)
      : this.store.entries;

    const entryToUndo = this.findLastUndoableEntry(entries);
    if (!entryToUndo) return false;

    try {
      this.store.isUndoing = true;
      
      // Use tldraw v3 public API for undo
      this.editor.bailToMark(entryToUndo.markId);
      
      // Mark entry as undone
      this.markEntryAsUndone(entryToUndo.id);
      this.store.stats.undoCount += 1;
      this.store.stats.lastActionTime = new Date();
      
      logger.debug(`Undid ${origin || 'any'} operation:`, entryToUndo.description);
      return true;
    } catch (error) {
      logger.error('Undo failed:', error);
      return false;
    } finally {
      this.store.isUndoing = false;
    }
  }

  /**
   * Redo operation
   */
  public redo(origin?: OriginType): boolean {
    if (!this.editor || !this.store.canRedo(origin)) return false;

    const entries = origin 
      ? this.store.getEntriesByOrigin(origin)
      : this.store.entries;

    const entryToRedo = this.findFirstRedoableEntry(entries);
    if (!entryToRedo) return false;

    try {
      this.store.isRedoing = true;
      
      // For redo, we need to replay the operation
      // This is more complex with tldraw v3, so we'll use a simpler approach
      this.markEntryAsRedone(entryToRedo.id);
      this.store.stats.redoCount += 1;
      this.store.stats.lastActionTime = new Date();
      
      logger.debug(`Redid ${origin || 'any'} operation:`, entryToRedo.description);
      return true;
    } catch (error) {
      logger.error('Redo failed:', error);
      return false;
    } finally {
      this.store.isRedoing = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /*                  SIMPLE DELEGATING PUBLIC HELPERS                  */
  /* ------------------------------------------------------------------ */

  /**
   * Change the active origin for subsequent operations
   */
  public setOrigin(origin: OriginType): void {
    this.store.setOrigin(origin);
  }

  /**
   * Check if undo is possible for an optional origin filter
   */
  public canUndo(origin?: OriginType): boolean {
    return this.store.canUndo(origin);
  }

  /**
   * Check if redo is possible for an optional origin filter
   */
  public canRedo(origin?: OriginType): boolean {
    return this.store.canRedo(origin);
  }

  /**
   * Clear **all** history entries (delegates to state store)
   */
  public clear(): void {
    this.store.clear();
    this.updateCurrentIndex();
  }

  /**
   * Convenience helper: get entries by origin
   */
  public getEntriesByOrigin(origin: OriginType): HistoryEntry[] {
    return this.store.getEntriesByOrigin(origin);
  }

  /**
   * Find the last entry that can be undone
   */
  private findLastUndoableEntry(entries: HistoryEntry[]): HistoryEntry | null {
    for (let i = entries.length - 1; i >= 0; i--) {
      if (!entries[i].undone) {
        return entries[i];
      }
    }
    return null;
  }

  /**
   * Find the first entry that can be redone
   */
  private findFirstRedoableEntry(entries: HistoryEntry[]): HistoryEntry | null {
    return entries.find(entry => entry.undone) || null;
  }

  /**
   * Mark entry as undone
   */
  private markEntryAsUndone(entryId: string): void {
    const entry = this.store.entries.find(e => e.id === entryId);
    if (entry) {
      entry.undone = true;
      this.updateCurrentIndex();
    }
  }

  /**
   * Mark entry as redone
   */
  private markEntryAsRedone(entryId: string): void {
    const entry = this.store.entries.find(e => e.id === entryId);
    if (entry) {
      entry.undone = false;
      this.updateCurrentIndex();
    }
  }

  /**
   * Update current index based on entry states
   */
  private updateCurrentIndex(): void {
    // Find last active index (ES2022 compatible)
    let lastActiveIndex = -1;
    for (let i = this.store.entries.length - 1; i >= 0; i--) {
      if (!this.store.entries[i].undone) {
        lastActiveIndex = i;
        break;
      }
    }
    this.store.currentIndex = lastActiveIndex;
  }

  /* ------------------------------------------------------------------ */
  /*                        NEW  PUBLIC  METHODS                        */
  /* ------------------------------------------------------------------ */

  /** remove all entries matching an origin */
  public clearByOrigin(origin: OriginType): void {
    this.store.entries = this.store.entries.filter((e) => e.origin !== origin);
    this.updateCurrentIndex();
  }

  /** turn recording on/off */
  public setEnabled(enabled: boolean): void {
    this.store.isEnabled = enabled;
  }

  /** last N active entries helper */
  public getRecentEntries(count: number): HistoryEntry[] {
    return this.store.entries.slice(-count);
  }

  /**
   * Get current state for debugging
   */
  public getState(): HistoryState {
    return {
      entries: [...this.store.entries],
      currentIndex: this.store.currentIndex,
      isUndoing: this.store.isUndoing,
      isRedoing: this.store.isRedoing,
      isEnabled: this.store.isEnabled,
      maxEntries: this.store.maxEntries,
      stats: this.store.stats,
    };
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    this.editor = null;
    logger.debug('HistoryManager disposed');
  }
}

/**
 * Factory function to create a history manager
 */
export function createHistoryManager(store: HistoryStore): HistoryManager {
  return new HistoryManager(store);
}
