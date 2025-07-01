/**
 * Type definitions for store middleware
 * 
 * This module provides type definitions and helper types for enhancing 
 * Zustand stores with middleware while maintaining full type safety.
 * 
 * @module middleware/types
 */

import { type StateCreator } from 'zustand';

/**
 * Simplified type for a store that may have persistence middleware
 * 
 * @template T - State type for the store
 */
export type PersistableStore<T> = StateCreator<T>;

/**
 * Simplified type for a store with IndexedDB persistence 
 * 
 * @template T - State type for the store
 */
export type IndexedDbStore<T> = StateCreator<T>;

/**
 * Type helper for creating a store with freeze state middleware
 * 
 * @template T - State type for the store
 */
export type FreezableStore<T> = StateCreator<T>;

/**
 * Type helper for creating a store with multiple middleware layers
 * Provides better type inference than using multiple `as unknown as` casts
 * 
 * @template T - State type for the store
 */
export type MiddlewareEnhancedStore<T> = StateCreator<T>;
