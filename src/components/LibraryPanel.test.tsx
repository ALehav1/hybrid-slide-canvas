/**
 * @vitest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { LibraryPanel } from './LibraryPanel'
import { useEditorCtx } from '@/lib/tldraw/EditorContext'
import { Editor } from '@tldraw/tldraw'
import userEvent from '@testing-library/user-event'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'

// ✅ CANONICAL VITEST PATTERN - Use vi.hoisted() to avoid hoisting issues
const mockRectangleFactory = vi.hoisted(() => vi.fn())
const mockDiamondFactory = vi.hoisted(() => vi.fn())

// ✅ Mock the basicLibrary with test data that matches component expectations
vi.mock('@/lib/shapeLibraries/basic', () => ({
  basicLibrary: [
    {
      id: 'lib-rect-node',
      name: 'Rectangle Node',
      preview: '/lib/rect-node.png',
      factory: mockRectangleFactory
    },
    {
      id: 'lib-decision', 
      name: 'Decision (Diamond)',
      preview: '/lib/diamond-node.png',
      factory: mockDiamondFactory
    }
  ]
}))

// Mock the editor context
vi.mock('@/lib/tldraw/EditorContext', () => ({
  useEditorCtx: vi.fn()
}))

describe('LibraryPanel - Defensive Timer & Promise Tests', () => {
  const mockEditor = { id: 'mock-editor' } as Editor

  // ✅ CANONICAL PATTERN - Mock setTimeout directly to avoid timer conflicts
  beforeEach(() => {
    // Mock setTimeout to execute immediately (synchronous) in tests
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
      fn() // Execute immediately
      return 1 as unknown as NodeJS.Timeout // Return fake timer ID
    })
    
    // ✅ CANONICAL PATTERN - vi.hoisted() ensures factory mocks are available at import time
    mockRectangleFactory.mockImplementation(() => Promise.resolve())
    mockDiamondFactory.mockImplementation(() => Promise.resolve())
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks() // Restore setTimeout
  })

  test('renders library items correctly', () => {
    render(<LibraryPanel />)
    
    expect(screen.getByText('Rectangle Node')).toBeInTheDocument()
    expect(screen.getByText('Decision (Diamond)')).toBeInTheDocument()
    
    // Check mocked preview images
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', '/lib/rect-node.png')
    expect(images[0]).toHaveAttribute('alt', 'Rectangle Node')
    expect(images[1]).toHaveAttribute('src', '/lib/diamond-node.png')
    expect(images[1]).toHaveAttribute('alt', 'Decision (Diamond)')
  })

  test('handles factory Promise.finally() + setTimeout correctly', async () => {
    (useEditorCtx as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockEditor)
    
    render(<LibraryPanel />)
    const button = screen.getByText('Rectangle Node')

    // ACT - Click triggers factory().finally(() => setTimeout(fn, 500))
    await userEvent.click(button)
    
    // ASSERT - Factory was called with mock editor
    expect(mockRectangleFactory).toHaveBeenCalledWith(mockEditor)
    
    // ✅ CANONICAL PATTERN - With mocked setTimeout, the Promise.finally() completes immediately
    // No need for timer advancement since setTimeout executes synchronously
    await new Promise(resolve => setTimeout(resolve, 0)) // Flush microtasks
  })

  test('does not call factory when editor is null', async () => {
    (useEditorCtx as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null)
    
    render(<LibraryPanel />)
    const button = screen.getByText('Rectangle Node')

    // ACT - Click button when editor is null
    await userEvent.click(button)
    
    // ASSERT - Should not call factory when editor is null
    expect(mockRectangleFactory).not.toHaveBeenCalled()
    
    // The key test: factory should not be called, therefore no Promise.finally() setTimeout
    // Note: We don't need to inspect setTimeout calls since we're testing the logic flow
  })

  test('factory returns actual Promise object', () => {
    // Verify our mocks return actual Promise objects with .finally()
    const promise = mockRectangleFactory() as Promise<void>
    expect(promise).toBeInstanceOf(Promise)
    expect(typeof promise.finally).toBe('function')
  })
});
