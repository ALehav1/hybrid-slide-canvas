// Discriminated origin
export type HistoryOrigin = 'user' | 'ai' | 'template'

// One entry per TLDraw *mark* we want to expose
export interface HistoryEntry {
  id: string           // the markId from editor.markHistoryStoppingPoint()
  origin: HistoryOrigin
  timestamp: number
  description?: string // Optional description for debugging/display
  undo?: () => void   // Function to execute when undoing this entry
  redo?: () => void   // Function to execute when redoing this entry
}

export interface HistoryStack {
  undo: HistoryEntry[]
  redo: HistoryEntry[]
}

export interface HistoryState {
  // Core state
  stacks: Record<HistoryOrigin | 'all', HistoryStack>
  enabled: boolean
  entries: HistoryEntry[]
  currentIndex: number
  stats: {
    totalEntries: number
    undoCount: number
    redoCount: number
    lastActionTime?: Date
  }
  
  // Core methods
  addEntry: (entry: HistoryEntry) => void
  undo:  (origin?: HistoryOrigin | 'all') => boolean
  redo:  (origin?: HistoryOrigin | 'all') => boolean  
  clear: (origin?: HistoryOrigin) => void
  
  // Additional methods expected by tests
  canUndo: (origin?: HistoryOrigin | 'all') => boolean
  canRedo: (origin?: HistoryOrigin | 'all') => boolean
  setEnabled: (enabled: boolean) => void
  getEntriesByOrigin: (origin: HistoryOrigin) => HistoryEntry[]
  clearByOrigin: (origin: HistoryOrigin) => void
  getRecentEntries: (limit?: number) => HistoryEntry[]
}
