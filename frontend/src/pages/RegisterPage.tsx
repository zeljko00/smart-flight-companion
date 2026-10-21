import { AuthHeader } from '../components/AuthHeader'
import { RegisterForm } from '../components/RegisterForm'
import '../style/RegisterPage.css'

export function RegisterPage() {
  return (
    <main className="register-page">
      <div className="register-page__ambient" aria-hidden="true" />

      <section className="register-page__shell" aria-label="Registration section">
        <article className="register-page__panel" aria-label="Registration form">
          <AuthHeader />
          <RegisterForm />
        </article>
      </section>
    </main>
  )
}
