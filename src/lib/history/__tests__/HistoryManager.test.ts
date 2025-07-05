/**
 * HistoryManager Test Suite
 * 
 * Comprehensive tests for the multi-origin history system.
 * Tests both the core HistoryManager and TLDraw integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryManager, createHistoryManager, type HistoryStore, type HistoryEntry, type OriginType } from '../HistoryManager';

// Mock the logging utility
vi.mock('../../utils/logging', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Create a mock store that implements all required HistoryStore methods
function createMockStore(): HistoryStore {
  const entries: HistoryEntry[] = [];
  let currentIndex = -1;
  let isUndoing = false;
  let isRedoing = false;
  let isEnabled = true;
  const maxEntries = 100;
  const stats = {
    totalEntries: 0,
    undoCount: 0,
    redoCount: 0,
    lastActionTime: null as Date | null,
  };

  const mockStore: HistoryStore = {
    get entries() { return entries; },
    set entries(value) { entries.splice(0, entries.length, ...value); },
    get currentIndex() { return currentIndex; },
    set currentIndex(value) { currentIndex = value; },
    get isUndoing() { return isUndoing; },
    set isUndoing(value) { isUndoing = value; },
    get isRedoing() { return isRedoing; },
    set isRedoing(value) { isRedoing = value; },
    get isEnabled() { return isEnabled; },
    set isEnabled(value) { isEnabled = value; },
    get maxEntries() { return maxEntries; },
    get stats() { return stats; },
    set stats(value) { Object.assign(stats, value); },

    addEntry: vi.fn((entry) => {
      const fullEntry: HistoryEntry = {
        id: `entry-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        ...entry,
      };
      entries.push(fullEntry);
      currentIndex = entries.length - 1;
      stats.totalEntries++;
      stats.lastActionTime = new Date();
    }),
    undo: vi.fn(() => {
      if (currentIndex >= 0) {
        currentIndex--;
        stats.undoCount++;
        return true;
      }
      return false;
    }),
    redo: vi.fn(() => {
      if (currentIndex < entries.length - 1) {
        currentIndex++;
        stats.redoCount++;
        return true;
      }
      return false;
    }),
    clear: vi.fn(() => {
      entries.splice(0, entries.length);
      currentIndex = -1;
      stats.totalEntries = 0;
    }),
    getEntriesByOrigin: vi.fn((origin) => {
      return entries.filter(entry => entry.origin === origin);
    }),
    canUndo: vi.fn(() => {
      return entries.length > 0 && currentIndex >= 0;
    }),
    canRedo: vi.fn(() => {
      return currentIndex < entries.length - 1;
    }),
    clearByOrigin: vi.fn((origin) => {
      const filteredEntries = entries.filter(entry => entry.origin !== origin);
      entries.splice(0, entries.length, ...filteredEntries);
      currentIndex = Math.min(currentIndex, filteredEntries.length - 1);
    }),
    setOrigin: vi.fn(),
    setEnabled: vi.fn((enabled) => {
      isEnabled = enabled;
    }),
    getRecentEntries: vi.fn((count) => {
      return entries.slice(-count);
    }),
  };
  
  return mockStore;
}

describe('HistoryManager', () => {
  let historyManager: HistoryManager;
  let mockStore: HistoryStore;

  beforeEach(() => {
    mockStore = createMockStore();
    historyManager = createHistoryManager(mockStore);
  });

  describe('Basic Operations', () => {
    it('should create a history manager with initial state', () => {
      expect(historyManager).toBeDefined();
      const state = historyManager.getState();
      expect(state.entries).toEqual([]);
      expect(state.currentIndex).toBe(-1);
      expect(state.isEnabled).toBe(true);
    });

    it('should delegate canUndo to store', () => {
      const result = historyManager.canUndo();
      expect(mockStore.canUndo).toHaveBeenCalled();
      expect(typeof result).toBe('boolean');
    });

    it('should delegate canRedo to store', () => {
      const result = historyManager.canRedo();
      expect(mockStore.canRedo).toHaveBeenCalled();
      expect(typeof result).toBe('boolean');
    });

    it('should delegate clear to store', () => {
      historyManager.clear();
      expect(mockStore.clear).toHaveBeenCalled();
    });

    it('should delegate getEntriesByOrigin to store', () => {
      const result = historyManager.getEntriesByOrigin('user');
      expect(mockStore.getEntriesByOrigin).toHaveBeenCalledWith('user');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Undo/Redo Operations', () => {
    beforeEach(() => {
      // Add some test entries
      mockStore.addEntry({
        origin: 'user' as OriginType,
        description: 'User action 1',
        markId: 'test-mark-1',
        undone: false,
      });
      
      mockStore.addEntry({
        origin: 'ai' as OriginType,
        description: 'AI action',
        markId: 'test-mark-2',
        undone: false,
      });
    });
    
    it('should perform undo operation', () => {
      const success = historyManager.undo();
      expect(success).toBe(true);
    });
    
    it('should perform redo operation', () => {
      // First undo
      historyManager.undo();
      
      // Then redo
      const success = historyManager.redo();
      expect(success).toBe(true);
    });
  });

  describe('Origin Management', () => {
    it('should filter entries by origin', () => {
      // Add entries with different origins
      const userEntry: HistoryEntry = {
        id: 'test-id-1',
        origin: 'user' as OriginType,
        description: 'User action',
        markId: 'test-mark-8',
        timestamp: Date.now(),
        undone: false,
      };
      
      const aiEntry: HistoryEntry = {
        id: 'test-id-2',
        origin: 'ai' as OriginType,
        description: 'AI action',
        markId: 'test-mark-9',
        timestamp: Date.now(),
        undone: false,
      };
      
      mockStore.addEntry(userEntry);
      mockStore.addEntry(aiEntry);
      
      const userEntries = historyManager.getEntriesByOrigin('user');
      const aiEntries = historyManager.getEntriesByOrigin('ai');
      const templateEntries = historyManager.getEntriesByOrigin('template');
      
      expect(userEntries).toHaveLength(1);
      expect(aiEntries).toHaveLength(1);
      expect(templateEntries).toHaveLength(0);
    });
    
    it('should clear entries by origin', () => {
      // Add entries with different origins
      mockStore.addEntry({
        origin: 'user' as OriginType,
        description: 'User action',
        markId: 'test-mark-10',
        undone: false,
      });
      
      mockStore.addEntry({
        origin: 'ai' as OriginType,
        description: 'AI action',
        markId: 'test-mark-11',
        undone: false,
      });
      
      // Clear user entries
      historyManager.clearByOrigin('user');
      expect(mockStore.clearByOrigin).toHaveBeenCalledWith('user');
    });
  });

  describe('State Management', () => {
    it('should delegate setEnabled to store', () => {
      historyManager.setEnabled(false);
      expect(mockStore.setEnabled).toHaveBeenCalledWith(false);
    });

    it('should delegate getRecentEntries to store', () => {
      const result = historyManager.getRecentEntries(5);
      expect(mockStore.getRecentEntries).toHaveBeenCalledWith(5);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return current state', () => {
      const state = historyManager.getState();
      expect(state).toHaveProperty('entries');
      expect(state).toHaveProperty('currentIndex');
      expect(state).toHaveProperty('isUndoing');
      expect(state).toHaveProperty('isRedoing');
      expect(state).toHaveProperty('isEnabled');
      expect(state).toHaveProperty('maxEntries');
      expect(state).toHaveProperty('stats');
    });
  });

  describe('Factory Function', () => {
    it('should create a HistoryManager instance', () => {
      const manager = createHistoryManager(mockStore);
      expect(manager).toBeInstanceOf(HistoryManager);
    });
  });

  describe('Editor Integration', () => {
    it('should handle setEditor without throwing', () => {
      const mockEditor = {
        store: {
          listen: vi.fn(() => vi.fn()),
        },
        markHistoryStoppingPoint: vi.fn(() => 'test-mark'),
        bailToMark: vi.fn(),
      } as any;

      expect(() => {
        historyManager.setEditor(mockEditor);
      }).not.toThrow();
    });
  });
});
