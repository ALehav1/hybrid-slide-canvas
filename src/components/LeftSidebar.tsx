import type { Editor } from '@tldraw/tldraw';
import { SlideRail } from './SlideRail';
import { LibraryPanel } from './LibraryPanel';

interface LeftSidebarProps {
  editor: Editor | null;
}

/**
 * The left sidebar component, which houses the slide navigation rail
 * and the shape library panel.
 * @returns {React.ReactElement} The rendered left sidebar.
 */
export function LeftSidebar({ editor }: LeftSidebarProps) {
  return (
    <aside
      className="w-sidebar bg-white flex flex-col border-r border-gray-200 shadow-sm"
      aria-label="Left Sidebar"
    >
      {/* This component is responsible for organizing the slide navigation and shape library */}
      <div className="flex-grow flex flex-col">
        {/* In the future, we can add tabs here to switch between slides and library */}
        <SlideRail editor={editor} />
        <div className="border-t border-gray-200 flex-grow">
          <LibraryPanel editor={editor} />
        </div>
      </div>
    </aside>
  );
}
