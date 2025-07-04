import React from 'react'
import { useEditor } from '@tldraw/tldraw'
import { useHistoryManager } from '@/lib/history/useHistoryManager'
import { useHistoryStore } from '@/lib/history/useHistoryStore'
import { ExportMenu } from './ExportMenu'

export const Toolbar: React.FC = () => {
	const editor = useEditor()
	const historyManager = useHistoryManager()

	const [isFreeDrawActive, setIsFreeDrawActive] = React.useState(
		() => editor.getCurrentToolId() === 'free-draw'
	)

	React.useEffect(() => {
		const unsubscribe = editor.store.listen(() => {
			setIsFreeDrawActive(editor.getCurrentToolId() === 'free-draw')
		})

		return () => {
			unsubscribe()
		}
	}, [editor])

	const { canUndo, canRedo } = useHistoryStore((state) => ({
		canUndo: state.stacks.user.undo.length > 0,
		canRedo: state.stacks.user.redo.length > 0,
	}))

	const handleUndo = () => {
		historyManager?.undo('user')
	}

	const handleRedo = () => {
		historyManager?.redo('user')
	}

	const handleSelectFreeDrawTool = React.useCallback(() => {
		editor.setCurrentTool('free-draw')
	}, [editor])

	return (
		<div className="h-11 border-b px-2 flex items-center gap-2 bg-white">
			<button
				data-testid="toolbar-undo-button"
				onClick={handleUndo}
				disabled={!canUndo}
				className="px-2 py-1 border rounded disabled:opacity-50"
			>
				Undo
			</button>
			<button
				data-testid="toolbar-redo-button"
				onClick={handleRedo}
				disabled={!canRedo}
				className="px-2 py-1 border rounded disabled:opacity-50"
			>
				Redo
			</button>
			<div className="w-px h-6 bg-gray-200" />
			<button
				data-testid="toolbar-freedraw-button"
				onClick={handleSelectFreeDrawTool}
				className={`px-2 py-1 border rounded ${isFreeDrawActive ? 'bg-blue-100' : ''}`}
			>
				Pen
			</button>
			<div className="w-px h-6 bg-gray-200" />
			<ExportMenu editor={editor as any} />
		</div>
	)
}
