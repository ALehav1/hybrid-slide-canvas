import React from 'react'
import { useHistoryManager } from '@/hooks/useHistoryManager'
import { type OriginType } from '@/state/useHistoryStore'     // selector no longer needed
import { Editor } from 'tldraw'

interface ToolbarProps {
  editor: Editor | null
}

export const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  const { undo, redo, setOrigin, canUndo, canRedo } = useHistoryManager(editor)
  const [selectedOrigin, setSelectedOrigin] = React.useState<OriginType | 'all'>('all')

  const handleUndo = () =>
    undo(selectedOrigin === 'all' ? undefined : selectedOrigin)

  const handleRedo = () =>
    redo(selectedOrigin === 'all' ? undefined : selectedOrigin)

  const handleOriginChange = (newOrigin: OriginType) => {
    setSelectedOrigin(newOrigin)
    setOrigin(newOrigin)
  }

  return (
    <div className="toolbar">
      {/* Origin Selection */}
      <div className="origin-selector">
        <label htmlFor="origin-select">Active Origin:</label>
        <select 
          id="origin-select"
          aria-label="Select active origin for history operations"
          value={selectedOrigin} 
          onChange={(e) => {
            const value = e.target.value as OriginType | 'all'
            if (value !== 'all') {
              handleOriginChange(value)
            }
            setSelectedOrigin(value)
          }}
        >
          <option value="all">All Origins</option>
          <option value="user">User</option>
          <option value="ai">AI</option>
          <option value="template">Template</option>
        </select>
      </div>

      {/* Undo/Redo Controls */}
      <div className="history-controls" role="group" aria-label="History controls">
        <button 
          onClick={handleUndo}
          disabled={selectedOrigin === 'all' ? !canUndo.all : !canUndo[selectedOrigin]}
          className="history-btn"
          title={`Undo ${selectedOrigin === 'all' ? 'any' : selectedOrigin} action`}
          aria-label={`Undo ${selectedOrigin === 'all' ? 'any' : selectedOrigin} action`}
        >
          ⟲ Undo
        </button>
        
        <button 
          onClick={handleRedo}
          disabled={selectedOrigin === 'all' ? !canRedo.all : !canRedo[selectedOrigin]}
          className="history-btn"
          title={`Redo ${selectedOrigin === 'all' ? 'any' : selectedOrigin} action`}
          aria-label={`Redo ${selectedOrigin === 'all' ? 'any' : selectedOrigin} action`}
        >
          ⟳ Redo
        </button>
      </div>

      {/* Origin-specific Controls */}
      <div className="origin-controls">
        <button 
          onClick={() => undo('user')}
          disabled={!canUndo.user}
          className="origin-btn user-btn"
          aria-label="Undo last user action"
        >
          ⟲ User
        </button>
        
        <button 
          onClick={() => undo('ai')}
          disabled={!canUndo.ai}
          className="origin-btn ai-btn"
          aria-label="Undo last AI action"
        >
          ⟲ AI
        </button>
        
        <button 
          onClick={() => undo('template')}
          disabled={!canUndo.template}
          className="origin-btn template-btn"
          aria-label="Undo last template action"
        >
          ⟲ Template
        </button>
      </div>
    </div>
  )
}
