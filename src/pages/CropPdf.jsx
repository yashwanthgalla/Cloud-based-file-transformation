import { useMemo, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
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

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export default function CropPdf() {
  const [file, setFile] = useState(null)
  const [left, setLeft] = useState(0)
  const [right, setRight] = useState(0)
  const [top, setTop] = useState(0)
  const [bottom, setBottom] = useState(0)
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

  async function crop() {
    setError('')
    if (!file) {
      setError('Please choose a PDF file.')
      return
    }

    setIsWorking(true)
    try {
      const bytes = await file.arrayBuffer()
      const pdf = await PDFDocument.load(bytes)

      for (const page of pdf.getPages()) {
        const box = page.getMediaBox()
        const maxLeft = box.width - 1
        const maxRight = box.width - 1
        const maxTop = box.height - 1
        const maxBottom = box.height - 1

        const l = clamp(Number(left) || 0, 0, maxLeft)
        const r = clamp(Number(right) || 0, 0, maxRight)
        const t = clamp(Number(top) || 0, 0, maxTop)
        const b = clamp(Number(bottom) || 0, 0, maxBottom)

        const newWidth = box.width - l - r
        const newHeight = box.height - t - b
        if (newWidth <= 1 || newHeight <= 1) {
          throw new Error('Crop values are too large for at least one page.')
        }

        const x = box.x + l
        const y = box.y + b

        page.setCropBox(x, y, newWidth, newHeight)
        page.setMediaBox(x, y, newWidth, newHeight)
      }

      const outBytes = await pdf.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const base = safeBaseName(file.name)
      setPreviewBlob(blob)
      setPreviewName(`${base}-cropped.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Crop failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="crop-pdf"
      title="Crop PDF"
      subtitle="Crop margins from all pages (values in points)."
      trust={['Runs in your browser', 'No uploads by default', 'Preview before download']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      primaryActionLabel="Crop & Preview"
      primaryActionWorkingLabel="Cropping…"
      onPrimaryAction={crop}
      primaryDisabled={!file || isWorking}
      meta={fileLabel}
      feedback={error ? <div className="muted">{error}</div> : null}
      preview={
        <PdfPreview
          blob={previewBlob}
          filename={previewName}
          title="Cropped PDF"
          onDownload={downloadPreview}
          onClear={clearPreview}
        />
      }
    >
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <label className="muted">
          Left
          <input className="textInput" type="number" value={left} onChange={(e) => setLeft(e.target.value)} />
        </label>
        <label className="muted">
          Right
          <input className="textInput" type="number" value={right} onChange={(e) => setRight(e.target.value)} />
        </label>
        <label className="muted">
          Top
          <input className="textInput" type="number" value={top} onChange={(e) => setTop(e.target.value)} />
        </label>
        <label className="muted">
          Bottom
          <input className="textInput" type="number" value={bottom} onChange={(e) => setBottom(e.target.value)} />
        </label>
      </div>
    </ServicePage>
  )
}
