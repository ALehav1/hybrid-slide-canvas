/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock all TLDraw and heavy dependencies before importing App
vi.mock('@tldraw/tldraw', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tldraw/tldraw')>()
  return {
    ...actual,
    Tldraw: ({ children, ...props }: any) => (
      <div data-testid="tldraw-mock" {...props}>
        {children}
      </div>
    ),
  }
});

vi.mock('@tldraw/editor', () => ({
  useEditor: vi.fn(() => ({
    getCurrentToolId: vi.fn(() => 'select'),
    // Add other editor methods as needed
  })),
}));

vi.mock('../components/Toolbar', () => ({
  Toolbar: () => <div data-testid="toolbar-mock">Toolbar</div>,
}));

vi.mock('../components/LibraryPanel', () => ({
  LibraryPanel: () => <div data-testid="library-panel-mock">LibraryPanel</div>,
}));

vi.mock('../components/Chat/ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel-mock">ChatPanel</div>,
}));

vi.mock('../components/ConversationProvider', () => ({
  ConversationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conversation-provider-mock">{children}</div>
  ),
}));

vi.mock('../lib/history/useHistoryManager', () => ({
  useHistoryManager: vi.fn(() => ({
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
    undo: vi.fn(),
    redo: vi.fn(),
  })),
}));

import App from '../App';

// Mock storage and logging
vi.mock('../lib/storage/conversationStorage', () => import('./test-utils/mocks/conversationStorage'));
vi.mock('../lib/utils/logging', () => import('./test-utils/mocks/logging'));
vi.mock('../lib/openaiClient');

describe('App Component', () => {
  it('should render the main layout and mocked children without crashing', () => {
    const { container } = render(<App />);
    
    // Just verify the app renders without throwing
    expect(container).toBeInTheDocument();
    
    // Verify key components are present (mocked versions)
    expect(container.querySelector('[data-testid="conversation-provider-mock"]')).toBeInTheDocument();
  });
});
