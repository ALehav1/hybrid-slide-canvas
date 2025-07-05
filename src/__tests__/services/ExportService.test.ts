import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Editor, TLShapeId } from '@tldraw/tldraw'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'

// SOLUTION D: Pre-mock with vi.hoisted
const { mockBlobToDataUrl } = vi.hoisted(() => ({
  mockBlobToDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,mock-data-url')
}))

// Mock dependencies
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}))

const mockAddImage = vi.fn()
const mockSave = vi.fn()
vi.mock('jspdf', () => ({
  default: vi.fn(() => ({
    addImage: mockAddImage,
    save: mockSave,
  })),
}))

// Mock the standalone blobToDataUrl function directly
vi.mock('@/lib/services/ExportService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/ExportService')>()
  return {
    ...actual,
    blobToDataUrl: mockBlobToDataUrl
  }
})

// Import ExportService after mocking
import { ExportService } from '@/lib/services/ExportService'

describe('ExportService', () => {
  let editor: Editor
  let exportService: ExportService
  let mockShapeIds: TLShapeId[]

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup the blobToDataUrl mock to resolve immediately
    mockBlobToDataUrl.mockResolvedValue('data:image/png;base64,mock-data-url')

    // Create mock shape IDs with proper typing
    mockShapeIds = ['shape1' as TLShapeId, 'shape2' as TLShapeId]
    
    // Create a mock editor with tldraw v3 API
    editor = {
      toImage: vi.fn().mockResolvedValue({
        blob: new Blob(['png-data'], { type: 'image/png' }),
        width: 100,
        height: 50
      }),
      getCurrentPageShapeIds: vi.fn().mockReturnValue(mockShapeIds)
    } as unknown as Editor

    exportService = new ExportService(editor)
  })

  describe('exportPNG', () => {
    it('should export canvas as PNG with default filename', async function () {
      await exportService.exportPNG()

      expect(editor.toImage).toHaveBeenCalledWith(mockShapeIds, { format: 'png', background: true })
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'slide.png')
    })

    it('should export canvas as PNG with a custom filename', async function () {
      await exportService.exportPNG(mockShapeIds, 'custom-name.png')

      expect(editor.toImage).toHaveBeenCalledWith(mockShapeIds, { format: 'png', background: true })
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'custom-name.png')
    })
  })

  describe('exportPDF', () => {
    /**
     * Debug version of the PDF test.
     * Adds verbose console output so we can see exactly
     * where the flow stops when the test hangs.
     */
    it('DEBUG ‑ exportPDF flow', async function () {
      console.log('🔎  [TEST] ‑ Starting exportPDF debug flow')

      // extra spy to see if the promise ever resolves
      mockBlobToDataUrl.mockImplementation(async (blob: Blob) => {
        console.log('🔎  [TEST] ‑ mockBlobToDataUrl called with Blob:', blob)
        return 'data:image/png;base64,mock-data-url'
      })

      try {
        await exportService.exportPDF(mockShapeIds, 'debug-slide.pdf')
        console.log('✅  [TEST] ‑ exportPDF resolved')
      } catch (err) {
        console.error('❌  [TEST] ‑ exportPDF threw error:', err)
        throw err
      }

      // Basic sanity check so Vitest still asserts something
      expect(mockSave).toHaveBeenCalledWith('debug-slide.pdf')
    })
  })
})
