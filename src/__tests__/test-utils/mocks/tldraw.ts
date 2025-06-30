/**
 * @file Mocks for the tldraw library.
 * This includes a mock for the Editor instance to allow for testing of tldraw interactions.
 */
import { type Editor, createShapeId } from '@tldraw/tldraw';

// We use vi.fn() to create mock functions for the editor methods we use.
// This allows us to track calls and assert that they are made correctly.
export const mockEditor = {
  createShapes: vi.fn(),
  deleteShapes: vi.fn(),
  getShape: vi.fn(),
  getShapePageBounds: vi.fn(),
  zoomToBounds: vi.fn(),
  // Add any other editor methods you need to mock for your tests
} as unknown as Editor;

// We also mock the createShapeId function to ensure predictable IDs in tests.
export const mockCreateShapeId = createShapeId;
