import { useMemo, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../utils/download.js'
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

export default function MergePdf() {
  const [files, setFiles] = useState([])
  const [isMerging, setIsMerging] = useState(false)
  const [error, setError] = useState('')

  const [previewBlob, setPreviewBlob] = useState(null)
  const [previewName, setPreviewName] = useState('')

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + (file?.size ?? 0), 0),
    [files],
  )

  function addFiles(pickedRaw) {
    const picked = Array.from(pickedRaw ?? [])
    const onlyPdf = picked.filter((f) => (f.type || '').toLowerCase() === 'application/pdf')

    setError('')
    setPreviewBlob(null)
    setPreviewName('')
    setFiles((prev) => [...prev, ...onlyPdf])

    if (picked.length > onlyPdf.length) {
      setError('Some selected files were not PDFs and were skipped.')
    }
  }

  function onPickFiles(event) {
    addFiles(event.target.files)
    event.target.value = ''
  }

  function removeFileAt(index) {
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

  async function merge() {
    setError('')
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.')
      return
    }

    setIsMerging(true)
    try {
      const mergedPdf = await PDFDocument.create()

      for (const file of files) {
        const bytes = await file.arrayBuffer()
        const source = await PDFDocument.load(bytes)
        const copiedPages = await mergedPdf.copyPages(source, source.getPageIndices())
        for (const page of copiedPages) mergedPdf.addPage(page)
      }

      const mergedBytes = await mergedPdf.save()
      const blob = new Blob([mergedBytes], { type: 'application/pdf' })
      setPreviewBlob(blob)
      setPreviewName('merged.pdf')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed. Please try again.')
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <ServicePage
      slug="merge-pdf"
      title="Merge PDF"
      subtitle="Combine multiple PDFs into one file."
      trust={['Runs in your browser', 'No uploads by default', 'Fast merge for large files']}
      accept="application/pdf"
      multiple
      dropTitle="Drop PDFs here"
      dropHint="or click to add PDF files"
      onFiles={addFiles}
      isWorking={isMerging}
      primaryActionLabel="Merge & Preview"
      primaryActionWorkingLabel="Merging…"
      onPrimaryAction={merge}
      primaryDisabled={isMerging || files.length < 2}
      meta={`${files.length} file(s)${files.length ? ` • ${formatBytes(totalSize)}` : ''}`}
      feedback={error ? <div className="muted">{error}</div> : null}
      preview={
        <PdfPreview
          blob={previewBlob}
          filename={previewName}
          title="Merged PDF"
          onDownload={downloadPreview}
          onClear={clearPreview}
        />
      }
    >
      {files.length ? (
        <ol className="fileList">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="fileItem">
              <span>
                <strong>{file.name}</strong> <span className="muted">({formatBytes(file.size)})</span>
              </span>
              <button className="dangerBtn" onClick={() => removeFileAt(index)}>
                Remove
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="muted">Add at least 2 PDFs to enable merging.</div>
      )}
    </ServicePage>
  )
}
