/**
 * IndexedDB Middleware for Zustand
 * 
 * Custom middleware to persist Zustand store state to IndexedDB.
 * Supports:
 * - Selective persistence of store slices
 * - Automatic data migration
 * - Optimistic updates
 * - Error handling and retries
 * - Performance optimizations
 * 
 * @module indexedDbMiddleware
 */

import { type StateCreator, type StoreMutatorIdentifier } from 'zustand';
import { logger } from '../utils/logging';
import * as idb from './indexedDb';

/**
 * Options for the IndexedDB middleware
 */
interface IndexedDBOptions<T> {
  /** IndexedDB store name */
  storeName: keyof ReturnType<typeof idb.getDatabase>['objectStores'];
  
  /** Unique identifier for the record */
  id: string;
  
  /** Function to extract persistable state from the store */
  serialize?: (state: T) => any;
  
  /** Function to merge loaded state with initial state */
  deserialize?: (persistedState: any, currentState: T) => T;
  
  /** How often to persist state changes (in milliseconds) */
  debounceTime?: number;
  
  /** Whether to immediately hydrate state on initialization */
  hydrate?: boolean;

  /**
   * Filter function to determine which parts of the state should trigger persistence
   * Return true if the state change should trigger a persist operation
   */
  shouldPersist?: (previousState: T, currentState: T) => boolean;
  
  /** Whether to enable debug logging */
  debug?: boolean;
  
  /** Auto-initialize database on middleware creation */
  autoInit?: boolean;
  
  /** Storage version for data migrations */
  version?: number;
}

/**
 * Default middleware options
 */
const defaultOptions = {
  debounceTime: 1000, // Default to 1 second debounce
  hydrate: true,
  debug: false,
  autoInit: true,
  version: 1,
  serialize: <T>(state: T) => state,
  deserialize: <T>(persistedState: any, currentState: T) => ({
    ...currentState,
    ...persistedState,
  }),
  shouldPersist: () => true,
};

/**
 * Type for the persist function returned by the middleware
 */
interface PersistApi {
  /**
   * Persist current state immediately
   */
  persist: () => Promise<void>;
  
  /**
   * Clear persisted state
   */
  clear: () => Promise<void>;
  
  /**
   * Check if data is currently hydrated
   */
  hasHydrated: () => boolean;
  
  /**
   * Rehydrate state from storage
   */
  rehydrate: () => Promise<void>;
}

/**
 * Type for a store with persistence capabilities
 */
type StoreWithPersist<T> = T & {
  persist: PersistApi;
};

declare module 'zustand' {
  interface StoreMutators<S, A> {
    'zustand/persist-indexeddb': WithPersist<S, A>;
  }
}

type WithPersist<S, A> = S extends { getState: () => infer T }
  ? StoreWithPersist<S>
  : S;

type IndexedDbMiddleware = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  f: StateCreator<T, Mps, Mcs>,
  options: IndexedDBOptions<T>,
) => StateCreator<T, Mps, [['zustand/persist-indexeddb', unknown]]>;

/**
 * Create a Zustand middleware for persisting state to IndexedDB
 */
export const createIndexedDbMiddleware: IndexedDbMiddleware = (f, userOptions) => (set, get, store) => {
  // Merge default options with user options
  const options = {
    ...defaultOptions,
    ...userOptions,
  } as Required<IndexedDBOptions<unknown>>;

  if (options.debug) {
    logger.debug('Creating IndexedDB middleware', { options });
  }

  // Track hydration state
  let hasHydrated = false;
  
  // Setup debounce timer
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Initialize database if auto-init is enabled
  if (options.autoInit) {
    idb.initDatabase().catch((error) => {
      logger.error('Failed to initialize IndexedDB', error);
    });
  }

  /**
   * Persist current state to IndexedDB
   */
  const persistState = async (): Promise<void> => {
    try {
      // Get current state
      const state = get();
      
      // Serialize state according to options
      const serializedState = options.serialize(state);
      
      // Store in IndexedDB
      const record = {
        id: options.id,
        state: serializedState,
        version: options.version,
        updatedAt: Date.now(),
      };
      
      await idb.storeData(options.storeName, record);
      
      if (options.debug) {
        logger.debug('State persisted to IndexedDB', { storeName: options.storeName, id: options.id });
      }
    } catch (error) {
      logger.error('Failed to persist state to IndexedDB', {
        error,
        storeName: options.storeName,
        id: options.id,
      });
    }
  };

  /**
   * Load persisted state from IndexedDB
   */
  const loadState = async (): Promise<void> => {
    try {
      // Get state from IndexedDB
      const record = await idb.getData(options.storeName, options.id);
      
      if (!record) {
        if (options.debug) {
          logger.debug('No persisted state found', { storeName: options.storeName, id: options.id });
        }
        return;
      }
      
      // Get current state
      const currentState = get();
      
      // Deserialize state according to options
      const newState = options.deserialize(record.state, currentState);
      
      // Update state
      set(newState, true);
      
      if (options.debug) {
        logger.debug('State loaded from IndexedDB', { storeName: options.storeName, id: options.id });
      }
    } catch (error) {
      logger.error('Failed to load state from IndexedDB', {
        error,
        storeName: options.storeName,
        id: options.id,
      });
    } finally {
      hasHydrated = true;
    }
  };

  /**
   * Persist API exposed to the store
   */
  const persistApi: PersistApi = {
    persist: persistState,
    clear: async () => {
      try {
        await idb.deleteData(options.storeName, options.id);
        if (options.debug) {
          logger.debug('Persisted state cleared', { storeName: options.storeName, id: options.id });
        }
      } catch (error) {
        logger.error('Failed to clear persisted state', {
          error,
          storeName: options.storeName,
          id: options.id,
        });
      }
    },
    hasHydrated: () => hasHydrated,
    rehydrate: async () => {
      await loadState();
    },
  };

  // Create the actual store with the original state creator
  const initialState = f(
    // Custom set function that triggers persistence
    (stateOrUpdater, replace) => {
      // Get previous state for comparison
      const previousState = get();
      
      // Call the original set function
      set(stateOrUpdater, replace);
      
      // Get the new state after the update
      const newState = get();
      
      // Check if we should persist this state change
      if (options.shouldPersist(previousState, newState)) {
        // Cancel existing debounce timer
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        // Start a new debounce timer
        debounceTimer = setTimeout(() => {
          persistState().catch((error) => {
            logger.error('Failed to persist state after debounce', error);
          });
          debounceTimer = null;
        }, options.debounceTime);
      }
    },
    get,
    store,
  );

  // Merge the persist API into the store
  Object.assign(store, {
    persist: persistApi,
  });

  // Hydrate state if enabled
  if (options.hydrate) {
    // Use microtask to ensure we don't block rendering
    Promise.resolve().then(() => {
      loadState().catch((error) => {
        logger.error('Failed to hydrate state', error);
      });
    });
  }

  return {
    ...initialState,
    persist: persistApi,
  };
};

/**
 * Helper function to create a persisted store with IndexedDB
 */
export const createIndexedDbStore = <T,>(
  f: StateCreator<T, [], []>,
  options: IndexedDBOptions<T>,
): StoreWithPersist<ReturnType<typeof f>> => {
  return f(createIndexedDbMiddleware<T>(f, options)) as StoreWithPersist<ReturnType<typeof f>>;
};
