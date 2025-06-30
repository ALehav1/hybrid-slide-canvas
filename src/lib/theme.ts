import {
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultFillStyle,
  DefaultSizeStyle,
  Editor,
} from "@tldraw/tldraw";

export const theme = {
  backgroundColor: "#ffffff",
  primary: "#1565c0", // Moody's blue-ish
  secondary: "#ffb300",
  strokeWidth: 2,
  roughness: 1.4,
};

/**
 * Apply a theme to the editor for the next shapes to be created.
 * @param editor The tldraw editor instance.
 */
export function applyTheme(editor: Editor) {
  // Set the styles for the next shapes to be created
  editor.setStyleForNextShapes(DefaultColorStyle, 'blue');
  editor.setStyleForNextShapes(DefaultFillStyle, 'none');
  editor.setStyleForNextShapes(DefaultDashStyle, 'draw');
  editor.setStyleForNextShapes(DefaultSizeStyle, 's');
}

/**
 * Reset the theme to the default values.
 * @param editor The tldraw editor instance.
 */
export function resetTheme(editor: Editor) {
  // Reset the styles for the next shapes to their default values
  editor.setStyleForNextShapes(DefaultColorStyle, 'black');
  editor.setStyleForNextShapes(DefaultFillStyle, 'none');
  editor.setStyleForNextShapes(DefaultDashStyle, 'draw');
  editor.setStyleForNextShapes(DefaultSizeStyle, 's');
}
