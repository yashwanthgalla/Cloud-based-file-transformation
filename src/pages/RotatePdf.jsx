import { useState } from 'react'
import { degrees, PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
import PdfPreview from '../components/PdfPreview.jsx'
import ServicePage from '../components/ServicePage.jsx'

export default function RotatePdf() {
  const [file, setFile] = useState(null)
  const [rotation, setRotation] = useState(90)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  const [previewBlob, setPreviewBlob] = useState(null)
  const [previewName, setPreviewName] = useState('')

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

  async function rotate() {
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
        page.setRotation(degrees(rotation))
      }
      const outBytes = await pdf.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const base = safeBaseName(file.name)
      setPreviewBlob(blob)
      setPreviewName(`${base}-rotated-${rotation}.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rotate failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="rotate-pdf"
      title="Rotate PDF"
      subtitle="Rotate all pages and download the updated PDF."
      trust={['Runs in your browser', 'No uploads by default', 'Preview before download']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      actionLeft={
        <select className="navLink" value={rotation} onChange={(e) => setRotation(Number(e.target.value))}>
          <option value={90}>90°</option>
          <option value={180}>180°</option>
          <option value={270}>270°</option>
        </select>
      }
      primaryActionLabel="Rotate & Preview"
      primaryActionWorkingLabel="Rotating…"
      onPrimaryAction={rotate}
      primaryDisabled={!file || isWorking}
      meta={file ? file.name : 'No file selected'}
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
    />
  )
}
