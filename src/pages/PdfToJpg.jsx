import { useState } from 'react'
import JSZip from 'jszip'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
import ServicePage from '../components/ServicePage.jsx'

GlobalWorkerOptions.workerSrc = workerSrc

async function canvasToJpegBlob(canvas, quality = 0.92) {
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

export default function PdfToJpg() {
  const [file, setFile] = useState(null)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  function onPickFiles(files) {
    setError('')
    setFile(files?.[0] ?? null)
  }

  async function convert() {
    setError('')
    if (!file) {
      setError('Please choose a PDF file.')
      return
    }

    setIsWorking(true)
    try {
      const bytes = await file.arrayBuffer()
      const loadingTask = getDocument({ data: bytes })
      const pdf = await loadingTask.promise
      const base = safeBaseName(file.name)
      const zip = new JSZip()

      const scale = 2
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber)
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas is not supported in this browser')

        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)

        await page.render({ canvasContext: context, viewport }).promise

        const blob = await canvasToJpegBlob(canvas)
        const imgBytes = await blob.arrayBuffer()
        zip.file(`${base}-page-${pageNumber}.jpg`, imgBytes)
      }

      const outZip = await zip.generateAsync({ type: 'blob' })
      await downloadBlob(outZip, `${base}-jpg.zip`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Convert failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="pdf-to-jpg"
      title="PDF to JPG"
      subtitle="Export each page as a JPG (downloads a ZIP)."
      trust={['Runs in your browser', 'No uploads by default', 'Downloads a ZIP file']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      primaryActionLabel="Convert & Download ZIP"
      primaryActionWorkingLabel="Converting…"
      onPrimaryAction={convert}
      primaryDisabled={!file || isWorking}
      meta={file ? file.name : 'No file selected'}
      feedback={error ? <div className="muted">{error}</div> : null}
    />
  )
}
