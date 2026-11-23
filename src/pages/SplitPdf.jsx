import { useState } from 'react'
import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
import ServicePage from '../components/ServicePage.jsx'

export default function SplitPdf() {
  const [file, setFile] = useState(null)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  function onPickFiles(files) {
    setError('')
    setFile(files?.[0] ?? null)
  }

  async function split() {
    setError('')
    if (!file) {
      setError('Please choose a PDF file.')
      return
    }

    setIsWorking(true)
    try {
      const bytes = await file.arrayBuffer()
      const source = await PDFDocument.load(bytes)
      const pageIndices = source.getPageIndices()

      const zip = new JSZip()
      const base = safeBaseName(file.name)

      for (const pageIndex of pageIndices) {
        const out = await PDFDocument.create()
        const [page] = await out.copyPages(source, [pageIndex])
        out.addPage(page)
        const outBytes = await out.save()
        zip.file(`${base}-page-${pageIndex + 1}.pdf`, outBytes)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      await downloadBlob(zipBlob, `${base}-split.zip`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Split failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="split-pdf"
      title="Split PDF"
      subtitle="Split a PDF into one PDF per page (ZIP download)."
      trust={['Runs in your browser', 'No uploads by default', 'ZIP download']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      primaryActionLabel="Split & Download ZIP"
      primaryActionWorkingLabel="Splitting…"
      onPrimaryAction={split}
      primaryDisabled={!file || isWorking}
      meta={file ? file.name : 'No file selected'}
      feedback={error ? <div className="muted">{error}</div> : null}
    />
  )
}
