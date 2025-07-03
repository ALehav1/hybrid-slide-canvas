import { createContext, useContext } from 'react'
import { type Editor } from '@tldraw/tldraw'

export const EditorContext = createContext<Editor | null>(null)
export const useEditorCtx = () => useContext(EditorContext)
