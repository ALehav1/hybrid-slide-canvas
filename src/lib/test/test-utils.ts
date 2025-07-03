/**
 * Vitest test utilities for handling timers, async operations, and store state.
 * This file centralizes test setup and helpers to ensure consistency and reduce boilerplate.
 */
import { vi } from 'vitest';
import { act } from '@testing-library/react';

/**
 * A wrapper around `act` to handle async operations in tests.
 * Ensures that all updates are processed before moving on.
 * @param callback The async function to execute within `act`.
 */
export async function asyncAct<T>(callback: () => Promise<T>): Promise<T> {
	let result: T | undefined;
	await act(async () => {
		result = await callback();
	});
	return result as T;
}

/**
 * Advances fake timers by a specified amount within an `act` block.
 * @param ms The number of milliseconds to advance the timers by.
 */
export async function advanceTimers(ms: number): Promise<void> {
	await asyncAct(async () => {
		vi.advanceTimersByTime(ms);
	});
}

/**
 * Resets a Zustand store to its initial state.
 * This is a generic helper that works with any Zustand store that has a `setState` method.
 * @param store The Zustand store to reset.
 * @param initialState The initial state to which the store should be reset.
 */
export function resetStore<T>(store: { setState: (fn: (state: T) => T) => void }, initialState: T): void {
	store.setState(() => initialState);
}

/**
 * Sets up and tears down the test environment for each test file.
 * - Uses fake timers to control time-based operations (e.g., debounce).
 * - Resets all mocks and timers after each test to ensure isolation.
 */
export function setupTestEnvironment(): void {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
		vi.restoreAllMocks(); // Resets mocks, but not spies. Use spy.mockRestore() if needed.
	});
}
