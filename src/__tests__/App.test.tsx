import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock the OpenAI client to prevent API calls and import.meta errors
vi.mock('../lib/openaiClient');

// Import real store for testing
import { useEnhancedSlidesStore } from '../state/enhancedSlidesStore';
const initialEnhancedState = useEnhancedSlidesStore.getState();

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
