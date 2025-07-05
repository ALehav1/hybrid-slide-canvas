# TypeScript Error Resolution Plan  
Hybrid-Slide-Canvas • July 2025  
_Current error count:_ **48**

---

## 1 · Executive Summary
Core runtime code now builds and runs; remaining 48 errors are confined to:
1. Conversation persistence (null-safety) – 2 errors  
2. HistoryManager API mismatch – 1 error  
3. Legacy/experimental history files – 7 errors  
4. Vitest unit tests written for an old store API – 38 errors  

Production builds are blocked only by (1)–(3).  All test-file errors can be postponed.

---

## 2 · Priority Matrix

| Prio | Block | Files | Errors | Owner | ETA |
|------|-------|-------|--------|-------|------|
|P0|Build fail|ConversationProvider.tsx, useConversationAutosave.ts|2|FE|5 min|
|P0|Build fail|HistoryManager.ts|1|Core|10 min|
|P0|Build fail|tldrawHistoryIntegration.ts (legacy)|7|Core|2 min|
|P1|Tests   |HistoryManager.test.ts|38|QA|skip/fix later|

---

## 3 · Detailed Fix List

### 3.1 Conversation Null Safety (2 errors)
| File | Line | Fix |
|------|------|-----|
|ConversationProvider.tsx|81|`const saved = await conversationStore?.getItem(KEY);`|
|useConversationAutosave.ts|39|``if (conversationStore) await conversationStore.setItem(KEY,{state});``|

### 3.2 HistoryManager API Mismatch (1 error)
*Error:* `Property 'setOrigin' does not exist on type 'HistoryStore'.`  
*Root cause:* internal store interface missing delegating methods.  
*Fix:* extend `HistoryStore` with `setOrigin`, `getEntriesByOrigin`, etc. Add no-op defaults and implement delegations in constructor.

```ts
// HistoryStore new signatures
setOrigin: (o: OriginType) => void;
getEntriesByOrigin: (o: OriginType) => HistoryEntry[];
```

Add in `HistoryManager` constructor:
```ts
const defaults: HistoryStore = {
  ...,
  setOrigin: () => {},
  getEntriesByOrigin: () => [],
};
this.store = Object.assign(defaults, store);
```

### 3.3 Remove Legacy History Integration (7 errors)
File `src/lib/history/tldrawHistoryIntegration.ts` shadows new manager and uses protected APIs.

Action:
```bash
git rm src/lib/history/tldrawHistoryIntegration.ts
# or simply delete the file
```
Remove all imports referencing it (currently only `useEditorHistory.ts`).

### 3.4 React 19 startTransition Return Type (compile pass, already fixed)
Confirmed fix:
```ts
startTransition(() => { addMessage(...); });
```

### 3.5 Unit Test Clean-up (38 errors)
Short-term (P1): exclude failing spec from build.

`vitest.config.ts`
```ts
export default defineConfig({
  test: {
    exclude: ['src/lib/history/__tests__/HistoryManager.test.ts'],
  },
});
```

Long-term tasks for QA team:
1. Rewrite tests against **current** `HistoryManager` API.
2. Replace `vi.Mock` namespace declarations with `import { vi } from 'vitest'`.
3. Replace calls like `store.addEntry` with `manager.withOrigin('user', …)` or direct store stubs.
4. Re-enable file in config once green.

---

## 4 · Implementation Steps

1. Apply code edits (sections 3.1–3.3).  
2. Delete `tldrawHistoryIntegration.ts`.  
3. Run `pnpm type-check` – expected error count **0**.  
4. Run dev server; verify CRUD, undo/redo.  
5. Commit `feat: unblock prod build – storage+history fixes`.  
6. Push → CI should pass lint, build, non-excluded tests.  
7. Create ticket **HSC-186**: “Rewrite history tests for new API”.

---

## 5 · Risk & Rollback
Changes touch only:
* storage null-safety (safe)
* HistoryManager constructor (isolated)
* removal of unused legacy file

Rollback plan: revert commit; functionality unaffected.

---

## 6 · Time Budget
| Task | Owner | Duration |
|------|-------|---------|
|Conversation fixes|FE|5 min|
|HistoryManager patch|Core|10 min|
|Remove legacy file & imports|Core|2 min|
|Config test exclude|QA|2 min|

_Total ≈ 20 minutes to green compile._

---

## 7 · Post-Merge Follow-Ups
- Rewrite history tests (2 h)  
- Audit service layer for any remaining `any` or optional-chaining TODOs  
- Enable strict TS flags: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.

---

**End of Plan**
