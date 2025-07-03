import React from 'react';
import { useEditorCtx } from '@/lib/tldraw/EditorContext'
import { basicLibrary } from '@/lib/shapeLibraries/basic'
import { useTransition, useState } from 'react'

export const LibraryPanel: React.FC = () => {
  const editor = useEditorCtx()
  const [isPending, startTransition] = useTransition()
  const [lastClicked, setLastClicked] = useState<string | null>(null)

  const handleClick = (item: (typeof basicLibrary)[number]) => {
    if (!editor) return
    startTransition(() => { setLastClicked(item.id); })
    item.factory(editor).finally(() => setTimeout(() => { setLastClicked(null); }, 500))
  }

  return (
    <aside className="p-3 flex-1 overflow-y-auto">
      <h2 className="font-semibold mb-2">📚 Library</h2>
      {basicLibrary.map((item) => (
        <button
          key={item.id}
          onClick={() => { handleClick(item); }}
          disabled={isPending}
          className="flex items-center gap-2 w-full mb-2 hover:bg-gray-100 rounded px-2 py-1"
        >
          <img src={item.preview} alt={item.name} className="w-8 h-8 object-contain" />
          <span className={lastClicked === item.id ? 'font-medium text-blue-600' : ''}>
            {item.name}
            {lastClicked === item.id && isPending && (
              <span className="ml-1 inline-block animate-pulse">...</span>
            )}
          </span>
        </button>
      ))}
    </aside>
  )
}
