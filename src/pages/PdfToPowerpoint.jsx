import { useMemo, useState } from 'react'
import PptxGenJS from 'pptxgenjs'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
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

async function canvasToPngDataUrl(canvas) {
  return canvas.toDataURL('image/png')
}

export default function PdfToPowerpoint() {
  const [file, setFile] = useState(null)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const fileLabel = useMemo(() => {
    if (!file) return 'No file selected'
    const size = formatBytes(file.size)
    return size ? `${file.name} (${size})` : file.name
  }, [file])

  function onPickFiles(files) {
    setError('')
    setProgress('')
    setFile(files?.[0] ?? null)
  }

  async function convert() {
    setError('')
    setProgress('')

    if (!file) {
      setError('Please choose a PDF file.')
      return
    }

    setIsWorking(true)
    try {
      const bytes = await file.arrayBuffer()
      const pdf = await getDocument({ data: bytes }).promise

      const pptx = new PptxGenJS()
      pptx.layout = 'LAYOUT_WIDE'

      const scale = 2

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setProgress(`Rendering page ${pageNumber}/${pdf.numPages}…`)
        const page = await pdf.getPage(pageNumber)
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas is not supported in this browser')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        await page.render({ canvasContext: ctx, viewport }).promise

        const dataUrl = await canvasToPngDataUrl(canvas)

        const slide = pptx.addSlide()
        slide.addImage({ data: dataUrl, x: 0, y: 0, w: 13.333, h: 7.5 })
      }

      setProgress('Packaging PPTX…')
      const out = await pptx.write('arraybuffer')
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      })

      const base = safeBaseName(file.name)
      await downloadBlob(blob, `${base}.pptx`)
      setProgress('Done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Convert failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="pdf-to-powerpoint"
      title="PDF to PowerPoint"
      subtitle="Export each page as an image slide (downloads PPTX)."
      trust={['Runs in your browser', 'No uploads by default', 'Best for slide-style PDFs']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      primaryActionLabel="Convert & Download PPTX"
      primaryActionWorkingLabel="Working…"
      onPrimaryAction={convert}
      primaryDisabled={!file || isWorking}
      meta={fileLabel}
      feedback={
        <>
          {progress ? <div className="muted">{progress}</div> : null}
          {error ? <div className="muted">{error}</div> : null}
        </>
      }
    />
  )
}
