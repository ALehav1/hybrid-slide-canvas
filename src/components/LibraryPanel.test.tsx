import { afterEach, describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom';

// ────── mocks (must come first) ──────
vi.mock('@tldraw/tldraw', () => ({
  useEditor: vi.fn(),
}));

// Correct path based on find_by_name result.
// NOTE: The path is relative to the test file's location.
vi.mock('../lib/shapeLibraries/basic', () => ({
  basicLibrary: [
    {
      id: 'rect1',
      name: 'Test Rectangle',
      icon: '/lib/test-rectangle.png',
      factory: vi.fn(),
    },
    {
      id: 'diamond1',
      name: 'Test Diamond',
      icon: '/lib/test-diamond.png',
      factory: vi.fn(),
    },
  ],
}));

// ────── imports ──────
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ────── imports that depend on the mocks ──────
import { useEditor } from '@tldraw/tldraw';
import { basicLibrary } from '../lib/shapeLibraries/basic';
import { LibraryPanel } from './LibraryPanel';

describe('LibraryPanel', () => {
  test('renders the library items correctly', () => {
    render(<LibraryPanel />);

    // Check for the names
    expect(screen.getByText('Test Rectangle')).toBeInTheDocument();
    expect(screen.getByText('Test Diamond')).toBeInTheDocument();

    // Check for the images and their attributes
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', '/lib/test-rectangle.png');
    expect(images[0]).toHaveAttribute('alt', 'Test Rectangle');
    expect(images[1]).toHaveAttribute('src', '/lib/test-diamond.png');
    expect(images[1]).toHaveAttribute('alt', 'Test Diamond');
  });

  test('calls factory function when library item is clicked and editor exists', async () => {
    const mockEditor = { id: 'mock-editor' };
    (useEditor as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockEditor);

    const factoryFn = basicLibrary[0].factory;

    render(<LibraryPanel />);

    const item = await screen.findByText('Test Rectangle');
    await userEvent.click(item);

    // Verify that factory was called with the editor
    expect(factoryFn).toHaveBeenCalledTimes(1);
    expect(factoryFn).toHaveBeenCalledWith(mockEditor);
  });

  test('does not call factory function when library item is clicked and editor is null', async () => {
    (useEditor as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const factoryFn = basicLibrary[0].factory;

    render(<LibraryPanel />);

    const item = await screen.findByText('Test Rectangle');
    await userEvent.click(item);

    expect(factoryFn).not.toHaveBeenCalled();
  });
});

// ────── suite-level hygiene ──────
afterEach(() => {
  vi.restoreAllMocks(); // remove spies, resets mock state
  vi.runOnlyPendingTimers(); // flush queued timers
  // @ts-expect-error - getPendingTimers() is not in the type definitions but exists
  expect(vi.getPendingTimers()).toHaveLength(0); // assert no timers are left
  vi.useRealTimers(); // restore real timers
  vi.resetModules(); // clear module cache for next file
});
