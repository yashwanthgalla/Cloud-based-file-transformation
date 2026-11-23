import { useMemo, useState } from 'react'
import ServicePage from '../components/ServicePage.jsx'

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export default function ProtectPdf() {
  const [file, setFile] = useState(null)
  const [password, setPassword] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const browserOnlyNote =
    'Adding PDF encryption/password protection is not available in browser-only mode yet.'

  const fileLabel = useMemo(() => {
    if (!file) return 'No file selected'
    const size = formatBytes(file.size)
    return size ? `${file.name} (${size})` : file.name
  }, [file])

  function onPickFiles(files) {
    setError('')
    setProgress('')
    setFile(files?.[0] ?? null)
  }

  async function protect() {
    setError('')
    setProgress('')

    if (!file) {
      setError('Please choose a PDF file.')
      return
    }
    if (!password) {
      setError('Please enter a password.')
      return
    }

    setIsWorking(true)
    try {
      setError(browserOnlyNote)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Protect failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="protect-pdf"
      title="Protect PDF"
      subtitle="Add a password to a PDF."
      trust={['Runs in your browser', 'No uploads by default', 'Feature availability depends on encryption support']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      actionLeft={
        <input
          className="textInput"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{ minWidth: 220 }}
        />
      }
      primaryActionLabel="Protect & Download"
      primaryActionWorkingLabel="Working…"
      onPrimaryAction={protect}
      primaryDisabled={!file || !password || isWorking}
      meta={fileLabel}
      feedback={
        <>
          {progress ? <div className="muted">{progress}</div> : null}
          {error ? <div className="muted">{error}</div> : null}
        </>
      }
    >
      <div className="muted">{browserOnlyNote}</div>
    </ServicePage>
  )
}
