// src/test/setup.ts
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { indexedDB, IDBKeyRange } from 'fake-indexeddb'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange

// optional: wipe DB before each test file
beforeEach(async () => {
  const dbs = await indexedDB.databases()
  await Promise.all(dbs.map(d => d.name && indexedDB.deleteDatabase(d.name)))
})
