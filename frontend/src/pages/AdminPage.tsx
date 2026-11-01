import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Ban, KeyRound, Loader2, UserCheck } from 'lucide-react'
import { ApiError } from '../services/apiClient'
import type { UserDto } from '../services/authService'
import { usersService } from '../services/usersService'
import { AuthHeader } from '../components/AuthHeader'
import { RequestLogsPanel } from '../components/RequestLogsPanel'
import { UserInfo } from '../components/UserInfo'
import '../style/AdminPage.css'

type AdminTab = 'users' | 'airports' | 'requestLogs' | 'operations' | 'settings'
type UserAction = 'authorize' | 'block' | null
type AdminLocationState = {
  adminUser?: UserDto
}

function formatDate(value: string): string {
  const date = new Date(value)
  return new Intl.DateTimeFormat('sr-RS',{
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function getApiLanguage(selectedLanguage: string | undefined): 'en' | 'srb' {
  return selectedLanguage?.startsWith('sr') ? 'srb' : 'en'
}

export function AdminPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const adminUser = (location.state as AdminLocationState | null)?.adminUser ?? null
  const [users, setUsers] = useState<UserDto[]>([])
  const [activeTab, setActiveTab] = useState<AdminTab>('users')
  const [isLoading, setIsLoading] = useState(true)
  const [isMutatingId, setIsMutatingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  useEffect(() => {
    let isDisposed = false

    const loadUsers = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const result = await usersService.getAll()
        if (!isDisposed) {
          setUsers(result)
        }
      } catch {
        if (!isDisposed) {
          setErrorMessage(t('admin.loadError'))
        }
      } finally {
        if (!isDisposed) {
          setIsLoading(false)
        }
      }
    }

    void loadUsers()

    return () => {
      isDisposed = true
    }
  }, [t])

  const blockedUsers = useMemo(
    () => users.filter((user) => !user.isActive),
    [users],
  )

  const guestUsers = useMemo(
    () => users.filter((user) => user.role.toLowerCase() === 'guest' && user.isActive),
    [users],
  )

  const activeUsers = useMemo(
    () => users.filter((user) => user.role.toLowerCase() !== 'admin' && user.role.toLowerCase() !== 'guest' && user.isActive),
    [users],
  )

  const renderUserList = (items: UserDto[], action: UserAction) => {
    if (items.length === 0) {
      return <li className="admin-users__empty">{t('admin.empty')}</li>
    }

    return items.map((user) => (
      <li key={user.id} className="admin-users__item">
        <div>
          <p className="admin-users__name">{user.firstName} {user.lastName}</p>
          <p className="admin-users__meta">{user.email}</p>
          <p className="admin-users__meta">{t('admin.joined')}: {formatDate(user.createdAt)}</p>
        </div>

        {action === 'authorize' ? (
          <button
            type="button"
            className="admin-users__action"
            onClick={() => handleAuthorize(user.id)}
            disabled={isMutatingId === user.id}
            aria-label={isMutatingId === user.id ? t('admin.authorizing') : t('admin.authorize')}
            title={t('admin.authorize')}
          >
            {isMutatingId === user.id ? (
              <Loader2 className="admin-users__icon admin-users__icon--spin" aria-hidden="true" />
            ) : (
              <UserCheck className="admin-users__icon" aria-hidden="true" />
            )}
          </button>
        ) : null}

        {action === 'block' ? (
          <div className="admin-users__actions">
            <button
              type="button"
              className="admin-users__action admin-users__action--secondary"
              onClick={() => handleResetPassword(user.id)}
              disabled={isMutatingId === user.id}
              aria-label={isMutatingId === user.id ? t('admin.resettingPassword') : t('admin.resetPassword')}
              title={t('admin.resetPassword')}
            >
              {isMutatingId === user.id ? (
                <Loader2 className="admin-users__icon admin-users__icon--spin" aria-hidden="true" />
              ) : (
                <KeyRound className="admin-users__icon" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              className="admin-users__action admin-users__action--danger"
              onClick={() => handleBlock(user.id)}
              disabled={isMutatingId === user.id}
              aria-label={isMutatingId === user.id ? t('admin.blocking') : t('admin.block')}
              title={t('admin.block')}
            >
              {isMutatingId === user.id ? (
                <Loader2 className="admin-users__icon admin-users__icon--spin" aria-hidden="true" />
              ) : (
                <Ban className="admin-users__icon" aria-hidden="true" />
              )}
            </button>
          </div>
        ) : null}
      </li>
    ))
  }

  const handleAuthorize = async (id: string) => {
    setErrorMessage(null)
    setNoticeMessage(null)
    setIsMutatingId(id)

    try {
      await usersService.authorize(id)
      setUsers((current) => current.map((user) => (user.id === id ? { ...user, role: 'User' } : user)))
      setNoticeMessage(t('admin.authorizeSuccess'))
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : t('admin.authorizeError'))
    } finally {
      setIsMutatingId(null)
    }
  }

  const handleBlock = async (id: string) => {
    setErrorMessage(null)
    setNoticeMessage(null)
    setIsMutatingId(id)

    try {
      await usersService.block(id)
      setUsers((current) => current.map((user) => (user.id === id ? { ...user, isActive: false } : user)))
      setNoticeMessage(t('admin.blockSuccess'))
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : t('admin.blockError'))
    } finally {
      setIsMutatingId(null)
    }
  }

  const handleResetPassword = async (id: string) => {
    setErrorMessage(null)
    setNoticeMessage(null)
    setIsMutatingId(id)

    try {
      await usersService.resetPassword(id, getApiLanguage(i18n.resolvedLanguage))
      setNoticeMessage(t('admin.resetPasswordSuccess'))
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : t('admin.resetPasswordError'))
    } finally {
      setIsMutatingId(null)
    }
  }

  const handleLogout = () => {
    navigate('/', { replace: true })
  }

  return (
    <main className="admin-page">
      <div className="admin-page__ambient" aria-hidden="true" />

      <section className="admin-page__shell" aria-label={t('admin.sectionAria')}>
        <article className="admin-page__panel" aria-label={t('admin.panelAria')}>
          <AuthHeader />
          <UserInfo user={adminUser} onLogout={handleLogout} />

          <div className="admin-page__masthead">
            <div className="admin-page__title-wrap">
              <h2>{t('admin.title')}</h2>
              <p>{t('admin.subtitle')}</p>
            </div>

            <div className="admin-page__metrics" aria-label={t('admin.metricsAria')}>
              <article className="admin-page__metric-card">
                <p>{t('admin.metrics.total')}</p>
                <strong>{users.length}</strong>
              </article>
              <article className="admin-page__metric-card">
                <p>{t('admin.tabs.active')}</p>
                <strong>{activeUsers.length}</strong>
              </article>
              <article className="admin-page__metric-card">
                <p>{t('admin.tabs.guests')}</p>
                <strong>{guestUsers.length}</strong>
              </article>
              <article className="admin-page__metric-card">
                <p>{t('admin.tabs.blocked')}</p>
                <strong>{blockedUsers.length}</strong>
              </article>
            </div>
          </div>

          <nav className="admin-tabs" aria-label={t('admin.tabsAria')}>
            <button
              type="button"
              className={`admin-tabs__tab ${activeTab === 'users' ? 'admin-tabs__tab--active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <span>{t('admin.tabs.users')}</span>
              <small>{users.length}</small>
            </button>
            <button
              type="button"
              className={`admin-tabs__tab ${activeTab === 'airports' ? 'admin-tabs__tab--active' : ''}`}
              onClick={() => setActiveTab('airports')}
            >
              <span>{t('admin.tabs.airports')}</span>
            </button>
            <button
              type="button"
              className={`admin-tabs__tab ${activeTab === 'requestLogs' ? 'admin-tabs__tab--active' : ''}`}
              onClick={() => setActiveTab('requestLogs')}
            >
              <span>{t('admin.tabs.requestLogs')}</span>
            </button>
            <button
              type="button"
              className={`admin-tabs__tab ${activeTab === 'operations' ? 'admin-tabs__tab--active' : ''}`}
              onClick={() => setActiveTab('operations')}
            >
              <span>{t('admin.tabs.operations')}</span>
              <small>{t('admin.tabSoon')}</small>
            </button>
            <button
              type="button"
              className={`admin-tabs__tab ${activeTab === 'settings' ? 'admin-tabs__tab--active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span>{t('admin.tabs.settings')}</span>
              <small>{t('admin.tabSoon')}</small>
            </button>
          </nav>

          {activeTab === 'users' && isLoading ? <p className="admin-page__status">{t('admin.loading')}</p> : null}

          {activeTab === 'users' && !isLoading && errorMessage ? (
            <p className="admin-page__status admin-page__status--error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {activeTab === 'users' && !isLoading && !errorMessage && noticeMessage ? (
            <p className="admin-page__status admin-page__status--success">{noticeMessage}</p>
          ) : null}

          {!isLoading && !errorMessage && activeTab === 'users' ? (
            <div className="admin-user-sections" aria-live="polite">
              <section className="admin-user-sections__group" aria-label={t('admin.tabs.active')}>
                <h3>{t('admin.tabs.active')} ({activeUsers.length})</h3>
                <ul className="admin-users">
                  {renderUserList(activeUsers, 'block')}
                </ul>
              </section>

              <section className="admin-user-sections__group" aria-label={t('admin.tabs.guests')}>
                <h3>{t('admin.tabs.guests')} ({guestUsers.length})</h3>
                <ul className="admin-users">
                  {renderUserList(guestUsers, 'authorize')}
                </ul>
              </section>

              <section className="admin-user-sections__group" aria-label={t('admin.tabs.blocked')}>
                <h3>{t('admin.tabs.blocked')} ({blockedUsers.length})</h3>
                <ul className="admin-users">
                  {renderUserList(blockedUsers, null)}
                </ul>
              </section>

            </div>
          ) : null}

          {activeTab === 'requestLogs' ? <RequestLogsPanel /> : null}

          {!isLoading && !errorMessage && (activeTab === 'operations' || activeTab === 'settings') ? (
            <p className="admin-page__status">{t('admin.comingSoon')}</p>
          ) : null}
        </article>
      </section>
    </main>
  )
}
