import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import { resetPassword } from '../utils/localAuth.js'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function ResetPassword() {
  const query = useQuery()
  const navigate = useNavigate()

  const token = query.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Missing reset token.')
      return
    }

    if (!password) {
      setError('Please enter a new password.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsWorking(true)
    try {
      await resetPassword({ token, password })

      setDone(true)
      setTimeout(() => navigate('/login'), 400)
    } catch (err) {
      setError(err?.message ? String(err.message) : 'Reset failed.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <AuthShell title="Create New Password" subtitle="Your new password must be different from the previous one." >
      <form className="authForm" onSubmit={onSubmit}>
          <label className="field">
            <span className="fieldLabel muted">New password</span>
            <input
              className="textInput"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="field">
            <span className="fieldLabel muted">Confirm new password</span>
            <input
              className="textInput"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
            />
          </label>

          {error ? (
            <div className="authError" role="alert" aria-live="polite">
              {error}
            </div>
          ) : null}

          {done ? <div className="muted">Password updated. Redirecting to login…</div> : null}

          <button className="primaryBtn authSubmit" type="submit" disabled={isWorking}>
            <span className="material-symbols-rounded authIcon" aria-hidden="true">
              lock_reset
            </span>
            {isWorking ? 'Working…' : 'Update password'}
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
