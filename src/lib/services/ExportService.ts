import { Editor } from '@tldraw/tldraw'
import type { TLShapeId } from '@tldraw/tldraw'
import { saveAs }               from 'file-saver'
import jsPDF                   from 'jspdf'

export class ExportService {
  constructor(private editor: Editor) {}

  /** PNG (or JPEG / WebP) */
  async exportPNG(
    ids: TLShapeId[] = [...this.editor.getCurrentPageShapeIds()],
    file = 'slide.png'
  ) {
    if (!ids.length) return
    const { blob } = await this.editor.toImage(ids, { format: 'png', background: true })
    saveAs(blob, file)
  }

  /** SVG */
  async exportSVG(
    ids: TLShapeId[] = [...this.editor.getCurrentPageShapeIds()],
    file = 'slide.svg'
  ) {
    if (!ids.length) return
    const result = await this.editor.getSvgString(ids)   // <- vector!
    if (!result?.svg) return
    const blob = new Blob([result.svg], { type: 'image/svg+xml' })
    saveAs(blob, file)
  }

  /** PDF (embed high-res PNG) */
  async exportPDF(
    ids: TLShapeId[] = [...this.editor.getCurrentPageShapeIds()],
    file = 'slide.pdf'
  ) {
    if (!ids.length) return
    const { blob, width, height } = await this.editor.toImage(ids, { format: 'png', scale: 2 })
    const dataUrl = await blobToDataUrl(blob)
    const pdf = new jsPDF(width > height ? 'l' : 'p', 'px', [width, height])
    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height)
    pdf.save(file)
  }
}

/* util */
export const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onerror = rej; r.onload = () => res(r.result as string); r.readAsDataURL(b)
  })
