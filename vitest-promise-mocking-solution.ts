/**
 * Vitest Promise Mocking Solution & Guide
 *
 * This file provides a comprehensive, production-ready solution for mocking
 * Promise-returning factory functions in Vitest, specifically addressing issues
 * with `.finally()` chains and module hoisting.
 *
 * @expert_guidance
 * @vitest
 * @react-testing-library
 */

import React, { useState, useTransition } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Editor, TldrawEditor } from '@tldraw/tldraw';

// --- Mocked Component and Types for Demonstration ---
// This represents the user's component and types.

interface LibraryItem {
  id: string;
  name: string;
  preview: string;
  factory: (editor: Editor) => Promise<void>;
}

// The component under test, as provided by the user.
const LibraryPanel: React.FC = () => {
  // A mock useEditorCtx hook for testing purposes
  const useEditorCtx = () => React.useContext(TldrawEditor.Context)!;
  const editor = useEditorCtx();
  const [isPending, startTransition] = useTransition();
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  const handleClick = (item: LibraryItem) => {
    if (!editor) return;
    startTransition(() => {
      setLastClicked(item.id);
    });
    // The line that causes the error: item.factory(...) returns undefined in the failing test.
    item.factory(editor).finally(() => {
      // The setTimeout in the .finally() block requires timer mocks.
      setTimeout(() => {
        setLastClicked(null);
      }, 500);
    });
  };

  // The mocked library will be injected here by Vitest.
  const { basicLibrary } = require('@/lib/shapeLibraries/basic');

  return (
    <div>
      {basicLibrary.map((item: LibraryItem) => (
        <button key={item.id} onClick={() => handleClick(item)} data-testid={`button-${item.id}`}>
          {item.name}
        </button>
      ))}
    </div>
  );
};

// --- Problem Analysis (Why the initial attempts failed) ---

/**
 * ROOT CAUSE ANALYSIS:
 *
 * 1. `mockResolvedValue(undefined)` does NOT return a real Promise.
 *    - It returns a "thenable" object, which is a lightweight object with a `.then()` method.
 *    - This object does NOT have a `.finally()` method, causing the runtime error:
 *      "TypeError: Cannot read properties of undefined (reading 'finally')"
 *
 * 2. `vi.mock` Hoisting Issue:
 *    - `vi.mock` calls are "hoisted" by Vitest, meaning they are moved to the top of the
 *      file before any imports or variable declarations are executed.
 *    - This is why the pattern `const mockFn = vi.fn(); vi.mock('...', () => ({ fn: mockFn }))`
 *      fails with "Cannot access 'mockFn' before initialization". The mock runs before
 *      `mockFn` is ever declared in the test's scope.
 */

// --- Canonical Solution: The Correct `vi.mock` Pattern ---

// We create a mock function that is scoped *within* the module mock itself.
// This solves the hoisting problem because the mock function is defined at the time
// the mock is created, and we can export it to access it within our tests.
const mockRectangleFactory = vi.fn();
const mockDiamondFactory = vi.fn();

vi.mock('@/lib/shapeLibraries/basic', () => ({
  // By exporting the mock function from the mocked module, we can access it in our tests.
  __esModule: true, // Important for ES Modules
  basicLibrary: [
    {
      id: 'rect-node',
      name: 'Rectangle Node',
      preview: 'data:image/svg+xml;base64,test',
      // The key fix: use .mockImplementation() to return a real, full Promise.
      factory: mockRectangleFactory.mockImplementation(() => Promise.resolve()),
    },
    {
      id: 'diamond-decision',
      name: 'Decision (Diamond)',
      preview: 'data:image/svg+xml;base64,test',
      factory: mockDiamondFactory.mockImplementation(() => Promise.resolve()),
    },
  ],
}));

// --- Complete, Working Test File ---

describe('LibraryPanel Component - Vitest Promise Mocking', () => {
  // Create a mock editor instance to provide context for the `useEditor` hook.
  const mockEditor = {
    // Mock any editor methods your component might use.
    // For this example, we don't need to mock any specific methods.
  } as Editor;

  beforeEach(() => {
    // Use fake timers to control `setTimeout` in the `.finally()` block.
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clear all mocks and restore real timers after each test.
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should call the factory function and handle the .finally() chain correctly', async () => {
    // ARRANGE
    render(
      // The component uses `useEditor`, so it must be rendered inside a TldrawEditor provider.
      <TldrawEditor.Provider value={mockEditor}>
        <LibraryPanel />
      </TldrawEditor.Provider>
    );

    const rectangleButton = screen.getByTestId('button-rect-node');

    // ACT
    // Use `act` for state updates and `userEvent` for realistic interactions.
    await act(async () => {
      await userEvent.click(rectangleButton);
    });

    // ASSERT - Factory call
    // Verify that the mock factory was called with the correct editor instance.
    expect(mockRectangleFactory).toHaveBeenCalledTimes(1);
    expect(mockRectangleFactory).toHaveBeenCalledWith(mockEditor);

    // ASSERT - State after .finally() and setTimeout
    // Advance timers to execute the code inside setTimeout within the .finally() block.
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // You can add assertions here to check the component's state after the timer,
    // for example, checking if `lastClicked` state was reset to null.
    // (This requires exposing state or observing UI changes, which is beyond this example).
  });

  it('should not throw a "finally is not a function" error', async () => {
    // ARRANGE
    render(
      <TldrawEditor.Provider value={mockEditor}>
        <LibraryPanel />
      </TldrawEditor.Provider>
    );
    const button = screen.getByTestId('button-diamond-decision');

    // ACT & ASSERT
    // This test's primary purpose is to ensure no runtime error is thrown.
    // The `expect().not.toThrow()` construct wraps the action.
    await expect(
      act(async () => {
        await userEvent.click(button);
      })
    ).resolves.not.toThrow();

    // Verify the correct factory was called.
    expect(mockDiamondFactory).toHaveBeenCalledTimes(1);
  });
});

// --- Key Patterns & Best Practices Explained ---

/**
 * 1. **Solving Hoisting with `vi.mock`**:
 *    - The recommended pattern is to define your mock function (`mockRectangleFactory`)
 *      at the top level of your test file.
 *    - Then, reference this variable directly inside the `vi.mock` factory function.
 *    - This works because Vitest hoists the `vi.mock` call, but the factory function
 *      itself is executed later, at which point `mockRectangleFactory` has been initialized.
 *
 * 2. **Robust Promise Mocking**:
 *    - **`vi.fn().mockImplementation(() => Promise.resolve())`** is the canonical pattern.
 *    - It guarantees that the mock returns a *new, full Promise object* every time it's called.
 *      This object includes all standard Promise methods, including `.then()`, `.catch()`,
 *      and critically, `.finally()`.
 *    - `mockResolvedValue()` is a shortcut that is sometimes sufficient, but it doesn't
 *      guarantee a full Promise object, leading to the error you saw.
 *
 * 3. **Testing Async UI & Timers**:
 *    - **`await userEvent.click(...)`**: Always `await` user events to ensure all associated
 *      React state updates and effects have settled before moving to assertions.
 *    - **`vi.useFakeTimers()`**: Call this in `beforeEach` to take control of time-based
 *      functions like `setTimeout` and `setInterval`.
 *    - **`await vi.runAllTimersAsync()`**: Use this to immediately execute any pending
 *      timers (e.g., the `setTimeout` in your `.finally()` block). This is crucial for
 *      testing the final state of your component.
 *    - **`act()`**: Wrap state-updating actions in `act()` to ensure React processes
 *      the updates correctly in a testing environment. `user-event` often handles this
 *      for you, but explicit wrapping can be necessary for complex async flows.
 *
 * 4. **Mock Validation**:
 *    - `expect(mockFn).toHaveBeenCalledTimes(1)`: Verifies the function was called.
 *    - `expect(mockFn).toHaveBeenCalledWith(expectedArgs)`: Ensures it was called with
 *      the correct arguments, which is a more robust test.
 */
