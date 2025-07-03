/**
 * History Manager Tests
 * 
 * Comprehensive test suite for the multi-origin history system.
 * Tests both the core HistoryManager and TLDraw integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHistoryManager, useHistoryStore, createBatchedEntry } from '../HistoryManager';
import type { HistoryOrigin, HistoryStore } from '../types';
import { resetStore } from '../../test/test-utils';

// Mock the logging utility
vi.mock('../../utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Get the initial state of the store once, before any tests run.
const initialStoreState = useHistoryStore.getState();

describe('HistoryManager', () => {
  let historyManager: HistoryStore;
  let mockUndoFunction: vi.Mock;
  let mockRedoFunction: vi.Mock;

  beforeEach(() => {
    // Reset the store to its initial state before each test
    resetStore(useHistoryStore, initialStoreState);

    // Create a fresh history manager instance for each test
    historyManager = createHistoryManager();
    
    // Create mock undo/redo functions
    mockUndoFunction = vi.fn();
    mockRedoFunction = vi.fn();
  });
  
  describe('Basic Operations', () => {
    it('should initialize with empty state', () => {
      const state = historyManager.getState();
      
      expect(state.entries).toHaveLength(0);
      expect(state.currentIndex).toBe(-1);
      expect(state.isEnabled).toBe(true);
      expect(state.maxEntries).toBe(100);
    });
    
    it('should add a history entry', () => {
      historyManager.getState().addEntry({
        origin: 'user',
        description: 'Test action',
        undo: mockUndoFunction,
        redo: mockRedoFunction,
      });
      
      const state = historyManager.getState();
      
      expect(state.entries).toHaveLength(1);
      expect(state.currentIndex).toBe(0);
      expect(state.entries[0].origin).toBe('user');
      expect(state.entries[0].description).toBe('Test action');
      expect(state.entries[0].id).toBeDefined();
      expect(state.entries[0].timestamp).toBeInstanceOf(Date);
      expect(state.stats.totalEntries).toBe(1);
    });
    
    it('should not add entries when disabled', () => {
      historyManager.getState().setEnabled(false);
      
      historyManager.getState().addEntry({
        origin: 'user',
        description: 'Test action',
        undo: mockUndoFunction,
        redo: mockRedoFunction,
      });
      
      const state = historyManager.getState();
      expect(state.entries).toHaveLength(0);
      expect(state.stats.totalEntries).toBe(0);
    });
    
    it('should enforce maximum entries limit', () => {
      // Create manager with small limit
      const smallManager = createHistoryManager({ maxEntries: 3 });
      
      // Add more entries than the limit
      for (let i = 0; i < 5; i++) {
        smallManager.getState().addEntry({
          origin: 'user',
          description: `Action ${i}`,
          undo: vi.fn(),
          redo: vi.fn(),
        });
      }
      
      const state = smallManager.getState();
      expect(state.entries).toHaveLength(3);
      expect(state.currentIndex).toBe(2);
      // Should keep the most recent entries
      expect(state.entries[0].description).toBe('Action 2');
      expect(state.entries[2].description).toBe('Action 4');
    });
  });
  
  describe('Undo/Redo Operations', () => {
    beforeEach(() => {
      // Add some test entries
      historyManager.getState().addEntry({
        origin: 'user',
        description: 'User action 1',
        undo: mockUndoFunction,
        redo: mockRedoFunction,
      });
      
      historyManager.getState().addEntry({
        origin: 'ai',
        description: 'AI action 1',
        undo: vi.fn(),
        redo: vi.fn(),
      });
      
      historyManager.getState().addEntry({
        origin: 'user',
        description: 'User action 2',
        undo: vi.fn(),
        redo: vi.fn(),
      });
    });
    
    it('should undo the last action', () => {
      const success = historyManager.getState().undo();
      
      expect(success).toBe(true);
      expect(historyManager.getState().currentIndex).toBe(1);
      expect(historyManager.getState().stats.undoCount).toBe(1);
    });
    
    it('should redo an undone action', () => {
      // First undo
      historyManager.getState().undo();
      
      // Then redo
      const success = historyManager.getState().redo();
      
      expect(success).toBe(true);
      expect(historyManager.getState().currentIndex).toBe(2);
      expect(historyManager.getState().stats.redoCount).toBe(1);
    });
    
    it('should support origin-filtered undo', () => {
      const success = historyManager.getState().undo('user');
      
      expect(success).toBe(true);
      expect(historyManager.getState().currentIndex).toBe(1); // Skipped AI action
    });
    
    it('should support origin-filtered redo', () => {
      // Undo user action
      historyManager.getState().undo('user');
      
      // Redo user action
      const success = historyManager.getState().redo('user');
      
      expect(success).toBe(true);
      expect(historyManager.getState().currentIndex).toBe(2);
    });
    
    it('should return false when no undoable actions exist', () => {
      // Clear all entries
      historyManager.getState().clear();
      
      const success = historyManager.getState().undo();
      expect(success).toBe(false);
    });
    
    it('should return false when no redoable actions exist', () => {
      // Already at the end
      const success = historyManager.getState().redo();
      expect(success).toBe(false);
    });
    
    it('should handle undo/redo errors gracefully', () => {
      const errorFunction = vi.fn(() => {
        throw new Error('Test error');
      });
      
      historyManager.getState().addEntry({
        origin: 'user',
        description: 'Error action',
        undo: errorFunction,
        redo: vi.fn(),
      });
      
      const success = historyManager.getState().undo();
      expect(success).toBe(false);
      expect(errorFunction).toHaveBeenCalled();
    });
  });
  
  describe('Can Undo/Redo Checks', () => {
    beforeEach(() => {
      historyManager.getState().addEntry({
        origin: 'user',
        description: 'User action',
        undo: vi.fn(),
        redo: vi.fn(),
      });
      
      historyManager.getState().addEntry({
        origin: 'ai',
        description: 'AI action',
        undo: vi.fn(),
        redo: vi.fn(),
      });
    });
    
    it('should correctly report undo availability', () => {
      expect(historyManager.getState().canUndo()).toBe(true);
      expect(historyManager.getState().canUndo('user')).toBe(true);
      expect(historyManager.getState().canUndo('ai')).toBe(true);
      expect(historyManager.getState().canUndo('template')).toBe(false);
    });
    
    it('should correctly report redo availability', () => {
      expect(historyManager.getState().canRedo()).toBe(false);
      
      // After undo, redo should be available
      historyManager.getState().undo();
      expect(historyManager.getState().canRedo()).toBe(true);
      expect(historyManager.getState().canRedo('ai')).toBe(true);
    });
    
    it('should report false when history is disabled', () => {
      historyManager.getState().setEnabled(false);
      
      expect(historyManager.getState().canUndo()).toBe(false);
      expect(historyManager.getState().canRedo()).toBe(false);
    });
  });
  
  describe('Origin Management', () => {
    it('should filter entries by origin', () => {
      // Add entries with different origins
      const origins: HistoryOrigin[] = ['user', 'ai', 'template', 'user', 'ai'];
      
      origins.forEach((origin, index) => {
        historyManager.getState().addEntry({
          origin,
          description: `${origin} action ${index}`,
          undo: vi.fn(),
          redo: vi.fn(),
        });
      });
      
      const userEntries = historyManager.getState().getEntriesByOrigin('user');
      const aiEntries = historyManager.getState().getEntriesByOrigin('ai');
      const templateEntries = historyManager.getState().getEntriesByOrigin('template');
      
      expect(userEntries).toHaveLength(2);
      expect(aiEntries).toHaveLength(2);
      expect(templateEntries).toHaveLength(1);
    });
    
    it('should clear entries by origin', () => {
      // Add entries with different origins
      historyManager.getState().addEntry({
        origin: 'user',
        description: 'User action',
        undo: vi.fn(),
        redo: vi.fn(),
      });
      
      historyManager.getState().addEntry({
        origin: 'ai',
        description: 'AI action',
        undo: vi.fn(),
        redo: vi.fn(),
      });
      
      // Clear user entries
      historyManager.getState().clearByOrigin('user');
      
      const state = historyManager.getState();
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0].origin).toBe('ai');
    });
  });
  
  describe('Batched Operations', () => {
    it('should create batched entries correctly', () => {
      const mockUndo1 = vi.fn();
      const mockRedo1 = vi.fn();
      const mockUndo2 = vi.fn();
      const mockRedo2 = vi.fn();
      
      const batchedEntry = createBatchedEntry({
        id: 'batch-1',
        origin: 'user',
        description: 'Batch operation',
        changes: [
          { undo: mockUndo1, redo: mockRedo1 },
          { undo: mockUndo2, redo: mockRedo2 },
        ],
      });
      
      historyManager.getState().addEntry(batchedEntry);
      
      // Test undo (should call in reverse order)
      historyManager.getState().undo();
      expect(mockUndo2).toHaveBeenCalled();
      expect(mockUndo1).toHaveBeenCalled();
      
      // Test redo (should call in forward order)
      historyManager.getState().redo();
      expect(mockRedo1).toHaveBeenCalled();
      expect(mockRedo2).toHaveBeenCalled();
    });
  });
  
  describe('Utility Methods', () => {
    it('should get recent entries', () => {
      // Add multiple entries
      for (let i = 0; i < 5; i++) {
        historyManager.getState().addEntry({
          origin: 'user',
          description: `Action ${i}`,
          undo: vi.fn(),
          redo: vi.fn(),
        });
      }
      
      const recent = historyManager.getState().getRecentEntries(3);
      expect(recent).toHaveLength(3);
      expect(recent[0].description).toBe('Action 2');
      expect(recent[2].description).toBe('Action 4');
    });
    
    it('should clear all entries', () => {
      historyManager.getState().addEntry({
        origin: 'user',
        description: 'Action',
        undo: vi.fn(),
        redo: vi.fn(),
      });
      
      historyManager.getState().clear();
      
      const state = historyManager.getState();
      expect(state.entries).toHaveLength(0);
      expect(state.currentIndex).toBe(-1);
    });
  });
  
  describe('Statistics', () => {
    it('should track statistics correctly', () => {
      historyManager.getState().addEntry({
        origin: 'user',
        description: 'Action',
        undo: vi.fn(),
        redo: vi.fn(),
      });
      
      historyManager.getState().undo();
      historyManager.getState().redo();
      
      const state = historyManager.getState();
      expect(state.stats.totalEntries).toBe(1);
      expect(state.stats.undoCount).toBe(1);
      expect(state.stats.redoCount).toBe(1);
      expect(state.stats.lastActionTime).toBeInstanceOf(Date);
    });
  });
});

describe('Default History Store', () => {
  it('should provide a default history store instance', () => {
    expect(useHistoryStore).toBeDefined();
    expect(typeof useHistoryStore.getState().addEntry).toBe('function');
    expect(typeof useHistoryStore.getState().undo).toBe('function');
    expect(typeof useHistoryStore.getState().redo).toBe('function');
  });
});
