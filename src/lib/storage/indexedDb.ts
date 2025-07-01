/**
 * IndexedDB Database Service
 * 
 * Provides low-level access to IndexedDB for storing and retrieving application data.
 * Implements versioning, migrations, and optimized data storage patterns.
 * 
 * @module indexedDb
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { logger } from '../utils/logging';

// Database configuration
const DB_NAME = 'hybrid-slide-canvas';
const DB_VERSION = 1;

/**
 * Database schema definition
 */
interface HybridCanvasDB extends DBSchema {
  // Slides store - contains slide metadata (not the full content)
  slides: {
    key: string;
    value: {
      id: string;
      title: string;
      updatedAt: number;
      thumbnailUrl?: string;
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
      messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
      }>;
      lastModified: number;
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
export async function storeData<T extends keyof HybridCanvasDB>(
  storeName: T,
  data: HybridCanvasDB[T]['value']
): Promise<IDBValidKey> {
  const db = await getDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  const key = await store.put(data);
  await tx.done;
  
  logger.debug(`Stored data in ${String(storeName)}`, { key });
  return key;
}

/**
 * Get data from the specified object store by key
 * 
 * @param storeName The name of the object store
 * @param key The key to retrieve
 * @returns The retrieved data or undefined if not found
 */
export async function getData<T extends keyof HybridCanvasDB>(
  storeName: T,
  key: IDBValidKey
): Promise<HybridCanvasDB[T]['value'] | undefined> {
  const db = await getDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const data = await store.get(key);
  
  if (data === undefined) {
    logger.debug(`No data found in ${String(storeName)} for key ${String(key)}`);
  }
  
  return data;
}

/**
 * Delete data from the specified object store by key
 * 
 * @param storeName The name of the object store
 * @param key The key to delete
 */
export async function deleteData<T extends keyof HybridCanvasDB>(
  storeName: T,
  key: IDBValidKey
): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await store.delete(key);
  await tx.done;
  
  logger.debug(`Deleted data from ${String(storeName)}`, { key });
}

/**
 * Get all data from the specified object store
 * 
 * @param storeName The name of the object store
 * @returns Array of all data in the store
 */
export async function getAllData<T extends keyof HybridCanvasDB>(
  storeName: T
): Promise<Array<HybridCanvasDB[T]['value']>> {
  const db = await getDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const data = await store.getAll();
  
  logger.debug(`Retrieved ${data.length} items from ${String(storeName)}`);
  return data;
}

/**
 * Clear all data from the specified object store
 * 
 * @param storeName The name of the object store
 */
export async function clearStore<T extends keyof HybridCanvasDB>(
  storeName: T
): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await store.clear();
  await tx.done;
  
  logger.debug(`Cleared all data from ${String(storeName)}`);
}

/**
 * Get data by index
 * 
 * @param storeName The name of the object store
 * @param indexName The name of the index
 * @param key The key to search for
 */
export async function getByIndex<T extends keyof HybridCanvasDB>(
  storeName: T,
  indexName: string,
  key: IDBValidKey
): Promise<HybridCanvasDB[T]['value'] | undefined> {
  const db = await getDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const index = tx.objectStore(storeName).index(indexName);
  const data = await index.get(key);
  
  return data;
}

/**
 * Check if the browser supports IndexedDB
 */
export function isIndexedDBSupported(): boolean {
  return Boolean(window.indexedDB);
}
