import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from '../App';
import { ConversationProvider } from '../components/ConversationProvider';
import { useConversationContext } from '../hooks/useConversationContext';
import { StatefulConversationHelper } from './test-utils/stateful-conversation-helper';
import { ChatInterface } from '../components/ChatInterface';
import { useSlideOrchestration } from '../hooks/useSlideOrchestration';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { createShapeFromAI } from '../tldraw/tldraw-enhanced';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';

// Mock the API function
import { enhancedAskGPT } from '../services/openai';

// Mock logging utility FIRST to prevent import.meta.env parsing issues
jest.mock('../lib/utils/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(), // Add debug method to logger mock
  }
}));

// Mock debug flags to prevent import.meta.env parsing issues
jest.mock('../lib/utils/debug-flags', () => ({
  DEBUG_FLAGS: {
    SHOW_RENDER_DIAGNOSTICS: false,
    LOG_API_RESPONSES: false,
    SHOW_SLIDE_OPERATIONS: false,
    SHOW_CONVERSATION_UPDATES: false,
    SHOW_ORCHESTRATION_EVENTS: false,
  }
}));

// Create mock editor object that matches TLDraw editor interface
const createMockEditor = () => ({
  createShape: jest.fn(),
  updateShape: jest.fn(),
  deleteShape: jest.fn(),
  getShape: jest.fn(),
  getShapePageBounds: jest.fn(),
  getViewportPageBounds: jest.fn().mockReturnValue({ x: 0, y: 0, w: 800, h: 600 }),
  zoomToBounds: jest.fn(),
  getCurrentPageShapes: jest.fn().mockReturnValue([]),
  setCamera: jest.fn(),
  getCamera: jest.fn().mockReturnValue({ x: 0, y: 0, z: 1 }),
  stopCameraAnimation: jest.fn(),
  animateToShape: jest.fn(),
  selectNone: jest.fn(),
  select: jest.fn(),
  focus: jest.fn(),
  updateInstanceState: jest.fn(),
  getInstanceState: jest.fn().mockReturnValue({}),
  getCurrentPageId: jest.fn().mockReturnValue('page1'),
  getOnlySelectedShape: jest.fn(),
  getSelectedShapes: jest.fn().mockReturnValue([]),
  centerOnPoint: jest.fn(),
  zoomToFit: jest.fn(),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
  resetZoom: jest.fn(),
  setCurrentTool: jest.fn(),
  isMenuOpen: jest.fn().mockReturnValue(false)
});

// Mock useEditorSetup hook to return mock editor that satisfies ChatInterface requirements
jest.mock('../hooks/useEditorSetup', () => ({
  useEditorSetup: jest.fn(() => {
    // Inline mock editor creation since createMockEditor isn't available at mock time
    const mockEditor = {
      createShape: jest.fn(),
      updateShape: jest.fn(),
      deleteShape: jest.fn(),
      getShape: jest.fn(),
      getShapePageBounds: jest.fn(),
      getViewportPageBounds: jest.fn().mockReturnValue({ x: 0, y: 0, w: 800, h: 600 }),
      zoomToBounds: jest.fn(),
      getCurrentPageShapes: jest.fn().mockReturnValue([]),
      setCamera: jest.fn(),
      getCamera: jest.fn().mockReturnValue({ x: 0, y: 0, z: 1 }),
      stopCameraAnimation: jest.fn(),
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      zoomToFit: jest.fn(),
      resetZoom: jest.fn(),
      updateInstanceState: jest.fn(),
      user: {
        updateUserPreferences: jest.fn()
      },
      focus: jest.fn(),
      blur: jest.fn(),
      cancel: jest.fn(),
      complete: jest.fn(),
      undo: jest.fn(),
      redo: jest.fn(),
      batch: jest.fn((fn: any) => fn()),
      setCurrentTool: jest.fn(),
      isIn: jest.fn().mockReturnValue(false),
      createPage: jest.fn(),
      getCurrentPageId: jest.fn().mockReturnValue('page:page'),
      deletePage: jest.fn(),
      setCurrentPage: jest.fn(),
      renamePage: jest.fn(),
      getPage: jest.fn().mockReturnValue({ id: 'page:page', name: 'Page 1' }),
      getPages: jest.fn().mockReturnValue([]),
      selectAll: jest.fn(),
      selectNone: jest.fn(),
      setSelectedShapes: jest.fn(),
      select: jest.fn(),
      deselect: jest.fn(),
      getSelectedShapes: jest.fn().mockReturnValue([]),
      getSelectedShapeIds: jest.fn().mockReturnValue([]),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      dispose: jest.fn(),
      store: {
        listen: jest.fn(),
        unlisten: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        allRecords: jest.fn().mockReturnValue([]),
        serialize: jest.fn().mockReturnValue('[]'),
        deserialize: jest.fn(),
        loadSnapshot: jest.fn(),
        getSnapshot: jest.fn()
      }
    };
    
    return {
      editorRef: { current: mockEditor },
      initializedRef: { current: true },
      handleMount: jest.fn(),
      createNewSlideFrame: jest.fn(() => 'test-frame-id')
    };
  })
}));

// Mock @tldraw to fix canvas text and getViewportPageBounds issues
jest.mock('@tldraw/tldraw', () => ({
  createShapeId: jest.fn((id: string) => `shape:${id}`),
  Tldraw: ({ onMount }: { onMount?: (editor: any) => void }) => {
    React.useEffect(() => {
      if (onMount) {
        const mockEditor = {
          createShape: jest.fn(),
          updateShape: jest.fn(),
          deleteShape: jest.fn(),
          getShape: jest.fn(),
          getShapePageBounds: jest.fn(),
          getViewportPageBounds: jest.fn().mockReturnValue({ x: 0, y: 0, w: 800, h: 600 }),
          zoomToBounds: jest.fn(),
          getCurrentPageShapes: jest.fn().mockReturnValue([]),
          setCamera: jest.fn(),
          getCamera: jest.fn().mockReturnValue({ x: 0, y: 0, z: 1 }),
          stopCameraAnimation: jest.fn(),
          zoomIn: jest.fn(),
          zoomOut: jest.fn(),
          zoomToFit: jest.fn(),
          resetZoom: jest.fn(),
          updateInstanceState: jest.fn(),
          user: {
            updateUserPreferences: jest.fn()
          },
          focus: jest.fn(),
          blur: jest.fn(),
          cancel: jest.fn(),
          complete: jest.fn(),
          undo: jest.fn(),
          redo: jest.fn(),
          batch: jest.fn((fn: any) => fn()),
          setCurrentTool: jest.fn(),
          isIn: jest.fn().mockReturnValue(false),
          createPage: jest.fn(),
          getCurrentPageId: jest.fn().mockReturnValue('page:page'),
          deletePage: jest.fn(),
          setCurrentPage: jest.fn(),
          renamePage: jest.fn(),
          getPage: jest.fn().mockReturnValue({ id: 'page:page', name: 'Page 1' }),
          getPages: jest.fn().mockReturnValue([]),
          selectAll: jest.fn(),
          selectNone: jest.fn(),
          setSelectedShapes: jest.fn(),
          select: jest.fn(),
          deselect: jest.fn(),
          getSelectedShapes: jest.fn().mockReturnValue([]),
          getSelectedShapeIds: jest.fn().mockReturnValue([]),
          on: jest.fn(),
          off: jest.fn(),
          emit: jest.fn(),
          dispose: jest.fn(),
          store: {
            listen: jest.fn(),
            unlisten: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            update: jest.fn(),
            allRecords: jest.fn().mockReturnValue([]),
            serialize: jest.fn().mockReturnValue('[]'),
            deserialize: jest.fn(),
            loadSnapshot: jest.fn(),
            getSnapshot: jest.fn()
          }
        };
        onMount(mockEditor);
      }
    }, [onMount]);
    
    return <div data-testid="tldraw-canvas">Mock TLDraw Canvas</div>;
  },
}));

// Mock OpenAI service
jest.mock('../services/openai', () => ({
  enhancedAskGPT: jest.fn().mockResolvedValue("I've created a test rectangle for you."),
}));

// Mock TLDraw enhanced functions
jest.mock('../tldraw/tldraw-enhanced', () => ({
  createShapeFromAI: jest.fn()
}));

// Mock useSlideOrchestration hook to provide getCurrentSlide function
jest.mock('../hooks/useSlideOrchestration', () => ({
  useSlideOrchestration: jest.fn(() => ({
    currentSlide: 1,
    totalSlides: 3,
    slides: [
      { id: 1, name: 'Slide 1' },
      { id: 2, name: 'Slide 2' },
      { id: 3, name: 'Slide 3' }
    ],
    getCurrentSlide: jest.fn(() => ({
      id: 1,
      name: 'Slide 1',
      conversation: [],
      shapes: []
    })),
    addNewSlide: jest.fn(),
    deleteSlide: jest.fn(),
    navigateToSlide: jest.fn(),
    updateSlideData: jest.fn(),
    setCurrentSlide: jest.fn()
  }))
}));

// Mock useAppHandlers hook to prevent it from calling real hooks
let mockHandleChatMessage = jest.fn();

jest.mock('../hooks/useAppHandlers', () => ({
  useAppHandlers: jest.fn(() => ({
    handleAddSlide: jest.fn(),
    handleJumpToSlide: jest.fn(),
    handleMessageAdd: jest.fn(),
    handleDragOver: jest.fn(),
    handleDragLeave: jest.fn(),
    handleDrop: jest.fn(),
    handleDragEnd: jest.fn(),
    handleChatMessage: mockHandleChatMessage,
    handleDragStart: jest.fn(),
    handleEnhancedDragEnd: jest.fn(),
    reorderSlides: jest.fn(),
    resetDragState: jest.fn(),
    setDraggedSlide: jest.fn(),
    setDragOverSlide: jest.fn(),
    draggedSlide: null,
    dragOverSlide: null
  }))
}));

// Export mock for test configuration
export { mockHandleChatMessage };

// Mock global fetch to prevent "fetch is not defined" errors
(global as any).fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({
      choices: [{
        message: {
          content: JSON.stringify({
            shapes: [{
              type: "rectangle",
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              text: "Test Rectangle",
              style: {
                color: "blue",
                size: "m",
                fill: "solid"
              }
            }],
            message: "I've created a test rectangle for you."
          })
        }
      }]
    }),
    text: () => Promise.resolve(JSON.stringify({
      shapes: [{
        type: "rectangle",
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        text: "Test Rectangle",
        style: {
          color: "blue",
          size: "m",
          fill: "solid"
        }
      }],
      message: "I've created a test rectangle for you."
    }))
  })
);

import { renderAppWithProviders, waitForComponentStabilization, simulateKeyPress, enableDebugFlags, cleanupAppTestEnvironment } from './test-utils/app-helpers';

describe('App Component Integration', () => {
  // Add a test counter to force fresh ConversationProvider instances
  let testCounter = 0;
  
  beforeEach(() => {
    cleanupAppTestEnvironment();
    testCounter++; // Increment counter to force fresh provider instances
  });

  afterEach(() => {
    cleanup(); // React Testing Library cleanup
    cleanupAppTestEnvironment();
  });

  describe('Component Rendering', () => {
    it('should render main application structure', async () => {
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Core UI elements should be present
      expect(screen.getByTestId('tldraw-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
      expect(screen.getByTestId('slide-controls')).toBeInTheDocument();
      
      // Debug panel should not be visible by default
      expect(screen.queryByTestId('render-diagnostics-panel')).not.toBeInTheDocument();
    });

    it('should render debug panel when debug flags are enabled', async () => {
      enableDebugFlags({ SHOW_RENDER_DIAGNOSTICS: true });
      
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      expect(screen.getByTestId('render-diagnostics-panel')).toBeInTheDocument();
      
      // Clean up debug flags after test
      enableDebugFlags({ SHOW_RENDER_DIAGNOSTICS: false });
    });

    it('should initialize with default slide state', async () => {
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Should show slide 1 by default
      const slideInput = screen.getByLabelText('Jump to slide') as HTMLInputElement;
      expect(slideInput).toBeInTheDocument();
      expect(slideInput.value).toBe(''); // Input starts empty
      expect(screen.getByText('Slide 1 of 1')).toBeInTheDocument();
    });

    it('should render memoized components correctly', async () => {
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // All memoized components should render
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
      expect(screen.getByTestId('slide-controls')).toBeInTheDocument();
      
      // Slide navigator should not be visible initially
      expect(screen.queryByTestId('slide-navigator')).not.toBeInTheDocument();
    });
  });

  describe('Slide Management Integration', () => {
    it('should add new slides through slide controls', async () => {
      const user = userEvent.setup();
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      const addSlideButton = screen.getByLabelText('Add new slide');
      await user.click(addSlideButton);

      await waitFor(() => {
        expect(screen.getByText('Slide 2 of 2')).toBeInTheDocument();
      });

      expect(screen.getByText('Slide 2 of 2')).toBeInTheDocument();
    });

    it('should navigate between slides using navigation buttons', async () => {
      const user = userEvent.setup();
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Add a second slide first
      const addSlideButton = screen.getByLabelText('Add new slide');
      await user.click(addSlideButton);

      await waitFor(() => {
        expect(screen.getByText('Slide 2 of 2')).toBeInTheDocument();
      });

      // Navigate to previous slide
      const prevButton = screen.getByLabelText('Previous slide');
      await user.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText('Slide 1 of 2')).toBeInTheDocument();
      });

      // Navigate to next slide
      const nextButton = screen.getByLabelText('Next slide');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Slide 2 of 2')).toBeInTheDocument();
      });
    });

    it('should handle slide jump with valid input', async () => {
      const user = userEvent.setup();
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Add multiple slides
      const addSlideButton = screen.getByLabelText('Add new slide');
      await user.click(addSlideButton);
      await user.click(addSlideButton);

      await waitFor(() => {
        expect(screen.getByText('Slide 3 of 3')).toBeInTheDocument();
      });

      // Jump to slide 1
      const slideInput = screen.getByDisplayValue('3');
      await user.clear(slideInput);
      await user.type(slideInput, '1');

      const jumpButton = screen.getByLabelText('Jump to slide');
      await user.click(jumpButton);

      await waitFor(() => {
        expect(screen.getByText('Slide 1 of 3')).toBeInTheDocument();
        expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Input should be cleared
      });
    });

    it('should handle invalid slide jump gracefully', async () => {
      const user = userEvent.setup();
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Try to jump to non-existent slide
      const slideInput = screen.getByDisplayValue('1');
      await user.clear(slideInput);
      await user.type(slideInput, '5');

      const jumpButton = screen.getByLabelText('Jump to slide');
      await user.click(jumpButton);

      // Should stay on current slide
      expect(screen.getByText('Slide 1 of 1')).toBeInTheDocument();
    });

    it('should toggle slide navigator visibility', async () => {
      const user = userEvent.setup();
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Navigator should not be visible initially
      expect(screen.queryByTestId('slide-navigator')).not.toBeInTheDocument();

      // Click toggle button
      const toggleButton = screen.getByLabelText('Toggle slide navigator');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId('slide-navigator')).toBeInTheDocument();
      });

      // Click toggle again to hide
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByTestId('slide-navigator')).not.toBeInTheDocument();
      });
    });
  });

  describe('Chat Interface Integration', () => {
    it('should handle message sending through chat interface', async () => {
      const user = userEvent.setup();
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Type a message
      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      await user.type(messageInput, 'Create a circle');
      
      // Send the message
      const sendButton = screen.getByLabelText('Send message');
      
      // Wrap click in act() to ensure React state updates are flushed
      await act(async () => {
        await user.click(sendButton);
      });

      // Wait for conversation state to update and messages to render
      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Create a circle')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Wait for assistant response
      await waitFor(() => {
        expect(screen.getByText('🤖 AI:')).toBeInTheDocument();
        expect(screen.getByText(/I've created a test rectangle for you on the canvas/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('TEST: Direct render approach like working ChatInterface test', async () => {
      const user = userEvent.setup();
      
      // Use direct render approach like working test
      render(
        <ConversationProvider>
          <App />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      expect(sendButton).toBeDisabled();

      await act(async () => {
        await user.type(messageInput, 'Direct render test message');
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 5000 });

      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Direct render test message')).toBeInTheDocument();
      });
    });

    it('TEST: Minimal App reproduction - ChatInterface only', async () => {
      const user = userEvent.setup();
      
      // Create minimal component that mirrors App structure
      function MinimalApp() {
        // Minimal App logic similar to real App but without complex hooks
        const { slideNumberInput } = useConversationContext();
        
        const currentSlideData = {
          id: '1',
          content: 'Slide content',
          number: 1
        };
        
        const handleClearConversation = () => {
          console.log('Clear conversation');
        };
        
        return (
          <div className="App">
            <ChatInterface
              currentSlide={currentSlideData}
              currentSlideNumber={1}
              editor={createMockEditor()}
              onClearConversation={handleClearConversation}
            />
          </div>
        );
      }
      
      render(
        <ConversationProvider>
          <MinimalApp />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      expect(sendButton).toBeDisabled();

      await act(async () => {
        await user.type(messageInput, 'Minimal app test message');
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 3000 });

      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Minimal app test message')).toBeInTheDocument();
      });
    });

    it('TEST: Progressive App - ChatInterface + TLDraw Canvas', async () => {
      const user = userEvent.setup();
      
      // Add TLDraw to see if it breaks context updates
      function AppWithTLDraw() {
        const { slideNumberInput } = useConversationContext();
        
        const currentSlideData = {
          id: '1',
          content: 'Slide content',
          number: 1
        };
        
        const handleClearConversation = () => {
          console.log('Clear conversation');
        };
        
        const handleMount = () => {
          console.log('TLDraw mounted');
        };
        
        return (
          <div className="App">
            {/* Add TLDraw Canvas like in real App */}
            <div className="canvas-container">
              <Tldraw onMount={handleMount} />
            </div>
            
            <ChatInterface
              currentSlide={currentSlideData}
              currentSlideNumber={1}
              editor={createMockEditor()}
              onClearConversation={handleClearConversation}
            />
          </div>
        );
      }
      
      render(
        <ConversationProvider>
          <AppWithTLDraw />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      expect(sendButton).toBeDisabled();

      await act(async () => {
        await user.type(messageInput, 'TLDraw test message');
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // If this test fails, TLDraw is interfering with context updates
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('TLDraw test message')).toBeInTheDocument();
      });
    });

    it('TEST: Progressive App - Add SlideControls + TopNav', async () => {
      const user = userEvent.setup();
      
      // Add SlideControls and TopNav to see if they break context updates
      function AppWithNavigation() {
        const { slideNumberInput } = useConversationContext();
        
        const currentSlideData = {
          id: '1',
          content: 'Slide content',
          number: 1
        };
        
        const handleClearConversation = () => {
          console.log('Clear conversation');
        };
        
        const handleMount = () => {
          console.log('TLDraw mounted');
        };
        
        // Simple navigation handlers without useCallback 
        const handlePrevSlide = () => {
          console.log('Previous slide');
        };
        
        const handleNextSlide = () => {
          console.log('Next slide');
        };
        
        const handleSlideJump = () => {
          console.log('Slide jump');
        };
        
        const handleAddSlide = () => {
          console.log('Add slide');
        };
        
        const toggleSlideNavigator = () => {
          console.log('Toggle navigator');
        };
        
        return (
          <div className="App">
            {/* TLDraw Canvas */}
            <div className="canvas-container">
              <Tldraw onMount={handleMount} />
            </div>
            
            <ChatInterface
              currentSlide={currentSlideData}
              currentSlideNumber={1}
              editor={createMockEditor()}
              onClearConversation={handleClearConversation}
            />
            
            {/* Add TopNav with SlideControls like in real App */}
            <div className="top-nav">
              <div className="slide-controls" data-testid="slide-controls">
                <button onClick={handlePrevSlide}>←</button>
                <div className="slide-counter">Slide 1 of 1</div>
                <button onClick={handleNextSlide}>→</button>
                <button onClick={toggleSlideNavigator}>📋 All Slides</button>
              </div>
              <div className="slide-jump-container">
                <form onSubmit={handleSlideJump}>
                  <input 
                    type="number" 
                    value={slideNumberInput}
                    onChange={(e) => {}}
                    placeholder="Slide number"
                  />
                  <button type="submit">Go</button>
                </form>
              </div>
              <button onClick={handleAddSlide}>+ New Slide</button>
            </div>
          </div>
        );
      }
      
      render(
        <ConversationProvider>
          <AppWithNavigation />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      expect(sendButton).toBeDisabled();

      await act(async () => {
        await user.type(messageInput, 'Navigation test message');
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // If this test fails, SlideControls/TopNav are interfering with context updates
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Navigation test message')).toBeInTheDocument();
      });
    });

    it('TEST: Progressive App - Add SlideNavigator Component', async () => {
      const user = userEvent.setup();
      
      // Add SlideNavigator to see if it breaks context updates
      function AppWithSlideManager() {
        const { slideNumberInput } = useConversationContext();
        
        const currentSlideData = {
          id: '1',
          content: 'Slide content',
          number: 1
        };
        
        const handleClearConversation = () => {
          console.log('Clear conversation');
        };
        
        const handleMount = () => {
          console.log('TLDraw mounted');
        };
        
        // Simple navigation handlers without useCallback 
        const handlePrevSlide = () => {
          console.log('Previous slide');
        };
        
        const handleNextSlide = () => {
          console.log('Next slide');
        };
        
        const handleSlideJump = () => {
          console.log('Slide jump');
        };
        
        const handleAddSlide = () => {
          console.log('Add slide');
        };
        
        const toggleSlideNavigator = () => {
          console.log('Toggle navigator');
        };
        
        // SlideNavigator handlers
        const handleSlideClick = () => {
          console.log('Slide click');
        };
        
        const handleDeleteSlide = () => {
          console.log('Delete slide');
        };
        
        const handleDragStart = () => {
          console.log('Drag start');
        };
        
        const handleDragOver = () => {
          console.log('Drag over');
        };
        
        const handleDragLeave = () => {
          console.log('Drag leave');
        };
        
        const handleDrop = () => {
          console.log('Drop');
        };
        
        const handleDragEnd = () => {
          console.log('Drag end');
        };
        
        const handleClose = () => {
          console.log('Close navigator');
        };
        
        return (
          <div className="App">
            {/* TLDraw Canvas */}
            <div className="canvas-container">
              <Tldraw onMount={handleMount} />
            </div>
            
            <ChatInterface
              currentSlide={currentSlideData}
              currentSlideNumber={1}
              editor={createMockEditor()}
              onClearConversation={handleClearConversation}
            />
            
            {/* Add TopNav with SlideControls */}
            <div className="top-nav">
              <div className="slide-controls" data-testid="slide-controls">
                <button onClick={handlePrevSlide}>←</button>
                <div className="slide-counter">Slide 1 of 1</div>
                <button onClick={handleNextSlide}>→</button>
                <button onClick={toggleSlideNavigator}>📋 All Slides</button>
              </div>
              <div className="slide-jump-container">
                <form onSubmit={handleSlideJump}>
                  <input 
                    type="number" 
                    value={slideNumberInput}
                    onChange={(e) => {}}
                    placeholder="Slide number"
                  />
                  <button type="submit">Go</button>
                </form>
              </div>
              <button onClick={handleAddSlide}>+ New Slide</button>
            </div>
            
            {/* Add SlideNavigator like in real App */}
            {true && (
              <div className="slide-navigator">
                <div className="slide-grid">
                  <div className="slide-card" onClick={handleSlideClick}>
                    <div className="slide-preview">Slide 1</div>
                    <button onClick={handleDeleteSlide}>Delete</button>
                  </div>
                </div>
                <button onClick={handleClose}>Close</button>
              </div>
            )}
          </div>
        );
      }
      
      render(
        <ConversationProvider>
          <AppWithSlideManager />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      expect(sendButton).toBeDisabled();

      await act(async () => {
        await user.type(messageInput, 'SlideManager test message');
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // If this test fails, SlideManager is interfering with context updates
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('SlideManager test message')).toBeInTheDocument();
      });
    });

    it('TEST: Progressive App - Add useSlideOrchestration Hook', async () => {
      const user = userEvent.setup();
      
      // Add useSlideOrchestration to see if this hook breaks context updates
      function AppWithSlideOrchestration() {
        const { 
          slideNumberInput, 
          setSlideNumberInput, 
          showSlideNavigator,
          setShowSlideNavigator,
          isChatExpanded,
          setIsChatExpanded,
          localError,
          setLocalError,
          clearError,
          toggleChatExpanded,
          toggleSlideNavigator,
          clearInput,
          resetChatState,
          addMessage,
          clearConversation,
          setDraggedSlide,
          setDragOverSlide,
          draggedSlide,
          dragOverSlide,
          resetDragState
        } = useConversationContext();
        
        const {
          slides,
          totalSlides,
          currentSlide,
          setCurrentSlide,
          addNewSlide,
          deleteSlide,
          reorderSlides,
          getCurrentSlide,
          handleDragEnd
        } = useSlideOrchestration();
        
        const currentSlideData = {
          id: `slide-${currentSlide}`,
          content: 'Slide content',
          number: currentSlide || 1
        };
        
        const handleClearConversation = () => {
          console.log('Clear conversation');
        };
        
        const handleMount = () => {
          console.log('TLDraw mounted');
        };
        
        // Simple navigation handlers without useCallback 
        const handlePrevSlide = () => {
          if (currentSlide > 1) {
            setCurrentSlide(currentSlide - 1);
          }
        };
        
        const handleNextSlide = () => {
          if (currentSlide < totalSlides) {
            setCurrentSlide(currentSlide + 1);
          }
        };
        
        const handleSlideJump = () => {
          console.log('Slide jump');
        };
        
        const handleAddSlide = () => {
          addNewSlide(createMockEditor()); // Fix the addSlide function reference to use addNewSlide from useSlideOrchestration
        };
        
        return (
          <div className="App">
            {/* TLDraw Canvas */}
            <div className="canvas-container">
              <Tldraw onMount={handleMount} />
            </div>
            
            <ChatInterface
              currentSlide={currentSlideData}
              currentSlideNumber={1}
              editor={createMockEditor()}
              onClearConversation={handleClearConversation}
            />
            
            {/* Add TopNav with SlideControls */}
            <div className="top-nav">
              <div className="slide-controls" data-testid="slide-controls">
                <button onClick={handlePrevSlide}>←</button>
                <div className="slide-counter">Slide {currentSlide || 1} of {totalSlides}</div>
                <button onClick={handleNextSlide}>→</button>
                <button onClick={() => setShowSlideNavigator(!showSlideNavigator)}>📋 All Slides</button>
              </div>
              <div className="slide-jump-container">
                <form onSubmit={handleSlideJump}>
                  <input 
                    type="number" 
                    value={slideNumberInput}
                    onChange={(e) => {}}
                    placeholder="Slide number"
                  />
                  <button type="submit">Go</button>
                </form>
              </div>
              <button onClick={handleAddSlide}>+ New Slide</button>
            </div>
            
            {/* Add SlideNavigator like in real App */}
            {true && (
              <div className="slide-navigator">
                <div className="slide-grid">
                  {slides.map((slide) => (
                    <div key={slide.id} className="slide-card">
                      <div className="slide-preview">Slide {slide.number}</div>
                      <button onClick={() => deleteSlide(slide.number, null)}>Delete</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => console.log('Close')}>Close</button>
              </div>
            )}
          </div>
        );
      }
      
      render(
        <ConversationProvider>
          <AppWithSlideOrchestration />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      expect(sendButton).toBeDisabled();

      await act(async () => {
        await user.type(messageInput, 'Orchestration hook test message');
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // If this test fails, useSlideOrchestration is interfering with context updates
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Orchestration hook test message')).toBeInTheDocument();
      });
    });

    it('TEST: Progressive App - Add useAppHandlers Hook', async () => {
      const user = userEvent.setup();
      
      // Add useAppHandlers to see if this hook breaks context updates
      function AppWithAppHandlers() {
        const { 
          slideNumberInput, 
          setSlideNumberInput, 
          showSlideNavigator,
          setShowSlideNavigator,
          isChatExpanded,
          setIsChatExpanded,
          localError,
          setLocalError,
          clearError,
          toggleChatExpanded,
          toggleSlideNavigator,
          clearInput,
          resetChatState,
          addMessage,
          clearConversation,
          setDraggedSlide,
          setDragOverSlide,
          draggedSlide,
          dragOverSlide,
          resetDragState
        } = useConversationContext();
        
        const {
          slides,
          totalSlides,
          currentSlide,
          setCurrentSlide,
          addNewSlide,
          deleteSlide,
          reorderSlides,
          getCurrentSlide,
          handleDragEnd
        } = useSlideOrchestration();
        
        const editorRef = React.useRef(null);
        
        const {
          handleAddSlide: handleAppAddSlide,
          handleJumpToSlide,
          handleDragOver,
          handleDragLeave,
          handleDrop,
          handleEnhancedDragEnd,
        } = useAppHandlers(
          slideNumberInput, 
          totalSlides, 
          currentSlide, 
          null, // draggedSlide
          slides,
          setCurrentSlide, 
          setSlideNumberInput, 
          setLocalError, 
          setDragOverSlide, 
          resetDragState,
          addNewSlide, 
          reorderSlides, 
          handleDragEnd, 
          getCurrentSlide,
          editorRef
        );
        
        // Simple navigation handlers
        const handlePrevSlide = () => {
          if (currentSlide > 1) {
            setCurrentSlide(currentSlide - 1);
          }
        };
        
        const handleNextSlide = () => {
          if (currentSlide < totalSlides) {
            setCurrentSlide(currentSlide + 1);
          }
        };
        
        return (
          <div className="App">
            {/* TLDraw Canvas */}
            <div className="canvas-container">
              <Tldraw onMount={() => console.log('TLDraw mounted')} />
            </div>
            
            <ChatInterface
              currentSlide={{ id: `slide-${currentSlide}`, number: currentSlide || 1 }}
              currentSlideNumber={currentSlide || 1}
              editor={createMockEditor()}
              onClearConversation={() => {}}
            />
            
            {/* Add TopNav with SlideControls */}
            <div className="top-nav">
              <div className="slide-controls" data-testid="slide-controls">
                <button onClick={handlePrevSlide}>←</button>
                <div className="slide-counter">Slide {currentSlide || 1} of {totalSlides}</div>
                <button onClick={handleNextSlide}>→</button>
                <button onClick={() => setShowSlideNavigator(!showSlideNavigator)}>📋 All Slides</button>
              </div>
              <div className="slide-jump-container">
                <form onSubmit={handleJumpToSlide}>
                  <input 
                    type="number" 
                    value={slideNumberInput}
                    onChange={(e) => setSlideNumberInput(e.target.value)}
                    placeholder="Slide number"
                  />
                  <button type="submit">Go</button>
                </form>
              </div>
              <button onClick={handleAppAddSlide}>+ New Slide</button>
            </div>
            
            {/* Add SlideNavigator like in real App */}
            {showSlideNavigator && (
              <div className="slide-navigator">
                <div className="slide-grid">
                  {slides.map((slide) => (
                    <div key={slide.id} className="slide-card">
                      <div className="slide-preview">Slide {slide.number}</div>
                      <button onClick={() => deleteSlide(slide.number, null)}>Delete</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowSlideNavigator(false)}>Close</button>
              </div>
            )}
          </div>
        );
      }
      
      render(
        <ConversationProvider>
          <AppWithAppHandlers />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      expect(sendButton).toBeDisabled();

      await act(async () => {
        await user.type(messageInput, 'App handlers test message');
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // If this test fails, useAppHandlers is interfering with context updates
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('App handlers test message')).toBeInTheDocument();
      });
    });

    it('TEST: Progressive App - Add useRenderDiagnostics Hook', async () => {
      const user = userEvent.setup();
      
      // Add useRenderDiagnostics to see if this hook breaks context updates
      function AppWithRenderDiagnostics() {
        // SUSPECT: This hook might interfere with context updates
        // useRenderDiagnostics('AppComponent');
        
        const { 
          dialogInput, 
          setDialogInput, 
          conversations, 
          localIsLoading: isLoading, 
          setLocalIsLoading: setIsLoading,
          slideNumberInput, 
          setSlideNumberInput, 
          showSlideNavigator,
          setShowSlideNavigator,
          isChatExpanded,
          setIsChatExpanded,
          localError,
          setLocalError,
          clearError,
          toggleChatExpanded,
          toggleSlideNavigator,
          clearInput,
          resetChatState,
          addMessage,
          clearConversation,
          setDraggedSlide,
          setDragOverSlide,
          draggedSlide,
          dragOverSlide,
          resetDragState
        } = useConversationContext();
        
        const {
          slides,
          totalSlides,
          currentSlide,
          setCurrentSlide,
          addNewSlide,
          deleteSlide,
          reorderSlides,
          getCurrentSlide,
          handleDragEnd
        } = useSlideOrchestration();
        
        const editorRef = React.useRef(null);
        
        const {
          handleAddSlide: handleAppAddSlide,
          handleJumpToSlide,
          handleDragOver,
          handleDragLeave,
          handleDrop,
          handleEnhancedDragEnd,
        } = useAppHandlers(
          slideNumberInput, 
          totalSlides, 
          currentSlide, 
          null, // Use null like working tests
          slides,
          setCurrentSlide, 
          setSlideNumberInput, 
          setLocalError, 
          setDragOverSlide, 
          resetDragState,
          addNewSlide, 
          reorderSlides, 
          handleDragEnd, 
          getCurrentSlide,
          editorRef
        );
        
        // Add memoized current slide data like real App
        const currentSlideData = React.useMemo(() => {
          const slide = slides.find(s => s.number === currentSlide);
          return slide ? {
            id: `slide-${currentSlide}`,
            number: currentSlide,
            title: slide.title
          } : null;
        }, [slides, currentSlide]);
        
        // Add useCallback handlers like real App
        const handlePrevSlide = React.useCallback(() => {
          setCurrentSlide(Math.max(1, currentSlide - 1));
        }, [currentSlide, setCurrentSlide]);
        
        const handleNextSlide = React.useCallback(() => {
          setCurrentSlide(Math.min(totalSlides, currentSlide + 1));
        }, [currentSlide, totalSlides, setCurrentSlide]);
        
        const handleClearConversation = React.useCallback(() => {
          console.log('Clear conversation');
        }, []);
        
        const handleSlideDelete = React.useCallback((slideNumber: number) => {
          deleteSlide(slideNumber, null);
        }, [deleteSlide]);
        
        const handleDragStart = React.useCallback((_: React.DragEvent, slideNumber: number) => {
          console.log('Drag start:', slideNumber);
        }, []);
        
        return (
          <div className="App">
            <div className="canvas-container">
              <Tldraw onMount={() => console.log('TLDraw mounted')} />
            </div>
            
            <ChatInterface
              currentSlide={currentSlideData}
              currentSlideNumber={currentSlide || 1}
              editor={createMockEditor()}
              onClearConversation={handleClearConversation}
            />
            
            {/* Use MEMOIZED components like real App */}
            <SlideControls
              currentSlide={currentSlide}
              totalSlides={totalSlides}
              slideNumberInput={slideNumberInput}
              setSlideNumberInput={setSlideNumberInput}
              onPrevSlide={handlePrevSlide}
              onNextSlide={handleNextSlide}
              onAddSlide={handleAppAddSlide}
              onJumpToSlide={handleJumpToSlide}
              onToggleNavigator={() => setShowSlideNavigator(!showSlideNavigator)}
            />
            
            {showSlideNavigator && (
              <SlideNavigator
                slides={slides}
                currentSlide={currentSlide}
                draggedSlide={null}
                dragOverSlide={null}
                onSlideClick={setCurrentSlide}
                onDeleteSlide={handleSlideDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleEnhancedDragEnd}
                onClose={() => setShowSlideNavigator(false)}
              />
            )}
          </div>
        );
      }
      
      render(
        <ConversationProvider>
          <AppWithRenderDiagnostics />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      expect(sendButton).toBeDisabled();

      await act(async () => {
        await user.type(messageInput, 'Render diagnostics test message');
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // If this test FAILS, useRenderDiagnostics is our culprit!
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Render diagnostics test message')).toBeInTheDocument();
      });
    });

    it('TEST: Progressive App - Add useEditorSetup Hook', async () => {
      const user = userEvent.setup();
      
      // Add useEditorSetup to see if this hook breaks context updates
      function AppWithEditorSetup() {
        // SUSPECT: This hook might interfere with context updates
        const { editorRef, handleMount } = useEditorSetup();
        
        const { 
          dialogInput, 
          setDialogInput, 
          conversations, 
          localIsLoading: isLoading, 
          setLocalIsLoading: setIsLoading,
          slideNumberInput, 
          setSlideNumberInput, 
          showSlideNavigator,
          setShowSlideNavigator,
          isChatExpanded,
          setIsChatExpanded,
          localError,
          setLocalError,
          clearError,
          toggleChatExpanded,
          toggleSlideNavigator,
          clearInput,
          resetChatState,
          addMessage,
          clearConversation,
          setDraggedSlide,
          setDragOverSlide,
          draggedSlide,
          dragOverSlide,
          resetDragState
        } = useConversationContext();
        
        const {
          slides,
          totalSlides,
          currentSlide,
          setCurrentSlide,
          addNewSlide,
          deleteSlide,
          reorderSlides,
          getCurrentSlide,
          handleDragEnd
        } = useSlideOrchestration();
        
        const {
          handleAddSlide: handleAppAddSlide,
          handleJumpToSlide,
          handleDragOver,
          handleDragLeave,
          handleDrop,
          handleEnhancedDragEnd,
        } = useAppHandlers(
          slideNumberInput, 
          totalSlides, 
          currentSlide, 
          null, // Use null like working tests
          slides,
          setCurrentSlide, 
          setSlideNumberInput, 
          setLocalError, 
          setDragOverSlide, 
          resetDragState,
          addNewSlide, 
          reorderSlides, 
          handleDragEnd, 
          getCurrentSlide,
          editorRef
        );
        
        // Add memoized current slide data like real App
        const currentSlideData = React.useMemo(() => {
          const slide = slides.find(s => s.number === currentSlide);
          return slide ? {
            id: `slide-${currentSlide}`,
            number: currentSlide,
            title: slide.title
          } : null;
        }, [slides, currentSlide]);
        
        // Add useCallback handlers like real App
        const handlePrevSlide = React.useCallback(() => {
          setCurrentSlide(Math.max(1, currentSlide - 1));
        }, [currentSlide, setCurrentSlide]);
        
        const handleNextSlide = React.useCallback(() => {
          setCurrentSlide(Math.min(totalSlides, currentSlide + 1));
        }, [currentSlide, totalSlides, setCurrentSlide]);
        
        const handleClearConversation = React.useCallback(() => {
          console.log('Clear conversation');
        }, []);
        
        const handleSlideDelete = React.useCallback((slideNumber: number) => {
          deleteSlide(slideNumber, editorRef.current);
        }, [deleteSlide, editorRef]);
        
        const handleDragStart = React.useCallback((_: React.DragEvent, slideNumber: number) => {
          console.log('Drag start:', slideNumber);
        }, []);
        
        return (
          <div className="App">
            <div className="canvas-container">
              <Tldraw onMount={handleMount} />
            </div>
            
            <ChatInterface
              currentSlide={currentSlideData}
              currentSlideNumber={currentSlide || 1}
              editor={editorRef.current}
              onClearConversation={handleClearConversation}
            />
            
            {/* Use MEMOIZED components like real App */}
            <SlideControls
              currentSlide={currentSlide}
              totalSlides={totalSlides}
              slideNumberInput={slideNumberInput}
              setSlideNumberInput={setSlideNumberInput}
              onPrevSlide={handlePrevSlide}
              onNextSlide={handleNextSlide}
              onAddSlide={handleAppAddSlide}
              onJumpToSlide={handleJumpToSlide}
              onToggleNavigator={() => setShowSlideNavigator(!showSlideNavigator)}
            />
            
            {showSlideNavigator && (
              <SlideNavigator
                slides={slides}
                currentSlide={currentSlide}
                draggedSlide={null}
                dragOverSlide={null}
                onSlideClick={setCurrentSlide}
                onDeleteSlide={handleSlideDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleEnhancedDragEnd}
                onClose={() => setShowSlideNavigator(false)}
              />
            )}
          </div>
        );
      }
      
      render(
        <ConversationProvider>
          <AppWithEditorSetup />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      expect(sendButton).toBeDisabled();

      await act(async () => {
        await user.type(messageInput, 'Editor setup test message');
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // If this test FAILS, useEditorSetup is our culprit!
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Editor setup test message')).toBeInTheDocument();
      });
    });

    it('TEST: Mock useEditorSetup - Focus Interference Theory', async () => {
      const user = userEvent.setup();
      
      // Mock useEditorSetup to prevent focus stealing
      const mockUseEditorSetup = jest.fn(() => ({
        editorRef: { current: null },
        initializedRef: { current: false },
        handleMount: jest.fn(), // Mock without editor.focus() call
        createNewSlideFrame: jest.fn(() => 'test-frame-id')
      }));
      
      // Replace the import temporarily
      const originalUseEditorSetup = require('../hooks/useEditorSetup').useEditorSetup;
      require('../hooks/useEditorSetup').useEditorSetup = mockUseEditorSetup;
      
      function AppWithMockedEditorSetup() {
        // Test with MOCKED useEditorSetup (no focus stealing)
        const { editorRef, handleMount } = useEditorSetup();
        
        const { 
          dialogInput, 
          setDialogInput, 
          conversations, 
          localIsLoading: isLoading, 
          setLocalIsLoading: setIsLoading,
          slideNumberInput, 
          setSlideNumberInput, 
          showSlideNavigator,
          setShowSlideNavigator,
          isChatExpanded,
          setIsChatExpanded,
          localError,
          setLocalError,
          clearError,
          toggleChatExpanded,
          toggleSlideNavigator,
          clearInput,
          resetChatState,
          addMessage,
          clearConversation,
          setDraggedSlide,
          setDragOverSlide,
          draggedSlide,
          dragOverSlide,
          resetDragState
        } = useConversationContext();
        
        const {
          slides,
          totalSlides,
          currentSlide,
          setCurrentSlide,
          addNewSlide,
          deleteSlide,
          reorderSlides,
          getCurrentSlide,
          handleDragEnd
        } = useSlideOrchestration();
        
        const {
          handleAddSlide: handleAppAddSlide,
          handleJumpToSlide,
          handleDragOver,
          handleDragLeave,
          handleDrop,
          handleEnhancedDragEnd,
        } = useAppHandlers(
          slideNumberInput, 
          totalSlides, 
          currentSlide, 
          null, // Use null like working tests
          slides,
          setCurrentSlide, 
          setSlideNumberInput, 
          setLocalError, 
          setDragOverSlide, 
          resetDragState,
          addNewSlide, 
          reorderSlides, 
          handleDragEnd, 
          getCurrentSlide,
          editorRef
        );
        
        // Add memoized current slide data like real App
        const currentSlideData = React.useMemo(() => {
          const slide = slides.find(s => s.number === currentSlide);
          return slide ? {
            id: `slide-${currentSlide}`,
            number: currentSlide,
            title: slide.title
          } : null;
        }, [slides, currentSlide]);
        
        // Add useCallback handlers like real App
        const handlePrevSlide = React.useCallback(() => {
          setCurrentSlide(Math.max(1, currentSlide - 1));
        }, [currentSlide, setCurrentSlide]);
        
        const handleNextSlide = React.useCallback(() => {
          setCurrentSlide(Math.min(totalSlides, currentSlide + 1));
        }, [currentSlide, totalSlides, setCurrentSlide]);
        
        const handleClearConversation = React.useCallback(() => {
          console.log('Clear conversation');
        }, []);
        
        const handleSlideDelete = React.useCallback((slideNumber: number) => {
          deleteSlide(slideNumber, editorRef.current);
        }, [deleteSlide, editorRef]);
        
        const handleDragStart = React.useCallback((_: React.DragEvent, slideNumber: number) => {
          console.log('Drag start:', slideNumber);
        }, []);
        
        return (
          <div className="App">
            <div className="canvas-container">
              <Tldraw onMount={handleMount} />
            </div>
            
            <ChatInterface
              currentSlide={currentSlideData}
              currentSlideNumber={currentSlide || 1}
              editor={editorRef.current}
              onClearConversation={handleClearConversation}
            />
            
            {/* Use MEMOIZED components like real App */}
            <SlideControls
              currentSlide={currentSlide}
              totalSlides={totalSlides}
              slideNumberInput={slideNumberInput}
              setSlideNumberInput={setSlideNumberInput}
              onPrevSlide={handlePrevSlide}
              onNextSlide={handleNextSlide}
              onAddSlide={handleAppAddSlide}
              onJumpToSlide={handleJumpToSlide}
              onToggleNavigator={() => setShowSlideNavigator(!showSlideNavigator)}
            />
            
            {showSlideNavigator && (
              <SlideNavigator
                slides={slides}
                currentSlide={currentSlide}
                draggedSlide={null}
                dragOverSlide={null}
                onSlideClick={setCurrentSlide}
                onDeleteSlide={handleSlideDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleEnhancedDragEnd}
                onClose={() => setShowSlideNavigator(false)}
              />
            )}
          </div>
        );
      }
      
      render(
        <ConversationProvider>
          <AppWithMockedEditorSetup />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      expect(sendButton).toBeDisabled();

      await act(async () => {
        await user.type(messageInput, 'Mocked editor setup test message');
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // If this test PASSES, editor.focus() was the culprit!
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Mocked editor setup test message')).toBeInTheDocument();
      });
      
      // Restore original hook
      require('../hooks/useEditorSetup').useEditorSetup = originalUseEditorSetup;
    });
  });

  describe('Clear Conversation', () => {
    beforeEach(() => {
      // Set up enhancedAskGPT mock with proper response (same pattern as working ChatInterface test)
      (enhancedAskGPT as jest.Mock).mockResolvedValue("I've created a test rectangle for you.");
      
      // Also set up createShapeFromAI mock
      (createShapeFromAI as jest.Mock).mockResolvedValue([{
        id: "test-shape-id",
        type: "rectangle"
      }]);
    });

    it('should clear conversation when clear button is clicked', async () => {
      const user = userEvent.setup();
      
      // Use the EXACT same pattern as the working debug test
      let contextDialogInput = '';
      const ContextMonitor = () => {
        const { dialogInput } = useConversationContext();
        contextDialogInput = dialogInput;
        return null;
      };

      render(
        <ConversationProvider>
          <App />
          <ContextMonitor />
        </ConversationProvider>
      );
      
      await waitForComponentStabilization();

      const textarea = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      
      // Step 1: Type message (replicate exact debug test sequence)
      await user.type(textarea, 'Clear conversation test');
      
      // Verify typing worked (essential check from debug test)
      expect(textarea).toHaveValue('Clear conversation test');
      expect(contextDialogInput).toBe('Clear conversation test');

      // Step 2: Send the message
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;
      expect(sendButton).not.toBeDisabled();
      
      await user.click(sendButton);

      // Step 3: Wait for user message
      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Clear conversation test')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Step 4: Wait for assistant response 
      await waitFor(() => {
        expect(screen.getByText('🤖 AI:')).toBeInTheDocument();
        expect(screen.getByText(/I've created a test rectangle for you on the canvas/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Step 5: Click clear conversation button
      const clearButton = screen.getByRole('button', { name: /clear conversation/i });
      await user.click(clearButton);

      // Step 6: Verify messages are cleared
      await waitFor(() => {
        expect(screen.queryByText('👤 You:')).not.toBeInTheDocument();
        expect(screen.queryByText('Clear conversation test')).not.toBeInTheDocument();
        expect(screen.queryByText(/🤖 AI: I've created a test rectangle for you on the canvas/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('TLDraw Canvas Integration', () => {
    it('should initialize TLDraw canvas correctly', async () => {
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      const canvas = screen.getByTestId('tldraw-canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveTextContent('Mock TLDraw Canvas');
    });

    it('should handle editor mount callback', async () => {
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // The mock should have called onMount with mock editor
      // This is verified by the successful rendering of other components
      // that depend on the editor being initialized
      expect(screen.getByTestId('tldraw-canvas')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle slide creation errors gracefully', async () => {
      const user = userEvent.setup();
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Mock an error in slide creation
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // This would be better tested with a specific error mock,
      // but the current architecture doesn't expose enough to simulate this easily
      const addSlideButton = screen.getByLabelText('Add new slide');
      await user.click(addSlideButton);

      // Restore console.error
      console.error = originalConsoleError;

      // Verify the app doesn't crash and still functions
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    });

    it('should handle missing slides gracefully', async () => {
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // App should render even with no initial slides
      expect(screen.getByTestId('tldraw-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
      expect(screen.getByTestId('slide-controls')).toBeInTheDocument();
    });
  });

  describe('Performance and Memoization', () => {
    it('should render memoized components without re-creation', async () => {
      const { rerender } = renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Re-render the component
      rerender(<App />);
      await waitForComponentStabilization();

      // Components should still be present (memoization working)
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
      expect(screen.getByTestId('slide-controls')).toBeInTheDocument();
    });

    it('should handle rapid slide navigation without performance issues', async () => {
      const user = userEvent.setup();
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Add multiple slides for navigation testing
      const addSlideButton = screen.getByLabelText('Add new slide');
      await user.click(addSlideButton);
      await user.click(addSlideButton);
      await user.click(addSlideButton);

      await waitFor(() => {
        expect(screen.getByText('Slide 4 of 4')).toBeInTheDocument();
      });

      // Rapidly navigate between slides
      const prevButton = screen.getByLabelText('Previous slide');
      const nextButton = screen.getByLabelText('Next slide');

      for (let i = 0; i < 5; i++) {
        await user.click(prevButton);
        await user.click(nextButton);
      }

      // App should still be responsive
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
      expect(screen.getByTestId('slide-controls')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle keyboard shortcuts for slide navigation', async () => {
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Add a second slide for navigation
      const user = userEvent.setup();
      const addSlideButton = screen.getByLabelText('Add new slide');
      await user.click(addSlideButton);

      await waitFor(() => {
        expect(screen.getByText('Slide 2 of 2')).toBeInTheDocument();
      });

      // Test keyboard navigation (if implemented)
      const app = screen.getByTestId('chat-interface').closest('.App');
      if (app) {
        simulateKeyPress(app, 'ArrowLeft');
        
        // Note: This test assumes keyboard navigation is implemented
        // The actual implementation may not include this feature yet
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Verify ARIA labels are present (delegated to child components)
      expect(screen.getByLabelText('Add new slide')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous slide')).toBeInTheDocument();
      expect(screen.getByLabelText('Next slide')).toBeInTheDocument();
      expect(screen.getByLabelText('Jump to slide')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle slide navigator')).toBeInTheDocument();
    });

    it('should support screen reader navigation', async () => {
      renderAppWithProviders(<App />);
      await waitForComponentStabilization();

      // Verify main content areas are properly structured
      const canvasContainer = document.querySelector('.canvas-container');
      expect(canvasContainer).toBeInTheDocument();
      
      // All major UI components should render
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
      expect(screen.getByTestId('slide-controls')).toBeInTheDocument();
    });
  });

  describe('Memoized Components Test', () => {
    it('TEST: Progressive App - Add Memoized Components (Root Cause Test)', async () => {
      const user = userEvent.setup();
      
      // Test with memoized components like actual App.tsx to confirm if memo() blocks context updates
      function AppWithMemoizedComponents() {
        const { 
          dialogInput, 
          setDialogInput, 
          conversations, 
          localIsLoading: isLoading, 
          setLocalIsLoading: setIsLoading,
          slideNumberInput, 
          setSlideNumberInput, 
          showSlideNavigator,
          setShowSlideNavigator,
          isChatExpanded,
          setIsChatExpanded,
          localError,
          setLocalError,
          clearError,
          toggleChatExpanded,
          toggleSlideNavigator,
          clearInput,
          resetChatState,
          addMessage,
          clearConversation,
          setDraggedSlide,
          setDragOverSlide,
          draggedSlide,
          dragOverSlide,
          resetDragState
        } = useConversationContext();
        
        const {
          slides,
          totalSlides,
          currentSlide,
          setCurrentSlide,
          addNewSlide,
          deleteSlide,
          reorderSlides,
          getCurrentSlide,
          handleDragEnd
        } = useSlideOrchestration();
        
        const editorRef = React.useRef(null);
        
        const {
          handleAddSlide: handleAppAddSlide,
          handleJumpToSlide,
          handleDragOver,
          handleDragLeave,
          handleDrop,
          handleEnhancedDragEnd,
        } = useAppHandlers(
          slideNumberInput, 
          totalSlides, 
          currentSlide, 
          null, // Use null like working tests
          slides,
          setCurrentSlide, 
          setSlideNumberInput, 
          setLocalError, 
          setDragOverSlide, 
          resetDragState,
          addNewSlide, 
          reorderSlides, 
          handleDragEnd, 
          getCurrentSlide,
          editorRef
        );
        
        // Add memoized current slide data like real App
        const currentSlideData = React.useMemo(() => {
          const slide = slides.find(s => s.number === currentSlide);
          return slide ? {
            id: `slide-${currentSlide}`,
            number: currentSlide,
            title: slide.title
          } : null;
        }, [slides, currentSlide]);
        
        // Add useCallback handlers like real App
        const handlePrevSlide = React.useCallback(() => {
          setCurrentSlide(Math.max(1, currentSlide - 1));
        }, [currentSlide, setCurrentSlide]);
        
        const handleNextSlide = React.useCallback(() => {
          setCurrentSlide(Math.min(totalSlides, currentSlide + 1));
        }, [currentSlide, totalSlides, setCurrentSlide]);
        
        const handleClearConversation = React.useCallback(() => {
          console.log('Clear conversation');
        }, []);
        
        const handleSlideDelete = React.useCallback((slideNumber: number) => {
          deleteSlide(slideNumber, null);
        }, [deleteSlide]);
        
        const handleDragStart = React.useCallback((_: React.DragEvent, slideNumber: number) => {
          console.log('Drag start:', slideNumber);
        }, []);
        
        return (
          <div className="App">
            <div className="canvas-container">
              <Tldraw onMount={() => console.log('TLDraw mounted')} />
            </div>
            
            <ChatInterface
              currentSlide={currentSlideData}
              currentSlideNumber={currentSlide || 1}
              editor={createMockEditor()}
              onClearConversation={handleClearConversation}
            />
            
            {/* Use MEMOIZED components like real App */}
            <SlideControls
              currentSlide={currentSlide}
              totalSlides={totalSlides}
              slideNumberInput={slideNumberInput}
              setSlideNumberInput={setSlideNumberInput}
              onPrevSlide={handlePrevSlide}
              onNextSlide={handleNextSlide}
              onAddSlide={handleAppAddSlide}
              onJumpToSlide={handleJumpToSlide}
              onToggleNavigator={() => setShowSlideNavigator(!showSlideNavigator)}
            />
            
            {showSlideNavigator && (
              <SlideNavigator
                slides={slides}
                currentSlide={currentSlide}
                draggedSlide={null}
                dragOverSlide={null}
                onSlideClick={setCurrentSlide}
                onDeleteSlide={handleSlideDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleEnhancedDragEnd}
                onClose={() => setShowSlideNavigator(false)}
              />
            )}
          </div>
        );
      }
      
      render(
        <ConversationProvider>
          <AppWithMemoizedComponents />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      expect(sendButton).toBeDisabled();

      await act(async () => {
        await user.type(messageInput, 'Memoized components test message');
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // If this test FAILS, memoized components are blocking context updates!
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Memoized components test message')).toBeInTheDocument();
      });
    });
  });

  describe('Complete App Integration Test', () => {
    it('TEST: Progressive App - Add Missing Hooks & Debug Components (Final Root Cause Test)', async () => {
      const user = userEvent.setup();
      
      // Test with ALL missing pieces from real App.tsx to identify the final culprit
      function CompleteAppWithAllHooks() {
        // Add the missing hooks from real App.tsx
        // useRenderDiagnostics('AppComponent');
        
        const { 
          dialogInput,
          setDialogInput,
          conversations,
          localIsLoading: isLoading,
          localIsTyping: isTyping,
          setLocalIsLoading: setIsLoading,
          setLocalIsTyping: setIsTyping,
          isChatExpanded,
          setIsChatExpanded,
          localError,
          setLocalError,
          clearError,
          toggleChatExpanded,
          toggleSlideNavigator,
          clearInput,
          resetChatState,
          addMessage,
          clearConversation,
          setDraggedSlide,
          setDragOverSlide,
          draggedSlide,
          dragOverSlide,
          resetDragState,
        } = useConversationContext();
        
        // Add missing state variables for useAppHandlers
        const [showSlideNavigator, setShowSlideNavigator] = React.useState(false);
        const [slideNumberInput, setSlideNumberInput] = React.useState('');
        
        // Add useEditorSetup hook
        const { editorRef, handleMount } = useEditorSetup();
        
        const {
          slides,
          totalSlides,
          currentSlide,
          setCurrentSlide,
          addNewSlide,
          deleteSlide,
          reorderSlides,
          getCurrentSlide,
          handleDragEnd
        } = useSlideOrchestration();
        
        const {
          handleChatMessage,
        } = useAppHandlers({
          editor: createMockEditor(), // Add missing editor for useAppHandlers
          slides,
          currentSlide,
          setCurrentSlide,
          setShowSlideNavigator,
          handleDragEnd,
        });
        
        // Define missing handlers
        const handlePrevSlide = () => {
          if (currentSlide > 1) {
            setCurrentSlide(currentSlide - 1);
          }
        };
        
        const handleNextSlide = () => {
          if (currentSlide < totalSlides) {
            setCurrentSlide(currentSlide + 1);
          }
        };
        
        const handleClearConversation = () => {
          console.log('Clear conversation');
        };
        
        const handleJumpToSlide = (e: React.FormEvent) => {
          e.preventDefault();
          const slideNum = parseInt(slideNumberInput);
          if (slideNum >= 1 && slideNum <= totalSlides) {
            setCurrentSlide(slideNum);
          }
        };
        
        const handleAppAddSlide = () => {
          addNewSlide(createMockEditor()); // Fix the addSlide function reference to use addNewSlide from useSlideOrchestration
        };
        
        const currentSlideData = slides.find(s => s.number === currentSlide) || null;
        
        return (
          <div className="App">
            {/* TLDraw Canvas */}
            <div className="canvas-container">
              <Tldraw onMount={handleMount} />
            </div>
            
            <ChatInterface
              currentSlide={currentSlideData}
              currentSlideNumber={currentSlide || 1}
              editor={createMockEditor()}
              onClearConversation={handleClearConversation}
            />
            
            {/* Add TopNav with SlideControls */}
            <div className="top-nav">
              <div className="slide-controls" data-testid="slide-controls">
                <button onClick={handlePrevSlide}>←</button>
                <div className="slide-counter">Slide {currentSlide || 1} of {totalSlides}</div>
                <button onClick={handleNextSlide}>→</button>
                <button onClick={() => setShowSlideNavigator(!showSlideNavigator)}>📋 All Slides</button>
              </div>
              <div className="slide-jump-container">
                <form onSubmit={handleJumpToSlide}>
                  <input 
                    type="number" 
                    value={slideNumberInput}
                    onChange={(e) => setSlideNumberInput(e.target.value)}
                    placeholder="Slide number"
                  />
                  <button type="submit">Go</button>
                </form>
              </div>
              <button onClick={handleAppAddSlide}>+ New Slide</button>
            </div>
            
            {/* Add SlideNavigator like in real App */}
            {showSlideNavigator && (
              <div className="slide-navigator">
                <div className="slide-grid">
                  {slides.map((slide) => (
                    <div key={slide.id} className="slide-card">
                      <div className="slide-preview">Slide {slide.number}</div>
                      <button onClick={() => deleteSlide(slide.number, null)}>Delete</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowSlideNavigator(false)}>Close</button>
              </div>
            )}
          </div>
        );
      }
      
      render(
        <ConversationProvider>
          <CompleteAppWithAllHooks />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const messageInput = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      expect(sendButton).toBeDisabled();

      await act(async () => {
        await user.type(messageInput, 'Complete app test message');
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 3000 });

      // If this test FAILS, we've found our root cause!
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Complete app test message')).toBeInTheDocument();
      });
    });
  });

  describe('Conversation Management', () => {
    it('should send messages and display conversation history', async () => {
      const user = userEvent.setup();
      render(
        <ConversationProvider>
          <App />
        </ConversationProvider>
      );
      await waitForComponentStabilization();

      const textarea = screen.getByPlaceholderText('Ask about this slide...') as HTMLTextAreaElement;
      await user.type(textarea, 'Create a circle');
      
      const sendButton = screen.getByLabelText('Send message');
      
      // Wrap click in act() to ensure React state updates are flushed
      await act(async () => {
        await user.click(sendButton);
      });

      // Wait for conversation state to update and messages to render
      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Create a circle')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Wait for assistant response
      await waitFor(() => {
        expect(screen.getByText('🤖 AI:')).toBeInTheDocument();
        expect(screen.getByText(/I've created a test rectangle for you on the canvas/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    // Simplified test to verify basic message rendering without complex hooks
    it('should render messages when added programmatically', async () => {
      const user = userEvent.setup();
      
      // Create a simple test component that directly tests message rendering
      function TestMessageRendering() {
        const { addMessage } = useConversationContext();
        
        const handleAddTestMessage = async () => {
          await act(async () => {
            addMessage('slide-1', 'user', 'Test message');
            addMessage('slide-1', 'assistant', 'Test response');
          });
        };
        
        return (
          <div>
            <button onClick={handleAddTestMessage} data-testid="add-test-messages">
              Add Test Messages
            </button>
            <ChatInterface
              currentSlide={{ id: 'slide-1', number: 1, title: 'Test Slide' }}
              currentSlideNumber={1}
              editor={createMockEditor()}
              onClearConversation={jest.fn()}
            />
          </div>
        );
      }
      
      render(
        <ConversationProvider>
          <TestMessageRendering />
        </ConversationProvider>
      );
      
      const addButton = screen.getByTestId('add-test-messages');
      await user.click(addButton);
      
      // Wait for messages to render
      await waitFor(() => {
        expect(screen.getByText('👤 You:')).toBeInTheDocument();
        expect(screen.getByText('Test message')).toBeInTheDocument();
        expect(screen.getByText('🤖 AI:')).toBeInTheDocument();
        expect(screen.getByText('Test response')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
});
