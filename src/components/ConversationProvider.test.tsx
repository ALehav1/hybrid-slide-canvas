/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mocks must be declared before any imports that use them
import { mockGetItem, mockSetItem } from '@/__tests__/test-utils/mocks/conversationStorage';
import { mockOpenAIChatCompletionsCreate } from '@/__tests__/test-utils/mocks/openaiClient';

vi.mock('@/lib/storage/conversationStorage', () => import('@/__tests__/test-utils/mocks/conversationStorage'));
vi.mock('@/lib/openaiClient', () => import('@/__tests__/test-utils/mocks/openaiClient'));
vi.mock('@/lib/utils/logging', () => import('@/__tests__/test-utils/mocks/logging'));

// Imports that depend on mocks
import { ConversationProvider } from './ConversationProvider';
import { useConversationContext } from '../hooks/useConversationContext';
import { CONVERSATION_STORE_KEY, type ConversationState } from '../lib/storage/conversationStorage';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConversationProvider>{children}</ConversationProvider>
);

beforeEach(() => {
  vi.useFakeTimers();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockOpenAIChatCompletionsCreate.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

const waitForStorageLoad = async (result: any) => {
  await waitFor(() => expect(result.current.storageIsLoading).toBe(false));
};

describe('ConversationProvider – persistence', () => {
  test('hydrates from Dexie on mount', async () => {
    const storedState: ConversationState = {
      conversations: [
        ['slide-1', { slideId: 'slide-1', messages: [{ role: 'user', content: 'Stored message', timestamp: new Date() }], lastModified: new Date() }],
      ],
      isChatExpanded: false,
    };
    mockGetItem.mockResolvedValueOnce({ state: storedState });

    const { result } = renderHook(() => useConversationContext(), { wrapper: Wrapper });
    await waitForStorageLoad(result);

    expect(mockGetItem).toHaveBeenCalledWith(CONVERSATION_STORE_KEY);
    expect(result.current.isChatExpanded).toBe(false);
    expect(result.current.getMessagesForSlide('slide-1')[0].content).toBe('Stored message');
  });

  test('debounces and stores updates to Dexie', async () => {
    const { result } = renderHook(() => useConversationContext(), { wrapper: Wrapper });
    await waitForStorageLoad(result);

    act(() => { result.current.addMessage('slide-1', 'user', 'New message'); });

    expect(mockSetItem).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(310); });

    await waitFor(() => expect(mockSetItem).toHaveBeenCalledTimes(1));
    const [key, payload] = mockSetItem.mock.calls[0];
    expect(key).toBe(CONVERSATION_STORE_KEY);
    expect(payload.state.conversations[0][1].messages[0].content).toBe('New message');
  });
});

describe('ConversationProvider – AI integration', () => {
  test('gracefully handles OpenAI errors', async () => {
    mockOpenAIChatCompletionsCreate.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useConversationContext(), { wrapper: Wrapper });
    await waitForStorageLoad(result);

    await act(async () => { await result.current.submitUserMessage('slide-1', 'Question'); });

    expect(result.current.localError).toBe('Failed to get a valid response from the AI. Please try again.');
  });

  test('handles successful AI response', async () => {
    mockOpenAIChatCompletionsCreate.mockResolvedValueOnce({ choices: [{ message: { content: 'AI response text' } }] });
    const { result } = renderHook(() => useConversationContext(), { wrapper: Wrapper });
    await waitForStorageLoad(result);

    await act(async () => { await result.current.submitUserMessage('slide-1', 'Test question'); });

    const msgs = result.current.getMessagesForSlide('slide-1');
    expect(msgs).toHaveLength(2);
    expect(msgs[1].content).toContain('AI response text');
  });
});