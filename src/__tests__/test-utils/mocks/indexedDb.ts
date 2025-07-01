/**
 * Mock implementation of IndexedDB service using Dexie for testing
 * 
 * Provides a factory for creating in-memory test databases with Dexie
 * that match the schema and interface of the real implementation.
 */
import { vi } from 'vitest';
import Dexie from 'dexie';

/**
 * Creates a new in-memory Dexie database for testing
 * This follows the recommended factory pattern for test doubles
 */
export const createMockDB = () => {
  // Create a new in-memory database with a unique name to avoid conflicts
  const testDbName = `hsc-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const db = new Dexie(testDbName);
  
  // Define the schema with tables and indexes matching our production schema
  db.version(1).stores({
    slides: 'id,updatedAt',   // Slide metadata
    slideContent: 'id',      // Slide content (conversations, etc)
    frames: 'slideId',       // TLDraw frame data
    shapes: '[slideId+id]'   // TLDraw shape data
  });

  return db;
};

/**
 * Mock implementations of the IndexedDB service functions
 * These match the interface of our original indexedDb.ts service
 */
export const initDatabase = vi.fn().mockImplementation(() => Promise.resolve());
export const getDatabase = vi.fn().mockImplementation(() => Promise.resolve(createMockDB()));
export const storeData = vi.fn().mockImplementation((_store: string, data: any) => {
  return Promise.resolve(data.id || 'test-key');
});
export const getData = vi.fn().mockImplementation(() => Promise.resolve({}));
export const deleteData = vi.fn().mockImplementation(() => Promise.resolve());
export const getAllData = vi.fn().mockImplementation(() => Promise.resolve([]));
export const clearStore = vi.fn().mockImplementation(() => Promise.resolve());
export const getByIndex = vi.fn().mockImplementation(() => Promise.resolve({}));
export const isIndexedDBSupported = vi.fn().mockReturnValue(true);

// Add logger mock
export const logger = { 
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

/**
 * Helper functions for test setup and manipulation
 */
export const resetMocks = () => {
  vi.clearAllMocks();
};

export const setMockImplementation = <T extends keyof typeof mockExports>(
  method: T,
  implementation: any
) => {
  (mockExports[method] as any).mockImplementation(implementation);
};

export const setMockResolvedValue = <T extends keyof typeof mockExports>(
  method: T,
  value: any
) => {
  (mockExports[method] as any).mockResolvedValue(value);
};

// Define the type of our mock exports for type safety
interface MockExports {
  createMockDB: () => Dexie;
  initDatabase: ReturnType<typeof vi.fn>;
  getDatabase: ReturnType<typeof vi.fn>;
  storeData: ReturnType<typeof vi.fn>;
  getData: ReturnType<typeof vi.fn>;
  deleteData: ReturnType<typeof vi.fn>;
  getAllData: ReturnType<typeof vi.fn>;
  clearStore: ReturnType<typeof vi.fn>;
  getByIndex: ReturnType<typeof vi.fn>;
  isIndexedDBSupported: ReturnType<typeof vi.fn>;
  logger: { error: ReturnType<typeof vi.fn>, warn: ReturnType<typeof vi.fn>, info: ReturnType<typeof vi.fn>, debug: ReturnType<typeof vi.fn> };
  resetMocks: () => void;
  setMockImplementation: <T extends keyof MockExports>(method: T, implementation: any) => void;
  setMockResolvedValue: <T extends keyof MockExports>(method: T, value: any) => void;
}

// Create a single export object for easy mocking
const mockExports: MockExports = {
  createMockDB,
  initDatabase,
  getDatabase,
  storeData,
  getData,
  deleteData,
  getAllData,
  clearStore,
  getByIndex,
  isIndexedDBSupported,
  logger,
  resetMocks,
  setMockImplementation,
  setMockResolvedValue
};

export default mockExports;
