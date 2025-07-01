/**
 * Centralized mock for the OpenAI client.
 * Use with vi.mock('../../lib/openaiClient', () => import('../test-utils/mocks/openaiClient'))
 */
import { vi } from 'vitest';

export const openai = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'This is a mock AI response.',
            },
          },
        ],
      }),
    },
  },
};

// Allow customizing the response content when needed
export const setMockResponse = (content: string) => {
  openai.chat.completions.create.mockResolvedValue({
    choices: [
      {
        message: {
          content,
        },
      },
    ],
  });
};

// Reset the mock to default behavior
export const resetMock = () => {
  openai.chat.completions.create.mockResolvedValue({
    choices: [
      {
        message: {
          content: 'This is a mock AI response.',
        },
      },
    ],
  });
};

export default { openai, setMockResponse, resetMock };
