import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { type Mock, beforeEach, describe, expect, test, vi } from 'vitest';
import { ConversationProvider } from './ConversationProvider';
import { useConversationContext } from '../hooks/useConversationContext';
import { openai } from '../lib/openaiClient';

// Mock the OpenAI client
vi.mock('../lib/openaiClient', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

// Mock the logger
vi.mock('../lib/utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('ConversationProvider', () => {
  // Define a reusable wrapper component for tests
  function wrapper({ children }: { children: React.ReactNode }) {
    return <ConversationProvider>{children}</ConversationProvider>;
  }

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Mock localStorage as it's used for persistence
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.getItem = vi.fn();
  });

  describe('Basic Functionality', () => {
    test('should initialize with default values', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      expect(result.current.dialogInput).toBe('');
      expect(result.current.isChatExpanded).toBe(true);
      expect(result.current.showSlideNavigator).toBe(false);
      expect(result.current.localIsLoading).toBe(false);
      expect(result.current.conversations.size).toBe(0);
    });

    test('should update dialog input when setDialogInput is called', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.setDialogInput('Hello, world!');
      });

      expect(result.current.dialogInput).toBe('Hello, world!');
    });

    test('should toggle chat expanded state', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      expect(result.current.isChatExpanded).toBe(true); // Initial state

      act(() => {
        result.current.toggleChatExpanded();
      });

      expect(result.current.isChatExpanded).toBe(false);

      act(() => {
        result.current.toggleChatExpanded();
      });

      expect(result.current.isChatExpanded).toBe(true);
    });
  });

  describe('Conversation Management', () => {
    test('should create new conversation when adding first message', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.addMessage('slide-1', 'user', 'Hello');
      });

      expect(result.current.conversations.size).toBe(1);
      expect(result.current.conversations.has('slide-1')).toBe(true);
      
      const conversation = result.current.conversations.get('slide-1');
      expect(conversation?.messages).toHaveLength(1);
      expect(conversation?.messages[0].content).toBe('Hello');
      expect(conversation?.messages[0].role).toBe('user');
    });

    test('should append messages to existing conversation', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.addMessage('slide-1', 'user', 'Hello');
        result.current.addMessage('slide-1', 'assistant', 'Hi there!');
      });

      const messages = result.current.getMessagesForSlide('slide-1');
      expect(messages).toHaveLength(2);
      expect(messages[1].content).toBe('Hi there!');
      expect(messages[1].role).toBe('assistant');
    });

    test('should clear specific conversation', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.addMessage('slide-1', 'user', 'Hello');
        result.current.addMessage('slide-2', 'user', 'Hi');
      });

      expect(result.current.conversations.size).toBe(2);

      act(() => {
        result.current.clearConversation('slide-1');
      });

      expect(result.current.conversations.size).toBe(1);
      expect(result.current.conversations.has('slide-1')).toBe(false);
      expect(result.current.conversations.has('slide-2')).toBe(true);
    });

    test('should clear all conversations', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.addMessage('slide-1', 'user', 'Hello');
        result.current.addMessage('slide-2', 'user', 'Hi');
      });

      expect(result.current.conversations.size).toBe(2);

      act(() => {
        result.current.clearAllConversations();
      });

      expect(result.current.conversations.size).toBe(0);
    });

    test('should get conversation context with message limit', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.addMessage('slide-1', 'user', `Message ${i}`);
        }
      });

      const context = result.current.getConversationContext('slide-1', 5);
      const lines = context.split('\n');
      
      expect(lines).toHaveLength(5);
      expect(lines[0]).toContain('Message 10');
      expect(lines[4]).toContain('Message 14');
    });
  });

  describe('AI Integration', () => {
    test('should handle successful AI response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'AI response text'
          }
        }]
      };

      (openai.chat.completions.create as Mock).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useConversationContext(), { wrapper });

      await act(async () => {
        await result.current.submitUserMessage('slide-1', 'Test question');
      });

      expect(result.current.localIsLoading).toBe(false);
      expect(result.current.localError).toBeNull();
      
      const messages = result.current.getMessagesForSlide('slide-1');
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Test question');
      expect(messages[1].content).toBe('AI response text');
    });

    test('should parse AI action from JSON response', async () => {
      const mockAction = {
        action: 'addShape',
        shape: 'rectangle',
        label: 'Test Rectangle',
      };
      
      const mockResponse = {
        choices: [
          {
            message: {
              content: 
                'Here is the action:\n```json\n' +
                JSON.stringify(mockAction) +
                '\n```',
            },
          },
        ],
      };

      (openai.chat.completions.create as Mock).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useConversationContext(), { wrapper });

      let aiAction: any;
      await act(async () => {
        aiAction = await result.current.submitUserMessage('slide-1', 'Add a rectangle');
      });

      expect(aiAction).toEqual(mockAction);
    });

    test('should handle AI API errors', async () => {
      (openai.chat.completions.create as Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useConversationContext(), { wrapper });

      await act(async () => {
        await result.current.submitUserMessage('slide-1', 'Test question');
      });

      expect(result.current.localError).toBe('Failed to get response from AI.');
      expect(result.current.localIsLoading).toBe(false);
    });

    test('should handle invalid AI action JSON', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Here is the action:\n```json\n{"invalid": "structure"}\n```'
          }
        }]
      };

      (openai.chat.completions.create as Mock).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useConversationContext(), { wrapper });

      let aiAction: any;
      await act(async () => {
        aiAction = await result.current.submitUserMessage('slide-1', 'Test');
      });

      expect(aiAction).toBeNull();
      expect(result.current.localError).toBe('AI returned an invalid action.');
    });

    test('should not submit empty messages', async () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      await act(async () => {
        await result.current.submitUserMessage('slide-1', '  ');
      });

      expect(openai.chat.completions.create).not.toHaveBeenCalled();
    });
  });

  describe('State Persistence', () => {
    test('should load conversations from localStorage on init', () => {
      const storedState = {
        conversations: [
          ['slide-1', { messages: [{ role: 'user', content: 'Stored message' }] }],
        ],
        isChatExpanded: false,
      };

      Storage.prototype.getItem = vi.fn().mockReturnValueOnce(JSON.stringify(storedState));

      const { result } = renderHook(() => useConversationContext(), { wrapper });

      expect(result.current.isChatExpanded).toBe(false);
      expect(result.current.conversations.size).toBe(1);
      const messages = result.current.getMessagesForSlide('slide-1');
      expect(messages[0].content).toBe('Stored message');
    });

    test('should save conversations to localStorage on change', () => {
      const { result } = renderHook(() => useConversationContext(), { wrapper });

      act(() => {
        result.current.addMessage('slide-1', 'user', 'New message');
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'conversationState',
        expect.stringContaining('"content":"New message"')
      );
    });
  });
});
