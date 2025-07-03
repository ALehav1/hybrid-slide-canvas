/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

// mocks MUST precede real imports
vi.mock('@tldraw/tldraw', () => ({ useEditor: vi.fn() }))
vi.mock('@/lib/shapeLibraries/basic', () => ({
  basicLibrary: [
    {
      id: 'rect1',
      name: 'Test Rectangle',
      preview: '/lib/test-rectangle.png',
      factory: vi.fn().mockResolvedValue(undefined),
    },
    {
      id: 'diamond1',
      name: 'Test Diamond',
      preview: '/lib/test-diamond.png',
      factory: vi.fn().mockResolvedValue(undefined),
    },
  ],
}))

import { useEditor } from '@tldraw/tldraw'
import { basicLibrary } from '@/lib/shapeLibraries/basic'
import { LibraryPanel } from '@/components/LibraryPanel'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('LibraryPanel', () => {
  test('renders items', () => {
    render(<LibraryPanel />)
    expect(screen.getByText('Test Rectangle')).toBeInTheDocument()
    expect(screen.getByText('Test Diamond')).toBeInTheDocument()
  })

  test('invokes factory', async () => {
    vi.useFakeTimers()
    ;(useEditor as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ id: 'editor' })

    render(<LibraryPanel />)
    await userEvent.click(screen.getByText('Test Rectangle'))

    expect(basicLibrary[0].factory).toHaveBeenCalledTimes(1)
    await vi.runAllTimersAsync()
  })

  test('renders the library items correctly', () => {
    vi.useFakeTimers();
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

  test('calls factory function and manages timers correctly', async () => {
    vi.useFakeTimers();
    const mockEditor = { id: 'mock-editor' };
    (useEditor as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockEditor);
    const factoryFn = basicLibrary[0].factory;

    render(<LibraryPanel />);

    const item = await screen.findByText('Test Rectangle');
    await userEvent.click(item);

    // Verify that factory was called with the editor
    expect(factoryFn).toHaveBeenCalledTimes(1);
    expect(factoryFn).toHaveBeenCalledWith(mockEditor);

    // The component has a 500ms setTimeout to clear the 'clicked' state.
    // We must advance timers to execute it and prevent leaks.
    await vi.runAllTimersAsync();
  });

  test('does not call factory function when editor is null, but still handles timers', async () => {
    vi.useFakeTimers();
    (useEditor as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const factoryFn = basicLibrary[0].factory;

    render(<LibraryPanel />);

    const item = await screen.findByText('Test Rectangle');
    await userEvent.click(item);

    // Verify factory was not called
    expect(factoryFn).not.toHaveBeenCalled();

    // The component STILL sets a timer to clear the clicked state, even if the editor is null.
    // We must flush this timer to prevent it from leaking into other tests.
    await vi.runAllTimersAsync();
  });
});
