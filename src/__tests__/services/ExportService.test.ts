import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ExportService } from '@/lib/services/ExportService'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import type { Editor, TLShapeId } from '@tldraw/tldraw'

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

// Mock FileReader for PDF export
interface MockFileReader {
  readAsDataURL: ReturnType<typeof vi.fn>
  result: string
  onload: (() => void) | null
  onerror: (() => void) | null
}

let mockFileReader: MockFileReader

beforeAll(() => {
  // Mock FileReader used by blobToDataUrl
  mockFileReader = {
    readAsDataURL: vi.fn(),
    result: 'data:image/png;base64,mock-data-url',
    onload: null,
    onerror: null
  }
  
  global.FileReader = vi.fn(() => {
    return mockFileReader as unknown as FileReader
  }) as unknown as typeof FileReader
  
  // Mock FileReader async behavior
  mockFileReader.readAsDataURL.mockImplementation(() => {
    setTimeout(() => mockFileReader.onload?.(), 0)
  })
})

// Mock Image global for loadImage helper
global.Image = class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 100
  height = 50
  
  constructor() {
    // Simulate successful image load
    setTimeout(() => {
      this.onload?.()
    }, 0)
  }
  
  set src(_: string) {
    // Trigger load on src assignment
  }
} as unknown as typeof globalThis.Image

describe('ExportService', () => {
  let editor: Editor
  let exportService: ExportService
  let mockShapeIds: TLShapeId[]

  beforeEach(() => {
    vi.clearAllMocks()

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
    it('should export canvas as PNG with default filename', async () => {
      await exportService.exportPNG()

      expect(editor.toImage).toHaveBeenCalledWith(mockShapeIds, { format: 'png', background: true })
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'slide.png')
    })

    it('should export canvas as PNG with a custom filename', async () => {
      await exportService.exportPNG(mockShapeIds, 'custom-name.png')

      expect(editor.toImage).toHaveBeenCalledWith(mockShapeIds, { format: 'png', background: true })
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'custom-name.png')
    })
  })

  describe('exportPDF', () => {
    it('should export canvas as PDF with correct dimensions and filename', async () => {
      await exportService.exportPDF(mockShapeIds, 'my-slide.pdf')

      // 1. Get PNG with scale
      expect(editor.toImage).toHaveBeenCalledWith(mockShapeIds, { format: 'png', scale: 2 })

      // 2. Convert blob to data URL via FileReader
      expect(global.FileReader).toHaveBeenCalled()
      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(expect.any(Blob))

      // 3. Initialize jsPDF with image dimensions
      expect(jsPDF).toHaveBeenCalledWith('l', 'px', [100, 50])

      // 4. Add image to PDF
      expect(mockAddImage).toHaveBeenCalledWith(
        'data:image/png;base64,mock-data-url',
        'PNG',
        0,
        0,
        100,
        50
      )

      // 5. Save PDF
      expect(mockSave).toHaveBeenCalledWith('my-slide.pdf')
    })
  })
})
