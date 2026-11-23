import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import {
  getPasswordResetCodeStatus,
  requestPasswordResetCode,
  verifyPasswordResetCode,
} from '../utils/localAuth.js'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function maskEmail(email) {
  const raw = String(email || '').trim()
  const at = raw.indexOf('@')
  if (at <= 0) return raw
  const name = raw.slice(0, at)
  const domain = raw.slice(at + 1)
  const [d1, ...rest] = domain.split('.')
  const tld = rest.length ? `.${rest.join('.')}` : ''
  const maskedName = name.length <= 2 ? `${name[0] ?? ''}*` : `${name[0]}***${name[name.length - 1]}`
  const maskedDomain = d1 ? `${d1[0]}***${d1[d1.length - 1] ?? ''}` : '***'
  return `${maskedName}@${maskedDomain}${tld}`
}

function formatMmSs(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function VerifyResetCode() {
  const query = useQuery()
  const navigate = useNavigate()

  const email = (query.get('email') || '').trim().toLowerCase()
  const masked = useMemo(() => maskEmail(email), [email])

  const [digits, setDigits] = useState(() => Array.from({ length: 6 }).map(() => ''))
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [devCode, setDevCode] = useState('')

  const [expiresAt, setExpiresAt] = useState(0)
  const [nextResendAt, setNextResendAt] = useState(0)
  const [now, setNow] = useState(Date.now())

  const inputRefs = useRef([])
  const [focusedIndex, setFocusedIndex] = useState(0)

  const code = digits.join('')
  const canVerify = digits.every((d) => d.length === 1) && !isWorking
  const canResend = !isWorking && (!nextResendAt || Date.now() >= nextResendAt)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    // Helpful on mobile: brings up the numeric keyboard.
    focusIndex(0)
    setFocusedIndex(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadStatus() {
      if (!email) return
      try {
        const status = await getPasswordResetCodeStatus({ email })
        if (cancelled) return
        if (status?.hasCode) {
          if (status.expiresAt) setExpiresAt(Number(status.expiresAt))
          if (status.nextResendAt) setNextResendAt(Number(status.nextResendAt))
        }
      } catch {
        // ignore
      }
    }

    loadStatus()
    return () => {
      cancelled = true
    }
  }, [email])

  function focusIndex(idx) {
    const el = inputRefs.current[idx]
    if (el && typeof el.focus === 'function') el.focus()
  }

  function updateDigit(idx, nextDigit) {
    setError('')
    setMessage('')
    setDevCode('')

    const cleaned = String(nextDigit ?? '').replace(/\D/g, '')

    // If the user pasted/typed multiple digits into a single box, spread them.
    if (cleaned.length > 1) {
      setDigits((prev) => {
        const copy = [...prev]
        let writeAt = idx
        for (const ch of cleaned) {
          if (writeAt > 5) break
          copy[writeAt] = ch
          writeAt++
        }
        return copy
      })

      const nextFocus = Math.min(5, idx + cleaned.length)
      focusIndex(nextFocus)
      return
    }

    const single = cleaned.slice(0, 1)
    setDigits((prev) => {
      const copy = [...prev]
      copy[idx] = single
      return copy
    })

    if (single && idx < 5) focusIndex(idx + 1)
  }

  function onKeyDown(idx, e) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      setError('')
      setMessage('')
      setDevCode('')

      setDigits((prev) => {
        const copy = [...prev]
        if (copy[idx]) {
          copy[idx] = ''
          return copy
        }
        const prevIdx = Math.max(0, idx - 1)
        copy[prevIdx] = ''
        // focus previous after state update
        queueMicrotask(() => focusIndex(prevIdx))
        return copy
      })
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusIndex(Math.max(0, idx - 1))
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusIndex(Math.min(5, idx + 1))
    }
  }

  function onPaste(idx, e) {
    const text = e.clipboardData?.getData('text')
    if (!text) return
    const cleaned = String(text).replace(/\D/g, '').slice(0, 6)
    if (!cleaned) return
    e.preventDefault()
    updateDigit(idx, cleaned)
  }

  async function onVerify(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!email) {
      setError('Missing email. Please restart the reset flow.')
      return
    }

    if (!digits.every((d) => d.length === 1)) {
      setError('Enter the 6-digit code.')
      return
    }

    setIsWorking(true)
    try {
      const data = await verifyPasswordResetCode({ email, code })
      navigate(data.resetUrl)
    } catch (err) {
      setError(err?.message ? String(err.message) : 'Verification failed.')
    } finally {
      setIsWorking(false)
    }
  }

  async function onResend() {
    setError('')
    setMessage('')
    setDevCode('')

    if (!email) {
      setError('Missing email. Please restart the reset flow.')
      return
    }

    setIsWorking(true)
    try {
      const data = await requestPasswordResetCode({ email })
      setMessage('If an account exists for that email, a new code was generated.')
      if (data?.expiresAt) setExpiresAt(Number(data.expiresAt))
      if (data?.nextResendAt) setNextResendAt(Number(data.nextResendAt))
      if (data?.devCode) setDevCode(String(data.devCode))
    } catch (err) {
      setError(err?.message ? String(err.message) : 'Resend failed.')
    } finally {
      setIsWorking(false)
    }
  }

  const resendIn = nextResendAt ? Math.max(0, nextResendAt - now) : 0
  const expiresIn = expiresAt ? Math.max(0, expiresAt - now) : 0

  return (
    <AuthShell
      title="Enter OTP Code"
      subtitle={
        email
          ? `Check your inbox. We generated a 6-digit code for ${masked}. Enter it to continue.`
          : 'Enter the 6-digit code to continue.'
      }
    >
      <form className="authForm" onSubmit={onVerify}>
        <div className="otpRow" role="group" aria-label="6-digit code">
          {Array.from({ length: 6 }).map((_, idx) => {
            const digit = digits[idx] || ''
            const isActive = idx === focusedIndex
            const filled = Boolean(digit)
            const cls = ['otpBox', 'otpBoxInput', filled ? 'otpBoxFilled' : '', isActive ? 'otpBoxActive' : '']
              .filter(Boolean)
              .join(' ')

            return (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el
                }}
                className={cls}
                value={digit}
                onFocus={() => setFocusedIndex(idx)}
                onChange={(e) => updateDigit(idx, e.target.value)}
                onKeyDown={(e) => onKeyDown(idx, e)}
                onPaste={(e) => onPaste(idx, e)}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${idx + 1}`}
              />
            )
          })}
        </div>

        <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span>
            {expiresAt ? (expiresIn > 0 ? `Code expires in ${formatMmSs(expiresIn)}` : 'Code expired') : ''}
          </span>
          <span>
            {nextResendAt && resendIn > 0 ? `Resend code in ${formatMmSs(resendIn)}` : ''}
          </span>
        </div>

        {error ? (
          <div className="authError" role="alert" aria-live="polite">
            {error}
          </div>
        ) : null}

        {message ? <div className="muted">{message}</div> : null}

        {devCode ? <div className="muted">Dev code: {devCode}</div> : null}

        <button className="primaryBtn authSubmit" type="submit" disabled={!canVerify}>
          <span className="material-symbols-rounded authIcon" aria-hidden="true">
            check_circle
          </span>
          {isWorking ? 'Working…' : 'Verify'}
        </button>

        <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <div className="muted">
            {nextResendAt && resendIn > 0
              ? `You can resend the code in ${Math.max(1, Math.ceil(resendIn / 1000))} seconds.`
              : 'Didn’t get the code?'}
          </div>
          <button className="textLink" type="button" onClick={onResend} disabled={!canResend}>
            <span className="material-symbols-rounded authIcon" aria-hidden="true">
              refresh
            </span>
            Resend code
          </button>
        </div>

        <div className="authMeta authMetaColumn">
          <Link className="textLink" to="/forgot-password">
            Back
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}
