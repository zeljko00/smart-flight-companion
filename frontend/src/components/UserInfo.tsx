import { useTranslation } from 'react-i18next'
import type { UserDto } from '../services/authService'

type UserInfoProps = {
  user: UserDto | null
  onLogout: () => void
}

function getDisplayName(user: UserDto | null, fallbackName: string): string {
  if (!user) {
    return fallbackName
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim()
  return fullName || user.username
}

export function UserInfo({ user, onLogout }: UserInfoProps) {
  const { t } = useTranslation()
  const displayName = getDisplayName(user, t('admin.fallbackName'))
  const isAdmin = user?.role.toLowerCase() === 'admin'

  return (
    <section className="admin-page__user-compact" aria-label={t('admin.sessionAria')}>
      <div className="admin-page__user-meta">
        <p className="admin-page__user-name">{displayName}</p>
        {isAdmin ? <span className="admin-page__user-role">{t('admin.roleAdmin')}</span> : null}
      </div>

      <button type="button" className="admin-page__logout" onClick={onLogout}>
        {t('admin.logout')}
      </button>
    </section>
  )
}