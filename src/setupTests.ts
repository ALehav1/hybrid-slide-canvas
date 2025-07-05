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
  // ✅ REMOVED: vi.useFakeTimers() - Individual tests manage their own timers
})

afterEach(() => {
  // ✅ DEFENSIVE TIMER CLEANUP - Only run if fake timers are currently active
  if (vi.isFakeTimers()) {
    vi.runOnlyPendingTimers()
    // Timer leak detection (only when fake timers are active)
    expect(vi.getTimerCount()).toBe(0)
    vi.clearAllTimers()
    vi.useRealTimers()
  }
  
  // Global cleanup (always safe)
  cleanup()
  vi.restoreAllMocks()
  vi.resetModules()
})

export {}
