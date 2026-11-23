import { useMemo, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
import PdfPreview from '../components/PdfPreview.jsx'
import ServicePage from '../components/ServicePage.jsx'

function isSupportedImage(file) {
  const type = (file.type || '').toLowerCase()
  return type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png'
}

export default function ScanToPdf() {
  const [files, setFiles] = useState([])
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  const [previewBlob, setPreviewBlob] = useState(null)
  const [previewName, setPreviewName] = useState('')

  const total = useMemo(() => files.length, [files])

  function addImages(pickedRaw) {
    const picked = Array.from(pickedRaw ?? [])
    const ok = picked.filter(isSupportedImage)
    setPreviewBlob(null)
    setPreviewName('')
    setFiles((prev) => [...prev, ...ok])
    if (picked.length > ok.length) setError('Some files were not JPG/PNG and were skipped.')
    else setError('')
  }

  function removeAt(index) {
    setPreviewBlob(null)
    setPreviewName('')
    setFiles((prev) => prev.filter((_, i) => i !== index))
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
    if (files.length === 0) {
      setError('Please add at least 1 image.')
      return
    }

    setIsWorking(true)
    try {
      const pdf = await PDFDocument.create()

      for (const file of files) {
        const bytes = await file.arrayBuffer()
        const type = (file.type || '').toLowerCase()
        const image = type === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)

        const { width, height } = image.scale(1)
        const page = pdf.addPage([width, height])
        page.drawImage(image, { x: 0, y: 0, width, height })
      }

      const outBytes = await pdf.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const base = safeBaseName(files[0]?.name || 'scan')
      setPreviewBlob(blob)
      setPreviewName(`${base}.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Convert failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="scan-to-pdf"
      title="Scan to PDF"
      subtitle="Combine scanned images into a single PDF."
      trust={['Runs in your browser', 'No uploads by default', 'Preview before download']}
      accept="image/jpeg,image/png"
      multiple
      dropTitle="Drop scans here"
      dropHint="or click to add JPG/PNG images"
      onFiles={addImages}
      isWorking={isWorking}
      primaryActionLabel="Convert & Preview"
      primaryActionWorkingLabel="Converting…"
      onPrimaryAction={convert}
      primaryDisabled={isWorking || total === 0}
      meta={`${total} image(s)`}
      feedback={error ? <div className="muted">{error}</div> : null}
      preview={
        <PdfPreview
          blob={previewBlob}
          filename={previewName}
          title="Scanned PDF"
          onDownload={downloadPreview}
          onClear={clearPreview}
        />
      }
    >
      {total ? (
        <ol className="fileList">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="fileItem">
              <span>
                <strong>{file.name}</strong>
              </span>
              <button className="dangerBtn" onClick={() => removeAt(index)}>
                Remove
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="muted">Add JPG/PNG images to enable conversion.</div>
      )}
    </ServicePage>
  )
}
