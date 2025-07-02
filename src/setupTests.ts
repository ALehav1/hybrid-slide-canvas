// Test environment configuration
/// <reference types="vitest" />

// 1. Polyfill for indexedDB
import 'fake-indexeddb/auto';

// 2. Import Dexie and configure it to use the fake indexedDB
import Dexie from 'dexie';
import { vi, beforeEach, afterEach, expect } from 'vitest';

// Configure Dexie to use the polyfilled indexedDB
Dexie.dependencies.indexedDB = globalThis.indexedDB;
Dexie.dependencies.IDBKeyRange = globalThis.IDBKeyRange;

// Suppress console.debug messages across all tests for cleaner output
vi.spyOn(console, 'debug').mockImplementation(() => {});

// DOM testing utilities
import '@testing-library/jest-dom';

// Before each test, clear all indexedDB databases.
// This is a safeguard to ensure that tests are isolated from each other.
beforeEach(async () => {
  // Feature-detect indexedDB.databases() (not available in Firefox & some polyfills)
  if (indexedDB.databases) {
    const dbs = await indexedDB.databases();
    await Promise.all(dbs.map((db) => indexedDB.deleteDatabase(db.name!)));
  }
});

// Global cleanup to avoid leak-induced flakes
afterEach(() => {
  vi.restoreAllMocks(); // spies & stubbed modules
  vi.resetModules(); // clear module cache for fresh imports
  vi.useRealTimers(); // restore real timers before flushing
  vi.runOnlyPendingTimers(); // flush fake timers

  // Add an assertion to ensure no timers are left pending.
  // @ts-expect-error - getPendingTimers() is not in the type definitions but exists
  expect(vi.getPendingTimers()).toHaveLength(0);
});
