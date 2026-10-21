import { AppLogo } from './AppLogo'
import { useTheme } from '../theme/ThemeProvider'
import { useTranslation } from 'react-i18next'
import '../style/AuthPanel.css'

export function AuthHeader() {
  const { theme, toggleTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const selectedLanguage = i18n.resolvedLanguage?.startsWith('sr') ? 'sr' : 'en'

  return (
    <header className="auth-header">
      <AppLogo />
      <div className="auth-header__actions">
        <label className="auth-header__language" htmlFor="language-select">
          <span>{t('common.languageLabel')}</span>
          <select
            id="language-select"
            value={selectedLanguage}
            onChange={(event) => {
              window.localStorage.setItem('sfc-language', event.target.value)
              void i18n.changeLanguage(event.target.value)
            }}
          >
            <option value="en">{t('common.english')}</option>
            <option value="sr">{t('common.serbian')}</option>
          </select>
        </label>

        <button
          className="auth-header__theme-switch"
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? t('common.switchToDark') : t('common.switchToLight')}
        >
          {theme === 'light' ? t('common.themeDark') : t('common.themeLight')}
        </button>
      </div>
    </header>
  )
}
