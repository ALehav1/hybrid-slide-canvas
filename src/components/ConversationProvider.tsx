import React, { useState, useCallback, useRef, useMemo, type ReactNode } from 'react';
import {
  ConversationContext,
  type ConversationContextType,
  type ConversationMessage,
  type SlideConversation,
} from '../context/ConversationContext';
import { logger } from '../lib/utils/logging';
import { openai } from '../lib/openaiClient';
import { type AiAction, AiActionSchema } from './Chat/aiActions';

const SLIDE_ID_REGEX = /^slide-[\w-]+$/;
const MAX_MESSAGE_LENGTH = 10000;

/**
 * ConversationProvider Props
 */
interface ConversationProviderProps {
  children: ReactNode;
  initialExpanded?: boolean;
}

/**
 * Enhanced ConversationProvider Component
 * Centralized state management for conversation UI, interactions, and data
 * 
 * Manages:
 * - Chat interface state (input, expanded state)
 * - Slide navigation state (current input, navigator visibility)
 * - Loading and error states (local loading, typing indicators)
 * - Drag and drop state (slide reordering)
 * - Conversation data (messages per slide, conversation history)
 * 
 * This provider consolidates all conversation-related logic to eliminate
 * competing state management systems and provide a single source of truth.
 */
export const ConversationProvider: React.FC<ConversationProviderProps> = ({
  children,
  initialExpanded = true
}) => {
  // UI State
  const [dialogInput, setDialogInput] = useState('');
  const [isChatExpanded, setIsChatExpanded] = useState(initialExpanded);
  const [showSlideNavigator, setShowSlideNavigator] = useState(false);
  const [slideNumberInput, setSlideNumberInput] = useState('');
  
  // Loading & Error States
  const [localIsLoading, setLocalIsLoading] = useState(false);
  const [localIsTyping, setLocalIsTyping] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Conversation state version counter - incremented to force re-renders when Map changes
  const [conversationVersion, setConversationVersion] = useState(0);
  
  // Drag & Drop State
  const [draggedSlide, setDraggedSlide] = useState<number | null>(null);
  const [dragOverSlide, setDragOverSlide] = useState<number | null>(null);
  
  // Conversation Data State
  const conversationsRef = useRef<Map<string, SlideConversation>>(new Map());
  const submitQueueRef = useRef<Promise<AiAction | null>>(Promise.resolve(null));
  const MAX_CONVERSATIONS = 100; // Max conversations to keep in memory

  // --- State Persistence ---

  // Load state from localStorage on initial render
  React.useEffect(() => {
    try {
      const savedState = localStorage.getItem('conversationState');
      if (savedState) {
        const { conversations, isChatExpanded } = JSON.parse(savedState);
        if (conversations) {
          conversationsRef.current = new Map(conversations);
          setConversationVersion((v) => v + 1); // Force re-render
        }
        if (typeof isChatExpanded === 'boolean') {
          setIsChatExpanded(isChatExpanded);
        }
      }
    } catch (error) {
      logger.error('Failed to load conversation state from localStorage', error);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Save state to localStorage whenever it changes
  React.useEffect(() => {
    try {
      const stateToSave = {
        conversations: Array.from(conversationsRef.current.entries()),
        isChatExpanded,
      };
      localStorage.setItem('conversationState', JSON.stringify(stateToSave));
    } catch (error) {
      logger.error('Failed to save conversation state to localStorage', error);
    }
  }, [conversationVersion, isChatExpanded]);

  // UI Convenience Methods
  const toggleChatExpanded = useCallback(() => {
    setIsChatExpanded(prev => !prev);
  }, []);
  
  const toggleSlideNavigator = useCallback(() => {
    setShowSlideNavigator(prev => !prev);
  }, []);
  
  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);
  
  const resetDragState = useCallback(() => {
    setDraggedSlide(null);
    setDragOverSlide(null);
  }, []);
  
  const clearInput = useCallback(() => {
    setDialogInput('');
  }, []);
  
  const resetChatState = useCallback(() => {
    setIsChatExpanded(false);
    setDialogInput('');
    setLocalIsLoading(false);
    setLocalIsTyping(false);
    setLocalError(null);
  }, []);
  
  // Conversation Data Methods
  const getConversation = useCallback((slideId: string): SlideConversation => {
    const conversations = conversationsRef.current;
    if (!conversations.has(slideId)) {
      const newConversation: SlideConversation = {
        slideId,
        messages: [],
        lastModified: Date.now()
      };
      conversations.set(slideId, newConversation);
    }
    return conversations.get(slideId)!;
  }, []);
  
  const addMessage = useCallback((slideId: string, role: 'user' | 'assistant', content: string): SlideConversation => {
    // Validate slideId format
    if (!SLIDE_ID_REGEX.test(slideId)) {
      const errorMsg = `Invalid slideId format: ${slideId}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Validate message length
    if (content.length > MAX_MESSAGE_LENGTH) {
      const errorMsg = `Message too long: ${content.length} characters (max: ${MAX_MESSAGE_LENGTH})`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const conversation = getConversation(slideId);
    conversation.messages.push({ role, content, timestamp: new Date() });
    conversation.lastModified = Date.now();
    conversationsRef.current.set(slideId, conversation);

    // Cleanup old conversations if exceeding limit
    if (conversationsRef.current.size > MAX_CONVERSATIONS) {
      const sortedConversations = Array.from(conversationsRef.current.entries())
        .sort((a, b) => a[1].lastModified - b[1].lastModified);
      
      // Remove oldest 10% of conversations
      const toRemove = Math.floor(MAX_CONVERSATIONS * 0.1);
      for (let i = 0; i < toRemove; i++) {
        conversationsRef.current.delete(sortedConversations[i][0]);
      }
    }

    setConversationVersion(v => v + 1);
    return conversation;
  }, [getConversation]);

  const clearConversation = useCallback((slideId: string) => {
    conversationsRef.current.delete(slideId);
    
    // Increment version to force re-render
    setConversationVersion(prev => {
      const newVersion = prev + 1;
      return newVersion;
    });
    
    logger.debug(`Cleared conversation for slideId: ${slideId}`);
  }, []);
  
  const clearAllConversations = useCallback(() => {
    conversationsRef.current.clear();
    
    // Increment version to force re-render
    setConversationVersion(prev => prev + 1);
    
    logger.debug('Cleared all conversations');
  }, []);
  
  const getConversationContext = useCallback((slideId: string, maxMessages: number = 10): string => {
    const conversation = getConversation(slideId);
    const recentMessages = conversation.messages.slice(-maxMessages);
    
    return recentMessages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  }, [getConversation]);
  
  const getMessagesForSlide = useCallback((slideId: string): ConversationMessage[] => {
    const conversations = conversationsRef.current;
    // Don't auto-create conversation - return empty array if it doesn't exist
    if (!conversations.has(slideId)) {
      return [];
    }
    const conversation = conversations.get(slideId)!;
    return [...conversation.messages]; // Return copy to prevent mutations
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationVersion]); 
  
  const getAllConversations = useCallback((): SlideConversation[] => {
    return Array.from(conversationsRef.current.values());
  }, []); 
  
  const submitUserMessage = useCallback(
    (slideId: string, content: string): Promise<AiAction | null> => {
      if (!content.trim()) return Promise.resolve(null);

      const newPromise = submitQueueRef.current.then(async () => {
        setLocalIsLoading(true);
        setLocalError(null);
        addMessage(slideId, 'user', content);

        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: content }],
          });

          const text = completion.choices[0].message.content ?? '';
          addMessage(slideId, 'assistant', text);

          // try to parse JSON block fenced with ```json
          const match = text.match(/```json([\s\S]*?)```/);
          if (match) {
            try {
              const obj = JSON.parse(match[1]);
              const parsed = AiActionSchema.safeParse(obj);
              if (parsed.success) {
                return parsed.data;
              } else {
                logger.error('AI action validation failed', parsed.error);
                setLocalError('AI returned an invalid action.');
              }
            } catch (e) {
              logger.error('Failed to parse AI action JSON', e);
              setLocalError('Failed to parse AI action.');
            }
          }
          return null;
        } catch (error) {
          logger.error('Error fetching AI completion', error);
          setLocalError('Failed to get response from AI.');
          return null;
        } finally {
          setLocalIsLoading(false);
        }
      });
      submitQueueRef.current = newPromise;
      return newPromise;
    },
    [addMessage]
  );

  // Context value with all state and methods, memoized to prevent unnecessary re-renders
  const contextValue: ConversationContextType = useMemo(() => ({
    // UI State
    dialogInput,
    isChatExpanded,
    showSlideNavigator,
    slideNumberInput,
    
    // Loading & Error States
    localIsLoading,
    localIsTyping,
    localError,
    
    // Drag & Drop State
    draggedSlide,
    dragOverSlide,
    
    // Conversation Data
    conversations: conversationsRef.current,
    conversationVersion,
    
    // UI State Setters
    setDialogInput,
    setIsChatExpanded,
    setShowSlideNavigator,
    setSlideNumberInput,
    setLocalIsLoading,
    setLocalIsTyping,
    setLocalError,
    setDraggedSlide,
    setDragOverSlide,
    
    // Conversation Data Methods
    getConversation,
    addMessage,
    clearConversation,
    clearAllConversations,
    getConversationContext,
    getMessagesForSlide,
    getAllConversations,
    
    // UI Convenience Methods
    toggleChatExpanded,
    toggleSlideNavigator,
    clearError,
    resetDragState,
    clearInput,
    resetChatState,
    submitUserMessage
  }), [
    dialogInput,
    isChatExpanded,
    showSlideNavigator,
    slideNumberInput,
    localIsLoading,
    localIsTyping,
    localError,
    draggedSlide,
    dragOverSlide,
    conversationVersion,
    getConversation,
    addMessage,
    clearConversation,
    clearAllConversations,
    getConversationContext,
    getMessagesForSlide,
    getAllConversations,
    toggleChatExpanded,
    toggleSlideNavigator,
    clearError,
    resetDragState,
    clearInput,
    resetChatState,
    submitUserMessage,
    setDialogInput,
    setIsChatExpanded,
    setShowSlideNavigator,
    setSlideNumberInput,
    setLocalIsLoading,
    setLocalIsTyping,
    setLocalError,
    setDraggedSlide,
    setDragOverSlide
  ]);
  
  logger.debug('ConversationProvider rendered with state');
  
  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};

export default ConversationProvider;
