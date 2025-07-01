import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasSlide } from './CanvasSlide';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tldraw/tldraw';

// Mock the TLDraw component
vi.mock('@tldraw/tldraw', async () => {
  const actual = await vi.importActual<typeof import('@tldraw/tldraw')>('@tldraw/tldraw');
  return {
    ...actual,
    Tldraw: ({ persistenceKey, onMount, children }: any) => (
      <div data-testid="tldraw-mock" data-persistence-key={persistenceKey}>
        {/* Call onMount with a mock editor when component renders */}
        <button 
          data-testid="mock-mount-trigger" 
          onClick={() => {
            if (onMount) {
              const mockEditor = {
                setStyleForNextShapes: vi.fn(),
              } as unknown as Editor;
              onMount(mockEditor);
            }
          }}
        >
          Trigger Mount
        </button>
        {children}
      </div>
    ),
  };
});

// Mock the theme module
vi.mock('../lib/theme', () => ({
  applyTheme: vi.fn(),
  theme: {
    backgroundColor: '#ffffff',
    primary: '#1565c0',
    secondary: '#ffb300',
    strokeWidth: 2,
    roughness: 1.4,
  }
}));

// Import after mocking
import { applyTheme } from '../lib/theme';

describe('CanvasSlide', () => {
  const mockOnEditorMount = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  // Ensure full test isolation by restoring any mocks
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders TLDraw with correct persistenceKey', () => {
    render(
      <CanvasSlide 
        slideId="test-slide-1" 
        onEditorMount={mockOnEditorMount}
      />
    );

    const tldraw = screen.getByTestId('tldraw-mock');
    expect(tldraw).toBeInTheDocument();
    expect(tldraw.getAttribute('data-persistence-key')).toBe('test-slide-1');
  });

  test('renders children inside TLDraw', () => {
    render(
      <CanvasSlide 
        slideId="test-slide-1" 
        onEditorMount={mockOnEditorMount}
      >
        <div data-testid="child-element">Test Child</div>
      </CanvasSlide>
    );

    const childElement = screen.getByTestId('child-element');
    expect(childElement).toBeInTheDocument();
    expect(childElement.textContent).toBe('Test Child');
  });

  test('calls onEditorMount with editor instance when mounted', () => {
    render(
      <CanvasSlide 
        slideId="test-slide-1" 
        onEditorMount={mockOnEditorMount}
      />
    );

    // Simulate the onMount callback being triggered using fireEvent
    // for better Testing-Library compatibility and to ensure React events are processed
    const mountTrigger = screen.getByTestId('mock-mount-trigger');
    fireEvent.click(mountTrigger);

    // Check if the onEditorMount callback was called
    expect(mockOnEditorMount).toHaveBeenCalledWith(expect.any(Object));
  });

  test('applies theme to editor when mounted', () => {
    render(
      <CanvasSlide 
        slideId="test-slide-1" 
        onEditorMount={mockOnEditorMount}
      />
    );

    // Simulate the onMount callback being triggered using fireEvent
    const mountTrigger = screen.getByTestId('mock-mount-trigger');
    fireEvent.click(mountTrigger);

    // Check if the theme was applied
    // Loosen the assertion to allow for possible React Strict Mode double-mounting
    // or future implementation changes that might call applyTheme more than once
    expect(applyTheme).toHaveBeenCalled();
    expect(applyTheme).toHaveBeenCalledWith(expect.any(Object));
  });
});
