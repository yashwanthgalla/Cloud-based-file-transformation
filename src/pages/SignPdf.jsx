import { useMemo, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
import FileDropzone from '../components/FileDropzone.jsx'
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

function isImage(file) {
  const type = (file.type || '').toLowerCase()
  return type === 'image/png' || type === 'image/jpeg' || type === 'image/jpg'
}

export default function SignPdf() {
  const [pdfFile, setPdfFile] = useState(null)
  const [imgFile, setImgFile] = useState(null)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  const [previewBlob, setPreviewBlob] = useState(null)
  const [previewName, setPreviewName] = useState('')

  const pdfLabel = useMemo(() => {
    if (!pdfFile) return 'No PDF selected'
    const size = formatBytes(pdfFile.size)
    return size ? `${pdfFile.name} (${size})` : pdfFile.name
  }, [pdfFile])

  const imgLabel = useMemo(() => {
    if (!imgFile) return 'No signature image'
    const size = formatBytes(imgFile.size)
    return size ? `${imgFile.name} (${size})` : imgFile.name
  }, [imgFile])

  function onPickPdf(files) {
    setError('')
    setPdfFile(files?.[0] ?? null)
    setPreviewBlob(null)
    setPreviewName('')
  }

  function onPickImg(files) {
    setError('')
    const f = files?.[0] ?? null
    setImgFile(f && isImage(f) ? f : null)
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

  async function sign() {
    setError('')
    if (!pdfFile) {
      setError('Please choose a PDF file.')
      return
    }
    if (!imgFile) {
      setError('Please choose a signature image (PNG/JPG).')
      return
    }

    setIsWorking(true)
    try {
      const pdfBytes = await pdfFile.arrayBuffer()
      const pdf = await PDFDocument.load(pdfBytes)

      const imgBytes = await imgFile.arrayBuffer()
      const type = (imgFile.type || '').toLowerCase()
      const image = type === 'image/png' ? await pdf.embedPng(imgBytes) : await pdf.embedJpg(imgBytes)

      const page = pdf.getPages()[0]
      if (!page) throw new Error('PDF has no pages.')

      const pageW = page.getWidth()
      void page.getHeight()

      const maxWidth = Math.min(220, pageW * 0.45)
      const scale = maxWidth / image.width
      const w = image.width * scale
      const h = image.height * scale

      const margin = 36
      const x = pageW - w - margin
      const y = margin

      page.drawImage(image, { x, y, width: w, height: h })

      const outBytes = await pdf.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const base = safeBaseName(pdfFile.name)
      setPreviewBlob(blob)
      setPreviewName(`${base}-signed.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="sign-pdf"
      title="Sign PDF"
      subtitle="Add a signature image to the first page (bottom-right)."
      trust={['Runs in your browser', 'No uploads by default', 'Preview before download']}
      dropzone={
        <>
          <FileDropzone
            accept="application/pdf"
            title="Drop a PDF here"
            hint="or click to choose a PDF"
            disabled={isWorking}
            onFiles={onPickPdf}
          />
          <FileDropzone
            accept="image/png,image/jpeg"
            title="Drop signature image here"
            hint="or click to choose a PNG/JPG"
            disabled={isWorking}
            onFiles={onPickImg}
          />
        </>
      }
      isWorking={isWorking}
      primaryActionLabel="Sign & Preview"
      primaryActionWorkingLabel="Signing…"
      onPrimaryAction={sign}
      primaryDisabled={!pdfFile || !imgFile || isWorking}
      feedback={
        <>
          <div className="muted">{pdfLabel}</div>
          <div className="muted">{imgLabel}</div>
          {error ? <div className="muted">{error}</div> : null}
        </>
      }
      preview={
        <PdfPreview
          blob={previewBlob}
          filename={previewName}
          title="Signed PDF"
          onDownload={downloadPreview}
          onClear={clearPreview}
        />
      }
    />
  )
}
