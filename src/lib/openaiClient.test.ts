import { vi, describe, test, expect, afterAll } from 'vitest';

// Mock the OpenAI module - we only care that it exports an instance
vi.mock('openai', () => {
  return {
    default: vi.fn(() => {
      return {
        // Mock necessary methods/properties here if needed for future tests
        chat: { completions: { create: vi.fn() } }
      };
    })
  };
});

describe('openaiClient', () => {
  test('exports an OpenAI client instance', async () => {
    // Import the module under test
    const { openai } = await import('./openaiClient');
    
    // Simplified assertion - only verify the essential client exists
    expect(openai).toEqual(expect.any(Object));
    expect(openai.chat).toBeDefined();
  });
  
  // Reset all mocks after the suite to avoid side-effects in other tests
  afterAll(() => {
    vi.resetAllMocks();
  });
});
