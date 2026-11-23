const USERS_KEY = 'dammypdf_users'
const RESET_KEY = 'dammypdf_resets'
const RESET_CODE_KEY = 'dammypdf_reset_codes'
const SESSION_KEY = 'dammypdf_session'

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

async function sha256Hex(input) {
  const text = String(input ?? '')
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(text)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Fallback (not cryptographically strong) for very old environments
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return String(h)
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function readSession() {
  return readJson(SESSION_KEY, null)
}

function writeSession(session, remember) {
  // If remember=false, store in sessionStorage so it clears on tab close.
  const raw = JSON.stringify(session)
  if (remember) {
    localStorage.setItem(SESSION_KEY, raw)
    sessionStorage.removeItem(SESSION_KEY)
  } else {
    sessionStorage.setItem(SESSION_KEY, raw)
    localStorage.removeItem(SESSION_KEY)
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

function readSessionAny() {
  try {
    const s1 = sessionStorage.getItem(SESSION_KEY)
    if (s1) return JSON.parse(s1)
  } catch {
    // ignore
  }
  return readSession()
}

function safeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function random6DigitCode() {
  // 000000 - 999999, always 6 digits
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
}

function codeTtlMs() {
  return 10 * 60 * 1000
}

function resendCooldownMs() {
  return 30 * 1000
}

export async function signup({ email, password, remember }) {
  const normalized = normalizeEmail(email)
  if (!normalized) throw new Error('email is required')
  if (!password) throw new Error('password is required')
  if (String(password).length < 6) throw new Error('password must be at least 6 characters')

  const users = readJson(USERS_KEY, [])
  if (users.some((u) => u.email === normalized)) throw new Error('email already exists')

  const hash = await sha256Hex(password)
  const user = { id: safeId(), email: normalized, hash, createdAt: new Date().toISOString() }
  users.push(user)
  writeJson(USERS_KEY, users)

  writeSession({ id: user.id, email: user.email }, Boolean(remember))
  return { user: { id: user.id, email: user.email } }
}

export async function login({ email, password, remember }) {
  const normalized = normalizeEmail(email)
  if (!normalized) throw new Error('email is required')
  if (!password) throw new Error('password is required')

  const users = readJson(USERS_KEY, [])
  const user = users.find((u) => u.email === normalized)
  if (!user) throw new Error('invalid email or password')

  const hash = await sha256Hex(password)
  if (user.hash !== hash) throw new Error('invalid email or password')

  writeSession({ id: user.id, email: user.email }, Boolean(remember))
  return { user: { id: user.id, email: user.email } }
}

export async function logout() {
  clearSession()
  return { ok: true }
}

export async function me() {
  const session = readSessionAny()
  if (!session?.email) throw new Error('not authenticated')
  return { user: { id: session.id, email: session.email } }
}

export async function forgotPassword({ email }) {
  const normalized = normalizeEmail(email)
  if (!normalized) throw new Error('email is required')

  const users = readJson(USERS_KEY, [])
  const user = users.find((u) => u.email === normalized)

  // Always return ok to avoid account enumeration
  if (!user) return { ok: true }

  const token = `${safeId()}${safeId()}`
  const tokenHash = await sha256Hex(token)
  const resets = readJson(RESET_KEY, {})

  resets[tokenHash] = {
    userId: user.id,
    expiresAt: Date.now() + 15 * 60 * 1000,
  }

  writeJson(RESET_KEY, resets)
  return { ok: true, resetUrl: `/reset-password?token=${encodeURIComponent(token)}` }
}

export async function requestPasswordResetCode({ email }) {
  const normalized = normalizeEmail(email)
  if (!normalized) throw new Error('email is required')

  const users = readJson(USERS_KEY, [])
  const user = users.find((u) => u.email === normalized)

  // Always return ok to avoid account enumeration
  if (!user) return { ok: true }

  const codes = readJson(RESET_CODE_KEY, {})
  const now = Date.now()
  const existing = codes[normalized]
  if (existing?.nextResendAt && now < existing.nextResendAt) {
    const waitMs = existing.nextResendAt - now
    const waitS = Math.max(1, Math.ceil(waitMs / 1000))
    throw new Error(`Please wait ${waitS}s before resending the code.`)
  }

  const code = random6DigitCode()
  const salt = safeId()
  const codeHash = await sha256Hex(`${salt}:${code}`)

  const expiresAt = now + codeTtlMs()
  const nextResendAt = now + resendCooldownMs()

  codes[normalized] = {
    userId: user.id,
    salt,
    codeHash,
    expiresAt,
    nextResendAt,
  }
  writeJson(RESET_CODE_KEY, codes)

  // Dev-only convenience: surface code so you can test the UI.
  // In production you should send this code via email/SMS.
  return { ok: true, expiresAt, nextResendAt, devCode: code }
}

export async function getPasswordResetCodeStatus({ email }) {
  const normalized = normalizeEmail(email)
  if (!normalized) throw new Error('email is required')
  const codes = readJson(RESET_CODE_KEY, {})
  const entry = codes[normalized]
  if (!entry) return { ok: true, hasCode: false }
  return {
    ok: true,
    hasCode: true,
    expiresAt: entry.expiresAt,
    nextResendAt: entry.nextResendAt,
  }
}

export async function verifyPasswordResetCode({ email, code }) {
  const normalized = normalizeEmail(email)
  const rawCode = String(code ?? '').trim()
  if (!normalized) throw new Error('email is required')
  if (!rawCode) throw new Error('code is required')
  if (!/^[0-9]{6}$/.test(rawCode)) throw new Error('Enter the 6-digit code.')

  const codes = readJson(RESET_CODE_KEY, {})
  const entry = codes[normalized]
  if (!entry) throw new Error('Invalid or expired code.')
  if (Date.now() > entry.expiresAt) {
    delete codes[normalized]
    writeJson(RESET_CODE_KEY, codes)
    throw new Error('Invalid or expired code.')
  }

  const inputHash = await sha256Hex(`${entry.salt}:${rawCode}`)
  if (inputHash !== entry.codeHash) throw new Error('Invalid or expired code.')

  // Code verified: exchange for a reset token compatible with resetPassword()
  const token = `${safeId()}${safeId()}`
  const tokenHash = await sha256Hex(token)
  const resets = readJson(RESET_KEY, {})
  resets[tokenHash] = {
    userId: entry.userId,
    expiresAt: Date.now() + 15 * 60 * 1000,
  }
  writeJson(RESET_KEY, resets)

  // one-time code
  delete codes[normalized]
  writeJson(RESET_CODE_KEY, codes)

  return { ok: true, token, resetUrl: `/reset-password?token=${encodeURIComponent(token)}` }
}

export async function resetPassword({ token, password }) {
  if (!token) throw new Error('Missing reset token.')
  if (!password) throw new Error('Please enter a new password.')
  if (String(password).length < 6) throw new Error('password must be at least 6 characters')

  const tokenHash = await sha256Hex(token)
  const resets = readJson(RESET_KEY, {})
  const entry = resets[tokenHash]
  if (!entry) throw new Error('Invalid or expired reset token.')
  if (Date.now() > entry.expiresAt) {
    delete resets[tokenHash]
    writeJson(RESET_KEY, resets)
    throw new Error('Invalid or expired reset token.')
  }

  const users = readJson(USERS_KEY, [])
  const idx = users.findIndex((u) => u.id === entry.userId)
  if (idx < 0) throw new Error('Invalid or expired reset token.')

  users[idx] = { ...users[idx], hash: await sha256Hex(password) }
  writeJson(USERS_KEY, users)

  delete resets[tokenHash]
  writeJson(RESET_KEY, resets)

  return { ok: true }
}
