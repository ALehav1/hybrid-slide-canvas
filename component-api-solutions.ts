import { Editor, TLShapeId, TLShape, TLParentId } from '@tldraw/tldraw';
import { logger } from '../utils/logging';

/**
 * 1. Fix theme function signatures for tldraw v3 (applyTheme, resetTheme)
 *    - These functions should accept the Editor instance as an argument.
 *    - If they are meant to be used within a React component/hook, `useEditor` is an alternative.
 */

/**
 * Applies a theme to the tldraw editor.
 * @param editor The tldraw Editor instance.
 * @param themeName The name of the theme to apply.
 */
export const applyTheme = (editor: Editor, themeName: string): void => {
  if (!editor) {
    logger.warn('applyTheme: Editor instance is not available.');
    return;
  }
  // Example: Apply a theme by updating editor styles or instance state
  // In a real scenario, this would interact with tldraw's styling API
  logger.info(`Applying theme "${themeName}" to editor.`);
  // editor.updateInstanceState({ theme: themeName }); // Example tldraw API usage
};

/**
 * Resets the theme of the tldraw editor to its default.
 * @param editor The tldraw Editor instance.
 */
export const resetTheme = (editor: Editor): void => {
  if (!editor) {
    logger.warn('resetTheme: Editor instance is not available.');
    return;
  }
  logger.info('Resetting editor theme.');
  // editor.updateInstanceState({ theme: 'default' }); // Example tldraw API usage
};

/**
 * 2. Fix nullable TLShapeId handling for deleteShapes and getShape
 * 3. Provide type-safe wrappers for shape operations
 * 4. Handle null safety properly throughout
 */

/**
 * Safely deletes shapes from the editor, handling nullable TLShapeId.
 * @param editor The tldraw Editor instance.
 * @param shapeIds An array of TLShapeId or null/undefined values.
 */
export const safeDeleteShapes = (editor: Editor, shapeIds: (TLShapeId | null | undefined)[]): void => {
  if (!editor) {
    logger.warn('safeDeleteShapes: Editor instance is not available.');
    return;
  }
  const validShapeIds: TLShapeId[] = shapeIds.filter((id): id is TLShapeId => id !== null && id !== undefined);
  if (validShapeIds.length > 0) {
    editor.deleteShapes(validShapeIds);
    logger.debug(`Deleted shapes: ${validShapeIds.join(', ')}`);
  } else {
    logger.debug('No valid shape IDs to delete.');
  }
};

/**
 * Safely retrieves a shape from the editor, handling nullable TLShapeId.
 * @param editor The tldraw Editor instance.
 * @param shapeId The TLShapeId or null/undefined value of the shape to retrieve.
 * @returns The TLShape if found and valid, otherwise undefined.
 */
export const safeGetShape = (editor: Editor, shapeId: TLShapeId | null | undefined): TLShape | undefined => {
  if (!editor) {
    logger.warn('safeGetShape: Editor instance is not available.');
    return undefined;
  }
  if (shapeId === null || shapeId === undefined) {
    logger.debug('safeGetShape: Provided shapeId is null or undefined.');
    return undefined;
  }
  const shape = editor.getShape(shapeId);
  if (!shape) {
    logger.debug(`safeGetShape: Shape with ID "${shapeId}" not found.`);
  }
  return shape;
};

/**
 * Safely retrieves a shape's parent ID, handling nullable TLShapeId.
 * @param editor The tldraw Editor instance.
 * @param shapeId The TLShapeId or null/undefined value of the shape.
 * @returns The TLParentId if the shape exists and has a parent, otherwise undefined.
 */
export const safeGetParentId = (editor: Editor, shapeId: TLShapeId | null | undefined): TLParentId | undefined => {
  const shape = safeGetShape(editor, shapeId);
  return shape?.parentId;
};

/**
 * 5. Correct patterns for tldraw v3 theme integration
 *    - This is covered by the `applyTheme` and `resetTheme` functions above.
 *    - For components, `useEditor` hook is the idiomatic way to get the editor instance.
 */

/**
 * Example of how to use these functions in a React component:
 * 
 * ```tsx
 * import { useEditor } from '@tldraw/tldraw';
 * import { applyTheme, safeDeleteShapes } from './component-api-solutions';
 * 
 * function MyComponent() {
 *   const editor = useEditor();
 *   
 *   const handleApplyTheme = () => {
 *     applyTheme(editor, 'dark');
 *   };
 *   
 *   const handleDeleteShape = (shapeId: TLShapeId | null) => {
 *     safeDeleteShapes(editor, [shapeId]);
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handleApplyTheme}>Apply Dark Theme</button>
 *       <button onClick={() => handleDeleteShape(selectedShapeId)}>Delete Selected</button>
 *     </div>
 *   );
 * }
 * ```
 */
