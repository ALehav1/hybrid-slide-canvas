/**
 * Dexie mock implementation for testing
 * 
 * This module provides factory functions to create mock Dexie database instances
 * for unit testing. It works with fake-indexeddb to provide a realistic IndexedDB
 * simulation in the testing environment.
 */

import { vi } from 'vitest';
import Dexie from 'dexie';

/**
 * Factory function to create a mock Zustand storage implementation for tests
 * This mock simulates the storage interface expected by Zustand's persist middleware
 */
export const createMockZustandStorage = () => {
  // In-memory storage that mimics localStorage/sessionStorage
  const storage: Record<string, string> = {};

  return {
    getItem: vi.fn(async (name: string): Promise<string | null> => {
      return storage[name] || null;
    }),
    setItem: vi.fn(async (name: string, value: string): Promise<void> => {
      storage[name] = value;
    }),
    removeItem: vi.fn(async (name: string): Promise<void> => {
      delete storage[name];
    })
  };
};

/**
 * Type definition for a mock Dexie database configuration
 */
interface MockDexieConfig {
  name: string;
  tables: Record<string, string | null>;
  initialData?: Record<string, Record<string, any>[]> | undefined;
}

/**
 * Factory function to create a mock Dexie database for testing
 * 
 * @param config Configuration for the mock database
 * @returns A configured Dexie database instance
 */
export const createMockDexieDb = (config: MockDexieConfig): Dexie => {
  class MockDexieDb extends Dexie {
    constructor() {
      super(config.name);
      
      // Define schema based on config
      this.version(1).stores(config.tables);
      
      // Add any initial data if provided
      if (config.initialData) {
        this.on('populate', async (transaction) => {
          for (const [tableName, items] of Object.entries(config.initialData || {})) {
            const table = transaction.table(tableName);
            for (const item of items) {
              await table.add(item);
            }
          }
        });
      }
    }
  }

  // Create database instance
  const db = new MockDexieDb();
  
  return db;
};

/**
 * Setup a mock for our AppDatabase class from dexieStorage.ts
 * This is useful for mocking the entire Dexie storage module
 */
export const mockAppDatabase = (initialData?: Record<string, any>[]) => {
  return createMockDexieDb({
    name: 'hybrid-slide-canvas-test-db',
    tables: {
      zustandStore: 'id' // Primary key is 'id'
    },
    ...(initialData ? { initialData: { zustandStore: initialData } } : {})
  });
};

/**
 * Create a vi.mock for Dexie import - use this in test files
 */
export const setupDexieMock = (initialData?: Record<string, any>[]) => {
  const mockDb = mockAppDatabase(initialData);
  
  vi.mock('../../lib/storage/dexieStorage', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../lib/storage/dexieStorage')>();
    
    return {
      ...actual,
      // Replace the db export with our mock
      db: mockDb,
      // Override the initDatabase function
      initDatabase: vi.fn().mockResolvedValue(undefined),
      // Override the createDexieStorage function
      createDexieStorage: vi.fn().mockReturnValue(createMockZustandStorage())
    };
  });
  
  return mockDb;
};

/**
 * Mock Dexie class for tests
 * This allows us to directly mock the Dexie import using vi.mock('dexie')
 */
class MockDexie extends Dexie {
  zustand: Dexie.Table<{ id: string; value: string }, string>;
  
  constructor(name: string = 'hybrid-slide-canvas-test') {
    super(name);
    this.version(1).stores({ zustand: 'id' });
    this.zustand = this.table('zustand');
  }
}

export default {
  createMockZustandStorage,
  createMockDexieDb,
  mockAppDatabase,
  setupDexieMock,
  MockDexie
};
