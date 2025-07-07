import React, { Suspense } from 'react';
import { Tldraw, type Editor, type TLComponents, type TLStore, createTLStore, defaultShapeUtils } from '@tldraw/tldraw';
import { FreeDrawShapeUtil } from '../lib/shapes/FreeDrawShapeUtil';
import { FreeDrawTool } from '@/lib/tools/FreeDrawTool';
import { applyTheme } from '../lib/theme';

// ────────────────────────────────────────────────────────────────
//  Simple render counter (diagnostic only)
//  Helps detect unexpected re-renders / duplicate TLDraw instances
// ────────────────────────────────────────────────────────────────
let canvasSlideRenderCount = 0;

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

/**
 * Canvas slide component that renders a TLDraw canvas with proper error handling and lazy loading
 * Uses TLDraw's official components API instead of children for UI customization
 */
// ---------------------------------------------------------------------------
//  Stable references for TLDraw props
//  Creating new arrays each render caused TLDraw to believe its config changed
//  and re-initialise (→ duplicate canvas / shadow shapes).
// ---------------------------------------------------------------------------
const SHAPE_UTILS = [FreeDrawShapeUtil];
const TOOLS = [FreeDrawTool];

const CanvasSlideInner: React.FC<Props> = ({
  slideId: _slideId,
  store,
  onMount,
  onEditorMount,
  className = '',
}) => {
  // Increment & log render counter (no side-effects / loops)
  // eslint-disable-next-line no-console
  console.log(`[CanvasSlide] render #${++canvasSlideRenderCount}`);

  // ---------------------------------------------------------------------
  //  DEBUG LIFECYCLE: track mount / unmount cycles at runtime
  // ---------------------------------------------------------------------
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[CanvasSlide] mounted');
    return () => {
      // eslint-disable-next-line no-console
      console.log('[CanvasSlide] unmounted');
    };
  }, []);

  // slideId is required by Props interface but not used internally
  void _slideId;
  // ---------------------------------------------------------------------
  // Ensure **only one** TLStore instance is created per component lifecycle.
  // If `store` is provided via props, use it as-is. Otherwise create the
  // default store once and memoise it for all subsequent re-renders.
  // ---------------------------------------------------------------------
  const tlStore = React.useMemo<TLStore>(() => {
    if (store) {
      // eslint-disable-next-line no-console
      console.log('[CanvasSlide] Using provided store from props.');
      return store;
    }
    const newStoreId = `store-${Math.random().toString(36).substring(2, 9)}`;
    // eslint-disable-next-line no-console
    console.log(`[CanvasSlide] No store prop. Creating new local store with ID: ${newStoreId}`);
    return createTLStore({ shapeUtils: [...defaultShapeUtils, FreeDrawShapeUtil] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  // Use React 19's Suspense for async loading of the canvas
  // ---------------------------------------------------------------------
  // Memoise the editor-mount callback so TLDraw receives a STABLE reference.
  // Passing a new function each render forces TLDraw to re-initialise
  // (causing the duplicate-canvas / shadow-shape bug).
  // ---------------------------------------------------------------------
  const handleEditorMount = React.useCallback(
    (editor: Editor) => {
      // eslint-disable-next-line no-console
      console.log('[CanvasSlide] <Tldraw /> component onMount fired.');
      try {
        onMount?.(editor);
        onEditorMount?.(editor); // deprecated but still supported
        applyTheme();
      } catch (error) {
        console.error('Error mounting TLDraw editor:', error);
      }

      /* -----------------------------------------------------------------
       * 🚨 StrictMode Compatibility
       * -----------------------------------------------------------------
       * React StrictMode intentionally mounts, unmounts, and remounts
       * components in development to surface lifecycle issues. TLDraw’s
       * `onMount` callback is invoked on every mount, but *does not* provide
       * automatic cleanup.  If we create shapes (or perform any action that
       * mutates the internal TLStore) during the first mount, that state will
       * “leak” into the second mount—resulting in the **shadow / duplicate
       * shapes** bug.
       *
       * The TLDraw team explicitly recommends returning a cleanup function
       * from `onMount` (see GitHub issue #5089).  Here we load an **empty
       * snapshot**, resetting the store to a pristine state so the second
       * mount starts fresh and no duplicates are produced.
       * ----------------------------------------------------------------- */
      return () => {
        try {
          const snapshot = editor.getSnapshot();
          editor.loadSnapshot({
            store: {}, // 🔄 empty store ⇒ pristine editor
            schema: snapshot.schema, // keep current schema
          });
          // eslint-disable-next-line no-console
          console.log('[CanvasSlide] <Tldraw /> cleanup – store reset.');
        } catch (err) {
          console.error('Error during TLDraw cleanup:', err);
        }
      };
    },
    [onMount, onEditorMount],
  );

  return (
    <Suspense fallback={<CanvasLoadingFallback />}>
      <Tldraw
        /* Stable key prevents internal re-init on harmless parent re-renders */
        key={_slideId}
        store={tlStore}
        onMount={handleEditorMount}
        hideUi
        className={`h-full w-full ${className}`}
        shapeUtils={SHAPE_UTILS}
        tools={TOOLS}
      />
    </Suspense>
  );
};

/**
 * Memoised wrapper so React re-renders don't force TLDraw to re-initialise.
 * Only re-renders when relevant props actually change.
 */
export const CanvasSlide = React.memo(CanvasSlideInner);

