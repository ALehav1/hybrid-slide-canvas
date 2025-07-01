import { useState, useCallback, useTransition } from "react";
import { basicLibrary } from "../lib/shapeLibraries/basic";
import { useEditor } from "@tldraw/tldraw";

/**
 * Library panel component that displays available shapes and templates
 * Enhanced with React 19 patterns for better UX during shape creation
 */
export const LibraryPanel = () => {
  const editor = useEditor();
  // Track the last clicked item for better UX feedback
  const [lastClickedItemId, setLastClickedItemId] = useState<string | null>(null);
  // Use transition to prevent UI blocking during shape creation
  const [isPending, startTransition] = useTransition();

  // Handle shape creation with improved error handling
  const handleCreateShape = useCallback((item: typeof basicLibrary[number]) => {
    if (!editor) return;
    
    setLastClickedItemId(item.id);
    startTransition(() => {
      try {
        item.factory(editor);
      } catch (error) {
        console.error(`Error creating shape ${item.name}:`, error);
      } finally {
        // Clear the clicked state after a delay
        setTimeout(() => setLastClickedItemId(null), 500);
      }
    });
  }, [editor]);

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <h2 className="font-semibold mb-2">📚 Library</h2>

      {basicLibrary.map((item) => (
        <button
          key={item.id}
          onClick={() => handleCreateShape(item)}
          disabled={isPending}
          data-testid={`library-item-${item.id}`}
          className="flex items-center gap-2 w-full mb-2 hover:bg-gray-100 rounded px-2 py-1"
        >
          <img
            src={item.preview}
            alt={item.name}
            className="w-8 h-8 object-contain"
          />
          <span className={`${lastClickedItemId === item.id ? 'text-blue-600 font-medium' : ''}`}>
            {item.name}
            {lastClickedItemId === item.id && isPending && (
              <span className="ml-1 inline-block animate-pulse">...</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
};
