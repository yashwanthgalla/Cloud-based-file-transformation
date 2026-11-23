import { useMemo, useState } from 'react'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
import ServicePage from '../components/ServicePage.jsx'

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

function acceptFor(kind) {
  if (kind === 'word') return '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (kind === 'excel') return '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  return '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'
}

function titleFor(kind) {
  if (kind === 'word') return 'Word to PDF'
  if (kind === 'excel') return 'Excel to PDF'
  return 'PowerPoint to PDF'
}

export default function OfficeToPdf({ kind }) {
  const [file, setFile] = useState(null)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const serverBackedNote =
    'Conversion runs on the server using LibreOffice. The server must have LibreOffice installed.'

  const fileLabel = useMemo(() => {
    if (!file) return 'No file selected'
    const size = formatBytes(file.size)
    return size ? `${file.name} (${size})` : file.name
  }, [file])

  async function convert() {
    setError('')
    setProgress('')

    if (!file) {
      setError('Please choose a file.')
      return
    }

    setIsWorking(true)
    try {
      setProgress('Uploading…')
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/office-to-pdf', {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        let message = `Convert failed (HTTP ${res.status}).`
        try {
          const data = await res.json()
          if (data?.error) message = String(data.error)
        } catch {
          // ignore
        }
        throw new Error(message)
      }

      setProgress('Converting…')
      const blob = await res.blob()
      const base = safeBaseName(file.name)

      // Try to honor server-provided filename if present.
      const disposition = res.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="?([^";]+)"?/i)
      const outName = match?.[1] ? match[1] : `${base}.pdf`

      await downloadBlob(blob, outName)
      setProgress('Done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Convert failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug={kind === 'word' ? 'word-to-pdf' : kind === 'excel' ? 'excel-to-pdf' : 'powerpoint-to-pdf'}
      title={titleFor(kind)}
      subtitle="Convert Office files to PDF (server-backed)."
      trust={['Runs on server', 'LibreOffice required', 'Downloads a PDF file']}
      accept={acceptFor(kind)}
      dropTitle="Drop your file here"
      dropHint="or click to choose a file"
      onFiles={(picked) => {
        setError('')
        setProgress('')
        setFile(picked?.[0] ?? null)
      }}
      isWorking={isWorking}
      primaryActionLabel="Convert & Download PDF"
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
      related={false}
    >
      <div className="muted">{serverBackedNote}</div>
    </ServicePage>
  )
}
