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

export default function UnlockPdf() {
  const [file, setFile] = useState(null)
  const [password, setPassword] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const browserOnlyNote =
    'Unlocking encrypted PDFs requires PDF decryption support that is not available in browser-only mode yet.'

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

  async function unlock() {
    setError('')
    setProgress('')

    if (!file) {
      setError('Please choose a PDF file.')
      return
    }
    if (!password) {
      setError('Please enter the password.')
      return
    }

    setIsWorking(true)
    try {
      setError(browserOnlyNote)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unlock failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="unlock-pdf"
      title="Unlock PDF"
      subtitle="Remove PDF password restrictions."
      trust={['Runs in your browser', 'No uploads by default', 'Feature availability depends on decryption support']}
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
      primaryActionLabel="Unlock & Download"
      primaryActionWorkingLabel="Working…"
      onPrimaryAction={unlock}
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
