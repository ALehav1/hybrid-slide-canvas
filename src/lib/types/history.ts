// Discriminated origin
export type HistoryOrigin = 'user' | 'ai' | 'template'

// One entry per TLDraw *mark* we want to expose
export interface HistoryEntry {
  id: string           // the markId from editor.markHistoryStoppingPoint()
  origin: HistoryOrigin
  timestamp: number
}

export interface HistoryStack {
  undo: HistoryEntry[]
  redo: HistoryEntry[]
}

export interface HistoryState {
  stacks: Record<HistoryOrigin | 'all', HistoryStack>
  addEntry: (entry: HistoryEntry) => void
  undo:  (origin?: HistoryOrigin | 'all') => HistoryEntry | null
  redo:  (origin?: HistoryOrigin | 'all') => HistoryEntry | null
  clear: (origin?: HistoryOrigin) => void
}
