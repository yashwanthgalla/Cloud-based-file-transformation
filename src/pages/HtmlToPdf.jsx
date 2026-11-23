import { useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../utils/download.js'
import PdfPreview from '../components/PdfPreview.jsx'
import ServicePage from '../components/ServicePage.jsx'

export default function HtmlToPdf() {
  const [html, setHtml] = useState('<h1>Hello</h1><p>Paste HTML here.</p>')
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const previewRef = useRef(null)

  const [previewBlob, setPreviewBlob] = useState(null)
  const [previewName, setPreviewName] = useState('')

  const isEmpty = useMemo(() => !html.trim(), [html])

  async function onPickHtml(files) {
    const f = files?.[0] ?? null
    if (!f) return
    setError('')
    setPreviewBlob(null)
    setPreviewName('')
    try {
      const text = await f.text()
      setHtml(text)
    } catch {
      setError('Failed to read HTML file.')
    }
  }

  async function downloadPreview() {
    if (!previewBlob || !previewName) return
    await downloadBlob(previewBlob, previewName)
  }

  function clearPreview() {
    setPreviewBlob(null)
    setPreviewName('')
  }

  async function convert() {
    setError('')
    if (isEmpty) {
      setError('Please paste some HTML.')
      return
    }

    const el = previewRef.current
    if (!el) {
      setError('Preview is not available.')
      return
    }

    setIsWorking(true)
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#0b0d12',
        scale: 2,
        useCORS: true,
      })

      const pngDataUrl = canvas.toDataURL('image/png')
      const res = await fetch(pngDataUrl)
      const pngBytes = await res.arrayBuffer()

      const pdf = await PDFDocument.create()
      const image = await pdf.embedPng(pngBytes)

      const page = pdf.addPage([image.width, image.height])
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })

      const outBytes = await pdf.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      setPreviewBlob(blob)
      setPreviewName('html.pdf')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Convert failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="html-to-pdf"
      title="HTML to PDF"
      subtitle="Render pasted HTML and export as a PDF (client-side)."
      trust={['Runs in your browser', 'No uploads by default', 'Preview before download']}
      accept="text/html,.html"
      dropTitle="Drop an HTML file here"
      dropHint="or click to choose an .html file (optional)"
      onFiles={onPickHtml}
      isWorking={isWorking}
      primaryActionLabel="Convert & Preview"
      primaryActionWorkingLabel="Rendering…"
      onPrimaryAction={convert}
      primaryDisabled={isEmpty || isWorking}
      feedback={error ? <div className="muted">{error}</div> : null}
      preview={
        <PdfPreview
          blob={previewBlob}
          filename={previewName}
          title="HTML PDF"
          onDownload={downloadPreview}
          onClear={clearPreview}
        />
      }
    >
      <div className="row" style={{ alignItems: 'stretch' }}>
        <textarea
          className="textInput"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          style={{ width: '100%', minHeight: 140 }}
          placeholder="<h1>Title</h1>..."
        />
      </div>

      <div className="panel" ref={previewRef} style={{ overflow: 'auto' }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <div className="muted">Note: External images/styles may fail due to browser CORS restrictions.</div>
    </ServicePage>
  )
}
