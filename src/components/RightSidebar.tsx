import type { Editor } from '@tldraw/tldraw';
import { ChatPanel } from './Chat/ChatPanel';

/**
 * RightSidebar Props
 */
interface RightSidebarProps {
  editor: Editor | null;
}

/**
 * RightSidebar Component
 * Container for the AI chat panel.
 */
export const RightSidebar: React.FC<RightSidebarProps> = ({ editor }) => {
  return (
    <aside className="w-[350px] bg-gray-50 border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
      </div>
      <div className="flex-grow min-h-0">
        <ChatPanel editor={editor} />
      </div>
    </aside>
  );
}
