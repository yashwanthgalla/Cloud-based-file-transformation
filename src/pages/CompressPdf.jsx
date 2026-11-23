import { useMemo, useState } from 'react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
import PdfPreview from '../components/PdfPreview.jsx'
import ServicePage from '../components/ServicePage.jsx'

GlobalWorkerOptions.workerSrc = workerSrc

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

async function canvasToJpegBlob(canvas, quality = 0.82) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Failed to encode image'))
        else resolve(blob)
      },
      'image/jpeg',
      quality,
    )
  })
}

const PRESETS = [
  { id: 'high', label: 'High', scale: 2, quality: 0.9 },
  { id: 'balanced', label: 'Balanced', scale: 1.5, quality: 0.82 },
  { id: 'small', label: 'Small', scale: 1.2, quality: 0.72 },
]

export default function CompressPdf() {
  const [file, setFile] = useState(null)
  const [presetId, setPresetId] = useState('balanced')
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const [lastOutSize, setLastOutSize] = useState(null)

  const [previewBlob, setPreviewBlob] = useState(null)
  const [previewName, setPreviewName] = useState('')

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[1],
    [presetId],
  )

  function onPickFiles(files) {
    setError('')
    setLastOutSize(null)
    setPreviewBlob(null)
    setPreviewName('')
    setFile(files?.[0] ?? null)
  }

  async function downloadPreview() {
    if (!previewBlob || !previewName) return
    await downloadBlob(previewBlob, previewName)
  }

  function clearPreview() {
    setPreviewBlob(null)
    setPreviewName('')
  }

  async function compress() {
    setError('')
    setLastOutSize(null)

    if (!file) {
      setError('Please choose a PDF file.')
      return
    }

    setIsWorking(true)
    try {
      const bytes = await file.arrayBuffer()
      const loadingTask = getDocument({ data: bytes })
      const pdf = await loadingTask.promise

      const out = await PDFDocument.create()

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber)
        const viewport = page.getViewport({ scale: preset.scale })

        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas is not supported in this browser')

        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)

        await page.render({ canvasContext: context, viewport }).promise

        const jpegBlob = await canvasToJpegBlob(canvas, preset.quality)
        const jpegBytes = await jpegBlob.arrayBuffer()
        const jpg = await out.embedJpg(jpegBytes)

        const outPage = out.addPage([viewport.width, viewport.height])
        outPage.drawImage(jpg, {
          x: 0,
          y: 0,
          width: outPage.getWidth(),
          height: outPage.getHeight(),
        })
      }

      const outBytes = await out.save()
      setLastOutSize(outBytes.byteLength)

      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const base = safeBaseName(file.name)
      setPreviewBlob(blob)
      setPreviewName(`${base}-compressed.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compress failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="compress-pdf"
      title="Compress PDF"
      subtitle="Reduce file size by re-rendering pages (client-side)."
      trust={['Runs in your browser', 'No uploads by default', 'Preview before download']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      actionLeft={
        <select
          className="navLink"
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          aria-label="Compression preset"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      }
      primaryActionLabel="Compress & Preview"
      primaryActionWorkingLabel="Compressing…"
      onPrimaryAction={compress}
      primaryDisabled={!file || isWorking}
      meta={
        file
          ? `${file.name} (${formatBytes(file.size)})${lastOutSize ? ` → ${formatBytes(lastOutSize)}` : ''}`
          : 'No file selected'
      }
      feedback={error ? <div className="muted">{error}</div> : null}
      preview={
        <PdfPreview
          blob={previewBlob}
          filename={previewName}
          title="Compressed PDF"
          onDownload={downloadPreview}
          onClear={clearPreview}
        />
      }
    >
      <div className="muted">
        Note: This method may reduce quality (especially for text-heavy PDFs) because it converts each page into an image.
      </div>
    </ServicePage>
  )
}
