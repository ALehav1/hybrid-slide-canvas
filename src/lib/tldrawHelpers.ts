import { type Editor, type TLShapePartial, type TLShapeId } from '@tldraw/tldraw';
import { createUniqueShapeId } from './utils/clientId';

// Supported color tokens for shapes
type ShapeColor = 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'black' | 'gray' | 'none';

/** Create a text shape with optional positioning and styling. */
export function createTextShape(
  editor: Editor,
  text: string,
  opts: {
    color?: ShapeColor | undefined;
    size?: 's' | 'm' | 'l' | 'xl' | undefined;
    align?: 'start' | 'middle' | 'end' | undefined;
    x?: number | undefined;
    y?: number | undefined;
    position?: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | undefined;
  } = {},
) {
  if (!editor || !text.trim()) return;

  // Determine anchor point for the text's center
  const viewport = editor.getViewportPageBounds();
  const center = viewport?.center || { x: 500, y: 500 };
  let cx = center.x;
  let cy = center.y;

  if (opts.position) {
    const { x, y, w, h } = viewport;
    const padding = 40;
    switch (opts.position) {
      case 'topLeft':
        cx = x + padding;
        cy = y + padding;
        break;
      case 'topRight':
        cx = x + w - padding;
        cy = y + padding;
        break;
      case 'bottomLeft':
        cx = x + padding;
        cy = y + h - padding;
        break;
      case 'bottomRight':
        cx = x + w - padding;
        cy = y + h - padding;
        break;
      // 'center' is default
    }
  } else if (opts.x !== undefined && opts.y !== undefined) {
    cx = opts.x;
    cy = opts.y;
  }

  const id: TLShapeId = createUniqueShapeId();

  const textShape: TLShapePartial = {
    id,
    type: 'text',
    x: cx,
    y: cy,
    props: {
      text: text.trim(),
      color: opts.color ?? 'black',
      size: opts.size ?? 'm',
      align: opts.align ?? 'middle',
    },
  };

  editor.batch(() => {
    editor.createShapes([textShape]);
    editor.select(id);
  });
}

/** Create a sketch-style geo shape with optional positioning and styling. */
export function createSketchShape(
  editor: Editor,
  kind: 'rectangle' | 'ellipse' | 'diamond' | 'star',
  opts: {
    w?: number | undefined;
    h?: number | undefined;
    label?: string | undefined;
    fill?: ShapeColor | undefined;
    color?: ShapeColor | undefined;
    x?: number | undefined;
    y?: number | undefined;
    position?: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | undefined;
  } = {}
) {
  if (!editor) return;

  // Determine anchor point for the shape's center
  // Note: Using `editor.getViewportPageBounds()` as per TLDraw v3.13 API update.
  // TODO: Remove this comment once @tldraw/tldraw ≥3.13 ships its updated d.ts
  // Consider using editor.focusBounds() for automatic frame-aware positioning
  const viewport = editor.getViewportPageBounds();
  // Add null safety for tests and edge cases
  const center = viewport?.center || { x: 500, y: 500 };
  let cx = center.x;
  let cy = center.y;

  if (opts.position) {
    const { x, y, w, h } = viewport;
    const padding = 40; // Padding from the edge
    switch (opts.position) {
      case 'topLeft':
        cx = x + padding;
        cy = y + padding;
        break;
      case 'topRight':
        cx = x + w - padding;
        cy = y + padding;
        break;
      case 'bottomLeft':
        cx = x + padding;
        cy = y + h - padding;
        break;
      case 'bottomRight':
        cx = x + w - padding;
        cy = y + h - padding;
        break;
      // 'center' is the default
    }
  } else if (opts.x !== undefined && opts.y !== undefined) {
    cx = opts.x;
    cy = opts.y;
  }

  const w = opts.w ?? 120;
  const h = opts.h ?? 80;
  const id = createUniqueShapeId();

  const geo: TLShapePartial = {
    id,
    type: 'geo',
    x: cx - w / 2,
    y: cy - h / 2,
    props: {
      geo: kind,
      w,
      h,
      dash: 'draw',
      color: opts.color ?? 'blue',
      fill: opts.fill ?? 'none',
      size: 'm',
    },
  };

  editor.batch(() => {
    editor.createShapes([geo]);

    let finalIdToSelect = id;

    if (opts.label) {
      const textId = createUniqueShapeId();
      editor.createShapes([
        {
          id: textId,
          type: 'text',
          x: cx,
          y: cy,
          props: {
            text: opts.label,
            align: 'middle',
            size: 'm',
          },
        },
      ]);

      const groupId = createUniqueShapeId();
      editor.groupShapes([id, textId], { groupId });
      finalIdToSelect = groupId;
    }

    editor.select(finalIdToSelect);
  });
}
