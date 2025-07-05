import { describe, it, expect, vi } from 'vitest';
import { AIService } from '@/lib/services/AIService';
import { openai } from '@/lib/openaiClient';
import { ZodError } from 'zod';

// Mock the entire openaiClient module
vi.mock('@/lib/openaiClient', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

describe('AIService', () => {
  it('should parse a valid diagram from the OpenAI API', async () => {
    const mockApiResponse = {
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            tool_calls: [
              {
                function: {
                  arguments: JSON.stringify({
                    nodes: [{ id: 'a', label: 'Node A', type: 'rect' }],
                    edges: [],
                  }),
                },
              },
            ],
          },
        },
      ],
    };

    // Configure the mock to return the successful response
    vi.mocked(openai.chat.completions.create).mockResolvedValue(mockApiResponse as any);

    const aiService = new AIService();
    const diagram = await aiService.createDiagram('a simple diagram');

    expect(diagram.nodes).toHaveLength(1);
    expect(diagram.nodes[0].label).toBe('Node A');
    expect(openai.chat.completions.create).toHaveBeenCalledOnce();
  });

  it('should throw a ZodError for invalid data from the OpenAI API', async () => {
    const mockInvalidApiResponse = {
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            tool_calls: [
              {
                function: {
                  // Malformed: 'label' is missing, which is a required field
                  arguments: JSON.stringify({
                    nodes: [{ id: 'a', type: 'rect' }],
                    edges: [],
                  }),
                },
              },
            ],
          },
        },
      ],
    };

    vi.mocked(openai.chat.completions.create).mockResolvedValue(mockInvalidApiResponse as any);

    const aiService = new AIService();

    // Expect the promise to be rejected with a ZodError
    await expect(aiService.createDiagram('an invalid diagram')).rejects.toThrow(ZodError);
  });
});
