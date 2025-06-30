/**
 * Manual mock for the nanoid library.
 * Jest will automatically use this mock in all tests.
 * See: https://jestjs.io/docs/manual-mocks
 */
export const nanoid = jest.fn(() => 'mock-nanoid-id');
