import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../services/apiClient'
import { authService } from '../services/authService'
import '../style/AuthPanel.css'

function UserIcon() {
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

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

export function RegisterForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (password !== passwordConfirmation) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const user = await authService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      })

      setSuccessMessage(`Account created for ${user.firstName || user.username}. You can now sign in.`)
      setPassword('')
      setPasswordConfirmation('')
    } catch (error) {
      const fallbackMessage = 'Unable to create account. Please verify your details and try again.'

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
      aria-labelledby="register-title"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="login-form__intro">
        <h2 id="register-title">Create your SmartFlightCompanion account</h2>
        <p>Register once to receive flight updates and manage your travel profile.</p>
      </div>

      <label className="input-group" htmlFor="firstName">
        <span>First name</span>
        <div className="input-group__field">
          <UserIcon />
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="Enter your first name"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </label>

      <label className="input-group" htmlFor="lastName">
        <span>Last name</span>
        <div className="input-group__field">
          <UserIcon />
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Enter your last name"
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </label>

      <label className="input-group" htmlFor="username">
        <span>Username</span>
        <div className="input-group__field">
          <UserIcon />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Choose a username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </label>

      <label className="input-group" htmlFor="email">
        <span>Email</span>
        <div className="input-group__field">
          <MailIcon />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            autoComplete="new-password"
            placeholder="Create a password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </label>

      <label className="input-group" htmlFor="passwordConfirmation">
        <span>Confirm password</span>
        <div className="input-group__field">
          <LockIcon />
          <input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            required
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
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
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </button>

      <p className="login-form__register-prompt">
        Already have an account? <Link to="/">Sign in</Link>
      </p>
    </form>
  )
}