import { useState, type FormEvent } from 'react'
import { CheckCircle2, Copy, KeyRound, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../services/apiClient'
import { apiKeysService } from '../services/apiKeysService'
import '../style/ApiKeysPanel.css'

export function ApiKeysPanel() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [generatedName, setGeneratedName] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedName = name.trim()
    if (!normalizedName) {
      setErrorMessage(t('admin.apiKeys.nameRequired'))
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setNoticeMessage(null)
    setGeneratedKey(null)
    setGeneratedName(null)
    setIsCopied(false)

    try {
      const result = await apiKeysService.create({ name: normalizedName })
      setGeneratedName(result.name)
      setGeneratedKey(result.key)
      setNoticeMessage(t('admin.apiKeys.createSuccess', { name: result.name }))
      setName('')
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : t('admin.apiKeys.createError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedKey || !navigator.clipboard) {
      return
    }

    try {
      await navigator.clipboard.writeText(generatedKey)
      setIsCopied(true)
    } catch {
      setErrorMessage(t('admin.apiKeys.copyError'))
    }
  }

  return (
    <section className="api-keys-panel" aria-label={t('admin.apiKeys.aria')}>
      <article className="api-keys-panel__card">
        <h3>{t('admin.apiKeys.title')}</h3>
        <p>{t('admin.apiKeys.subtitle')}</p>

        <form className="api-keys-panel__form" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="api-key-name">{t('admin.apiKeys.nameLabel')}</label>
          <div className="api-keys-panel__row">
            <input
              id="api-key-name"
              type="text"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('admin.apiKeys.namePlaceholder')}
              disabled={isSubmitting}
              autoComplete="off"
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="api-keys-panel__icon api-keys-panel__icon--spin" aria-hidden="true" />
              ) : (
                <KeyRound className="api-keys-panel__icon" aria-hidden="true" />
              )}
              <span>{isSubmitting ? t('admin.apiKeys.creating') : t('admin.apiKeys.create')}</span>
            </button>
          </div>
        </form>

        {errorMessage ? (
          <p className="api-keys-panel__message api-keys-panel__message--error" role="alert">{errorMessage}</p>
        ) : null}

        {!errorMessage && noticeMessage ? (
          <p className="api-keys-panel__message api-keys-panel__message--success">{noticeMessage}</p>
        ) : null}

        {generatedKey ? (
          <section className="api-keys-panel__result" aria-label={t('admin.apiKeys.resultAria')}>
            <p className="api-keys-panel__result-title">{t('admin.apiKeys.generatedTitle')}</p>
            <p className="api-keys-panel__result-note">{t('admin.apiKeys.generatedNote')}</p>
            <p className="api-keys-panel__result-name">
              <strong>{t('admin.apiKeys.nameLabel')}:</strong> {generatedName}
            </p>

            <div className="api-keys-panel__key-wrap">
              <code>{generatedKey}</code>
              <button type="button" onClick={() => void handleCopy()}>
                {isCopied ? (
                  <CheckCircle2 className="api-keys-panel__icon" aria-hidden="true" />
                ) : (
                  <Copy className="api-keys-panel__icon" aria-hidden="true" />
                )}
                <span>{isCopied ? t('admin.apiKeys.copied') : t('admin.apiKeys.copy')}</span>
              </button>
            </div>
          </section>
        ) : null}
      </article>
    </section>
  )
}
