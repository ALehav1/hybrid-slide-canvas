import { beforeEach, afterEach, describe, expect, test } from 'vitest';
import createDexieStorage, { db } from '../dexieStorage';
import Dexie from 'dexie';

// The object returned by createDexieStorage doesn't have a static type, so we infer it.
type DexieStorage = ReturnType<typeof createDexieStorage>;

// Use a consistent DB name for testing. The global setup will clear it.
const testDbName = 'hybrid-slide-canvas-db';

describe('DexieStorage', () => {
  // NOTE: `storage` is initialized in `beforeEach`. The non-null assertion `!` is
  // used to assure TypeScript that it will be defined before any test runs.
  let storage: DexieStorage = null!;

  // Open a fresh storage instance for each spec.
  beforeEach(() => {
    storage = createDexieStorage({ name: testDbName });
  });

  // Close the singleton DB connection before the global cleanup hook runs.
  afterEach(async () => {
    // This is the critical step that releases the connection lock.
    if (db.isOpen()) {
      await db.close();
    }
  });

  test('setItem persists a record and getItem retrieves it', async () => {
    const key = 'test-key';
    // Zustand's storage interface expects a `StorageValue` object with a `state` property.
    const value = { state: { data: 'test-value' } };

    await storage.setItem(key, value);
    const retrievedValue = await storage.getItem(key);

    expect(retrievedValue).toEqual(value);
  });

  test('removeItem deletes data', async () => {
    const key = 'delete-me';
    await storage.setItem(key, { state: { data: 'to-be-deleted' } });
    await storage.removeItem(key);
    const retrievedValue = await storage.getItem(key);

    expect(retrievedValue).toBeNull();
  });
});

// A separate suite for testing the key prefix logic.
describe('DexieStorage with keyPrefix', () => {
  const keyPrefix = 'user-prefix:';
  let storage: DexieStorage = null!;

  beforeEach(() => {
    // Note: The current implementation of createDexieStorage uses the `name` option
    // as a prefix, not a separate `keyPrefix`. We test this behavior.
    storage = createDexieStorage({ name: keyPrefix });
  });

  afterEach(async () => {
    if (db.isOpen()) {
      await db.close();
    }
  });

  test('applies the user-defined key prefix', async () => {
    const key = 'test-key';
    const value = { state: { data: 1 } };
    await storage.setItem(key, value);

    // Verify directly using a raw Dexie connection.
    const rawDb = new Dexie(testDbName);
    rawDb.version(1).stores({ zustandStore: 'id' });
    // The record is stored with the key prefix.
    const record = await rawDb.table('zustandStore').get(`${keyPrefix}${key}`);
    
    expect(record).toBeDefined();
    // The value in the DB is a JSON string of the full StorageValue object.
    expect(JSON.parse(record!.value)).toEqual(value);
    
    // Remember to close the temporary raw connection.
    rawDb.close();
  });
});