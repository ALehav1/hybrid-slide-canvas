/**
 * DEPRECATED - DO NOT USE MANUAL DEXIE MOCK
 * 
 * This file is kept only as a reference and to prevent test breakage.
 * 
 * Instead of using manual Dexie mocks, we now use fake-indexeddb globally.
 * The proper setup is in src/setupTests.ts which uses 'fake-indexeddb/auto'.
 * 
 * DO NOT USE THIS FILE FOR NEW TESTS. ALL TESTS SHOULD USE THE GLOBAL
 * FAKE-INDEXEDDB SETUP INSTEAD OF MANUAL DEXIE MOCKS.
 */

import { vi } from 'vitest';

/**
 * Warns when this file is imported and provides a thin implementation
 * that routes to the global fake-indexeddb implementation.
 */
class WarningDexie {
  constructor(_name: string) {
    console.warn(
      `[WARNING] You are using the deprecated manual Dexie mock at src/__tests__/test-utils/mocks/dexie.ts. \n` +
      `This is not recommended - use the global fake-indexeddb setup from setupTests.ts instead. \n` +
      `Remove any manual vi.mock('dexie', ...) calls from your tests.`
    );
  }

  // Forward to the real implementation from fake-indexeddb
  version() { return this; }
  stores() { return this; }
  table() { return {}; }
  async open() { return Promise.resolve(this); }
  close() {}
}

export default WarningDexie;

// For backward compatibility
export const createMockZustandStorage = () => {
  console.warn('[WARNING] createMockZustandStorage is deprecated. Use fake-indexeddb instead.');
  return {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined)
  };
};

export class MockTable {
  constructor() {
    console.warn('[WARNING] MockTable is deprecated. Use fake-indexeddb instead.');
  }
  get = vi.fn().mockResolvedValue(undefined)
  put = vi.fn().mockResolvedValue(undefined)
  delete = vi.fn().mockResolvedValue(undefined)
  clear = vi.fn().mockResolvedValue(undefined)
}
