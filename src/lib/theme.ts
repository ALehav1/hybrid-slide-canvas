import { Editor, DefaultColorStyle, DefaultDashStyle, DefaultFillStyle, DefaultSizeStyle } from '@tldraw/tldraw';

// Theme configuration object
export const theme = {
  backgroundColor: '#ffffff',
  primary: '#1565c0',
  secondary: '#ffb300', 
  strokeWidth: 2,
  roughness: 1.4
};

// Apply theme styles to editor (Moody's blue theme)
export function applyTheme(editor?: Editor) {
  if (!editor) return;
  
  // Set theme-specific styles for new shapes
  editor.setStyleForNextShapes(DefaultColorStyle, 'blue');
  editor.setStyleForNextShapes(DefaultFillStyle, 'none');
  editor.setStyleForNextShapes(DefaultDashStyle, 'draw');
  editor.setStyleForNextShapes(DefaultSizeStyle, 's');
}

// Reset theme to default values
export function resetTheme(editor?: Editor) {
  if (!editor) return;
  
  // Reset to default black theme
  editor.setStyleForNextShapes(DefaultColorStyle, 'black');
  editor.setStyleForNextShapes(DefaultFillStyle, 'none');
  editor.setStyleForNextShapes(DefaultDashStyle, 'draw');
  editor.setStyleForNextShapes(DefaultSizeStyle, 's');
}
