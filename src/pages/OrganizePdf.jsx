import { useMemo, useState } from 'react'
import { degrees, PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../utils/download.js'
import { safeBaseName } from '../utils/filename.js'
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

function parsePagesSpec(spec, maxPages) {
  const raw = (spec || '').trim()
  if (!raw) return []

  const indices = new Set()
  const parts = raw
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  for (const part of parts) {
    const range = part.split('-').map((x) => x.trim())
    if (range.length === 1) {
      const n = Number(range[0])
      if (!Number.isInteger(n)) throw new Error(`Invalid page number: ${part}`)
      if (n < 1 || n > maxPages) throw new Error(`Page out of range: ${n}`)
      indices.add(n - 1)
      continue
    }
    if (range.length === 2) {
      const start = Number(range[0])
      const end = Number(range[1])
      if (!Number.isInteger(start) || !Number.isInteger(end)) throw new Error(`Invalid range: ${part}`)
      if (start < 1 || end < 1 || start > maxPages || end > maxPages) throw new Error(`Range out of bounds: ${part}`)
      const lo = Math.min(start, end)
      const hi = Math.max(start, end)
      for (let n = lo; n <= hi; n++) indices.add(n - 1)
      continue
    }
    throw new Error(`Invalid token: ${part}`)
  }

  return Array.from(indices)
}

function makeDefaultOrder(pageCount) {
  return Array.from({ length: pageCount }, (_, i) => i + 1).join(',')
}

export default function OrganizePdf() {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [orderSpec, setOrderSpec] = useState('')
  const [deleteSpec, setDeleteSpec] = useState('')
  const [rotate90Spec, setRotate90Spec] = useState('')
  const [rotate180Spec, setRotate180Spec] = useState('')
  const [rotate270Spec, setRotate270Spec] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  const [previewBlob, setPreviewBlob] = useState(null)
  const [previewName, setPreviewName] = useState('')

  const fileLabel = useMemo(() => {
    if (!file) return 'No file selected'
    const size = formatBytes(file.size)
    return size ? `${file.name} (${size})` : file.name
  }, [file])

  async function onPickFiles(files) {
    const picked = files?.[0] ?? null
    setError('')
    setFile(picked)
    setPageCount(0)
    setOrderSpec('')
    setDeleteSpec('')
    setRotate90Spec('')
    setRotate180Spec('')
    setRotate270Spec('')
    setPreviewBlob(null)
    setPreviewName('')

    if (!picked) return

    try {
      const bytes = await picked.arrayBuffer()
      const pdf = await PDFDocument.load(bytes)
      const count = pdf.getPageCount()
      setPageCount(count)
      setOrderSpec(makeDefaultOrder(count))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read PDF.')
    }
  }

  async function downloadPreview() {
    if (!previewBlob || !previewName) return
    await downloadBlob(previewBlob, previewName)
  }

  function clearPreview() {
    setPreviewBlob(null)
    setPreviewName('')
  }

  async function apply() {
    setError('')
    if (!file) {
      setError('Please choose a PDF file.')
      return
    }

    setIsWorking(true)
    try {
      const bytes = await file.arrayBuffer()
      const source = await PDFDocument.load(bytes)
      const total = source.getPageCount()

      const deleted = new Set(parsePagesSpec(deleteSpec, total))
      const orderRaw = parsePagesSpec(orderSpec, total)

      const rotateMap = new Map()
      const r90 = new Set(parsePagesSpec(rotate90Spec, total))
      const r180 = new Set(parsePagesSpec(rotate180Spec, total))
      const r270 = new Set(parsePagesSpec(rotate270Spec, total))

      function applyRotation(indices, angle) {
        for (const idx of indices) {
          if (rotateMap.has(idx)) throw new Error('A page is listed in multiple rotation inputs.')
          rotateMap.set(idx, angle)
        }
      }

      applyRotation(r90, 90)
      applyRotation(r180, 180)
      applyRotation(r270, 270)

      let order = orderRaw
      if (order.length === 0) {
        order = Array.from({ length: total }, (_, i) => i)
      }

      const finalOrder = order.filter((i) => !deleted.has(i))
      if (finalOrder.length === 0) throw new Error('Nothing to export. Check your order/delete input.')

      const out = await PDFDocument.create()
      const copied = await out.copyPages(source, finalOrder)
      for (let i = 0; i < copied.length; i++) {
        const page = copied[i]
        const srcIndex = finalOrder[i]
        const angle = rotateMap.get(srcIndex)
        if (angle) page.setRotation(degrees(angle))
        out.addPage(page)
      }

      const outBytes = await out.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const base = safeBaseName(file.name)
      setPreviewBlob(blob)
      setPreviewName(`${base}-organized.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Organize failed. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <ServicePage
      slug="organize-pdf"
      title="Organize PDF"
      subtitle="Reorder, delete, and rotate pages, then export a new PDF."
      trust={['Runs in your browser', 'No uploads by default', 'Preview before download']}
      accept="application/pdf"
      dropTitle="Drop a PDF here"
      dropHint="or click to choose a PDF"
      onFiles={onPickFiles}
      isWorking={isWorking}
      primaryActionLabel="Apply & Preview"
      primaryActionWorkingLabel="Working…"
      onPrimaryAction={apply}
      primaryDisabled={!file || isWorking}
      meta={`${fileLabel}${pageCount ? ` • ${pageCount} page(s)` : ''}`}
      feedback={error ? <div className="muted">{error}</div> : null}
      preview={
        <PdfPreview
          blob={previewBlob}
          filename={previewName}
          title="Updated PDF"
          onDownload={downloadPreview}
          onClear={clearPreview}
        />
      }
    >
      <div className="stack">
        <label className="muted">
          Page order (comma-separated, supports ranges like 1-3)
          <input
            className="textInput"
            value={orderSpec}
            onChange={(e) => setOrderSpec(e.target.value)}
            placeholder={pageCount ? makeDefaultOrder(pageCount) : '1,2,3'}
            disabled={!file || isWorking}
          />
        </label>

        <label className="muted">
          Delete pages (optional, e.g. 2,4-5)
          <input
            className="textInput"
            value={deleteSpec}
            onChange={(e) => setDeleteSpec(e.target.value)}
            placeholder=""
            disabled={!file || isWorking}
          />
        </label>

        <div className="muted" style={{ fontWeight: 800 }}>
          Orientation (optional)
        </div>

        <label className="muted">
          Rotate pages 90° (e.g. 2,4-5)
          <input
            className="textInput"
            value={rotate90Spec}
            onChange={(e) => setRotate90Spec(e.target.value)}
            placeholder=""
            disabled={!file || isWorking}
          />
        </label>

        <label className="muted">
          Rotate pages 180°
          <input
            className="textInput"
            value={rotate180Spec}
            onChange={(e) => setRotate180Spec(e.target.value)}
            placeholder=""
            disabled={!file || isWorking}
          />
        </label>

        <label className="muted">
          Rotate pages 270°
          <input
            className="textInput"
            value={rotate270Spec}
            onChange={(e) => setRotate270Spec(e.target.value)}
            placeholder=""
            disabled={!file || isWorking}
          />
        </label>

        <div className="muted">Tip: If order is empty, it keeps the original order.</div>
      </div>
    </ServicePage>
  )
}
