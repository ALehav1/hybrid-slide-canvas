import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, type Mock } from 'vitest';
import '@testing-library/jest-dom';
import { useEditor } from '@tldraw/tldraw';
import { ChatPanel } from './ChatPanel';
import { ConversationContext, type ConversationContextType, type ConversationMessage } from '../../context/ConversationContext';
import * as tldrawHelpers from '../../lib/tldrawHelpers';


import type { AiAction } from './aiActions';
import { useEnhancedSlidesStore } from '../../state/enhancedSlidesStore';

// --- Mocks ---
vi.mock('@tldraw/tldraw');
vi.mock('../../lib/tldrawHelpers');
vi.mock('../../state/enhancedSlidesStore', () => ({
  useEnhancedSlidesStore: vi.fn(),
}));

const mockUseEditor = useEditor as Mock;



// A helper to render ChatPanel with a mock context provider
const renderWithMockContext = (
  contextValue: Partial<ConversationContextType>,
  editor: any,
) => {
  const defaultValue: ConversationContextType = {
    dialogInput: contextValue.dialogInput ?? '',
    setDialogInput: contextValue.setDialogInput ?? vi.fn(),
    isChatExpanded: contextValue.isChatExpanded ?? true,
    setIsChatExpanded: contextValue.setIsChatExpanded ?? vi.fn(),
    localIsLoading: contextValue.localIsLoading ?? false,
    localError: contextValue.localError ?? null,
    isPending: contextValue.isPending ?? false,
    storageIsLoading: contextValue.storageIsLoading ?? false,
    clearError: contextValue.clearError ?? vi.fn(),
    getMessagesForSlide:
      contextValue.getMessagesForSlide ?? vi.fn().mockReturnValue([]),
    submitUserMessage: contextValue.submitUserMessage ?? vi.fn(),
    showSlideNavigator: false,
    slideNumberInput: '',
    setShowSlideNavigator: vi.fn(),
    setSlideNumberInput: vi.fn(),
    localIsTyping: false,
    draggedSlide: null,
    dragOverSlide: null,
    conversations: new Map(),
    conversationVersion: 0,
    setLocalIsLoading: vi.fn(),
    setLocalIsTyping: vi.fn(),
    setLocalError: vi.fn(),
    setDraggedSlide: vi.fn(),
    setDragOverSlide: vi.fn(),
    getConversation: vi.fn(),
    addMessage: vi.fn(),
    clearConversation: vi.fn(),
    clearAllConversations: vi.fn(),
    getConversationContext: vi.fn(),
    getAllConversations: vi.fn(),
    toggleChatExpanded: vi.fn(),
    toggleSlideNavigator: vi.fn(),
    resetDragState: vi.fn(),
    clearInput: vi.fn(),
    resetChatState: vi.fn(),
  };

  return render(
    <ConversationContext.Provider value={defaultValue}>
      <ChatPanel editor={editor} />
    </ConversationContext.Provider>,
  );
};

describe('ChatPanel', () => {
  let mockEditor: any;

  beforeAll(() => {
    // JSDOM doesn't implement scrollTo, so we need to mock it for the auto-scrolling effect.
    window.HTMLElement.prototype.scrollTo = () => {};
  });

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockEditor = {
      batch: (cb: () => void) => cb(),
      createShapes: vi.fn(),
      groupShapes: vi.fn(),
      getShape: vi.fn(),
      select: vi.fn(),
      getViewportPageBounds: vi.fn().mockReturnValue({ center: { x: 500, y: 500 } }),
    };
    mockUseEditor.mockReturnValue(mockEditor);
    // Correctly mock the return value of the useSlidesStore hook
    (useSlidesStore as unknown as Mock).mockReturnValue({ currentSlideId: 'slide-1' });
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    await vi.runAllTimersAsync();
  });

  test('renders correctly and displays placeholder', () => {
    renderWithMockContext({}, mockEditor);
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Slide-AI…')).toBeInTheDocument();
  });

  test('displays messages from the conversation context', () => {
    const messages: ConversationMessage[] = [
      { role: 'user', content: 'Hello there', timestamp: new Date() },
      { role: 'assistant', content: 'General Kenobi!', timestamp: new Date() },
    ];
    const getMessagesForSlide = vi.fn().mockReturnValue(messages);
    renderWithMockContext({ getMessagesForSlide }, mockEditor);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('General Kenobi!')).toBeInTheDocument();
  });

  test('calls submitUserMessage on send', async () => {
    const submitUserMessage = vi.fn().mockResolvedValue(null);
    const setDialogInput = vi.fn();
    renderWithMockContext(
      { submitUserMessage, setDialogInput, dialogInput: 'Create a diagram' },
      mockEditor,
    );

    const sendButton = screen.getByTestId('send-button');
    await userEvent.click(sendButton);

    // The await on userEvent.click should be sufficient for the async handler to complete.
    expect(submitUserMessage).toHaveBeenCalledWith({ currentSlideId: 'slide-1' }, 'Create a diagram');
    expect(setDialogInput).toHaveBeenCalledWith('');
  });

  test('handles AI action to add a shape', async () => {
    const sketchSpy = vi.spyOn(tldrawHelpers, 'createSketchShape');
    const action: AiAction = {
      action: 'addShape',
      shape: 'diamond',
      label: 'Decision',
    };
    const submitUserMessage = vi.fn().mockResolvedValue(action);
    renderWithMockContext(
      { submitUserMessage, dialogInput: 'add a diamond' },
      mockEditor,
    );

    await userEvent.click(screen.getByTestId('send-button'));

    // The await on userEvent.click should be sufficient for the async handler to complete.
    expect(sketchSpy).toHaveBeenCalledWith(mockEditor, 'diamond', { label: 'Decision' });
  });

  test('displays loading indicator when localIsLoading is true', () => {
    renderWithMockContext({ localIsLoading: true }, mockEditor);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  test('displays error message when localError is present', () => {
    renderWithMockContext({ localError: 'An AI error occurred' }, mockEditor);
    expect(screen.getByText('An AI error occurred')).toBeInTheDocument();
  });
});
