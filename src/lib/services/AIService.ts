import { openai } from '@/lib/openaiClient'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

/* ---------- response schema ---------- */
export const DiagramSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string(),
      type: z.enum(['rect', 'diamond', 'ellipse']).default('rect'),
    })
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
    })
  ),
})
export type Diagram = z.infer<typeof DiagramSchema>
export type DiagramJSON = Diagram

/* ---------- service ---------- */
export class AIService {
  async createDiagram(prompt: string): Promise<Diagram> {
    const toolSchema = {
      type: 'function',
      function: {
        name: 'createDiagram',
        description: 'Return nodes and edges for a diagram.',
        parameters: zodToJsonSchema(DiagramSchema),
      },
    } as const;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a diagram assistant.' },
        { role: 'user', content: prompt },
      ],
      tools: [toolSchema],
      tool_choice: { type: 'function', function: { name: 'createDiagram' } },
    });

    // DEV_NOTE: Log the full response for debugging.
    // eslint-disable-next-line no-console
    console.log('OpenAI API Response:', JSON.stringify(response, null, 2));

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('OpenAI returned no choices.');
    }

    // Check for abnormal finish reasons
    if (choice.finish_reason !== 'tool_calls') {
      throw new Error(`OpenAI finished with reason: ${choice.finish_reason}. Expected 'tool_calls'.`);
    }

    const message = choice.message;
    if (!message || !message.tool_calls) {
      throw new Error('OpenAI response is missing the message or tool_calls.');
    }

    const call = message.tool_calls[0];
    if (!call?.function.arguments) {
      throw new Error('No tool_calls with function arguments returned.');
    }

    const json: unknown = JSON.parse(call.function.arguments);
    return DiagramSchema.parse(json); // zod validation
  }
}
