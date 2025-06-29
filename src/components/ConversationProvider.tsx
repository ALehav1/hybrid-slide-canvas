import React, { createContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { logger } from '../lib/utils/logging';

/**
 * Conversation Message Types
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface SlideConversation {
  slideId: string;
  messages: ConversationMessage[];
  lastModified: number;
}

/**
 * Enhanced Conversation Context Types
 * Provides centralized conversation state management across the app
 * Combines UI state, conversation data, and business logic
 */
interface ConversationContextType {
  // UI State
  dialogInput: string;
  isChatExpanded: boolean;
  showSlideNavigator: boolean;
  slideNumberInput: string;
  
  // Loading & Error States
  localIsLoading: boolean;
  localIsTyping: boolean;
  localError: string | null;
  
  // Drag & Drop State
  draggedSlide: number | null;
  dragOverSlide: number | null;
  
  // Conversation Data
  conversations: Map<string, SlideConversation>;
  conversationVersion: number; // Incremented when conversations change to force re-renders
  
  // UI State Setters
  setDialogInput: (input: string) => void;
  setIsChatExpanded: (expanded: boolean) => void;
  setShowSlideNavigator: (show: boolean) => void;
  setSlideNumberInput: (input: string) => void;
  setLocalIsLoading: (loading: boolean) => void;
  setLocalIsTyping: (typing: boolean) => void;
  setLocalError: (error: string | null) => void;
  setDraggedSlide: (slide: number | null) => void;
  setDragOverSlide: (slide: number | null) => void;
  
  // Conversation Data Methods
  getConversation: (slideId: string) => SlideConversation;
  addMessage: (slideId: string, role: 'user' | 'assistant', content: string) => SlideConversation;
  clearConversation: (slideId: string) => void;
  clearAllConversations: () => void;
  getConversationContext: (slideId: string, maxMessages?: number) => string;
  getMessagesForSlide: (slideId: string) => ConversationMessage[];
  getAllConversations: () => SlideConversation[];
  
  // UI Convenience Methods
  toggleChatExpanded: () => void;
  toggleSlideNavigator: () => void;
  clearError: () => void;
  resetDragState: () => void;
  clearInput: () => void;
  resetChatState: () => void;
}

// Export types for the hook
export type { ConversationContextType };

// Create and export Context
export const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

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
    const conversation = getConversation(slideId);
    const newMessage: ConversationMessage = {
      role,
      content,
      timestamp: new Date()
    };
    
    conversation.messages.push(newMessage);
    conversation.lastModified = Date.now();
    
    // Increment version to trigger re-render
    setConversationVersion(prev => prev + 1);
    
    logger.debug(`Added message to conversation for slideId: ${slideId}`);
    
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
  }, [conversationVersion]); 
  
  const getAllConversations = useCallback((): SlideConversation[] => {
    return Array.from(conversationsRef.current.values());
  }, []); 
  
  // Context value with all state and methods
  const contextValue: ConversationContextType = {
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
    resetChatState
  };
  
  logger.debug('ConversationProvider rendered with state');
  
  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};

export default ConversationProvider;
