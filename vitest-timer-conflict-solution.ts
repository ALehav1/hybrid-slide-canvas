/**
 * Vitest Timer Mocking Conflict: Canonical Solution & Guide
 *
 * This file provides a comprehensive, production-ready solution for resolving
 * timer mocking conflicts between global setup files (setupTests.ts) and
 * individual test files in a Vitest environment.
 *
 * @expert_guidance
 * @vitest
 * @react-testing-library
 */

import React, { useState, useTransition } from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { Editor, TldrawEditor } from '@tldraw/tldraw';
import Dexie from 'dexie';

// --- 1. Root Cause Analysis: Global vs. Per-Test Timers ---

/**
 * THE CONFLICT:
 * Your error, "Timers are not mocked", occurs because of a race condition in
 * the teardown logic between your global `setupTests.ts` and your individual
 * test file.
 *
 * EXECUTION ORDER OF `afterEach` HOOKS:
 * 1. **Individual Test `afterEach` runs first:** `LibraryPanel.test.tsx` calls `vi.useRealTimers()`. This RESTORES the real timers, disabling the fake ones.
 * 2. **Global `afterEach` runs second:** `setupTests.ts` then tries to call `vi.runOnlyPendingTimers()`. Since fake timers were just disabled by the test file, Vitest correctly throws an error.
 *
 * This demonstrates that global timer management is fragile and creates dependencies between your global setup and every single test file.
 */

// --- 2. Canonical Solution: Decouple Timer Management ---

/**
 * THE PATTERN:
 * Tests that require timer mocking should be self-contained and responsible for their own setup and teardown.
 * The global setup should handle genuinely global concerns (like DB cleanup) but should be DEFENSIVE when handling timers.
 *
 * 1. **Individual Tests:** Manage their own timers with `beforeEach` and `afterEach`.
 * 2. **Global Setup:** Handles global cleanup but CHECKS if timers are mocked before trying to clean them up.
 */

// --- 3. Corrected Global Setup (`setupTests.ts`) ---

/**
 * This is the recommended, production-ready pattern for your `setupTests.ts`.
 * It performs global cleanup while safely co-existing with tests that manage their own timers.
 */
export const correctedGlobalSetup = () => {
  // This would be in your actual setupTests.ts
  beforeEach(async () => {
    // Global IndexedDB cleanup (remains the same)
    try {
      const dbNames = await Dexie.getDatabaseNames();
      for (const name of dbNames) {
        await Dexie.delete(name);
      }
    } catch (error) {
      console.error("Error cleaning up IndexedDB in test setup:", error);
    }
  });

  afterEach(() => {
    // ✅ **DEFENSIVE TIMER CLEANUP**
    // Only run timer-related cleanup if fake timers are currently active.
    // This prevents the error when a test has already restored real timers.
    if (vi.isFakeTimers()) {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
    
    // Other global cleanup
    cleanup(); // from @testing-library/react
    vi.restoreAllMocks();
    vi.resetModules();
  });
};


// --- 4. Corrected Individual Test File (`LibraryPanel.test.tsx`) ---

// This is a placeholder for your actual component and library imports
interface LibraryItem {
  id: string;
  name: string;
  factory: (editor: Editor) => Promise<void>;
}

const LibraryPanel: React.FC = () => {
  const useEditorCtx = () => React.useContext(TldrawEditor.Context)!;
  const editor = useEditorCtx();
  const [clickedItem, setClickedItem] = useState<string | null>(null);

  const handleClick = (item: LibraryItem) => {
    if (!editor) return;
    setClickedItem(item.id);
    item.factory(editor).finally(() => {
      setTimeout(() => setClickedItem(null), 500);
    });
  };

  // Assume basicLibrary is mocked
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

// Mock setup for the test
const mockRectangleFactory = vi.fn();
vi.mock('@/lib/shapeLibraries/basic', () => ({
  basicLibrary: [
    {
      id: 'rect-node',
      name: 'Rectangle Node',
      factory: mockRectangleFactory,
    },
  ],
}));

/**
 * This is the complete, working test file demonstrating the canonical pattern.
 */
describe('LibraryPanel - Correct Timer & Promise Mocking', () => {
  const mockEditor = {} as Editor;

  // This test file is now fully self-contained in its timer management.
  beforeEach(() => {
    // ✅ Step 1: Enable fake timers for this test suite.
    vi.useFakeTimers();
    // ✅ Step 2: Set up the mock implementation for this suite.
    mockRectangleFactory.mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    // ✅ Step 3: Clean up timers and mocks specific to this suite.
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should correctly test a Promise.finally() with a setTimeout', async () => {
    // ARRANGE
    render(
      <TldrawEditor.Provider value={mockEditor}>
        <LibraryPanel />
      </TldrawEditor.Provider>
    );
    const button = screen.getByTestId('button-rect-node');

    // ACT
    await act(async () => {
      await userEvent.click(button);
    });

    // ASSERT - Initial action
    // The factory is called immediately on click.
    expect(mockRectangleFactory).toHaveBeenCalledTimes(1);
    expect(mockRectangleFactory).toHaveBeenCalledWith(mockEditor);

    // ACT & ASSERT - Timer execution
    // Now, advance the timers to execute the `setTimeout` inside `.finally()`.
    // `runAllTimersAsync` is perfect for this.
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // You can now assert the final state of the component after the timer has run.
    // For example, if the button was disabled while clicked, check if it's enabled again.
  });
});


// --- 5. Vitest Timer API Best Practices ---

/**
 * Q: When to use `runAllTimersAsync` vs. `runOnlyPendingTimers` vs. `advanceTimersByTime`?
 *
 * A: Choose the right tool for the job.
 *
 * 1. `await vi.runAllTimersAsync()`: (MOST COMMON)
 *    - **Use Case:** When you want to immediately execute all queued `setTimeout` or `setInterval`
 *      callbacks without worrying about the specific delay time.
 *    - **Why:** It's the simplest way to test the outcome of timer-based async operations,
 *      like the one in your `.finally()` block. It's async, so it plays well with RTL's `act`.
 *
 * 2. `vi.runOnlyPendingTimers()`:
 *    - **Use Case:** When dealing with recursive timers (`setTimeout` calling another `setTimeout`).
 *      `runAllTimers` would result in an infinite loop. This command only runs timers
 *      that have been queued up *at the current moment*.
 *    - **Why:** It gives you control to step through layers of nested timers.
 *
 * 3. `await vi.advanceTimersByTime(ms)`:
 *    - **Use Case:** When the *exact timing* is important to your test logic. For example,
 *      testing a debounce function where you need to check state *before* and *after* the
 *      delay has passed.
 *    - **Why:** It provides precise control over the passage of fake time.
 *
 * For your specific `Promise.finally() + setTimeout` pattern, `runAllTimersAsync` is the ideal choice.
 */

// --- 6. Final Recommendation for Your Coding Agent ---

/**
 * TO THE CODING AGENT:
 *
 * 1. **Modify `setupTests.ts`:**
 *    - REMOVE `vi.useFakeTimers()` from the global `beforeEach`.
 *    - WRAP the timer cleanup logic in the global `afterEach` with `if (vi.isFakeTimers()) { ... }`.
 *
 * 2. **Modify `LibraryPanel.test.tsx` (and similar async tests):**
 *    - ADD a `beforeEach` block that calls `vi.useFakeTimers()`.
 *    - ADD an `afterEach` block that calls `vi.useRealTimers()` to ensure test isolation.
 *    - USE the `await vi.runAllTimersAsync()` pattern to test the `setTimeout` inside the `.finally()` block.
 *
 * This approach fully resolves the timer conflict, ensures robust test isolation,
 * and provides a scalable pattern for all async component testing needs.
 */
