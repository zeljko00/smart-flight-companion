import { AppLogo } from './AppLogo'
import { useTheme } from '../theme/ThemeProvider'
import '../style/AuthPanel.css'

export function AuthHeader() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="auth-header">
      <AppLogo />
      <button
        className="auth-header__theme-switch"
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      >
        {theme === 'light' ? 'Dark mode' : 'Light mode'}
      </button>
    </header>
  )
}
