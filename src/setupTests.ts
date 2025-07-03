/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { afterEach, beforeEach, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'

// ╭──────────── Globals & Polyfills ────────────╮
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any

Dexie.dependencies.indexedDB  = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange

vi.spyOn(console, 'debug').mockImplementation(() => {})
// ╰─────────────────────────────────────────────╯

// ─── Hooks ─────────────────────────────────────
beforeEach(async () => {
  if ('databases' in indexedDB) {
    for (const { name } of await indexedDB.databases()) {
      if (name) indexedDB.deleteDatabase(name)
    }
  } else {
    for (const name of await Dexie.getDatabaseNames()) await Dexie.delete(name)
  }
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  // Run all pending timers to ensure async operations complete
  vi.runOnlyPendingTimers()
  // Now, assert that no timers are left. This catches runaway timers.
  expect(vi.getTimerCount()).toBe(0)
  vi.clearAllTimers()
  vi.useRealTimers()
  cleanup()
  vi.restoreAllMocks()
  vi.resetModules()
})

export {}
