/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mocks must be declared before any imports that use them
import { mockGetItem, mockSetItem } from '@/__tests__/test-utils/mocks/conversationStorage';
import { mockOpenAIChatCompletionsCreate } from '@/__tests__/test-utils/mocks/openaiClient';
import { logger } from '@/lib/utils/logging';

// Mock the debounce timeout to a shorter value for testing
vi.mock('@/hooks/useConversationAutosave', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    SAVE_DEBOUNCE_MS: 50, // Override with a much shorter timeout for tests
  };
});

vi.mock('@/lib/storage/conversationStorage', () => import('@/__tests__/test-utils/mocks/conversationStorage'));
vi.mock('@/lib/openaiClient', () => import('@/__tests__/test-utils/mocks/openaiClient'));
vi.mock('@/lib/utils/logging', () => import('@/__tests__/test-utils/mocks/logging'));

// Imports that depend on mocks
import { ConversationProvider } from './ConversationProvider';
import { useConversationContext } from '../hooks/useConversationContext';
import { CONVERSATION_STORE_KEY, type ConversationState } from '../lib/storage/conversationStorage';
import type { ConversationContextType } from '../context/ConversationContext';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConversationProvider>{children}</ConversationProvider>
);

beforeEach(() => {
  // Use real timers for ConversationProvider tests since they involve complex async storage operations
  vi.useRealTimers();
  // Ensure mocks resolve immediately with proper values
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockOpenAIChatCompletionsCreate.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

const waitForStorageLoad = async (result: { result: { current: ConversationContextType } }) => {
  // Wait for storage loading to complete with real timers
  await waitFor(() => expect(result.result.current.storageIsLoading).toBe(false), { 
    timeout: 5000,
    interval: 100 
  });
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

    const hookResult = renderHook(() => useConversationContext(), { wrapper: Wrapper });
    await waitForStorageLoad(hookResult);

    expect(mockGetItem).toHaveBeenCalledWith(CONVERSATION_STORE_KEY);
    expect(hookResult.result.current.isChatExpanded).toBe(false);
    expect(hookResult.result.current.getMessagesForSlide('slide-1')[0].content).toBe('Stored message');
  });

  test('debounces and stores updates to Dexie', async () => {
    // Use real timers throughout the test for simplicity and reliability
    const hookResult = renderHook(() => useConversationContext(), { wrapper: Wrapper });
    
    // Wait for initial storage loading to complete
    await waitForStorageLoad(hookResult);
    
    // Verify initial state
    expect(mockSetItem).not.toHaveBeenCalled();
    
    // Add a message which should trigger the debounced save
    act(() => { 
      hookResult.result.current.addMessage('slide-1', 'user', 'New message');
    });
    
    // Wait for the debounced save to occur (using a longer timeout to be safe)
    await waitFor(() => expect(mockSetItem).toHaveBeenCalledTimes(1), { 
      timeout: 1000,  // Generous timeout to avoid flakiness
      interval: 50    // Check frequently
    });
    
    // Verify the saved data
    const [key, payload] = mockSetItem.mock.calls[0];
    expect(key).toBe(CONVERSATION_STORE_KEY);
    expect(payload.state.conversations[0][1].messages[0].content).toBe('New message');
  });
});

describe('ConversationProvider – AI integration', () => {
  test('gracefully handles OpenAI errors', async () => {
    mockOpenAIChatCompletionsCreate.mockRejectedValueOnce(new Error('Network error'));
    const hookResult = renderHook(() => useConversationContext(), { wrapper: Wrapper });
    await waitForStorageLoad(hookResult);

    await act(async () => { await hookResult.result.current.submitUserMessage('slide-1', 'Question'); });

    expect(hookResult.result.current.localError).toBe('Failed to get a valid response from the AI. Please try again.');
  });

  test('handles successful AI response', async () => {
    // Return a JSON string that conforms to AiActionSchema
    const validAiAction = { action: 'addShape', shape: 'rectangle' };
    mockOpenAIChatCompletionsCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(validAiAction) } }],
    });
    const hookResult = renderHook(() => useConversationContext(), { wrapper: Wrapper });
    await waitForStorageLoad(hookResult);

    await act(async () => { await hookResult.result.current.submitUserMessage('slide-1', 'Test question'); });

    const msgs = hookResult.result.current.getMessagesForSlide('slide-1');
    expect(msgs).toHaveLength(2);
    expect(msgs[1].content).toContain('"addShape"');
  });
});
