/**
 * Deep-freeze helper for catching accidental mutations ⛑️
 * – Runs only when `import.meta.env.DEV`
 * – Handles circular references via a `WeakSet`
 * – Freezes symbol keys & arrays
 * – Leaves exotic objects (Map, Set …) untouched by default
 * 
 * Used in Zustand dev middleware to detect mutation attempts early
 */
export const deepFreeze = <T>(input: T): T => {
  if (import.meta.env.PROD || typeof input !== 'object' || input === null) return input;

  const seen = new WeakSet<object>();

  const freezeRecursively = (obj: any) => {
    if (typeof obj !== 'object' || obj === null || seen.has(obj)) return;
    seen.add(obj);

    // freeze the container first
    Object.freeze(obj);

    // include both string & symbol keys
    for (const key of Reflect.ownKeys(obj)) {
      // eslint-disable-next-line security/detect-object-property-access
      freezeRecursively(obj[key as keyof typeof obj]);
    }
  };

  freezeRecursively(input);
  return input;
};
