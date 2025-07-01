import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { type Editor, type TLShapeId, type TLShape, Box } from '@tldraw/tldraw';
import { createSketchShape } from './tldrawHelpers';
import * as clientId from './utils/clientId';

// Mock the clientId.createUniqueShapeId function to return predictable IDs
vi.mock('./utils/clientId', () => {
  return {
    // Cast the string to TLShapeId to satisfy TLDraw's type system
    createUniqueShapeId: vi.fn().mockReturnValue('test-id' as TLShapeId),
    getClientInstanceId: vi.fn().mockReturnValue('test-client-id')
  };
});

// Mock the console.warn to avoid polluting test output with deprecation warnings
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

// Restore console spy after all tests complete
afterAll(() => {
  consoleWarnSpy.mockRestore();
});

// Clean up after each test to ensure isolation
afterEach(() => {
  vi.restoreAllMocks();
});



describe('createSketchShape', () => {
  // We use a partial mock but cast to Editor for compatibility with the function signature
  let mockEditor: Editor;

  // Helper to create a mock editor instance for testing
  const createTestMockEditor = (): Editor => {
    // We're only implementing the methods needed for testing, not the entire Editor interface
    // This is a common pattern for focused unit tests
    // We implement only the specific methods needed for our tests
    // TLDraw's Editor type has many complex methods, so we use a targeted mock
    // that satisfies just the interfaces needed by createSketchShape
    const editorMock: Partial<Editor> = {
      getViewportPageBounds: vi.fn(() => { 
        // Create a proper Box object with all required properties
        const box = new Box(0, 0, 1000, 1000);
        // Add center property which Box doesn't have natively but our code uses
        Object.defineProperty(box, 'center', {
          get: () => ({ x: 500, y: 500 }),
          enumerable: true
        });
        return box;
      }),
      
      // Implement core editor methods with proper typing
      createShapes: vi.fn().mockReturnThis(),
      groupShapes: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      // Mock the getShape method to return a partial shape that satisfies our test needs
      getShape: vi.fn().mockImplementation((id) => {
        // Return a minimal shape implementation that satisfies the TLShape interface
        return {
          id: id as TLShapeId,
          type: 'geo',
          parentId: 'new-group-id' as TLShapeId,
          x: 0,
          y: 0,
          rotation: 0,
          isLocked: false,
          opacity: 1,
          props: {},
        } as TLShape;
      }),
      
      
    };
    
    // Handle circular reference - batch returns the editor itself
    editorMock.batch = vi.fn((cb) => {
      cb();
      return editorMock as unknown as Editor;
    });
    
    // Make the mock functions return the editor for chaining
    editorMock.createShapes = vi.fn().mockReturnValue(editorMock);
    editorMock.groupShapes = vi.fn().mockReturnValue(editorMock);
    editorMock.select = vi.fn().mockReturnValue(editorMock);
    
    return editorMock as unknown as Editor;
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockEditor = createTestMockEditor();
    vi.clearAllMocks();
    vi.mocked(clientId.createUniqueShapeId).mockReturnValue('test-id' as TLShapeId);
  });

  it('should do nothing if editor is not provided', () => {
    // The function has a guard clause `if (!editor) return;`
    // This test ensures it doesn't throw when the editor is null.
    // Passing null should trigger the guard clause without errors
    expect(() => createSketchShape(null as unknown as Editor, 'rectangle')).not.toThrow();
  });

  it('should create a basic rectangle shape at the viewport center', () => {
    createSketchShape(mockEditor, 'rectangle');

    expect(mockEditor.createShapes).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'test-id',
        type: 'geo',
        x: 440, // 500 - 120/2
        y: 460, // 500 - 80/2
        props: expect.objectContaining({ geo: 'rectangle' }),
      }),
    ]);
    expect(mockEditor.select).toHaveBeenCalledWith('test-id');
  });

  it('should create a shape with a text label and group them', () => {
    vi.mocked(clientId.createUniqueShapeId)
      .mockClear()
      .mockImplementationOnce(() => 'shape-id' as TLShapeId)
      .mockImplementationOnce(() => 'text-id' as TLShapeId)
      .mockImplementationOnce(() => 'new-group-id' as TLShapeId);

    createSketchShape(mockEditor, 'diamond', { label: 'My Diamond' });

    // Check that the shape and text were created
    expect(mockEditor.createShapes).toHaveBeenCalledTimes(2);
    expect(mockEditor.createShapes).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'shape-id', props: expect.objectContaining({ geo: 'diamond' }) }),
    ]);
    expect(mockEditor.createShapes).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'text-id', props: expect.objectContaining({ text: 'My Diamond' }) }),
    ]);

    // Check that the shapes were grouped and the group was selected
    expect(mockEditor.groupShapes).toHaveBeenCalledWith(
      expect.arrayContaining(['shape-id', 'text-id'] as TLShapeId[]), {
      groupId: 'new-group-id',
    });
    expect(mockEditor.select).toHaveBeenCalledWith('new-group-id');
  });

  it('should apply custom width, height, and fill options', () => {
    createSketchShape(mockEditor, 'ellipse', { w: 200, h: 100, fill: 'red' });

    expect(mockEditor.createShapes).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          x: 400, // 500 - 200/2
          y: 450, // 500 - 100/2
          props: expect.objectContaining({
            geo: 'ellipse',
            w: 200,
            h: 100,
            fill: 'red',
          }),
        }),
      ])
    );
  });
});
