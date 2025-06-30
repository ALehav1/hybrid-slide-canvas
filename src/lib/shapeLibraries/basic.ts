import type { Editor } from '@tldraw/tldraw';

/** Minimal built-in shape library (flowchart + org chart beginnings). */
export interface LibraryItem {
  id: string;
  name: string;
  preview: string;
  factory: (editor: Editor | undefined) => Promise<void>;
}

export const basicLibrary: LibraryItem[] = [
  {
    id: "lib-rect-node",
    name: "Rectangle Node",
    preview: "/lib/rect-node.png",
    factory: async (editor) => {
      if (!editor) return;
      const { createSketchShape } = await import("../tldrawHelpers");
      createSketchShape(editor, "rectangle", {
        label: "Node",
        fill: "blue",
      });
    },
  },
  {
    id: "lib-decision",
    name: "Decision (Diamond)",
    preview: "/lib/diamond-node.png",
    factory: async (editor) => {
      if (!editor) return;
      const { createSketchShape } = await import("../tldrawHelpers");
      createSketchShape(editor, "diamond", {
        label: "Decision",
        fill: "green",
      });
    },
  },
];
