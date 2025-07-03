import { vi } from 'vitest';

export const mockOpenAIChatCompletionsCreate = vi.fn();

export default {
  chat: {
    completions: {
      create: mockOpenAIChatCompletionsCreate,
    },
  },
};
