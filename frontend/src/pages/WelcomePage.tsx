import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { AuthHeader } from '../components/AuthHeader'
import { LoginForm } from '../components/LoginForm'
import { fetchUpcomingFlights } from '../services/flightsService'
import '../style/WelcomePage.css'

export function WelcomePage() {
  const [flights, setFlights] = useState<Awaited<ReturnType<typeof fetchUpcomingFlights>>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isDisposed = false

    const loadFlights = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const upcomingFlights = await fetchUpcomingFlights()
        if (!isDisposed) {
          setFlights(upcomingFlights)
        }
      } catch {
        if (!isDisposed) {
          setErrorMessage('Could not load flights right now.')
        }
      } finally {
        if (!isDisposed) {
          setIsLoading(false)
        }
      }
    }

    loadFlights()

    return () => {
      isDisposed = true
    }
  }, [])

  const animatedFlights = useMemo(() => {
    if (flights.length <= 1) {
      return flights
    }

    return [...flights, ...flights]
  }, [flights])

  const tickerDuration = Math.max(flights.length * 4, 16)

  return (
    <main className="welcome-page">
      <div className="welcome-page__ambient" aria-hidden="true" />

      <section className="welcome-page__grid" aria-label="Login section">
        <article className="welcome-page__showcase">
          <section className="welcome-page__flights" aria-label="Upcoming flights">
            <header className="welcome-page__flights-head">
              <h3>Upcoming flights</h3>
            </header>

            {isLoading ? (
              <p className="welcome-page__flights-message">Loading upcoming departures...</p>
            ) : null}

            {!isLoading && errorMessage ? (
              <p className="welcome-page__flights-message welcome-page__flights-message--error">
                {errorMessage}
              </p>
            ) : null}

            {!isLoading && !errorMessage && flights.length === 0 ? (
              <p className="welcome-page__flights-message">No future flights are available right now.</p>
            ) : null}

            {!isLoading && !errorMessage && flights.length > 0 ? (
              <div className="welcome-page__ticker-wrap" style={{ '--ticker-duration': `${tickerDuration}s` } as CSSProperties}>
                <ul
                  className={`welcome-page__ticker ${flights.length > 1 ? 'welcome-page__ticker--animated' : ''}`}
                  aria-live="polite"
                >
                  {animatedFlights.map((flight, index) => (
                    <li key={`${flight.id}-${index}`}>
                      <p className="welcome-page__flight-number">{flight.flightNumber}</p>
                      <p className="welcome-page__flight-route">
                        {flight.fromLabel} to {flight.toLabel}
                      </p>
                      <p className="welcome-page__flight-meta">
                        <span>{flight.airline}</span>
                        <span>{flight.departureLabel}</span>
                        <span>{flight.statusLabel}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </article>

        <article className="welcome-page__panel" aria-label="Login form">
          <AuthHeader />
          <LoginForm />
        </article>
      </section>
    </main>
  )
}
