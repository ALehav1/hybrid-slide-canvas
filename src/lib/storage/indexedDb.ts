/**
 * Corrected IndexedDB Database Service
 * 
 * Provides type-safe, low-level access to IndexedDB with proper generic constraints.
 * Fixes all type constraint failures and generic typing issues.
 * 
 * @module indexedDb
 */

import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb';
import { logger } from '../utils/logging';

// Database configuration
const DB_NAME = 'hybrid-slide-canvas';
const DB_VERSION = 1;

/**
 * Database schema definition
 */
export interface HybridCanvasDB extends DBSchema {
  // Slides store - contains slide metadata (not the full content)
  slides: {
    key: string;
    value: {
      id: string;
      title: string;
      updatedAt: number;
      thumbnailUrl?: string;
        /**
         * Optional field used by persistence middleware to store
         * serialized Zustand state blobs. Kept optional so legacy data
         * (which never had this property) stays type-compatible.
         */
        value?: unknown;
    };
    indexes: {
      'by-updated': number;
    };
  };
  
  // Slide content store - contains full slide content including shapes
  // Separated from metadata for performance optimization
  slideContent: {
    key: string; // slide ID
    value: any; // Full slide data including shapes and canvas state
  };
  
  // Conversations store - contains conversation history
  conversations: {
    key: string; // slide ID
    value: {
      slideId: string;
      messages: {
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
      }[];
      lastModified: number;
        /**
         * Optional serialized blob written by the persistence middleware.
         * Existing conversation records will not include it, so it must be
         * optional.
         */
        value?: unknown;
    };
    indexes: {
      'by-modified': number;
    };
  };
  
  // Settings store - contains user settings and preferences
  settings: {
    key: string;
    value: any;
  };
}

// Define store names as a literal union type to avoid type widening
export type StoreName = 'slides' | 'slideContent' | 'conversations' | 'settings';

// Type validation to ensure StoreName matches keyof HybridCanvasDB
type ValidateStoreNames = StoreName extends keyof HybridCanvasDB ? true : never;
const _typeCheck: ValidateStoreNames = true;

// Type mapping for values in each store
export type StoreValue<T extends StoreName> = HybridCanvasDB[T]['value'];

// Database instance reference
let dbInstance: IDBPDatabase<HybridCanvasDB> | null = null;

/**
 * Initialize and open the database
 * This should be called early in the application lifecycle
 */
export async function initDatabase(): Promise<IDBPDatabase<HybridCanvasDB>> {
  if (dbInstance) {
    return dbInstance;
  }
  
  try {
    const db = await openDB<HybridCanvasDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        logger.info(`Upgrading IndexedDB from version ${oldVersion} to ${newVersion}`);
        
        // Create stores if they don't exist
        if (oldVersion < 1) {
          // Create slides store with index
          const slidesStore = db.createObjectStore('slides', { keyPath: 'id' });
          slidesStore.createIndex('by-updated', 'updatedAt');
          
          // Create slideContent store
          db.createObjectStore('slideContent', { keyPath: 'id' });
          
          // Create conversations store with index
          const conversationsStore = db.createObjectStore('conversations', { keyPath: 'slideId' });
          conversationsStore.createIndex('by-modified', 'lastModified');
          
          // Create settings store
          db.createObjectStore('settings', { keyPath: 'id' });
          
          logger.info('Database schema created successfully');
        }
        
        // Future migrations can be added here as needed
        // if (oldVersion < 2) { ... }
      },
      blocked() {
        logger.warn('IndexedDB access blocked - another tab may have the database open');
      },
      blocking() {
        logger.warn('This connection is blocking a newer version of the database');
      },
      terminated() {
        logger.error('Database connection terminated unexpectedly');
        dbInstance = null;
      },
    });
    
    dbInstance = db;
    logger.info('IndexedDB initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize IndexedDB', error);
    throw new Error('Failed to initialize local database: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Get the database instance
 * Will initialize the database if it hasn't been initialized yet
 */
export async function getDatabase(): Promise<IDBPDatabase<HybridCanvasDB>> {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

/**
 * Close the database connection
 * Should be called when the application is shutting down
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('IndexedDB connection closed');
  }
}

/**
 * Store data in the specified object store
 * 
 * @param storeName The name of the object store
 * @param data The data to store
 * @returns The key of the stored object
 */
export async function storeData<T extends StoreName>(
  storeName: T,
  data: StoreValue<T>
): Promise<IDBValidKey> {
  try {
    const db = await getDatabase();
    // Use the literal store name, which satisfies the idb library's requirements
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const key = await store.put(data);
    await tx.done;
    
    logger.debug(`Stored data in ${storeName}`, { key });
    return key;
  } catch (error) {
    logger.error(`Error storing data in ${storeName}:`, error);
    throw new Error(`Failed to store data in ${storeName}: ${(error instanceof Error ? error.message : String(error))}`);
  }
}

/**
 * Get data from the specified object store by key
 * 
 * @param storeName The name of the object store
 * @param key The key to retrieve
 * @returns The retrieved data or undefined if not found
 */
export async function getData<T extends StoreName>(
  storeName: T,
  key: HybridCanvasDB[T]['key']
): Promise<StoreValue<T> | undefined> {
  try {
    const db = await getDatabase();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const data = await store.get(key);
    
    if (data === undefined) {
      logger.debug(`No data found in ${storeName} for key ${String(key)}`);
    }
    
    return data;
  } catch (error) {
    logger.error(`Error getting data from ${storeName}:`, error);
    throw new Error(`Failed to get data from ${storeName}: ${(error instanceof Error ? error.message : String(error))}`);
  }
}

/**
 * Delete data from the specified object store by key
 * 
 * @param storeName The name of the object store
 * @param key The key to delete
 */
export async function deleteData<T extends StoreName>(
  storeName: T,
  key: HybridCanvasDB[T]['key']
): Promise<void> {
  try {
    const db = await getDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.delete(key);
    await tx.done;
    
    logger.debug(`Deleted data from ${storeName}`, { key });
  } catch (error) {
    logger.error(`Error deleting data from ${storeName}:`, error);
    throw new Error(`Failed to delete data from ${storeName}: ${(error instanceof Error ? error.message : String(error))}`);
  }
}

/**
 * Get all data from the specified object store
 * 
 * @param storeName The name of the object store
 * @returns Array of all data in the store
 */
export async function getAllData<T extends StoreName>(
  storeName: T
): Promise<StoreValue<T>[]> {
  try {
    const db = await getDatabase();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const data = await store.getAll();
    
    logger.debug(`Retrieved ${data.length} items from ${storeName}`);
    return data;
  } catch (error) {
    logger.error(`Error getting all data from ${storeName}:`, error);
    throw new Error(`Failed to get all data from ${storeName}: ${(error instanceof Error ? error.message : String(error))}`);
  }
}

/**
 * Clear all data from the specified object store
 *
 * @param storeName The name of the object store
 */
export async function clearStore<T extends StoreName>(
  storeName: T
): Promise<void> {
  try {
    const db = await getDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.clear();
    await tx.done;

    logger.debug(`Cleared all data from ${storeName}`);
  } catch (error) {
    logger.error(`Error clearing store ${storeName}:`, error);
    throw new Error(
      `Failed to clear store ${storeName}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Transaction wrapper for multiple operations
 * 
 * @param storeNames Array of store names to include in the transaction
 * @param mode Transaction mode ('readonly' or 'readwrite')
 * @param callback Function to execute within the transaction
 * @returns The result of the callback function
 */
export async function withTransaction<T extends StoreName, R>(
  storeNames: T[],
  mode: 'readonly' | 'readwrite',
  callback: (tx: IDBPTransaction<HybridCanvasDB, T[], typeof mode>) => Promise<R>
): Promise<R> {
  try {
    const db = await getDatabase();
    // No casting needed - idb handles this correctly
    const tx = db.transaction(storeNames, mode);
    
    const result = await callback(tx);
    
    // Only wait for completion on readwrite transactions
    if (mode === 'readwrite') {
      await tx.done;
    }
    
    return result;
  } catch (error) {
    logger.error('Transaction error:', error);
    throw new Error(`Transaction failed: ${(error instanceof Error ? error.message : String(error))}`);
  }
}

/**
 * Check if the browser supports IndexedDB
 */
export function isIndexedDBSupported(): boolean {
  return Boolean(window.indexedDB);
}

/**
 * Export all database operations as a single object
 */
export const indexedDB = {
  init: initDatabase,
  get: getData,
  getAll: getAllData,
  store: storeData,
  delete: deleteData,
  clear: clearStore,
  withTransaction,
  close: closeDatabase,
  isSupported: isIndexedDBSupported,
};

export default indexedDB;
