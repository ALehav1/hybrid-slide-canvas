# Mocks

All Vitest/JSDOM/fake-IndexedDB stubs live here in a single centralized location.

## Usage

Import mocks from this central location:

```typescript
import { mockIndexedDb, mockNanoid, mockEditor, mockOpenAI } from '../test-utils/mocks'
```

## Implementation Guidelines

1. Every mock should:
   - Use Vitest's `vi` for mocking (not Jest's `jest`)
   - Be properly typed with TypeScript
   - Export through the central `index.ts` file
   - Include reset functions for test isolation

2. Common mock patterns:
   - For simple functions: `vi.fn().mockImplementation(() => ...)`
   - For modules: `vi.mock('module-name', () => mockImplementation)`
   - For factories: Export factory functions like `createMockDB()`

## Mock List

- **mockIndexedDb**: Simulates IndexedDB storage using fake-indexeddb
- **mockDexie**: Provides a factory for creating mock Dexie databases
- **mockNanoid**: Provides predictable IDs for testing
- **mockEditor**: Simulates the TLDraw editor for canvas tests
- **mockOpenAI**: Mocks OpenAI API responses for testing AI integrations

## Consolidated Mocks

This directory is the **only** place for test mocks. All mocks have been consolidated here from:

- `src/__mocks__/` (legacy Jest-style mocks)
- `src/lib/__mocks__/` (module-specific mocks)

The legacy directories are deprecated and will be removed.

## Vitest vs Jest Mocking

We've migrated from Jest to Vitest mocking patterns:

- Use `vi.mock()` instead of `jest.mock()`
- Use `vi.fn()` instead of `jest.fn()`
- Import mocks explicitly rather than relying on auto-mocking
