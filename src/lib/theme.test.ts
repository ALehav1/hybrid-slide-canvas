import { vi, describe, test, expect, beforeEach } from 'vitest';
import { theme, applyTheme, resetTheme } from './theme';

// Mock the TLDraw imports
vi.mock('@tldraw/tldraw', () => {
  return {
    DefaultColorStyle: 'mockColorStyle',
    DefaultDashStyle: 'mockDashStyle',
    DefaultFillStyle: 'mockFillStyle',
    DefaultSizeStyle: 'mockSizeStyle',
  };
});

describe('theme', () => {
  test('exports theme object with correct properties', () => {
    expect(theme).toBeDefined();
    expect(theme).toHaveProperty('backgroundColor', '#ffffff');
    expect(theme).toHaveProperty('primary', '#1565c0');
    expect(theme).toHaveProperty('secondary', '#ffb300');
    expect(theme).toHaveProperty('strokeWidth', 2);
    expect(theme).toHaveProperty('roughness', 1.4);
  });

  describe('applyTheme', () => {
    let mockEditor: any;

    beforeEach(() => {
      // Create mock editor
      mockEditor = {
        setStyleForNextShapes: vi.fn(),
      };
    });

    test('applies correct styles to editor', () => {
      // Call the function with mock editor
      applyTheme(mockEditor);
      
      // Check that it sets the correct styles
      expect(mockEditor.setStyleForNextShapes).toHaveBeenCalledTimes(4);
      expect(mockEditor.setStyleForNextShapes).toHaveBeenNthCalledWith(1, 'mockColorStyle', 'blue');
      expect(mockEditor.setStyleForNextShapes).toHaveBeenNthCalledWith(2, 'mockFillStyle', 'none');
      expect(mockEditor.setStyleForNextShapes).toHaveBeenNthCalledWith(3, 'mockDashStyle', 'draw');
      expect(mockEditor.setStyleForNextShapes).toHaveBeenNthCalledWith(4, 'mockSizeStyle', 's');
    });
  });

  describe('resetTheme', () => {
    let mockEditor: any;

    beforeEach(() => {
      // Create mock editor
      mockEditor = {
        setStyleForNextShapes: vi.fn(),
      };
    });

    test('resets styles to default values', () => {
      // Call the function with mock editor
      resetTheme(mockEditor);
      
      // Check that it sets the correct default styles
      expect(mockEditor.setStyleForNextShapes).toHaveBeenCalledTimes(4);
      expect(mockEditor.setStyleForNextShapes).toHaveBeenNthCalledWith(1, 'mockColorStyle', 'black');
      expect(mockEditor.setStyleForNextShapes).toHaveBeenNthCalledWith(2, 'mockFillStyle', 'none');
      expect(mockEditor.setStyleForNextShapes).toHaveBeenNthCalledWith(3, 'mockDashStyle', 'draw');
      expect(mockEditor.setStyleForNextShapes).toHaveBeenNthCalledWith(4, 'mockSizeStyle', 's');
    });
  });
});
