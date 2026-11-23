import { useMemo, useState } from 'react'
import JSZip from 'jszip'
import { createWorker } from 'tesseract.js'
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

async function renderPageToCanvas(pdf, pageNumber, scale = 2) {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported in this browser')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas
}

export default function OcrPdf() {
  const [file, setFile] = useState(null)
  const [isWorking, setIsWorking] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

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

  async function runOcr() {
    setError('')
    setProgress('')

    if (!file) {
      setError('Please choose a PDF file.')
      return
    }

    setIsWorking(true)
    let worker = null
    try {
      const bytes = await file.arrayBuffer()
      const pdf = await getDocument({ data: bytes }).promise
      const base = safeBaseName(file.name)
      const zip = new JSZip()

      const allText = []

      worker = await createWorker({
        logger: (m) => {
          if (m?.status) {
            const pct = typeof m.progress === 'number' ? ` ${(m.progress * 100).toFixed(0)}%` : ''
            setProgress(`${m.status}${pct}`)
          }
        },
      })
      await worker.loadLanguage('eng')
      await worker.initialize('eng')

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setProgress(`Rendering page ${pageNumber}/${pdf.numPages}…`)
        const canvas = await renderPageToCanvas(pdf, pageNumber, 2)

        setProgress(`OCR page ${pageNumber}/${pdf.numPages}…`)
        const result = await worker.recognize(canvas)
        const text = (result?.data?.text ?? '').trimEnd()

        allText.push(`--- Page ${pageNumber} ---\n${text}\n`)
        zip.file(`${base}-page-${pageNumber}.txt`, text)
      }

      zip.file(`${base}-ocr.txt`, allText.join('\n'))
      const outZip = await zip.generateAsync({ type: 'blob' })
      await downloadBlob(outZip, `${base}-ocr.zip`)
      setProgress('Done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCR failed. Please try again.')
    } finally {
      try {
        if (worker) await worker.terminate()
      } catch {
        // ignore
      }
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="ocr-pdf"
      title="OCR PDF"
      subtitle="Extract text from scanned PDFs (downloads TXT files as ZIP)."
      trust={['Runs in your browser', 'No uploads by default', 'Can be slow for large PDFs']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      primaryActionLabel="Run OCR & Download ZIP"
      primaryActionWorkingLabel="Working…"
      onPrimaryAction={runOcr}
      primaryDisabled={!file || isWorking}
      meta={fileLabel}
      feedback={
        <>
          {progress ? <div className="muted">{progress}</div> : null}
          {error ? <div className="muted">{error}</div> : null}
        </>
      }
    >
      <div className="muted">Note: This is client-side OCR and can be slow for large PDFs.</div>
    </ServicePage>
  )
}
