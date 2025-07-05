/**
 * IndexedDB Persistence Middleware for Zustand
 * 
 * This middleware enables automatic persistence of Zustand store state to IndexedDB.
 * It's designed to work with the corrected IndexedDB module and integrates with Immer.
 * 
 * @module indexedDbMiddleware
 */

import { StateCreator, StoreApi, StoreMutatorIdentifier } from 'zustand';
import { produce, Draft } from 'immer';
import { logger } from '../utils/logging';
import { StoreName, StoreValue } from './indexedDb';
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
  serialize?: (state: T) => any;
  /** Function to deserialize state after retrieval */
  deserialize?: (storedState: any) => T;
  /** Merge strategy for hydrating with stored state */
  merge?: (persistedState: T, currentState: T) => T;
  /** Debounce time in ms for saving state changes (0 for no debounce) */
  debounceTime?: number;
  /** Whether to skip hydration on init */
  skipHydration?: boolean;
  /** Called when hydration is finished */
  onRehydrateStorage?: (state: T | undefined) => ((state: T | undefined, error?: Error) => void) | void;
  /** Function to handle errors during persistence operations */
  onError?: (error: Error) => void;
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
const defaultDeserialize = <T>(serializedState: string): T => {
  try {
    return JSON.parse(serializedState) as T;
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
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

/**
 * Creates store-specific data structure based on the store name
 * This ensures we match the expected schema for each store
 */
function createStoreData<T>(storeName: StoreName, id: string, serializedData: any): any {
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
function extractStoredData<T>(storeName: StoreName, data: any): any {
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
    onError = defaultOnError,
  } = options;

  // Return the actual middleware function
  return <Mps extends [StoreMutatorIdentifier, unknown][] = [], Mcs extends [StoreMutatorIdentifier, unknown][] = []>(
    createState: StateCreator<T, Mps, Mcs>
  ): StateCreator<T, Mps, Mcs> => (set, get, api) => {
    // Function to save state to IndexedDB
    const saveState = async (state: T): Promise<void> => {
      try {
        const serializedState = serialize(state);
        
        // Create the appropriate data structure for the specific store
        const storeData = createStoreData(storeName, name, serializedState);
        
        // Use the direct storeData function from the IndexedDB module
        await idb.storeData(storeName, storeData);
        
        logger.debug(`State for '${name}' persisted to IndexedDB store '${storeName}'`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(`Failed to persist state for '${name}' to IndexedDB:`, err);
        onError(err);
      }
    };
    
    // Create a debounced version of saveState if debounceTime is set
    const debouncedSaveState = debounceTime > 0
      ? debounce(saveState, debounceTime)
      : saveState;
    
    // Custom set function that triggers persistence
    const persistentSet: typeof set = (
      stateOrUpdater,
      replace
    ) => {
      // Call the original set function
      set(stateOrUpdater, replace);
      
      // Get the current state and save it
      const state = get();
      debouncedSaveState(state);
    };
    
    // Create the store with the original state creator
    const initialState = createState(persistentSet, get, api);
    
    // Hydrate state from storage if not skipped
    if (!skipHydration) {
      (async () => {
        try {
          // Get the key based on the store type
          const key = storeName === 'conversations' ? name : name;
          
          // Get the stored data using the direct function
          const storedData = await idb.getData(storeName, key);
          
          // Extract the serialized data from the store-specific structure
          const serializedData = extractStoredData(storeName, storedData);
          
          if (serializedData !== undefined) {
            try {
              const deserializedState = deserialize(serializedData);
              const mergedState = merge(deserializedState, get());
              set(mergedState, true); // Replace state with merged state
              logger.info(`State for '${name}' rehydrated from IndexedDB store '${storeName}'`);
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              logger.error(`Failed to deserialize or merge stored state for '${name}':`, err);
              onError(err);
            }
          } else {
            logger.debug(`No stored state found for '${name}' in IndexedDB store '${storeName}'`);
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error(`Failed to rehydrate state for '${name}' from IndexedDB:`, err);
          onError(err);
        }
      })();
    }
    
    return initialState;
  };
};

/**
 * Type-safe middleware for persisting Zustand store state in IndexedDB
 * 
 * @example
 * const useMyStore = create(
 *   persistWithIndexedDb({
 *     name: 'my-app-settings',
 *     storeName: 'settings',
 *     debounceTime: 1000,
 *   })(
 *     (set) => ({
 *       theme: 'dark',
 *       setTheme: (theme) => set({ theme }),
 *     })
 *   )
 * );
 */
export const persistWithIndexedDb = <T>(
  options: IndexedDbOptions<T>
) => {
  return createIndexedDbMiddleware<T>(options);
};

/**
 * Helper function to clear persisted state for a specific store instance
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
    logger.error(`Failed to clear persisted state for '${name}':`, err);
    throw err;
  }
};

/**
 * Helper function to get persisted state for debugging or initial hydration
 */
export const getPersistedState = async <T>(
  name: string, // The unique name of the store instance
  storeName: StoreName, // The IndexedDB store name
  deserialize: (data: any) => T = JSON.parse
): Promise<T | null> => {
  try {
    // Use the direct getData function
    const key = storeName === 'conversations' ? name : name;
    const storedData = await idb.getData(storeName, key);
    
    // Extract the serialized data from the store-specific structure
    const serializedData = extractStoredData(storeName, storedData);
    
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
 * 
 * @example
 * const useMyImmerStore = create(
 *   immerPersistWithIndexedDb({
 *     name: 'my-immer-store',
 *     storeName: 'slides',
 *   })(
 *     (set) => ({
 *       slides: [],
 *       addSlide: (slide) => set((state) => { state.slides.push(slide); }),
 *     })
 *   )
 * );
 */
export const immerPersistWithIndexedDb = <T>(
  options: IndexedDbOptions<T>
) => {
  return (config: StateCreator<T, [["zustand/immer", never]], []>): StateCreator<T, [], []> => {
    return persistWithIndexedDb<T>(options)(
      (set, get, api) => config(
        (stateOrUpdater) => {
          // This handles the Immer `Draft` type correctly
          if (typeof stateOrUpdater === 'function') {
            set(produce(stateOrUpdater as (state: Draft<T>) => void) as unknown as T);
          } else {
            set(stateOrUpdater);
          }
        },
        get,
        api
      )
    );
  };
};
