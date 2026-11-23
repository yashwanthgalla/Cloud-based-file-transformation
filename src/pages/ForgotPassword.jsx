import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import { requestPasswordResetCode } from '../utils/localAuth.js'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [message, setMessage] = useState('')
  const [devCode, setDevCode] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setDevCode('')

    if (!email) {
      setError('Please enter your email.')
      return
    }

    setIsWorking(true)
    try {
      const data = await requestPasswordResetCode({ email })

      setMessage('If an account exists for that email, a verification code has been generated.')
      if (data?.devCode) setDevCode(String(data.devCode))

      navigate(`/verify-reset-code?email=${encodeURIComponent(String(email).trim().toLowerCase())}`)
    } catch (err) {
      setError(err?.message ? String(err.message) : 'Request failed.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <AuthShell title="Forgot Password?" subtitle="Enter your email address to get a verification code." >
      <form className="authForm" onSubmit={onSubmit}>
          <label className="field">
            <span className="fieldLabel muted">Email</span>
            <input
              className="textInput"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          {error ? (
            <div className="authError" role="alert" aria-live="polite">
              {error}
            </div>
          ) : null}

          {message ? <div className="muted">{message}</div> : null}

          {devCode ? <div className="muted">Dev code: {devCode}</div> : null}

          <button className="primaryBtn authSubmit" type="submit" disabled={isWorking}>
            <span className="material-symbols-rounded authIcon" aria-hidden="true">
              mail
            </span>
            {isWorking ? 'Working…' : 'Send code'}
          </button>

          <div className="authMeta authMetaColumn">
            <Link className="textLink" to="/login">
              Back to login
            </Link>
          </div>
        </form>
    </AuthShell>
  )
}
