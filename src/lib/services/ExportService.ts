import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import type { Editor } from '@tldraw/tldraw'

/** A4 landscape in pt */
const A4_LANDSCAPE = { w: 842, h: 595 }   // 72 pt/in × 11.69 in, 8.27 in

export class ExportService {
  constructor(private editor: Editor) {}

  /* ---------- PNG ---------- */

  /** Exports the current canvas as a PNG and forces download. */
  async exportPNG(fileName = 'slide.png') {
    const blob = await this.editor.getImage('png')             // native helper
    saveAs(blob, fileName)
  }

  /* ---------- PDF ---------- */

  /**
   * Exports the current canvas into a single-page, A4-landscape PDF.
   * Keeps aspect ratio; fits inside page with 24 pt margin.
   */
  async exportPDF(fileName = 'slide.pdf') {
    // 1. Get PNG first
    const blob = await this.editor.getImage('png', { scale: 2 }) // retina
    const dataUrl = URL.createObjectURL(blob)

    // 2. Create PDF
    const pdf = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' })

    // 3. Compute fitted size
    const img = await loadImage(dataUrl)
    const maxW = A4_LANDSCAPE.w - 48         // 24 pt margin each side
    const maxH = A4_LANDSCAPE.h - 48
    const { drawW, drawH } = fit(img.width, img.height, maxW, maxH)

    pdf.addImage(dataUrl, 'PNG',
      (A4_LANDSCAPE.w - drawW) / 2,
      (A4_LANDSCAPE.h - drawH) / 2,
      drawW,
      drawH,
      undefined,
      'FAST'                                // no fancy down-sampling
    )

    // 4. Finish
    pdf.save(fileName)
    URL.revokeObjectURL(dataUrl)
  }
}

/* ---------- helpers ---------- */

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function fit(w: number, h: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / w, maxH / h)
  return { drawW: w * scale, drawH: h * scale }
}
