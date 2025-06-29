import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Editor } from 'tldraw';
import { ConversationProvider } from './components/ConversationProvider';
import { useConversationContext } from './hooks/useConversationContext';
import { useSlideOrchestration } from './hooks/useSlideOrchestration';
import TLDrawCanvas from './components/TLDrawCanvas';
import './styles/App.css';

// Main App component with stable memoization
function App() {
  const [currentSlide, setCurrentSlide] = useState(1);
  const { slides, addNewSlide, deleteSlide } = useSlideOrchestration();
  
  // Memoize slides data to prevent render loops - using unique name
  const slidesArray = useMemo(() => slides, [slides]);
  
  return (
    <ConversationProvider>
      <AppContent 
        currentSlide={currentSlide}
        setCurrentSlide={setCurrentSlide}
        slidesArray={slidesArray}
        addSlide={addNewSlide}
        deleteSlide={deleteSlide}
      />
    </ConversationProvider>
  );
}

// Separated App content to use conversation context
function AppContent({ 
  currentSlide, 
  setCurrentSlide, 
  slidesArray, 
  addSlide,
  deleteSlide 
}: {
  currentSlide: number;
  setCurrentSlide: (slide: number) => void;
  slidesArray: any[];
  addSlide: (editor: Editor | null) => void;
  deleteSlide: (slideNumber: number, editor: Editor | null) => void;
}) {
  const { 
    dialogInput, 
    setDialogInput, 
    addMessage, 
    getMessagesForSlide 
  } = useConversationContext();
  
  // Stable reference to shape creation function from TLDrawCanvas
  const createShapeRef = useRef<((shapeType: string, options: any) => void) | null>(null);
  
  // Memoize current slide messages to prevent render loops
  const currentSlideMessages = useMemo(() => 
    getMessagesForSlide(currentSlide.toString()), 
    [getMessagesForSlide, currentSlide]
  );
  
  // Stable callback to receive shape creation function from TLDrawCanvas
  const handleCreateShapeCallback = useCallback((createShapeFn: (shapeType: string, options: any) => void) => {
    createShapeRef.current = createShapeFn;
    console.log('🎯 Shape creation function received from TLDrawCanvas');
  }, []);
  
  // Handle chat submission with AI shape creation logic
  const handleChatSubmit = useCallback(async () => {
    if (!dialogInput.trim()) return;
    
    console.log('📨 Processing chat input:', dialogInput);
    
    // Add user message
    addMessage(currentSlide.toString(), 'user', dialogInput);
    
    // Parse AI commands for shape creation
    const input = dialogInput.toLowerCase();
    let aiResponse = 'I understand you want to ';
    
    if (input.includes('rectangle') || input.includes('square')) {
      aiResponse += 'create a rectangle. Creating it now...';
      if (createShapeRef.current) {
        createShapeRef.current('rectangle', { 
          width: 120, 
          height: 80, 
          color: input.includes('blue') ? 'blue' : 'red' 
        });
        console.log('✅ Rectangle shape created via AI command');
      } else {
        console.warn('⚠️ Shape creation function not available');
      }
    } else if (input.includes('circle') || input.includes('ellipse')) {
      aiResponse += 'create a circle. Creating it now...';
      if (createShapeRef.current) {
        createShapeRef.current('ellipse', { 
          width: 100, 
          height: 100, 
          color: input.includes('blue') ? 'blue' : 'green' 
        });
        console.log('✅ Circle shape created via AI command');
      } else {
        console.warn('⚠️ Shape creation function not available');
      }
    } else if (input.includes('text')) {
      aiResponse += 'add text. Creating it now...';
      if (createShapeRef.current) {
        // Extract text content from command
        const textMatch = input.match(/text.*?(?:says?|with|:)\s*["']?([^"']+)["']?/i) ||
                         input.match(/["']([^"']+)["']/);
        const textContent = textMatch ? textMatch[1].trim() : 'Hello World';
        
        createShapeRef.current('text', { 
          text: textContent,
          color: 'black'
        });
        console.log('✅ Text shape created via AI command:', textContent);
      } else {
        console.warn('⚠️ Shape creation function not available');
      }
    } else {
      aiResponse += `help with "${dialogInput}". Try commands like "add a blue rectangle", "create a circle", or "add text that says hello".`;
    }
    
    // Add AI response
    addMessage(currentSlide.toString(), 'assistant', aiResponse);
    
    setDialogInput('');
  }, [dialogInput, currentSlide, addMessage, setDialogInput]);
  
  // Handle Enter key press in chat input
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  }, [handleChatSubmit]);
  
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎨 Hybrid Canvas</h1>
        <div className="slide-counter">
          Slide {currentSlide} of {slidesArray.length}
        </div>
      </header>
      
      <main className="app-main">
        <div className="canvas-section">
          <TLDrawCanvas 
            currentSlide={currentSlide}
            onCreateShape={handleCreateShapeCallback}
            className="tldraw-container"
          />
        </div>
        
        <div className="sidebar">
          <div className="chat-section">
            <h3>🤖 AI Assistant</h3>
            <div className="conversation-history">
              {currentSlideMessages.length === 0 ? (
                <div className="welcome-message">
                  👋 Hi! I can help you create shapes, text, and designs. Try saying:
                  <br />• "add a blue rectangle"
                  <br />• "create a circle" 
                  <br />• "add text that says hello"
                </div>
              ) : (
                currentSlideMessages.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.role}`}>
                    <span className="message-role">
                      {msg.role === 'user' ? '👤 You:' : '🤖 AI:'}
                    </span>
                    <span className="message-content">{msg.content}</span>
                  </div>
                ))
              )}
            </div>
            <div className="chat-input">
              <input
                type="text"
                value={dialogInput}
                onChange={(e) => setDialogInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe what you want to create..."
                className="chat-input-field"
              />
              <button 
                onClick={handleChatSubmit}
                className="chat-send-button"
                disabled={!dialogInput.trim()}
              >
                Send
              </button>
            </div>
          </div>
          
          <div className="slide-section">
            <h3>📄 Slides</h3>
            <div className="slide-thumbnails">
              {slidesArray.map((slide, index) => (
                <div 
                  key={slide.id || index}
                  className={`slide-thumbnail ${
                    currentSlide === index + 1 ? 'active' : ''
                  }`}
                  onClick={() => setCurrentSlide(index + 1)}
                >
                  <div className="slide-preview">
                    Slide {index + 1}
                  </div>
                  <div className="slide-title">
                    {slide.title || `Slide ${index + 1}`}
                  </div>
                </div>
              ))}
            </div>
            <div className="slide-controls">
              <button onClick={() => addSlide(null)} className="add-slide-button">
                + Add Slide
              </button>
              {slidesArray.length > 1 && (
                <button 
                  onClick={() => deleteSlide(currentSlide, null)}
                  className="delete-slide-button"
                >
                  Delete Slide
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
