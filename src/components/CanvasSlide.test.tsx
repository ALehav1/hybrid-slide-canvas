import React from 'react';
import { render, screen } from '@testing-library/react';
import { CanvasSlide } from './CanvasSlide';
import { vi, describe, test, expect, beforeEach } from 'vitest';
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

    // Simulate the onMount callback being triggered
    const mountTrigger = screen.getByTestId('mock-mount-trigger');
    mountTrigger.click();

    // Check if the onEditorMount callback was called
    expect(mockOnEditorMount).toHaveBeenCalledTimes(1);
    expect(mockOnEditorMount).toHaveBeenCalledWith(expect.any(Object));
  });

  test('applies theme to editor when mounted', () => {
    render(
      <CanvasSlide 
        slideId="test-slide-1" 
        onEditorMount={mockOnEditorMount}
      />
    );

    // Simulate the onMount callback being triggered
    const mountTrigger = screen.getByTestId('mock-mount-trigger');
    mountTrigger.click();

    // Check if the theme was applied
    expect(applyTheme).toHaveBeenCalledTimes(1);
    expect(applyTheme).toHaveBeenCalledWith(expect.any(Object));
  });
});
