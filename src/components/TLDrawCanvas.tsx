/**
 * TLDrawCanvas Component
 * 
 * Integrates TLDraw canvas functionality with slide management.
 * Following external research pattern for stable editor reference and shape creation.
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { Tldraw, Editor, createShapeId } from 'tldraw';
import 'tldraw/tldraw.css';

// Constants for slide layout - using larger slides for better visibility
const SLIDE_CONFIG = {
  WIDTH: 800,           // Larger slides for better visibility
  HEIGHT: 600,          // 4:3 aspect ratio works well
  SPACING: 100,         // Adequate spacing between slides
  SLIDES_PER_ROW: 2,    
};

// Shape creation options interface
interface ShapeOptions {
  text?: string;
  width?: number;
  height?: number;
  color?: string;
}

// Props interface for TLDrawCanvas
interface TLDrawCanvasProps {
  currentSlide: number;
  onCreateShape?: (createShapeFn: (shapeType: string, options: ShapeOptions) => void) => void;
  className?: string;
}

// TLDrawCanvas component with stable editor reference
export const TLDrawCanvas: React.FC<TLDrawCanvasProps> = ({ 
  className = '',
  currentSlide,
  onCreateShape
}) => {
  // Stable editor reference - never changes identity
  const editorRef = useRef<Editor | null>(null);
  
  // Stable onMount handler - prevents re-renders
  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    console.log('🎯 TLDraw editor mounted for slide', currentSlide);
  }, []); // Empty deps - this function never needs to change
  
  // Expose createShape function to parent via callback
  useEffect(() => {
    if (onCreateShape && editorRef.current) {
      // This function will be called by AI chat to create shapes
      const createShape = (shapeType: string, options: ShapeOptions) => {
        if (shapeType === 'rectangle' || shapeType === 'ellipse' || shapeType === 'text') {
          createShapeOnCanvas(editorRef.current!, shapeType, options);
        }
      };
      onCreateShape(createShape);
    }
  }, [onCreateShape]); // Only re-run if onCreateShape changes

  return (
    <div className={className}>
      <Tldraw
        persistenceKey={`slide-${currentSlide}`}
        onMount={handleMount}
        hideUi={false}
      />
    </div>
  );
};

// Utility function to create shapes on TLDraw canvas
function createShapeOnCanvas(
  editor: Editor,
  kind: 'rectangle' | 'ellipse' | 'text',
  opts: ShapeOptions = {}
) {
  if (!editor) return;
  
  const id = createShapeId();
  const center = editor.getViewportPageBounds().center;
  
  if (kind === 'text') {
    const textShape = {
      id,
      type: 'text' as const,
      x: center.x - 60,
      y: center.y - 12,
      props: {
        text: opts.text || 'Hello World',
        size: 'm' as const,
        color: opts.color || 'black'
      }
    };
    
    editor.batch(() => {
      editor.createShapes([textShape]);
      editor.select(id);
    });
  } else {
    const geoShape = {
      id,
      type: 'geo' as const,
      x: center.x - (opts.width || 100) / 2,
      y: center.y - (opts.height || 100) / 2,
      props: {
        geo: kind === 'ellipse' ? 'ellipse' : 'rectangle',
        w: opts.width || 100,
        h: opts.height || 100,
        color: opts.color || 'blue',
        dash: 'draw' as const,
        size: 'm' as const
      }
    };
    
    editor.batch(() => {
      editor.createShapes([geoShape]);
      editor.select(id);
    });
  }
  
  console.log(`✅ Created ${kind} shape:`, opts);
}

export default TLDrawCanvas;

// Export utilities for use by parent components
// eslint-disable-next-line react-refresh/only-export-components
export { SLIDE_CONFIG };
export type { TLDrawCanvasProps };
