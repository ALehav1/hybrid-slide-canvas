/**
 * @file Mocks for the tldraw library.
 * This includes a mock for the Editor instance to allow for testing of tldraw interactions.
 */
import { vi } from 'vitest';
import { type Editor, createShapeId } from '@tldraw/tldraw';

/**
 * Enhanced mock of the TLDraw Editor
 * This implementation provides a more complete mock that matches the interface
 * expected by tests, avoiding TypeScript errors while still providing testability
 */
export const mockEditor = {
  id: 'mock-editor-id',
  user: { id: 'mock-user-id', name: 'Test User' },
  store: { 
    getAllShapes: vi.fn().mockReturnValue([]),
    subscribe: vi.fn(),
    listen: vi.fn(() => vi.fn()), // Return a mock unsubscribe function
    getSnapshot: vi.fn().mockReturnValue({})
  },
  createShapes: vi.fn(),
  select: vi.fn(),
  deleteShapes: vi.fn(),
  getShape: vi.fn(),
  getShapePageBounds: vi.fn(),
  zoomToBounds: vi.fn(),
  history: {
    undo: vi.fn(),
    redo: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    clear: vi.fn(),
    createBranch: vi.fn(),
    squash: vi.fn()
  },
  viewport: {
    camera: { x: 0, y: 0, z: 1 },
    bounds: { x: 0, y: 0, w: 1000, h: 1000 },
  },
  getIsShapeHiddenCache: () => new Map(),
  isShapeHidden: vi.fn().mockReturnValue(false),
  options: {},
  getSelectedShapeIds: vi.fn().mockReturnValue([]),
  getSelectedShapeIdMap: vi.fn().mockReturnValue(new Map()),
  getSelectedShapes: vi.fn().mockReturnValue([]),
  getSvg: vi.fn(),
  // Add any other editor methods you need to mock for your tests
} as unknown as Editor;

// We also mock the createShapeId function to ensure predictable IDs in tests.
export const mockCreateShapeId = createShapeId;
