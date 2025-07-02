import { vi, describe, test, expect, beforeEach, afterEach, type Mock } from 'vitest';
import type { LibraryItem } from './types';

// These will be dynamically imported inside the tests after mocks are in place.
let basicLibrary: LibraryItem[];
let createSketchShape: Mock;

describe('basicLibrary', () => {
  beforeEach(async () => {
    // 1. Set up the mock for the module using vi.doMock.
    // This is more explicit than a top-level vi.mock call.
    vi.doMock('../tldrawHelpers', () => ({
      createSketchShape: vi.fn(),
    }));

    // 2. Dynamically import the modules AFTER the mock is established.
    // This ensures they receive the mocked version of tldrawHelpers.
    const helpers = await import('../tldrawHelpers');
    createSketchShape = helpers.createSketchShape as Mock;

    const basic = await import('./basic');
    basicLibrary = basic.basicLibrary;
  });

  afterEach(() => {
    // 3. Clean up the mock to ensure test isolation.
    vi.doUnmock('../tldrawHelpers');
  });

  test('exports the correct library structure', () => {
    expect(Array.isArray(basicLibrary)).toBe(true);
    expect(basicLibrary.length).toBe(2);

    // Check the first library item (Rectangle Node)
    expect(basicLibrary[0]).toHaveProperty('id', 'lib-rect-node');
    expect(basicLibrary[0]).toHaveProperty('name', 'Rectangle Node');
    expect(basicLibrary[0]).toHaveProperty('preview', '/lib/rect-node.png');
    expect(typeof basicLibrary[0].factory).toBe('function');

    // Check the second library item (Decision Diamond)
    expect(basicLibrary[1]).toHaveProperty('id', 'lib-decision');
    expect(basicLibrary[1]).toHaveProperty('name', 'Decision (Diamond)');
    expect(basicLibrary[1]).toHaveProperty('preview', '/lib/diamond-node.png');
    expect(typeof basicLibrary[1].factory).toBe('function');
  });

  test('Rectangle Node factory calls createSketchShape with correct parameters', async () => {
    const mockEditor = { id: 'mock-editor' };
    await basicLibrary[0].factory(mockEditor as any);

    expect(createSketchShape).toHaveBeenCalledTimes(1);
    expect(createSketchShape).toHaveBeenCalledWith(mockEditor, 'rectangle', {
      label: 'Node',
      fill: 'blue',
    });
  });

  test('Decision Diamond factory calls createSketchShape with correct parameters', async () => {
    const mockEditor = { id: 'mock-editor' };
    await basicLibrary[1].factory(mockEditor as any);

    expect(createSketchShape).toHaveBeenCalledTimes(1);
    expect(createSketchShape).toHaveBeenCalledWith(mockEditor, 'diamond', {
      label: 'Decision',
      fill: 'green',
    });
  });

  test('Rectangle Node factory does nothing when editor is undefined', async () => {
    await basicLibrary[0].factory(undefined);
    expect(createSketchShape).not.toHaveBeenCalled();
  });

  test('Decision Diamond factory does nothing when editor is undefined', async () => {
    await basicLibrary[1].factory(undefined);
    expect(createSketchShape).not.toHaveBeenCalled();
  });
});
