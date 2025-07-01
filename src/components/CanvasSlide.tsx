import { type ReactNode, Suspense } from 'react';
import { Tldraw, type Editor } from '@tldraw/tldraw';
import { applyTheme } from '../lib/theme';

// Loading fallback component for TLDraw canvas
const CanvasLoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full bg-gray-50">
    <div className="p-4 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-3 text-gray-600">Loading canvas...</p>
    </div>
  </div>
);

type Props = {
  slideId: string;
  children?: ReactNode;
  onEditorMount: (editor: Editor) => void;
};

/**
 * Canvas slide component that renders a TLDraw canvas with proper error handling and lazy loading
 */
export const CanvasSlide: React.FC<Props> = ({ slideId, children, onEditorMount }) => {
  // Use React 19's Suspense for async loading of the canvas
  return (
    <Suspense fallback={<CanvasLoadingFallback />}>
      <Tldraw
        persistenceKey={slideId}
        onMount={(editor) => {
          // Enhance with error handling
          try {
            onEditorMount(editor); // Pass the editor instance up to the parent
            applyTheme(editor);
          } catch (error) {
            console.error('Error mounting TLDraw editor:', error);
          }
        }}
        hideUi
        className="h-full w-full"
      >
        {children}
      </Tldraw>
    </Suspense>
  );
};
