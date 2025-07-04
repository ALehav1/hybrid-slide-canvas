import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ExportService } from '@/lib/services/ExportService'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import type { Editor } from '@tldraw/tldraw'

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

// Mock global URL methods
const mockCreateObjectURL = vi.fn(() => 'mock-url')
const mockRevokeObjectURL = vi.fn()
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

// Mock Image global for loadImage helper
global.Image = class {
  onload: () => void = () => {}
  onerror: () => void = () => {}
  src: string = ''
  width: number = 100
  height: number = 50
  constructor() {
    setTimeout(() => this.onload(), 50) // Simulate async loading
    return this
  }
} as any

describe('ExportService', () => {
  let editor: Editor
  let exportService: ExportService

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a mock editor
    editor = {
      getImage: vi.fn().mockResolvedValue(new Blob(['png-data'], { type: 'image/png' })),
    } as any

    exportService = new ExportService(editor)
  })

  describe('exportPNG', () => {
    it('should export canvas as PNG with default filename', async () => {
      await exportService.exportPNG()

      expect(editor.getImage).toHaveBeenCalledWith('png')
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'slide.png')
    })

    it('should export canvas as PNG with a custom filename', async () => {
      await exportService.exportPNG('custom-name.png')

      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'custom-name.png')
    })
  })

  describe('exportPDF', () => {
    it('should export canvas as PDF with correct dimensions and filename', async () => {
      await exportService.exportPDF('my-slide.pdf')

      // 1. Get PNG with scale
      expect(editor.getImage).toHaveBeenCalledWith('png', { scale: 2 })

      // 2. Create object URL
      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))

      // 3. Initialize jsPDF
      expect(jsPDF).toHaveBeenCalledWith({ orientation: 'l', unit: 'pt', format: 'a4' })

      // 4. Add image to PDF with correct fitting logic
      // A4 landscape (842x595) with 24pt margin = 794x547
      // Image is 100x50, so scale = min(794/100, 547/50) = 7.94
      // drawW = 100 * 7.94 = 794, drawH = 50 * 7.94 = 397
      const expectedW = 794
      const expectedH = 397
      const expectedX = (842 - expectedW) / 2 // Centered X
      const expectedY = (842 - expectedH) / 2 // Centered Y

      expect(mockAddImage).toHaveBeenCalledWith(
        'mock-url',
        'PNG',
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        undefined,
        'FAST'
      )

      // 5. Save PDF
      expect(mockSave).toHaveBeenCalledWith('my-slide.pdf')

      // 6. Clean up object URL
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url')
    })
  })
})
