/**
 * Middleware Index
 * 
 * This file exports all middleware and related types from one central location.
 */

// Re-export all middleware for easier imports
export { createFreezeStateMiddleware } from './freezeStateMiddleware';

// Export the Immer middleware and utilities for structural sharing
export { 
  immerMiddleware,
  withImmer, 
  updateItemAtIndex, 
  updateItemBy 
} from './immerMiddleware';

// Re-export Draft type from immer
export type { Draft } from 'immer';

// Import and re-export IndexedDB middleware
export { createIndexedDbMiddleware } from '../storage/indexedDbMiddleware';

export { type PersistableStore, type IndexedDbStore, type FreezableStore, type MiddlewareEnhancedStore } from './types';
