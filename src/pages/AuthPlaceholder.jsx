import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import { login, signup } from '../utils/localAuth.js'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'

function isValidEmail(email) {
  const v = String(email || '').trim()
  if (!v) return false
  // Intentionally simple: avoids rejecting valid but uncommon addresses.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function minPasswordLen(isSignup) {
  // Match current auth implementation requirements.
  return isSignup ? 6 : 1
}

export default function AuthPlaceholder({ mode }) {
  const isSignup = mode === 'signup'
  const navigate = useNavigate()

  const mascotSrc = isSignup ? '/smurfs/smurf-22611.png' : '/smurfs/smurf-22604.png'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false })

  const submitLabel = useMemo(() => (isSignup ? 'Create account' : 'Sign in'), [isSignup])
  const title = useMemo(() => (isSignup ? 'Create your account' : 'Welcome back'), [isSignup])
  const subtitle = useMemo(
    () => (isSignup ? 'Create an account in under a minute.' : 'Sign in to continue where you left off.'),
    [isSignup],
  )

  const emailError = useMemo(() => {
    if (!touched.email) return ''
    if (!String(email || '').trim()) return 'Email is required.'
    if (!isValidEmail(email)) return 'Enter a valid email address.'
    return ''
  }, [email, touched.email])

  const passwordError = useMemo(() => {
    if (!touched.password) return ''
    if (!String(password || '')) return 'Password is required.'
    const minLen = minPasswordLen(isSignup)
    if (String(password).length < minLen) return `Use at least ${minLen} characters.`
    return ''
  }, [isSignup, password, touched.password])

  const confirmPasswordError = useMemo(() => {
    if (!isSignup) return ''
    if (!touched.confirmPassword) return ''
    if (!String(confirmPassword || '')) return 'Please confirm your password.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    return ''
  }, [confirmPassword, isSignup, password, touched.confirmPassword])

  const hasAnyFieldError = Boolean(emailError || passwordError || confirmPasswordError)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')

    setTouched({ email: true, password: true, confirmPassword: true })

    if (!String(email || '').trim() || !String(password || '')) {
      setError('Please complete the required fields.')
      return
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    const minLen = minPasswordLen(isSignup)
    if (String(password).length < minLen) {
      setError(`Password must be at least ${minLen} characters.`)
      return
    }

    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsWorking(true)
    try {
      if (isSignup) await signup({ email, password, remember })
      else await login({ email, password, remember })

      navigate('/')
    } catch (err) {
      setError(err?.message ? String(err.message) : 'Authentication failed.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <AuthShell title={title} subtitle={subtitle}>
      <form className="authForm" onSubmit={onSubmit}>
          <div className="authMascotRow" aria-hidden="true">
            <img className="authMascot" src={mascotSrc} alt="" />
          </div>

          <div className="authSocialRow" aria-label="Social sign-in options">
            <button
              className="authSocialBtn"
              type="button"
              disabled
              aria-disabled="true"
              title="Not implemented"
            >
              <span className="material-symbols-rounded authIcon" aria-hidden="true">
                language
              </span>
              Continue with Google
            </button>
            <button
              className="authSocialBtn"
              type="button"
              disabled
              aria-disabled="true"
              title="Not implemented"
            >
              <span className="material-symbols-rounded authIcon" aria-hidden="true">
                phone_iphone
              </span>
              Continue with Apple
            </button>
          </div>

          <div className="authDivider" aria-hidden="true">
            <div className="authDividerLine" />
            <div className="authDividerText">or continue with email</div>
            <div className="authDividerLine" />
          </div>

          <label className="field">
            <span className="fieldLabel muted">Email</span>
            <div className="textInputWrap">
              <span className="inputLeadingIcon" aria-hidden="true">
                <Mail size={16} />
              </span>
              <input
                className={`textInput textInputWithIcon ${emailError ? 'textInputInvalid' : ''}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'email-error' : undefined}
                required
                autoFocus
              />
            </div>
            {emailError ? (
              <div className="fieldError" id="email-error" aria-live="polite">
                {emailError}
              </div>
            ) : (
              <div className="fieldHint">Use a work email if you have one.</div>
            )}
          </label>

          <label className="field">
            <span className="fieldLabel muted">Password</span>
            <div className="textInputWrap">
              <span className="inputLeadingIcon" aria-hidden="true">
                <Lock size={16} />
              </span>
              <input
                className={`textInput textInputWithIcon textInputWithTrailingBtn ${passwordError ? 'textInputInvalid' : ''}`}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder={isSignup ? 'Create a password' : 'Enter your password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'password-error' : 'password-hint'}
                required
              />
              <button
                className="inputTrailingBtn"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            {passwordError ? (
              <div className="fieldError" id="password-error" aria-live="polite">
                {passwordError}
              </div>
            ) : isSignup ? (
              <div className="fieldHint" id="password-hint">
                {`At least ${minPasswordLen(true)} characters.`}
              </div>
            ) : null}
          </label>

          {isSignup ? (
            <label className="field">
              <span className="fieldLabel muted">Confirm password</span>
              <div className="textInputWrap">
                <span className="inputLeadingIcon" aria-hidden="true">
                  <Lock size={16} />
                </span>
                <input
                  className={`textInput textInputWithIcon textInputWithTrailingBtn ${confirmPasswordError ? 'textInputInvalid' : ''}`}
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(confirmPasswordError)}
                  aria-describedby={confirmPasswordError ? 'confirm-password-error' : undefined}
                  required
                />
                <button
                  className="inputTrailingBtn"
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
              {confirmPasswordError ? (
                <div className="fieldError" id="confirm-password-error" aria-live="polite">
                  {confirmPasswordError}
                </div>
              ) : (
                <div className="fieldHint">Make sure it matches exactly.</div>
              )}
            </label>
          ) : null}

          {error ? (
            <div className="authError" role="alert" aria-live="polite">
              {error}
            </div>
          ) : null}

          <div className="trustRow authTrustRow" aria-label="Security and privacy notes">
            <span className="trustPill">Secure by design • Passwords are stored as hashes</span>
          </div>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <label className="row" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className="muted">Remember me</span>
            </label>

            {!isSignup ? (
              <Link className="textLink" to="/forgot-password">
                Forgot password?
              </Link>
            ) : null}
          </div>

          <button className="primaryBtn authSubmit" type="submit" disabled={isWorking}>
            {isWorking ? 'Working…' : submitLabel}
          </button>

          <div className="authMeta authMetaColumn">
            <Link className="textLink" to={isSignup ? '/login' : '/signup'}>
              {isSignup ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </Link>
          </div>
        </form>
    </AuthShell>
  )
}
