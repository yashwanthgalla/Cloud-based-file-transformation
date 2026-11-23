import { useEffect, useMemo, useState } from 'react'
import { downloadBlob } from '../utils/download.js'
import ServicePage from '../components/ServicePage.jsx'

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export default function PdfToPdfa() {
  const [file, setFile] = useState(null)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  const browserOnlyNote =
    'True PDF/A conversion typically requires native tooling (e.g., Ghostscript + ICC profiles) and is not reliably available in browser-only mode.'

  const fileLabel = useMemo(() => {
    if (!file) return 'No file selected'
    const size = formatBytes(file.size)
    return size ? `${file.name} (${size})` : file.name
  }, [file])

  useEffect(() => {
    if (!file) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return ''
      })
      return
    }

    const nextUrl = URL.createObjectURL(file)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return nextUrl
    })

    return () => {
      URL.revokeObjectURL(nextUrl)
    }
  }, [file])

  function onPickFiles(files) {
    setError('')
    setProgress('')
    setFile(files?.[0] ?? null)
  }

  async function downloadOriginal() {
    setError('')
    setProgress('')

    if (!file) {
      setError('Please choose a PDF file.')
      return
    }

    try {
      setIsWorking(true)
      await downloadBlob(file, file.name || 'document.pdf')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="pdf-to-pdfa"
      title="PDF to PDF/A"
      subtitle="Convert a PDF to PDF/A."
      trust={['Runs in your browser', 'Preview available', 'Conversion may require native tooling']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      primaryActionLabel="Download"
      primaryActionWorkingLabel="Working…"
      onPrimaryAction={downloadOriginal}
      primaryDisabled={!file || isWorking}
      meta={fileLabel}
      feedback={
        <>
          {progress ? <div className="muted">{progress}</div> : null}
          {error ? <div className="muted">{error}</div> : null}
        </>
      }
      preview={
        previewUrl ? (
          <section className="panel stack">
            <div className="muted">Preview</div>
            <iframe className="pdfPreviewFrame" title="PDF/A Preview" src={previewUrl} />
          </section>
        ) : null
      }
    >
      <div className="muted">{browserOnlyNote}</div>
    </ServicePage>
  )
}
