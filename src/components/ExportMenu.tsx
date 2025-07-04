import React, { useState } from 'react'
import type { Editor } from '@tldraw/tldraw'
import { ExportService } from '@/lib/services/ExportService'
import { Download, FileImage, FileText } from 'lucide-react'

interface ExportMenuProps {
  editor: Editor
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ editor }) => {
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null)

  const svc = new ExportService(editor)

  return (
    <div className="relative">
      <button className="toolbar-btn">
        <Download size={16} />
        Export
      </button>

      {/* dropdown */}
      <div className="absolute right-0 mt-2 w-40 rounded-lg bg-white shadow-md z-10">
        <button
          className="menu-item"
          disabled={!!busy}
          onClick={() => {
            void (async () => {
              setBusy('png')
              await svc.exportPNG()
              setBusy(null)
            })()
          }}
        >
          <FileImage size={14} className="mr-2" />
          {busy === 'png' ? 'Exporting…' : 'PNG'}
        </button>

        <button
          className="menu-item"
          disabled={!!busy}
          onClick={() => {
            void (async () => {
              setBusy('pdf')
              await svc.exportPDF()
              setBusy(null)
            })()
          }}
        >
          <FileText size={14} className="mr-2" />
          {busy === 'pdf' ? 'Exporting…' : 'PDF'}
        </button>
      </div>
    </div>
  )
}
