import { type HistoryEntry as TldrawHistoryEntry, type TLStoreSnapshot } from 'tldraw';
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools } from 'zustand/middleware'

// Types
export type OriginType = 'user' | 'ai' | 'template'

export interface HistoryEntry {
  id: string;
  timestamp: number;
  origin: OriginType;
  action: string;
    data: {
    changes: TldrawHistoryEntry['changes'];
    source?: TldrawHistoryEntry['source'];
    snapshot?: TLStoreSnapshot;
  };
  canUndo: boolean;
  dependencies?: string[];
}

export interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]
  maxHistorySize: number
  isSquashing: boolean
  squashTimeout: number
  squashTimer: NodeJS.Timeout | null
}

export interface HistoryActions {
  // Core actions
  execute: (entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'canUndo'> & { canUndo?: boolean }) => void
  undo: (origin?: OriginType) => HistoryEntry | null
  redo: (origin?: OriginType) => HistoryEntry | null
  
  // Batch actions
  startBatch: (origin: OriginType) => string
  endBatch: (batchId: string) => void
  squashActions: (timeWindow?: number) => void
  
  // Utility actions
  canUndo: (origin?: OriginType) => boolean
  canRedo: (origin?: OriginType) => boolean
  clear: () => void
  getHistory: (origin?: OriginType) => HistoryEntry[]
  
  // Internal actions
  _addToHistory: (entry: HistoryEntry) => void
  _removeFromHistory: (id: string) => void
  _squashEntries: (entries: HistoryEntry[]) => HistoryEntry
  _performSquash: () => void
}

type HistoryStore = HistoryState & HistoryActions

export const useHistoryStore = create<HistoryStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      past: [],
      future: [],
      maxHistorySize: 100,
      isSquashing: false,
      squashTimeout: 500,
      squashTimer: null,

      // Core actions
      execute: (entry) => {
        const historyEntry: HistoryEntry = {
          ...entry,
          id: `${entry.origin}_${Date.now()}_${Math.random()}`,
          timestamp: Date.now(),
          canUndo: entry.canUndo ?? true,
        }

        set((state) => {
          // Clear future when executing new action
          state.future = []
          
          // Add to history
          state.past.push(historyEntry)
          
          // Limit history size
          if (state.past.length > state.maxHistorySize) {
            state.past.shift()
          }
        })

        // Handle squashing for continuous actions
        if (entry.action === 'draw' || entry.action === 'drag') {
          get().squashActions()
        }
      },

      undo: (origin) => {
        const state = get()
        
        // Find the most recent undoable entry for the specified origin
        const pastEntries = origin 
          ? state.past.filter(entry => entry.origin === origin)
          : state.past
        
        const entryToUndo = pastEntries
          .slice()
          .reverse()
          .find(entry => entry.canUndo)

        if (!entryToUndo) return null

        set((state) => {
          // Remove from past and add to future
          const index = state.past.findIndex(e => e.id === entryToUndo.id)
          if (index > -1) {
            const [undoneEntry] = state.past.splice(index, 1)
            state.future.unshift(undoneEntry)
          }
        })

        return entryToUndo
      },

      redo: (origin) => {
        const state = get()
        
        // Find the most recent redoable entry for the specified origin
        const futureEntries = origin 
          ? state.future.filter(entry => entry.origin === origin)
          : state.future
        
        const entryToRedo = futureEntries[0]

        if (!entryToRedo) return null

        set((state) => {
          // Remove from future and add to past
          const index = state.future.findIndex(e => e.id === entryToRedo.id)
          if (index > -1) {
            const [redoneEntry] = state.future.splice(index, 1)
            state.past.push(redoneEntry)
          }
        })

        return entryToRedo
      },

      // Batch actions
      startBatch: (origin) => {
        const batchId = `batch_${origin}_${Date.now()}`
        return batchId
      },

            endBatch: (_batchId) => {
        // Implementation depends on how you want to handle batching
        // This is a placeholder for batch completion logic
      },

      squashActions: (timeWindow = 500) => {
        const state = get()
        
        if (state.isSquashing) return

        set((state) => {
          state.isSquashing = true
          
          // Clear existing timer
          if (state.squashTimer) {
            clearTimeout(state.squashTimer)
          }
          
          // Set new timer
          state.squashTimer = setTimeout(() => {
            get()._performSquash()
          }, timeWindow)
        })
      },

      // Utility actions
      canUndo: (origin) => {
        const state = get()
        const entries = origin 
          ? state.past.filter(entry => entry.origin === origin)
          : state.past
        
        return entries.some(entry => entry.canUndo)
      },

      canRedo: (origin) => {
        const state = get()
        const entries = origin 
          ? state.future.filter(entry => entry.origin === origin)
          : state.future
        
        return entries.length > 0
      },

      clear: () => {
        set((state) => {
          state.past = []
          state.future = []
          
          if (state.squashTimer) {
            clearTimeout(state.squashTimer)
            state.squashTimer = null
          }
        })
      },

      getHistory: (origin) => {
        const state = get()
        return origin 
          ? state.past.filter(entry => entry.origin === origin)
          : state.past
      },

      // Internal actions
      _addToHistory: (entry) => {
        set((state) => {
          state.past.push(entry)
        })
      },

      _removeFromHistory: (id) => {
        set((state) => {
          state.past = state.past.filter(entry => entry.id !== id)
        })
      },

      _squashEntries: (entries) => {
        if (entries.length <= 1) return entries[0]
        
        // Combine entries into a single squashed entry
        const firstEntry = entries[0]
        const lastEntry = entries[entries.length - 1]
        
        return {
          ...firstEntry,
          id: `squashed_${firstEntry.id}_${lastEntry.id}`,
          timestamp: lastEntry.timestamp,
          data: {
            ...firstEntry.data,
            ...lastEntry.data,
            squashedCount: entries.length
          }
        }
      },

      _performSquash: () => {
        set((state) => {
          state.isSquashing = false
          state.squashTimer = null
          
          // Group recent entries by origin and action type
          const recentEntries = state.past.slice(-10)
          const groupedEntries = new Map<string, HistoryEntry[]>()
          
          recentEntries.forEach(entry => {
            const key = `${entry.origin}_${entry.action}`
            if (!groupedEntries.has(key)) {
              groupedEntries.set(key, [])
            }
            groupedEntries.get(key)!.push(entry)
          })
          
          // Squash continuous actions
          groupedEntries.forEach((entries, key) => {
            if (entries.length > 1 && 
                (key.includes('draw') || key.includes('drag'))) {
              // Remove individual entries
              entries.forEach(entry => {
                const index = state.past.findIndex(e => e.id === entry.id)
                if (index > -1) {
                  state.past.splice(index, 1)
                }
              })
              
              // Add squashed entry
              const squashedEntry = get()._squashEntries(entries)
              state.past.push(squashedEntry)
            }
          })
        })
      }
    })),
    { name: 'history-store' }
  )
)
