// Test environment configuration
/// <reference types="vitest" />

// 1. Import fake-indexeddb before any other imports
// This polyfills indexedDB API in Node.js testing environment
import 'fake-indexeddb/auto';

// 2. Import Dexie and configure it to use the fake indexedDB
import Dexie from 'dexie';

// Configure Dexie to use the polyfilled indexedDB
Dexie.dependencies.indexedDB = globalThis.indexedDB;
Dexie.dependencies.IDBKeyRange = globalThis.IDBKeyRange;

// DOM testing utilities
import '@testing-library/jest-dom';

// Add global beforeEach hook to reset fake IndexedDB state between tests
// This prevents test contamination
beforeEach(() => {
  // Delete all databases to start with a clean state
  // This prevents data from previous tests affecting current test
  
  // Feature-detect indexedDB.databases() (not available in Firefox & some polyfills)
  if (indexedDB.databases) {
    // Use the databases API when available
    indexedDB.databases().then((databases) => {
      databases.forEach((database) => {
        if (database.name) {
          indexedDB.deleteDatabase(database.name);
        }
      });
    });
  } else {
    // Fallback for environments without databases() API
    // In a real app, you might want to maintain a list of known DB names
    const knownDBs = ['hybrid-slide-canvas-db', 'hybrid-slide-canvas-test-db'];
    knownDBs.forEach(name => indexedDB.deleteDatabase(name));
  }
});
