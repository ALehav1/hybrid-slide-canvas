import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock the logger
vi.mock('../lib/utils/logging', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocking
import { logger } from '../lib/utils/logging';

// Create a component that throws an error with proper typing
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    // Use a deterministic error object that can be referenced elsewhere
    throw boundaryError;
  }
  return <div>No Error</div>;
};

// Define a deterministic error object for stricter assertions
const boundaryError = new Error('Test error');

describe('ErrorBoundary', () => {
  // Suppress React's error logging during tests
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    console.error = vi.fn();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    console.error = originalConsoleError;
  });

  test('renders children when no error occurs', () => {
    renderWithErrorBoundary(<div data-testid="test-child">Test Content</div>);

    const child = screen.getByTestId('test-child');
    expect(child).toBeInTheDocument();
    expect(child.textContent).toBe('Test Content');
    
    // Verify logger was not called
    expect(logger.error).not.toHaveBeenCalled();
  });

  // Helper function to render components wrapped in ErrorBoundary
  const renderWithErrorBoundary = (ui: React.ReactNode) => {
    return render(<ErrorBoundary>{ui}</ErrorBoundary>);
  };

  test('renders fallback UI when error occurs', () => {
    // Using try-catch because error boundaries only catch errors during rendering
    try {
      renderWithErrorBoundary(<ThrowError />);
    } catch (error) {
      // Error boundary will catch the error in real usage
    }

    // Check if the fallback UI is rendered
    const fallback = screen.getByRole('alert');
    expect(fallback).toBeInTheDocument();
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    expect(screen.getByText('We\'ve logged the error and our team will look into it.')).toBeInTheDocument();
    
    // Check for error details
    const details = screen.getByText('Error Details');
    expect(details).toBeInTheDocument();
    
    // Verify logger was called with the specific error instance
    expect(logger.error).toHaveBeenCalledWith(
      'Caught by Error Boundary:',
      expect.objectContaining({
        error: boundaryError,
      })
    );
  });

  test('does not render fallback UI when shouldThrow is false', () => {
    renderWithErrorBoundary(<ThrowError shouldThrow={false} />);

    // Check that the component renders normally
    expect(screen.getByText('No Error')).toBeInTheDocument();
    
    // Verify no error alert is present
    const alerts = screen.queryByRole('alert');
    expect(alerts).toBeNull();
    
    // Verify logger was not called
    expect(logger.error).not.toHaveBeenCalled();
  });
});
