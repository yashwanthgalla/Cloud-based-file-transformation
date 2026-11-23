import { useMemo, useState } from 'react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
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

export default function EditPdf() {
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(18)
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

  async function apply() {
    setError('')
    if (!file) {
      setError('Please choose a PDF file.')
      return
    }
    if (!text.trim()) {
      setError('Please enter text to add.')
      return
    }

    setIsWorking(true)
    try {
      const bytes = await file.arrayBuffer()
      const pdf = await PDFDocument.load(bytes)
      const font = await pdf.embedFont(StandardFonts.Helvetica)

      for (const page of pdf.getPages()) {
        const x = 36
        const y = page.getHeight() - 72
        page.drawText(text, {
          x,
          y,
          size: Number(fontSize) || 18,
          font,
          color: rgb(0, 0, 0),
        })
      }

      const outBytes = await pdf.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const base = safeBaseName(file.name)
      setPreviewBlob(blob)
      setPreviewName(`${base}-edited.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Edit failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="edit-pdf"
      title="Edit PDF"
      subtitle="Add simple text overlays (client-side)."
      trust={['Runs in your browser', 'No uploads by default', 'Preview before download']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      primaryActionLabel="Apply & Preview"
      primaryActionWorkingLabel="Applying…"
      onPrimaryAction={apply}
      primaryDisabled={!file || isWorking}
      meta={fileLabel}
      feedback={error ? <div className="muted">{error}</div> : null}
      preview={
        <PdfPreview
          blob={previewBlob}
          filename={previewName}
          title="Updated PDF"
          onDownload={downloadPreview}
          onClear={clearPreview}
        />
      }
    >
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <label className="muted" style={{ flex: 1, minWidth: 240 }}>
          Text
          <input
            className="textInput"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type text to add"
            disabled={!file || isWorking}
          />
        </label>

        <label className="muted">
          Font size
          <input
            className="textInput"
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            disabled={!file || isWorking}
          />
        </label>
      </div>
    </ServicePage>
  )
}
