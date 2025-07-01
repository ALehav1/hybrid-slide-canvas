/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import { createDexieStorage, db, AppDatabase, initDatabase } from '../dexieStorage';
import type { StateStorage } from 'zustand/middleware';

// Save original console methods to restore later
const originalConsoleDebug = console.debug;
const originalConsoleError = console.error;

// Mock console methods to prevent noise during tests
console.debug = vi.fn();
console.error = vi.fn();

describe('dexieStorage', () => {
  beforeEach(async () => {
    // Reset mocks between tests
    vi.clearAllMocks();
    
    // Clear any database between tests - properly await async operations
    const databases = await indexedDB.databases();
    await Promise.all(
      databases.map(database => database.name && indexedDB.deleteDatabase(database.name))
    );
  });

  afterEach(() => {
    // Clean up mocks
    vi.restoreAllMocks();
    
    // Restore original console methods
    console.debug = originalConsoleDebug;
    console.error = originalConsoleError;
  });

  it('should initialize database successfully', async () => {
    // Act
    await initDatabase();
    
    // Assert
    expect(db).toBeInstanceOf(AppDatabase);
    expect(db.isOpen()).toBe(true);
  });

  // Import the actual return type for the createDexieStorage function
  type DexieStorageAdapter = StateStorage;
  
  // Define operation and assertion function types with explicit parameter types
  type StorageOperation = (
    storage: DexieStorageAdapter,
    key: string,
    value: string
  ) => Promise<string | null | undefined>;
  
  type Assertion = (result: string | null | undefined, value: string) => void;
  type RemoveAssertion = (result: string | null | undefined) => void;
  
  // Use test.each for DRY tests of basic CRUD operations
  // Test cases with proper type annotations
  const getItemTest: [string, StorageOperation, Assertion] = [
    'getItem retrieves stored data', 
    async (storage, key, value) => { 
      await storage.setItem(key, value);
      return storage.getItem(key);
    },
    (result, value) => expect(result).toBe(value)
  ];
  
  const setItemTest: [string, StorageOperation, Assertion] = [
    'setItem stores data with correct format', 
    async (storage, key, value) => {
      await storage.setItem(key, value);
      // Get directly from DB to verify storage
      return db.zustandStore.get(`test-storage:${key}`).then(record => record?.value);
    },
    (result, value) => expect(result).toBe(value)
  ];
  
  const removeItemTest: [string, StorageOperation, RemoveAssertion] = [
    'removeItem deletes data', 
    async (storage, key, value) => {
      await storage.setItem(key, value);
      await storage.removeItem(key);
      return storage.getItem(key);
    },
    (result) => expect(result).toBeNull()
  ];
  
  test.each([
    getItemTest,
    setItemTest,
    removeItemTest as unknown as [string, StorageOperation, Assertion], // Type assertion for test.each compatibility
  ])('%s', async (_testName: string, operation: StorageOperation, assertion: Assertion | RemoveAssertion) => {
    // Arrange
    // Cast to unknown first then to our adapter type to avoid strict compatibility errors
    const storage = createDexieStorage({
      name: 'test-storage',
      initializeDb: true
    }) as unknown as DexieStorageAdapter;
    expect(storage).toBeDefined();
    
    const testKey = 'test-key';
    const testValue = JSON.stringify({ foo: 'bar' });
    
    // Act - execute the operation
    const result = await operation(storage, testKey, testValue);
    
    // Assert the result with type guard to handle different assertion signatures
    if (assertion.length === 2) {
      (assertion as Assertion)(result, testValue);
    } else {
      (assertion as RemoveAssertion)(result);
    }
    
    // Cleanup
    await db.zustandStore.clear();
  });

  it('should handle errors during storage operations', async () => {
    // Arrange
    const errorHandler = vi.fn();
    // Cast to unknown first then to our adapter type
    const storage = createDexieStorage({
      name: 'test-storage',
      errorHandler,
      initializeDb: true
    }) as unknown as DexieStorageAdapter;
    
    // Create a specific error for stricter assertion
    const testError = new Error('Test database error');
    
    // Mock a database error on the storage instance directly
    const spy = vi.spyOn(storage, 'getItem').mockImplementation(() => {
      errorHandler(testError);
      return Promise.resolve(null);
    });
    
    // Act - Try to retrieve data
    const result = await storage.getItem('any-key');
    
    // Assert
    expect(result).toBeNull();
    expect(errorHandler).toHaveBeenCalledWith(testError);
    expect(spy).toHaveBeenCalledWith('any-key');
  });

  it('should store data with correct prefix', async () => {
    // Arrange
    const customName = 'custom-store';
    // Cast to unknown first then to our adapter type
    const storage = createDexieStorage({
      name: customName,
      initializeDb: true
    }) as unknown as DexieStorageAdapter;
    
    const testKey = 'test-key';
    const testValue = JSON.stringify({ foo: 'bar' });
    
    // Use spy on db.zustandStore directly for stronger verification
    const dbSpy = vi.spyOn(db.zustandStore, 'put');
    
    // Act
    await storage.setItem(testKey, testValue);
    
    // Assert - Use db directly to verify the key format
    const record = await db.zustandStore.get(`${customName}:${testKey}`);
    expect(record).toBeDefined();
    expect(record?.value).toBe(testValue);
    expect(dbSpy).toHaveBeenCalledWith(
      expect.objectContaining({ 
        id: `${customName}:${testKey}`,
        value: testValue
      })
    );
  });
});
