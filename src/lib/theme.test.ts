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
  // Common mock editor for all tests
  let mockEditor: any;
  
  beforeEach(() => {
    // Create fresh mock editor before each test
    mockEditor = {
      setStyleForNextShapes: vi.fn(),
    };
  });
  
  test('exports theme object with correct properties', () => {
    expect(theme).toBeDefined();
    expect(theme).toHaveProperty('backgroundColor', '#ffffff');
    expect(theme).toHaveProperty('primary', '#1565c0');
    expect(theme).toHaveProperty('secondary', '#ffb300');
    expect(theme).toHaveProperty('strokeWidth', 2);
    expect(theme).toHaveProperty('roughness', 1.4);
  });

  describe('applyTheme', () => {
    test('applies correct styles to editor', () => {
      // Call the function with mock editor
      applyTheme();
      
      // Check that it sets the correct styles (anchored by arguments not call index)
      expect(mockEditor.setStyleForNextShapes).toHaveBeenCalledTimes(4);
      expect(mockEditor.setStyleForNextShapes).toHaveBeenCalledWith('mockColorStyle', 'blue');
      expect(mockEditor.setStyleForNextShapes).toHaveBeenCalledWith('mockFillStyle', 'none');
      expect(mockEditor.setStyleForNextShapes).toHaveBeenCalledWith('mockDashStyle', 'draw');
      expect(mockEditor.setStyleForNextShapes).toHaveBeenCalledWith('mockSizeStyle', 's');
    });
  });

  describe('resetTheme', () => {
    test('resets styles to default values', () => {
      // Call the function with mock editor
      resetTheme();
      
      // Check that it sets the correct default styles (anchored by arguments not call index)
      expect(mockEditor.setStyleForNextShapes).toHaveBeenCalledTimes(4);
      expect(mockEditor.setStyleForNextShapes).toHaveBeenCalledWith('mockColorStyle', 'black');
      expect(mockEditor.setStyleForNextShapes).toHaveBeenCalledWith('mockFillStyle', 'none');
      expect(mockEditor.setStyleForNextShapes).toHaveBeenCalledWith('mockDashStyle', 'draw');
      expect(mockEditor.setStyleForNextShapes).toHaveBeenCalledWith('mockSizeStyle', 's');
    });
  });
});
