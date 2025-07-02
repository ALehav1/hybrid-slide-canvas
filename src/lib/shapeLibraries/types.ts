import type { Editor } from '@tldraw/tldraw';

/**
 * Represents a single item in a shape library that can be added to the canvas.
 */
export interface LibraryItem {
  /** A unique identifier for the library item (e.g., 'lib-rect-node'). */
  id: string;
  /** The display name of the item (e.g., 'Rectangle Node'). */
  name: string;
  /** The path to the preview image for the library item. */
  preview: string;
  /** A factory function that creates the shape on the canvas when the item is selected. */
  factory: (editor: Editor | undefined) => Promise<void>;
}
