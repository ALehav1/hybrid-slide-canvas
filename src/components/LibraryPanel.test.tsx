import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryPanel } from './LibraryPanel';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock the TLDraw useEditor hook
vi.mock('@tldraw/tldraw', () => ({
  useEditor: vi.fn(),
}));

// Import after mocking
import { useEditor } from '@tldraw/tldraw';

// Mock the basic library
vi.mock('../lib/shapeLibraries/basic', () => ({
  basicLibrary: [
    {
      id: 'lib-test-rect',
      name: 'Test Rectangle',
      preview: '/lib/test-rect.png',
      factory: vi.fn().mockImplementation(() => Promise.resolve()),
    },
    {
      id: 'lib-test-diamond',
      name: 'Test Diamond',
      preview: '/lib/test-diamond.png',
      factory: vi.fn().mockImplementation(() => Promise.resolve()),
    },
  ],
}));

// Import after mocking
import { basicLibrary } from '../lib/shapeLibraries/basic';

describe('LibraryPanel', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure useEditor returns null by default
    (useEditor as unknown as ReturnType<typeof vi.fn>).mockReset();
  });
  test('renders library panel with header', () => {
    // Mock the editor as null first
    (useEditor as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    
    render(<LibraryPanel />);
    
    // Check if the header is rendered
    expect(screen.getByText('📚 Library')).toBeInTheDocument();
  });

  test('renders all library items', () => {
    // Mock the editor as null first
    (useEditor as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    
    render(<LibraryPanel />);
    
    // Check if all library items are rendered
    expect(screen.getByText('Test Rectangle')).toBeInTheDocument();
    expect(screen.getByText('Test Diamond')).toBeInTheDocument();
    
    // Check if images are rendered with correct attributes
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', '/lib/test-rect.png');
    expect(images[0]).toHaveAttribute('alt', 'Test Rectangle');
    expect(images[1]).toHaveAttribute('src', '/lib/test-diamond.png');
    expect(images[1]).toHaveAttribute('alt', 'Test Diamond');
  });

  test('calls factory function when library item is clicked and editor exists', () => {
    // Mock the editor
    const mockEditor = { id: 'mock-editor' };
    (useEditor as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockEditor);
    
    render(<LibraryPanel />);
    
    // Click on the first library item
    fireEvent.click(screen.getByText('Test Rectangle'));
    
    // Verify that factory was called with the editor
    expect(basicLibrary[0].factory).toHaveBeenCalledTimes(1);
    expect(basicLibrary[0].factory).toHaveBeenCalledWith(mockEditor);
  });
  
  test('does not call factory function when library item is clicked and editor is null', () => {
    // Mock the editor as null
    (useEditor as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    
    render(<LibraryPanel />);
    
    // Click on the first library item
    fireEvent.click(screen.getByText('Test Rectangle'));
    
    // Verify that factory was NOT called when editor is null (due to short-circuit evaluation)
    expect(basicLibrary[0].factory).not.toHaveBeenCalled();
  });
});
