import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../services/apiClient'
import { authService } from '../services/authService'
import '../style/AuthPanel.css'

function validateUsername(value: string): 'required' | 'length' | 'invalid' | null {
  if (!value.trim()) {
    return 'required'
  }

  if (value.length < 12 || value.length > 50) {
    return 'length'
  }

  if (/[@#/]/.test(value)) {
    return 'invalid'
  }

  return null
}

function validatePassword(value: string): 'required' | 'length' | 'invalid' | null {
  if (!value) {
    return 'required'
  }

  if (value.length < 15 || value.length > 128) {
    return 'length'
  }

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(value)) {
    return 'invalid'
  }

  return null
}

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
  const { t } = useTranslation()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const mapUsernameError = (error: ReturnType<typeof validateUsername>) => {
    if (!error) {
      return null
    }

    if (error === 'required') {
      return t('register.username_missing')
    }

    if (error === 'length') {
      return t('register.invalid_username_length')
    }

    return t('register.invalid_username')
  }

  const mapPasswordError = (error: ReturnType<typeof validatePassword>) => {
    if (!error) {
      return null
    }

    if (error === 'required') {
      return t('register.password_missing')
    }

    if (error === 'length') {
      return t('register.invalid_password_length')
    }

    return t('register.invalid_password')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const usernameValidation = validateUsername(username)
    const passwordValidation = validatePassword(password)
    const resolvedUsernameError = mapUsernameError(usernameValidation)
    const resolvedPasswordError = mapPasswordError(passwordValidation)

    setUsernameTouched(true)
    setPasswordTouched(true)
    setUsernameError(resolvedUsernameError)
    setPasswordError(resolvedPasswordError)

    if (usernameValidation || passwordValidation) {
      return
    }

    if (password !== passwordConfirmation) {
      setErrorMessage(t('register.mismatch'))
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

      setSuccessMessage(t('register.success', { name: user.firstName || user.username }))
      setPassword('')
      setPasswordConfirmation('')
    } catch (error) {
      const fallbackMessage = t('register.failure')

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
        <h2 id="register-title">{t('register.title')}</h2>
        <p>{t('register.subtitle')}</p>
      </div>

      <label className="input-group" htmlFor="firstName">
        <span>{t('register.firstName')}</span>
        <div className="input-group__field">
          <UserIcon />
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder={t('register.firstNamePlaceholder')}
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </label>

      <label className="input-group" htmlFor="lastName">
        <span>{t('register.lastName')}</span>
        <div className="input-group__field">
          <UserIcon />
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder={t('register.lastNamePlaceholder')}
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </label>

      <label className="input-group" htmlFor="username">
        <span>{t('register.username')}</span>
        <div className="input-group__field">
          <UserIcon />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder={t('register.usernamePlaceholder')}
            required
            value={username}
            onChange={(event) => {
              const nextValue = event.target.value
              setUsername(nextValue)
              if (!usernameTouched && nextValue.length > 0) {
                setUsernameTouched(true)
              }
              if (usernameTouched || nextValue.length > 0) {
                setUsernameError(mapUsernameError(validateUsername(nextValue)))
              }
            }}
            onBlur={() => {
              setUsernameTouched(true)
              setUsernameError(mapUsernameError(validateUsername(username)))
            }}
            disabled={isSubmitting}
            aria-invalid={Boolean(usernameError)}
          />
        </div>
        {usernameError ? <small className="input-group__error">{usernameError}</small> : null}
      </label>

      <label className="input-group" htmlFor="email">
        <span>{t('register.email')}</span>
        <div className="input-group__field">
          <MailIcon />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('register.emailPlaceholder')}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </label>

      <label className="input-group" htmlFor="password">
        <span>{t('register.password')}</span>
        <div className="input-group__field">
          <LockIcon />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder={t('register.passwordPlaceholder')}
            required
            value={password}
            onChange={(event) => {
              const nextValue = event.target.value
              setPassword(nextValue)
              if (!passwordTouched && nextValue.length > 0) {
                setPasswordTouched(true)
              }
              if (passwordTouched || nextValue.length > 0) {
                setPasswordError(mapPasswordError(validatePassword(nextValue)))
              }
            }}
            onBlur={() => {
              setPasswordTouched(true)
              setPasswordError(mapPasswordError(validatePassword(password)))
            }}
            disabled={isSubmitting}
            aria-invalid={Boolean(passwordError)}
          />
        </div>
        {passwordError ? <small className="input-group__error">{passwordError}</small> : null}
      </label>

      <label className="input-group" htmlFor="passwordConfirmation">
        <span>{t('register.confirmPassword')}</span>
        <div className="input-group__field">
          <LockIcon />
          <input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            placeholder={t('register.confirmPasswordPlaceholder')}
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
        {isSubmitting ? t('register.submitting') : t('register.submit')}
      </button>

      <p className="login-form__register-prompt">
        {t('register.loginPrompt')} <Link to="/">{t('register.loginAction')}</Link>
      </p>
    </form>
  )
}