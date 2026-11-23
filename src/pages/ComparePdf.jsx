import { useMemo, useState } from 'react'
import JSZip from 'jszip'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
import FileDropzone from '../components/FileDropzone.jsx'
import ServicePage from '../components/ServicePage.jsx'

GlobalWorkerOptions.workerSrc = workerSrc

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

async function extractTextByPage(file) {
  const bytes = await file.arrayBuffer()
  const pdf = await getDocument({ data: bytes }).promise
  const pages = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const text = (textContent.items || [])
      .map((it) => (typeof it.str === 'string' ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    pages.push(text)
  }

  return pages
}

export default function ComparePdf() {
  const [a, setA] = useState(null)
  const [b, setB] = useState(null)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  const aLabel = useMemo(() => {
    if (!a) return 'First PDF not selected'
    const size = formatBytes(a.size)
    return size ? `${a.name} (${size})` : a.name
  }, [a])

  const bLabel = useMemo(() => {
    if (!b) return 'Second PDF not selected'
    const size = formatBytes(b.size)
    return size ? `${b.name} (${size})` : b.name
  }, [b])

  function onPickA(files) {
    setError('')
    setResult('')
    setA(files?.[0] ?? null)
  }

  function onPickB(files) {
    setError('')
    setResult('')
    setB(files?.[0] ?? null)
  }

  async function compare() {
    setError('')
    setResult('')
    if (!a || !b) {
      setError('Please choose both PDF files.')
      return
    }

    setIsWorking(true)
    try {
      const [pagesA, pagesB] = await Promise.all([extractTextByPage(a), extractTextByPage(b)])

      const maxPages = Math.max(pagesA.length, pagesB.length)
      const changedPages = []

      for (let i = 0; i < maxPages; i++) {
        const ta = pagesA[i] ?? ''
        const tb = pagesB[i] ?? ''
        if (ta !== tb) changedPages.push(i + 1)
      }

      const baseA = safeBaseName(a.name)
      const baseB = safeBaseName(b.name)
      const zip = new JSZip()

      const summary =
        changedPages.length === 0
          ? `PDFs look identical by extracted text. Pages compared: ${maxPages}.\n`
          : `Detected differences by extracted text. Changed pages: ${changedPages.join(', ')}\nPages compared: ${maxPages}.\n`

      zip.file('summary.txt', summary)
      zip.file(`${baseA}.txt`, pagesA.join('\n\n'))
      zip.file(`${baseB}.txt`, pagesB.join('\n\n'))

      const outZip = await zip.generateAsync({ type: 'blob' })
      await downloadBlob(outZip, `${baseA}-vs-${baseB}-compare.zip`)

      setResult(summary.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compare failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="compare-pdf"
      title="Compare PDF"
      subtitle="Compare extracted text and download a ZIP report."
      trust={['Runs in your browser', 'No uploads by default', 'Exports a ZIP report']}
      dropzone={
        <>
          <FileDropzone
            accept="application/pdf"
            title="Drop first PDF here"
            hint="or click to choose the first PDF"
            disabled={isWorking}
            onFiles={onPickA}
          />
          <FileDropzone
            accept="application/pdf"
            title="Drop second PDF here"
            hint="or click to choose the second PDF"
            disabled={isWorking}
            onFiles={onPickB}
          />
        </>
      }
      isWorking={isWorking}
      primaryActionLabel="Compare & Download Report"
      primaryActionWorkingLabel="Comparing…"
      onPrimaryAction={compare}
      primaryDisabled={!a || !b || isWorking}
      feedback={
        <>
          <div className="muted">{aLabel}</div>
          <div className="muted">{bLabel}</div>
          {result ? <div className="muted">{result}</div> : null}
          {error ? <div className="muted">{error}</div> : null}
        </>
      }
    >
      <div className="muted">Note: This compares extracted text (layout/graphics differences may not be detected).</div>
    </ServicePage>
  )
}
