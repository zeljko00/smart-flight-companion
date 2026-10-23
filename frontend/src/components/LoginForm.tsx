import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
      return t('login.username_missing')
    }

    if (error === 'length') {
      return t('login.invalid_username_length')
    }

    return t('login.invalid_username')
  }

  const mapPasswordError = (error: ReturnType<typeof validatePassword>) => {
    if (!error) {
      return null
    }

    if (error === 'required') {
      return t('login.password_missing')
    }

    if (error === 'length') {
      return t('login.invalid_password_length')
    }

    return t('login.invalid_password')
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

    // TODO: Uncomment this block to enable form validation before submission
    // if (usernameValidation || passwordValidation) {
    //   return
    // } 

    setIsSubmitting(true)

    try {
      const user = await authService.login({
        username: username.trim(),
        password,
      })

      if (user.role.toLowerCase() === 'admin' && user.isActive) {
        navigate('/admin/console', {
          replace: true,
          state: {
            adminUser: user,
          },
        })
        return
      }
      if(user.role.toLowerCase() === 'user' && user.isActive) {
        navigate('/home', {
          replace: true,
          state: {
            user,
          },
        })
      }
    } catch (error) {
      const fallbackMessage = t('login.failure')

      if (error instanceof ApiError) {
        setErrorMessage(t("login."+error.message) || t("login."+fallbackMessage))
      } else {
        setErrorMessage(t("login."+fallbackMessage))
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
        <h2 id="login-title">{t('login.title')}</h2>
        <p>{t('login.subtitle')}</p>
      </div>

      <label className="input-group" htmlFor="username">
        <span>{t('login.username')}</span>
        <div className="input-group__field">
          <MailIcon />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder={t('login.usernamePlaceholder')}
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

      <label className="input-group" htmlFor="password">
        <span>{t('login.password')}</span>
        <div className="input-group__field">
          <LockIcon />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder={t('login.passwordPlaceholder')}
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

      {errorMessage && (
        <p className="login-form__status login-form__status--error" role="alert">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="login-form__status login-form__status--success">{successMessage}</p>
      )}

      <button className="login-form__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('login.submitting') : t('login.submit')}
      </button>

      <p className="login-form__register-prompt">
        {t('login.registerPrompt')} <Link to="/register">{t('login.registerAction')}</Link>
      </p>
    </form>
  )
}
