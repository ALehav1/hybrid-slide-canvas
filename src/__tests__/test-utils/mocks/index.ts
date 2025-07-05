/**
 * Centralized exports for all mocks
 * 
 * This file serves as the single entry point for importing all mocks,
 * making it easier to maintain consistent mock implementations across tests.
 */

// Export all mocks
export { default as mockIndexedDb } from './indexedDb';
export { default as mockNanoid } from './nanoid';
export { default as mockDexie } from './dexie';
export { openai as mockOpenAI } from './openaiClient';

// Re-export any existing mocks
export { mockEditor } from './tldraw';
export * from './logging';
