import { vi, describe, test, expect, beforeEach } from 'vitest';
import { basicLibrary, type LibraryItem } from './basic';

// Mock the tldrawHelpers module
vi.mock('../tldrawHelpers', () => ({
  createSketchShape: vi.fn(),
}));

// Import after mocking
import { createSketchShape } from '../tldrawHelpers';

describe('basicLibrary', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('exports the correct library structure', () => {
    // Check that basicLibrary is an array
    expect(Array.isArray(basicLibrary)).toBe(true);
    expect(basicLibrary.length).toBe(2);

    // Check the first library item (Rectangle Node)
    expect(basicLibrary[0]).toHaveProperty('id', 'lib-rect-node');
    expect(basicLibrary[0]).toHaveProperty('name', 'Rectangle Node');
    expect(basicLibrary[0]).toHaveProperty('preview', '/lib/rect-node.png');
    expect(basicLibrary[0]).toHaveProperty('factory');
    expect(typeof basicLibrary[0].factory).toBe('function');

    // Check the second library item (Decision Diamond)
    expect(basicLibrary[1]).toHaveProperty('id', 'lib-decision');
    expect(basicLibrary[1]).toHaveProperty('name', 'Decision (Diamond)');
    expect(basicLibrary[1]).toHaveProperty('preview', '/lib/diamond-node.png');
    expect(basicLibrary[1]).toHaveProperty('factory');
    expect(typeof basicLibrary[1].factory).toBe('function');
  });

  test('Rectangle Node factory calls createSketchShape with correct parameters', async () => {
    // Create a mock editor
    const mockEditor = { id: 'mock-editor' };
    
    // Call the factory function
    await basicLibrary[0].factory(mockEditor as any);
    
    // Verify that createSketchShape was called with correct parameters
    expect(createSketchShape).toHaveBeenCalledTimes(1);
    expect(createSketchShape).toHaveBeenCalledWith(
      mockEditor,
      'rectangle',
      {
        label: 'Node',
        fill: 'blue',
      }
    );
  });

  test('Decision Diamond factory calls createSketchShape with correct parameters', async () => {
    // Create a mock editor
    const mockEditor = { id: 'mock-editor' };
    
    // Call the factory function
    await basicLibrary[1].factory(mockEditor as any);
    
    // Verify that createSketchShape was called with correct parameters
    expect(createSketchShape).toHaveBeenCalledTimes(1);
    expect(createSketchShape).toHaveBeenCalledWith(
      mockEditor,
      'diamond',
      {
        label: 'Decision',
        fill: 'green',
      }
    );
  });

  test('Rectangle Node factory does nothing when editor is undefined', async () => {
    // Call the factory function with undefined editor
    await basicLibrary[0].factory(undefined);
    
    // Verify that createSketchShape was not called
    expect(createSketchShape).not.toHaveBeenCalled();
  });

  test('Decision Diamond factory does nothing when editor is undefined', async () => {
    // Call the factory function with undefined editor
    await basicLibrary[1].factory(undefined);
    
    // Verify that createSketchShape was not called
    expect(createSketchShape).not.toHaveBeenCalled();
  });
});
