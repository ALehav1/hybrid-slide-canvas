import React from 'react';
import { ChatPanel } from './Chat/ChatPanel';

/**
 * RightSidebar Component
 * This component renders the right sidebar, which contains the AI chat panel.
 * @returns {React.ReactElement} The rendered right sidebar.
 */
export const RightSidebar: React.FC = () => {
  return (
    <aside className="w-[350px] bg-gray-50 border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
      </div>
      <div className="flex-grow min-h-0">
        <ChatPanel />
      </div>
    </aside>
  );
}
