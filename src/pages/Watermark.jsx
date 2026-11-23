import { useState } from 'react'
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
import PdfPreview from '../components/PdfPreview.jsx'
import ServicePage from '../components/ServicePage.jsx'

export default function Watermark() {
  const [file, setFile] = useState(null)
  const [text, setText] = useState('CONFIDENTIAL')
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

  async function applyWatermark() {
    setError('')
    if (!file) {
      setError('Please choose a PDF file.')
      return
    }
    if (!text.trim()) {
      setError('Please enter watermark text.')
      return
    }

    setIsWorking(true)
    try {
      const bytes = await file.arrayBuffer()
      const pdf = await PDFDocument.load(bytes)
      const font = await pdf.embedFont(StandardFonts.HelveticaBold)

      for (const page of pdf.getPages()) {
        const { width, height } = page.getSize()
        const fontSize = Math.max(24, Math.min(72, Math.floor(Math.min(width, height) / 10)))
        const textWidth = font.widthOfTextAtSize(text, fontSize)
        const x = (width - textWidth) / 2
        const y = height / 2

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          opacity: 0.15,
          rotate: degrees(35),
        })
      }

      const outBytes = await pdf.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const base = safeBaseName(file.name)
      setPreviewBlob(blob)
      setPreviewName(`${base}-watermarked.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Watermark failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="watermark"
      title="Watermark"
      subtitle="Add a subtle text watermark to every page."
      trust={['Runs in your browser', 'No uploads by default', 'Preview before download']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      actionLeft={
        <input
          className="navLink"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Watermark text"
          style={{ minWidth: 220 }}
        />
      }
      primaryActionLabel="Apply & Preview"
      primaryActionWorkingLabel="Applying…"
      onPrimaryAction={applyWatermark}
      primaryDisabled={!file || isWorking}
      meta={file ? file.name : 'No file selected'}
      feedback={error ? <div className="muted">{error}</div> : null}
      preview={
        <PdfPreview
          blob={previewBlob}
          filename={previewName}
          title="Watermarked PDF"
          onDownload={downloadPreview}
          onClear={clearPreview}
        />
      }
    />
  )
}
