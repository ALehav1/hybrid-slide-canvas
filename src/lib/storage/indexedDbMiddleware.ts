/**
 * IndexedDB Persistence Middleware for Zustand
 * 
 * This middleware enables automatic persistence of Zustand store state to IndexedDB.
 * It's designed to work with the corrected IndexedDB module and integrates with Immer.
 * 
 * @module indexedDbMiddleware
 */

import type { StateCreator, StoreApi } from 'zustand';
import { produce, type Draft } from 'immer';
import { logger } from '../utils/logging';
import type { StoreName } from './indexedDb';
import * as idb from './indexedDb';

/**
 * Options for IndexedDB persistence middleware
 */
export interface IndexedDbOptions<T> {
  /** A unique name for this store instance (used as the key in IndexedDB) */
  name: string;
  /** The name of the IndexedDB store to use (e.g., 'slides', 'conversations') */
  storeName: StoreName;
  /** Function to serialize state before storing */
  serialize?: (state: T) => unknown;
  /** Function to deserialize state after retrieval */
  deserialize?: (storedState: unknown) => T;
  /** Function to merge persisted state with current state */
  merge?: (persistedState: T, currentState: T) => T;
  /** Debounce time in ms for saving state changes (0 for no debounce) */
  debounceTime?: number;
  /** Whether to skip hydration on init */
  skipHydration?: boolean;
  /** Called when hydration is finished */
  onRehydrateStorage?: (state: T | undefined) => ((state: T | undefined, error?: Error) => void) | undefined;
  /** Function to handle errors during persistence operations */
  onError?: (error: Error) => void;
}

/**
 * Type guard to validate stored data structure
 */
function isValidStoredData(data: unknown): data is { value: unknown; timestamp?: number; id?: string } {
  return (
    data !== null &&
    typeof data === 'object' &&
    'value' in data &&
    data.value !== undefined
  );
}

/**
 * Default error handler
 */
const defaultOnError = (error: Error) => {
  logger.error('IndexedDB persistence error:', error);
};

/**
 * Default serializer
 */
const defaultSerialize = <T>(state: T): string => {
  try {
    return JSON.stringify(state);
  } catch (error) {
    throw new Error(`Failed to serialize state: ${(error instanceof Error ? error.message : String(error))}`);
  }
};

/**
 * Default deserializer
 */
const defaultDeserialize = <T>(serializedState: unknown): T => {
  try {
    return JSON.parse(serializedState as string) as T;
  } catch (error) {
    throw new Error(`Failed to deserialize state: ${(error instanceof Error ? error.message : String(error))}`);
  }
};

/**
 * Default merge function that combines persisted and current state
 */
const defaultMerge = <T>(persistedState: T, currentState: T): T => {
  return { ...currentState, ...persistedState };
};

/**
 * Creates a debounced version of a function
 */
function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(
  func: F,
  wait: number
): F {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return ((...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  }) as F;
}

/**
 * Creates store-specific data structure based on the store name
 * This ensures we match the expected schema for each store
 */
function createStoreData(storeName: StoreName, id: string, serializedData: unknown): Record<string, unknown> {
  switch (storeName) {
    case 'settings':
      // Settings store accepts any value
      return {
        id,
        value: serializedData
      };
    case 'slideContent':
      // SlideContent store accepts any value
      return {
        id,
        value: serializedData
      };
    case 'slides':
      // Slides store has a specific structure
      return {
        id,
        title: `State: ${id}`,
        updatedAt: Date.now(),
        value: serializedData // Store the serialized data in a custom field
      };
    case 'conversations':
      // Conversations store has a specific structure
      return {
        slideId: id,
        messages: [],
        lastModified: Date.now(),
        value: serializedData // Store the serialized data in a custom field
      };
    default:
      // Generic fallback
      return {
        id,
        value: serializedData
      };
  }
}

/**
 * Extract serialized data from store-specific structure
 */
function extractStoredData(storeName: StoreName, data: Record<string, unknown>): unknown {
  if (!data) return undefined;
  
  switch (storeName) {
    case 'settings':
    case 'slideContent':
      return data.value;
    case 'slides':
    case 'conversations':
      return data.value || data; // Try to get the value field, fallback to the whole object
    default:
      return data.value !== undefined ? data.value : data;
  }
}

/**
 * Creates a type-safe IndexedDB persistence middleware for Zustand
 * @param options Configuration options for the persistence middleware
 * @returns A Zustand middleware function
 */
export const createIndexedDbMiddleware = <T>(
  options: IndexedDbOptions<T>
) => {
  // Default options
  const {
    name, // Required: unique name for this store instance
    storeName, // Required: IndexedDB store name
    serialize = defaultSerialize,
    deserialize = defaultDeserialize,
    merge = defaultMerge,
    debounceTime = 500,
    skipHydration = false,
    onRehydrateStorage,
    onError = defaultOnError,
  } = options;

  let hasHydrated = false;
  let isInitialized = false;

  // Function to save state to IndexedDB
  const saveState = async (state: T): Promise<void> => {
    try {
      const serializedData = serialize(state);
      const storeData = createStoreData(storeName, name, serializedData);
      await idb.storeData(storeName, storeData);
      logger.debug(`Saved state to IndexedDB store '${storeName}' with key '${name}'`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to save state to IndexedDB:`, err);
      onError(err);
    }
  };

  // Create debounced save function if debouncing is enabled
  const debouncedSaveState = debounceTime > 0 ? debounce(saveState, debounceTime) : null;

  return (config: StateCreator<T, [], []>): StateCreator<T, [], []> => {
    return (set, get, store) => {
      // Function to load state from IndexedDB and hydrate store
      const loadFromStorage = async (): Promise<void> => {
        try {
          // Use the direct getData function
          const key = storeName === 'conversations' ? name : name;
          const storedData = await idb.getData(storeName, key);
          
          if (storedData) {
            // Extract the serialized data from the store-specific structure
            const serializedData = extractStoredData(storeName, storedData as Record<string, unknown>);
            
            if (serializedData !== undefined) {
              const deserializedState = deserialize(serializedData);
              
              // Set the hydrated state to the store
              const currentState = get();
              const mergedState = merge(deserializedState, currentState);
              set(mergedState, true); // Replace the entire state
              
              logger.debug(`Hydrated state from IndexedDB store '${storeName}' with key '${name}'`);
            }
          }
          
          // Call rehydrate callback if provided
          if (onRehydrateStorage) {
            const callback = onRehydrateStorage(get());
            if (callback) {
              callback(get());
            }
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error(`Failed to load state from IndexedDB:`, err);
          onError(err);
          
          // Call rehydrate callback with error if provided
          if (onRehydrateStorage) {
            const callback = onRehydrateStorage(undefined);
            if (callback) {
              callback(undefined, err);
            }
          }
        } finally {
          hasHydrated = true;
        }
      };

      // Custom set function that triggers persistence
      const persistentSet = (stateOrUpdater: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => {
        // Call original set function
        set(stateOrUpdater, replace);
        
        // Only persist after initial hydration to avoid saving incomplete state
        if (hasHydrated && isInitialized) {
          if (debounceTime > 0 && debouncedSaveState) {
            debouncedSaveState(get()); // Pass current state to debounced function
          } else {
            void saveState(get()); // Pass current state to immediate save
          }
        }
      };

      // Initialize the store with the original state creator
      const storeState = config(persistentSet, get, store);
      isInitialized = true;

      // Start hydration if not skipped
      if (!skipHydration) {
        void loadFromStorage();
      } else {
        hasHydrated = true;
      }

      // Add persistence API to the store
      return {
        ...storeState,
        // Persistence methods
        persist: {
          hasHydrated: () => hasHydrated,
          rehydrate: () => loadFromStorage(),
          clear: async () => {
            try {
              // For 'conversations' store, the key is 'slideId', which is 'name' in this context
              const keyForDelete = storeName === 'conversations' ? name : name;
              await idb.deleteData(storeName, keyForDelete);
              logger.debug(`Cleared persisted state from IndexedDB store '${storeName}' with key '${name}'`);
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              logger.error(`Failed to clear persisted state:`, err);
              onError(err);
            }
          },
          save: () => saveState(get()), // Pass current state to save
        },
      };
    };
  };
}

/**
 * Type-safe middleware for persisting Zustand store state in IndexedDB
 * @param options Configuration options for the persistence middleware
 * @returns A Zustand middleware function
 */
export const persistWithIndexedDb = <T>(
  options: IndexedDbOptions<T>
) => {
  return createIndexedDbMiddleware<T>(options);
};

/**
 * Helper function to clear persisted state for a specific store instance
 * @param name The unique name of the store instance
 * @param storeName The IndexedDB store name
 */
export const clearPersistedState = async (
  name: string, // The unique name of the store instance
  storeName: StoreName // The IndexedDB store name
): Promise<void> => {
  try {
    // Use the direct deleteData function
    const key = storeName === 'conversations' ? name : name;
    await idb.deleteData(storeName, key);
    logger.info(`Cleared persisted state for '${name}' in IndexedDB store '${storeName}'`);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Failed to clear persisted state:`, err);
    throw err;
  }
};

/**
 * Helper function to get persisted state for debugging or initial hydration
 * @param name The unique name of the store instance
 * @param storeName The IndexedDB store name
 * @param deserialize Custom deserializer function
 * @returns The deserialized state, or null if not found
 */
export const getPersistedState = async <T>(
  name: string, // The unique name of the store instance
  storeName: StoreName, // The IndexedDB store name
  deserialize: (data: unknown) => T = JSON.parse as (data: unknown) => T // Use defaultDeserialize
): Promise<T | null> => {
  try {
    // Use the direct getData function
    const key = storeName === 'conversations' ? name : name;
    const storedData = await idb.getData(storeName, key);
    
    // Extract the serialized data from the store-specific structure
    const serializedData = extractStoredData(storeName, storedData as Record<string, unknown>);
    
    if (serializedData !== undefined) {
      return deserialize(serializedData);
    }
    
    return null;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Failed to get persisted state for '${name}':`, err);
    throw err;
  }
};

/**
 * Middleware that combines Immer and IndexedDB persistence for Zustand stores.
 * @param options Configuration options for the persistence middleware
 * @returns A Zustand middleware function
 */
export const immerPersistWithIndexedDb = <T>(
  options: IndexedDbOptions<T>
) => {
  return (config: StateCreator<T, [["zustand/immer", never]], []>): StateCreator<T, [], []> => {
    return persistWithIndexedDb<T>(options)(
      (set, get, store) => config(
        (stateOrFn) => {
          // This handles the Immer `Draft` type correctly
          if (typeof stateOrFn === 'function') {
            // `produce` returns a new immutable state of type T
            set(produce(stateOrFn as (state: Draft<T>) => void) as T);
          } else {
            set(stateOrFn);
          }
        },
        get,
        store as StoreApi<T> & { setState: (nextStateOrUpdater: T | Partial<T> | ((state: Draft<T>) => void), shouldReplace?: boolean) => void }
      )
    );
  };
};
