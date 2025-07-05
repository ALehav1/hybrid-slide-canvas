/**
 * Multi-Origin History Manager - Migration with Legacy Adapter
 * 
 * This implements the adapter pattern to bridge new bookmark-based architecture
 * with legacy test expectations. The store maintains both:
 * 1. NEW: Per-origin past/future stacks (StackEntry with markId)
 * 2. LEGACY: Flat entries array (HistoryEntryLegacy with undo/redo functions)
 * 
 * The adapter converts between the two formats, allowing incremental migration.
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Editor } from '@tldraw/tldraw'
import { nanoid } from 'nanoid'
import { toLegacy, type HistoryEntryLegacy } from './LegacyAdapter'

export type HistoryOrigin = 'user' | 'ai' | 'template'

/**
 * Lightweight stack entry - only intent metadata, no document state.
 * The markId is all we need; tldraw handles the heavy lifting.
 */
export interface StackEntry {
  id: string            // unique identifier for this entry
  markId: string        // returned by editor.markHistoryStoppingPoint()
  origin: HistoryOrigin // 'user' | 'ai' | 'template'
  ts: number           // timestamp when created
  description?: string  // optional for debugging/display
}

/**
 * Multi-origin history interface - hybrid approach for migration.
 * Supports both new per-origin stacks AND legacy entries array.
 */
export interface MultiOriginHistory {
  // NEW: Per-origin stacks (bookmark-based)
  past: Record<HistoryOrigin, StackEntry[]>
  future: Record<HistoryOrigin, StackEntry[]>
  
  // LEGACY: Flat entries array for backward compatibility
  entries: HistoryEntryLegacy[]  // Generated via adapter
  currentIndex: number          // Points to current position in entries
  
  enabled: boolean
  isEnabled: boolean            // Legacy alias for enabled
  maxEntries: number           // Maximum entries to store
  
  // Internal: Editor reference for adapter
  _editor?: Editor
  
  // Core operations (new API)
  add: (markId: string, origin: HistoryOrigin, description?: string) => void
  undo: (origin?: HistoryOrigin) => boolean  // undefined = 'all'
  redo: (origin?: HistoryOrigin) => boolean
  clear: (origin?: HistoryOrigin) => void
  
  // LEGACY: Support old API for existing tests
  addEntry: (entry: { id: string; origin: HistoryOrigin; undo: () => void; redo: () => void }) => void
  
  // Editor management
  setEditor: (editor: Editor) => void
  
  // Utility methods for UI and tests
  canUndo: (origin?: HistoryOrigin) => boolean
  canRedo: (origin?: HistoryOrigin) => boolean
  setEnabled: (enabled: boolean) => void
  
  // Statistics and debugging
  stats: {
    totalActions: number
    undoCount: number
    redoCount: number
    failedUndos: number  // diagnostic counter for error tracking
    lastActionTime?: Date
  }
  
  // Test/debug helpers
  getEntriesByOrigin: (origin: HistoryOrigin) => StackEntry[]
  getRecentEntries: (limit?: number) => StackEntry[]
  clearByOrigin: (origin: HistoryOrigin) => void
}

/**
 * Create the multi-origin history store with adapter support.
 * This is the micro-store that tracks intent, not document state.
 */
export const createMultiOriginHistory = () =>
  create<MultiOriginHistory>()(
    immer((set, get) => {
      
      // Helper function to regenerate legacy entries array
      const updateLegacyEntries = (state: any) => {
        if (!state._editor) return
        
        // Collect all entries from all stacks in chronological order  
        const allEntries: StackEntry[] = []
        for (const origin of ['user', 'ai', 'template'] as HistoryOrigin[]) {
          allEntries.push(...(state.past[origin] || []))
        }
        
        // Sort by timestamp
        allEntries.sort((a, b) => a.ts - b.ts)
        
        // Convert to legacy format using adapter
        if (state._editor) {
          // Cast the editor to avoid Immer draft type issues
          const editor = state._editor as unknown as Editor
          state.entries = allEntries.map(entry => toLegacy(entry, editor))
          state.currentIndex = state.entries.length - 1
        }
      }
      
      return {
        // NEW: Per-origin stacks (empty by default)
        past: {
          user: [] as StackEntry[],
          ai: [] as StackEntry[],
          template: [] as StackEntry[]
        },
        future: {
          user: [] as StackEntry[],
          ai: [] as StackEntry[],
          template: [] as StackEntry[]
        },
        
        // LEGACY: Generated via adapter
        entries: [] as HistoryEntryLegacy[],
        currentIndex: -1,
        
        enabled: true,
        isEnabled: true,              // Legacy alias for enabled
        maxEntries: 100,             // Default maximum entries
        _editor: undefined as Editor | undefined,
        
        stats: {
          totalActions: 0,
          undoCount: 0,
          redoCount: 0,
          failedUndos: 0,
          lastActionTime: undefined as Date | undefined
        },

        // Editor management
        setEditor: (editor: Editor) => {
          set(state => {
            // Cast to avoid Immer WritableDraft readonly conflicts
            (state as any)._editor = editor
            updateLegacyEntries(state)
          })
        },

        // NEW API: Add bookmark-based entry
        add: (markId: string, origin: HistoryOrigin, description?: string) => {
          set(state => {
            if (!state.enabled) return
            
            // Clear future when adding new entry
            state.future[origin] = []
            
            // Create new entry
            const entry: StackEntry = {
              id: nanoid(8),
              markId,
              origin,
              ts: Date.now(),
              description
            }
            
            // Add to past stack
            state.past[origin].push(entry)
            
            // Update stats
            state.stats.totalActions++
            state.stats.lastActionTime = new Date()
            
            // Regenerate legacy entries
            updateLegacyEntries(state)
          })
        },

        // LEGACY API: Support old tests
        addEntry: (entry: { id: string; origin: HistoryOrigin; undo: () => void; redo: () => void }) => {
          set(state => {
            if (!state.enabled) return
            
            // Convert legacy entry to new format (fake markId for now)
            const stackEntry: StackEntry = {
              id: entry.id,
              markId: `legacy-${entry.id}`,
              origin: entry.origin,
              ts: Date.now()
            }
            
            // Clear future when adding new entry
            state.future[entry.origin] = []
            
            // Add to past stack
            state.past[entry.origin].push(stackEntry)
            
            // Add to legacy entries directly (for backward compatibility)
            const legacyEntry: HistoryEntryLegacy = {
              id: entry.id,
              origin: entry.origin,
              undo: entry.undo,
              redo: entry.redo,
              timestamp: Date.now()
            }
            
            state.entries.push(legacyEntry)
            state.currentIndex = state.entries.length - 1
            
            // Update stats
            state.stats.totalActions++
            state.stats.lastActionTime = new Date()
          })
        },

        // Undo operation
        undo: (origin?: HistoryOrigin): boolean => {
          const state = get()
          if (!state.enabled || !state._editor) {
            set(s => { s.stats.failedUndos++ })
            return false
          }

          let target: StackEntry | undefined
          
          if (!origin) {
            // Find most recent entry across all origins
            const allPast: StackEntry[] = []
            for (const orig of ['user', 'ai', 'template'] as HistoryOrigin[]) {
              allPast.push(...state.past[orig])
            }
            allPast.sort((a, b) => b.ts - a.ts)
            target = allPast[0]
          } else {
            // Find most recent entry for specific origin
            const stack = state.past[origin]
            target = stack[stack.length - 1]
          }

          if (!target) {
            set(s => { s.stats.failedUndos++ })
            return false
          }

          try {
            // Use tldraw's bailToMark to undo
            state._editor.bailToMark(target.markId)
            
            set(s => {
              // Move entry from past to future
              const targetOrigin = target.origin
              const pastStack = s.past[targetOrigin]
              const entryIndex = pastStack.findIndex(e => e.id === target.id)
              
              if (entryIndex >= 0) {
                const [entry] = pastStack.splice(entryIndex, 1)
                s.future[targetOrigin].unshift(entry)
              }
              
              s.stats.undoCount++
              s.stats.lastActionTime = new Date()
              
              // Regenerate legacy entries
              updateLegacyEntries(s)
            })
            
            return true
          } catch (error) {
            console.error('Undo failed:', error)
            set(s => { s.stats.failedUndos++ })
            return false
          }
        },

        // Redo operation
        redo: (origin?: HistoryOrigin): boolean => {
          const state = get()
          if (!state.enabled || !state._editor) {
            set(s => { s.stats.failedUndos++ })
            return false
          }

          let target: StackEntry | undefined
          
          if (!origin) {
            // Find most recent entry in future across all origins
            const allFuture: StackEntry[] = []
            for (const orig of ['user', 'ai', 'template'] as HistoryOrigin[]) {
              allFuture.push(...state.future[orig])
            }
            allFuture.sort((a, b) => a.ts - b.ts)
            target = allFuture[0]
          } else {
            // Find next entry for specific origin
            const stack = state.future[origin]
            target = stack[0]
          }
          
          if (!target) {
            set(s => { s.stats.failedUndos++ })
            return false
          }

          try {
            // Use tldraw's native redo
            state._editor.redo()
            
            set(s => {
              // Move entry from future to past
              const targetOrigin = target.origin
              const futureStack = s.future[targetOrigin]
              const entryIndex = futureStack.findIndex(e => e.id === target.id)
              
              if (entryIndex >= 0) {
                const [entry] = futureStack.splice(entryIndex, 1)
                s.past[targetOrigin].push(entry)
              }
              
              s.stats.redoCount++
              s.stats.lastActionTime = new Date()
              
              // Regenerate legacy entries
              updateLegacyEntries(s)
            })
            
            return true
          } catch (error) {
            console.error('Redo failed:', error)
            set(s => { s.stats.failedUndos++ })
            return false
          }
        },

        // Utility methods
        canUndo: (origin?: HistoryOrigin): boolean => {
          const state = get()
          if (!origin) {
            // Check if any origin has past entries
            return Object.values(state.past).some(stack => stack.length > 0)
          }
          return state.past[origin].length > 0
        },

        canRedo: (origin?: HistoryOrigin): boolean => {
          const state = get()
          if (!origin) {
            // Check if any origin has future entries
            return Object.values(state.future).some(stack => stack.length > 0)
          }
          return state.future[origin].length > 0
        },

        setEnabled: (enabled: boolean) => {
          set(state => {
            state.enabled = enabled
          })
        },

        clear: (origin?: HistoryOrigin) => {
          set(state => {
            if (!origin) {
              // Clear all origins
              for (const orig of ['user', 'ai', 'template'] as HistoryOrigin[]) {
                state.past[orig] = []
                state.future[orig] = []
              }
            } else {
              // Clear specific origin
              state.past[origin] = []
              state.future[origin] = []
            }
            
            state.stats.lastActionTime = new Date()
            updateLegacyEntries(state)
          })
        },

        // Test/debug helpers
        getEntriesByOrigin: (origin: HistoryOrigin): StackEntry[] => {
          const state = get()
          return [...state.past[origin], ...state.future[origin]]
        },

        getRecentEntries: (limit = 10): StackEntry[] => {
          const state = get()
          const allEntries: StackEntry[] = []
          for (const origin of ['user', 'ai', 'template'] as HistoryOrigin[]) {
            allEntries.push(...state.past[origin])
          }
          allEntries.sort((a, b) => b.ts - a.ts)
          return allEntries.slice(0, limit)
        },

        clearByOrigin: (origin: HistoryOrigin) => {
          set(state => {
            state.past[origin] = []
            state.future[origin] = []
            state.stats.lastActionTime = new Date()
            updateLegacyEntries(state)
          })
        }
      }
    })
  )

/**
 * Helper to regenerate legacy entries array from current stack state.
 * This maintains backward compatibility with existing tests.
 */
function updateLegacyEntries(state: MultiOriginHistory) {
  if (!state._editor) return
  
  // Clear the legacy entries array
  state.entries = []
  
  // Convert all stack entries to legacy format
  for (const origin of ['user', 'ai', 'template'] as HistoryOrigin[]) {
    const pastEntries = state.past[origin].map((entry: StackEntry) => toLegacy(entry, state._editor!))
    const futureEntries = state.future[origin].map((entry: StackEntry) => toLegacy(entry, state._editor!))
    state.entries.push(...pastEntries, ...futureEntries)
  }
  
  // Sort by timestamp to maintain chronological order
  state.entries.sort((a: HistoryEntryLegacy, b: HistoryEntryLegacy) => {
    const aTime = a.timestamp || 0
    const bTime = b.timestamp || 0
    return aTime - bTime
  })
}
export interface OriginMarkEvent {
  mark: string
  origin: HistoryOrigin
}

/**
 * Custom event emitter for history events.
 * Since tldraw doesn't have 'origin-mark' in its event map, we create our own.
 */
class HistoryEventEmitter {
  private listeners: Map<string, Array<(data: OriginMarkEvent) => void>> = new Map()

  on(event: string, listener: (data: OriginMarkEvent) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.push(listener)
    }
    
    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        const index = eventListeners.indexOf(listener)
        if (index > -1) {
          eventListeners.splice(index, 1)
        }
      }
    }
  }

  emit(event: string, data: OriginMarkEvent): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data))
    }
  }
}

// Global history event emitter instance
export const historyEvents = new HistoryEventEmitter()

/**
 * Helper function to wrap editor operations with origin tracking.
 * This is the key integration point with tldraw's native history.
 */
export function withOrigin(
  editor: Editor,
  origin: HistoryOrigin,
  fn: () => void,
) {
  editor.run(() => {
    fn()                                // create/update/delete shapes
    const mark = editor.markHistoryStoppingPoint()
    // Side-band publish the mark + origin using our custom event system
    historyEvents.emit('origin-mark', { mark, origin })
  }, { history: 'record' })             // the official v3 flag
}
