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
