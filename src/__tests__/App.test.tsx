import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock the OpenAI client to prevent API calls and import.meta errors
vi.mock('../lib/openaiClient');

// Mock the enhanced slides store to provide a stable state for the App component
vi.mock('../state/enhancedSlidesStore', () => ({
  useEnhancedSlidesStore: vi.fn(() => ({
    slides: [
      { id: '1', number: 1, frameId: 'frame1', conversation: [], createdAt: new Date().toISOString(), title: 'Slide 1' },
      { id: '2', number: 2, frameId: 'frame2', conversation: [], createdAt: new Date().toISOString(), title: 'Slide 2' },
    ],
    currentSlide: 1,
    totalSlides: 2,
    addNewSlide: vi.fn(),
    deleteSlide: vi.fn(),
    jumpToSlide: vi.fn(),
    navigateSlide: vi.fn(),
    reorderSlides: vi.fn(),
    getCurrentSlide: vi.fn(() => ({ id: '1', number: 1, frameId: 'frame1', conversation: [], createdAt: new Date().toISOString(), title: 'Slide 1' })),
    setShowSlideNavigator: vi.fn(),
    setDraggedSlide: vi.fn(),
    setDragOverSlide: vi.fn(),
    showSlideNavigator: true,
    draggedSlide: null,
    dragOverSlide: null,
  })),
}));

// Mock child components that have complex dependencies like `useEditor`
vi.mock('../components/LibraryPanel', () => ({
  LibraryPanel: () => (
    <div>
      <h3>📚 Library</h3>
    </div>
  ),
}));

vi.mock('../components/Chat/ChatPanel', () => ({
  ChatPanel: () => <div>Chat Panel Mock</div>,
}));

vi.mock('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/CanvasSlide', () => ({
  CanvasSlide: ({ children }: { children: React.ReactNode }) => (
    <div>
      <div>Canvas Slide Mock</div>
      {children}
    </div>
  ),
}));

describe('App Component', () => {
  it('should render the main layout and mocked children without crashing', () => {
    render(<App />);

    // Check for the heading from the mocked LibraryPanel
    expect(screen.getByText(/📚 Library/i)).toBeInTheDocument();

    // Check for the main landmark role
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();

    // Check that our other mocked components are rendered
    expect(screen.getByText('Chat Panel Mock')).toBeInTheDocument();
    expect(screen.getByText('Canvas Slide Mock')).toBeInTheDocument();
  });
});
