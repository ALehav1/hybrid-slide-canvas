import { vi } from 'vitest';

export const mockOpenAIChatCompletionsCreate = vi.fn();

export const openai = {
  chat: {
    completions: {
      create: mockOpenAIChatCompletionsCreate,
    },
  },
};
