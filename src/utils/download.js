function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function sanitizeFilename(name) {
  const cleaned = String(name || '')
    .replace(/[\\/]/g, '-')
    .replace(/[:*?"<>|]/g, '-')
    .trim()
  return cleaned || 'download'
}

function getExtension(filename) {
  const base = String(filename || '').trim()
  const lastDot = base.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === base.length - 1) return ''
  return base.slice(lastDot)
}

let renameQueue = Promise.resolve()

function enqueueRenamePrompt(fn) {
  const next = renameQueue.then(fn, fn)
  renameQueue = next.then(
    () => {},
    () => {},
  )
  return next
}

function showRenameModal(defaultName) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'modalOverlay'

    const panel = document.createElement('div')
    panel.className = 'modalPanel'
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-modal', 'true')
    panel.setAttribute('aria-labelledby', 'rename-title')

    const title = document.createElement('div')
    title.className = 'modalTitle'
    title.id = 'rename-title'
    title.textContent = 'Rename file'

    const hint = document.createElement('div')
    hint.className = 'muted'
    hint.textContent = 'Choose the name for the downloaded file.'

    const input = document.createElement('input')
    input.className = 'textInput'
    input.type = 'text'
    input.value = defaultName
    input.autocomplete = 'off'

    const actions = document.createElement('div')
    actions.className = 'modalActions'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'dangerBtn'
    cancelBtn.type = 'button'
    cancelBtn.textContent = 'Cancel'

    const saveBtn = document.createElement('button')
    saveBtn.className = 'primaryBtn'
    saveBtn.type = 'button'
    saveBtn.textContent = 'Save'

    actions.append(cancelBtn, saveBtn)
    panel.append(title, hint, input, actions)
    overlay.append(panel)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.appendChild(overlay)

    function cleanup() {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      overlay.remove()
    }

    function close(value) {
      cleanup()
      resolve(value)
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close(null)
        return
      }

      if (e.key === 'Enter') {
        if (document.activeElement === input) {
          e.preventDefault()
          close(input.value)
        }
      }
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null)
    })
    cancelBtn.addEventListener('click', () => close(null))
    saveBtn.addEventListener('click', () => close(input.value))
    document.addEventListener('keydown', onKeyDown)

    queueMicrotask(() => {
      input.focus()
      input.select()
    })
  })
}

/**
 * Downloads a Blob with a consistent UX:
 * - waits 2 seconds by default (to show “processing” state)
 * - prompts for an output filename by default
 */
export async function downloadBlob(blob, filename, options = {}) {
  const { delayMs = 2000, promptForName = true } = options

  let finalName = sanitizeFilename(filename)
  if (promptForName) {
    const ext = getExtension(finalName)
    const typed = await enqueueRenamePrompt(() => showRenameModal(finalName))
    if (typed === null) return
    const cleaned = sanitizeFilename(typed)
    finalName = ext && !cleaned.toLowerCase().endsWith(ext.toLowerCase()) ? `${cleaned}${ext}` : cleaned
  }

  if (delayMs > 0) await sleep(delayMs)

  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = finalName
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
