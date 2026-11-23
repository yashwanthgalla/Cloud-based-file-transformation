import { useMemo, useState } from 'react'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
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

export default function PdfToWord() {
  const [file, setFile] = useState(null)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const fileLabel = useMemo(() => {
    if (!file) return 'No file selected'
    const size = formatBytes(file.size)
    return size ? `${file.name} (${size})` : file.name
  }, [file])

  async function convert() {
    setError('')
    setProgress('')

    if (!file) {
      setError('Please choose a PDF file.')
      return
    }

    setIsWorking(true)
    try {
      const bytes = await file.arrayBuffer()
      const pdf = await getDocument({ data: bytes }).promise

      const paragraphs = []

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setProgress(`Extracting text ${pageNumber}/${pdf.numPages}…`)
        const page = await pdf.getPage(pageNumber)
        const textContent = await page.getTextContent()
        const text = (textContent.items || [])
          .map((it) => (typeof it.str === 'string' ? it.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()

        paragraphs.push(new Paragraph({ children: [new TextRun({ text: `Page ${pageNumber}`, bold: true })] }))
        paragraphs.push(new Paragraph(text || ''))
        paragraphs.push(new Paragraph(''))
      }

      const doc = new Document({ sections: [{ children: paragraphs }] })
      const out = await Packer.toBlob(doc)

      const base = safeBaseName(file.name)
      await downloadBlob(out, `${base}.docx`)
      setProgress('Done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Convert failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="pdf-to-word"
      title="PDF to Word"
      subtitle="Extract text and download a DOCX (layout may differ)."
      trust={['Runs in your browser', 'No uploads by default', 'Best for text-first PDFs']}
      accept="application/pdf"
      dropTitle="Drop your PDF here"
      dropHint="or click to choose a PDF file"
      onFiles={(picked) => {
        setError('')
        setProgress('')
        setFile(picked?.[0] ?? null)
      }}
      isWorking={isWorking}
      primaryActionLabel="Convert & Download DOCX"
      primaryActionWorkingLabel="Working…"
      onPrimaryAction={convert}
      primaryDisabled={!file || isWorking}
      meta={fileLabel}
      feedback={
        <>
          {progress ? <div className="muted">{progress}</div> : null}
          {error ? <div className="muted">{error}</div> : null}
        </>
      }
    />
  )
}
