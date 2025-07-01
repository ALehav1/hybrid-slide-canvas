/**
 * Centralized mock for the nanoid library.
 * Use with vi.mock('nanoid', () => import('./test-utils/mocks/nanoid'))
 */
import { vi } from 'vitest';

// Create a predictable mock implementation for tests
export const nanoid = vi.fn(() => 'mock-nanoid-id');

// Allow customizing the return value when needed
export const setMockId = (id: string) => nanoid.mockReturnValue(id);

// Reset the mock to default behavior
export const resetMock = () => nanoid.mockImplementation(() => 'mock-nanoid-id');

export default { nanoid, setMockId, resetMock };
