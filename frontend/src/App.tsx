import { WelcomePage } from './pages/WelcomePage'
import { RegisterPage } from './pages/RegisterPage'

function App() {
  const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'

  if (normalizedPath === '/register') {
    return <RegisterPage />
  }

  return <WelcomePage />
}

export default App
