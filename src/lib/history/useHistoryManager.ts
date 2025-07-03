import { EditorContext } from '@/lib/tldraw/EditorContext';
import { useContext, useEffect, useState } from 'react';
import { HistoryManager } from './HistoryManager';

/**
 * A hook that creates and manages a HistoryManager instance for the current editor.
 * It listens for editor mount and unmount events to properly initialize and clean up the manager.
 *
 * @returns The HistoryManager instance.
 */
export function useHistoryManager(): HistoryManager | null {
  const editor = useContext(EditorContext);
  const [historyManager, setHistoryManager] = useState<HistoryManager | null>(null);

  useEffect(() => {
    if (!editor) return;

    // The manager is instantiated with just the editor.
    const manager = new HistoryManager(editor);
    
    // Start listening to tldraw store changes.
    manager.startTracking();

    // Attach to editor for debugging convenience and set in state.
    // @ts-ignore
    editor.historyManager = manager;
    setHistoryManager(manager);

    // On cleanup, stop listening to changes.
    return () => {
      manager.stopTracking();
      // @ts-ignore
      delete editor.historyManager;
      setHistoryManager(null);
    };
  }, [editor]);

  return historyManager;
}
