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

// Create a component that throws an error
const ThrowError = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No Error</div>;
};

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
    render(
      <ErrorBoundary>
        <div data-testid="test-child">Test Content</div>
      </ErrorBoundary>
    );

    const child = screen.getByTestId('test-child');
    expect(child).toBeInTheDocument();
    expect(child.textContent).toBe('Test Content');
    
    // Verify logger was not called
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('renders fallback UI when error occurs', () => {
    // We need to suppress the error boundary warning in the test
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Using try-catch because error boundaries only catch errors during rendering
    try {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
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
    
    // Verify logger was called with error
    expect(logger.error).toHaveBeenCalledWith(
      'Caught by Error Boundary:',
      expect.objectContaining({
        error: expect.any(Error),
      })
    );
  });

  test('does not render fallback UI when shouldThrow is false', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Check that the component renders normally
    expect(screen.getByText('No Error')).toBeInTheDocument();
    
    // Verify no error alert is present
    const alerts = screen.queryByRole('alert');
    expect(alerts).toBeNull();
    
    // Verify logger was not called
    expect(logger.error).not.toHaveBeenCalled();
  });
});
