/**
 * Dexie-based storage implementation for Zustand persistence middleware
 * 
 * This module provides a Dexie implementation of the storage interface required by
 * Zustand's persist middleware, using createJSONStorage.
 * 
 * Benefits over localStorage:
 * - Higher storage limits (no 5MB restriction)
 * - Better performance for large datasets
 * - More reliable persistence
 * - Transactions and error handling
 */

import Dexie from 'dexie';
import { createJSONStorage } from 'zustand/middleware';
import { logger } from '../utils/logging';

// Create our Dexie database with schema
export class AppDatabase extends Dexie {
  // Define tables
  zustandStore!: Dexie.Table<{ id: string; value: string }, string>;
  
  constructor() {
    super('hybrid-slide-canvas-db');
    
    // Define schema
    this.version(1).stores({
      zustandStore: 'id' // Primary key is 'id'
    });
    
    // Add schema versioning stub for future migrations
    // When making schema changes:
    // 1. Increment version number
    // 2. Define schema changes in the upgrade function
    // 3. Update any related code that uses the schema
    this.version(2).upgrade(() => {
      // Example upgrade logic:
      // - Add new tables
      // - Modify existing tables
      // - Migrate data between tables
      logger.debug('Dexie upgrade to version 2 ready for implementation');
      // No actual changes in this stub version
    });
  }
}

// Create Dexie instance (singleton)
export const db = new AppDatabase();

// Add versionchange handler to close DB when another tab upgrades the DB version
// This avoids locks when multiple tabs are open and one of them upgrades the schema
db.on('versionchange', () => {
  logger.info('Database version changed in another tab, closing connection');
  db.close();
  // Optional: notify user to reload for new version
});

/**
 * Initializes the database
 * @returns A promise that resolves when the database is initialized
 */
export const initDatabase = async (): Promise<void> => {
  try {
    // Open the database (this will create it if it doesn't exist)
    await db.open();
    logger.debug('Dexie database initialized successfully');
    return Promise.resolve();
  } catch (error) {
    logger.error('Failed to initialize Dexie database', error);
    return Promise.reject(error);
  }
};

/**
 * Create Zustand-compatible storage using Dexie
 * This implements the storage interface expected by Zustand's persist middleware
 * 
 * @param options Configuration options
 * @returns Storage object compatible with Zustand's persist middleware
 */
export const createDexieStorage = (options?: { 
  name?: string; 
  errorHandler?: (error: Error) => void;
  initializeDb?: boolean;
}) => {
  const storeName = options?.name || 'zustand-store';
  const errorHandler = options?.errorHandler || ((error: Error) => {
    logger.error('Dexie storage error', error);
  });
  
  // Automatically initialize the database if requested
  if (options?.initializeDb !== false) {
    initDatabase().catch(errorHandler);
  }
  
  // Create JSON storage using Dexie
  return createJSONStorage(() => ({
    getItem: async (name: string): Promise<string | null> => {
      try {
        const id = `${storeName}:${name}`;
        const record = await db.zustandStore.get(id);
        logger.debug('Dexie storage: Retrieved item', { name, found: !!record });
        return record?.value || null;
      } catch (error) {
        errorHandler(error as Error);
        return null;
      }
    },
    
    setItem: async (name: string, value: string): Promise<void> => {
      try {
        const id = `${storeName}:${name}`;
        await db.zustandStore.put({ id, value });
        logger.debug('Dexie storage: Stored item', { name, size: value.length });
      } catch (error) {
        errorHandler(error as Error);
      }
    },
    
    removeItem: async (name: string): Promise<void> => {
      try {
        const id = `${storeName}:${name}`;
        await db.zustandStore.delete(id);
        logger.debug('Dexie storage: Removed item', { name });
      } catch (error) {
        errorHandler(error as Error);
      }
    }
  }));
};

export default createDexieStorage;
