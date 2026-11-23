import { useMemo, useState } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
import PdfPreview from '../components/PdfPreview.jsx'
import ServicePage from '../components/ServicePage.jsx'

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

function parsePagesSpec(spec, maxPages) {
  const raw = (spec || '').trim()
  if (!raw) return null // null means all pages

  const indices = new Set()
  const parts = raw
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  for (const part of parts) {
    const range = part.split('-').map((x) => x.trim())
    if (range.length === 1) {
      const n = Number(range[0])
      if (!Number.isInteger(n)) throw new Error(`Invalid page number: ${part}`)
      if (n < 1 || n > maxPages) throw new Error(`Page out of range: ${n}`)
      indices.add(n - 1)
      continue
    }
    if (range.length === 2) {
      const start = Number(range[0])
      const end = Number(range[1])
      if (!Number.isInteger(start) || !Number.isInteger(end)) throw new Error(`Invalid range: ${part}`)
      if (start < 1 || end < 1 || start > maxPages || end > maxPages) throw new Error(`Range out of bounds: ${part}`)
      const lo = Math.min(start, end)
      const hi = Math.max(start, end)
      for (let n = lo; n <= hi; n++) indices.add(n - 1)
      continue
    }
    throw new Error(`Invalid token: ${part}`)
  }

  return indices
}

export default function RedactPdf() {
  const [file, setFile] = useState(null)
  const [pages, setPages] = useState('')
  const [label, setLabel] = useState('REDACTED')
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  const [previewBlob, setPreviewBlob] = useState(null)
  const [previewName, setPreviewName] = useState('')

  const fileLabel = useMemo(() => {
    if (!file) return 'No file selected'
    const size = formatBytes(file.size)
    return size ? `${file.name} (${size})` : file.name
  }, [file])

  function onPickFiles(files) {
    setError('')
    setFile(files?.[0] ?? null)
    setPreviewBlob(null)
    setPreviewName('')
  }

  async function downloadPreview() {
    if (!previewBlob || !previewName) return
    await downloadBlob(previewBlob, previewName)
  }

  function clearPreview() {
    setPreviewBlob(null)
    setPreviewName('')
  }

  async function redact() {
    setError('')
    if (!file) {
      setError('Please choose a PDF file.')
      return
    }

    setIsWorking(true)
    try {
      const bytes = await file.arrayBuffer()
      const pdf = await PDFDocument.load(bytes)
      const total = pdf.getPageCount()
      const set = parsePagesSpec(pages, total)
      const font = await pdf.embedFont(StandardFonts.HelveticaBold)

      for (let i = 0; i < total; i++) {
        if (set && !set.has(i)) continue
        const page = pdf.getPages()[i]
        const { width, height } = page.getSize()

        page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0, 0, 0) })
        if (label.trim()) {
          const text = label.trim()
          const size = Math.max(18, Math.min(48, Math.floor(Math.min(width, height) / 12)))
          const textWidth = font.widthOfTextAtSize(text, size)
          page.drawText(text, {
            x: Math.max(18, (width - textWidth) / 2),
            y: height / 2,
            size,
            font,
            color: rgb(1, 1, 1),
            opacity: 0.85,
          })
        }
      }

      const outBytes = await pdf.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const base = safeBaseName(file.name)
      setPreviewBlob(blob)
      setPreviewName(`${base}-redacted.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Redaction failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="redact-pdf"
      title="Redact PDF"
      subtitle="Cover selected pages with a redaction overlay (creates a new PDF)."
      trust={['Runs in your browser', 'No uploads by default', 'Preview before download']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      primaryActionLabel="Redact & Preview"
      primaryActionWorkingLabel="Working…"
      onPrimaryAction={redact}
      primaryDisabled={!file || isWorking}
      meta={fileLabel}
      feedback={error ? <div className="muted">{error}</div> : null}
      preview={
        <PdfPreview
          blob={previewBlob}
          filename={previewName}
          title="Redacted PDF"
          onDownload={downloadPreview}
          onClear={clearPreview}
        />
      }
    >
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <label className="muted">
          Pages (empty = all, e.g. 1-2,5)
          <input
            className="textInput"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder=""
            disabled={!file || isWorking}
          />
        </label>

        <label className="muted">
          Label (optional)
          <input
            className="textInput"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="REDACTED"
            disabled={!file || isWorking}
          />
        </label>
      </div>

      <div className="muted">Tip: This redacts by overlaying content. It does not remove underlying PDF objects.</div>
    </ServicePage>
  )
}
