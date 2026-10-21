import { AuthHeader } from '../components/AuthHeader'
import { RegisterForm } from '../components/RegisterForm'
import { useTranslation } from 'react-i18next'
import '../style/RegisterPage.css'

export function RegisterPage() {
  const { t } = useTranslation()

  return (
    <main className="register-page">
      <div className="register-page__ambient" aria-hidden="true" />

      <section className="register-page__shell" aria-label={t('page.registerSectionAria')}>
        <article className="register-page__panel" aria-label={t('page.registerFormAria')}>
          <AuthHeader />
          <RegisterForm />
        </article>
      </section>
    </main>
  )
}
