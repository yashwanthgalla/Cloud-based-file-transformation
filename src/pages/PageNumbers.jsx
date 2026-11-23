import { useState } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
import PdfPreview from '../components/PdfPreview.jsx'
import ServicePage from '../components/ServicePage.jsx'

export default function PageNumbers() {
  const [file, setFile] = useState(null)
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

  async function addNumbers() {
    setError('')
    if (!file) {
      setError('Please choose a PDF file.')
      return
    }

    setIsWorking(true)
    try {
      const bytes = await file.arrayBuffer()
      const pdf = await PDFDocument.load(bytes)
      const font = await pdf.embedFont(StandardFonts.Helvetica)

      const pages = pdf.getPages()
      const fontSize = 12
      const margin = 18

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const { width } = page.getSize()
        const label = String(i + 1)
        const textWidth = font.widthOfTextAtSize(label, fontSize)
        page.drawText(label, {
          x: width - margin - textWidth,
          y: margin,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          opacity: 0.7,
        })
      }

      const outBytes = await pdf.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const base = safeBaseName(file.name)
      setPreviewBlob(blob)
      setPreviewName(`${base}-page-numbers.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add page numbers.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="page-numbers"
      title="Page Numbers"
      subtitle="Add page numbers to the bottom-right corner."
      trust={['Runs in your browser', 'No uploads by default', 'Preview before download']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      primaryActionLabel="Add & Preview"
      primaryActionWorkingLabel="Adding…"
      onPrimaryAction={addNumbers}
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
