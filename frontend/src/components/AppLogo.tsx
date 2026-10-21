import '../style/AuthPanel.css'

type AppLogoProps = {
  compact?: boolean
}

export function AppLogo({ compact = false }: AppLogoProps) {
  return (
    <div className={`app-logo ${compact ? 'app-logo--compact' : ''}`}>
        <img src="/favicon.png" alt="" width={compact ? 40 : 46} height={compact ? 40 : 46} />
      <div>
        <p className="app-logo__label">SmartFlightCompanion</p>
      </div>
    </div>
  )
}
