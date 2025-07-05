import React, { Suspense } from 'react';
import { Tldraw, type Editor, type TLComponents, type TLStore, createTLStore, defaultShapeUtils } from '@tldraw/tldraw';
import { FreeDrawShapeUtil } from '../lib/shapes/FreeDrawShapeUtil';
import { FreeDrawTool } from '@/lib/tools/FreeDrawTool';
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

interface Props {
  slideId: string;
  store?: TLStore;
  onMount?: (editor: Editor) => void;
  /** @deprecated Use onMount instead */
  onEditorMount?: (editor: Editor) => void;
  className?: string;
}

// Custom TLDraw components for UI injection
const customComponents: Partial<TLComponents> = {
  InFrontOfTheCanvas: () => (
    <div className="absolute top-4 left-4 z-10">
      {/* Future: Guides, rulers, custom overlays */}
    </div>
  ),
  // Future: Custom toolbar, style panels, etc.
};

/**
 * Canvas slide component that renders a TLDraw canvas with proper error handling and lazy loading
 * Uses TLDraw's official components API instead of children for UI customization
 */
export const CanvasSlide: React.FC<Props> = ({ slideId: _slideId, store, onMount, onEditorMount, className = '' }) => {
  // slideId is required by Props interface but not used internally
  void _slideId;
  // Create a local store if none provided
  const tlStore = store || createTLStore({ shapeUtils: [...defaultShapeUtils, FreeDrawShapeUtil] });
  // Use React 19's Suspense for async loading of the canvas
  return (
    <Suspense fallback={<CanvasLoadingFallback />}>
      <Tldraw
        store={tlStore}
        onMount={(editor) => {
          // Enhance with error handling
          try {
            // Call both callbacks for backward compatibility
            onMount?.(editor);
            onEditorMount?.(editor); // deprecated but still supported
            applyTheme();
          } catch (error) {
            console.error('Error mounting TLDraw editor:', error);
          }
        }}
        hideUi
        className={`h-full w-full ${className}`}
        components={customComponents}
        shapeUtils={[FreeDrawShapeUtil]}
        tools={[FreeDrawTool]}
      />
    </Suspense>
  );
};
