import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanvasRenderer } from '@/lib/canvas/CanvasRenderer';
import type { Editor } from '@tldraw/tldraw';
import type { PositionedDiagram } from '@/lib/services/LayoutService';
import { AIService, type Diagram } from '@/lib/services/AIService';

// Mock the AIService to control its behavior in tests
vi.mock('@/lib/services/AIService');

describe('CanvasRenderer', () => {
  // Create a mock tldraw editor
  const mockEditor = {
    run: vi.fn((cb) => cb()), // Mock `run` to execute the callback immediately
    createShapes: vi.fn(),
  } as unknown as Editor;

  // Reset mocks before each test to ensure isolation
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create nodes and edges correctly when drawing a positioned diagram', () => {
    const positionedDiagram: PositionedDiagram = {
      nodes: [
        { id: 'n1', label: 'Start', type: 'rect', x: 10, y: 20, width: 100, height: 50 },
        { id: 'n2', label: 'End', type: 'rect', x: 10, y: 200, width: 100, height: 50 },
      ],
      edges: [{ from: 'n1', to: 'n2' }],
    };

    const renderer = new CanvasRenderer(mockEditor);
    renderer.draw(positionedDiagram);

    // Verify that the operation is wrapped in a single transaction
    expect(mockEditor.run).toHaveBeenCalledOnce();

    // Verify that createShapes is called for each node and each edge
    expect(mockEditor.createShapes).toHaveBeenCalledTimes(3);

    // Check the contents of the shape creation calls
    // First call should create 'Start' geo shape with all required properties
    expect(mockEditor.createShapes).toHaveBeenNthCalledWith(1, expect.arrayContaining([
      expect.objectContaining({
        type: 'geo',
        x: 10,
        y: 20,
        props: expect.objectContaining({
          text: 'Start',
          geo: 'rect',
          w: 100,
          h: 50,
          align: 'middle',
          font: 'draw',
          size: 'm'
        })
      })
    ]));
    
    // Second call should create 'End' geo shape with all required properties
    expect(mockEditor.createShapes).toHaveBeenNthCalledWith(2, expect.arrayContaining([
      expect.objectContaining({
        type: 'geo',
        x: 10,
        y: 200,
        props: expect.objectContaining({
          text: 'End',
          geo: 'rect',
          w: 100,
          h: 50,
          align: 'middle',
          font: 'draw',
          size: 'm'
        })
      })
    ]));
    
    // Third call should create arrow with binding properties
    expect(mockEditor.createShapes).toHaveBeenNthCalledWith(3, expect.arrayContaining([
      expect.objectContaining({
        type: 'arrow',
        props: expect.objectContaining({
          arrowheadStart: 'none',
          arrowheadEnd: 'arrow',
          start: expect.objectContaining({
            type: 'binding',
            isExact: false,
            boundShapeId: expect.any(String)
          }),
          end: expect.objectContaining({
            type: 'binding',
            isExact: false,
            boundShapeId: expect.any(String)
          })
        })
      })
    ]));
  });

  it('should orchestrate the full diagram rendering flow from prompt to canvas', async () => {
    const mockRawDiagram: Diagram = {
      nodes: [{ id: 'a', label: 'Test Node', type: 'rect' }],
      edges: [],
    };

    // Set up the mock AIService to return the raw diagram
    const mockAiServiceInstance = new AIService();
    vi.mocked(mockAiServiceInstance.createDiagram).mockResolvedValue(mockRawDiagram);

    const renderer = new CanvasRenderer(mockEditor);
    const drawSpy = vi.spyOn(renderer, 'draw');

    await renderer.renderDiagram('test prompt', mockAiServiceInstance);

    // Verify that the AIService was called with the correct prompt
    expect(mockAiServiceInstance.createDiagram).toHaveBeenCalledWith('test prompt');

    // Verify that the draw method was called with a positioned diagram
    expect(drawSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({
            id: 'a',
            label: 'Test Node',
            x: expect.any(Number), // LayoutService should have added coordinates
            y: expect.any(Number),
          }),
        ]),
      })
    );
  });
});
