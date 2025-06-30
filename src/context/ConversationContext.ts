import { createContext } from 'react';
import type { AiAction } from '../components/Chat/aiActions';

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
export interface ConversationContextType {
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
  getConversationContext: (slideId:string, maxMessages?: number) => string;
  getMessagesForSlide: (slideId: string) => ConversationMessage[];
  getAllConversations: () => SlideConversation[];

  // UI Convenience Methods
  toggleChatExpanded: () => void;
  toggleSlideNavigator: () => void;
  clearError: () => void;
  resetDragState: () => void;
  clearInput: () => void;
  resetChatState: () => void;
  submitUserMessage: (slideId: string, content: string) => Promise<AiAction | null>;
}

// Create and export Context
export const ConversationContext = createContext<ConversationContextType | undefined>(undefined);
