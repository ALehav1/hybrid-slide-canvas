import React, { useEffect, useRef } from 'react';
import { useEditor } from '@tldraw/tldraw';
import { useConversationContext } from '../../hooks/useConversationContext';
import { useSlidesStore } from '../../state/slidesStore';
import { createSketchShape } from '../../lib/tldrawHelpers';
import { type AiAction } from './aiActions';

export const ChatPanel: React.FC = () => {
  const editor = useEditor();
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

    const action = await submitUserMessage(currentSlideId, text);

    if (action && action.action in actionHandlers) {
      const handler = actionHandlers[action.action];
      if (handler) {
        handler(action);
      }
    }

    setDialogInput('');
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, localIsLoading]);

  return (
    <section
      data-testid="chat-panel"
      className="
    absolute right-5 top-5
    w-[350px] max-h-[600px]
    bg-white/95 shadow-lg rounded-lg
    flex flex-col
    z-[1000]
    lg:right-5 lg:top-5
    sm:right-3 sm:top-3 sm:w-[90vw] sm:max-h-[80vh]
  "
    >
      <div ref={listRef} data-testid="message-list" className="flex-1 overflow-y-auto p-2 text-sm">
        {messages.map((m, i) => (
          <p key={i} data-testid="chat-message" className={m.role === 'user' ? 'text-right' : ''}>
            <span className={m.role === 'user' ? 'bg-blue-100 px-2 py-1 rounded' : ''}>
              {m.content}
            </span>
          </p>
        ))}
        {localIsLoading && <p className="text-center text-gray-500" data-testid="loading-indicator">Thinking...</p>}
        {localError && <p className="text-center text-red-500">{localError}</p>}
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
            disabled={localIsLoading}
          />
          <button
            onClick={handleSend}
            disabled={localIsLoading || !dialogInput.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-200 disabled:opacity-50"
            data-testid="send-button"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
};
