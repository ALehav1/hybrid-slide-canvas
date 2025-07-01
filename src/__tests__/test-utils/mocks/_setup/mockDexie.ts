/**
 * Centralized Dexie mock for tests
 * 
 * This follows the pattern described in the recipe for stable, deterministic Dexie mocking.
 * IMPORTANT: Import this file BEFORE any imports that might use Dexie
 */
import { vi } from 'vitest';

export class MockTable<T = any> {
  private data: Record<string, any> = {};
  
  get    = vi.fn(async (id: string) => this.data[id] ?? null);
  put    = vi.fn(async (it: T & { id: string }) => {
    this.data[it.id] = it;
    return it.id;
  });
  delete = vi.fn(async (id: string) => { delete this.data[id]; });
  clear  = vi.fn(async () => { this.data = {}; });
}

export class MockDexie {
  // *** IMPORTANT: keep the name identical to the production schema ***
  zustandStore = new MockTable();

  constructor(name: string) { 
    console.debug(`[MockDexie] DB <${name}> created`); 
  }

  version() { return this; }
  stores()  { return this; }
  open   = vi.fn(async () => this);
  close  = vi.fn();
  isOpen = () => true;
  on     = { versionchange: { add: vi.fn() } };
}

// Vitest's hoisting ensures this runs before any import that follows
vi.mock('dexie', () => ({ default: MockDexie }));
