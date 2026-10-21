import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../services/apiClient'
import { authService } from '../services/authService'
import '../style/AuthPanel.css'

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 12a4 4 0 100-8 4 4 0 000 8z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4.5 19.5a7.5 7.5 0 0115 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 10V7.6A4 4 0 0112 4a4 4 0 014 3.6V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const user = await authService.login({
        username: username.trim(),
        password,
      })

      setSuccessMessage(`Welcome back, ${user.firstName || user.username}.`)
    } catch (error) {
      const fallbackMessage = 'Unable to sign in. Please check your credentials.'

      if (error instanceof ApiError) {
        setErrorMessage(error.message || fallbackMessage)
      } else {
        setErrorMessage(fallbackMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      className="login-form"
      aria-labelledby="login-title"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="login-form__intro">
        <h2 id="login-title">Sign in to SmartFlightCompanion</h2>
        <p>Track flights, gate changes, and trip updates in one place.</p>
      </div>

      <label className="input-group" htmlFor="username">
        <span>Username</span>
        <div className="input-group__field">
          <MailIcon />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Enter your username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </label>

      <label className="input-group" htmlFor="password">
        <span>Password</span>
        <div className="input-group__field">
          <LockIcon />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </label>

      {errorMessage && (
        <p className="login-form__status login-form__status--error" role="alert">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="login-form__status login-form__status--success">{successMessage}</p>
      )}

      <button className="login-form__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>

      <p className="login-form__register-prompt">
        New here? <a href="/register">Create your account</a>
      </p>
    </form>
  )
}
