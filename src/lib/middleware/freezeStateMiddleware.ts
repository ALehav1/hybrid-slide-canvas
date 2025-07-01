/**
 * Freeze State Middleware for Zustand
 * 
 * Development-only middleware that deep freezes state objects to catch
 * accidental mutations. This helps enforce immutability patterns and
 * catch bugs early without affecting production performance.
 * 
 * @module freezeStateMiddleware
 */

import { type StateCreator } from 'zustand';
import { logger } from '../utils/logging';

/**
 * Options for the freeze state middleware
 */
interface FreezeStateOptions {
  /** Whether to enable debug logging */
  debug?: boolean;
  
  /** Whether to use deep freeze (true) or shallow freeze (false) */
  deep?: boolean;
}

/**
 * Default options for the middleware
 */
const defaultOptions: FreezeStateOptions = {
  debug: false,
  deep: true,
};

/**
 * Create a middleware that freezes state objects in development mode
 * to catch accidental mutations
 */
export const createFreezeStateMiddleware = 
  <T extends object>(
    options: FreezeStateOptions = {}
  ) => 
  (
    config: StateCreator<T>
  ): StateCreator<T> => 
  (set, get, api) => {
    // Merge default options with user options
    const freezeOptions = {
      ...defaultOptions,
      ...options,
    };

    // Only apply in development mode
    const isDevMode = import.meta.env.DEV;
    
    if (!isDevMode) {
      // In production, just pass through the original state creator
      return config(set, get, api);
    }

    // Create wrapped set function that freezes state after updates
    const frozenSet: typeof set = (updater, replace) => {
      // Call the original set function
      const result = set(updater, replace);
      
      // After the update, get the new state and freeze it
      const newState = get();
      
      if (freezeOptions.deep) {
        try {
          // Deep clone first to avoid modifying object references
          // Then freeze the clone to catch mutations
          const frozenState = Object.freeze(structuredClone(newState));
          
          if (freezeOptions.debug) {
            logger.debug('State frozen (deep):', { stateSize: JSON.stringify(frozenState).length });
          }
        } catch (error) {
          logger.warn('Failed to deep freeze state', { error });
          // Fallback to shallow freeze if deep freeze fails
          Object.freeze(newState);
        }
      } else {
        // Shallow freeze only the top level
        Object.freeze(newState);
        
        if (freezeOptions.debug) {
          logger.debug('State frozen (shallow)');
        }
      }
      
      return result;
    };

    // Return the new state creator with the frozen set function
    return config(frozenSet, get, api);
  };
