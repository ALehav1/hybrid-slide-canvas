/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Toolbar } from '@/components/Toolbar'
import { useHistoryStore } from '@/lib/history/useHistoryStore'
import { mockEditor } from '@/__tests__/test-utils/mocks/tldraw'

/* ──────────────────────────────────────────────────────────────
   1 ▸  Mock the tldraw useEditor hook to return our mock editor
       (preserve all other exports using importOriginal)
   ──────────────────────────────────────────────────────────── */
vi.mock('@tldraw/tldraw', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tldraw/tldraw')>()
  return {
    ...actual,
    useEditor: () => mockEditor,
  }
})

/* ──────────────────────────────────────────────────────────────
   2 ▸  Mock only the *manager* hook – we don't care about
        its internals for these UI-level tests
   ──────────────────────────────────────────────────────────── */
const mockManager = {
  undo: vi.fn(),
  redo: vi.fn(),
}
vi.mock('@/lib/history/useHistoryManager', () => ({
  useHistoryManager: () => mockManager,
}))

/* ──────────────────────────────────────────────────────────────
   3 ▸  Baseline state reused by every test
   ──────────────────────────────────────────────────────────── */
const blankStacks = {
  user:     { undo: [], redo: [] },
  ai:       { undo: [], redo: [] },
  template: { undo: [], redo: [] },
  all:      { undo: [], redo: [] },
}

/* ──────────────────────────────────────────────────────────────
   4 ▸  Tests
   ──────────────────────────────────────────────────────────── */
describe('Toolbar (undo / redo)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // hard-reset the real zustand store
    useHistoryStore.setState({ stacks: blankStacks }, true)
  })

  it('buttons start disabled', () => {
    render(<Toolbar />)

    expect(screen.getByTestId('toolbar-undo-button')).toBeDisabled()
    expect(screen.getByTestId('toolbar-redo-button')).toBeDisabled()
  })

  it('enables Undo when user has undoable entries', async () => {
    render(<Toolbar />)

    // mutate *real* store – component re-renders automatically
    act(() => {
      useHistoryStore.setState(state => ({
        stacks: {
          ...state.stacks,
          user: {
            undo: [{ id: '1', origin: 'user', timestamp: Date.now() }],
            redo: [],
          },
        },
      }))
    })

    expect(await screen.findByTestId('toolbar-undo-button'))
      .toBeEnabled()
  })

  it('clicks call manager.undo / redo', async () => {
    render(<Toolbar />)

    // give both stacks one entry so buttons are enabled
    act(() => {
      useHistoryStore.setState(state => ({
        stacks: {
          ...state.stacks,
          user: {
            undo: [{ id: '1', origin: 'user', timestamp: Date.now() }],
            redo: [{ id: '2', origin: 'user', timestamp: Date.now() }],
          },
        },
      }))
    })

    const undoBtn = await screen.findByTestId('toolbar-undo-button')
    const redoBtn = screen.getByTestId('toolbar-redo-button')

    await userEvent.click(undoBtn)
    expect(mockManager.undo).toHaveBeenCalledWith('user')

    await userEvent.click(redoBtn)
    expect(mockManager.redo).toHaveBeenCalledWith('user')
  })
})

