import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { type Editor, createShapeId } from '@tldraw/tldraw';
import { createSketchShape } from './tldrawHelpers';

// Mock the createShapeId function from tldraw to return predictable IDs
vi.mock('@tldraw/tldraw', async () => {
  const actual = await vi.importActual<typeof import('@tldraw/tldraw')>('@tldraw/tldraw');
  return {
    ...actual,
    createShapeId: vi.fn(),
  };
});

// Helper to create a mock editor instance for testing
const createMockEditor = (): Editor => {
  return {
    getViewportPageBounds: vi.fn(() => ({ center: { x: 500, y: 500 } })),
    batch: vi.fn((cb) => cb()), // Immediately execute the batch callback
    createShapes: vi.fn(),
    groupShapes: vi.fn(),
    select: vi.fn(),
    getShape: vi.fn((id) => ({
      id,
      parentId: 'new-group-id',
    })),
  } as unknown as Editor;
};

describe('createSketchShape', () => {
  let mockEditor: Editor;

  beforeEach(() => {
    // Reset mocks before each test
    mockEditor = createMockEditor();
    (createShapeId as Mock).mockClear().mockReturnValue('test-id');
  });

  it('should do nothing if editor is not provided', () => {
    // The function has a guard clause `if (!editor) return;`
    // This test ensures it doesn't throw when the editor is null.
    expect(() => createSketchShape(null as any, 'rectangle')).not.toThrow();
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
    (createShapeId as Mock)
      .mockClear()
      .mockImplementationOnce(() => 'shape-id')
      .mockImplementationOnce(() => 'text-id')
      .mockImplementationOnce(() => 'new-group-id');

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
    expect(mockEditor.groupShapes).toHaveBeenCalledWith(['shape-id', 'text-id'], {
      groupId: 'new-group-id',
    });
    expect(mockEditor.select).toHaveBeenCalledWith('new-group-id');
  });

  it('should apply custom width, height, and fill options', () => {
    createSketchShape(mockEditor, 'ellipse', { w: 200, h: 100, fill: 'red' });

    expect(mockEditor.createShapes).toHaveBeenCalledWith([
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
    ]);
  });
});
