/**
 * Immer middleware for Zustand store operations
 * 
 * This file provides a middleware that integrates Immer with Zustand to enable structural sharing in store updates,
 * which means only the parts of the state that actually change are recreated,
 * resulting in better performance and more efficient memory usage.
 *
 * We use a custom implementation instead of zustand/middleware/immer to:
 * 1. Keep full control over typings & future tweaks (e.g. dev-only Object.freeze checks)
 * 2. Avoid extra runtime dependencies beyond the core immer package
 */
import type { StateCreator } from 'zustand';
import { produce as produceImmer, enableMapSet } from 'immer';
import type { Draft } from 'immer';

// Enable Immer support for Map and Set
enableMapSet();

/**
 * Type for a function that takes a draft state and mutates it
 */
export type DraftFunction<T> = (draft: Draft<T>) => void;

/**
 * Middleware that adds Immer support to a Zustand store
 * Allows store actions to use mutating syntax with immutable results
 */
export const immerMiddleware = <T extends object>(
  config: StateCreator<T>
): StateCreator<T> => (set, get, api) => {
  // Create a wrapped version of set that uses Immer to process function updates
  const immerSet = (partial: T | Partial<T> | ((state: T) => T | Partial<T> | void) | ((draft: Draft<T>) => void), replace?: boolean) => {
    // If it's a function, use Immer to create the next state
    const nextState = typeof partial === 'function'
      ? produceImmer(get(), partial as (draft: Draft<T>) => void)
      : partial;
      
    // Optional: Freeze state in development to catch accidental mutations
    if (import.meta.env.DEV && typeof nextState === 'object') {
      Object.freeze(nextState); // Shallow freeze for safety
    }
    
    return set(nextState, replace);
  };

  return config(immerSet, get, api);
};

/**
 * Helper function to wrap a state update with Immer
 * This allows for mutating the draft state directly within the function
 * @param fn Function that receives a draft state and mutates it
 * @returns A function that can be passed to setState
 */
export function withImmer<T>(fn: DraftFunction<T>) {
  return (state: T) => produceImmer(state, fn);
}

/**
 * Alternative withImmer signature that accepts a state and recipe directly
 * Used when you already have the state and want to apply a recipe
 * @param state Current state
 * @param recipe Function that mutates the draft state
 * @returns New immutable state with changes
 */
export function produceWithImmer<T>(state: T, recipe: DraftFunction<T>): T {
  return produceImmer(state, recipe);
}

/**
 * Utility function for updating a specific item in an array by matching a predicate
 */
export function updateItemBy<T>(
  array: T[], 
  predicate: (item: T) => boolean, 
  update: (item: T) => T
): T[] {
  const index = array.findIndex(predicate);
  if (index === -1) return array;
  return updateItemAtIndex(array, index, update);
}

/**
 * Utility function for updating an item at a specific index in an array
 */
export function updateItemAtIndex<T>(
  array: T[], 
  index: number, 
  update: (item: T) => T
): T[] {
  return [
    ...array.slice(0, index),
    update(array[index]),
    ...array.slice(index + 1)
  ];
}
