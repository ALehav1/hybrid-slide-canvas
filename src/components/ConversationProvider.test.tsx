/**
 * @vitest-environment jsdom
 *
 * ConversationProvider – integration & persistence tests
 *
 * NOTE
 * ────
 * • The provider uses React state + Dexie-backed helpers, *not* a persisted Zustand
 *   store, so we wait for `storageIsLoading === false` after render-mount.
 * • Storage is mocked at the module edge (conversationStorage) so tests never hit
 *   IndexedDB.  All behaviour is verified through the spyable mock functions.
 */

import React from 'react';
import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  test,
  vi,
} from 'vitest';

import { ConversationProvider } from './ConversationProvider';
import { useConversationContext } from '../hooks/useConversationContext';
import conversationStore, {
  CONVERSATION_STORE_KEY,
  type ConversationState,
} from '../lib/storage/conversationStorage';
import { openai } from '../lib/openaiClient';

/* ───────────────────  Mocks  ─────────────────── */

vi.mock('../lib/storage/conversationStorage', () => ({
  __esModule: true,
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
  CONVERSATION_STORE_KEY: 'conversationState',
}));

vi.mock('../lib/openaiClient', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

vi.mock('../lib/utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

/* ───────────────────  Test Wrapper  ─────────────────── */

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConversationProvider>{children}</ConversationProvider>
);

/* ───────────────────  Lifecycle Hooks  ─────────────────── */

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();

  (conversationStore!.getItem as Mock).mockResolvedValue(null);
  (conversationStore!.setItem as Mock).mockResolvedValue(void 0);
});

afterEach(() => {
  vi.useRealTimers();
});

/* ───────────────────  Suites  ─────────────────── */

describe('ConversationProvider – basic behaviour', () => {
  test('initialises with default values', async () => {
    const { result } = renderHook(() => useConversationContext(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.storageIsLoading).toBe(false);
    });

    expect(result.current.dialogInput).toBe('');
    expect(result.current.isChatExpanded).toBe(true);
    expect(result.current.showSlideNavigator).toBe(false);
    expect(result.current.localIsLoading).toBe(false);
    expect(result.current.conversations.size).toBe(0);
  });

  test('updates dialog input', async () => {
    const { result } = renderHook(() => useConversationContext(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.storageIsLoading).toBe(false));

    act(() => {
      result.current.setDialogInput('Hello, world!');
    });

    expect(result.current.dialogInput).toBe('Hello, world!');
  });

  test('toggles chat-panel expansion', async () => {
    const { result } = renderHook(() => useConversationContext(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.storageIsLoading).toBe(false));

    expect(result.current.isChatExpanded).toBe(true);

    act(() => result.current.toggleChatExpanded());
    expect(result.current.isChatExpanded).toBe(false);

    act(() => result.current.toggleChatExpanded());
    expect(result.current.isChatExpanded).toBe(true);
  });
});

describe('ConversationProvider – conversation CRUD', () => {
  test('creates a new conversation when the first message arrives', async () => {
    const { result } = renderHook(() => useConversationContext(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.storageIsLoading).toBe(false));

    act(() => {
      result.current.addMessage('slide-1', 'user', 'Hello');
    });

    expect(result.current.conversations.size).toBe(1);
    const convo = result.current.conversations.get('slide-1')!;
    expect(convo.messages).toHaveLength(1);
    expect(convo.messages[0].content).toBe('Hello');
  });

  test('appends messages to an existing conversation', async () => {
    const { result } = renderHook(() => useConversationContext(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.storageIsLoading).toBe(false));

    act(() => {
      result.current.addMessage('slide-1', 'user', 'Hello');
      result.current.addMessage('slide-1', 'assistant', 'Hi there!');
    });

    const msgs = result.current.getMessagesForSlide('slide-1');
    expect(msgs).toHaveLength(2);
    expect(msgs[1].role).toBe('assistant');
  });

  test('clears a specific conversation', async () => {
    const { result } = renderHook(() => useConversationContext(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.storageIsLoading).toBe(false));

    act(() => {
      result.current.addMessage('slide-1', 'user', 'Hello');
      result.current.addMessage('slide-2', 'user', 'Hi');
    });
    expect(result.current.conversations.size).toBe(2);

    act(() => result.current.clearConversation('slide-1'));
    expect(result.current.conversations.has('slide-1')).toBe(false);
    expect(result.current.conversations.size).toBe(1);
  });

  test('clears all conversations', async () => {
    const { result } = renderHook(() => useConversationContext(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.storageIsLoading).toBe(false));

    act(() => {
      result.current.addMessage('slide-1', 'user', 'Hello');
      result.current.addMessage('slide-2', 'user', 'Hi');
    });

    act(() => result.current.clearAllConversations());
    expect(result.current.conversations.size).toBe(0);
  });
});

describe('ConversationProvider – AI integration', () => {
  test('handles a successful OpenAI response', async () => {
    (openai.chat.completions.create as Mock).mockResolvedValueOnce({
      choices: [{ message: { content: 'AI response text' } }],
    });

    const { result } = renderHook(() => useConversationContext(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.storageIsLoading).toBe(false));

    await act(async () => {
      await result.current.submitUserMessage('slide-1', 'Test question');
    });

    const msgs = result.current.getMessagesForSlide('slide-1');
    expect(msgs).toHaveLength(2);
    expect(msgs[1].content).toBe('AI response text');
  });

  test('parses an AI action returned as JSON', async () => {
    const mockAction = { action: 'addShape', shape: 'rectangle' };
    (openai.chat.completions.create as Mock).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: `Here is the action:\n\`\`\`json\n${JSON.stringify(
              mockAction,
            )}\n\`\`\``,
          },
        },
      ],
    });

    const { result } = renderHook(() => useConversationContext(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.storageIsLoading).toBe(false));

    let aiAction: unknown;
    await act(async () => {
      aiAction = await result.current.submitUserMessage(
        'slide-1',
        'Add a rectangle',
      );
    });
    expect(aiAction).toEqual(mockAction);
  });

  test('gracefully handles OpenAI errors', async () => {
    (openai.chat.completions.create as Mock).mockRejectedValueOnce(
      new Error('Network error'),
    );

    const { result } = renderHook(() => useConversationContext(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.storageIsLoading).toBe(false));

    await act(async () => {
      await result.current.submitUserMessage('slide-1', 'Question');
    });

    expect(result.current.localError).toBe('Failed to get response from AI.');
  });
});

describe('ConversationProvider – persistence', () => {
  test('hydrates from Dexie on mount', async () => {
    const storedState: ConversationState = {
      conversations: [
        [
          'slide-1',
          {
            slideId: 'slide-1',
            messages: [
              { role: 'user', content: 'Stored message', timestamp: new Date() },
            ],
            lastModified: Date.now(),
          },
        ],
      ],
      isChatExpanded: false,
    };

    (conversationStore!.getItem as Mock).mockResolvedValueOnce({
      state: storedState,
    });

    const { result } = renderHook(() => useConversationContext(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.storageIsLoading).toBe(false));

    expect(conversationStore!.getItem).toHaveBeenCalledWith(
      CONVERSATION_STORE_KEY,
    );
    expect(result.current.isChatExpanded).toBe(false);
    expect(
      result.current.getMessagesForSlide('slide-1')[0].content,
    ).toBe('Stored message');
  });

  test('debounces and stores updates to Dexie', async () => {
    const setItemSpy = vi.spyOn(conversationStore!, 'setItem');

    const { result } = renderHook(() => useConversationContext(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.storageIsLoading).toBe(false));
    setItemSpy.mockClear(); // drop initial save

    act(() => {
      result.current.addMessage('slide-1', 'user', 'New message');
    });

    act(() => {
      vi.advanceTimersByTime(310); // debounce = 300 ms
    });

    await waitFor(() => expect(setItemSpy).toHaveBeenCalledTimes(1));
    const [, payload] = setItemSpy.mock.calls[0];
    expect(payload.state.conversations[0][0]).toBe('slide-1');
  });
});