import React, { useState, useCallback, useRef, useMemo, useTransition, type ReactNode, useEffect } from 'react';
import {
  ConversationContext,
  type ConversationContextType,
  type ConversationMessage,
  type SlideConversation,
} from '../context/ConversationContext';
import { logger } from '../lib/utils/logging';
import { openai } from '../lib/openaiClient';
import { type AiAction, AiActionSchema } from './Chat/aiActions';
import { ErrorBoundary } from './ErrorBoundary';
import conversationStore, { CONVERSATION_STORE_KEY } from '../lib/storage/conversationStorage';
import { useConversationAutosave } from '../hooks/useConversationAutosave';

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
 */
export const ConversationProvider: React.FC<ConversationProviderProps> = ({
  children,
  initialExpanded = true,
}) => {
  // UI State
  const [dialogInput, setDialogInput] = useState('');
  const [isChatExpanded, setIsChatExpanded] = useState(initialExpanded);
  const [showSlideNavigator, setShowSlideNavigator] = useState(false);
  const [slideNumberInput, setSlideNumberInput] = useState('');

  // Loading & Error States
  const [localIsLoading, setLocalIsLoading] = useState(false);
  const [storageIsLoading, setStorageIsLoading] = useState(true);
  const [localIsTyping, setLocalIsTyping] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // React 19 useTransition for smoother UI during state updates
  const [isPending, startTransition] = useTransition();

  // Version counter to trigger re-renders when the conversation map changes
  const [conversationVersion, setConversationVersion] = useState(0);

  // Drag & Drop State
  const [draggedSlide, setDraggedSlide] = useState<number | null>(null);
  const [dragOverSlide, setDragOverSlide] = useState<number | null>(null);

  // Conversation Data State
  const conversationsRef = useRef<Map<string, SlideConversation>>(new Map());
  const submitQueueRef = useRef<Promise<AiAction | null>>(Promise.resolve(null));
  const MAX_CONVERSATIONS = 100;

  // --- State Persistence ---
  const { scheduleSave } = useConversationAutosave(
    storageIsLoading,
    conversationsRef,
    isChatExpanded
  );

  // Effect to trigger autosave when conversation data or expanded state changes
  useEffect(() => {
    if (!storageIsLoading) {
      scheduleSave();
    }
  }, [conversationVersion, isChatExpanded, scheduleSave, storageIsLoading]);

  // Load state from Dexie on initial render
  useEffect(() => {
    let isMounted = true;
    const loadState = async () => {
      try {
        setStorageIsLoading(true);
        const savedData = await conversationStore?.getItem(CONVERSATION_STORE_KEY);
        if (savedData && isMounted) {
          const { conversations, isChatExpanded: savedIsExpanded } = savedData.state;
          if (conversations) {
            conversationsRef.current = new Map(conversations);
            setConversationVersion((v) => v + 1);
          }
          if (typeof savedIsExpanded === 'boolean') {
            setIsChatExpanded(savedIsExpanded);
          }
        }
      } catch (error) {
        logger.error('Failed to load conversation state from Dexie', error);
      } finally {
        if (isMounted) {
          setStorageIsLoading(false);
        }
      }
    };
    loadState();
    return () => { isMounted = false; };
  }, []);

  // --- UI Convenience Methods ---
  const toggleChatExpanded = useCallback(() => { setIsChatExpanded((prev) => !prev); }, []);
  const toggleSlideNavigator = useCallback(() => { setShowSlideNavigator((prev) => !prev); }, []);
  const clearError = useCallback(() => { setLocalError(null); }, []);
  const resetDragState = useCallback(() => {
    setDraggedSlide(null);
    setDragOverSlide(null);
  }, []);
  const clearInput = useCallback(() => { setDialogInput(''); }, []);
  const resetChatState = useCallback(() => {
    setDialogInput('');
    setLocalIsLoading(false);
    setLocalIsTyping(false);
    setLocalError(null);
  }, []);

  // --- Conversation Data Methods ---
  const getConversation = useCallback((slideId: string): SlideConversation => {
    const conversations = conversationsRef.current;
    if (!conversations.has(slideId)) {
      const newConversation: SlideConversation = {
        slideId,
        messages: [],
        lastModified: new Date(),
      };
      conversations.set(slideId, newConversation);
    }
    return conversations.get(slideId)!;
  }, []);

  const addMessage = useCallback(
    (slideId: string, role: 'user' | 'assistant', content: string): SlideConversation => {
      if (!SLIDE_ID_REGEX.test(slideId)) {
        const errorMsg = `Invalid slideId format: ${slideId}`;
        logger.error(errorMsg);
        setLocalError(errorMsg);
        return { slideId, messages: [], lastModified: new Date() };
      }

      const conversation = getConversation(slideId);
      const newMessage: ConversationMessage = { role, content, timestamp: new Date() };
      conversation.messages.push(newMessage);
      conversation.lastModified = new Date();

      if (conversationsRef.current.size > MAX_CONVERSATIONS) {
        const sortedConversations = Array.from(conversationsRef.current.entries()).sort(
          (a, b) => a[1].lastModified.getTime() - b[1].lastModified.getTime()
        );
        const toRemove = conversationsRef.current.size - MAX_CONVERSATIONS;
        for (let i = 0; i < toRemove; i++) {
          conversationsRef.current.delete(sortedConversations[i][0]);
        }
      }

      setConversationVersion((v) => v + 1);
      return conversation;
    },
    [getConversation]
  );

  const clearConversation = useCallback((slideId: string) => {
    conversationsRef.current.delete(slideId);
    setConversationVersion((prev) => prev + 1);
  }, []);

  const clearAllConversations = useCallback(() => {
    conversationsRef.current.clear();
    setConversationVersion(0);
  }, []);

  const getConversationContext = useCallback(
    (slideId: string, charLimit = MAX_MESSAGE_LENGTH): string => {
      const conversation = getConversation(slideId);
      let context = '';
      for (let i = conversation.messages.length - 1; i >= 0; i--) {
        const message = conversation.messages[i];
        const formattedMessage = `${message.role}: ${message.content}\n`;
        if (context.length + formattedMessage.length > charLimit) break;
        context = formattedMessage + context;
      }
      return context;
    },
    [getConversation]
  );

  const getMessagesForSlide = useCallback(
    (slideId: string): ConversationMessage[] => {
      const conversation = conversationsRef.current.get(slideId);
      return conversation ? [...conversation.messages] : [];
    },
    [conversationVersion]
  );

  const getAllConversations = useCallback((): SlideConversation[] => {
    return Array.from(conversationsRef.current.values());
  }, []);

  const responseCache = useRef(new Map<string, Promise<AiAction | null>>());

  const submitUserMessage = useCallback(
    async (slideId: string, content: string): Promise<AiAction | null> => {
      // DEBUG ────────────────────────────────────────────────────────────
      // Confirm that submitUserMessage is invoked with expected params.
      // eslint-disable-next-line no-console
      console.log('[ConversationProvider] submitUserMessage called', { slideId, content });
      // ──────────────────────────────────────────────────────────────────

      const cacheKey = `${slideId}:${content}`;
      if (responseCache.current.has(cacheKey)) {
        return responseCache.current.get(cacheKey)!;
      }

      const newPromise = submitQueueRef.current.then(async () => {
        startTransition(() => {
          setLocalIsLoading(true);
          addMessage(slideId, 'user', content);
        });

        try {
          const systemPrompt = `
You are a specialized AI assistant for a slide presentation application. Your SOLE function is to translate a user's natural language request into a single, valid JSON object. This JSON object MUST conform to one of the action schemas described below. Do NOT provide any commentary, explanations, or markdown formatting. Your entire response must be ONLY the JSON object.

--- SCHEMA DEFINITION ---

The JSON object must be a discriminated union based on the "action" property.

1. To add a new shape: { "action": "addShape", "shape": "rectangle|ellipse|diamond|star", "label": "string (optional)", "color": "blue|red|green|purple|orange|black|gray|none (optional)", "fill": "blue|red|green|purple|orange|black|gray|none (optional)", "w": "number (optional)", "h": "number (optional)", "x": "number (optional)", "y": "number (optional)", "position": "center|topLeft|topRight|bottomLeft|bottomRight (optional)" }
2. To add text or title: { "action": "addText", "text": "string (required - the text content)", "color": "blue|red|green|purple|orange|black|gray|none (optional)", "size": "s|m|l|xl (optional)", "align": "start|middle|end (optional)", "x": "number (optional)", "y": "number (optional)", "position": "center|topLeft|topRight|bottomLeft|bottomRight (optional)" }
3. To create a complex diagram: { "action": "createDiagram", "prompt": "string (minimum 5 characters describing the diagram)" }
4. To apply layout to shapes: { "action": "layout", "kind": "flow|grid|timeline" }
5. To group existing shapes: { "action": "group", "selector": "string (optional)" }

--- END SCHEMA ---

User Request: "${content}"

Based on the user request above, generate the corresponding JSON object.`;

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Here is the user's request: "${content}"` },
            ],
            temperature: 0.2,
          });

          const responseContent = completion.choices[0]?.message?.content;
          if (!responseContent) throw new Error('Empty response from AI');

          // ────────────────────────────────────────────────────────────
          // DEBUG: Inspect the raw AI response BEFORE JSON.parse().
          // This will appear in the browser console and helps identify
          // whether the AI is returning plain text or a valid JSON object.
          // Remove or replace with a proper logger when behaviour is verified.
          // eslint-disable-next-line no-console
          console.log('[ConversationProvider] raw AI response:', responseContent);
          // ────────────────────────────────────────────────────────────

          const actionJson = JSON.parse(responseContent);
          const parsedAction = AiActionSchema.safeParse(actionJson);

          if (parsedAction.success) {
            const assistantResponse = `Action: \`\`\`json\n${JSON.stringify(parsedAction.data, null, 2)}\n\`\`\``;
            startTransition(() => { addMessage(slideId, 'assistant', assistantResponse); });
            return parsedAction.data;
          } else {
            logger.error('AI action validation failed', parsedAction.error.flatten());
            const errorMessage = 'The AI returned an invalid action. Please try rephrasing your request.';
            setLocalError(errorMessage);
            addMessage(slideId, 'assistant', errorMessage);
            return null;
          }
        } catch (error) {
          logger.error('Error fetching or parsing AI completion', error);
          const errorMessage = 'Failed to get a valid response from the AI. Please try again.';
          startTransition(() => {
            setLocalError(errorMessage);
            addMessage(slideId, 'assistant', errorMessage);
          });
          return null;
        } finally {
          startTransition(() => { setLocalIsLoading(false); });
        }
      });

      responseCache.current.set(cacheKey, newPromise);
      if (responseCache.current.size > 50) {
        const oldestKey = responseCache.current.keys().next().value;
        if (oldestKey) responseCache.current.delete(oldestKey);
      }

      submitQueueRef.current = newPromise;
      return newPromise;
    },
    [addMessage]
  );

  const contextValue: ConversationContextType = useMemo(() => ({
    dialogInput, isChatExpanded, showSlideNavigator, slideNumberInput,
    localIsLoading, storageIsLoading, localIsTyping, localError, isPending,
    draggedSlide, dragOverSlide,
    conversations: conversationsRef.current, conversationVersion,
    setDialogInput, setIsChatExpanded, setShowSlideNavigator, setSlideNumberInput,
    setLocalIsLoading, setStorageIsLoading, setLocalIsTyping, setLocalError,
    setDraggedSlide, setDragOverSlide,
    getConversation, addMessage, clearConversation, clearAllConversations,
    getConversationContext, getMessagesForSlide, getAllConversations,
    toggleChatExpanded, toggleSlideNavigator, clearError, resetDragState,
    clearInput, resetChatState, submitUserMessage,
  }), [
    dialogInput, isChatExpanded, showSlideNavigator, slideNumberInput,
    localIsLoading, storageIsLoading, localIsTyping, localError, isPending,
    draggedSlide, dragOverSlide, conversationVersion,
    getConversation, addMessage, clearConversation, clearAllConversations,
    getConversationContext, getMessagesForSlide, getAllConversations,
    toggleChatExpanded, toggleSlideNavigator, clearError, resetDragState,
    clearInput, resetChatState, submitUserMessage,
    setDialogInput, setIsChatExpanded, setShowSlideNavigator, setSlideNumberInput,
    setLocalIsLoading, setStorageIsLoading, setLocalIsTyping, setLocalError,
    setDraggedSlide, setDragOverSlide,
  ]);

  return (
    <ConversationContext.Provider value={contextValue}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </ConversationContext.Provider>
  );
};

export default ConversationProvider;
