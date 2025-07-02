import React from 'react';

/**
 * TopNav - Header navigation bar
 * Provides application branding, file operations, and global controls
 * Part of the grid layout system (60px height)
 */
export function TopNav() {
  return (
    <header className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Left: Branding */}
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-gray-900">Hybrid Slide Canvas</h1>
      </div>

      {/* Center: File operations placeholder */}
      <div className="flex items-center space-x-2">
        <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
          File
        </button>
        <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
          Edit
        </button>
        <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
          View
        </button>
      </div>

      {/* Right: User actions */}
      <div className="flex items-center space-x-2">
        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
          Present
        </button>
        <button className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
          Share
        </button>
      </div>
    </header>
  );
}
