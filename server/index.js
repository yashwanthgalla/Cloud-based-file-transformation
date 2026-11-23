import cors from 'cors'
import express from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import process from 'node:process'
import { spawn } from 'node:child_process'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const app = express()
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

const AUTH_COOKIE = 'cid_auth'
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-only-secret-change-me'
const USERS_FILE = path.join(process.cwd(), 'server', 'users.json')

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const ONE_DAY_S = 24 * 60 * 60

async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeUsers(users) {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true })
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
}

function signToken(user, expiresInSeconds) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    AUTH_SECRET,
    { expiresIn: expiresInSeconds },
  )
}

function setAuthCookie(res, token, maxAgeMs) {
  const opts = {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
  }
  if (typeof maxAgeMs === 'number') opts.maxAge = maxAgeMs
  res.cookie(AUTH_COOKIE, token, opts)
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, { path: '/' })
}

function getAuthUser(req) {
  const token = req.cookies?.[AUTH_COOKIE]
  if (!token) return null
  try {
    const payload = jwt.verify(token, AUTH_SECRET)
    if (!payload || typeof payload !== 'object') return null
    return {
      id: payload.sub,
      email: payload.email,
    }
  } catch {
    return null
  }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } })

function getBinFromEnvOrPath(envKey, fallback) {
  return process.env[envKey] || fallback
}

function spawnAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, windowsHide: true })
    let stdout = ''
    let stderr = ''

    if (child.stdout) child.stdout.on('data', (d) => (stdout += d.toString()))
    if (child.stderr) child.stderr.on('data', (d) => (stderr += d.toString()))

    child.on('error', (err) => reject(err))
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}\n${stderr || stdout}`))
    })
  })
}

async function withTempDir(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'convpdf-'))
  try {
    return await fn(dir)
  } finally {
    try {
      await fs.rm(dir, { recursive: true, force: true })
    } catch {
      // ignore cleanup
    }
  }
}

function detectSoffice() {
  const env = process.env.SOFFICE_PATH
  if (env) return env
  return 'soffice'
}

function detectQpdf() {
  const env = process.env.QPDF_PATH
  if (env) return env
  return 'qpdf'
}

function detectGhostscript() {
  const env = process.env.GS_PATH
  if (env) return env
  // common on Windows
  return 'gswin64c'
}

app.get('/api/health', async (_req, res) => {
  const soffice = detectSoffice()
  const qpdf = detectQpdf()
  const gs = detectGhostscript()

  async function ok(cmd) {
    try {
      await spawnAsync(cmd, ['--version'])
      return true
    } catch {
      return false
    }
  }

  const [sofficeOk, qpdfOk, gsOk] = await Promise.all([ok(soffice), ok(qpdf), ok(gs)])

  res.json({
    ok: true,
    binaries: {
      soffice: { cmd: soffice, ok: sofficeOk },
      qpdf: { cmd: qpdf, ok: qpdfOk },
      ghostscript: { cmd: gs, ok: gsOk },
    },
  })
})

app.get('/api/auth/me', async (req, res) => {
  const user = getAuthUser(req)
  if (!user) return res.status(401).json({ error: 'not authenticated' })
  res.json({ ok: true, user })
})

app.post('/api/auth/logout', async (_req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

app.post('/api/auth/signup', async (req, res) => {
  const email = (req.body?.email ?? '').toString().trim().toLowerCase()
  const password = (req.body?.password ?? '').toString()
  const remember = Boolean(req.body?.remember)

  if (!email) return res.status(400).json({ error: 'email is required' })
  if (!password) return res.status(400).json({ error: 'password is required' })
  if (password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' })

  const users = await readUsers()
  const existing = users.find((u) => u.email === email)
  if (existing) return res.status(409).json({ error: 'email already exists' })

  const hash = await bcrypt.hash(password, 10)
  const user = {
    id: cryptoRandomId(),
    email,
    hash,
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  await writeUsers(users)

  const maxAgeMs = remember ? 30 * ONE_DAY_MS : undefined
  const expS = remember ? 30 * ONE_DAY_S : 1 * ONE_DAY_S
  const token = signToken(user, expS)
  setAuthCookie(res, token, maxAgeMs)

  res.json({ ok: true, user: { id: user.id, email: user.email } })
})

app.post('/api/auth/login', async (req, res) => {
  const email = (req.body?.email ?? '').toString().trim().toLowerCase()
  const password = (req.body?.password ?? '').toString()
  const remember = Boolean(req.body?.remember)

  if (!email) return res.status(400).json({ error: 'email is required' })
  if (!password) return res.status(400).json({ error: 'password is required' })

  const users = await readUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return res.status(401).json({ error: 'invalid email or password' })

  const ok = await bcrypt.compare(password, user.hash)
  if (!ok) return res.status(401).json({ error: 'invalid email or password' })

  const maxAgeMs = remember ? 30 * ONE_DAY_MS : undefined
  const expS = remember ? 30 * ONE_DAY_S : 1 * ONE_DAY_S
  const token = signToken(user, expS)
  setAuthCookie(res, token, maxAgeMs)

  res.json({ ok: true, user: { id: user.id, email: user.email } })
})

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = (req.body?.email ?? '').toString().trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'email is required' })

  const users = await readUsers()
  const user = users.find((u) => u.email === email)

  // Always respond ok to avoid account enumeration.
  if (!user) return res.json({ ok: true })

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = Date.now() + 15 * 60 * 1000

  user.reset = {
    tokenHash,
    expiresAt,
  }
  await writeUsers(users)

  const resetUrl = `/reset-password?token=${rawToken}`

  // eslint-disable-next-line no-console
  console.log(`Password reset link for ${email}: ${resetUrl}`)

  res.json({ ok: true, resetUrl })
})

app.post('/api/auth/reset-password', async (req, res) => {
  const token = (req.body?.token ?? '').toString().trim()
  const password = (req.body?.password ?? '').toString()

  if (!token) return res.status(400).json({ error: 'token is required' })
  if (!password) return res.status(400).json({ error: 'password is required' })
  if (password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' })

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const users = await readUsers()
  const user = users.find((u) => u.reset?.tokenHash === tokenHash)
  if (!user) return res.status(400).json({ error: 'invalid or expired token' })
  if (!user.reset?.expiresAt || Date.now() > user.reset.expiresAt) {
    user.reset = null
    await writeUsers(users)
    return res.status(400).json({ error: 'invalid or expired token' })
  }

  user.hash = await bcrypt.hash(password, 10)
  user.reset = null
  await writeUsers(users)

  clearAuthCookie(res)
  res.json({ ok: true })
})

function cryptoRandomId() {
  // Avoid importing node:crypto just for randomUUID; this is fine for demo auth.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Office -> PDF (DOC/DOCX, XLS/XLSX, PPT/PPTX)
app.post('/api/office-to-pdf', upload.single('file'), async (req, res) => {
  const file = req.file
  if (!file) return res.status(400).json({ error: 'file is required' })

  const soffice = detectSoffice()

  await withTempDir(async (dir) => {
    const inputPath = path.join(dir, file.originalname)
    await fs.writeFile(inputPath, file.buffer)

    // LibreOffice writes output file based on input name.
    await spawnAsync(soffice, ['--headless', '--nologo', '--nolockcheck', '--nodefault', '--nofirststartwizard', '--convert-to', 'pdf', '--outdir', dir, inputPath])

    const base = path.parse(file.originalname).name
    const outPath = path.join(dir, `${base}.pdf`)
    const outBytes = await fs.readFile(outPath)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${base}.pdf"`)
    res.send(outBytes)
  }).catch((e) => {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  })
})

// Protect PDF (requires qpdf installed)
app.post('/api/pdf/protect', upload.single('file'), async (req, res) => {
  const file = req.file
  const password = (req.body?.password ?? '').toString()
  if (!file) return res.status(400).json({ error: 'file is required' })
  if (!password) return res.status(400).json({ error: 'password is required' })

  const qpdf = detectQpdf()

  await withTempDir(async (dir) => {
    const inPath = path.join(dir, 'input.pdf')
    const outPath = path.join(dir, 'protected.pdf')
    await fs.writeFile(inPath, file.buffer)

    // Use same password for user/owner. AES-256.
    await spawnAsync(qpdf, ['--encrypt', password, password, '256', '--', inPath, outPath])

    const outBytes = await fs.readFile(outPath)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="protected.pdf"')
    res.send(outBytes)
  }).catch((e) => {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  })
})

// Unlock PDF (requires qpdf installed)
app.post('/api/pdf/unlock', upload.single('file'), async (req, res) => {
  const file = req.file
  const password = (req.body?.password ?? '').toString()
  if (!file) return res.status(400).json({ error: 'file is required' })
  if (!password) return res.status(400).json({ error: 'password is required' })

  const qpdf = detectQpdf()

  await withTempDir(async (dir) => {
    const inPath = path.join(dir, 'input.pdf')
    const outPath = path.join(dir, 'unlocked.pdf')
    await fs.writeFile(inPath, file.buffer)

    await spawnAsync(qpdf, [`--password=${password}`, '--decrypt', '--', inPath, outPath])

    const outBytes = await fs.readFile(outPath)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="unlocked.pdf"')
    res.send(outBytes)
  }).catch((e) => {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  })
})

// PDF -> PDF/A (requires Ghostscript installed)
app.post('/api/pdf/pdfa', upload.single('file'), async (req, res) => {
  const file = req.file
  if (!file) return res.status(400).json({ error: 'file is required' })

  const levelRaw = (req.body?.level ?? '').toString().trim()
  const level = levelRaw === '1' ? 1 : 2

  const gs = detectGhostscript()

  await withTempDir(async (dir) => {
    const inPath = path.join(dir, 'input.pdf')
    const outPath = path.join(dir, 'pdfa.pdf')
    await fs.writeFile(inPath, file.buffer)

    // Basic PDF/A conversion attempt.
    // Notes:
    // - PDF/A output can still fail depending on source PDF content.
    // - We try to encourage deterministic color management via an sRGB profile.
    await spawnAsync(gs, [
      `-dPDFA=${level}`,
      '-dBATCH',
      '-dNOPAUSE',
      '-dNOOUTERSAVE',
      '-sDEVICE=pdfwrite',
      '-sProcessColorModel=DeviceRGB',
      '-sColorConversionStrategy=RGB',
      '-dUseCIEColor',
      '-sDefaultRGBProfile=srgb.icc',
      '-sOutputICCProfile=srgb.icc',
      '-sPDFACompatibilityPolicy=1',
      `-sOutputFile=${outPath}`,
      inPath,
    ])

    const outBytes = await fs.readFile(outPath)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="pdfa.pdf"')
    res.send(outBytes)
  }).catch((e) => {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  })
})

const port = Number(process.env.PORT || 8787)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${port}`)
})
