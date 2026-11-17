import { useMemo, useState, type FormEvent } from 'react'
import { Bot, ChevronDown, ChevronUp, SendHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { FlightAiExchange } from '../services/flightsService'
import '../style/FlightAiAssistantChat.css'

type FlightAiAssistantChatProps = {
  exchanges: FlightAiExchange[]
  formatTimestamp: (value: string) => string
  onAsk: (query: string) => Promise<string>
}

export function FlightAiAssistantChat({ exchanges, formatTimestamp, onAsk }: FlightAiAssistantChatProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const sortedHistory = useMemo(() => {
    return [...exchanges].sort((left, right) => {
      const leftTime = new Date(left.timestamp).getTime()
      const rightTime = new Date(right.timestamp).getTime()

      if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
        return 0
      }

      if (Number.isNaN(leftTime)) {
        return 1
      }

      if (Number.isNaN(rightTime)) {
        return -1
      }

      return leftTime - rightTime
    })
  }, [exchanges])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedQuestion = question.trim()
    if (!normalizedQuestion) {
      setSubmitError(t('flightDetails.aiAssistant.validationRequired'))
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await onAsk(normalizedQuestion)
      setQuestion('')
    } catch {
      setSubmitError(t('flightDetails.aiAssistant.submitError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <aside className="flight-ai-assistant" aria-label={t('flightDetails.aiAssistant.aria')}>
      <button
        type="button"
        className="flight-ai-assistant__toggle"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-controls="flight-ai-assistant-panel"
      >
        <span className="flight-ai-assistant__toggle-main">
          <Bot size={18} aria-hidden="true" />
          <span>{t('flightDetails.aiAssistant.title')}</span>
        </span>
        {isOpen ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
      </button>

      {isOpen ? (
        <div id="flight-ai-assistant-panel" className="flight-ai-assistant__panel">
          <p className="flight-ai-assistant__subtitle">{t('flightDetails.aiAssistant.subtitle')}</p>

          {sortedHistory.length === 0 ? (
            <p className="flight-ai-assistant__empty">{t('flightDetails.aiAssistant.empty')}</p>
          ) : (
            <ol className="flight-ai-assistant__chat-list">
              {sortedHistory.map((exchange) => (
                <li key={exchange.id} className="flight-ai-assistant__chat-pair">
                  <article className="flight-ai-assistant__chat-message flight-ai-assistant__chat-message--user">
                    <p className="flight-ai-assistant__chat-role">{t('flightDetails.aiAssistant.userLabel')}</p>
                    <p>{exchange.request || t('flightDetails.aiAssistant.missingRequest')}</p>
                  </article>

                  <article className="flight-ai-assistant__chat-message flight-ai-assistant__chat-message--assistant">
                    <p className="flight-ai-assistant__chat-role">{t('flightDetails.aiAssistant.assistantLabel')}</p>
                    <p>{exchange.response || t('flightDetails.aiAssistant.missingResponse')}</p>
                  </article>

                  <time className="flight-ai-assistant__chat-time" dateTime={exchange.timestamp}>
                    {formatTimestamp(exchange.timestamp)}
                  </time>
                </li>
              ))}
            </ol>
          )}

          <form className="flight-ai-assistant__form" onSubmit={handleSubmit}>
            <label className="flight-ai-assistant__input-wrap">
              <span>{t('flightDetails.aiAssistant.inputLabel')}</span>
              <textarea
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value)
                  if (submitError) {
                    setSubmitError(null)
                  }
                }}
                placeholder={t('flightDetails.aiAssistant.inputPlaceholder')}
                rows={3}
                maxLength={1200}
                disabled={isSubmitting}
              />
            </label>

            {submitError ? <p className="flight-ai-assistant__error" role="alert">{submitError}</p> : null}

            <button type="submit" className="flight-ai-assistant__submit" disabled={isSubmitting}>
              <SendHorizontal size={16} aria-hidden="true" />
              <span>
                {isSubmitting
                  ? t('flightDetails.aiAssistant.submitting')
                  : t('flightDetails.aiAssistant.submit')}
              </span>
            </button>
          </form>
        </div>
      ) : null}
    </aside>
  )
}
