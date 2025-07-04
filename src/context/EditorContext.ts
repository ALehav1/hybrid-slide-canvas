import { createContext } from 'react';
import { type Editor } from '@tldraw/tldraw';

/**
 * A React context to provide the tldraw Editor instance to child components.
 * This avoids prop-drilling the editor instance through the entire component tree.
 */
export const EditorContext = createContext<Editor | null>(null);
