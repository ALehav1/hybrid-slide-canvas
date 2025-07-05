/**
 * Legacy Adapter for History Manager Migration
 * 
 * This adapter bridges the new bookmark-based StackEntry model with the legacy
 * HistoryEntry interface that existing tests expect. This allows us to migrate
 * the store architecture incrementally while keeping all tests green.
 * 
 * TEMPORARY: This adapter will be removed once migration is complete.
 */

import { Editor } from '@tldraw/tldraw'
import type { StackEntry, HistoryOrigin } from './historyStore'

/**
 * Legacy interface that existing tests expect.
 * Contains undo/redo functions that are called directly.
 */
export interface HistoryEntryLegacy {
  id: string
  origin: HistoryOrigin
  undo: () => void
  redo: () => void
  // Optional properties that some tests might expect
  description?: string
  timestamp?: number
}

/**
 * Convert a new lightweight StackEntry to the legacy format.
 * The undo/redo functions use tldraw's bailToMark system.
 */
export function toLegacy(entry: StackEntry, editor: Editor): HistoryEntryLegacy {
  return {
    id: entry.id,
    origin: entry.origin,
    description: entry.description,
    timestamp: entry.ts,
    undo: () => {
      // Use tldraw's native bailToMark for undo
      editor.bailToMark(entry.markId)
    },
    redo: () => {
      // For redo, we use tldraw's native redo
      // TODO: In the future we may store forward marks for more precise redo
      editor.redo()
    }
  }
}

/**
 * Helper to convert multiple StackEntries to legacy format.
 * Useful for maintaining the legacy entries[] array.
 */
export function toLegacyArray(entries: StackEntry[], editor: Editor): HistoryEntryLegacy[] {
  return entries.map(entry => toLegacy(entry, editor))
}
