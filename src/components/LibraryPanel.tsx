import { basicLibrary } from "../lib/shapeLibraries/basic";
import { useEditor } from "@tldraw/tldraw";

export const LibraryPanel = () => {
  const editor = useEditor();

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <h2 className="font-semibold mb-2">📚 Library</h2>

      {basicLibrary.map((item) => (
        <button
          key={item.id}
          onClick={() => editor && item.factory(editor)}
          className="flex items-center gap-2 w-full mb-2 hover:bg-gray-100 rounded px-2 py-1"
        >
          <img
            src={item.preview}
            alt={item.name}
            className="w-8 h-8 object-contain"
          />
          <span>{item.name}</span>
        </button>
      ))}
    </div>
  );
};
