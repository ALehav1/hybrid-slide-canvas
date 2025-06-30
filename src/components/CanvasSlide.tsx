import { type ReactNode } from 'react';
import { Tldraw, type Editor } from '@tldraw/tldraw';
import { applyTheme } from '../lib/theme';

type Props = {
  slideId: string;
  children?: ReactNode;
  onEditorMount: (editor: Editor) => void;
};

export const CanvasSlide: React.FC<Props> = ({ slideId, children, onEditorMount }) => {
  return (
    <Tldraw
      persistenceKey={slideId}
      onMount={(editor) => {
        onEditorMount(editor); // Pass the editor instance up to the parent
        applyTheme(editor);
      }}
      hideUi
      className="h-full w-full"
    >
      {children}
    </Tldraw>
  );
};
