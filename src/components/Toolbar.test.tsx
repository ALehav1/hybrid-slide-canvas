import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import { Toolbar } from './Toolbar';
import { useHistoryManager } from '@/lib/history/useHistoryManager';
import { useHistoryStore } from '@/lib/history/useHistoryStore';
import type { HistoryEntry } from '@/lib/types/history';
import type { HistoryManager } from '@/lib/history/HistoryManager';

// Mock the useHistoryManager hook from its canonical location
vi.mock('@/lib/history/useHistoryManager');

// Create a typed mock for the hook.
const mockedUseHistoryManager = vi.mocked(useHistoryManager);

// Capture the initial state of the store, including actions.
const initialStoreState = useHistoryStore.getState();

const mockUndo = vi.fn();
const mockRedo = vi.fn();

describe('Toolbar', () => {
  beforeEach(() => {
    // Reset mocks and the store's state before each test
    vi.clearAllMocks();
    // Reset the store to its pristine initial state.
    useHistoryStore.setState(initialStoreState, true);

    // Provide a mock implementation for the hook. We only need to mock the
    // methods used by the Toolbar component, but we cast to the full type.
    mockedUseHistoryManager.mockReturnValue({
      undo: mockUndo,
      redo: mockRedo,
    } as unknown as HistoryManager);
  });

  it('should render the undo and redo buttons', () => {
    render(<Toolbar />);
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument();
  });

  it('should have both buttons disabled initially when stacks are empty', () => {
    render(<Toolbar />);
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled();
  });

  it('should enable the undo button when an item is added to the undo stack', () => {
    render(<Toolbar />);
    const testEntry: HistoryEntry = { id: 'test1', origin: 'user', timestamp: Date.now() };

    act(() => {
      useHistoryStore.getState().addEntry(testEntry);
    });

    expect(screen.getByRole('button', { name: /undo/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled();
  });

  it('should enable the redo button after an undo action', () => {
    render(<Toolbar />);
    const testEntry: HistoryEntry = { id: 'test1', origin: 'user', timestamp: Date.now() };

    act(() => {
      useHistoryStore.getState().addEntry(testEntry);
    });

    // After adding, undo is enabled
    expect(screen.getByRole('button', { name: /undo/i })).toBeEnabled();

    act(() => {
      useHistoryStore.getState().undo(); // Defaults to 'all'
    });

    // After undoing, redo is enabled and undo is disabled
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /redo/i })).toBeEnabled();
  });

  it('should call history.undo() when the undo button is clicked', () => {
    render(<Toolbar />);
    const testEntry: HistoryEntry = { id: 'test1', origin: 'user', timestamp: Date.now() };

    act(() => {
      useHistoryStore.getState().addEntry(testEntry);
    });

    const undoButton = screen.getByRole('button', { name: /undo/i });
    expect(undoButton).toBeEnabled();
    fireEvent.click(undoButton);

    expect(mockUndo).toHaveBeenCalledTimes(1);
    expect(mockUndo).toHaveBeenCalledWith('user');
  });

  it('should call history.redo() when the redo button is clicked', () => {
    render(<Toolbar />);
    const testEntry: HistoryEntry = { id: 'test1', origin: 'user', timestamp: Date.now() };

    act(() => {
      useHistoryStore.getState().addEntry(testEntry);
      useHistoryStore.getState().undo(); // Defaults to 'all'
    });

    const redoButton = screen.getByRole('button', { name: /redo/i });
    expect(redoButton).toBeEnabled();
    fireEvent.click(redoButton);

    expect(mockRedo).toHaveBeenCalledTimes(1);
    expect(mockRedo).toHaveBeenCalledWith('user');
  });
});
