/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mockDexie } from '../../../__tests__/test-utils/mocks';
import createDexieStorage, { db, AppDatabase, initDatabase } from '../dexieStorage';

// Mock console methods to prevent noise during tests
console.debug = vi.fn();
console.error = vi.fn();

describe('dexieStorage', () => {
  beforeEach(() => {
    // Reset mocks between tests
    vi.clearAllMocks();
    
    // Clear any database between tests
    indexedDB.databases().then((databases) => {
      databases.forEach((database) => {
        if (database.name) {
          indexedDB.deleteDatabase(database.name);
        }
      });
    });
  });

  afterEach(() => {
    // Clean up
    vi.restoreAllMocks();
  });

  it('should initialize database successfully', async () => {
    // Act
    await initDatabase();
    
    // Assert
    expect(db).toBeInstanceOf(AppDatabase);
    expect(db.isOpen()).toBe(true);
  });

  it('should store and retrieve data using dexie storage adapter', async () => {
    // Arrange
    const storage = createDexieStorage({
      name: 'test-storage',
      initializeDb: true
    });
    
    const testKey = 'test-key';
    const testValue = JSON.stringify({ foo: 'bar' });
    
    // Act - Store data
    await storage.setItem(testKey, testValue);
    
    // Act - Retrieve data
    const retrieved = await storage.getItem(testKey);
    
    // Assert
    expect(retrieved).toBe(testValue);
  });

  it('should remove data when using removeItem', async () => {
    // Arrange
    const storage = createDexieStorage({
      name: 'test-storage',
      initializeDb: true
    });
    
    const testKey = 'test-key';
    const testValue = JSON.stringify({ foo: 'bar' });
    
    // Act - Store and then remove data
    await storage.setItem(testKey, testValue);
    await storage.removeItem(testKey);
    
    // Act - Try to retrieve deleted data
    const retrieved = await storage.getItem(testKey);
    
    // Assert
    expect(retrieved).toBeNull();
  });

  it('should handle errors during storage operations', async () => {
    // Arrange
    const errorHandler = vi.fn();
    const storage = createDexieStorage({
      name: 'test-storage',
      errorHandler,
      initializeDb: true
    });
    
    // Mock a database error
    vi.spyOn(db.zustandStore, 'get').mockRejectedValueOnce(new Error('Test error'));
    
    // Act - Try to retrieve data
    const result = await storage.getItem('any-key');
    
    // Assert
    expect(result).toBeNull();
    expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should store data with correct prefix', async () => {
    // Arrange
    const customName = 'custom-store';
    const storage = createDexieStorage({
      name: customName,
      initializeDb: true
    });
    
    const testKey = 'test-key';
    const testValue = JSON.stringify({ foo: 'bar' });
    
    // Act
    await storage.setItem(testKey, testValue);
    
    // Assert - Use db directly to verify the key format
    const record = await db.zustandStore.get(`${customName}:${testKey}`);
    expect(record).toBeDefined();
    expect(record?.value).toBe(testValue);
  });
});
