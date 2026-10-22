import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../services/apiClient'
import type { UserDto } from '../services/authService'
import { usersService } from '../services/usersService'
import { AuthHeader } from '../components/AuthHeader'
import { UserInfo } from '../components/UserInfo'
import '../style/AdminPage.css'

type AdminTab = 'users' | 'operations' | 'settings'
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

export function AdminPage() {
  const { t } = useTranslation()
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
          >
            {isMutatingId === user.id ? t('admin.authorizing') : t('admin.authorize')}
          </button>
        ) : null}

        {action === 'block' ? (
          <button
            type="button"
            className="admin-users__action admin-users__action--danger"
            onClick={() => handleBlock(user.id)}
            disabled={isMutatingId === user.id}
          >
            {isMutatingId === user.id ? t('admin.blocking') : t('admin.block')}
          </button>
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

          {isLoading ? <p className="admin-page__status">{t('admin.loading')}</p> : null}

          {!isLoading && errorMessage ? (
            <p className="admin-page__status admin-page__status--error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {!isLoading && !errorMessage && noticeMessage ? (
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

          {!isLoading && !errorMessage && activeTab !== 'users' ? (
            <p className="admin-page__status">{t('admin.comingSoon')}</p>
          ) : null}
        </article>
      </section>
    </main>
  )
}
