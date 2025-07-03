import React, { useEffect, useRef, useTransition, Suspense, useState } from 'react';
import type { Editor } from '@tldraw/tldraw';
import { useConversationContext } from '../../hooks/useConversationContext';
import { useSlidesStore } from '../../state/slidesStore';
import { createSketchShape } from '../../lib/tldrawHelpers';
import { type AiAction } from './aiActions';

// Simple loading fallback component 
const LoadingFallback: React.FC = () => (
  <div className="p-2 text-center text-gray-500" data-testid="suspense-loading">
    <span className="inline-block animate-pulse">Loading messages...</span>
  </div>
);

// Error message component with retry capability
interface ErrorMessageProps {
  error: string;
  onRetry: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry }) => (
  <div className="p-2 text-center" data-testid="error-message">
    <p className="text-red-500 mb-2">{error}</p>
    <button 
      onClick={onRetry}
      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
    >
      Retry
    </button>
  </div>
);

type ChatPanelProps = {
  editor: Editor | null;
};

export const ChatPanel: React.FC<ChatPanelProps> = ({ editor }) => {
  const currentSlideId = useSlidesStore(s => s.currentSlideId);
  const {
    dialogInput,
    setDialogInput,
    getMessagesForSlide,
    submitUserMessage,
    localIsLoading,
    localError,
    clearError,
  } = useConversationContext();
  
  // Use React 19's useTransition with automatic batching for smoother UI during state updates
  const [isPending, startTransition] = useTransition();
  
  // Local state for optimistic UI updates
  const [optimisticMessages, setOptimisticMessages] = useState<{ role: string; content: string }[]>([]);

  const messages = getMessagesForSlide(currentSlideId);
  const listRef = useRef<HTMLDivElement>(null);

  const actionHandlers: Partial<Record<AiAction['action'], (action: AiAction) => void>> = {
    addShape: (action) => {
      // The type guard is essential here to narrow `action` to the correct variant
      if (editor && action.action === 'addShape') {
        createSketchShape(editor, action.shape, {
          label: action.label,
          color: action.color,
          fill: action.fill,
          w: action.w,
          h: action.h,
          x: action.x,
          y: action.y,
          position: action.position,
        });
      }
    },
  };

  const handleSend = async () => {
    if (localError) clearError();

    const text = dialogInput.trim();
    if (!text) return;
    
    // Clear input immediately for better UX
    setDialogInput('');
    
    // Add optimistic user message for immediate feedback
    setOptimisticMessages([...optimisticMessages, { role: 'user', content: text }]);
    
    // Use transition for the heavy processing to avoid blocking the UI
    startTransition(async () => {
      try {
        // Process the user message and get any resulting action
        const action = await submitUserMessage(currentSlideId, text);
        
        // If there's an action to perform, handle it after the message is processed
        if (action && action.action in actionHandlers) {
          const handler = actionHandlers[action.action];
          if (handler) {
            // Handle the action (e.g., add shapes to the canvas)
            handler(action);
          }
        }
        
        // Clear optimistic messages after real update is complete
        setOptimisticMessages([]);
      } catch (error) {
        console.error('Failed to process message:', error);
        // Error handling is delegated to the conversation context
      }
    });
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, optimisticMessages, localIsLoading]);

  // Combine real messages with optimistic ones for display
  const displayMessages = [...messages, ...optimisticMessages.filter(om => 
    !messages.some(m => m.content === om.content && m.role === om.role)
  )];
  
  return (
    <section
      data-testid="chat-panel"
      className="
    w-full h-full bg-white
    flex flex-col
  "
    >
      {/* Message list with Suspense boundary */}
      <div ref={listRef} data-testid="message-list" className="flex-1 overflow-y-auto p-2 text-sm">
        <Suspense fallback={<LoadingFallback />}>
          {/* Message rendering with optimistic UI */}
          {displayMessages.map((m, i) => (
            <p 
              key={i} 
              data-testid="chat-message" 
              className={`${m.role === 'user' ? 'text-right' : ''} ${optimisticMessages.includes(m) ? 'opacity-70' : ''}`}
            >
              <span className={m.role === 'user' ? 'bg-blue-100 px-2 py-1 rounded' : ''}>
                {m.content}
              </span>
            </p>
          ))}
          {(localIsLoading || isPending) && 
            <p className="text-center text-gray-500 animate-pulse" data-testid="loading-indicator">
              Thinking<span className="dot-animation">...</span>
            </p>
          }
          {localError && <ErrorMessage error={localError} onRetry={() => clearError()} />}
        </Suspense>
      </div>
      <div className="p-2 border-t">
        <div className="relative">
          <label htmlFor="chat-input" className="sr-only">
            Ask Slide-AI
          </label>
          <input
            id="chat-input"
            type="text"
            className="w-full p-2 pr-10 border rounded-md"
            placeholder="Ask Slide-AI…"
            value={dialogInput}
            onChange={(e) => setDialogInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !localIsLoading && !isPending) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={localIsLoading || isPending}
          />
          <button
            onClick={handleSend}
            disabled={localIsLoading || isPending || !dialogInput.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-opacity"
            data-testid="send-button"
          >
            {isPending ? (
              <span className="inline-block animate-pulse">•</span>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
